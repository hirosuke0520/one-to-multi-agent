# One to Multi Agent

コンテンツ発信者が1つのソース（動画/文章/音声）から、各プラットフォームの文脈・制約・アルゴリズムに最適化した派生コンテンツを半自動生成し、最小の手間で公開まで到達できるワークフローを提供するサービス。

## 機能

- 文章/音声/動画からの自動コンテンツ生成
- Threads、WordPress、YouTube への自動投稿・ドラフト作成
- GCP サービス（Vertex AI、Cloud Storage）との連携
- ローカル開発環境での完結したワークフロー

## アーキテクチャ

```
apps/
  web/               # Next.js (App Router) - フロントエンド
  api/               # Hono API + Orchestrator - バックエンド
packages/
  ai/                # LLM/STT クライアント & プロンプト
  adapters/          # Publisher adapters
  core/              # 型/ドメイン & パイプライン
  ui/                # 共有コンポーネント
infra/
  docker/            # Docker Compose設定
  terraform/         # インフラ設定
```

## 開発環境セットアップ

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# Docker Compose での起動
docker compose -f infra/docker/compose.yml up
```

## 環境変数

```env
# GCP
GOOGLE_API_KEY=your_api_key
GCP_PROJECT_ID=one-to-multi-agent

# YouTube
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token

# Meta (Threads)
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret

# WordPress
WP_WEBHOOK_URL=your_webhook_url
```