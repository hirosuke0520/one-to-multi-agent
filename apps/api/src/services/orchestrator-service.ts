import { v4 as uuidv4 } from "uuid";
import { JobService } from "./job-service.js";
import { TranscriberService } from "./transcriber-service.js";
import { ContentService } from "./content-service.js";
import { PublisherService } from "./publisher-service.js";
import { StoredFile } from "./file-storage-service.js";
import { getStorageService } from "../config/storage.js";
import {
  MetadataServiceSQL,
  ContentMetadata,
  PlatformContent,
} from "./metadata-service-sql.js";
import { PreviewService } from "./preview-service.js";
import { VideoConverterService } from "./video-converter-service.js";
import { ContentSource } from "@one-to-multi-agent/core";
import { PromptService, Platform as PromptPlatform } from "./prompt-service.js";
import { UserSettingsService } from "./user-settings-service.js";

export interface ProcessJobRequest {
  sourceType: "text" | "audio" | "video";
  content?: string;
  fileBuffer?: Buffer; // For initial upload (will be stored to GCS)
  storedFile?: StoredFile; // For stored files (replaces fileBuffer in processing)
  fileName?: string;
  mimeType?: string;
  targets: string[];
  userId?: string;
  profile?: {
    tone?: string;
    audience?: string;
    purpose?: string;
    cta?: string;
  };
  customPrompts?: Record<string, string>;
}

export interface Job {
  id: string;
  sourceType: "text" | "audio" | "video";
  targets: string[];
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  error?: string;
  storedFile?: StoredFile; // Reference to stored file in GCS
}

export interface CanonicalContent {
  id: string;
  title?: string;
  summary: string;
  fullText: string;
  keyPoints: string[];
  topics: string[];
  metadata: {
    duration?: number;
    language: string;
    sourceType: "text" | "audio" | "video";
  };
}

interface PromptDetail {
  normalizedPlatform: PromptPlatform;
  globalCharacterPrompt: string;
  platformPrompt: string;
  combinedPrompt: string;
  customPrompt?: string;
  finalPrompt: string;
}

export class OrchestratorService {
  private jobService: JobService;
  private transcriberService: TranscriberService;
  private contentService: ContentService;
  private publisherService: PublisherService;
  private fileStorageService: any; // Storage service (GCS or local)
  private metadataService: MetadataServiceSQL;
  private previewService: PreviewService;
  private videoConverterService: VideoConverterService;
  private promptService: PromptService;
  private userSettingsService: UserSettingsService;
  private initialized: Promise<void>;

  constructor() {
    this.jobService = new JobService();
    this.transcriberService = new TranscriberService();
    this.contentService = new ContentService();
    this.publisherService = new PublisherService();
    this.metadataService = new MetadataServiceSQL();
    this.previewService = new PreviewService();
    this.videoConverterService = new VideoConverterService();
    this.promptService = new PromptService();
    this.userSettingsService = new UserSettingsService();
    this.initialized = this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    this.fileStorageService = await getStorageService();
  }

  private async ensureInitialized(): Promise<void> {
    await this.initialized;
  }

  async createJob(request: ProcessJobRequest): Promise<string> {
    await this.ensureInitialized();
    const jobId = uuidv4();

    let storedFile: StoredFile | undefined;
    let processedBuffer = request.fileBuffer;

    // Convert video to H.264 if needed
    if (request.fileBuffer && request.mimeType?.startsWith("video/")) {
      console.log("Processing video for H.264 conversion...");
      const conversionResult = await this.videoConverterService.processVideo(
        request.fileBuffer,
        request.fileName || "video.mp4",
        request.mimeType
      );

      if (conversionResult.converted) {
        console.log("Video converted to H.264 successfully");
        processedBuffer = conversionResult.buffer;
      }
    }

    // Store original file to storage service if it's an audio/video file
    if (processedBuffer && request.fileName && request.mimeType) {
      storedFile = await this.fileStorageService.saveFile(
        processedBuffer,
        request.fileName,
        request.mimeType
      );
      console.log(`File stored: ${storedFile?.filePath}`);
    }

    const job: Job = {
      id: jobId,
      sourceType: request.sourceType,
      targets: request.targets,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: request.userId,
      storedFile,
    };

    await this.jobService.saveJob(job);

    // Store the modified request (without fileBuffer) for processing
    const requestForStorage: ProcessJobRequest = {
      ...request,
      fileBuffer: undefined, // Don't store buffer in job request
      storedFile,
    };
    await this.jobService.saveJobRequest(jobId, requestForStorage);

    return jobId;
  }

  async createJobs(
    request: ProcessJobRequest
  ): Promise<{ jobs: Array<{ jobId: string; platform: string }> }> {
    await this.ensureInitialized();
    let storedFile: StoredFile | undefined;
    let processedBuffer = request.fileBuffer;

    // Convert video to H.264 if needed
    if (request.fileBuffer && request.mimeType?.startsWith("video/")) {
      console.log("Processing video for H.264 conversion...");
      const conversionResult = await this.videoConverterService.processVideo(
        request.fileBuffer,
        request.fileName || "video.mp4",
        request.mimeType
      );

      if (conversionResult.converted) {
        console.log("Video converted to H.264 successfully");
        processedBuffer = conversionResult.buffer;
      }
    }

    // Store original file once if needed
    if (processedBuffer && request.fileName && request.mimeType) {
      storedFile = await this.fileStorageService.saveFile(
        processedBuffer,
        request.fileName,
        request.mimeType
      );
      console.log(`File stored: ${storedFile?.filePath}`);
    }

    // Create single job for all target platforms
    const jobId = uuidv4();

    const job: Job = {
      id: jobId,
      sourceType: request.sourceType,
      targets: request.targets, // All platforms in one job
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      storedFile,
    };

    await this.jobService.saveJob(job);

    // Create job request for all platforms
    const jobRequest: ProcessJobRequest = {
      ...request,
      fileBuffer: undefined, // Don't store buffer in job request
      storedFile,
      targets: request.targets, // All platforms
    };

    await this.jobService.saveJobRequest(jobId, jobRequest);

    // Return single job with all platforms
    const jobs = request.targets.map((platform) => ({ jobId, platform }));

    return { jobs };
  }

  async processJob(jobId: string): Promise<void> {
    await this.ensureInitialized();
    let fileBuffer: Buffer | undefined;

    try {
      await this.updateJobStatus(jobId, "processing");

      const request = await this.jobService.getJobRequest(jobId);
      if (!request) {
        throw new Error("Job request not found");
      }

      // Step 1: Get content (text directly, or download file buffer from storage)
      let sourceContent: ContentSource;

      if (request.sourceType === "text") {
        sourceContent = request.content || "";
      } else {
        // For audio/video, retrieve from storage service
        if (!request.storedFile) {
          throw new Error(
            "Stored file reference is required for audio/video content"
          );
        }

        const downloadedBuffer = await this.fileStorageService.getFile(
          request.storedFile.filePath
        );

        if (!downloadedBuffer) {
          throw new Error("Failed to retrieve file from storage");
        }

        fileBuffer = downloadedBuffer;

        sourceContent = {
          fileBuffer: downloadedBuffer,
          fileName: request.storedFile.fileName,
          mimeType: request.storedFile.mimeType,
          sourceType: request.sourceType,
        };
      }

      // Step 2: Generate platform-specific content for all target platforms
      const targets = request.targets;
      if (!targets || targets.length === 0) {
        throw new Error("No target platforms specified");
      }

      const promptDetails = await this.preparePromptDetails(
        targets,
        request.userId,
        request.customPrompts
      );

      const platformResults = await Promise.allSettled(
        targets.map(async (target) => {
          try {
            const platformContent =
              await this.contentService.generatePlatformContent(
                sourceContent,
                target,
                request.profile,
                promptDetails[target]?.finalPrompt
              );
            return {
              platform: target,
              success: true,
              content: platformContent,
            };
          } catch (error) {
            console.error(`Failed to generate content for ${target}:`, error);
            return {
              platform: target,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
      );

      const resolvedPlatformResults = platformResults.map((result, index) => {
        const target = targets[index];
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            platform: target,
            success: false,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "Generation failed",
          };
        }
      });

      // Step 3: Save results
      const sourceText =
        typeof sourceContent === "string"
          ? sourceContent
          : `Audio/Video file: ${sourceContent.fileName}`;

      await this.jobService.saveJobResults(jobId, {
        sourceText,
        platformResults: resolvedPlatformResults,
      });

      // Step 4: Save metadata and generate preview (for history tracking)
      await this.saveContentMetadata(
        jobId,
        request,
        resolvedPlatformResults,
        sourceContent,
        promptDetails
      );

      await this.updateJobStatus(jobId, "completed");

      // Note: Keep audio files for playback functionality
      // await this.cleanupFiles(request);
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      await this.updateJobStatus(
        jobId,
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      // Clean up file buffer from memory
      if (fileBuffer) {
        fileBuffer = undefined;
      }
    }
  }

  private async updateJobStatus(
    jobId: string,
    status: Job["status"],
    error?: string
  ): Promise<void> {
    const job = await this.jobService.getJob(jobId);
    if (job) {
      job.status = status;
      job.updatedAt = new Date();
      if (error) {
        job.error = error;
      }
      await this.jobService.saveJob(job);
    }
  }

  private async saveContentMetadata(
    jobId: string,
    request: ProcessJobRequest,
    platformResults: Array<{
      platform: string;
      success: boolean;
      content?: any;
      error?: string;
    }>,
    sourceContent: ContentSource,
    promptDetails: Record<string, PromptDetail>
  ): Promise<void> {
    try {
      const metadata: ContentMetadata = {
        id: this.metadataService.generateId(),
        sourceType: request.sourceType,
        userId: request.userId,
        createdAt: new Date().toISOString(),
        generatedContent: [],
        usedPrompts: {},
      };

      // Save source content based on type
      if (request.sourceType === "text" && request.content) {
        // For text input, save the content directly
        metadata.sourceText = request.content;
      }

      // Add file-specific metadata for original file
      if (request.storedFile) {
        metadata.originalFileName = request.storedFile.fileName;
        metadata.originalFilePath = request.storedFile.filePath;
        metadata.mimeType = request.storedFile.mimeType;
        metadata.size = request.storedFile.size;

        // Generate preview and extract text for audio/video files
        if (request.sourceType === "audio" || request.sourceType === "video") {
          try {
            // Retrieve the file temporarily for preview generation and transcription
            const fileBuffer = await this.fileStorageService.getFile(
              request.storedFile.filePath
            );

            if (fileBuffer) {
              const fs = await import("fs");
              const tempFilePath = `/tmp/preview_${Date.now()}_${
                request.storedFile.fileName
              }`;
              fs.writeFileSync(tempFilePath, fileBuffer);

              // Generate preview data
              console.log(
                `Generating ${request.sourceType} preview for: ${tempFilePath}`
              );
              if (request.sourceType === "audio") {
                metadata.previewData =
                  await this.previewService.generateAudioPreview(tempFilePath);
                console.log("Audio preview generated:", metadata.previewData);
              } else {
                metadata.previewData =
                  await this.previewService.generateVideoPreview(tempFilePath);
                console.log("Video preview generated:", metadata.previewData);
              }

              // Note: Transcription is handled by Gemini during content generation
              // We don't store transcribed text separately to avoid duplication

              // Clean up temp file
              await this.previewService.cleanup([tempFilePath]);
            }
          } catch (previewError) {
            console.warn("Failed to generate preview:", previewError);
            // Continue without preview data
          }
        }
      }

      // Transform platform results to metadata format
      metadata.generatedContent = platformResults
        .filter((result) => result.success && result.content)
        .map((result): PlatformContent => {
          const content = result.content;
          return {
            platform: result.platform,
            title: content.title,
            description: content.description,
            content: content.content || content.primaryText,
            hashtags: content.hashtags || content.tags,
            script: content.script,
            chapters: content.chapters,
          };
        });

      // Attach prompt details for successful platforms
      for (const result of platformResults) {
        if (!result.success) {
          continue;
        }
        const details = promptDetails[result.platform];
        if (details) {
          metadata.usedPrompts = metadata.usedPrompts || {};
          metadata.usedPrompts[result.platform] = {
            normalizedPlatform: details.normalizedPlatform,
            globalCharacterPrompt: details.globalCharacterPrompt,
            platformPrompt: details.platformPrompt,
            combinedPrompt: details.combinedPrompt,
            customPrompt: details.customPrompt,
            finalPrompt: details.finalPrompt,
          };
        }
      }

      // Save metadata to database
      await this.metadataService.saveMetadata(metadata);
      console.log(`Metadata saved for job ${jobId}: ${metadata.id}`);
    } catch (error) {
      console.error("Failed to save content metadata:", error);
      // Don't throw error - this should not fail the job
    }
  }

  private async cleanupFiles(request: ProcessJobRequest): Promise<void> {
    try {
      if (request.storedFile) {
        // Delete the uploaded file from storage
        const deleted = await this.fileStorageService.deleteFile(
          request.storedFile.filePath
        );

        if (deleted) {
          console.log(
            `Cleaned up uploaded file: ${request.storedFile.fileName}`
          );
        } else {
          console.warn(
            `Failed to cleanup uploaded file: ${request.storedFile.fileName}`
          );
        }
      }
    } catch (error) {
      console.error("Error during file cleanup:", error);
      // Don't throw error - this should not fail the job
    }
  }

  private normalizePlatform(platform: string): PromptPlatform | undefined {
    if (!platform) {
      return undefined;
    }

    const lower = platform.toLowerCase();
    if (lower === "wordpress") {
      return "blog";
    }

    const validPlatforms: PromptPlatform[] = [
      "twitter",
      "instagram",
      "tiktok",
      "threads",
      "youtube",
      "blog",
    ];
    return validPlatforms.includes(lower as PromptPlatform)
      ? (lower as PromptPlatform)
      : undefined;
  }

  private async preparePromptDetails(
    targets: string[],
    userId?: string,
    customPrompts?: Record<string, string>
  ): Promise<Record<string, PromptDetail>> {
    const details: Record<string, PromptDetail> = {};
    const normalizedCustomPrompts: Record<string, string> = {};

    if (customPrompts) {
      for (const [platform, prompt] of Object.entries(customPrompts)) {
        if (typeof prompt !== "string") {
          continue;
        }
        const trimmed = prompt.trim();
        if (!trimmed) {
          continue;
        }
        const normalized =
          this.normalizePlatform(platform) ||
          this.normalizePlatform(platform.toLowerCase());
        if (normalized) {
          normalizedCustomPrompts[normalized] = trimmed;
        }
      }
    }

    // デフォルトプロンプトを準備（customPromptsがない場合のフォールバック用）
    const defaultGlobalPrompt =
      this.userSettingsService.getDefaultGlobalCharacterPrompt();
    let defaultGlobalCharacterPrompt = defaultGlobalPrompt;
    if (userId) {
      const savedGlobal =
        await this.userSettingsService.getGlobalCharacterPrompt(userId);
      if (savedGlobal && savedGlobal.trim().length > 0) {
        defaultGlobalCharacterPrompt = savedGlobal;
      }
    }

    const defaultPlatformPrompts = this.promptService.getDefaultPrompts();
    const processedTargets = new Set<string>();

    for (const target of targets) {
      if (!target || processedTargets.has(target)) {
        continue;
      }
      processedTargets.add(target);

      const normalized = this.normalizePlatform(target);
      if (!normalized) {
        continue;
      }

      // リクエストに含まれるプロンプトを優先して使用
      const customPrompt = normalizedCustomPrompts[normalized];

      if (customPrompt) {
        // リクエストにプロンプトが含まれている場合はそれをそのまま使用
        console.log(`✅ Using request prompt for ${normalized}`);
        details[target] = {
          normalizedPlatform: normalized,
          globalCharacterPrompt: "", // リクエストプロンプトは既に完全なプロンプト
          platformPrompt: "",
          combinedPrompt: customPrompt,
          customPrompt: customPrompt,
          finalPrompt: customPrompt,
        };
      } else {
        // リクエストにプロンプトがない場合はデフォルトプロンプトを使用
        console.log(`📝 Using default prompt for ${normalized}`);
        let platformPrompt = defaultPlatformPrompts[normalized];
        if (userId) {
          const savedPrompt = await this.promptService.getPromptByPlatform(
            userId,
            normalized
          );
          if (savedPrompt?.prompt && savedPrompt.prompt.trim().length > 0) {
            platformPrompt = savedPrompt.prompt;
          }
        }

        const combinedPrompt = `${defaultGlobalCharacterPrompt}\n\n${platformPrompt}`;
        details[target] = {
          normalizedPlatform: normalized,
          globalCharacterPrompt: defaultGlobalCharacterPrompt,
          platformPrompt,
          combinedPrompt,
          customPrompt: undefined,
          finalPrompt: combinedPrompt,
        };
      }
    }

    return details;
  }

  // New method for getting content history
  async getContentHistory(
    userId?: string,
    limit = 20
  ): Promise<ContentMetadata[]> {
    return await this.metadataService.listMetadata(userId, limit);
  }

  async getContentMetadata(
    id: string,
    userId?: string
  ): Promise<ContentMetadata | null> {
    const metadata = await this.metadataService.getMetadata(id);
    if (!metadata) {
      return null;
    }

    if (userId && metadata.userId && metadata.userId !== userId) {
      return null;
    }

    return metadata;
  }
}
