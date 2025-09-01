import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { orchestrator } from "./routes/orchestrator.js";
import { jobs } from "./routes/jobs.js";
import { publish } from "./routes/publish.js";
import { history } from "./routes/history.js";
import { databaseService } from "./services/database-service.js";

const app = new Hono();

app.use("*", cors({
  origin: [
    "http://localhost:3000", 
    "http://web:3000",
    "https://web-675967400701.asia-northeast1.run.app"
  ],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.get("/", (c) => {
  return c.json({
    message: "One to Multi Agent API",
    version: "0.1.0",
    endpoints: {
      "POST /orchestrator/process": "Process content for multiple platforms",
      "GET /jobs/:id": "Get job status",
      "GET /jobs/:id/results": "Get job results",
      "GET /history": "Get content generation history"
    }
  });
});

app.route("/orchestrator", orchestrator);
app.route("/jobs", jobs);
app.route("/publish", publish);
app.route("/history", history);

const port = parseInt(process.env.PORT || "8787");

async function startServer() {
  try {
    // Initialize database connection and tables
    console.log('Connecting to database...');
    await databaseService.connect();
    
    try {
      await databaseService.initializeTables();
    } catch (error) {
      console.log('Table initialization skipped (tables may already exist):', error instanceof Error ? error.message : error);
    }
    
    console.log(`Starting server on port ${port}`);
    
    serve({
      fetch: app.fetch,
      port,
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();