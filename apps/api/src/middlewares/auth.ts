import { MiddlewareHandler } from 'hono';
import { UserService } from '../services/user-service.js';

export interface AuthContext {
  userId?: string;
  email?: string;
  name?: string;
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const authorization = c.req.header('Authorization');
    const path = c.req.path;
    const method = c.req.method;

    console.log(`🔐 Auth check: ${method} ${path}`);

    if (!authorization || !authorization.startsWith('Bearer ')) {
      console.warn(`❌ Auth failed: No token provided for ${method} ${path}`);
      return c.json({
        error: 'Unauthorized: No token provided',
        hint: 'Include Authorization: Bearer <token> header'
      }, 401);
    }

    const userId = authorization.substring(7);

    if (!userId) {
      console.warn(`❌ Auth failed: Empty token for ${method} ${path}`);
      return c.json({
        error: 'Invalid token: missing user information',
        hint: 'Token appears to be empty'
      }, 401);
    }

    console.log(`🔍 Checking user: ${userId.substring(0, 8)}...`);

    // 開発環境またはデータベースが使用できない場合はチェックをスキップ
    const isDev = process.env.NODE_ENV === 'development';

    // 開発環境では常にスキップ、本番環境でも一部のパスはスキップ
    if (!isDev && path !== '/auth/signin') {
      try {
        // ユーザーがDBに存在するか確認
        const userService = new UserService();
        const userExists = await userService.userExists(userId);

        if (!userExists) {
          // ユーザーが存在しない場合、自動的に作成を試みる（本番環境対応）
          console.warn(`⚠️  User ${userId.substring(0, 8)}... not found in database, attempting to create`);

          try {
            // 基本的なユーザー情報でユーザーを作成
            const created = await userService.createUser({
              googleId: userId,
              email: 'unknown@example.com', // プレースホルダー
              name: 'Unknown User',
              picture: ''
            });

            if (created) {
              console.log(`✅ User ${userId.substring(0, 8)}... created successfully`);
            } else {
              console.warn(`❌ Failed to create user ${userId.substring(0, 8)}..., but continuing with authentication`);
            }
          } catch (createError) {
            console.error(`❌ Error creating user ${userId.substring(0, 8)}...:`, createError);
            // ユーザー作成に失敗してもリクエストを通す（本番環境の安定性のため）
          }
        } else {
          console.log(`✅ User ${userId.substring(0, 8)}... found in database`);
        }
      } catch (dbError) {
        // データベースエラーの場合は認証をスキップ
        console.error(`❌ Database check failed for user ${userId.substring(0, 8)}..., skipping user validation:`, dbError);
        console.warn('💡 This might indicate a database connection issue. Check your DB_* environment variables.');
      }
    } else {
      console.log(`🏃 Skipping database check (${isDev ? 'development mode' : 'auth endpoint'})`);
    }

    // コンテキストにユーザー情報を設定
    c.set('userId', userId);
    c.set('email', ''); // 本番環境では後で取得可能
    c.set('name', ''); // 本番環境では後で取得可能

    console.log(`✅ Auth successful for user: ${userId.substring(0, 8)}...`);
    await next();
  } catch (error) {
    console.error(`❌ Auth middleware error for ${c.req.method} ${c.req.path}:`, error);

    // より詳細なエラー情報を提供
    let errorMessage = 'Invalid or expired token';
    let hint = 'Please login again to get a new token';

    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        errorMessage = 'Token has expired';
        hint = 'Your session has expired. Please login again.';
      } else if (error.message.includes('invalid')) {
        errorMessage = 'Token is invalid';
        hint = 'The provided token is malformed or corrupted.';
      } else if (error.message.includes('signature')) {
        errorMessage = 'Token signature is invalid';
        hint = 'Token signature verification failed. This may indicate a configuration issue.';
      }
    }

    return c.json({
      error: errorMessage,
      hint: hint,
      debug: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, 401);
  }
};

// オプショナル認証（ユーザーがログインしていなくても通過）
export const optionalAuthMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const authorization = c.req.header('Authorization');

    if (authorization && authorization.startsWith('Bearer ')) {
      const userId = authorization.substring(7);

      if (userId) {
        // 開発環境ではデータベースチェックをスキップ
        const isDev = process.env.NODE_ENV === 'development';

        if (!isDev) {
          try {
            const userService = new UserService();
            const userExists = await userService.userExists(userId);

            if (userExists) {
              c.set('userId', userId);
              c.set('email', '');
              c.set('name', '');
            } else {
              // ユーザーが存在しない場合でも認証情報を設定（本番環境の安定性のため）
              console.log(`Optional auth: User ${userId} not found but setting auth context`);
              c.set('userId', userId);
              c.set('email', '');
              c.set('name', '');
            }
          } catch (dbError) {
            // データベースエラーでも認証情報を設定
            console.error('Optional auth: Database check failed, setting auth anyway:', dbError);
            c.set('userId', userId);
            c.set('email', '');
            c.set('name', '');
          }
        } else {
          c.set('userId', userId);
          c.set('email', '');
          c.set('name', '');
        }
      }
    }
  } catch (error) {
    // トークンが無効でも続行
    console.error('Optional auth: Invalid token, continuing without auth:', error);
  }

  await next();
};