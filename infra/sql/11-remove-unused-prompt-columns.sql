-- 不要なプロンプト関連カラムとインデックスの削除

-- user_promptsテーブルの使用統計カラムとインデックスを削除
DROP INDEX IF EXISTS idx_user_prompts_used_count;
DROP INDEX IF EXISTS idx_user_prompts_last_used_at;

ALTER TABLE user_prompts
DROP COLUMN IF EXISTS used_count,
DROP COLUMN IF EXISTS last_used_at;

-- usersテーブルのプロンプト設定完了状態カラムを削除
ALTER TABLE users
DROP COLUMN IF EXISTS prompt_setup_completed,
DROP COLUMN IF EXISTS prompt_setup_completed_at;