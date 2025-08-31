import { Hono } from "hono";
import { PublisherService } from "../services/publisher-service.js";

const publish = new Hono();
const publisherService = new PublisherService();

export interface PublishRequest {
  platform: string;
  content: {
    id: string;
    platform: string;
    primaryText: string;
    tags: string[];
    metadata?: Record<string, any>;
  };
}

// Publish content to a specific platform
publish.post("/", async (c) => {
  try {
    const request: PublishRequest = await c.req.json();
    
    if (!request.platform || !request.content) {
      return c.json({
        success: false,
        error: "Platform and content are required"
      }, 400);
    }

    const publishResult = await publisherService.publish(
      request.content,
      request.platform
    );

    return c.json({
      success: true,
      result: publishResult
    });
  } catch (error) {
    console.error("Publish error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

export { publish };