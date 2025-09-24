import { randomUUID } from 'crypto';
import { databaseService } from './database-service.js';

export interface User {
  id: string;
  google_id: string | null;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  last_login_at: Date | string | null;
}

export class UserService {
  /**
   * Google認証でユーザーを作成または更新
   */
  async findOrCreateByGoogle(googleUser: {
    googleId: string;
    email: string;
    name?: string;
    picture?: string;
  }): Promise<User> {
    const existing = await databaseService.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [googleUser.googleId, googleUser.email]
    );

    const userRow = existing.rows[0];

    if (userRow) {
      await databaseService.query(
        `UPDATE users 
         SET name = COALESCE($1, name),
             picture = COALESCE($2, picture),
             last_login_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [googleUser.name ?? null, googleUser.picture ?? null, userRow.id]
      );

      const updated = await databaseService.query(
        'SELECT * FROM users WHERE id = $1',
        [userRow.id]
      );

      return this.mapRowToUser(updated.rows[0]);
    }

    const userId = randomUUID();

    await databaseService.query(
      `INSERT INTO users (id, google_id, email, name, picture, last_login_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        userId,
        googleUser.googleId,
        googleUser.email,
        googleUser.name ?? null,
        googleUser.picture ?? null,
      ]
    );

    const created = await databaseService.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    return this.mapRowToUser(created.rows[0]);
  }

  /**
   * ユーザーIDでユーザーを取得
   */
  async findById(userId: string): Promise<User | null> {
    const result = await databaseService.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  /**
   * メールアドレスでユーザーを取得
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await databaseService.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  /**
   * Google IDでユーザーを取得
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await databaseService.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  /**
   * ユーザー情報を更新
   */
  async update(userId: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    values.push(userId);
    
    if (fields.length === 0) {
      const existing = await this.findById(userId);
      if (!existing) {
        throw new Error('User not found');
      }
      return existing;
    }

    await databaseService.query(
      `UPDATE users 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}`,
      values
    );

    const updated = await this.findById(userId);
    if (!updated) {
      throw new Error('User not found after update');
    }

    return updated;
  }

  /**
   * ユーザーを削除
   */
  async delete(userId: string): Promise<boolean> {
    const result = await databaseService.query(
      'DELETE FROM users WHERE id = $1',
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * ユーザーが存在するか確認（Google IDまたはユーザーIDで）
   */
  async userExists(userId: string): Promise<boolean> {
    const result = await databaseService.query(
      'SELECT 1 FROM users WHERE id = $1 OR google_id = $1',
      [userId]
    );
    return result.rows.length > 0;
  }

  /**
   * ユーザーを作成（認証ミドルウェア用）
   */
  async createUser(userData: {
    googleId: string;
    email: string;
    name?: string;
    picture?: string;
  }): Promise<boolean> {
    try {
      const existingUser = await databaseService.query(
        'SELECT 1 FROM users WHERE google_id = $1 OR email = $2',
        [userData.googleId, userData.email]
      );

      if (existingUser.rows.length > 0) {
        return true;
      }

      await databaseService.query(
        `INSERT INTO users (id, google_id, email, name, picture, last_login_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          randomUUID(),
          userData.googleId,
          userData.email,
          userData.name || 'Unknown User',
          userData.picture || '',
        ]
      );

      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      return false;
    }
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      google_id: row.google_id ?? null,
      email: row.email,
      name: row.name ?? null,
      picture: row.picture ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
      last_login_at: row.last_login_at ?? null,
    };
  }
}
