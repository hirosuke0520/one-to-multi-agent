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
   * ユーザー設定を取得
   */
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    // user_settingsテーブルから任意の1つのプラットフォームのレコードを取得して
    // global_character_promptを取得する
    const result = await this.pool.query(
      'SELECT user_id, global_character_prompt, created_at, updated_at FROM user_settings WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      // レコードが存在しない場合、デフォルト設定で初期化
      await this.initializeUserSettings(userId);
      return {
        user_id: userId,
        global_character_prompt: this.getDefaultGlobalCharacterPrompt()
      };
    }
    
    return result.rows[0];
  }

  /**
   * グローバルキャラクタープロンプトを保存
   */
  async saveGlobalCharacterPrompt(userId: string, globalCharacterPrompt: string): Promise<UserSettings> {
    // 全てのプラットフォーム向けのレコードのglobal_character_promptを更新
    const result = await this.pool.query(
      `UPDATE user_settings 
       SET global_character_prompt = $2, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING user_id, global_character_prompt, created_at, updated_at
       LIMIT 1`,
      [userId, globalCharacterPrompt]
    );
    
    if (result.rows.length === 0) {
      // レコードが存在しない場合、まず初期化してから更新
      await this.initializeUserSettings(userId);
      return this.saveGlobalCharacterPrompt(userId, globalCharacterPrompt);
    }
    
    return result.rows[0];
  }

  /**
   * ユーザー設定全体を保存
   */
  async saveUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // user_settingsテーブルの全プラットフォームのglobal_character_promptを更新
      if (settings.global_character_prompt !== undefined) {
        await client.query(
          `UPDATE user_settings 
           SET global_character_prompt = $2, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1`,
          [userId, settings.global_character_prompt]
        );
      }
      
      // 更新後の設定を取得
      const result = await client.query(
        'SELECT user_id, global_character_prompt, created_at, updated_at FROM user_settings WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        throw new Error('Failed to save user settings');
      }
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * ユーザー設定をリセット（デフォルトに戻す）
   */
  async resetUserSettings(userId: string): Promise<boolean> {
    const defaultPrompt = this.getDefaultGlobalCharacterPrompt();
    
    const result = await this.pool.query(
      `UPDATE user_settings 
       SET global_character_prompt = $2, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId, defaultPrompt]
    );
    
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * ユーザー設定を初期化
   */
  private async initializeUserSettings(userId: string): Promise<void> {
    // ensure_user_settings関数を呼び出してデフォルト設定を作成
    await this.pool.query(
      'SELECT ensure_user_settings($1)',
      [userId]
    );
  }

  /**
   * デフォルトのグローバルキャラクタープロンプトを取得
   */
  getDefaultGlobalCharacterPrompt(): string {
    return 'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。';
  }
}