import { Pool } from 'pg';
import { pool as defaultPool } from '../db/pool.js';

export class PromptSetupService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || defaultPool;
  }

  /**
   * プロンプト設定が完了しているかを直接判定
   * 条件: グローバルキャラクタープロンプト AND いずれかのプラットフォーム専用プロンプト
   */
  async getPromptSetupStatus(userId: string): Promise<boolean> {
    const hasGlobalPrompt = await this.hasGlobalCharacterPrompt(userId);
    const hasAnyPlatformPrompt = await this.hasAnyPlatformPrompt(userId);

    return hasGlobalPrompt && hasAnyPlatformPrompt;
  }

  /**
   * プロンプト設定の詳細状況を取得（デバッグ用）
   */
  async getPromptSetupDetails(userId: string): Promise<{
    hasGlobalPrompt: boolean;
    hasAnyPlatformPrompt: boolean;
    platformPromptCount: number;
    isComplete: boolean;
  }> {
    const hasGlobalPrompt = await this.hasGlobalCharacterPrompt(userId);
    const platformPromptResult = await this.getPlatformPromptDetails(userId);

    return {
      hasGlobalPrompt,
      hasAnyPlatformPrompt: platformPromptResult.hasAny,
      platformPromptCount: platformPromptResult.count,
      isComplete: hasGlobalPrompt && platformPromptResult.hasAny
    };
  }

  async hasGlobalCharacterPrompt(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT global_character_prompt
       FROM user_settings
       WHERE user_id = $1
         AND global_character_prompt IS NOT NULL
         AND LENGTH(TRIM(global_character_prompt)) > 0
       LIMIT 1`,
      [userId]
    );

    return result.rows.length > 0;
  }

  private async hasAnyPlatformPrompt(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS count
       FROM user_prompts
       WHERE user_id = $1
         AND prompt IS NOT NULL
         AND LENGTH(TRIM(prompt)) > 0`,
      [userId]
    );

    return (result.rows[0]?.count ?? 0) > 0;
  }

  private async getPlatformPromptDetails(userId: string): Promise<{
    hasAny: boolean;
    count: number;
    platforms: string[];
  }> {
    const result = await this.pool.query(
      `SELECT platform
       FROM user_prompts
       WHERE user_id = $1
         AND prompt IS NOT NULL
         AND LENGTH(TRIM(prompt)) > 0`,
      [userId]
    );

    const platforms = result.rows.map(row => row.platform);
    return {
      hasAny: platforms.length > 0,
      count: platforms.length,
      platforms
    };
  }

  /**
   * 特定のプラットフォームのプロンプト設定状況を確認
   */
  async hasPlatformPrompt(userId: string, platform: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1
       FROM user_prompts
       WHERE user_id = $1
         AND platform = $2
         AND prompt IS NOT NULL
         AND LENGTH(TRIM(prompt)) > 0`,
      [userId, platform]
    );

    return result.rows.length > 0;
  }

}
