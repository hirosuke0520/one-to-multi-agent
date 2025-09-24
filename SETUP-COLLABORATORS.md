# 共同作業者セットアップガイド

このガイドは、共同作業者が Google ログイン機能を含むプロジェクトを確実に動作させるための手順書です。

## 🚀 クイックスタート（最小セット）

### 1. リポジトリのクローンと依存関係のインストール

```bash
git pull origin main
# または新規クローンの場合
# git clone <repository-url>
# cd one-to-multi-agent

# クリーンインストール（モノレポルートで実行）
npm ci
```

### 2. 環境変数の設定

```bash
# .env.example をコピーして設定
cp .env.example .env

# 以下の値を必ず設定してください：
```

**必須環境変数：**

```env
# Google OAuth （必須）
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_SECRET=your-nextauth-secret

# API URL （本番環境の場合）
NEXT_PUBLIC_API_URL=https://api-one-to-multi-agent-675967400701.asia-northeast1.run.app
INTERNAL_API_URL=https://api-one-to-multi-agent-675967400701.asia-northeast1.run.app

# データベース （本番環境の場合）
DB_HOST=/cloudsql/one-to-multi-agent:asia-northeast1:postgres-instance
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/one_to_multi_agent

# AI API （実機でAI機能を使う場合）
GOOGLE_API_KEY=your-real-gemini-api-key
USE_REAL_AI=true
```

### 3. データベースのセットアップ

```bash
# PostgreSQLに接続して以下を実行
psql -h localhost -U postgres -d one_to_multi_agent

# または Cloud SQL Proxy経由
cloud_sql_proxy -instances=one-to-multi-agent:asia-northeast1:postgres-instance=tcp:5432
psql -h localhost -U postgres -d one_to_multi_agent

# データベーススキーマを適用
\i scripts/setup-database.sql

# 正常に作成されたか確認
\dt
```

### 4. ビルドと起動

```bash
# ビルド
npm run build -w apps/api
npm run build -w apps/web

# 起動
npm run start -w apps/api &
npm run start -w apps/web
```

## 🔧 詳細セットアップ

### Google OAuth 設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクト選択: `one-to-multi-agent`
3. APIs & Services > Credentials
4. OAuth 2.0 Client IDs から以下の値を取得：
   - `AUTH_GOOGLE_ID`: Client ID
   - `AUTH_GOOGLE_SECRET`: Client Secret

### 本番環境用設定

本番環境で動作させる場合、以下の設定を確認：

```env
# 本番用URL（必須）
NEXT_PUBLIC_API_URL=https://api-one-to-multi-agent-675967400701.asia-northeast1.run.app
INTERNAL_API_URL=https://api-one-to-multi-agent-675967400701.asia-northeast1.run.app
AUTH_URL=https://web-one-to-multi-agent-675967400701.asia-northeast1.run.app

# Cloud SQL接続
DB_HOST=/cloudsql/one-to-multi-agent:asia-northeast1:postgres-instance
DATABASE_URL=postgresql://postgres:password@/one_to_multi_agent?host=/cloudsql/one-to-multi-agent:asia-northeast1:postgres-instance

# 本番用ストレージ
STORAGE_TYPE=gcs
GCS_BUCKET_NAME=one-to-multi-agent-storage

# セキュリティ設定
NODE_ENV=production
```

### リバースプロキシ/CORS 設定

Nginx 等を使用している場合、以下の設定が必要：

```nginx
proxy_set_header Authorization $http_authorization;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### 時刻同期（重要）

JWT の exp/nbf 検証のため、サーバーと端末の時刻を同期：

```bash
# Ubuntu/Debian
sudo ntpdate -s time.nist.gov

# または systemd-timesyncd
sudo timedatectl set-ntp true
```

## 🐛 トラブルシューティング

### 401 エラーが発生する場合

**A. トークン直叩きテスト**

```bash
# APIエンドポイントを直接テスト
API="https://api-one-to-multi-agent-675967400701.asia-northeast1.run.app/history"
TOKEN="<Googleログイン後に発行される JWT token>"

curl -i "$API" -H "Authorization: Bearer $TOKEN"
```

**結果の判定：**

- `200 OK`: ネットワーク/認証は OK → フロントエンド実装を確認
- `401 Unauthorized`: 次のステップ B へ

**B. 401 エラーの詳細ログ確認**

API サーバーのログで以下を確認：

```bash
# Cloud Runログ確認
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# ローカルでの確認
npm run start -w apps/api
# ログでエラー詳細を確認
```

**エラーパターン別対処法：**

| エラーメッセージ    | 原因               | 対処法                       |
| ------------------- | ------------------ | ---------------------------- |
| `invalid signature` | AUTH_SECRET 不一致 | .env の AUTH_SECRET を確認   |
| `expired`           | 時刻ズレ           | 時刻同期を実行               |
| `user not found`    | DB 未同期          | データベーススキーマを再適用 |
| `CORS error`        | ヘッダー設定       | CORS 設定を確認              |

### よくある問題と解決法

1. **Google ログインできない**

   ```bash
   # OAuth設定を確認
   echo $AUTH_GOOGLE_ID
   echo $AUTH_GOOGLE_SECRET

   # リダイレクトURIが正しく設定されているか確認
   # Google Cloud Console > Credentials > OAuth 2.0 Client
   ```

2. **データベース接続エラー**

   ```bash
   # 接続テスト
   psql $DATABASE_URL -c "SELECT version();"

   # テーブル存在確認
   psql $DATABASE_URL -c "\dt"
   ```

3. **API が応答しない**

   ```bash
   # ヘルスチェック
   curl -i https://api-one-to-multi-agent-675967400701.asia-northeast1.run.app/health

   # ローカルでの確認
   curl -i http://localhost:8080/health
   ```

### 緊急時の切り分け手順

1. **環境変数確認**

   ```bash
   # 必須変数がすべて設定されているか確認
   env | grep -E "(AUTH_|NEXT_PUBLIC_|DB_|GOOGLE_)"
   ```

2. **ネットワーク確認**

   ```bash
   # API疎通確認
   curl -I https://api-one-to-multi-agent-675967400701.asia-northeast1.run.app
   ```

3. **ログ確認**
   ```bash
   # エラーの詳細を取得
   tail -f /var/log/application.log
   # または
   docker logs <container-id>
   ```

## 🔄 定期メンテナンス

### 依存関係の更新

```bash
# 定期的に実行
npm update
npm audit fix
```

### データベースバックアップ

```bash
# 本番データベースのバックアップ
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

## 📞 サポート

問題が解決しない場合：

1. 上記のトラブルシューティングを実行
2. エラーログをコピー
3. 環境変数設定（機密情報は除く）を共有
4. 実行した手順を詳細に記録

**デバッグ情報収集コマンド：**

```bash
# システム情報
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "OS: $(uname -a)"

# 環境変数（機密情報除く）
env | grep -E "(NODE_ENV|NEXT_PUBLIC_)" | sort

# ネットワーク疎通
curl -I https://api-one-to-multi-agent-675967400701.asia-northeast1.run.app

# データベース接続
psql $DATABASE_URL -c "SELECT current_timestamp;"
```

---

📝 **注意**: このファイルには機密情報は含まれていません。実際の環境変数値は別途安全に共有してください。
