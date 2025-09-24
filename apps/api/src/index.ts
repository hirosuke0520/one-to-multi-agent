import { config } from "dotenv";
config({ path: "../../.env" });

// Validate environment variables early
import { validateEnvironment, EnvValidator } from "./utils/env-validator.js";

const envValidation = validateEnvironment();
EnvValidator.logValidationResults(envValidation);

if (!envValidation.isValid) {
  console.error(EnvValidator.generateHelpMessage(envValidation));
  console.error(
    "\n❌ Server startup aborted due to environment configuration issues."
  );
  console.error("Please fix the above issues and restart the server.\n");
  process.exit(1);
}

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { orchestrator } from "./routes/orchestrator.js";
import { jobs } from "./routes/jobs.js";
import { publish } from "./routes/publish.js";
import { history } from "./routes/history.js";
import { audio } from "./routes/audio.js";
import { video } from "./routes/video.js";
import { admin } from "./routes/admin.js";
import auth from "./routes/auth.js";
import prompts from "./routes/prompts.js";
import userSettings from "./routes/user-settings.js";
import { databaseService } from "./services/database-service.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: [
      "http://localhost:3000",
      "http://web:3000",
      "https://web-675967400701.asia-northeast1.run.app",
      "https://web-one-to-multi-agent-675967400701.asia-northeast1.run.app",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-api-key"],
    credentials: true,
  })
);

app.get("/", (c) => {
  return c.json({
    message: "One to Multi Agent API",
    version: "0.1.0",
    endpoints: {
      "POST /orchestrator/process": "Process content for multiple platforms",
      "GET /jobs/:id": "Get job status",
      "GET /jobs/:id/results": "Get job results",
      "GET /history": "Get content generation history",
    },
  });
});

// Health check endpoint with environment validation
app.get("/health", (c) => {
  const envValidation = validateEnvironment();

  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "unknown",
    validation: {
      isValid: envValidation.isValid,
      errors: envValidation.errors,
      warnings: envValidation.warnings,
    },
  });
});

// Detailed environment check endpoint (development only)
app.get("/debug/env", (c) => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Debug endpoints are disabled in production" }, 403);
  }

  const envValidation = validateEnvironment();

  return c.json({
    validation: envValidation,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DB_HOST: process.env.DB_HOST,
      DB_NAME: process.env.DB_NAME,
      STORAGE_TYPE: process.env.STORAGE_TYPE,
      USE_REAL_AI: process.env.USE_REAL_AI,
      // Don't expose secrets
      AUTH_GOOGLE_ID_SET: !!process.env.AUTH_GOOGLE_ID,
      AUTH_GOOGLE_SECRET_SET: !!process.env.AUTH_GOOGLE_SECRET,
      AUTH_SECRET_SET: !!process.env.AUTH_SECRET,
      GOOGLE_API_KEY_SET: !!process.env.GOOGLE_API_KEY,
    },
  });
});

app.route("/orchestrator", orchestrator);
app.route("/jobs", jobs);
app.route("/publish", publish);
app.route("/history", history);
app.route("/audio", audio);
app.route("/video", video);
app.route("/admin", admin);
app.route("/auth", auth);
app.route("/prompts", prompts);
app.route("/user-settings", userSettings);

const port = parseInt(process.env.PORT || "8080");

async function startServer() {
  try {
    // Try to connect to database, but don't fail if it's not available
    console.log("Connecting to database...");
    try {
      await databaseService.connect();
      await databaseService.initializeTables();
      console.log("Database connected successfully");
    } catch (error) {
      console.log(
        "Database connection failed, running without database:",
        error instanceof Error ? error.message : error
      );
    }

    console.log(`Starting server on port ${port}`);

    serve({
      fetch: app.fetch,
      port,
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
