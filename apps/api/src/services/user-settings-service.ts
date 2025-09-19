import { Pool } from 'pg';
import { pool as defaultPool } from '../db/pool.js';

export interface UserSettings {
  user_id: string;
  global_character_prompt?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class UserSettingsService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || defaultPool;
  }

  /**
   * ユーザーのグローバルキャラクタープロンプトを取得
   */
  async getGlobalCharacterPrompt(userId: string): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT global_character_prompt FROM user_settings WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    return result.rows[0]?.global_character_prompt || null;
  }

  /**
   * ユーザーのグローバルキャラクタープロンプトを保存
   */
  async saveGlobalCharacterPrompt(userId: string, prompt: string): Promise<UserSettings> {
    const result = await this.pool.query(
      `INSERT INTO user_settings (user_id, global_character_prompt, created_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET
         global_character_prompt = EXCLUDED.global_character_prompt,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, prompt]
    );
    return result.rows[0];
  }

  /**
   * ユーザーのグローバルキャラクタープロンプトを削除
   */
  async deleteGlobalCharacterPrompt(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE user_settings SET global_character_prompt = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * ユーザー設定を初期化（ユーザー登録時に使用）
   */
  async initializeUserSettings(userId: string): Promise<UserSettings> {
    const defaultPrompt = 'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。';

    const result = await this.pool.query(
      `INSERT INTO user_settings (user_id, global_character_prompt, created_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO NOTHING
       RETURNING *`,
      [userId, defaultPrompt]
    );

    // 既存の場合は現在の設定を返す
    if (result.rows.length === 0) {
      const existing = await this.pool.query(
        'SELECT * FROM user_settings WHERE user_id = $1',
        [userId]
      );
      return existing.rows[0];
    }

    return result.rows[0];
  }

  /**
   * ユーザー設定全体を取得
   */
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const result = await this.pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * デフォルトのグローバルキャラクタープロンプトを取得
   */
  getDefaultGlobalCharacterPrompt(): string {
    return 'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。';
  }
}