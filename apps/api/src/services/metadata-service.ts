import { Storage } from '@google-cloud/storage';

export interface ContentMetadata {
  id: string;
  sourceType: 'text' | 'audio' | 'video';
  originalFileName?: string;
  duration?: number;
  size?: number;
  mimeType?: string;
  previewData?: AudioPreview | VideoPreview;
  generatedContent: PlatformContent[];
  createdAt: string;
  userId?: string; // For future user session support
}

export interface AudioPreview {
  duration: number;
  waveform: number[]; // Simplified waveform data points
  transcript?: string; // First few sentences
}

export interface VideoPreview {
  duration: number;
  thumbnailUrl?: string; // Base64 encoded thumbnail
  width?: number;
  height?: number;
  transcript?: string; // First few sentences
}

export interface PlatformContent {
  platform: string;
  title?: string;
  description?: string;
  content?: string;
  hashtags?: string[];
  script?: string;
  chapters?: Array<{ title: string; timestamp?: string }>;
}

export class MetadataService {
  private storage: Storage;
  private bucketName: string;
  private metadataPrefix = 'metadata/';

  constructor() {
    this.storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
    });
    this.bucketName = process.env.GCS_BUCKET_NAME || 'one-to-multi-agent-storage';
  }

  async saveMetadata(metadata: ContentMetadata): Promise<void> {
    try {
      const fileName = `${this.metadataPrefix}${metadata.id}.json`;
      const file = this.storage.bucket(this.bucketName).file(fileName);
      
      await file.save(JSON.stringify(metadata, null, 2), {
        metadata: {
          contentType: 'application/json',
        },
      });
      
      console.log(`Metadata saved: ${fileName}`);
    } catch (error) {
      console.error('Failed to save metadata:', error);
      throw error;
    }
  }

  async getMetadata(id: string): Promise<ContentMetadata | null> {
    try {
      const fileName = `${this.metadataPrefix}${id}.json`;
      const file = this.storage.bucket(this.bucketName).file(fileName);
      
      const [exists] = await file.exists();
      if (!exists) {
        return null;
      }
      
      const [contents] = await file.download();
      return JSON.parse(contents.toString()) as ContentMetadata;
    } catch (error) {
      console.error('Failed to get metadata:', error);
      return null;
    }
  }

  async listMetadata(userId?: string, limit = 20): Promise<ContentMetadata[]> {
    try {
      const [files] = await this.storage
        .bucket(this.bucketName)
        .getFiles({
          prefix: this.metadataPrefix,
          maxResults: limit,
        });

      const metadataPromises = files.map(async (file) => {
        try {
          const [contents] = await file.download();
          const metadata = JSON.parse(contents.toString()) as ContentMetadata;
          
          // Filter by userId if provided
          if (userId && metadata.userId !== userId) {
            return null;
          }
          
          return metadata;
        } catch (error) {
          console.error(`Failed to parse metadata from ${file.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(metadataPromises);
      return results
        .filter((metadata): metadata is ContentMetadata => metadata !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Failed to list metadata:', error);
      return [];
    }
  }

  async deleteMetadata(id: string): Promise<boolean> {
    try {
      const fileName = `${this.metadataPrefix}${id}.json`;
      const file = this.storage.bucket(this.bucketName).file(fileName);
      
      await file.delete();
      console.log(`Metadata deleted: ${fileName}`);
      return true;
    } catch (error) {
      console.error('Failed to delete metadata:', error);
      return false;
    }
  }

  generateId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Development fallback - store in memory when GCS is not available
  private memoryStorage = new Map<string, ContentMetadata>();

  async saveMetadataFallback(metadata: ContentMetadata): Promise<void> {
    this.memoryStorage.set(metadata.id, metadata);
    console.log(`Metadata saved to memory: ${metadata.id}`);
  }

  async getMetadataFallback(id: string): Promise<ContentMetadata | null> {
    return this.memoryStorage.get(id) || null;
  }

  async listMetadataFallback(userId?: string, limit = 20): Promise<ContentMetadata[]> {
    const allMetadata = Array.from(this.memoryStorage.values());
    
    let filtered = allMetadata;
    if (userId) {
      filtered = allMetadata.filter(metadata => metadata.userId === userId);
    }
    
    return filtered
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}