# Claude用技術ドキュメント

このドキュメントは、AIアシスタント（Claude）がこのプロジェクトを理解し、効率的に作業できるようにするための技術仕様書です。

## プロジェクト概要

**One-to-Multi Agent**: テキスト、音声、動画から複数のSNSプラットフォーム向けコンテンツを自動生成するアプリケーション

## アーキテクチャ

### モノレポ構造
```
one-to-multi-agent/
├── apps/
│   ├── api/          # Hono APIサーバー (Node.js)
│   └── web/          # Next.js フロントエンド
├── packages/
│   └── core/         # 共有ライブラリ
└── infra/
    ├── docker/       # Docker設定
    └── sql/          # データベーススキーマ
```

### 技術スタック
- **フロントエンド**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **バックエンド**: Hono, TypeScript, Node.js 22
- **データベース**: PostgreSQL 15
- **ストレージ**: Google Cloud Storage
- **AI**: Google Gemini 2.5 Flash
- **デプロイ**: Google Cloud Run, Cloud SQL

## 重要なファイルと役割

### デプロイ関連
| ファイル | 役割 | 注意点 |
|---------|------|--------|
| `cloudbuild.yaml` | Cloud Buildの設定 | Dockerfileのパスは `apps/*/Dockerfile.prod` |
| `apps/api/Dockerfile.prod` | API本番用Docker | Node.js 22-alpine、ポート8787 |
| `apps/web/Dockerfile.prod` | Web本番用Docker | Node.js 22-alpine、ポート3000 |

### 設定ファイル
| ファイル | 役割 | 重要な設定 |
|---------|------|------------|
| `apps/api/src/config/storage.ts` | ストレージ設定 | 動的インポート使用（ESモジュール対応） |
| `apps/web/next.config.ts` | Next.js設定 | standalone無効（通常ビルド） |

### コンポーネント
| ファイル | 役割 | 主な機能 |
|---------|------|----------|
| `apps/web/src/components/Sidebar.tsx` | 履歴サイドバー | タイトル抽出ロジック（getThreadTitle） |
| `apps/api/src/services/orchestrator-service.ts` | コンテンツ生成統括 | 各プラットフォーム向けコンテンツ生成 |
| `apps/api/src/services/real-ai-service.ts` | AI処理 | Gemini APIとの通信 |

## よくある問題と解決方法

### 1. デプロイ時の403エラー
**問題**: デプロイ後、Webサイトが403 Forbiddenを返す
**原因**: Cloud RunのIAMポリシーが設定されていない
**解決**: 
```bash
gcloud run services add-iam-policy-binding [SERVICE_NAME] \
  --region=asia-northeast1 --member="allUsers" --role="roles/run.invoker"
```

### 2. ファイルがGCSに保存されない
**問題**: アップロードしたファイルがローカルに保存される
**原因**: `STORAGE_TYPE`環境変数が設定されていない、またはrequire/importの問題
**解決**: 
- 環境変数 `STORAGE_TYPE=gcs` を設定
- `storage.ts`で動的インポートを使用

### 3. 履歴タイトルがJSON表示になる
**問題**: 履歴のタイトルが生のJSONで表示される
**原因**: `getThreadTitle`関数のJSON解析ロジックが不完全
**解決**: 様々なフィールド名（caption, text, content等）に対応した抽出ロジックを実装

### 4. Dockerビルドエラー
**問題**: Cloud Buildでエラーが発生
**原因**: 
- Dockerfileのパスが間違っている
- Node.jsバージョンの不一致
- workspaceコマンドの使用
**解決**:
- Dockerfileパスを `apps/*/Dockerfile.prod` に統一
- Node.js 22-alpineを使用
- モノレポでは個別のnpm scriptsを使用

## データフロー

### コンテンツ生成フロー
1. **入力受付** (Web) → テキスト/音声/動画ファイル
2. **アップロード** (API) → GCSまたはローカルストレージ
3. **AI処理** (Gemini) → テキスト抽出・分析
4. **コンテンツ生成** → 各SNS向けに最適化
5. **保存** (PostgreSQL) → メタデータとコンテンツ
6. **表示** (Web) → 生成結果と履歴

### ストレージ構造
```
GCS: one-to-multi-agent-storage/
├── audio/
│   └── [id]_[timestamp].[ext]
├── video/
│   └── [id]_[timestamp].[ext]
└── temp/
    └── [一時ファイル]
```

## 環境変数一覧

### API環境変数
```env
NODE_ENV=production
STORAGE_TYPE=gcs                    # 'gcs' or 'local'
GCS_BUCKET_NAME=one-to-multi-agent-storage
GCP_PROJECT_ID=one-to-multi-agent
DB_HOST=/cloudsql/[INSTANCE]        # Cloud SQL接続
DB_USER=postgres
DB_PASSWORD=[Secret Manager]
DB_NAME=one_to_multi_agent
USE_REAL_AI=true
GOOGLE_API_KEY=[Secret Manager]
PORT=8787
```

### Web環境変数
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api-one-to-multi-agent-675967400701.asia-northeast1.run.app
PORT=3000
```

## デバッグ用コマンド

### ログ確認
```bash
# ビルドログ
gcloud builds log [BUILD_ID]

# Cloud Runログ
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# サービス状態確認
gcloud run services describe [SERVICE_NAME] --region=asia-northeast1
```

### データベース接続
```bash
# Cloud SQL Proxyを使用
cloud_sql_proxy -instances=[INSTANCE_CONNECTION_NAME]=tcp:5432
psql -h localhost -U postgres -d one_to_multi_agent
```

## コーディング規約

### TypeScript
- strictモード有効
- 型定義は明示的に記述
- anyの使用は避ける

### エラーハンドリング
- try-catchで適切にエラーをキャッチ
- エラーログは詳細に記録
- ユーザーへのエラーメッセージは簡潔に

### 非同期処理
- async/awaitを使用
- Promise.allで並列処理を活用
- タイムアウト設定を適切に行う

## 作業時の注意点

1. **コミット前の確認**
   - TypeScriptのビルドエラーがないか
   - 環境変数の漏洩がないか
   - 不要なconsole.logが残っていないか

2. **デプロイ前の確認**
   - Dockerfileのパスが正しいか
   - 環境変数が適切に設定されているか
   - データベーススキーマが最新か

3. **テスト**
   - ローカルでの動作確認
   - Docker環境での動作確認
   - 本番環境へのデプロイ後の動作確認

## プラットフォーム別コンテンツ仕様

### Instagram
- `caption`: 投稿文（2200文字以内）
- `hashtags`: ハッシュタグ配列（最大30個）

### TikTok
- `text`: 投稿文（短め）
- `hashtags`: トレンドハッシュタグ

### Threads
- `text`: スレッド形式のテキスト

### X (Twitter)
- `text`: ツイート（280文字以内）

### YouTube
- `title`: 動画タイトル
- `description`: 説明文
- `script`: 台本
- `chapters`: チャプター情報

### Blog
- `title`: 記事タイトル
- `excerpt`: 概要
- `content`: 本文（Markdown）

## 最終更新
- 2025-09-02
- Node.js 22への移行完了
- 履歴タイトル表示の改善
- IAMポリシー自動設定の問題対応