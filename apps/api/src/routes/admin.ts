import { Hono } from "hono";
import { MetadataServiceSQL } from "../services/metadata-service-sql.js";

const admin = new Hono();
const metadataService = new MetadataServiceSQL();

// DELETE /admin/cleanup - Delete old records keeping only the latest 3
admin.delete("/cleanup", async (c) => {
  try {
    // Get all metadata ordered by date
    const allMetadata = await metadataService.listMetadata(undefined, 1000);
    
    if (allMetadata.length <= 3) {
      return c.json({ 
        success: true, 
        message: "No records to delete",
        kept: allMetadata.length,
        deleted: 0
      });
    }
    
    // Keep the latest 3, delete the rest
    const toDelete = allMetadata.slice(3);
    let deletedCount = 0;
    
    for (const record of toDelete) {
      try {
        await metadataService.deleteMetadata(record.id);
        deletedCount++;
        console.log(`Deleted record: ${record.id}`);
      } catch (error) {
        console.error(`Failed to delete record ${record.id}:`, error);
      }
    }
    
    return c.json({ 
      success: true, 
      message: `Deleted ${deletedCount} old records`,
      kept: 3,
      deleted: deletedCount
    });
  } catch (error) {
    console.error("Cleanup failed:", error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Cleanup failed" 
      },
      500
    );
  }
});

export { admin };