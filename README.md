# One to Multi Agent

🚀 **コンテンツ発信者が1つのソース（動画/文章/音声）から、各プラットフォームの文脈・制約・アルゴリズムに最適化した派生コンテンツを半自動生成し、最小の手間で公開まで到達できるワークフローを提供するサービス。**

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
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth
- `AUTH_SECRET` - NextAuth secret
- `NEXT_PUBLIC_API_URL` - API エンドポイント
- `DATABASE_URL` - PostgreSQL 接続情報

## ✨ 主な機能

- 📝 **文章/音声/動画からの自動コンテンツ生成**
- 🎯 **複数プラットフォームへの最適化投稿**
  - Threads (Meta)
  - WordPress (自社メディア)
  - YouTube (動画説明・メタデータ)
  - Twitter/X、Instagram、TikTok（準備済み）
- 🤖 **AI による自動分析・要約・キーポイント抽出**
- 🌐 **GCP サービス連携（Vertex AI、Cloud Storage）**
- 🐳 **ローカル開発環境での完結したワークフロー**

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Server    │    │   AI Services   │
│   (Next.js)     │───▶│   (Hono)        │───▶│   (Mock/GCP)    │
│   - Upload UI   │    │   - Orchestrator│    │   - STT         │
│   - Results     │    │   - Job Manager │    │   - Content Gen │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Publishers    │
                       │   - Threads     │
                       │   - WordPress   │
                       │   - YouTube     │
                       │   - Twitter     │
                       │   - Instagram   │
                       │   - TikTok      │
                       └─────────────────┘

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
  terraform/         # インフラ設定（将来）
```

## 🚀 クイックスタート

### 📋 必要な環境

- **Node.js 18以上**
- **Docker & Docker Compose** (推奨)
- **gcloud CLI** (GCP連携用)
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

> **💡 注意:** GCPセットアップをスキップしても、モック実装で動作確認可能です

### 🚀 3. ローカル起動方法

#### 方法1: Docker Compose（推奨）

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

#### 方法2: 個別起動

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

起動後、以下のURLにアクセス可能です：

- **🖥️ フロントエンド:** http://localhost:3000
- **🔧 API サーバー:** http://localhost:8787
- **📊 API ドキュメント:** http://localhost:8787 (JSON)

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
   - AI分析結果（タイトル、要約、キーポイント）
   - プラットフォーム別の最適化コンテンツ
   - 投稿URLs（モック）

### 🔧 6. トラブルシューティング

#### ポートが使用中のエラー
```bash
# ポート確認
lsof -i :3000
lsof -i :8787

# プロセス終了
kill -9 <PID>
```

#### Docker関連の問題
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
curl http://localhost:8787

# コンテンツ処理テスト
curl -X POST http://localhost:8787/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "text",
    "content": "テストコンテンツです",
    "targets": ["threads", "wordpress"]
  }'

# 結果をjqで整形（jqインストール済みの場合）
curl -s http://localhost:8787 | jq .
```

## 🎯 デモフロー

### 入力例
```
今日は新しいAIツールについて紹介します。
このツールを使うことで、コンテンツ制作者が効率的に作業できるようになります。
主な機能は音声認識、自動要約、複数プラットフォーム対応です。
```

### 出力例

**🧠 AI分析結果:**
- **タイトル:** 新しいプロダクトの紹介
- **要約:** 革新的な新プロダクトについて紹介します。このツールはコンテンツ制作者にとって非常に価値があります。
- **キーポイント:** 自動文字起こし機能、多言語対応、リアルタイム処理、高精度音声認識、コンテンツ制作者向けツール

**📱 Threads投稿:**
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

**📰 WordPress記事:**
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
curl -X POST http://localhost:8787/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{"sourceType": "text", "content": "...", "targets": ["threads"]}'

# 開発環境管理
./infra/docker/dev.sh {start|stop|logs|reset}

# GCP セットアップ
./setup-gcp.sh
```

## 🔐 環境変数設定

### .env.local (ローカル開発用)

```env
# GCP設定
GCP_PROJECT_ID=one-to-multi-agent-80339
GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json

# API設定
NEXT_PUBLIC_API_URL=http://localhost:8787

# プラットフォーム API キー（実際の値に置き換え）
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
META_APP_ID=your_app_id
WP_WEBHOOK_URL=your_webhook_url

# 機能フラグ
ENABLE_THREADS=true
ENABLE_YOUTUBE=true
ENABLE_WORDPRESS=true
```

## 📁 プロジェクト構成

```
one-to-multi-agent/
├── apps/
│   ├── web/              # Next.js フロントエンド
│   └── api/              # Hono API サーバー
├── packages/
│   ├── ai/               # AI サービス（STT, LLM）
│   ├── adapters/         # プラットフォーム連携
│   ├── core/             # 共通型・ロジック  
│   └── ui/               # 共有コンポーネント
├── infra/
│   └── docker/           # Docker設定
├── setup-gcp.sh          # GCP自動セットアップ
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

- [ ] 実際のGoogle Cloud API統合
- [ ] 画像・サムネイル自動生成
- [ ] スケジュール投稿機能
- [ ] アナリティクス収集
- [ ] 動画自動編集機能