import { Hono } from "hono";
import { FileStorageService } from "../services/file-storage-service.js";
import { MetadataServiceSQL } from "../services/metadata-service-sql.js";

const audio = new Hono();
const fileStorageService = new FileStorageService();
const metadataService = new MetadataServiceSQL();

// GET /audio/:contentId - Stream audio file
audio.get("/:contentId", async (c) => {
  try {
    const contentId = c.req.param("contentId");
    
    if (!contentId) {
      return c.json({ error: "Content ID is required" }, 400);
    }

    // Get content metadata to find stored file info
    const metadata = await metadataService.getMetadata(contentId);
    if (!metadata || !metadata.originalFilePath) {
      return c.json({ error: "Audio file not found" }, 404);
    }

    // Only allow audio files
    if (metadata.sourceType !== 'audio') {
      return c.json({ error: "Not an audio file" }, 400);
    }

    try {
      console.log(`Fetching audio file - Content ID: ${contentId}, Path: ${metadata.originalFilePath}`);
      
      // Retrieve file from storage using stored path
      const fileBuffer = await fileStorageService.getFile(metadata.originalFilePath);
      
      if (!fileBuffer) {
        console.error(`Audio file not found - Path: ${metadata.originalFilePath}`);
        return c.json({ error: "Audio file not accessible" }, 404);
      }
      
      console.log(`Audio file retrieved successfully - Size: ${fileBuffer.length} bytes`);
      console.log(`Serving with MIME type: ${metadata.mimeType || 'audio/mpeg'}`);

      // Set appropriate headers for audio streaming
      const mimeType = metadata.mimeType || 'audio/mpeg';
      const fileName = metadata.originalFileName || 'audio.mp3';
      c.header('Content-Type', mimeType);
      c.header('Accept-Ranges', 'bytes');
      c.header('Content-Length', fileBuffer.length.toString());
      
      return c.body(fileBuffer);
    } catch (error) {
      console.error('Error streaming audio file:', error);
      return c.json({ error: "Failed to stream audio file" }, 500);
    }
  } catch (error) {
    console.error("Failed to stream audio:", error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to stream audio" 
      },
      500
    );
  }
});

export { audio };