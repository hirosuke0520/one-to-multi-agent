import { Hono } from 'hono';
import { authMiddleware } from '../middlewares/auth.js';
import { PromptService, Platform } from '../services/prompt-service.js';
import { UserSettingsService } from '../services/user-settings-service.js';

type Variables = {
  userId: string;
  email: string;
  name: string;
};

const app = new Hono<{ Variables: Variables }>();
const promptService = new PromptService();
const userSettingsService = new UserSettingsService();

// 全てのエンドポイントに認証を適用
app.use('*', authMiddleware);

// ユーザーの全プロンプトを取得
app.get('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const prompts = await promptService.getUserPrompts(userId);
    
    // デフォルトプロンプトとマージ
    const defaultPrompts = promptService.getDefaultPrompts();
    const mergedPrompts: Record<string, string> = {};
    
    // デフォルトプロンプトを設定
    Object.keys(defaultPrompts).forEach((platform) => {
      mergedPrompts[platform] = defaultPrompts[platform as Platform];
    });
    
    // ユーザーのカスタムプロンプトで上書き
    prompts.forEach((prompt) => {
      mergedPrompts[prompt.platform] = prompt.prompt;
    });
    
    return c.json({ prompts: mergedPrompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return c.json({ error: 'Failed to fetch prompts' }, 500);
  }
});

// 統合プロンプト（グローバルキャラクター + プラットフォーム固有）を取得
app.get('/combined', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const prompts = await promptService.getUserPrompts(userId);

    // グローバルキャラクタープロンプトを取得
    const globalCharacterPrompt = await userSettingsService.getGlobalCharacterPrompt(userId);
    const defaultGlobalPrompt = userSettingsService.getDefaultGlobalCharacterPrompt();
    const characterPrompt = globalCharacterPrompt || defaultGlobalPrompt;

    // デフォルトプロンプトとマージ
    const defaultPrompts = promptService.getDefaultPrompts();
    const combinedPrompts: Record<string, string> = {};

    // 各プラットフォームの統合プロンプトを生成
    Object.keys(defaultPrompts).forEach((platform) => {
      const userPrompt = prompts.find(p => p.platform === platform);
      const platformPrompt = userPrompt?.prompt || defaultPrompts[platform as Platform];

      // キャラクタープロンプト + プラットフォーム固有プロンプト
      combinedPrompts[platform] = `${characterPrompt}\n\n${platformPrompt}`;
    });

    return c.json({ prompts: combinedPrompts });
  } catch (error) {
    console.error('Error fetching combined prompts:', error);
    return c.json({ error: 'Failed to fetch combined prompts' }, 500);
  }
});

// 特定プラットフォームのプロンプトを取得
app.get('/:platform', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const platform = c.req.param('platform') as Platform;
    
    const validPlatforms: Platform[] = ['twitter', 'instagram', 'tiktok', 'threads', 'youtube', 'blog'];
    if (!validPlatforms.includes(platform)) {
      return c.json({ error: 'Invalid platform' }, 400);
    }
    
    const userPrompt = await promptService.getPromptByPlatform(userId, platform);
    
    // ユーザープロンプトがなければデフォルトを返す
    const prompt = userPrompt?.prompt || promptService.getDefaultPrompts()[platform];
    
    return c.json({ platform, prompt });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return c.json({ error: 'Failed to fetch prompt' }, 500);
  }
});

// プロンプトを保存（単一）
app.put('/:platform', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const platform = c.req.param('platform') as Platform;
    const { prompt } = await c.req.json<{ prompt: string }>();
    
    const validPlatforms: Platform[] = ['twitter', 'instagram', 'tiktok', 'threads', 'youtube', 'blog'];
    if (!validPlatforms.includes(platform)) {
      return c.json({ error: 'Invalid platform' }, 400);
    }
    
    if (!prompt || typeof prompt !== 'string') {
      return c.json({ error: 'Invalid prompt' }, 400);
    }
    
    const savedPrompt = await promptService.savePrompt(userId, platform, prompt);
    return c.json(savedPrompt);
  } catch (error) {
    console.error('Error saving prompt:', error);
    return c.json({ error: 'Failed to save prompt' }, 500);
  }
});

// 複数プロンプトを一括保存
app.post('/batch', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { prompts } = await c.req.json<{
      prompts: Record<string, string>
    }>();
    
    if (!prompts || typeof prompts !== 'object') {
      return c.json({ error: 'Invalid prompts data' }, 400);
    }
    
    const validPlatforms: Platform[] = ['twitter', 'instagram', 'tiktok', 'threads', 'youtube', 'blog'];
    const promptsArray: { platform: Platform; prompt: string }[] = [];
    
    for (const [platform, prompt] of Object.entries(prompts)) {
      if (validPlatforms.includes(platform as Platform) && typeof prompt === 'string' && prompt.length > 0) {
        promptsArray.push({
          platform: platform as Platform,
          prompt
        });
      }
    }
    
    if (promptsArray.length === 0) {
      return c.json({ error: 'No valid prompts provided' }, 400);
    }
    
    const savedPrompts = await promptService.saveMultiplePrompts(userId, promptsArray);
    return c.json({ savedPrompts });
  } catch (error) {
    console.error('Error saving prompts:', error);
    return c.json({ error: 'Failed to save prompts' }, 500);
  }
});

// プロンプトを削除
app.delete('/:platform', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const platform = c.req.param('platform') as Platform;
    
    const validPlatforms: Platform[] = ['twitter', 'instagram', 'tiktok', 'threads', 'youtube', 'blog'];
    if (!validPlatforms.includes(platform)) {
      return c.json({ error: 'Invalid platform' }, 400);
    }
    
    const deleted = await promptService.deletePrompt(userId, platform);
    
    if (!deleted) {
      return c.json({ error: 'Prompt not found' }, 404);
    }
    
    return c.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return c.json({ error: 'Failed to delete prompt' }, 500);
  }
});

// 全プロンプトをリセット（削除）
app.delete('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    await promptService.deleteAllPrompts(userId);
    return c.json({ message: 'All prompts reset to defaults' });
  } catch (error) {
    console.error('Error resetting prompts:', error);
    return c.json({ error: 'Failed to reset prompts' }, 500);
  }
});


// 特定プラットフォームの統合プロンプトを取得
app.get('/combined/:platform', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const platform = c.req.param('platform') as Platform;

    const validPlatforms: Platform[] = ['twitter', 'instagram', 'tiktok', 'threads', 'youtube', 'blog'];
    if (!validPlatforms.includes(platform)) {
      return c.json({ error: 'Invalid platform' }, 400);
    }

    const combinedPrompt = await promptService.getCombinedPrompt(userId, platform);

    return c.json({
      platform,
      combinedPrompt
    });
  } catch (error) {
    console.error('Error fetching combined prompt:', error);
    return c.json({ error: 'Failed to fetch combined prompt' }, 500);
  }
});

export default app;