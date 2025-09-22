import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class SQLiteDatabaseService {
  private db: any;
  private static instance: SQLiteDatabaseService;

  constructor() {
    const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  static getInstance(): SQLiteDatabaseService {
    if (!SQLiteDatabaseService.instance) {
      SQLiteDatabaseService.instance = new SQLiteDatabaseService();
    }
    return SQLiteDatabaseService.instance;
  }

  getDatabase(): any {
    return this.db;
  }

  async initializeSchema(): Promise<void> {
    try {
      // Create basic tables for the application
      const schemas = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // User prompts table
        `CREATE TABLE IF NOT EXISTS user_prompts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          platform TEXT NOT NULL,
          prompt TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, platform),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // User settings table
        `CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL UNIQUE,
          global_character_prompt TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // Content metadata table
        `CREATE TABLE IF NOT EXISTS content_metadata (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          source_type TEXT NOT NULL,
          source_text TEXT,
          original_file_name TEXT,
          file_size INTEGER,
          mime_type TEXT,
          duration INTEGER,
          generated_content TEXT NOT NULL,
          used_prompts TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // Preview data table
        `CREATE TABLE IF NOT EXISTS preview_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content_id TEXT NOT NULL,
          preview_type TEXT,
          duration INTEGER,
          waveform_data TEXT,
          thumbnail_base64 TEXT,
          video_width INTEGER,
          video_height INTEGER,
          transcript_preview TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (content_id) REFERENCES content_metadata(id)
        )`
      ];

      for (const schema of schemas) {
        this.db.exec(schema);
      }

      console.log('SQLite database schema initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite schema:', error);
      throw error;
    }
  }

  async transaction<T>(callback: (db: any) => T): Promise<T> {
    const transaction = this.db.transaction((db: any) => {
      return callback(db);
    });
    return transaction(this.db);
  }

  close(): void {
    this.db.close();
  }
}
