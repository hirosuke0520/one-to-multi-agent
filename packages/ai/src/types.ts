export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration?: number;
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
}

export interface ContentGenerationOptions {
  tone?: "professional" | "casual" | "friendly" | "authoritative" | "conversational";
  audience?: "general" | "technical" | "business" | "youth" | "professionals";
  purpose?: "inform" | "promote" | "educate" | "entertain" | "persuade";
  language?: string;
  maxLength?: number;
  includeEmojis?: boolean;
  includeTags?: boolean;
  cta?: string;
}

export interface PlatformConstraints {
  maxLength: number;
  maxTags: number;
  supportsEmojis: boolean;
  supportsLinks: boolean;
  supportsImages: boolean;
  supportsVideo: boolean;
  requiredFormat: "plain" | "markdown" | "html";
  tagPrefix?: string;
}

export interface GeneratedContent {
  text: string;
  title?: string;
  summary?: string;
  tags: string[];
  metadata: {
    characterCount: number;
    wordCount: number;
    estimatedReadTime: number;
    platform?: string;
    generatedAt: string;
  };
}

export interface AIConfig {
  geminiApiKey?: string;
  gcpProjectId?: string;
  speechToTextConfig?: {
    languageCode: string;
    encoding: "FLAC" | "LINEAR16" | "MULAW" | "AMR" | "AMR_WB" | "OGG_OPUS" | "SPEEX_WITH_HEADER_BYTE";
    sampleRateHertz: number;
    audioChannelCount?: number;
    enableAutomaticPunctuation?: boolean;
  };
}