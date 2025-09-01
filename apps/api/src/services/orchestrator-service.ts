import { v4 as uuidv4 } from "uuid";
import { JobService } from "./job-service.js";
import { TranscriberService } from "./transcriber-service.js";
import { ContentService } from "./content-service.js";
import { PublisherService } from "./publisher-service.js";
import { StorageService, StoredFile } from "./storage-service.js";
import { MetadataServiceSQL, ContentMetadata, PlatformContent } from "./metadata-service-sql.js";
import { PreviewService } from "./preview-service.js";
import { ContentSource } from "@one-to-multi-agent/core";

export interface ProcessJobRequest {
  sourceType: "text" | "audio" | "video";
  content?: string;
  fileBuffer?: Buffer; // For initial upload (will be stored to GCS)
  storedFile?: StoredFile; // For stored files (replaces fileBuffer in processing)
  fileName?: string;
  mimeType?: string;
  targets: string[];
  profile?: {
    tone?: string;
    audience?: string;
    purpose?: string;
    cta?: string;
  };
}

export interface Job {
  id: string;
  sourceType: "text" | "audio" | "video";
  targets: string[];
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
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

export class OrchestratorService {
  private jobService: JobService;
  private transcriberService: TranscriberService;
  private contentService: ContentService;
  private publisherService: PublisherService;
  private storageService: StorageService;
  private metadataService: MetadataServiceSQL;
  private previewService: PreviewService;

  constructor() {
    this.jobService = new JobService();
    this.transcriberService = new TranscriberService();
    this.contentService = new ContentService();
    this.publisherService = new PublisherService();
    this.storageService = new StorageService();
    this.metadataService = new MetadataServiceSQL();
    this.previewService = new PreviewService();
  }

  async createJob(request: ProcessJobRequest): Promise<string> {
    const jobId = uuidv4();
    
    let storedFile: StoredFile | undefined;
    
    // Store file to storage service if it's an audio/video file
    if (request.fileBuffer && request.fileName && request.mimeType) {
      storedFile = await this.storageService.uploadFile(
        request.fileBuffer,
        request.fileName,
        request.mimeType
      );
    }
    
    const job: Job = {
      id: jobId,
      sourceType: request.sourceType,
      targets: request.targets,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
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

  async createJobs(request: ProcessJobRequest): Promise<{ jobs: Array<{ jobId: string; platform: string }> }> {
    let storedFile: StoredFile | undefined;
    
    // Upload file once if needed
    if (request.fileBuffer && request.fileName && request.mimeType) {
      storedFile = await this.storageService.uploadFile(
        request.fileBuffer,
        request.fileName,
        request.mimeType
      );
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
      targets: request.targets // All platforms
    };
    
    await this.jobService.saveJobRequest(jobId, jobRequest);
    
    // Return single job with all platforms
    const jobs = request.targets.map(platform => ({ jobId, platform }));
    
    return { jobs };
  }

  async processJob(jobId: string): Promise<void> {
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
        // For audio/video, download from storage service
        if (!request.storedFile) {
          throw new Error("Stored file reference is required for audio/video content");
        }
        
        const downloadedBuffer = await this.storageService.downloadFile(
          request.storedFile.fileId,
          request.storedFile.gcsPath
        );
        
        if (!downloadedBuffer) {
          throw new Error("Failed to download file from storage");
        }
        
        fileBuffer = downloadedBuffer;
        
        sourceContent = {
          fileBuffer: fileBuffer,
          fileName: request.storedFile.fileName,
          mimeType: request.storedFile.mimeType,
          sourceType: request.sourceType
        };
      }

      // Step 2: Generate platform-specific content for all target platforms
      const targets = request.targets;
      if (!targets || targets.length === 0) {
        throw new Error("No target platforms specified");
      }

      const platformResults = await Promise.allSettled(
        targets.map(async (target) => {
          try {
            const platformContent = await this.contentService.generatePlatformContent(
              sourceContent,
              target,
              request.profile
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
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            platform: target,
            success: false,
            error: result.reason instanceof Error ? result.reason.message : "Generation failed",
          };
        }
      });

      // Step 3: Save results
      const sourceText = typeof sourceContent === "string" ? sourceContent : 
        `Audio/Video file: ${sourceContent.fileName}`;
      
      await this.jobService.saveJobResults(jobId, {
        sourceText,
        platformResults: resolvedPlatformResults,
      });

      // Step 4: Save metadata and generate preview (for history tracking)
      await this.saveContentMetadata(jobId, request, resolvedPlatformResults, sourceContent);

      await this.updateJobStatus(jobId, "completed");
      
      // Step 5: Clean up uploaded files after successful completion
      await this.cleanupFiles(request);
      
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      await this.updateJobStatus(jobId, "failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      // Clean up file buffer from memory
      if (fileBuffer) {
        fileBuffer = undefined;
      }
    }
  }

  private async updateJobStatus(jobId: string, status: Job["status"], error?: string): Promise<void> {
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
    platformResults: Array<{ platform: string; success: boolean; content: any }>,
    sourceContent: ContentSource
  ): Promise<void> {
    try {
      const metadata: ContentMetadata = {
        id: this.metadataService.generateId(),
        sourceType: request.sourceType,
        createdAt: new Date().toISOString(),
        generatedContent: [],
      };

      // Add file-specific metadata
      if (request.storedFile) {
        metadata.originalFileName = request.storedFile.fileName;
        metadata.mimeType = request.storedFile.mimeType;
        metadata.size = request.storedFile.size;

        // Generate preview for audio/video files
        if (request.sourceType === 'audio' || request.sourceType === 'video') {
          try {
            // Download the file temporarily for preview generation
            const fileBuffer = await this.storageService.downloadFile(
              request.storedFile.fileId,
              request.storedFile.gcsPath
            );
            
            if (fileBuffer) {
              const tempFilePath = `/tmp/preview_${Date.now()}_${request.storedFile.fileName}`;
              require('fs').writeFileSync(tempFilePath, fileBuffer);
              
              if (request.sourceType === 'audio') {
                metadata.previewData = await this.previewService.generateAudioPreview(tempFilePath);
              } else {
                metadata.previewData = await this.previewService.generateVideoPreview(tempFilePath);
              }
              
              // Clean up temp file
              await this.previewService.cleanup([tempFilePath]);
            }
          } catch (previewError) {
            console.warn('Failed to generate preview:', previewError);
            // Continue without preview data
          }
        }
      }

      // Transform platform results to metadata format
      metadata.generatedContent = platformResults.map((result): PlatformContent => {
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

      // Save metadata to database
      await this.metadataService.saveMetadata(metadata);
      console.log(`Metadata saved for job ${jobId}: ${metadata.id}`);
      
    } catch (error) {
      console.error('Failed to save content metadata:', error);
      // Don't throw error - this should not fail the job
    }
  }

  private async cleanupFiles(request: ProcessJobRequest): Promise<void> {
    try {
      if (request.storedFile) {
        // Delete the uploaded file from GCS
        const deleted = await this.storageService.deleteFile(
          request.storedFile.fileId,
          request.storedFile.gcsPath
        );
        
        if (deleted) {
          console.log(`Cleaned up uploaded file: ${request.storedFile.fileName}`);
        } else {
          console.warn(`Failed to cleanup uploaded file: ${request.storedFile.fileName}`);
        }
      }
    } catch (error) {
      console.error('Error during file cleanup:', error);
      // Don't throw error - this should not fail the job
    }
  }

  // New method for getting content history
  async getContentHistory(userId?: string, limit = 20): Promise<ContentMetadata[]> {
    return await this.metadataService.listMetadata(userId, limit);
  }
}