import { databaseService } from "./database-service.js";

export interface ContentMetadata {
  id: string;
  sourceType: "text" | "audio" | "video";
  sourceText?: string; // For text input content or transcription
  originalFileName?: string;
  originalFilePath?: string; // Path to original uploaded file
  size?: number;
  mimeType?: string;
  duration?: number;
  userId?: string;
  previewData?: AudioPreview | VideoPreview;
  generatedContent: PlatformContent[];
  usedPrompts?: Record<string, UsedPromptDetail>;
  createdAt: string;
}

export interface UsedPromptDetail {
  normalizedPlatform: string;
  globalCharacterPrompt: string;
  platformPrompt: string;
  combinedPrompt: string;
  customPrompt?: string;
  finalPrompt: string;
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
        // Ensure user exists if userId is provided
        if (metadata.userId) {
          const userCheckResult = await client.query(
            `SELECT id FROM users WHERE id = $1`,
            [metadata.userId]
          );
          const existingUser = userCheckResult.rows[0];

          if (!existingUser) {
            await client.query(
              `
              INSERT INTO users (id, email, name, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (id) DO NOTHING
            `,
              [
                metadata.userId,
                `${metadata.userId}@example.com`, // Default email
                `User ${metadata.userId}`, // Default name
                new Date().toISOString(),
                new Date().toISOString(),
              ]
            );
          }
        }

        // Insert main content metadata (using original schema fields)
        await client.query(
          `
          INSERT INTO content_metadata (
            id, source_type, source_text, original_file_name, original_file_path,
            file_size, mime_type, duration, user_id, created_at, generated_content, used_prompts
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            source_type = EXCLUDED.source_type,
            source_text = EXCLUDED.source_text,
            original_file_name = EXCLUDED.original_file_name,
            original_file_path = EXCLUDED.original_file_path,
            file_size = EXCLUDED.file_size,
            mime_type = EXCLUDED.mime_type,
            duration = EXCLUDED.duration,
            generated_content = EXCLUDED.generated_content,
            used_prompts = EXCLUDED.used_prompts
        `,
          [
            metadata.id,
            metadata.sourceType,
            metadata.sourceText || null,
            metadata.originalFileName || null,
            metadata.originalFilePath || null,
            metadata.size || null,
            metadata.mimeType || null,
            metadata.duration || null,
            metadata.userId || null,
            metadata.createdAt,
            JSON.stringify(metadata.generatedContent || []),
            JSON.stringify(metadata.usedPrompts || {}),
          ]
        );

        // Insert preview data if exists
        if (metadata.previewData) {
          await client.query(`DELETE FROM preview_data WHERE content_id = $1`, [
            metadata.id,
          ]);

          const previewType =
            metadata.sourceType === "audio" ? "audio" : "video";
          const preview = metadata.previewData;

          await client.query(
            `
            INSERT INTO preview_data (
              content_id, preview_type, duration, waveform_data,
              thumbnail_base64, video_width, video_height, transcript_preview, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
            [
              metadata.id,
              previewType,
              preview.duration || null,
              "waveform" in preview ? JSON.stringify(preview.waveform) : null,
              "thumbnailUrl" in preview ? preview.thumbnailUrl : null,
              "width" in preview ? preview.width : null,
              "height" in preview ? preview.height : null,
              preview.transcript || null,
              new Date().toISOString(),
            ]
          );
        }
      });

      console.log(`Metadata saved to database: ${metadata.id}`);
    } catch (error) {
      console.error("Failed to save metadata to database:", error);
      throw error;
    }
  }

  async getMetadata(id: string): Promise<ContentMetadata | null> {
    try {
      const result = await databaseService.query(
        `
        SELECT * FROM content_metadata WHERE id = $1
      `,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // Get preview data
      const previewResult = await databaseService.query(
        `
        SELECT * FROM preview_data WHERE content_id = $1
      `,
        [id]
      );

      let previewData: AudioPreview | VideoPreview | undefined;
      if (previewResult.rows.length > 0) {
        const previewRow = previewResult.rows[0];
        if (previewRow.preview_type === "audio") {
          previewData = {
            duration: previewRow.duration || 0,
            waveform: previewRow.waveform_data || [],
            transcript: previewRow.transcript_preview,
          };
        } else {
          previewData = {
            duration: previewRow.duration || 0,
            thumbnailUrl: previewRow.thumbnail_base64,
            width: previewRow.video_width,
            height: previewRow.video_height,
            transcript: previewRow.transcript_preview,
          };
        }
      }

      // Get platform content
      const platformResult = await databaseService.query(
        `
        SELECT * FROM platform_content WHERE content_id = $1 ORDER BY created_at
      `,
        [id]
      );

      const generatedContent: PlatformContent[] = platformResult.rows.map(
        (contentRow: any) => ({
          platform: contentRow.platform,
          title: contentRow.title,
          description: contentRow.description,
          content: contentRow.content,
          hashtags: contentRow.hashtags,
          script: contentRow.script,
          chapters: contentRow.chapters,
        })
      );

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
        usedPrompts: this.parseUsedPrompts(row.used_prompts),
        createdAt:
          typeof row.created_at === "string"
            ? row.created_at
            : row.created_at.toISOString(),
      };
    } catch (error) {
      console.error("Failed to get metadata from database:", error);
      return null;
    }
  }

  async listMetadata(userId?: string, limit = 20): Promise<ContentMetadata[]> {
    try {
      // userIdが指定されていない場合は空の配列を返す（セキュリティ対策）
      if (!userId) {
        return [];
      }

      // SQLite対応: SQLiteの場合は直接データベースにアクセス
      const isUsingPostgreSQL = await this.checkIfUsingPostgreSQL();

      if (isUsingPostgreSQL) {
        // PostgreSQL用のクエリ
        let query = `
          SELECT cm.*,
                 pd.preview_type, pd.duration as preview_duration, pd.waveform_data,
                 pd.thumbnail_base64, pd.video_width, pd.video_height, pd.transcript_preview
          FROM content_metadata cm
          LEFT JOIN preview_data pd ON cm.id = pd.content_id
          WHERE cm.user_id = $1
          ORDER BY cm.created_at DESC LIMIT $2
        `;

        const result = await databaseService.query(query, [userId, limit]);
        return this.processMetadataResults(result.rows);
      } else {
        // PostgreSQL fallback (should not happen since we're using PostgreSQL)
        let query = `
          SELECT cm.*,
                 pd.preview_type, pd.duration as preview_duration, pd.waveform_data,
                 pd.thumbnail_base64, pd.video_width, pd.video_height, pd.transcript_preview
          FROM content_metadata cm
          LEFT JOIN preview_data pd ON cm.id = pd.content_id
          WHERE cm.user_id = $1
          ORDER BY cm.created_at DESC LIMIT $2
        `;

        const result = await databaseService.query(query, [userId, limit]);
        return this.processMetadataResults(result.rows);
      }
    } catch (error) {
      console.error("Failed to list metadata from database:", error);
      return [];
    }
  }

  async deleteMetadata(id: string): Promise<boolean> {
    try {
      await databaseService.transaction(async (client) => {
        // Delete preview data
        await client.query("DELETE FROM preview_data WHERE content_id = $1", [
          id,
        ]);

        // Delete platform content
        await client.query(
          "DELETE FROM platform_content WHERE content_id = $1",
          [id]
        );

        // Delete main content metadata
        const result = await client.query(
          "DELETE FROM content_metadata WHERE id = $1",
          [id]
        );

        if (result.rowCount === 0) {
          throw new Error("Content metadata not found");
        }
      });

      console.log(`Metadata deleted from database: ${id}`);
      return true;
    } catch (error) {
      console.error("Failed to delete metadata from database:", error);
      return false;
    }
  }

  generateId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async checkIfUsingPostgreSQL(): Promise<boolean> {
    // DatabaseServiceの実装を確認してPostgreSQLを使用しているかチェック
    // 簡易的な実装: 環境変数やdatabaseServiceの状態で判定
    try {
      // テスト用のPostgreSQLクエリを実行してみる
      await databaseService.query("SELECT 1", []);
      return true; // PostgreSQLが使用されている
    } catch (error) {
      return false; // SQLiteにフォールバックしている
    }
  }

  private processMetadataResults(rows: any[]): ContentMetadata[] {
    const contentMap = new Map<string, any>();

    for (const row of rows) {
      if (!contentMap.has(row.id)) {
        contentMap.set(row.id, {
          id: row.id,
          sourceType: row.source_type,
          sourceText: row.source_text,
          originalFileName: row.original_file_name,
          size: row.file_size,
          mimeType: row.mime_type,
          duration: row.duration,
          userId: row.user_id,
          createdAt:
            typeof row.created_at === "string"
              ? row.created_at
              : row.created_at.toISOString(),
          generatedContent: this.parseGeneratedContent(row.generated_content),
          previewData: null,
          usedPrompts: this.parseUsedPrompts(row.used_prompts),
        });
      }

      // プレビューデータがある場合は追加
      if (row.preview_type) {
        const content = contentMap.get(row.id);
        content.previewData = {
          type: row.preview_type,
          duration: row.preview_duration,
          waveform: this.parseJsonField(row.waveform_data),
          thumbnailUrl: row.thumbnail_base64,
          width: row.video_width,
          height: row.video_height,
          transcript: row.transcript_preview,
        };
      }
    }

    return Array.from(contentMap.values());
  }

  private parseJsonField(raw: any): any {
    if (!raw) {
      return undefined;
    }

    try {
      // PostgreSQL's JSONB columns return objects directly, not strings
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (error) {
      console.error("Failed to parse JSON field:", error);
      return undefined;
    }
  }

  private parseGeneratedContent(raw: any): any[] {
    if (!raw) {
      return [];
    }

    try {
      // PostgreSQL's JSONB columns return objects directly, not strings
      if (typeof raw === "string") {
        return JSON.parse(raw);
      } else if (Array.isArray(raw)) {
        return raw;
      } else if (typeof raw === "object") {
        // If it's an object but not an array, wrap it in an array
        return [raw];
      }
    } catch (error) {
      console.error("Failed to parse generated content:", error);
    }

    return [];
  }

  private parseUsedPrompts(
    raw: any
  ): Record<string, UsedPromptDetail> | undefined {
    if (!raw) {
      return undefined;
    }

    try {
      // PostgreSQL's JSONB columns return objects directly, not strings
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, UsedPromptDetail>;
      }
    } catch (error) {
      console.error("Failed to parse used prompts:", error);
    }

    return undefined;
  }
}
