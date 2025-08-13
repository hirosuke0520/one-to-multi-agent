export interface PublishContent {
  id: string;
  platform: string;
  text: string;
  title?: string;
  tags: string[];
  media?: {
    type: "image" | "video" | "audio";
    url?: string;
    path?: string;
    alt?: string;
  }[];
  metadata: Record<string, any>;
  scheduledAt?: Date;
}

export interface PublishResult {
  success: boolean;
  platform: string;
  id?: string;
  url?: string;
  status: "published" | "draft" | "scheduled" | "failed";
  message: string;
  publishedAt?: Date;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AdapterConfig {
  platform: string;
  enabled: boolean;
  credentials?: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    webhookUrl?: string;
    [key: string]: any;
  };
  options?: {
    defaultVisibility?: "public" | "private" | "unlisted";
    autoPublish?: boolean;
    includeTags?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    [key: string]: any;
  };
}

export interface PlatformLimits {
  maxTextLength: number;
  maxTags: number;
  maxMedia: number;
  supportsScheduling: boolean;
  supportsVideo: boolean;
  supportsImages: boolean;
  supportsDrafts: boolean;
  requiredFields: string[];
}

export interface AdapterMetrics {
  totalRequests: number;
  successfulPublishes: number;
  failedPublishes: number;
  lastPublishAt?: Date;
  avgResponseTime?: number;
  errors: Array<{
    timestamp: Date;
    error: string;
    content?: string;
  }>;
}

export abstract class Publisher {
  protected config: AdapterConfig;
  protected metrics: AdapterMetrics;

  constructor(config: AdapterConfig) {
    this.config = config;
    this.metrics = {
      totalRequests: 0,
      successfulPublishes: 0,
      failedPublishes: 0,
      errors: []
    };
  }

  abstract getPlatformLimits(): PlatformLimits;
  abstract validateContent(content: PublishContent): Promise<{ valid: boolean; errors: string[] }>;
  abstract publish(content: PublishContent): Promise<PublishResult>;
  
  async createDraft(content: PublishContent): Promise<PublishResult> {
    // Default implementation - can be overridden
    return this.publish({ ...content, metadata: { ...content.metadata, draft: true } });
  }

  async schedulePublish(content: PublishContent, scheduledAt: Date): Promise<PublishResult> {
    // Default implementation - can be overridden
    return this.publish({ ...content, scheduledAt });
  }

  getMetrics(): AdapterMetrics {
    return { ...this.metrics };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  protected recordSuccess(publishResult: PublishResult): void {
    this.metrics.totalRequests++;
    this.metrics.successfulPublishes++;
    this.metrics.lastPublishAt = new Date();
  }

  protected recordFailure(error: string, content?: PublishContent): void {
    this.metrics.totalRequests++;
    this.metrics.failedPublishes++;
    this.metrics.errors.push({
      timestamp: new Date(),
      error,
      content: content?.id
    });
  }
}