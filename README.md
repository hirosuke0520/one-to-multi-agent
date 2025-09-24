# One to Multi Agent

🚀 **コンテンツ発信者が 1 つのソース（動画/文章/音声）から、各プラットフォームの文脈・制約・アルゴリズムに最適化した派生コンテンツを半自動生成し、最小の手間で公開まで到達できるワークフローを提供するサービス。**

## 🤝 共同作業者向けクイックスタート

```bash
# 1. リポジトリクローン後、自動セットアップを実行
./scripts/setup-collaborator.sh

# 2. 問題がある場合はデバッグツールを実行
./scripts/debug-auth.sh

# 3. 詳細なセットアップ手順
# SETUP-COLLABORATORS.md を参照
```

**必須環境変数** (詳細は `.env.example` を参照):

- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth 認証
- `AUTH_SECRET` - NextAuth.js セッション暗号化キー
- `NEXT_PUBLIC_API_URL` / `INTERNAL_API_URL` - API エンドポイント
- `DATABASE_URL` または `DB_*` - PostgreSQL 接続情報
- `GOOGLE_API_KEY` - Gemini AI API キー（オプション）

## ✨ 主な機能

- 📝 **マルチメディア対応** - 文章/音声/動画からの自動コンテンツ生成
- 🎯 **複数プラットフォーム最適化投稿**
  - Threads (Meta) - 短文形式での投稿
  - WordPress - 記事形式での投稿
  - YouTube - 動画説明・メタデータ最適化
  - Twitter/X、Instagram、TikTok（準備済み）
- 🤖 **AI による高度な処理**
  - Gemini AI による自動分析・要約・キーポイント抽出
  - 音声ファイルの文字起こし（STT）
  - 動画からの音声抽出・処理
- 👤 **ユーザー管理機能**
  - Google OAuth による認証
  - 投稿履歴の管理・閲覧
  - カスタムプロンプト設定
  - ユーザー固有の設定管理
- 🌐 **クラウドとローカルの両対応**
  - GCP サービス連携（Cloud Storage、Vertex AI）
  - ローカル開発環境での完結したワークフロー
  - PostgreSQL データベース
- 🐳 **開発者フレンドリー**
  - Docker Compose による簡単セットアップ
  - TypeScript フルスタック
  - モジュラー設計

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Server    │    │   AI Services   │
│   (Next.js 15)  │───▶│   (Hono + TS)   │───▶│ (Gemini/GCP)    │
│   - Auth (OAuth)│    │   - Orchestrator│    │   - Content Gen │
│   - Upload UI   │    │   - Job Manager │    │   - Audio/Video │
│   - History     │    │   - PostgreSQL  │    │   - Analysis    │
│   - Settings    │    │   - File Storage│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Publishers    │
                       │   - Threads     │
                       │   - WordPress   │
                       │   - YouTube     │
                       │   - Twitter/X   │
                       │   - Instagram   │
                       │   - TikTok      │
                       └─────────────────┘

apps/
  web/               # Next.js 15 (App Router) + NextAuth v5
  api/               # Hono API + PostgreSQL + Drizzle ORM
packages/
  ai/                # Gemini AI クライアント & プロンプト
  adapters/          # プラットフォーム連携アダプター
  core/              # 共通型定義
infra/
  docker/            # Docker Compose設定
  sql/               # データベースマイグレーション
```

## 🚀 クイックスタート

### 📋 必要な環境

- **Node.js 18 以上** (推奨: 20+)
- **PostgreSQL 14+** (Docker で自動セットアップ)
- **Docker & Docker Compose** (推奨)
- **gcloud CLI** (GCP 連携用、オプション)
- **Git**

### 📥 1. リポジトリのクローン

```bash
git clone https://github.com/hirosuke0520/one-to-multi-agent
cd one-to-multi-agent
```

### ⚙️ 2. GCP セットアップ（オプション）

```bash
# GCP プロジェクトセットアップ（自動）
./setup-gcp.sh

# または手動で
gcloud config set project one-to-multi-agent-80339
gcloud services enable firebase.googleapis.com firestore.googleapis.com
```

> **💡 注意:** GCP セットアップをスキップしても、モック実装で動作確認可能です

### 🚀 3. ローカル起動方法

#### 方法 1: Docker Compose（推奨）

```bash
# 一発起動（依存関係インストール込み）
./infra/docker/dev.sh start

# サービス状況確認
./infra/docker/dev.sh status

# ログ確認
./infra/docker/dev.sh logs

# 停止
./infra/docker/dev.sh stop
```

#### 方法 2: 個別起動

```bash
# 1. 依存関係インストール
npm install

# 2. APIサーバー起動（バックグラウンド）
cd apps/api
npm run dev &

# 3. フロントエンド起動（新しいターミナル）
cd apps/web
npm run dev
```

### 🌐 4. アクセス先

起動後、以下の URL にアクセス可能です：

- **🖥️ フロントエンド:** http://localhost:3000
- **🔧 API サーバー:** http://localhost:8080
- **📊 API ドキュメント:** http://localhost:8080 (JSON)

### ✅ 5. 動作確認手順

1. **ブラウザでアクセス**

   ```
   http://localhost:3000
   ```

2. **サンプルテキストを入力**

   ```
   今日は新しいAIツールについて紹介します。
   このツールを使うことで、コンテンツ制作者が効率的に作業できるようになります。
   主な機能は音声認識、自動要約、複数プラットフォーム対応です。
   ```

3. **投稿先プラットフォームを選択**

   - ✅ Threads
   - ✅ WordPress
   - ✅ YouTube
   - その他お好みで

4. **「コンテンツを生成」ボタンをクリック**

5. **結果を確認**
   - AI 分析結果（タイトル、要約、キーポイント）
   - プラットフォーム別の最適化コンテンツ
   - 投稿 URLs（モック）

### 🔧 6. トラブルシューティング

#### ポートが使用中のエラー

```bash
# ポート確認
lsof -i :3000
lsof -i :8080

# プロセス終了
kill -9 <PID>
```

#### Docker 関連の問題

```bash
# Docker状況確認
docker ps
docker compose -f infra/docker/compose.yml ps

# 完全リセット
./infra/docker/dev.sh reset
```

#### npm install エラー

```bash
# キャッシュクリア
npm cache clean --force

# node_modules削除してリトライ
rm -rf node_modules package-lock.json
npm install
```

### 🧪 7. API テスト（コマンドライン）

```bash
# API動作確認
curl http://localhost:8080

# コンテンツ処理テスト
curl -X POST http://localhost:8080/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "text",
    "content": "テストコンテンツです",
    "targets": ["threads", "wordpress"]
  }'

# 結果をjqで整形（jqインストール済みの場合）
curl -s http://localhost:8080 | jq .
```

## 🎯 デモフロー

### 入力例

```
今日は新しいAIツールについて紹介します。
このツールを使うことで、コンテンツ制作者が効率的に作業できるようになります。
主な機能は音声認識、自動要約、複数プラットフォーム対応です。
```

### 出力例

**🧠 AI 分析結果:**

- **タイトル:** 新しいプロダクトの紹介
- **要約:** 革新的な新プロダクトについて紹介します。このツールはコンテンツ制作者にとって非常に価値があります。
- **キーポイント:** 自動文字起こし機能、多言語対応、リアルタイム処理、高精度音声認識、コンテンツ制作者向けツール

**📱 Threads 投稿:**

```
🚀 新しいプロダクトの紹介

革新的な新プロダクトについて紹介します。このツールはコンテンツ制作者にとって非常に価値があります。

✨ 主な特徴：
• 自動文字起こし機能
• 多言語対応
• リアルタイム処理

詳細はコメントで質問してください！

#AI #コンテンツ制作 #音声認識 #プロダクト #技術
```

**📰 WordPress 記事:**

```markdown
# 新しいプロダクトの紹介

## 概要

革新的な新プロダクトについて紹介します。このツールはコンテンツ制作者にとって非常に価値があります。

## 主な機能・特徴

1. **自動文字起こし機能**
2. **多言語対応**
3. **リアルタイム処理**
   ...
```

## 🔧 開発者向け

### API エンドポイント

```bash
# コンテンツ処理開始
POST /orchestrator/process
{
  "sourceType": "text",
  "content": "...",
  "targets": ["threads", "wordpress"],
  "profile": {
    "tone": "conversational",
    "audience": "general"
  }
}

# ジョブ状況確認
GET /jobs/{jobId}

# 結果取得
GET /jobs/{jobId}/results
```

### コマンドラインでのテスト

```bash
# API テスト
curl -X POST http://localhost:8080/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{"sourceType": "text", "content": "...", "targets": ["threads"]}'

# 開発環境管理
./infra/docker/dev.sh {start|stop|logs|reset}

# GCP セットアップ
./setup-gcp.sh
```

## 🔐 環境変数設定

### .env (ローカル開発用)

```env
# Node環境
NODE_ENV=development

# Web Application設定
NEXT_PUBLIC_API_URL=http://localhost:8080
INTERNAL_API_URL=http://api:8080
AUTH_URL=http://localhost:3000

# NextAuth.js設定
AUTH_SECRET=your-secret-key-for-session-encryption
AUTH_GOOGLE_ID=your_google_oauth_client_id
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret

# データベース設定
DB_USER=postgres
DB_HOST=localhost
DB_NAME=one_to_multi_agent
DB_PASSWORD=password
DB_PORT=5432

# ストレージ設定
STORAGE_TYPE=local
TEMP_DIR=./temp

# AI設定（オプション）
GOOGLE_API_KEY=your_gemini_api_key

# GCP設定（本番用）
GCP_PROJECT_ID=one-to-multi-agent-80339
GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json
```

## 📁 プロジェクト構成

```
one-to-multi-agent/
├── apps/
│   ├── web/              # Next.js 15 + NextAuth v5 フロントエンド
│   │   ├── src/app/      # App Router ページ
│   │   ├── src/components/ # React コンポーネント
│   │   └── auth.ts       # NextAuth 設定
│   └── api/              # Hono API サーバー + PostgreSQL
│       ├── src/routes/   # API エンドポイント
│       ├── src/services/ # ビジネスロジック
│       ├── src/db/       # Drizzle ORM設定
│       └── storage/      # ローカルファイルストレージ
├── packages/
│   ├── ai/               # Gemini AI クライアント
│   ├── adapters/         # プラットフォーム連携
│   └── core/             # 共通型定義
├── infra/
│   ├── docker/           # Docker Compose設定
│   └── sql/              # PostgreSQLマイグレーション
├── scripts/              # セットアップ・デバッグスクリプト
├── docs/                 # 詳細ドキュメント
└── README.md
```

## 🤝 貢献

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🎉 今後の予定

### 近時開発予定

- [ ] 実プラットフォーム API 連携（実際の投稿機能）
- [ ] スケジュール投稿機能
- [ ] 画像・サムネイル自動生成（DALL-E 等）
- [ ] より高度なプロンプトカスタマイズ

### 長期計画

- [ ] アナリティクス・パフォーマンス分析
- [ ] 動画自動編集機能
- [ ] コラボレーション機能（チーム管理）
- [ ] API レート制限・課金管理
- [ ] モバイルアプリ版
