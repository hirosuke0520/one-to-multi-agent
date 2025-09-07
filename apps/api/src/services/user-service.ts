import { Pool } from 'pg';

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

export class UserService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Google認証でユーザーを作成または更新
   */
  async findOrCreateByGoogle(googleUser: {
    googleId: string;
    email: string;
    name?: string;
    picture?: string;
  }): Promise<User> {
    const client = await this.pool.connect();
    try {
      // 既存ユーザーの検索
      const findResult = await client.query(
        'SELECT * FROM users WHERE google_id = $1 OR email = $2',
        [googleUser.googleId, googleUser.email]
      );

      if (findResult.rows.length > 0) {
        // 既存ユーザーの更新
        const updateResult = await client.query(
          `UPDATE users 
           SET name = COALESCE($1, name),
               picture = COALESCE($2, picture),
               last_login_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE google_id = $3
           RETURNING *`,
          [googleUser.name, googleUser.picture, googleUser.googleId]
        );
        return updateResult.rows[0];
      } else {
        // 新規ユーザーの作成
        const insertResult = await client.query(
          `INSERT INTO users (google_id, email, name, picture, last_login_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
           RETURNING *`,
          [googleUser.googleId, googleUser.email, googleUser.name, googleUser.picture]
        );
        return insertResult.rows[0];
      }
    } finally {
      client.release();
    }
  }

  /**
   * ユーザーIDでユーザーを取得
   */
  async findById(userId: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * メールアドレスでユーザーを取得
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Google IDでユーザーを取得
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    return result.rows[0] || null;
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
    
    const result = await this.pool.query(
      `UPDATE users 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    
    return result.rows[0];
  }

  /**
   * ユーザーを削除
   */
  async delete(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM users WHERE id = $1',
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}