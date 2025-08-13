import { Hono } from "hono";
import { JobService } from "../services/job-service";

const jobs = new Hono();

jobs.get("/:id", async (c) => {
  const jobId = c.req.param("id");
  
  try {
    const jobService = new JobService();
    const job = await jobService.getJob(jobId);
    
    if (!job) {
      return c.json({
        success: false,
        error: "Job not found",
      }, 404);
    }

    return c.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("Failed to get job:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

jobs.get("/:id/results", async (c) => {
  const jobId = c.req.param("id");
  
  try {
    const jobService = new JobService();
    const results = await jobService.getJobResults(jobId);
    
    if (!results) {
      return c.json({
        success: false,
        error: "Job results not found",
      }, 404);
    }

    return c.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Failed to get job results:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});

export { jobs };