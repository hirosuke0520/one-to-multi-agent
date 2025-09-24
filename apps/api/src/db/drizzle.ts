import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const isDevelopment = process.env.NODE_ENV !== "production";

// Create PostgreSQL connection pool
const pool = new Pool(
  isDevelopment
    ? {
        user: process.env.DB_USER || "postgres",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "one_to_multi_agent",
        password: process.env.DB_PASSWORD || "password",
        port: parseInt(process.env.DB_PORT || "5432"),
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    : {
        user: process.env.DB_USER || "postgres",
        database: process.env.DB_NAME || "one_to_multi_agent",
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err);
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

// Export schema for use in other files
export { schema };

// Export pool for backward compatibility if needed
export { pool };
