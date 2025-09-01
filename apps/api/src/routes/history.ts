import { Hono } from "hono";
import { OrchestratorService } from "../services/orchestrator-service.js";

const history = new Hono();
const orchestratorService = new OrchestratorService();

// GET /history - Get content generation history
history.get("/", async (c) => {
  try {
    const userId = c.req.query("userId");
    const limitParam = c.req.query("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    if (limit > 100) {
      return c.json({ error: "Limit cannot exceed 100" }, 400);
    }

    const contentHistory = await orchestratorService.getContentHistory(userId, limit);
    
    return c.json({
      success: true,
      data: contentHistory,
      count: contentHistory.length
    });
  } catch (error) {
    console.error("Failed to get content history:", error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to get content history" 
      },
      500
    );
  }
});

export { history };