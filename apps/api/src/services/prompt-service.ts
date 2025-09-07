import { Pool } from 'pg';
import { pool as defaultPool } from '../db/pool.js';

export interface UserPrompt {
  user_id: string;
  platform: string;
  prompt: string;
  created_at?: Date;
  updated_at?: Date;
}

export type Platform = 'twitter' | 'instagram' | 'tiktok' | 'threads' | 'youtube' | 'blog';

export class PromptService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || defaultPool;
  }

  /**
   * ユーザーのプロンプトを全て取得
   */
  async getUserPrompts(userId: string): Promise<UserPrompt[]> {
    const result = await this.pool.query(
      'SELECT * FROM user_prompts WHERE user_id = $1 ORDER BY platform',
      [userId]
    );
    return result.rows;
  }

  /**
   * 特定のプラットフォームのプロンプトを取得
   */
  async getPromptByPlatform(userId: string, platform: Platform): Promise<UserPrompt | null> {
    const result = await this.pool.query(
      'SELECT * FROM user_prompts WHERE user_id = $1 AND platform = $2',
      [userId, platform]
    );
    return result.rows[0] || null;
  }

  /**
   * プロンプトを保存（新規作成または更新）
   */
  async savePrompt(userId: string, platform: Platform, prompt: string): Promise<UserPrompt> {
    const result = await this.pool.query(
      `INSERT INTO user_prompts (user_id, platform, prompt)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, platform)
       DO UPDATE SET 
         prompt = EXCLUDED.prompt,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, platform, prompt]
    );
    return result.rows[0];
  }

  /**
   * 複数のプロンプトを一括保存
   */
  async saveMultiplePrompts(userId: string, prompts: { platform: Platform; prompt: string }[]): Promise<UserPrompt[]> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const savedPrompts: UserPrompt[] = [];
      
      for (const { platform, prompt } of prompts) {
        const result = await client.query(
          `INSERT INTO user_prompts (user_id, platform, prompt)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, platform)
           DO UPDATE SET 
             prompt = EXCLUDED.prompt,
             updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [userId, platform, prompt]
        );
        savedPrompts.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      return savedPrompts;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * プロンプトを削除
   */
  async deletePrompt(userId: string, platform: Platform): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM user_prompts WHERE user_id = $1 AND platform = $2',
      [userId, platform]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * ユーザーの全プロンプトを削除
   */
  async deleteAllPrompts(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM user_prompts WHERE user_id = $1',
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * デフォルトプロンプトを取得（システム共通のプロンプト）
   */
  getDefaultPrompts(): Record<Platform, string> {
    return {
      twitter: 'Twitterに最適化されたコンテンツを生成してください。',
      instagram: 'Instagramに最適化されたコンテンツを生成してください。',
      tiktok: 'TikTokに最適化されたコンテンツを生成してください。',
      threads: 'Threadsに最適化されたコンテンツを生成してください。',
      youtube: 'YouTubeに最適化されたコンテンツを生成してください。',
      blog: 'ブログに最適化されたコンテンツを生成してください。'
    };
  }
}