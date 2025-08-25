import { v4 as uuidv4 } from "uuid";
import { JobService } from "./job-service";
import { TranscriberService } from "./transcriber-service";
import { ContentService } from "./content-service";
import { PublisherService } from "./publisher-service";

export interface ProcessJobRequest {
  sourceType: "text" | "audio" | "video";
  content?: string;
  fileBuffer?: Buffer; // For audio/video files as buffer
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
  fileName?: string; // For audio/video files metadata (buffer stored separately in memory)
  mimeType?: string;
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
  private fileBuffers: Map<string, Buffer> = new Map(); // In-memory buffer storage

  constructor() {
    this.jobService = new JobService();
    this.transcriberService = new TranscriberService();
    this.contentService = new ContentService();
    this.publisherService = new PublisherService();
  }

  async createJob(request: ProcessJobRequest): Promise<string> {
    const jobId = uuidv4();
    
    // Store buffer separately in memory
    if (request.fileBuffer) {
      this.fileBuffers.set(jobId, request.fileBuffer);
    }
    
    const job: Job = {
      id: jobId,
      sourceType: request.sourceType,
      targets: request.targets,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      fileName: request.fileName,
      mimeType: request.mimeType,
      // Note: fileBuffer is stored separately in memory, not in JSON
    };

    await this.jobService.saveJob(job);
    
    // Store the original request for processing
    await this.jobService.saveJobRequest(jobId, request);
    
    return jobId;
  }

  async processJob(jobId: string): Promise<void> {
    try {
      await this.updateJobStatus(jobId, "processing");
      
      const request = await this.jobService.getJobRequest(jobId);
      if (!request) {
        throw new Error("Job request not found");
      }

      // Step 1: Get content (text directly, or file buffer for AI processing)
      let sourceContent: string | { fileBuffer: Buffer; fileName: string; mimeType: string; sourceType: string };
      
      if (request.sourceType === "text") {
        sourceContent = request.content || "";
      } else {
        // For audio/video, get buffer from memory and pass to AI
        const fileBuffer = this.fileBuffers.get(jobId);
        if (!fileBuffer || !request.fileName || !request.mimeType) {
          throw new Error("File buffer, name, and mime type are required for audio/video content");
        }
        sourceContent = {
          fileBuffer: fileBuffer,
          fileName: request.fileName,
          mimeType: request.mimeType,
          sourceType: request.sourceType
        };
      }

      // Step 2: Generate platform-specific content
      const platformResults = [];
      
      for (const target of request.targets) {
        try {
          const platformContent = await this.contentService.generatePlatformContent(
            sourceContent,
            target,
            request.profile
          );
          
          // Store generated content without publishing yet
          platformResults.push({
            platform: target,
            success: true,
            content: platformContent,
            // Note: Publishing is now separate from content generation
          });
        } catch (error) {
          console.error(`Failed to process ${target}:`, error);
          platformResults.push({
            platform: target,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Step 3: Save results
      const sourceText = typeof sourceContent === "string" ? sourceContent : 
        `Audio/Video file: ${sourceContent.fileName}`;
      
      await this.jobService.saveJobResults(jobId, {
        sourceText,
        platformResults,
      });

      await this.updateJobStatus(jobId, "completed");
      
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      await this.updateJobStatus(jobId, "failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      // Clean up buffer from memory after processing (success or failure)
      this.fileBuffers.delete(jobId);
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
}