import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export interface StoredFile {
  fileId: string;
  fileName: string;
  mimeType: string;
  bucketName: string;
  gcsPath: string; // Keep same interface, but use s3Path
  size?: number;
  uploadedAt: Date;
}

export class StorageService {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private useS3: boolean;
  private tempFiles: Map<string, Buffer> = new Map(); // Fallback

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME || 'audio-storage';
    this.useS3 = !!process.env.S3_ENDPOINT;
    
    if (this.useS3) {
      this.s3Client = new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY!,
          secretAccessKey: process.env.S3_SECRET_KEY!
        },
        forcePathStyle: true // Required for MinIO
      });
      console.log(`Storage service initialized with S3 bucket: ${this.bucketName}`);
      this.ensureBucketExists();
    } else {
      console.log('Storage service running in memory-only mode (development)');
    }
  }

  private async ensureBucketExists() {
    if (!this.s3Client) return;

    try {
      // Check if bucket exists
      await this.s3Client.send(new HeadBucketCommand({ 
        Bucket: this.bucketName
      }));
      console.log(`S3 bucket exists: ${this.bucketName}`);
    } catch (error: any) {
      if (error.name === 'NoSuchBucket' || error.name === 'NotFound') {
        try {
          // Create bucket if it doesn't exist
          await this.s3Client.send(new CreateBucketCommand({ 
            Bucket: this.bucketName 
          }));
          console.log(`Created S3 bucket: ${this.bucketName}`);
        } catch (createError: any) {
          // Ignore if bucket already exists
          if (createError.name !== 'BucketAlreadyOwnedByYou') {
            console.error('Failed to create bucket:', createError);
          }
        }
      } else {
        console.error('Error checking bucket:', error);
      }
    }
  }

  /**
   * Upload a file to S3 or store in memory
   */
  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<StoredFile> {
    const fileId = uuidv4();
    const fileExt = path.extname(fileName);
    const s3Key = `uploads/${fileId}${fileExt}`;

    if (this.useS3 && this.s3Client) {
      try {
        await this.s3Client.send(new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: mimeType,
        }));
        
        console.log(`File uploaded to S3: ${s3Key}`);
        return {
          fileId,
          fileName,
          mimeType,
          bucketName: this.bucketName,
          gcsPath: s3Key, // Use same field name for compatibility
          size: fileBuffer.length,
          uploadedAt: new Date(),
        };
      } catch (error) {
        console.error('Failed to upload to S3, falling back to memory:', error);
        // Fall back to memory storage
      }
    }

    // Memory storage fallback
    this.tempFiles.set(fileId, fileBuffer);
    console.log(`File stored in memory: ${fileId}`);
    
    return {
      fileId,
      fileName,
      mimeType,
      bucketName: 'memory',
      gcsPath: s3Key,
      size: fileBuffer.length,
      uploadedAt: new Date(),
    };
  }

  /**
   * Download a file from S3 or retrieve from memory
   */
  async downloadFile(fileId: string, s3Key: string): Promise<Buffer | null> {
    if (this.useS3 && this.s3Client) {
      try {
        const response = await this.s3Client.send(new GetObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
        }));
        
        if (response.Body) {
          const byteArray = await response.Body.transformToByteArray();
          const buffer = Buffer.from(byteArray);
          console.log(`File downloaded from S3: ${s3Key}`);
          return buffer;
        }
      } catch (error) {
        console.error(`Failed to download from S3: ${s3Key}`, error);
        // Fall back to memory storage
        return this.tempFiles.get(fileId) || null;
      }
    } else {
      // Development mode: retrieve from memory
      const buffer = this.tempFiles.get(fileId);
      if (buffer) {
        console.log(`File retrieved from memory: ${fileId}`);
        return buffer;
      }
      return null;
    }
    return null;
  }

  /**
   * Delete a file from S3 and memory
   */
  async deleteFile(fileId: string, s3Key: string): Promise<boolean> {
    if (this.useS3 && this.s3Client) {
      try {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
        }));
        console.log(`File deleted from S3: ${s3Key}`);
      } catch (error) {
        console.error(`Failed to delete from S3: ${s3Key}`, error);
        return false;
      }
    }
    
    // Always clean up from memory
    this.tempFiles.delete(fileId);
    console.log(`File cleaned up from memory: ${fileId}`);
    return true;
  }

  /**
   * Check if a file exists in S3 or memory
   */
  async fileExists(fileId: string, s3Key: string): Promise<boolean> {
    if (this.useS3 && this.s3Client) {
      try {
        await this.s3Client.send(new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
        }));
        return true;
      } catch (error) {
        return this.tempFiles.has(fileId);
      }
    } else {
      return this.tempFiles.has(fileId);
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(fileId: string, s3Key: string): Promise<{ size: number; lastModified: Date } | null> {
    if (this.useS3 && this.s3Client) {
      try {
        const response = await this.s3Client.send(new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
        }));
        
        return {
          size: response.ContentLength || 0,
          lastModified: response.LastModified || new Date(),
        };
      } catch (error) {
        const buffer = this.tempFiles.get(fileId);
        if (buffer) {
          return {
            size: buffer.length,
            lastModified: new Date(),
          };
        }
        return null;
      }
    } else {
      const buffer = this.tempFiles.get(fileId);
      if (buffer) {
        return {
          size: buffer.length,
          lastModified: new Date(),
        };
      }
      return null;
    }
  }
}