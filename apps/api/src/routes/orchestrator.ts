import { Hono } from "hono";
import { z } from "zod";
import { OrchestratorService } from "../services/orchestrator-service.js";

const orchestrator = new Hono();

const processSchema = z.object({
  sourceType: z.enum(["text", "audio", "video"]),
  content: z.string().optional(),
  targets: z.array(z.string()).min(1),
  profile: z.object({
    tone: z.string().optional(),
    audience: z.string().optional(),
    purpose: z.string().optional(),
    cta: z.string().optional(),
  }).optional(),
});

orchestrator.post(
  "/process",
  async (c) => {
    try {
      const contentType = c.req.header("content-type");
      
      if (contentType?.includes("multipart/form-data")) {
        // Handle file upload using Hono's built-in body parser
        const body = await c.req.formData();
        
        const sourceType = body.get("sourceType") as string;
        const targets = JSON.parse(body.get("targets") as string || "[]");
        const profile = JSON.parse(body.get("profile") as string || "{}");
        const uploadedFile = body.get("file") as File;

        if (!uploadedFile) {
          return c.json({
            success: false,
            error: "No file uploaded",
          }, 400);
        }

        // Convert File to Buffer for direct processing (no disk storage)
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const orchestratorService = new OrchestratorService();
        const { jobs } = await orchestratorService.createJobs({
          sourceType: sourceType as "audio" | "video",
          fileBuffer: buffer, // Pass buffer directly instead of file path
          fileName: uploadedFile.name,
          mimeType: uploadedFile.type,
          targets,
          profile,
        });

        // Start processing all jobs in parallel
        jobs.forEach(({ jobId, platform }) => {
          orchestratorService.processJob(jobId).catch(error => {
            console.error(`Job ${jobId} for ${platform} failed:`, error);
          });
        });

        return c.json({
          success: true,
          jobs: jobs.map(job => ({
            jobId: job.jobId,
            platform: job.platform
          })),
          message: "Processing started for all platforms",
        });
      } else {
        // Handle JSON (text content)
        const body = await c.req.json();
        const validation = processSchema.safeParse(body);
        
        if (!validation.success) {
          return c.json({
            success: false,
            error: "Invalid request data",
            details: validation.error.issues,
          }, 400);
        }
        
        const { sourceType, content, targets, profile } = validation.data;
        
        const orchestratorService = new OrchestratorService();
        const { jobs } = await orchestratorService.createJobs({
          sourceType,
          content,
          targets,
          profile,
        });

        // Start processing all jobs in parallel
        jobs.forEach(({ jobId, platform }) => {
          orchestratorService.processJob(jobId).catch(error => {
            console.error(`Job ${jobId} for ${platform} failed:`, error);
          });
        });

        return c.json({
          success: true,
          jobs: jobs.map(job => ({
            jobId: job.jobId,
            platform: job.platform
          })),
          message: "Processing started for all platforms",
        });
      }
    } catch (error) {
      console.error("Failed to start processing:", error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }, 500);
    }
  }
);


export { orchestrator };