import fs from "fs-extra";
import path from "path";
import { Job, ProcessJobRequest, CanonicalContent } from "./orchestrator-service";

export interface JobResults {
  sourceText: string;
  platformResults: Array<{
    platform: string;
    success: boolean;
    content?: any;
    error?: string;
  }>;
}

export class JobService {
  private dataDir: string;

  constructor() {
    this.dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
    fs.ensureDirSync(this.dataDir);
    fs.ensureDirSync(path.join(this.dataDir, "jobs"));
    fs.ensureDirSync(path.join(this.dataDir, "requests"));
    fs.ensureDirSync(path.join(this.dataDir, "results"));
  }

  async saveJob(job: Job): Promise<void> {
    const jobPath = path.join(this.dataDir, "jobs", `${job.id}.json`);
    await fs.writeJSON(jobPath, job, { spaces: 2 });
  }

  async getJob(jobId: string): Promise<Job | null> {
    try {
      const jobPath = path.join(this.dataDir, "jobs", `${jobId}.json`);
      return await fs.readJSON(jobPath);
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async saveJobRequest(jobId: string, request: ProcessJobRequest): Promise<void> {
    const requestPath = path.join(this.dataDir, "requests", `${jobId}.json`);
    await fs.writeJSON(requestPath, request, { spaces: 2 });
  }

  async getJobRequest(jobId: string): Promise<ProcessJobRequest | null> {
    try {
      const requestPath = path.join(this.dataDir, "requests", `${jobId}.json`);
      return await fs.readJSON(requestPath);
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async saveJobResults(jobId: string, results: JobResults): Promise<void> {
    const resultsPath = path.join(this.dataDir, "results", `${jobId}.json`);
    await fs.writeJSON(resultsPath, results, { spaces: 2 });
  }

  async getJobResults(jobId: string): Promise<JobResults | null> {
    try {
      const resultsPath = path.join(this.dataDir, "results", `${jobId}.json`);
      return await fs.readJSON(resultsPath);
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async listJobs(): Promise<Job[]> {
    const jobsDir = path.join(this.dataDir, "jobs");
    const files = await fs.readdir(jobsDir);
    const jobs: Job[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const jobPath = path.join(jobsDir, file);
        const job = await fs.readJSON(jobPath);
        jobs.push(job);
      }
    }

    return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}