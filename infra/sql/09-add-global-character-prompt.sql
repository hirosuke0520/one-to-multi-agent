-- キャラクター全体プロンプト機能の追加

-- user_settingsテーブルにglobal_character_promptカラムを追加
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS global_character_prompt TEXT; -- 全媒体共通のキャラクタープロンプト

-- 既存のユーザーに対してデフォルトのグローバルキャラクタープロンプトを設定
UPDATE user_settings
SET global_character_prompt = 'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。'
WHERE global_character_prompt IS NULL;