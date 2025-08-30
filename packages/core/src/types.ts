export type FileSource = {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  sourceType: "audio" | "video";
};

export type ContentSource = string | FileSource;

export interface GeneratedContent {
  title: string;
  summary: string;
  keyPoints: string[];
  topics: string[];
}

// プラットフォーム固有の出力インターフェース
export interface ThreadsContent {
  platform: "threads";
  text: string;
  hashtags: string[];
}

export interface TwitterContent {
  platform: "twitter";
  text: string;
  hashtags: string[];
}

export interface YouTubeContent {
  platform: "youtube";
  title: string;
  description: string;
  script?: string;
  chapters: Array<{ time: string; title: string }>;
  hashtags: string[];
}

export interface WordPressContent {
  platform: "wordpress";
  title: string;
  excerpt: string;
  content: string;
  categories: string[];
  tags: string[];
  seoTitle?: string;
  metaDescription?: string;
}

export interface InstagramContent {
  platform: "instagram";
  caption: string;
  hashtags: string[];
  altText?: string;
}

export interface TikTokContent {
  platform: "tiktok";
  caption: string;
  hashtags: string[];
  effects?: string[];
}

export type PlatformContent = 
  | ThreadsContent 
  | TwitterContent 
  | YouTubeContent 
  | WordPressContent 
  | InstagramContent 
  | TikTokContent;

export interface AIConfig {
  geminiApiKey?: string;
  useRealAI?: boolean;
}
