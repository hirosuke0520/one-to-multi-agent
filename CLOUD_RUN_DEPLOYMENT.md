# GCP（Cloud Run）にデプロイしてみようの会

## 概要

このガイドでは、一つのコンテンツから複数の SNS プラットフォーム向けコンテンツを自動生成する AI アプリケーションを、Google Cloud Run にデプロイする手順を説明します。

## サービス概要

### Docker コンテナとは

- アプリケーションとその依存関係を1つのパッケージにまとめる技術
- 異なる環境（開発、本番）で同じ動作を保証
- 軽量で高速な起動が可能
- **前提**: 本ガイドではローカル環境にDocker Desktop等のDocker環境が構築済みであることを前提とします

### Cloud Run とは

- Google が提供するサーバーレスコンテナプラットフォーム
- Docker コンテナを自動スケールして実行
- 使った分だけ課金（従量課金制）
- インフラ管理不要

### アーキテクチャ

- **API コンテナ**: Gemini API を使用したコンテンツ生成エンジン
- **Web コンテナ**: ユーザー画面（Next.js）
- **Cloud SQL (PostgreSQL)**: コンテンツ生成履歴とメタデータの永続化
- **GCS**: 音声・動画ファイルの一時保存
- **Secret Manager**: API キーとデータベース認証情報の安全な管理

## コスト情報

### 初期費用

- **無料**: GCP アカウント作成（$300 クレジット付与）
- **無料**: Cloud Run、GCS、Secret Manager の初回利用

### ランニングコスト（月間）

- **Cloud Run**: $5-20（利用量により変動）
- **Cloud SQL (PostgreSQL)**: $7-25（db-f1-micro~db-n1-standard-1）
- **GCS Storage**: $0.02-2.00（アップロードファイル数により変動）
- **Secret Manager**: $0.06（API キー・DB認証情報保存）
- **Gemini API**: 使用量による（従量課金）

### 想定総コスト

- **軽度利用**: $12-20/月（Cloud SQL込み）
- **中程度利用**: $22-45/月（Cloud SQL込み）
- **頻繁利用**: $40-70/月（Cloud SQL込み）

## 事前準備

### 1. 必要なアカウント・API キー

- **Google アカウント**
- **GCP プロジェクト**（新規作成推奨）
- **Gemini API キー**（Google AI Studio で取得）

### 2. 開発環境

- **Claude Code** or **Gemini CLI**
- **Git**がインストール済み
- **Node.js 18+**がインストール済み

### 3. GCP プロジェクト設定

```bash
# プロジェクトIDを設定（任意の名前）
export PROJECT_ID="one-to-multi-agent-$(date +%s)"
```

## デプロイ手順

### Step 1: リポジトリのクローン

```bash
git clone https://github.com/your-username/one-to-multi-agent.git
cd one-to-multi-agent
```

### Step 2: Claude Code での自動セットアップ

Claude Code に以下をリクエストしてください：

```
以下の手順でGCPプロジェクトを設定してCloud Runにデプロイしてください：

1. GCPプロジェクトを作成（PROJECT_ID: [あなたのプロジェクトID]）
2. 必要なAPIを有効化（Cloud Run、Container Registry、Cloud SQL、Secret Manager、GCS）
3. Cloud SQL PostgreSQLインスタンスを作成
4. データベースとユーザーを作成
5. GCSバケットを作成（one-to-multi-agent-storage）
6. Gemini APIキーとDB認証情報をSecret Managerに保存
7. Cloud Runに両方のサービス（api、web）をデプロイ
8. 動作確認

プロジェクトID: [あなたのプロジェクトID]
Gemini APIキー: [あなたのAPIキー]
```

### Step 3: 自動デプロイコマンド（Claude Code 実行）

Claude Code が以下のコマンドを順次実行します：

#### GCP プロジェクト設定

```bash
# プロジェクト作成
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID

# 課金アカウント設定（必要に応じて）
gcloud billing projects link $PROJECT_ID --billing-account=[BILLING_ID]

# API有効化
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

#### リソース作成

```bash
# Cloud SQLインスタンス作成（PostgreSQL）
gcloud sql instances create one-to-multi-agent-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast1 \
  --storage-type=SSD \
  --storage-size=10GB

# データベース作成
gcloud sql databases create one_to_multi_agent --instance=one-to-multi-agent-db

# データベースユーザー作成（パスワードは自動生成）
DB_PASSWORD=$(openssl rand -base64 32)
gcloud sql users create appuser --instance=one-to-multi-agent-db --password=$DB_PASSWORD

# GCSバケット作成
gsutil mb gs://one-to-multi-agent-storage

# Secret Manager作成
echo 'YOUR_GEMINI_API_KEY' | gcloud secrets create GEMINI_API_KEY --data-file=-
echo "$DB_PASSWORD" | gcloud secrets create DB_PASSWORD --data-file=-

# Artifact Registry作成
gcloud artifacts repositories create one-to-multi-agent-repo \
  --repository-format=docker \
  --location=asia-northeast1
```

#### Docker 認証設定

```bash
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

#### アプリケーションデプロイ

```bash
# APIサービスデプロイ
gcloud builds submit --config=cloudbuild-api.yaml

# Cloud SQL接続名取得
SQL_CONNECTION_NAME=$(gcloud sql instances describe one-to-multi-agent-db --format="value(connectionName)")

gcloud run deploy api \
  --image=asia-northeast1-docker.pkg.dev/$PROJECT_ID/one-to-multi-agent-repo/api:latest \
  --platform=managed \
  --region=asia-northeast1 \
  --allow-unauthenticated \
  --port=8080 \
  --memory=2Gi \
  --cpu=2 \
  --set-env-vars="NODE_ENV=production,USE_REAL_AI=true,GCP_PROJECT_ID=$PROJECT_ID,GCS_BUCKET_NAME=one-to-multi-agent-storage,CLOUD_SQL_CONNECTION_NAME=$SQL_CONNECTION_NAME,DB_USER=appuser,DB_NAME=one_to_multi_agent" \
  --set-secrets="GOOGLE_API_KEY=GEMINI_API_KEY:latest,DB_PASSWORD=DB_PASSWORD:latest" \
  --add-cloudsql-instances=$SQL_CONNECTION_NAME

# Webサービスデプロイ
gcloud builds submit --config=cloudbuild-web.yaml

# API URLを取得
API_URL=$(gcloud run services describe api --region=asia-northeast1 --format="value(status.url)")

gcloud run deploy web \
  --image=asia-northeast1-docker.pkg.dev/$PROJECT_ID/one-to-multi-agent-repo/web:latest \
  --platform=managed \
  --region=asia-northeast1 \
  --allow-unauthenticated \
  --port=3000 \
  --memory=1Gi \
  --cpu=1 \
  --set-env-vars="NODE_ENV=production,NEXT_PUBLIC_API_URL=$API_URL"
```

### Step 4: デプロイ結果の確認

Claude Code が以下を表示します：

```
デプロイ完了！

API URL: https://api-[PROJECT_NUMBER].asia-northeast1.run.app
Web URL: https://web-[PROJECT_NUMBER].asia-northeast1.run.app

動作確認：
✅ API疎通確認済み
✅ Webアプリ表示確認済み
✅ コンテンツ生成テスト済み
```

## 動作確認

### 1. Web アプリケーションアクセス

提供された Web URL にアクセス

### 2. コンテンツ生成テスト

- テキスト入力で Threads/Twitter 投稿生成
- 音声ファイルアップロードで YouTube 動画コンテンツ生成
- 動画ファイルアップロードで各種 SNS 投稿生成

### 3. 各プラットフォームテスト

- Threads
- Twitter (X)
- Instagram
- WordPress
- YouTube

## トラブルシューティング

### よくある問題

#### 1. 認証エラー

```bash
# ログイン確認
gcloud auth list
gcloud auth login  # 必要に応じて
```

#### 2. 権限エラー

```bash
# 権限確認
gcloud projects get-iam-policy $PROJECT_ID
```

#### 3. API キーエラー

```bash
# Secret確認
gcloud secrets versions access latest --secret="GEMINI_API_KEY"
```

#### 4. CORS エラー

Web URL が API の CORS 設定に含まれているか確認

### ログ確認

```bash
# APIログ
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=api" --limit=50

# Webログ
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=web" --limit=50
```

## メンテナンス

### 更新デプロイ

```bash
# コード変更後
git add .
git commit -m "update: [変更内容]"

# 再デプロイ
gcloud builds submit --config=cloudbuild-api.yaml
gcloud builds submit --config=cloudbuild-web.yaml
```

### リソースクリーンアップ

```bash
# サービス削除
gcloud run services delete api --region=asia-northeast1
gcloud run services delete web --region=asia-northeast1

# GCSバケット削除
gsutil rm -r gs://one-to-multi-agent-storage

# プロジェクト削除（完全削除）
gcloud projects delete $PROJECT_ID
```

## セキュリティ考慮事項

- **API キー**: Secret Manager で管理、直接コードに記述しない
- **CORS 設定**: 信頼できるドメインのみ許可
- **認証**: 本番運用時は適切な認証機構を実装推奨
- **ファイルアップロード**: サイズ制限、ファイル形式チェック実装推奨

## 参考リンク

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)

---

**注意**: 本ガイドは開発・検証目的での使用を想定しています。本格的な商用利用の場合は、セキュリティ、スケーラビリティ、モニタリングなどの追加考慮が必要です。