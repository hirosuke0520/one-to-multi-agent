-- ユーザーごとのプロンプト設定テーブル
CREATE TABLE IF NOT EXISTS user_prompts (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('twitter', 'instagram', 'tiktok', 'threads', 'youtube', 'blog')),
    prompt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, platform)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_prompts_user_id ON user_prompts(user_id);

-- 更新時刻の自動更新トリガー（既に存在する場合はスキップ）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの作成
DROP TRIGGER IF EXISTS update_user_prompts_updated_at ON user_prompts;
CREATE TRIGGER update_user_prompts_updated_at 
    BEFORE UPDATE ON user_prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();