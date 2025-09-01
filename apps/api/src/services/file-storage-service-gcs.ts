import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StoredFile {
  fileId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  size: number;
}

/**
 * File storage service for Google Cloud Storage
 * Used in production environment
 */
export class FileStorageServiceGCS {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    // Use the bucket name from environment or default
    this.bucketName = process.env.GCS_BUCKET_NAME || 'one-to-multi-agent-storage';
    
    // Initialize GCS client
    this.storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID || 'one-to-multi-agent',
    });
  }

  /**
   * Save uploaded file to GCS
   */
  async saveFile(buffer: Buffer, fileName: string, mimeType: string): Promise<StoredFile> {
    const fileId = uuidv4();
    const fileExtension = path.extname(fileName) || this.getExtensionFromMimeType(mimeType);
    const storedFileName = `${fileId}${fileExtension}`;
    const filePath = `uploads/${storedFileName}`;

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      
      // Upload file to GCS
      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
          metadata: {
            originalFileName: fileName,
            uploadedAt: new Date().toISOString(),
          },
        },
      });
      
      console.log(`File saved to GCS: gs://${this.bucketName}/${filePath} (${buffer.length} bytes)`);
      
      return {
        fileId,
        filePath,
        fileName,
        mimeType,
        size: buffer.length,
      };
    } catch (error) {
      console.error('Failed to save file to GCS:', error);
      throw new Error(`Failed to save file to GCS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve file from GCS
   */
  async getFile(filePath: string): Promise<Buffer | null> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        console.error(`File not found in GCS: gs://${this.bucketName}/${filePath}`);
        return null;
      }
      
      // Download file
      const [buffer] = await file.download();
      console.log(`File retrieved from GCS: gs://${this.bucketName}/${filePath} (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      console.error(`Failed to retrieve file from GCS: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Check if file exists in GCS
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      const [exists] = await file.exists();
      return exists;
    } catch {
      return false;
    }
  }

  /**
   * Delete file from GCS (optional, for cleanup)
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      await file.delete();
      console.log(`File deleted from GCS: gs://${this.bucketName}/${filePath}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete file from GCS: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'audio/webm': '.webm',
      'audio/ogg': '.ogg',
      'audio/m4a': '.m4a',
      'audio/x-m4a': '.m4a',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/ogg': '.ogv',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
    };
    
    return mimeToExt[mimeType] || '.bin';
  }
}