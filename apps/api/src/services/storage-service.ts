import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export interface StoredFile {
  fileId: string;
  fileName: string;
  mimeType: string;
  bucketName: string;
  gcsPath: string;
  uploadedAt: Date;
}

export class StorageService {
  private storage: Storage | null = null;
  private bucketName: string;
  private useGCS: boolean;
  private tempFiles: Map<string, Buffer> = new Map(); // Fallback for local development

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME || 'one-to-multi-agent-storage';
    this.useGCS = !!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.GCS_BUCKET_NAME;
    
    if (this.useGCS) {
      this.storage = new Storage({
        projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });
      console.log(`Storage service initialized with GCS bucket: ${this.bucketName}`);
    } else {
      console.log('Storage service running in memory-only mode (development)');
    }
  }

  /**
   * Upload a file buffer to GCS or store in memory for development
   */
  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<StoredFile> {
    const fileId = uuidv4();
    const fileExtension = path.extname(fileName) || this.getExtensionFromMimeType(mimeType);
    const gcsPath = `uploads/${fileId}${fileExtension}`;

    if (this.useGCS && this.storage) {
      try {
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(gcsPath);

        // Upload file to GCS
        await file.save(fileBuffer, {
          metadata: {
            contentType: mimeType,
            metadata: {
              originalName: fileName,
              uploadedAt: new Date().toISOString(),
            },
          },
          resumable: false, // For smaller files, use simple upload
        });

        console.log(`File uploaded to GCS: ${gcsPath}`);
      } catch (error) {
        console.error('Failed to upload to GCS:', error);
        // Fall back to memory storage
        this.tempFiles.set(fileId, fileBuffer);
        console.log(`File stored in memory as fallback: ${fileId}`);
      }
    } else {
      // Development mode: store in memory
      this.tempFiles.set(fileId, fileBuffer);
      console.log(`File stored in memory: ${fileId}`);
    }

    return {
      fileId,
      fileName,
      mimeType,
      bucketName: this.bucketName,
      gcsPath,
      uploadedAt: new Date(),
    };
  }

  /**
   * Download a file from GCS or retrieve from memory
   */
  async downloadFile(fileId: string, gcsPath: string): Promise<Buffer | null> {
    if (this.useGCS && this.storage) {
      try {
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(gcsPath);
        
        const [buffer] = await file.download();
        console.log(`File downloaded from GCS: ${gcsPath}`);
        return buffer;
      } catch (error) {
        console.error(`Failed to download from GCS: ${gcsPath}`, error);
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
  }

  /**
   * Delete a file from GCS and memory
   */
  async deleteFile(fileId: string, gcsPath: string): Promise<void> {
    if (this.useGCS && this.storage) {
      try {
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(gcsPath);
        await file.delete();
        console.log(`File deleted from GCS: ${gcsPath}`);
      } catch (error) {
        console.error(`Failed to delete from GCS: ${gcsPath}`, error);
      }
    }
    
    // Always clean up from memory
    this.tempFiles.delete(fileId);
    console.log(`File cleaned up from memory: ${fileId}`);
  }

  /**
   * Check if a file exists in GCS or memory
   */
  async fileExists(fileId: string, gcsPath: string): Promise<boolean> {
    if (this.useGCS && this.storage) {
      try {
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(gcsPath);
        const [exists] = await file.exists();
        return exists;
      } catch (error) {
        console.error(`Error checking file existence in GCS: ${gcsPath}`, error);
      }
    }
    
    return this.tempFiles.has(fileId);
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
  getStats(): { useGCS: boolean; bucketName: string; memoryFiles: number } {
    return {
      useGCS: this.useGCS,
      bucketName: this.bucketName,
      memoryFiles: this.tempFiles.size,
    };
  }
}