import { v4 as uuidv4 } from "uuid";
import { JobService } from "./job-service.js";
import { TranscriberService } from "./transcriber-service.js";
import { ContentService } from "./content-service.js";
import { PublisherService } from "./publisher-service.js";
import { StorageService, StoredFile } from "./storage-service.js";
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

  constructor() {
    this.jobService = new JobService();
    this.transcriberService = new TranscriberService();
    this.contentService = new ContentService();
    this.publisherService = new PublisherService();
    this.storageService = new StorageService();
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
    const jobs: Array<{ jobId: string; platform: string }> = [];
    
    let storedFile: StoredFile | undefined;
    
    // Upload file once and share across all jobs
    if (request.fileBuffer && request.fileName && request.mimeType) {
      storedFile = await this.storageService.uploadFile(
        request.fileBuffer,
        request.fileName,
        request.mimeType
      );
    }
    
    // Create separate job for each target platform
    for (const target of request.targets) {
      const jobId = uuidv4();
      
      const job: Job = {
        id: jobId,
        sourceType: request.sourceType,
        targets: [target], // Single platform per job
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        storedFile, // Shared file reference
      };

      await this.jobService.saveJob(job);
      
      // Create individual request for this job (without fileBuffer)
      const individualRequest: ProcessJobRequest = {
        ...request,
        fileBuffer: undefined, // Don't store buffer in job request
        storedFile,
        targets: [target] // Single platform per request
      };
      await this.jobService.saveJobRequest(jobId, individualRequest);
      
      jobs.push({ jobId, platform: target });
    }
    
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

      // Step 2: Generate platform-specific content (single platform per job)
      const target = request.targets[0]; // Single platform per job now
      if (!target) {
        throw new Error("No target platform specified");
      }

      const platformContent = await this.contentService.generatePlatformContent(
        sourceContent,
        target,
        request.profile
      );
      
      const platformResults = [{
        platform: target,
        success: true,
        content: platformContent,
      }];

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
}