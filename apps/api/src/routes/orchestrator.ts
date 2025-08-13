import { Hono } from "hono";
import { z } from "zod";
import { OrchestratorService } from "../services/orchestrator-service";

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
    
    try {
      const orchestratorService = new OrchestratorService();
      const jobId = await orchestratorService.createJob({
        sourceType,
        content,
        targets,
        profile,
      });

      // Start processing in background
      orchestratorService.processJob(jobId).catch(error => {
        console.error(`Job ${jobId} failed:`, error);
      });

      return c.json({
        success: true,
        jobId,
        message: "Processing started",
      });
    } catch (error) {
      console.error("Failed to start processing:", error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }, 500);
    }
  }
);

// Handle file uploads for audio/video
orchestrator.post("/upload", async (c) => {
  try {
    // TODO: Implement file upload handling with multer
    return c.json({
      success: true,
      message: "File upload endpoint - TODO: implement",
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

export { orchestrator };