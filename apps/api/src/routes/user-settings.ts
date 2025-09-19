import { Hono } from 'hono';
import { authMiddleware } from '../middlewares/auth.js';
import { UserSettingsService } from '../services/user-settings-service.js';

type Variables = {
  userId: string;
  email: string;
  name: string;
};

const app = new Hono<{ Variables: Variables }>();
const userSettingsService = new UserSettingsService();

// 全てのエンドポイントに認証を適用
app.use('*', authMiddleware);

// グローバルキャラクタープロンプトを取得
app.get('/global-character-prompt', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const prompt = await userSettingsService.getGlobalCharacterPrompt(userId);

    return c.json({
      globalCharacterPrompt: prompt || userSettingsService.getDefaultGlobalCharacterPrompt()
    });
  } catch (error) {
    console.error('Error fetching global character prompt:', error);
    return c.json({ error: 'Failed to fetch global character prompt' }, 500);
  }
});

// グローバルキャラクタープロンプトを保存
app.put('/global-character-prompt', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { prompt } = await c.req.json<{ prompt: string }>();

    if (!prompt || typeof prompt !== 'string') {
      return c.json({ error: 'Invalid prompt' }, 400);
    }

    if (prompt.length > 5000) {
      return c.json({ error: 'Prompt is too long (max 5000 characters)' }, 400);
    }

    const savedSettings = await userSettingsService.saveGlobalCharacterPrompt(userId, prompt);
    return c.json({
      message: 'Global character prompt saved successfully',
      globalCharacterPrompt: savedSettings.global_character_prompt
    });
  } catch (error) {
    console.error('Error saving global character prompt:', error);
    return c.json({ error: 'Failed to save global character prompt' }, 500);
  }
});

// グローバルキャラクタープロンプトを削除（デフォルトに戻す）
app.delete('/global-character-prompt', async (c) => {
  try {
    const userId = c.get('userId') as string;
    await userSettingsService.deleteGlobalCharacterPrompt(userId);

    return c.json({
      message: 'Global character prompt reset to default',
      globalCharacterPrompt: userSettingsService.getDefaultGlobalCharacterPrompt()
    });
  } catch (error) {
    console.error('Error resetting global character prompt:', error);
    return c.json({ error: 'Failed to reset global character prompt' }, 500);
  }
});

// ユーザー設定全体を取得
app.get('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    let settings = await userSettingsService.getUserSettings(userId);

    // 初回アクセス時は設定を初期化
    if (!settings) {
      settings = await userSettingsService.initializeUserSettings(userId);
    }

    return c.json({
      settings: {
        userId: settings.user_id,
        globalCharacterPrompt: settings.global_character_prompt || userSettingsService.getDefaultGlobalCharacterPrompt(),
        createdAt: settings.created_at,
        updatedAt: settings.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return c.json({ error: 'Failed to fetch user settings' }, 500);
  }
});

// ユーザー設定を初期化（新規ユーザー登録時などに使用）
app.post('/initialize', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const settings = await userSettingsService.initializeUserSettings(userId);

    return c.json({
      message: 'User settings initialized successfully',
      settings: {
        userId: settings.user_id,
        globalCharacterPrompt: settings.global_character_prompt,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at
      }
    });
  } catch (error) {
    console.error('Error initializing user settings:', error);
    return c.json({ error: 'Failed to initialize user settings' }, 500);
  }
});

export default app;