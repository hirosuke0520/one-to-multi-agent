import { Hono } from "hono";
import { authMiddleware } from "../middlewares/auth.js";
import { OrchestratorService } from "../services/orchestrator-service.js";

type Variables = {
  userId: string;
  email: string;
  name: string;
};

const history = new Hono<{ Variables: Variables }>();
const orchestratorService = new OrchestratorService();

// 全てのエンドポイントに認証を適用
history.use('*', authMiddleware);

// GET /history - Get content generation history
history.get("/", async (c) => {
  try {
    const userId = c.get('userId') as string;
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

history.get("/:id/prompts", async (c) => {
  try {
    const userId = c.get('userId') as string;
    const id = c.req.param('id');

    if (!id) {
      return c.json({ success: false, error: "Content id is required" }, 400);
    }

    const metadata = await orchestratorService.getContentMetadata(id, userId);

    if (!metadata) {
      return c.json({ success: false, error: "Content not found" }, 404);
    }

    const prompts = metadata.usedPrompts
      ? Object.entries(metadata.usedPrompts).map(([platform, detail]) => ({
          platform,
          generationPrompt: detail.finalPrompt,
          globalCharacterPrompt: detail.globalCharacterPrompt,
          platformPrompt: detail.platformPrompt,
          combinedPrompt: detail.combinedPrompt,
          customPrompt: detail.customPrompt,
        }))
      : [];

    return c.json({ success: true, prompts });
  } catch (error) {
    console.error("Failed to get content prompts:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get content prompts",
      },
      500
    );
  }
});

export { history };
