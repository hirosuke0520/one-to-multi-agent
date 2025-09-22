import { Pool, PoolClient } from 'pg';
import { SQLiteDatabaseService } from './sqlite-database-service.js';

export class DatabaseService {
  private pool: Pool | null = null;
  private sqliteService: SQLiteDatabaseService | null = null;
  private isConnected = false;
  private usePostgreSQL = false;

  constructor() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const useSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';

    if (useSQLite || (!isDevelopment && !process.env.DB_HOST)) {
      // Use SQLite for local development or when PostgreSQL is not available
      console.log('Using SQLite database');
      this.sqliteService = SQLiteDatabaseService.getInstance();
      this.usePostgreSQL = false;
    } else if (isDevelopment) {
      // Local development with Docker PostgreSQL
      console.log('Attempting to use PostgreSQL database');
      this.usePostgreSQL = true;
      this.pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'one_to_multi_agent',
        password: process.env.DB_PASSWORD || 'password',
        port: parseInt(process.env.DB_PORT || '5432'),
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    } else {
      // Cloud SQL connection via Unix domain socket (Cloud SQL Proxy)
      console.log('Using Cloud SQL PostgreSQL');
      this.usePostgreSQL = true;
      this.pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        database: process.env.DB_NAME || 'one_to_multi_agent',
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        ssl: false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }

    if (this.pool) {
      this.pool.on('error', (err) => {
        console.error('PostgreSQL pool error:', err);
      });
    }
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      if (this.usePostgreSQL && this.pool) {
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('Connected to PostgreSQL database');
      } else if (this.sqliteService) {
        await this.sqliteService.initializeSchema();
        console.log('Connected to SQLite database');
      }
      this.isConnected = true;
    } catch (error) {
      if (this.usePostgreSQL) {
        console.error('Failed to connect to PostgreSQL, falling back to SQLite:', error);
        // Fallback to SQLite
        this.usePostgreSQL = false;
        this.sqliteService = SQLiteDatabaseService.getInstance();
        await this.sqliteService.initializeSchema();
        this.isConnected = true;
        console.log('Fallback: Connected to SQLite database');
      } else {
        console.error('Failed to connect to database:', error);
        throw error;
      }
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (this.usePostgreSQL && this.pool) {
        const result = await this.pool.query(text, params);
        return result;
      } else if (this.sqliteService) {
        const db = this.sqliteService.getDatabase();
        // Convert PostgreSQL query to SQLite compatible format
        const sqliteQuery = this.convertToSQLiteQuery(text, params);
        const stmt = db.prepare(sqliteQuery.sql);

        if (text.trim().toLowerCase().startsWith('select')) {
          const rows = stmt.all(...(sqliteQuery.params || []));
          return { rows, rowCount: rows.length };
        } else {
          const result = stmt.run(...(sqliteQuery.params || []));
          return {
            rows: [],
            rowCount: result.changes,
            insertId: result.lastInsertRowid
          };
        }
      }

      throw new Error('No database connection available');
    } catch (error) {
      console.error('Database query error:', error);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  }

  private convertToSQLiteQuery(text: string, params?: any[]): { sql: string; params?: any[] } {
    // Convert PostgreSQL $1, $2, ... to SQLite ? placeholders
    let sql = text;
    let convertedParams = params;

    if (params && params.length > 0) {
      for (let i = params.length; i >= 1; i--) {
        sql = sql.replace(new RegExp(`\\$${i}`, 'g'), '?');
      }
    }

    // Convert RETURNING clause for SQLite
    sql = sql.replace(/RETURNING\s+\*/gi, '');

    return { sql, params: convertedParams };
  }

  async getClient(): Promise<PoolClient> {
    if (!this.isConnected) {
      await this.connect();
    }
    if (!this.pool) {
      throw new Error('PostgreSQL pool is not initialized');
    }
    return this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient | any) => Promise<T> | T): Promise<T> {
    if (this.usePostgreSQL && this.pool) {
      const client = await this.getClient();

      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else if (this.sqliteService) {
      return this.sqliteService.transaction((client: any) => {
        const result = callback(client);
        if (result && typeof (result as Promise<T>).then === 'function') {
          throw new Error('Asynchronous callbacks are not supported in SQLite transactions');
        }
        return result as T;
      });
    }

    throw new Error('No database connection available');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('Disconnected from PostgreSQL database');
    }
  }

  // Database health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Initialize database tables
  async initializeTables(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      // Try different possible paths for the SQL file
      const possiblePaths = [
        path.resolve(process.cwd(), '../../infra/sql/create-metadata-tables.sql'),
        path.resolve(process.cwd(), '../infra/sql/create-metadata-tables.sql'),
        path.resolve(process.cwd(), './infra/sql/create-metadata-tables.sql'),
        '/app/infra/sql/create-metadata-tables.sql'
      ];
      
      let sql = '';
      let foundPath = '';
      
      for (const sqlPath of possiblePaths) {
        try {
          sql = await fs.readFile(sqlPath, 'utf-8');
          foundPath = sqlPath;
          break;
        } catch (error) {
          continue;
        }
      }
      
      if (!sql) {
        console.log('SQL file not found, tables may already be initialized by Docker');
        return;
      }
      
      // Execute SQL
      await this.query(sql);
      console.log(`Database tables initialized successfully from: ${foundPath}`);
    } catch (error) {
      console.error('Failed to initialize database tables:', error);
      // Don't throw error - tables might already exist or be initialized by Docker
    }
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
