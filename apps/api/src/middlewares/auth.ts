import { MiddlewareHandler } from "hono";
import { UserService } from "../services/user-service.js";

export interface AuthContext {
  userId?: string;
  googleId?: string;
  email?: string;
  name?: string;
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const authorization = c.req.header("Authorization");
    const path = c.req.path;
    const method = c.req.method;

    console.log(`🔐 Auth check: ${method} ${path}`);

    if (!authorization || !authorization.startsWith("Bearer ")) {
      console.warn(`❌ Auth failed: No token provided for ${method} ${path}`);
      return c.json(
        {
          error: "Unauthorized: No token provided",
          hint: "Include Authorization: Bearer <token> header",
        },
        401
      );
    }

    const googleId = authorization.substring(7);

    if (!googleId) {
      console.warn(`❌ Auth failed: Empty token for ${method} ${path}`);
      return c.json(
        {
          error: "Invalid token: missing user information",
          hint: "Token appears to be empty",
        },
        401
      );
    }

    console.log(
      `🔍 Checking user with Google ID: ${googleId.substring(0, 8)}...`
    );

    // Google IDからUUID形式のユーザーIDを取得
    const userService = new UserService();
    let actualUserId: string;

    try {
      // まずGoogle IDでユーザーを検索
      const user = await userService.findByGoogleId(googleId);

      if (!user) {
        // ユーザーが存在しない場合、自動的に作成
        console.warn(
          `⚠️  User with Google ID ${googleId.substring(
            0,
            8
          )}... not found, creating new user`
        );

        const newUser = await userService.findOrCreateByGoogle({
          googleId: googleId,
          email: `user_${googleId}@temp.com`, // 仮のメールアドレス
          name: "User",
          picture: "",
        });

        actualUserId = newUser.id;
        console.log(`✅ New user created with ID: ${actualUserId}`);
      } else {
        actualUserId = user.id;
        console.log(`✅ User found with ID: ${actualUserId}`);
      }
    } catch (dbError) {
      console.error(
        `❌ Database error for Google ID ${googleId.substring(0, 8)}...:`,
        dbError
      );
      // エラーの場合は続行できない
      return c.json(
        {
          error: "Database error",
          hint: "Unable to verify user identity",
        },
        500
      );
    }

    // コンテキストにユーザー情報を設定（UUIDを使用）
    c.set("userId", actualUserId);
    c.set("googleId", googleId);
    c.set("email", ""); // 本番環境では後で取得可能
    c.set("name", ""); // 本番環境では後で取得可能

    console.log(
      `✅ Auth successful for user: ${googleId.substring(
        0,
        8
      )}... (UUID: ${actualUserId})`
    );
    await next();
  } catch (error) {
    console.error(
      `❌ Auth middleware error for ${c.req.method} ${c.req.path}:`,
      error
    );

    // より詳細なエラー情報を提供
    let errorMessage = "Invalid or expired token";
    let hint = "Please login again to get a new token";

    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        errorMessage = "Token has expired";
        hint = "Your session has expired. Please login again.";
      } else if (error.message.includes("invalid")) {
        errorMessage = "Token is invalid";
        hint = "The provided token is malformed or corrupted.";
      } else if (error.message.includes("signature")) {
        errorMessage = "Token signature is invalid";
        hint =
          "Token signature verification failed. This may indicate a configuration issue.";
      }
    }

    return c.json(
      {
        error: errorMessage,
        hint: hint,
        debug:
          process.env.NODE_ENV === "development"
            ? (error as Error)?.message
            : undefined,
      },
      401
    );
  }
};

// オプショナル認証（ユーザーがログインしていなくても通過）
export const optionalAuthMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const authorization = c.req.header("Authorization");

    if (authorization && authorization.startsWith("Bearer ")) {
      const googleId = authorization.substring(7);

      if (googleId) {
        try {
          const userService = new UserService();
          const user = await userService.findByGoogleId(googleId);

          if (user) {
            c.set("userId", user.id);
            c.set("googleId", googleId);
            c.set("email", user.email || "");
            c.set("name", user.name || "");
          } else {
            // オプショナル認証では新規ユーザー作成はしない
            console.log(
              `Optional auth: User with Google ID ${googleId} not found`
            );
          }
        } catch (dbError) {
          // データベースエラーの場合はスキップ
          console.error("Optional auth: Database check failed:", dbError);
        }
      }
    }
  } catch (error) {
    // トークンが無効でも続行
    console.error(
      "Optional auth: Invalid token, continuing without auth:",
      error
    );
  }

  await next();
};
