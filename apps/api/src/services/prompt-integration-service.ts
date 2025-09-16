import { Pool } from 'pg';
import { pool as defaultPool } from '../db/pool.js';
import { UserSettingsService } from './user-settings-service.js';
import { PromptService, Platform } from './prompt-service.js';

export interface PromptData {
  characterPrompt?: string;
  platformPrompt?: string;
  tempPrompt?: string;
}

export interface IntegratedPrompt {
  platform: Platform;
  finalPrompt: string;
  prompts: {
    characterPrompt?: string;
    platformPrompt?: string;
    tempPrompt?: string;
  };
}

export class PromptIntegrationService {
  private pool: Pool;
  private userSettingsService: UserSettingsService;
  private promptService: PromptService;

  constructor(pool?: Pool) {
    this.pool = pool || defaultPool;
    this.userSettingsService = new UserSettingsService(this.pool);
    this.promptService = new PromptService(this.pool);
  }

  /**
   * ユーザーの全プロンプト設定（キャラクター + 媒体別）を統合して最終プロンプトを生成
   */
  async buildIntegratedPrompts(
    userId: string, 
    platforms: Platform[], 
    tempPrompts?: { platform: Platform; prompt: string }[]
  ): Promise<IntegratedPrompt[]> {
    
    // 並列で取得
    const [userSettings, userPrompts] = await Promise.all([
      this.userSettingsService.getUserSettings(userId),
      this.promptService.getUserPrompts(userId)
    ]);

    const defaultPrompts = this.promptService.getDefaultPrompts();
    
    const integratedPrompts: IntegratedPrompt[] = [];
    
    for (const platform of platforms) {
      // キャラクタープロンプト
      const characterPrompt = userSettings?.global_character_prompt;
      
      // 媒体別プロンプト（ユーザー設定がなければデフォルト）
      const userPlatformPrompt = userPrompts.find(p => p.platform === platform);
      const platformPrompt = userPlatformPrompt?.prompt || defaultPrompts[platform];
      
      // 一時プロンプト
      const tempPrompt = tempPrompts?.find(p => p.platform === platform)?.prompt;
      
      // 最終プロンプトを構築
      const finalPrompt = this.constructFinalPrompt({
        characterPrompt,
        platformPrompt,
        tempPrompt
      });
      
      integratedPrompts.push({
        platform,
        finalPrompt,
        prompts: {
          characterPrompt,
          platformPrompt,
          tempPrompt
        }
      });
    }
    
    return integratedPrompts;
  }

  /**
   * 各種プロンプトを統合して最終的なプロンプトを構築
   */
  private constructFinalPrompt(prompts: PromptData): string {
    const parts: string[] = [];
    
    // 1. キャラクター設定（最初に適用）
    if (prompts.characterPrompt) {
      parts.push(`# キャラクター設定\n${prompts.characterPrompt}`);
    }
    
    // 2. 媒体別プロンプト
    if (prompts.platformPrompt) {
      parts.push(`# 媒体別要件\n${prompts.platformPrompt}`);
    }
    
    // 3. 一時的な追加指示（最後に適用、最優先）
    if (prompts.tempPrompt) {
      parts.push(`# 追加指示（優先適用）\n${prompts.tempPrompt}`);
    }
    
    return parts.length > 0 ? parts.join('\n\n') : '';
  }

  /**
   * 生成結果とともにプロンプト情報をデータベースに保存
   */
  async saveContentWithPrompts(
    contentId: string,
    platform: Platform,
    content: any,
    promptInfo: IntegratedPrompt
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // platform_contentにコンテンツを保存（既存のロジックはそのまま）
      await client.query(
        `INSERT INTO platform_content (
          id, content_id, platform, title, description, content, hashtags, script, chapters,
          character_prompt_used, platform_prompt_used, generation_prompt
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          character_prompt_used = EXCLUDED.character_prompt_used,
          platform_prompt_used = EXCLUDED.platform_prompt_used,
          generation_prompt = EXCLUDED.generation_prompt`,
        [
          `${contentId}_${platform}`,
          contentId,
          platform,
          content.title || null,
          content.description || null,
          content.content || null,
          JSON.stringify(content.hashtags || []),
          content.script || null,
          JSON.stringify(content.chapters || []),
          promptInfo.prompts.characterPrompt || null,
          promptInfo.prompts.platformPrompt || null,
          promptInfo.finalPrompt
        ]
      );
      
      // user_promptsの使用回数を更新
      if (promptInfo.prompts.platformPrompt) {
        await client.query(
          `UPDATE user_prompts 
           SET used_count = COALESCE(used_count, 0) + 1, last_used_at = CURRENT_TIMESTAMP
           WHERE user_id = (SELECT user_id FROM content_metadata WHERE id = $1)
           AND platform = $2`,
          [contentId, platform]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * コンテンツIDから使用されたプロンプト情報を取得
   */
  async getUsedPrompts(contentId: string, platform: Platform): Promise<PromptData | null> {
    const result = await this.pool.query(
      `SELECT character_prompt_used, platform_prompt_used, generation_prompt
       FROM platform_content
       WHERE content_id = $1 AND platform = $2`,
      [contentId, platform]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      characterPrompt: row.character_prompt_used,
      platformPrompt: row.platform_prompt_used,
      tempPrompt: row.generation_prompt // 統合済みプロンプト全体
    };
  }
}