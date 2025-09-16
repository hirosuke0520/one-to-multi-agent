-- プロンプト設定完了状態の追跡用カラムを追加

ALTER TABLE users
ADD COLUMN IF NOT EXISTS prompt_setup_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS prompt_setup_completed_at TIMESTAMP;

-- 既存ユーザーで既にプロンプトを保存済みのユーザーを完了状態にする
UPDATE users u
SET
  prompt_setup_completed = TRUE,
  prompt_setup_completed_at = COALESCE(prompt_setup_completed_at, CURRENT_TIMESTAMP)
WHERE
  (prompt_setup_completed IS DISTINCT FROM TRUE OR prompt_setup_completed_at IS NULL)
  AND EXISTS (
    SELECT 1
    FROM user_prompts up
    WHERE up.user_id = u.id
      AND up.prompt IS NOT NULL
      AND LENGTH(TRIM(up.prompt)) > 0
  );
