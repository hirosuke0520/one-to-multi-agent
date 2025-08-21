# 🧪 One to Multi Agent - 動作確認手順

## 現在の状況 ✅

- **API サーバー**: http://localhost:8787 で動作中
- **フロントエンド**: http://localhost:3000 で動作中 
- **AI実装**: モックとGemini API対応済み

## 🎯 動作確認手順

### 1. フロントエンドでのテスト

1. ブラウザで http://localhost:3000 を開く
2. 以下のサンプルテキストを入力：

```
今日は革新的なAIツールについて説明します。このツールは音声認識、自動要約、コンテンツ最適化機能を搭載しており、クリエイターの作業効率を大幅に向上させます。複数のプラットフォームに対応し、一度の入力で様々な媒体向けのコンテンツを生成できます。特に、Threads、WordPress、YouTubeなどの主要プラットフォームでの投稿を自動化し、手動作業を削減します。
```

3. プラットフォームを選択：Threads、WordPress、YouTube
4. 「コンテンツを生成」ボタンをクリック
5. 結果を確認

### 2. API直接テスト

```bash
curl -X POST http://localhost:8787/orchestrator/process \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "text",
    "content": "今日は革新的なAIツールについて説明します...",
    "targets": ["threads", "wordpress"],
    "profile": {
      "tone": "conversational",
      "audience": "general",
      "purpose": "inform"
    }
  }'
```

## 🤖 Gemini API の有効化（オプション）

### 方法1: Google AI Studio（推奨）

1. https://aistudio.google.com/ にアクセス
2. 「Get API key」をクリック
3. 新しいプロジェクトまたは既存プロジェクトを選択
4. APIキーをコピー

### 方法2: Google Cloud Console

1. https://console.cloud.google.com/ にアクセス
2. 「APIs & Services > Credentials」に移動
3. 「Create Credentials > API Key」を選択
4. Generative AI API を有効化

### 設定方法

```bash
# .env ファイルを編集
echo "GOOGLE_API_KEY=your_actual_api_key_here" >> apps/api/.env
echo "USE_REAL_AI=true" >> apps/api/.env

# APIサーバーを再起動
# Ctrl+C で停止後、再度起動
```

## 🔍 期待される結果

### モック実装の場合
- タイトル: "AI分析によるコンテンツタイトル"
- 要約: 入力テキストの要約
- キーポイント: 汎用的なポイント
- プラットフォーム最適化: テンプレートベース

### Gemini API使用の場合  
- タイトル: 入力コンテンツに基づいた適切なタイトル
- 要約: AIによる高品質な要約
- キーポイント: コンテンツから抽出された実際のポイント
- プラットフォーム最適化: AIによるプラットフォーム特化コンテンツ

## 🚨 トラブルシューティング

### ポート競合
```bash
lsof -i :3000
lsof -i :8787
kill -9 <PID>
```

### API エラー
- ネットワーク接続を確認
- .env ファイルの設定を確認
- コンソールログを確認

### Gemini API エラー
- APIキーの有効性を確認
- API制限やクォータを確認
- `USE_REAL_AI=false` でモックモードに切り替え

## 📊 成功指標

✅ フロントエンドからAPI呼び出し成功  
✅ ジョブ作成・処理・結果取得の完了  
✅ プラットフォーム別コンテンツ生成  
✅ エラーハンドリングの動作  
✅ リアルタイム結果表示  

すべて確認できれば **MVP完成** です！🎉