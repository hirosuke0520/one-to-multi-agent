import { Hono } from 'hono';
import { authMiddleware } from '../middlewares/auth.js';
import { UserSettingsService } from '../services/user-settings-service.js';
import { PromptSetupService } from '../services/prompt-setup-service.js';
import { PromptIntegrationService } from '../services/prompt-integration-service.js';

type Variables = {
  userId: string;
  email: string;
  name: string;
};

const app = new Hono<{ Variables: Variables }>();
const userSettingsService = new UserSettingsService();
const promptSetupService = new PromptSetupService();
const promptIntegrationService = new PromptIntegrationService();

// 全てのエンドポイントに認証を適用
app.use('*', authMiddleware);

// ユーザー設定を取得
app.get('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const userSettings = await userSettingsService.getUserSettings(userId);
    
    return c.json({ 
      userSettings: {
        globalCharacterPrompt: userSettings?.global_character_prompt || userSettingsService.getDefaultGlobalCharacterPrompt()
      }
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return c.json({ error: 'Failed to fetch user settings' }, 500);
  }
});

// ユーザー設定を保存
app.post('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { globalCharacterPrompt } = await c.req.json<{ 
      globalCharacterPrompt?: string 
    }>();
    
    if (globalCharacterPrompt !== undefined && typeof globalCharacterPrompt !== 'string') {
      return c.json({ error: 'Invalid global character prompt' }, 400);
    }
    
    const settings: { global_character_prompt?: string } = {};
    if (globalCharacterPrompt !== undefined) {
      settings.global_character_prompt = globalCharacterPrompt;
    }
    
    const savedSettings = await userSettingsService.saveUserSettings(userId, settings);
    const completed = await promptSetupService.evaluatePromptSetupStatus(userId);
    
    return c.json({ 
      userSettings: {
        globalCharacterPrompt: savedSettings.global_character_prompt
      },
      promptSetupCompleted: completed
    });
  } catch (error) {
    console.error('Error saving user settings:', error);
    return c.json({ error: 'Failed to save user settings' }, 500);
  }
});

// グローバルキャラクタープロンプトのみを更新
app.put('/character-prompt', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { globalCharacterPrompt } = await c.req.json<{ 
      globalCharacterPrompt: string 
    }>();
    
    if (!globalCharacterPrompt || typeof globalCharacterPrompt !== 'string') {
      return c.json({ error: 'Invalid global character prompt' }, 400);
    }
    
    const savedSettings = await userSettingsService.saveGlobalCharacterPrompt(userId, globalCharacterPrompt);
    const completed = await promptSetupService.evaluatePromptSetupStatus(userId);
    
    return c.json({ 
      userSettings: {
        globalCharacterPrompt: savedSettings.global_character_prompt
      },
      promptSetupCompleted: completed
    });
  } catch (error) {
    console.error('Error saving global character prompt:', error);
    return c.json({ error: 'Failed to save global character prompt' }, 500);
  }
});

// プロンプトを保存
app.post('/prompts', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { platform, prompt } = await c.req.json<{
      platform: string;
      prompt: string;
    }>();

    if (!platform || typeof platform !== 'string') {
      return c.json({ error: 'Invalid platform' }, 400);
    }

    if (!prompt || typeof prompt !== 'string') {
      return c.json({ error: 'Invalid prompt' }, 400);
    }

    const savedPrompt = await promptIntegrationService.savePlatformPrompt(userId, platform, prompt);
    const completed = await promptSetupService.evaluatePromptSetupStatus(userId);

    return c.json({
      prompt: savedPrompt,
      promptSetupCompleted: completed
    });
  } catch (error) {
    console.error('Error saving prompt:', error);
    return c.json({ error: 'Failed to save prompt' }, 500);
  }
});

// ユーザー設定をリセット
app.delete('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const success = await userSettingsService.resetUserSettings(userId);

    if (!success) {
      return c.json({ error: 'User settings not found' }, 404);
    }

    const completed = await promptSetupService.evaluatePromptSetupStatus(userId);

    return c.json({
      message: 'User settings reset to defaults',
      userSettings: {
        globalCharacterPrompt: userSettingsService.getDefaultGlobalCharacterPrompt()
      },
      promptSetupCompleted: completed
    });
  } catch (error) {
    console.error('Error resetting user settings:', error);
    return c.json({ error: 'Failed to reset user settings' }, 500);
  }
});

export default app;
