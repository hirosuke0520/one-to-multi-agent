import { Hono } from "hono";
import { cors } from "hono/cors";
import { UserService } from "../services/user-service.js";

const auth = new Hono();

// CORS設定
auth.use('/*', cors({
  origin: [
    'http://localhost:3000',
    'https://web-one-to-multi-agent-675967400701.asia-northeast1.run.app'
  ],
  credentials: true
}));

const userService = new UserService();

/**
 * Google認証コールバック
 * NextAuth.jsから呼び出される
 */
auth.post("/signin", async (c) => {
  try {
    const body = await c.req.json();
    const { googleId, email, name, picture } = body;

    if (!googleId || !email) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // ユーザーを作成または更新
    const user = await userService.findOrCreateByGoogle({
      googleId,
      email,
      name,
      picture
    });

    return c.json({
      success: true,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });
  } catch (error) {
    console.error("Error in Google auth:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * ユーザー情報取得
 */
auth.get("/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    
    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const user = await userService.findById(userId);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * ユーザー削除（アカウント削除）
 */
auth.delete("/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    
    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const deleted = await userService.delete(userId);
    
    if (!deleted) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default auth;
