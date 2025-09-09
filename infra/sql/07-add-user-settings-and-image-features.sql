-- ユーザー設定とプロンプト管理、画像生成機能の追加

-- ユーザー設定テーブル（キャラクター設定と画像保存）
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    character_prompt TEXT, -- キャラクター全体のプロンプト
    character_image_path TEXT, -- GCSに保存されたキャラクター元画像のパス
    character_image_name TEXT, -- オリジナルファイル名
    character_image_size BIGINT, -- ファイルサイズ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- platform_contentテーブルにプロンプト保存用カラムを追加
ALTER TABLE platform_content 
ADD COLUMN IF NOT EXISTS generation_prompt TEXT, -- 生成時に使用したプロンプト
ADD COLUMN IF NOT EXISTS image_generation_prompt TEXT; -- 画像生成プロンプト（英語）

-- 生成画像管理テーブル
CREATE TABLE IF NOT EXISTS platform_content_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_content_id INTEGER NOT NULL REFERENCES platform_content(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL, -- GCSに保存された画像のパス
    image_name TEXT, -- 生成された画像ファイル名
    image_size BIGINT, -- ファイルサイズ
    image_width INTEGER, -- 画像の幅
    image_height INTEGER, -- 画像の高さ
    aspect_ratio VARCHAR(20), -- アスペクト比（例: "1:1", "16:9", "9:16"）
    generation_prompt TEXT, -- 画像生成に使用したプロンプト（英語）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_platform_content_images_content_id ON platform_content_images(platform_content_id);
CREATE INDEX IF NOT EXISTS idx_platform_content_images_created_at ON platform_content_images(created_at DESC);

-- user_settingsの更新時刻自動更新トリガー
CREATE TRIGGER IF NOT EXISTS update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- デフォルトのキャラクタープロンプト挿入用の関数
CREATE OR REPLACE FUNCTION ensure_user_settings(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_settings (user_id, character_prompt)
    VALUES (
        p_user_id, 
        'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。各SNSプラットフォームの特性を理解し、魅力的で engaging なコンテンツを作成してください。'
    )
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 既存のユーザーに対してデフォルト設定を追加
INSERT INTO user_settings (user_id, character_prompt)
SELECT 
    id, 
    'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。各SNSプラットフォームの特性を理解し、魅力的で engaging なコンテンツを作成してください。'
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- プラットフォーム別のデフォルトプロンプト確認・挿入
INSERT INTO user_prompts (user_id, platform, prompt)
SELECT 
    u.id,
    'twitter',
    'Twitterに最適化された、280文字以内の魅力的なツイートを作成してください。話題性があり、リツイートしたくなるような内容にしてください。'
FROM users u
ON CONFLICT (user_id, platform) DO NOTHING;

INSERT INTO user_prompts (user_id, platform, prompt)
SELECT 
    u.id,
    'instagram',
    'Instagramに最適化された、視覚的で魅力的なキャプションを作成してください。ハッシュタグも含めて、フォロワーとのエンゲージメントを高めるような内容にしてください。'
FROM users u
ON CONFLICT (user_id, platform) DO NOTHING;

INSERT INTO user_prompts (user_id, platform, prompt)
SELECT 
    u.id,
    'tiktok',
    'TikTokに最適化された、トレンドを意識した短くてキャッチーなキャプションを作成してください。若い世代にアピールする内容にしてください。'
FROM users u
ON CONFLICT (user_id, platform) DO NOTHING;

INSERT INTO user_prompts (user_id, platform, prompt)
SELECT 
    u.id,
    'threads',
    'Threadsに最適化された、親しみやすくカジュアルなトーンで会話を促進するような投稿を作成してください。'
FROM users u
ON CONFLICT (user_id, platform) DO NOTHING;

INSERT INTO user_prompts (user_id, platform, prompt)
SELECT 
    u.id,
    'youtube',
    'YouTubeに最適化された、視聴者の興味を引く魅力的なタイトルと説明文、そして詳細な台本を作成してください。SEOも意識してください。'
FROM users u
ON CONFLICT (user_id, platform) DO NOTHING;

INSERT INTO user_prompts (user_id, platform, prompt)
SELECT 
    u.id,
    'blog',
    'ブログに最適化された、SEOを意識した構造的で読みやすい記事を作成してください。読者に価値を提供する詳細な内容にしてください。'
FROM users u
ON CONFLICT (user_id, platform) DO NOTHING;