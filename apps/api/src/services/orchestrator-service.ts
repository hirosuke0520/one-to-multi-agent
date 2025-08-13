import { v4 as uuidv4 } from "uuid";
import { JobService } from "./job-service";
import { TranscriberService } from "./transcriber-service";
import { ContentService } from "./content-service";
import { PublisherService } from "./publisher-service";

export interface ProcessJobRequest {
  sourceType: "text" | "audio" | "video";
  content?: string;
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

  constructor() {
    this.jobService = new JobService();
    this.transcriberService = new TranscriberService();
    this.contentService = new ContentService();
    this.publisherService = new PublisherService();
  }

  async createJob(request: ProcessJobRequest): Promise<string> {
    const jobId = uuidv4();
    
    const job: Job = {
      id: jobId,
      sourceType: request.sourceType,
      targets: request.targets,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
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

      // Step 1: Extract/transcribe content
      let sourceText: string;
      
      if (request.sourceType === "text") {
        sourceText = request.content || "";
      } else {
        // TODO: Implement file path retrieval from upload
        const filePath = ""; // Get from upload
        sourceText = await this.transcriberService.transcribe(filePath, request.sourceType);
      }

      // Step 2: Generate canonical content
      const canonicalContent = await this.contentService.generateCanonicalContent(
        sourceText,
        request.sourceType,
        request.profile
      );

      // Step 3: Generate platform-specific content
      const platformResults = [];
      
      for (const target of request.targets) {
        try {
          const platformContent = await this.contentService.generatePlatformContent(
            canonicalContent,
            target,
            request.profile
          );
          
          // Step 4: Publish/create draft
          const publishResult = await this.publisherService.publish(
            platformContent,
            target
          );
          
          platformResults.push({
            platform: target,
            success: true,
            result: publishResult,
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

      // Step 5: Save results
      await this.jobService.saveJobResults(jobId, {
        canonicalContent,
        platformResults,
      });

      await this.updateJobStatus(jobId, "completed");
      
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      await this.updateJobStatus(jobId, "failed", error instanceof Error ? error.message : "Unknown error");
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