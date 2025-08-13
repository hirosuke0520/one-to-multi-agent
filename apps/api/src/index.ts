import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { orchestrator } from "./routes/orchestrator";
import { jobs } from "./routes/jobs";

const app = new Hono();

app.use("*", cors({
  origin: ["http://localhost:3000"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

app.get("/", (c) => {
  return c.json({
    message: "One to Multi Agent API",
    version: "0.1.0",
    endpoints: {
      "POST /orchestrator/process": "Process content for multiple platforms",
      "GET /jobs/:id": "Get job status",
      "GET /jobs/:id/results": "Get job results"
    }
  });
});

app.route("/orchestrator", orchestrator);
app.route("/jobs", jobs);

const port = parseInt(process.env.PORT || "8787");

console.log(`Starting server on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});