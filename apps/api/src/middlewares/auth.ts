import { MiddlewareHandler } from 'hono';
import { verify } from 'hono/jwt';
import { UserService } from '../services/user-service.js';

const AUTH_SECRET = process.env.AUTH_SECRET || 'your-secret-key';

export interface AuthContext {
  userId?: string;
  email?: string;
  name?: string;
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const authorization = c.req.header('Authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized: No token provided' }, 401);
    }

    const token = authorization.substring(7);
    
    // NextAuthのJWTを検証
    const payload = await verify(token, AUTH_SECRET);
    
    const userId = payload.id as string;
    const email = payload.email as string;
    
    if (!userId || !email) {
      return c.json({ error: 'Invalid token: missing user information' }, 401);
    }
    
    // 最初のユーザー登録リクエスト（/auth/signin）は除く
    const path = c.req.path;
    if (path !== '/auth/signin') {
      // ユーザーがDBに存在するか確認
      const userService = new UserService();
      const userExists = await userService.userExists(userId);
      
      if (!userExists) {
        return c.json({ error: 'User not found in database' }, 403);
      }
    }
    
    // コンテキストにユーザー情報を設定
    c.set('userId', userId);
    c.set('email', email);
    c.set('name', payload.name as string || '');
    
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

// オプショナル認証（ユーザーがログインしていなくても通過）
export const optionalAuthMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const authorization = c.req.header('Authorization');
    
    if (authorization && authorization.startsWith('Bearer ')) {
      const token = authorization.substring(7);
      const payload = await verify(token, AUTH_SECRET);
      
      const userId = payload.id as string;
      const email = payload.email as string;
      
      if (userId && email) {
        const userService = new UserService();
        const userExists = await userService.userExists(userId);
        
        if (userExists) {
          c.set('userId', userId);
          c.set('email', email);
          c.set('name', payload.name as string || '');
        }
      }
    }
  } catch (error) {
    // トークンが無効でも続行
    console.log('Optional auth: Invalid token, continuing without auth');
  }
  
  await next();
};