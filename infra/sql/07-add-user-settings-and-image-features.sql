-- ユーザー設定とプロンプト管理、画像生成機能の追加

-- ユーザー設定テーブル（媒体別キャラクター設定と画像保存）
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('twitter', 'instagram', 'tiktok', 'threads', 'youtube', 'blog')),
    character_prompt TEXT, -- 媒体別キャラクタープロンプト
    character_image_path TEXT, -- GCSに保存されたキャラクター元画像のパス
    character_image_name TEXT, -- オリジナルファイル名
    character_image_size BIGINT, -- ファイルサイズ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, platform)
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

-- 媒体別デフォルトキャラクタープロンプト挿入用の関数
CREATE OR REPLACE FUNCTION ensure_user_settings(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    platform_list TEXT[] := ARRAY['twitter', 'instagram', 'tiktok', 'threads', 'youtube', 'blog'];
    platform_name TEXT;
BEGIN
    FOREACH platform_name IN ARRAY platform_list
    LOOP
        INSERT INTO user_settings (user_id, platform, character_prompt)
        VALUES (
            p_user_id,
            platform_name,
            CASE 
                WHEN platform_name = 'twitter' THEN 'あなたは親しみやすく、Twitter向けの簡潔で魅力的なコンテンツクリエイターです。'
                WHEN platform_name = 'instagram' THEN 'あなたは親しみやすく、Instagram向けの視覚的で魅力的なコンテンツクリエイターです。'
                WHEN platform_name = 'tiktok' THEN 'あなたは親しみやすく、TikTok向けのトレンド感あふれるコンテンツクリエイターです。'
                WHEN platform_name = 'threads' THEN 'あなたは親しみやすく、Threads向けのカジュアルなコンテンツクリエイターです。'
                WHEN platform_name = 'youtube' THEN 'あなたは親しみやすく、YouTube向けの詳細で魅力的なコンテンツクリエイターです。'
                WHEN platform_name = 'blog' THEN 'あなたは親しみやすく、ブログ向けの構造的で読みやすいコンテンツクリエイターです。'
                ELSE 'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。'
            END
        )
        ON CONFLICT (user_id, platform) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 既存のユーザーに対して媒体別デフォルト設定を追加
INSERT INTO user_settings (user_id, platform, character_prompt)
SELECT 
    u.id,
    p.platform,
    CASE 
        WHEN p.platform = 'twitter' THEN 'あなたは親しみやすく、Twitter向けの簡潔で魅力的なコンテンツクリエイターです。'
        WHEN p.platform = 'instagram' THEN 'あなたは親しみやすく、Instagram向けの視覚的で魅力的なコンテンツクリエイターです。'
        WHEN p.platform = 'tiktok' THEN 'あなたは親しみやすく、TikTok向けのトレンド感あふれるコンテンツクリエイターです。'
        WHEN p.platform = 'threads' THEN 'あなたは親しみやすく、Threads向けのカジュアルなコンテンツクリエイターです。'
        WHEN p.platform = 'youtube' THEN 'あなたは親しみやすく、YouTube向けの詳細で魅力的なコンテンツクリエイターです。'
        WHEN p.platform = 'blog' THEN 'あなたは親しみやすく、ブログ向けの構造的で読みやすいコンテンツクリエイターです。'
        ELSE 'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。'
    END
FROM users u
CROSS JOIN (VALUES ('twitter'), ('instagram'), ('tiktok'), ('threads'), ('youtube'), ('blog')) AS p(platform)
ON CONFLICT (user_id, platform) DO NOTHING;

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