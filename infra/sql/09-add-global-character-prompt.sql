-- キャラクター全体プロンプト機能の追加

-- user_settingsテーブルにglobal_character_promptカラムを追加
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS global_character_prompt TEXT; -- 全媒体共通のキャラクタープロンプト

-- 既存のユーザーに対してデフォルトのグローバルキャラクタープロンプトを設定
UPDATE user_settings 
SET global_character_prompt = 'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。'
WHERE global_character_prompt IS NULL;

-- user_promptsテーブルにused_countカラムを追加（使用頻度統計用）
ALTER TABLE user_prompts 
ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;

-- platform_contentテーブルにcharacter_prompt_usedカラムを追加（使用されたキャラクタープロンプト保存用）
ALTER TABLE platform_content 
ADD COLUMN IF NOT EXISTS character_prompt_used TEXT, -- 生成時に使用したキャラクタープロンプト
ADD COLUMN IF NOT EXISTS platform_prompt_used TEXT; -- 生成時に使用した媒体別プロンプト

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_user_prompts_used_count ON user_prompts(used_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_prompts_last_used_at ON user_prompts(last_used_at DESC);