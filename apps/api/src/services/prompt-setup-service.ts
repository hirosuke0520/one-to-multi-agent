import { Pool } from 'pg';
import { pool as defaultPool } from '../db/pool.js';

export class PromptSetupService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || defaultPool;
  }

  /**
   * プロンプト設定が完了しているか判定し、ユーザーのステータスを更新
   */
  async evaluatePromptSetupStatus(userId: string): Promise<boolean> {
    const hasGlobalPrompt = await this.hasGlobalCharacterPrompt(userId);
    const hasAnyPlatformPrompt = await this.hasAnyPlatformPrompt(userId);
    const completed = hasGlobalPrompt && hasAnyPlatformPrompt;

    await this.updatePromptSetupFlag(userId, completed);

    return completed;
  }

  /**
   * ユーザーの現在のプロンプト設定完了フラグを取得
   */
  async getPromptSetupStatus(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT prompt_setup_completed FROM users WHERE id = $1',
      [userId]
    );

    return !!result.rows[0]?.prompt_setup_completed;
  }

  private async hasGlobalCharacterPrompt(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT global_character_prompt
       FROM user_settings
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const prompt = result.rows[0].global_character_prompt as string | null;
    return !!prompt && prompt.trim().length > 0;
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

  private async updatePromptSetupFlag(userId: string, completed: boolean): Promise<void> {
    await this.pool.query(
      `UPDATE users
       SET
         prompt_setup_completed = $2,
         prompt_setup_completed_at = CASE
           WHEN $2 THEN COALESCE(prompt_setup_completed_at, CURRENT_TIMESTAMP)
           ELSE NULL
         END
       WHERE id = $1
         AND (
           prompt_setup_completed IS DISTINCT FROM $2
           OR ($2 AND prompt_setup_completed_at IS NULL)
           OR (NOT $2 AND prompt_setup_completed_at IS NOT NULL)
         )`,
      [userId, completed]
    );
  }
}
