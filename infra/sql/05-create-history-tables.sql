-- コンテンツ生成履歴テーブル
CREATE TABLE IF NOT EXISTS content_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('text', 'audio', 'video')),
    source_text TEXT,
    platforms TEXT[] NOT NULL,
    results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_content_history_user_id ON content_history(user_id);
CREATE INDEX IF NOT EXISTS idx_content_history_created_at ON content_history(created_at DESC);

-- プラットフォーム別コンテンツテーブル
CREATE TABLE IF NOT EXISTS platform_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    history_id UUID NOT NULL REFERENCES content_history(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_platform_contents_history_id ON platform_contents(history_id);
CREATE INDEX IF NOT EXISTS idx_platform_contents_platform ON platform_contents(platform);