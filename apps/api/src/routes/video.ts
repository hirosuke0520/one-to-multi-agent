import { Hono } from "hono";
import { getStorageService } from "../config/storage.js";
import { MetadataServiceSQL } from "../services/metadata-service-sql.js";

const video = new Hono();
let fileStorageService: any;
const metadataService = new MetadataServiceSQL();

// Initialize storage service
const initializeStorage = async () => {
  fileStorageService = await getStorageService();
};
initializeStorage();

// GET /video/:contentId - Stream video file
video.get("/:contentId", async (c) => {
  try {
    const contentId = c.req.param("contentId");
    
    if (!contentId) {
      return c.json({ error: "Content ID is required" }, 400);
    }

    // Get content metadata to find stored file info
    const metadata = await metadataService.getMetadata(contentId);
    if (!metadata || !metadata.originalFilePath) {
      return c.json({ error: "Video file not found" }, 404);
    }

    // Only allow video files
    if (metadata.sourceType !== 'video') {
      return c.json({ error: "Not a video file" }, 400);
    }

    try {
      console.log(`Fetching video file - Content ID: ${contentId}, Path: ${metadata.originalFilePath}`);
      
      // Ensure storage is initialized
      if (!fileStorageService) {
        await initializeStorage();
      }
      
      // Retrieve file from storage using stored path
      const fileBuffer = await fileStorageService.getFile(metadata.originalFilePath);
      
      if (!fileBuffer) {
        console.error(`Video file not found - Path: ${metadata.originalFilePath}`);
        return c.json({ error: "Video file not accessible" }, 404);
      }
      
      console.log(`Video file retrieved successfully - Size: ${fileBuffer.length} bytes`);
      console.log(`Serving with MIME type: ${metadata.mimeType || 'video/mp4'}`);

      // Set appropriate headers for video streaming
      const mimeType = metadata.mimeType || 'video/mp4';
      const fileName = metadata.originalFileName || 'video.mp4';
      
      // Support range requests for video seeking
      const range = c.req.header('range');
      const fileSize = fileBuffer.length;
      
      if (range) {
        // Parse Range header
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const chunk = fileBuffer.slice(start, end + 1);
        
        c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        c.header('Accept-Ranges', 'bytes');
        c.header('Content-Length', chunksize.toString());
        c.header('Content-Type', mimeType);
        c.status(206);
        
        return c.body(chunk);
      } else {
        // No range request - send entire file
        c.header('Content-Type', mimeType);
        c.header('Accept-Ranges', 'bytes');
        c.header('Content-Length', fileSize.toString());
        
        return c.body(fileBuffer);
      }
    } catch (error) {
      console.error('Error streaming video file:', error);
      return c.json({ error: "Failed to stream video file" }, 500);
    }
  } catch (error) {
    console.error("Failed to stream video:", error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to stream video" 
      },
      500
    );
  }
});

export { video };