import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export interface StoredFile {
  fileId: string;
  fileName: string;
  mimeType: string;
  bucketName: string;
  gcsPath: string;
  size?: number;
  uploadedAt: Date;
}

export class StorageService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME || 'one-to-multi-agent-storage';
    
    // Configure GCS client
    if (process.env.STORAGE_EMULATOR_HOST) {
      // Development with GCS emulator
      const projectId = process.env.GCP_PROJECT_ID || 'one-to-multi-agent';
      // Use the full HTTP URL for fake-gcs-server
      this.storage = new Storage({
        projectId: projectId,
        apiEndpoint: process.env.STORAGE_EMULATOR_HOST,
      });
      console.log(`Storage service using GCS emulator at: ${process.env.STORAGE_EMULATOR_HOST}`);
      console.log(`Project ID: ${projectId}, Bucket: ${this.bucketName}`);
      
      // Initialize bucket in emulator asynchronously
      setTimeout(() => this.initializeEmulatorBucket(), 2000);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Production GCS
      this.storage = new Storage({
        projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });
      console.log(`Storage service initialized with production GCS bucket: ${this.bucketName}`);
    } else {
      // Fallback to local emulator without explicit config
      this.storage = new Storage({
        projectId: 'test-project',
      });
      console.log('Storage service initialized with default settings');
    }
  }

  private async initializeEmulatorBucket() {
    try {
      // Simply try to access the bucket to check if it exists
      const bucket = this.storage.bucket(this.bucketName);
      const [exists] = await bucket.exists();
      
      if (!exists) {
        // Create bucket if it doesn't exist
        await this.storage.createBucket(this.bucketName);
        console.log(`Created bucket in emulator: ${this.bucketName}`);
      } else {
        console.log(`Bucket already exists in emulator: ${this.bucketName}`);
      }
    } catch (error: any) {
      // If error is 404, try to create the bucket
      if (error.code === 404 || error.message?.includes('Not Found')) {
        try {
          await this.storage.createBucket(this.bucketName);
          console.log(`Created bucket in emulator: ${this.bucketName}`);
        } catch (createError) {
          console.log('Bucket creation failed, assuming it exists');
        }
      } else {
        console.log('Bucket check failed, assuming it exists');
      }
    }
  }

  private async ensureBucketExists() {
    if (process.env.STORAGE_EMULATOR_HOST) {
      // For emulator, skip the check and assume bucket exists
      // The bucket is created via curl command or initialization
      return;
    }
    
    // Production bucket check
    try {
      const [exists] = await this.storage.bucket(this.bucketName).exists();
      if (!exists) {
        await this.storage.createBucket(this.bucketName, {
          location: 'US',
          storageClass: 'STANDARD',
        });
        console.log(`Created GCS bucket: ${this.bucketName}`);
      } else {
        console.log(`GCS bucket exists: ${this.bucketName}`);
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
    }
  }

  /**
   * Upload a file buffer to GCS or store in memory for development
   */
  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<StoredFile> {
    const fileId = uuidv4();
    const fileExtension = path.extname(fileName) || this.getExtensionFromMimeType(mimeType);
    const gcsPath = `uploads/${fileId}${fileExtension}`;

    try {
      await this.ensureBucketExists();
      
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(gcsPath);

      // For emulator, use simpler upload without metadata
      if (process.env.STORAGE_EMULATOR_HOST) {
        await file.save(fileBuffer, {
          contentType: mimeType,
          resumable: false,
          validation: false, // Disable validation for emulator
        });
      } else {
        // Production upload with full metadata
        await file.save(fileBuffer, {
          metadata: {
            contentType: mimeType,
            metadata: {
              originalName: fileName,
              fileId: fileId,
              uploadedAt: new Date().toISOString(),
            },
          },
          resumable: false,
        });
      }

      console.log(`File uploaded successfully: ${gcsPath}`);
      console.log(`File ID: ${fileId}, Size: ${fileBuffer.length} bytes`);
      
      return {
        fileId,
        fileName,
        mimeType,
        bucketName: this.bucketName,
        gcsPath,
        size: fileBuffer.length,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to upload file:', error);
      console.error('Upload details:', { fileName, mimeType, bufferSize: fileBuffer.length, gcsPath });
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download a file from GCS or retrieve from memory
   */
  async downloadFile(fileId: string, gcsPath: string): Promise<Buffer | null> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(gcsPath);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        console.error(`File not found in GCS: ${gcsPath}`);
        return null;
      }
      
      const [buffer] = await file.download();
      console.log(`File downloaded successfully: ${gcsPath} (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      console.error(`Failed to download file: ${gcsPath}`, error);
      return null;
    }
  }

  /**
   * Delete a file from GCS and memory
   */
  async deleteFile(fileId: string, gcsPath: string): Promise<boolean> {
    // In development with emulator, keep files for audio playback
    if (process.env.STORAGE_EMULATOR_HOST) {
      console.log(`File kept in emulator for development: ${gcsPath}`);
      return true;
    }
    
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(gcsPath);
      await file.delete();
      console.log(`File deleted from GCS: ${gcsPath}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete file: ${gcsPath}`, error);
      return false;
    }
  }

  /**
   * Check if a file exists in GCS or memory
   */
  async fileExists(fileId: string, gcsPath: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(gcsPath);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      console.error(`Error checking file existence: ${gcsPath}`, error);
      return false;
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/mp4': '.m4a',
      'audio/webm': '.webm',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'video/avi': '.avi',
    };
    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * Get storage statistics
   */
  getStats(): { bucketName: string; storageType: string } {
    return {
      bucketName: this.bucketName,
      storageType: process.env.STORAGE_EMULATOR_HOST ? 'GCS Emulator' : 
                   process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'Production GCS' : 'Default',
    };
  }
}