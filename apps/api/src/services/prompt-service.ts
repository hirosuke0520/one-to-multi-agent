import { randomUUID } from "crypto";
import { databaseService } from "./database-service.js";
import { UserSettingsService } from "./user-settings-service.js";

export interface UserPrompt {
  user_id: string;
  platform: string;
  prompt: string;
  created_at?: Date;
  updated_at?: Date;
}

export type Platform =
  | "twitter"
  | "instagram"
  | "tiktok"
  | "threads"
  | "youtube"
  | "blog";

export class PromptService {
  private userSettingsService: UserSettingsService;

  constructor() {
    this.userSettingsService = new UserSettingsService();
  }

  /**
   * ユーザーのプロンプトを全て取得
   */
  async getUserPrompts(userId: string): Promise<UserPrompt[]> {
    try {
      const result = await databaseService.query(
        "SELECT * FROM user_prompts WHERE user_id = $1 ORDER BY platform",
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.log(
        "Database error in getUserPrompts, returning empty array:",
        error
      );
      return [];
    }
  }

  /**
   * 特定のプラットフォームのプロンプトを取得
   */
  async getPromptByPlatform(
    userId: string,
    platform: Platform
  ): Promise<UserPrompt | null> {
    try {
      const result = await databaseService.query(
        "SELECT * FROM user_prompts WHERE user_id = $1 AND platform = $2",
        [userId, platform]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.log("Database error in getPromptByPlatform:", error);
      return null;
    }
  }

  /**
   * プロンプトを保存（新規作成または更新）
   */
  async savePrompt(
    userId: string,
    platform: Platform,
    prompt: string
  ): Promise<UserPrompt> {
    try {
      // Ensure user exists
      await this.ensureUserExists(userId);

      const now = new Date().toISOString();
      await databaseService.query(
        `INSERT INTO user_prompts (user_id, platform, prompt, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, platform)
         DO UPDATE SET
           prompt = EXCLUDED.prompt,
           updated_at = $5`,
        [userId, platform, prompt, now, now]
      );

      // Get the saved record
      const result = await databaseService.query(
        "SELECT * FROM user_prompts WHERE user_id = $1 AND platform = $2",
        [userId, platform]
      );
      return result.rows[0];
    } catch (error) {
      console.log(
        "Database error in savePrompt, returning mock object:",
        error
      );
      // データベースエラーの場合、モックオブジェクトを返す
      return {
        user_id: userId,
        platform,
        prompt,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }
  }

  /**
   * 複数のプロンプトを一括保存
   */
  async saveMultiplePrompts(
    userId: string,
    prompts: { platform: Platform; prompt: string }[]
  ): Promise<UserPrompt[]> {
    try {
      // Ensure user exists
      await this.ensureUserExists(userId);

      return await databaseService.transaction(async (client) => {
        const savedPrompts: UserPrompt[] = [];

        const now = new Date().toISOString();
        for (const { platform, prompt } of prompts) {
          let result;

          // PostgreSQL
          const queryResult = await client.query(
            `INSERT INTO user_prompts (user_id, platform, prompt, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, platform)
             DO UPDATE SET
               prompt = EXCLUDED.prompt,
               updated_at = EXCLUDED.updated_at
             RETURNING *`,
            [userId, platform, prompt, now, now]
          );
          savedPrompts.push(queryResult.rows[0]);
        }

        return savedPrompts;
      });
    } catch (error) {
      console.log(
        "Database error in saveMultiplePrompts, returning mock objects:",
        error
      );
      // データベースエラーの場合、モックオブジェクトを返す
      return prompts.map(({ platform, prompt }) => ({
        user_id: userId,
        platform,
        prompt,
        created_at: new Date(),
        updated_at: new Date(),
      }));
    }
  }

  /**
   * プロンプトを削除
   */
  async deletePrompt(userId: string, platform: Platform): Promise<boolean> {
    try {
      const result = await databaseService.query(
        "DELETE FROM user_prompts WHERE user_id = $1 AND platform = $2",
        [userId, platform]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.log("Database error in deletePrompt:", error);
      return false;
    }
  }

  /**
   * ユーザーの全プロンプトを削除
   */
  async deleteAllPrompts(userId: string): Promise<boolean> {
    try {
      const result = await databaseService.query(
        "DELETE FROM user_prompts WHERE user_id = $1",
        [userId]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.log("Database error in deleteAllPrompts:", error);
      return false;
    }
  }

  private async ensureUserExists(userId: string): Promise<void> {
    try {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          userId
        );

      if (isUuid) {
        const existingById = await databaseService.query(
          "SELECT 1 FROM users WHERE id = $1",
          [userId]
        );

        if (existingById.rows.length > 0) {
          return;
        }

        const now = new Date().toISOString();
        await databaseService.query(
          `INSERT INTO users (id, email, name, created_at, updated_at, last_login_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            userId,
            `${userId}@placeholder.local`,
            `User ${userId}`,
            now,
            now,
            now,
          ]
        );
        return;
      }

      const existingByGoogleId = await databaseService.query(
        "SELECT 1 FROM users WHERE google_id = $1",
        [userId]
      );

      if (existingByGoogleId.rows.length > 0) {
        return;
      }

      const now = new Date().toISOString();
      await databaseService.query(
        `INSERT INTO users (id, google_id, email, name, created_at, updated_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (google_id) DO NOTHING`,
        [
          randomUUID(),
          userId,
          `${userId}@placeholder.local`,
          `User ${userId}`,
          now,
          now,
          now,
        ]
      );
    } catch (error) {
      console.log("Failed to ensure user exists:", error);
    }
  }

  /**
   * グローバルキャラクタープロンプトと統合された完全なプロンプトを取得
   */
  async getCombinedPrompt(userId: string, platform: Platform): Promise<string> {
    // グローバルキャラクタープロンプトを取得
    const globalPrompt =
      (await this.userSettingsService.getGlobalCharacterPrompt(userId)) ||
      this.userSettingsService.getDefaultGlobalCharacterPrompt();

    // プラットフォーム固有のプロンプトを取得
    const userPrompt = await this.getPromptByPlatform(userId, platform);
    const platformPrompt =
      userPrompt?.prompt || this.getDefaultPrompts()[platform];

    // 組み合わせて返す
    return `${globalPrompt}\n\n${platformPrompt}`;
  }

  /**
   * 複数プラットフォームの統合プロンプトを取得
   */
  async getCombinedPrompts(userId: string): Promise<Record<Platform, string>> {
    const platforms: Platform[] = [
      "twitter",
      "instagram",
      "tiktok",
      "threads",
      "youtube",
      "blog",
    ];
    const combinedPrompts: Record<Platform, string> = {} as Record<
      Platform,
      string
    >;

    for (const platform of platforms) {
      combinedPrompts[platform] = await this.getCombinedPrompt(
        userId,
        platform
      );
    }

    return combinedPrompts;
  }

  /**
   * デフォルトプロンプトを取得（システム共通のプロンプト）
   */
  getDefaultPrompts(): Record<Platform, string> {
    return {
      twitter:
        "Twitterに最適化されたコンテンツを生成してください。280文字以内で簡潔に、ハッシュタグを効果的に使用してください。",
      instagram:
        "Instagramに最適化されたコンテンツを生成してください。視覚的魅力を重視し、ハッシュタグを最大30個まで含めてください。",
      tiktok:
        "TikTokに最適化されたコンテンツを生成してください。若年層に刺さる、トレンドを意識した内容にしてください。",
      threads:
        "Threadsに最適化されたコンテンツを生成してください。会話を促進し、コミュニティ感を重視した内容にしてください。",
      youtube:
        "YouTubeに最適化されたコンテンツを生成してください。タイトル、説明文、台本を含めて詳細に作成してください。",
      blog: "ブログに最適化されたコンテンツを生成してください。SEOを意識し、詳細で価値のある情報を提供してください。",
    };
  }
}
