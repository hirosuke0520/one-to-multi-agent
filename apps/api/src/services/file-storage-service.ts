import * as fs from 'fs/promises';
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
 * Simple file storage service for local development
 * Files are stored in Docker volume for persistence
 */
export class FileStorageService {
  private storageDir: string;

  constructor() {
    // Use Docker volume mount point for persistence
    this.storageDir = process.env.STORAGE_DIR || '/app/storage';
    this.ensureStorageDir();
  }

  private async ensureStorageDir() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.mkdir(path.join(this.storageDir, 'uploads'), { recursive: true });
      console.log(`Storage directory ready: ${this.storageDir}`);
    } catch (error) {
      console.error('Failed to create storage directory:', error);
    }
  }

  /**
   * Save uploaded file to storage
   */
  async saveFile(buffer: Buffer, fileName: string, mimeType: string): Promise<StoredFile> {
    const fileId = uuidv4();
    const fileExtension = path.extname(fileName) || this.getExtensionFromMimeType(mimeType);
    const storedFileName = `${fileId}${fileExtension}`;
    const filePath = path.join('uploads', storedFileName);
    const fullPath = path.join(this.storageDir, filePath);

    try {
      // Save file to disk
      await fs.writeFile(fullPath, buffer);
      
      console.log(`File saved: ${filePath} (${buffer.length} bytes)`);
      
      return {
        fileId,
        filePath,
        fileName,
        mimeType,
        size: buffer.length
      };
    } catch (error) {
      console.error('Failed to save file:', error);
      throw new Error(`File save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve file from storage
   */
  async getFile(filePath: string): Promise<Buffer | null> {
    const fullPath = path.join(this.storageDir, filePath);
    
    try {
      const buffer = await fs.readFile(fullPath);
      console.log(`File retrieved: ${filePath} (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      console.error(`File not found: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.storageDir, filePath);
    
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete file (optional, for cleanup)
   */
  async deleteFile(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.storageDir, filePath);
    
    try {
      await fs.unlink(fullPath);
      console.log(`File deleted: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete file: ${filePath}`, error);
      return false;
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/mp4': '.m4a',
      'audio/webm': '.webm',
      'audio/ogg': '.ogg',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'video/avi': '.avi',
      'video/ogg': '.ogv',
    };
    return mimeToExt[mimeType] || '.bin';
  }
}