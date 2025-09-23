import { databaseService } from './database-service.js';

export interface UserSettings {
  user_id: string;
  global_character_prompt?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class UserSettingsService {
  constructor() {}

  private async ensureUserExists(userId: string): Promise<void> {
    try {
      // ユーザーが既に存在するか確認
      const existingUser = await databaseService.query(
        'SELECT 1 FROM users WHERE id = $1',
        [userId]
      );

      if (existingUser.rows.length === 0) {
        // ユーザーが存在しない場合のみエラー
        console.error(`User ${userId} does not exist and cannot create without google_id`);
        throw new Error('User not found');
      }
    } catch (error) {
      console.error('Failed to ensure user exists:', error);
      throw error;
    }
  }

  /**
   * ユーザーのグローバルキャラクタープロンプトを取得
   */
  async getGlobalCharacterPrompt(userId: string): Promise<string | null> {
    try {
      const result = await databaseService.query(
        'SELECT global_character_prompt FROM user_settings WHERE user_id = $1 AND platform = $2 LIMIT 1',
        [userId, 'global']
      );
      return result.rows[0]?.global_character_prompt || null;
    } catch (error) {
      console.log('Database error in getGlobalCharacterPrompt, returning null:', error);
      return null;
    }
  }

  /**
   * ユーザーのグローバルキャラクタープロンプトを保存
   */
  async saveGlobalCharacterPrompt(userId: string, prompt: string): Promise<UserSettings> {
    try {
      // Ensure user exists
      await this.ensureUserExists(userId);

      const now = new Date().toISOString();
      // platform = 'global' として保存
      await databaseService.query(
        `INSERT INTO user_settings (user_id, platform, global_character_prompt, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, platform)
         DO UPDATE SET
           global_character_prompt = EXCLUDED.global_character_prompt,
           updated_at = $6`,
        [userId, 'global', prompt, now, now, now]
      );

      // Get the saved record
      const result = await databaseService.query(
        'SELECT * FROM user_settings WHERE user_id = $1 AND platform = $2',
        [userId, 'global']
      );
      return result.rows[0];
    } catch (error) {
      console.log('Database error in saveGlobalCharacterPrompt, returning mock object:', error);
      // データベースエラーの場合、モックオブジェクトを返す
      return {
        user_id: userId,
        global_character_prompt: prompt,
        created_at: new Date(),
        updated_at: new Date()
      };
    }
  }

  /**
   * ユーザーのグローバルキャラクタープロンプトを削除
   */
  async deleteGlobalCharacterPrompt(userId: string): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const result = await databaseService.query(
        'UPDATE user_settings SET global_character_prompt = NULL, updated_at = $2 WHERE user_id = $1 AND platform = $3',
        [userId, now, 'global']
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.log('Database error in deleteGlobalCharacterPrompt:', error);
      return false;
    }
  }

  /**
   * ユーザー設定を初期化（ユーザー登録時に使用）
   */
  async initializeUserSettings(userId: string): Promise<UserSettings> {
    try {
      const defaultPrompt = 'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。';

      // Ensure user exists
      await this.ensureUserExists(userId);

      const now = new Date().toISOString();
      await databaseService.query(
        `INSERT INTO user_settings (user_id, platform, global_character_prompt, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, platform) DO NOTHING`,
        [userId, 'global', defaultPrompt, now, now]
      );

      // 設定を取得して返す
      const existing = await databaseService.query(
        'SELECT * FROM user_settings WHERE user_id = $1 AND platform = $2',
        [userId, 'global']
      );
      return existing.rows[0];
    } catch (error) {
      console.log('Database error in initializeUserSettings:', error);
      return {
        user_id: userId,
        global_character_prompt: this.getDefaultGlobalCharacterPrompt(),
        created_at: new Date(),
        updated_at: new Date()
      };
    }
  }

  /**
   * ユーザー設定全体を取得
   */
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const result = await databaseService.query(
        'SELECT * FROM user_settings WHERE user_id = $1 AND platform = $2',
        [userId, 'global']
      );
      return result.rows[0] || null;
    } catch (error) {
      console.log('Database error in getUserSettings:', error);
      return null;
    }
  }

  /**
   * デフォルトのグローバルキャラクタープロンプトを取得
   */
  getDefaultGlobalCharacterPrompt(): string {
    return 'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。';
  }
}