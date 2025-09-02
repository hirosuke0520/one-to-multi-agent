# デプロイ手順書

## 概要
このドキュメントは、One-to-Multi AgentアプリケーションをGoogle Cloud Platform (GCP)にデプロイする際の手順を記載しています。

## 前提条件
- GCP プロジェクト: `one-to-multi-agent` (PROJECT_ID: 675967400701)
- リージョン: `asia-northeast1`
- 必要なサービス:
  - Cloud Run
  - Cloud SQL (PostgreSQL)
  - Cloud Storage
  - Cloud Build

## デプロイコマンド

### 標準デプロイ（推奨）
```bash
# 1. コミットハッシュを取得してデプロイ
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=asia-northeast1,_SHORT_SHA=$(git rev-parse --short HEAD) \
  --timeout=20m

# 2. IAMポリシーの設定（初回デプロイ時または403エラー時）
gcloud run services add-iam-policy-binding web-one-to-multi-agent \
  --region=asia-northeast1 \
  --member="allUsers" \
  --role="roles/run.invoker"

gcloud run services add-iam-policy-binding api-one-to-multi-agent \
  --region=asia-northeast1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

## デプロイ後の確認

### サービスURL確認
```bash
gcloud run services list --region=asia-northeast1 --format="table(SERVICE,URL)" | grep one-to-multi
```

### 現在のサービスURL
- API: https://api-one-to-multi-agent-675967400701.asia-northeast1.run.app
- Web: https://web-one-to-multi-agent-675967400701.asia-northeast1.run.app

## トラブルシューティング

### 1. 403 Forbidden エラー
**症状**: Webサイトにアクセスすると「Error: Forbidden」が表示される

**解決方法**:
```bash
# WebサービスのIAMポリシーを設定
gcloud run services add-iam-policy-binding web-one-to-multi-agent \
  --region=asia-northeast1 \
  --member="allUsers" \
  --role="roles/run.invoker"

# APIサービスのIAMポリシーを設定  
gcloud run services add-iam-policy-binding api-one-to-multi-agent \
  --region=asia-northeast1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

### 2. ビルドエラー確認
```bash
# 最新のビルドIDを取得
BUILD_ID=$(gcloud builds list --limit=1 --format="value(id)")

# ビルドログを確認
gcloud builds log $BUILD_ID
```

### 3. Cloud Runサービスのログ確認
```bash
# Webサービスのログ
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=web-one-to-multi-agent" --limit=50

# APIサービスのログ
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=api-one-to-multi-agent" --limit=50
```

## 重要な設定ファイル

### cloudbuild.yaml の構成
- API用Dockerイメージのビルド＆プッシュ
- Web用Dockerイメージのビルド＆プッシュ
- Cloud Runへのデプロイ
- 環境変数の設定

### Dockerfileの配置
- API: `apps/api/Dockerfile.prod`
- Web: `apps/web/Dockerfile.prod`

## 環境変数

### APIサービス
- `NODE_ENV=production`
- `STORAGE_TYPE=gcs`
- `GCS_BUCKET_NAME=one-to-multi-agent-storage`
- `DB_HOST=/cloudsql/[INSTANCE_CONNECTION_NAME]`
- `USE_REAL_AI=true`

### Webサービス
- `NODE_ENV=production`
- `NEXT_PUBLIC_API_URL=https://api-one-to-multi-agent-675967400701.asia-northeast1.run.app`

## チェックリスト

デプロイ前の確認事項：
- [ ] コードの変更をコミット済み
- [ ] Dockerfileが最新（Node.js 22-alpine使用）
- [ ] cloudbuild.yamlのパスが正しい
- [ ] 環境変数が適切に設定されている

デプロイ後の確認事項：
- [ ] ビルドが成功した
- [ ] IAMポリシーが設定されている
- [ ] Webサイトにアクセスできる
- [ ] APIが正常に動作している
- [ ] ファイルアップロードがGCSに保存される
- [ ] データベース接続が正常

## 注意事項

1. **IAMポリシー設定は毎回必要**
   - Cloud Buildからのデプロイ時、IAMポリシーの設定が失敗することがある
   - デプロイ後は必ずIAMポリシーを手動で設定する

2. **ポート番号**
   - API: 8787
   - Web: 3000

3. **Node.jsバージョン**
   - すべてのDockerfileでNode.js 22-alpineを使用

4. **GCSバケット**
   - バケット名: `one-to-multi-agent-storage`
   - CORS設定済み