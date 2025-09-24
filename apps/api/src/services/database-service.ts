import { Pool, PoolClient } from "pg";

export class DatabaseService {
  private pool: Pool;
  private isConnected = false;

  constructor() {
    const isDevelopment = process.env.NODE_ENV !== "production";

    if (isDevelopment) {
      // Local development with Docker PostgreSQL
      console.log("Using PostgreSQL database (development)");
      this.pool = new Pool({
        user: process.env.DB_USER || "postgres",
        host: process.env.DB_HOST || "localhost", // Use localhost for development
        database: process.env.DB_NAME || "one_to_multi_agent",
        password: process.env.DB_PASSWORD || "password",
        port: parseInt(process.env.DB_PORT || "5432"),
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    } else {
      // Cloud SQL connection via Unix domain socket (Cloud SQL Proxy)
      console.log("Using Cloud SQL PostgreSQL");
      this.pool = new Pool({
        user: process.env.DB_USER || "postgres",
        database: process.env.DB_NAME || "one_to_multi_agent",
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        ssl: false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }

    this.pool.on("error", (err) => {
      console.error("PostgreSQL pool error:", err);
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      const client = await this.pool.connect();
      await client.query("SELECT NOW()");
      client.release();
      console.log("Connected to PostgreSQL database");
      this.isConnected = true;
    } catch (error) {
      console.error("Failed to connect to PostgreSQL:", error);
      throw error;
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error("Database query error:", error);
      console.error("Query:", text);
      console.error("Params:", params);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.isConnected) {
      await this.connect();
    }
    if (!this.pool) {
      throw new Error("PostgreSQL pool is not initialized");
    }
    return this.pool.connect();
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    console.log("Disconnected from PostgreSQL database");
  }

  // Database health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query("SELECT 1 as health");
      return result.rows.length > 0;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }

  // Initialize database tables
  async initializeTables(): Promise<void> {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const { fileURLToPath } = await import("url");

      // Try different possible paths for the SQL file
      const possiblePaths = [
        path.resolve(
          process.cwd(),
          "../../infra/sql/create-metadata-tables.sql"
        ),
        path.resolve(process.cwd(), "../infra/sql/create-metadata-tables.sql"),
        path.resolve(process.cwd(), "./infra/sql/create-metadata-tables.sql"),
        "/app/infra/sql/create-metadata-tables.sql",
      ];

      let sql = "";
      let foundPath = "";

      for (const sqlPath of possiblePaths) {
        try {
          sql = await fs.readFile(sqlPath, "utf-8");
          foundPath = sqlPath;
          break;
        } catch (error) {
          continue;
        }
      }

      if (!sql) {
        console.log(
          "SQL file not found, tables may already be initialized by Docker"
        );
        return;
      }

      // Execute SQL
      await this.query(sql);
      console.log(
        `Database tables initialized successfully from: ${foundPath}`
      );
    } catch (error) {
      console.error("Failed to initialize database tables:", error);
      // Don't throw error - tables might already exist or be initialized by Docker
    }
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
