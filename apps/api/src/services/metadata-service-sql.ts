import { databaseService } from './database-service.js';

export interface ContentMetadata {
  id: string;
  sourceType: 'text' | 'audio' | 'video';
  sourceText?: string; // For text input content or transcription
  originalFileName?: string;
  originalFilePath?: string; // Path to original uploaded file
  size?: number;
  mimeType?: string;
  duration?: number;
  userId?: string;
  previewData?: AudioPreview | VideoPreview;
  generatedContent: PlatformContent[];
  createdAt: string;
}

export interface AudioPreview {
  duration: number;
  waveform: number[];
  transcript?: string;
}

export interface VideoPreview {
  duration: number;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  transcript?: string;
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

export class MetadataServiceSQL {
  constructor() {}

  async saveMetadata(metadata: ContentMetadata): Promise<void> {
    try {
      await databaseService.transaction(async (client) => {
        // Insert main content metadata
        await client.query(`
          INSERT INTO content_metadata (
            id, source_type, source_text, original_file_name, original_file_path,
            file_size, mime_type, duration, user_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            source_type = $2,
            source_text = $3,
            original_file_name = $4,
            original_file_path = $5,
            file_size = $6,
            mime_type = $7,
            duration = $8,
            user_id = $9,
            updated_at = CURRENT_TIMESTAMP
        `, [
          metadata.id,
          metadata.sourceType,
          metadata.sourceText,
          metadata.originalFileName,
          metadata.originalFilePath,
          metadata.size,
          metadata.mimeType,
          metadata.duration,
          metadata.userId,
          metadata.createdAt
        ]);

        // Insert preview data if exists
        if (metadata.previewData) {
          await client.query(`
            DELETE FROM preview_data WHERE content_id = $1
          `, [metadata.id]);

          const previewType = metadata.sourceType === 'audio' ? 'audio' : 'video';
          const preview = metadata.previewData;

          await client.query(`
            INSERT INTO preview_data (
              content_id, preview_type, duration, waveform_data, 
              thumbnail_base64, video_width, video_height, transcript_preview
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            metadata.id,
            previewType,
            preview.duration,
            'waveform' in preview ? JSON.stringify(preview.waveform) : null,
            'thumbnailUrl' in preview ? preview.thumbnailUrl : null,
            'width' in preview ? preview.width : null,
            'height' in preview ? preview.height : null,
            preview.transcript
          ]);
        }

        // Insert platform content
        await client.query(`
          DELETE FROM platform_content WHERE content_id = $1
        `, [metadata.id]);

        for (const platformContent of metadata.generatedContent) {
          await client.query(`
            INSERT INTO platform_content (
              content_id, platform, title, description, content, 
              hashtags, script, chapters
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            metadata.id,
            platformContent.platform,
            platformContent.title,
            platformContent.description,
            platformContent.content,
            platformContent.hashtags ? JSON.stringify(platformContent.hashtags) : null,
            platformContent.script,
            platformContent.chapters ? JSON.stringify(platformContent.chapters) : null
          ]);
        }
      });

      console.log(`Metadata saved to database: ${metadata.id}`);
    } catch (error) {
      console.error('Failed to save metadata to database:', error);
      throw error;
    }
  }

  async getMetadata(id: string): Promise<ContentMetadata | null> {
    try {
      const result = await databaseService.query(`
        SELECT * FROM content_metadata WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Get preview data
      const previewResult = await databaseService.query(`
        SELECT * FROM preview_data WHERE content_id = $1
      `, [id]);

      let previewData: AudioPreview | VideoPreview | undefined;
      if (previewResult.rows.length > 0) {
        const previewRow = previewResult.rows[0];
        if (previewRow.preview_type === 'audio') {
          previewData = {
            duration: previewRow.duration || 0,
            waveform: previewRow.waveform_data || [],
            transcript: previewRow.transcript_preview
          };
        } else {
          previewData = {
            duration: previewRow.duration || 0,
            thumbnailUrl: previewRow.thumbnail_base64,
            width: previewRow.video_width,
            height: previewRow.video_height,
            transcript: previewRow.transcript_preview
          };
        }
      }

      // Get platform content
      const platformResult = await databaseService.query(`
        SELECT * FROM platform_content WHERE content_id = $1 ORDER BY created_at
      `, [id]);

      const generatedContent: PlatformContent[] = platformResult.rows.map((contentRow: any) => ({
        platform: contentRow.platform,
        title: contentRow.title,
        description: contentRow.description,
        content: contentRow.content,
        hashtags: contentRow.hashtags,
        script: contentRow.script,
        chapters: contentRow.chapters
      }));

      return {
        id: row.id,
        sourceType: row.source_type,
        sourceText: row.source_text,
        originalFileName: row.original_file_name,
        originalFilePath: row.original_file_path,
        size: row.file_size,
        mimeType: row.mime_type,
        duration: row.duration,
        userId: row.user_id,
        previewData,
        generatedContent,
        createdAt: row.created_at.toISOString()
      };
    } catch (error) {
      console.error('Failed to get metadata from database:', error);
      return null;
    }
  }

  async listMetadata(userId?: string, limit = 20): Promise<ContentMetadata[]> {
    try {
      let query = `
        SELECT cm.*, 
               pd.preview_type, pd.duration as preview_duration, pd.waveform_data,
               pd.thumbnail_base64, pd.video_width, pd.video_height, pd.transcript_preview
        FROM content_metadata cm
        LEFT JOIN preview_data pd ON cm.id = pd.content_id
      `;
      
      const params: any[] = [];
      
      if (userId) {
        query += ` WHERE cm.user_id = $1`;
        params.push(userId);
      }
      
      query += ` ORDER BY cm.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await databaseService.query(query, params);

      // Group results by content_id since we have LEFT JOIN
      const contentMap = new Map<string, any>();
      
      for (const row of result.rows) {
        if (!contentMap.has(row.id)) {
          contentMap.set(row.id, {
            id: row.id,
            sourceType: row.source_type,
            sourceText: row.source_text,
            originalFileName: row.original_file_name,
            originalFilePath: row.original_file_path,
            size: row.file_size,
            mimeType: row.mime_type,
            duration: row.duration,
            userId: row.user_id,
            createdAt: row.created_at.toISOString(),
            previewData: undefined,
            generatedContent: []
          });
        }

        const content = contentMap.get(row.id);
        
        // Add preview data if exists and not already added
        if (row.preview_type && !content.previewData) {
          if (row.preview_type === 'audio') {
            content.previewData = {
              duration: row.preview_duration || 0,
              waveform: row.waveform_data || [],
              transcript: row.transcript_preview
            };
          } else {
            content.previewData = {
              duration: row.preview_duration || 0,
              thumbnailUrl: row.thumbnail_base64,
              width: row.video_width,
              height: row.video_height,
              transcript: row.transcript_preview
            };
          }
        }
      }

      // Get platform content for each item
      const contentList = Array.from(contentMap.values());
      
      for (const content of contentList) {
        const platformResult = await databaseService.query(`
          SELECT * FROM platform_content WHERE content_id = $1 ORDER BY created_at
        `, [content.id]);

        content.generatedContent = platformResult.rows.map((row: any) => ({
          platform: row.platform,
          title: row.title,
          description: row.description,
          content: row.content,
          hashtags: row.hashtags,
          script: row.script,
          chapters: row.chapters
        }));
      }

      return contentList;
    } catch (error) {
      console.error('Failed to list metadata from database:', error);
      return [];
    }
  }

  async deleteMetadata(id: string): Promise<boolean> {
    try {
      await databaseService.transaction(async (client) => {
        // Delete preview data
        await client.query('DELETE FROM preview_data WHERE content_id = $1', [id]);
        
        // Delete platform content
        await client.query('DELETE FROM platform_content WHERE content_id = $1', [id]);
        
        // Delete main content metadata
        const result = await client.query('DELETE FROM content_metadata WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
          throw new Error('Content metadata not found');
        }
      });

      console.log(`Metadata deleted from database: ${id}`);
      return true;
    } catch (error) {
      console.error('Failed to delete metadata from database:', error);
      return false;
    }
  }

  generateId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}