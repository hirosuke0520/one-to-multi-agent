import { ContentGenerationOptions, PlatformConstraints } from "./types";

export const SYSTEM_PROMPTS = {
  CONTENT_ANALYZER: `あなたは日本語コンテンツの分析と構造化の専門家です。
与えられたテキストから以下を抽出してください：
1. 適切なタイトル
2. 簡潔な要約（1-2文）
3. 主要なポイント（3-5個）
4. 関連するトピック・キーワード（3-7個）

出力はJSON形式で、正確で有用な情報を提供してください。`,

  PLATFORM_OPTIMIZER: `あなたは複数のSNS・メディアプラットフォームに最適化されたコンテンツ作成の専門家です。
与えられた元コンテンツを、指定されたプラットフォームの特性に合わせて最適化してください。

考慮すべき要素：
- プラットフォーム固有の制約（文字数、ハッシュタグ数など）
- ユーザー体験とエンゲージメント
- プラットフォームの文化と慣習
- 視覚的要素の活用（絵文字、改行など）`,

  TONE_ADJUSTER: `指定されたトーンと対象読者に合わせて、コンテンツの文体と表現を調整してください。

トーンオプション：
- professional: 丁寧で専門的
- casual: 親しみやすくカジュアル  
- friendly: 温かみがあり親近感のある
- authoritative: 権威的で信頼感のある
- conversational: 対話的で自然な

対象読者を考慮し、適切な敬語レベルと専門用語の使用量を調整してください。`
};

export const PLATFORM_PROMPTS = {
  threads: (content: any, constraints: PlatformConstraints, options?: ContentGenerationOptions) => `
Meta Threads向けのコンテンツを作成してください。

制約:
- 最大文字数: ${constraints.maxLength}文字
- ハッシュタグ: 最大${constraints.maxTags}個
- 絵文字使用: ${constraints.supportsEmojis ? '推奨' : '使用しない'}

特徴:
- 対話的で親しみやすい文体
- 適度な改行で読みやすさを重視  
- エンゲージメントを促す文末
- 画像・動画投稿を想定した補完テキスト

元コンテンツ:
タイトル: ${content.title}
要約: ${content.summary}
キーポイント: ${content.keyPoints.join(', ')}

トーン: ${options?.tone || 'conversational'}
CTA: ${options?.cta || 'コメントで感想をお聞かせください！'}
`,

  wordpress: (content: any, constraints: PlatformConstraints, options?: ContentGenerationOptions) => `
WordPress ブログ記事向けのコンテンツを作成してください。

制約:
- 最大文字数: ${constraints.maxLength}文字  
- 形式: ${constraints.requiredFormat}

特徴:
- 見出し構造（H1, H2, H3）を適切に使用
- SEOを意識したキーワード配置
- 読者にとって価値のある詳細な説明
- 内部リンクやCTAの自然な配置

元コンテンツ:
タイトル: ${content.title}
要約: ${content.summary}
キーポイント: ${content.keyPoints.join(', ')}
フルテキスト: ${content.fullText}

トーン: ${options?.tone || 'professional'}
対象読者: ${options?.audience || 'general'}
`,

  youtube: (content: any, constraints: PlatformConstraints, options?: ContentGenerationOptions) => `
YouTube動画の説明文を作成してください。

制約:
- 最大文字数: ${constraints.maxLength}文字
- ハッシュタグ: 最大${constraints.maxTags}個

特徴:
- 動画内容の魅力的な説明
- タイムスタンプ（必要に応じて）
- チャンネル登録やいいねの促進
- 関連動画や再生リストへの誘導
- 適切なハッシュタグの配置

元コンテンツ:
タイトル: ${content.title}  
要約: ${content.summary}
キーポイント: ${content.keyPoints.join(', ')}

動画の長さ: ${content.duration ? content.duration + '分' : '未定'}
トーン: ${options?.tone || 'friendly'}
`
};

export function buildPrompt(
  type: keyof typeof SYSTEM_PROMPTS,
  context: any,
  options?: ContentGenerationOptions
): string {
  const systemPrompt = SYSTEM_PROMPTS[type];
  
  let prompt = systemPrompt + "\n\n";
  
  if (options?.tone) {
    prompt += `トーン: ${options.tone}\n`;
  }
  
  if (options?.audience) {
    prompt += `対象読者: ${options.audience}\n`;
  }
  
  if (options?.purpose) {
    prompt += `目的: ${options.purpose}\n`;
  }
  
  prompt += "\n入力コンテンツ:\n" + JSON.stringify(context, null, 2);
  
  return prompt;
}

export function buildPlatformPrompt(
  platform: keyof typeof PLATFORM_PROMPTS,
  content: any,
  constraints: PlatformConstraints,
  options?: ContentGenerationOptions
): string {
  const promptGenerator = PLATFORM_PROMPTS[platform];
  if (!promptGenerator) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  
  return promptGenerator(content, constraints, options);
}