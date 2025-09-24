import { eq, and } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { userSettings, users } from "../db/schema.js";

export interface UserSettings {
  userId: string;
  platform: string;
  globalCharacterPrompt?: string | null;
  characterPrompt?: string | null;
  characterImagePath?: string | null;
  characterImageName?: string | null;
  characterImageSize?: number | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export class UserSettingsService {
  constructor() {}

  private async ensureUserExists(userId: string): Promise<void> {
    try {
      // ユーザーが既に存在するか確認
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // ユーザーが存在すれば終了
      if (existingUser.length > 0) {
        return;
      }

      // ユーザーが存在しない場合はエラー
      // (ユーザーはauthミドルウェアで作成されるはずなので、ここでは作成しない)
      console.error(`User ${userId} does not exist`);
      throw new Error("User not found");
    } catch (error) {
      console.error("Failed to ensure user exists:", error);
      throw error;
    }
  }

  /**
   * ユーザーのグローバルキャラクタープロンプトを取得
   */
  async getGlobalCharacterPrompt(userId: string): Promise<string | null> {
    try {
      const result = await db
        .select({ globalCharacterPrompt: userSettings.globalCharacterPrompt })
        .from(userSettings)
        .where(
          and(
            eq(userSettings.userId, userId),
            eq(userSettings.platform, "global")
          )
        )
        .limit(1);

      return result[0]?.globalCharacterPrompt || null;
    } catch (error) {
      console.log(
        "Database error in getGlobalCharacterPrompt, returning null:",
        error
      );
      return null;
    }
  }

  /**
   * ユーザーのグローバルキャラクタープロンプトを保存
   */
  async saveGlobalCharacterPrompt(
    userId: string,
    prompt: string
  ): Promise<UserSettings> {
    try {
      // Ensure user exists
      await this.ensureUserExists(userId);

      // Upsert the settings
      const result = await db
        .insert(userSettings)
        .values({
          userId,
          platform: "global",
          globalCharacterPrompt: prompt,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userSettings.userId, userSettings.platform],
          set: {
            globalCharacterPrompt: prompt,
            updatedAt: new Date(),
          },
        })
        .returning();

      return {
        userId: result[0].userId,
        platform: result[0].platform,
        globalCharacterPrompt: result[0].globalCharacterPrompt,
        characterPrompt: result[0].characterPrompt,
        characterImagePath: result[0].characterImagePath,
        characterImageName: result[0].characterImageName,
        characterImageSize: result[0].characterImageSize,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt,
      };
    } catch (error) {
      console.log(
        "Database error in saveGlobalCharacterPrompt, returning mock object:",
        error
      );
      // データベースエラーの場合、モックオブジェクトを返す
      return {
        userId: userId,
        platform: "global",
        globalCharacterPrompt: prompt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * ユーザーのグローバルキャラクタープロンプトを削除
   */
  async deleteGlobalCharacterPrompt(userId: string): Promise<boolean> {
    try {
      const result = await db
        .update(userSettings)
        .set({
          globalCharacterPrompt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userSettings.userId, userId),
            eq(userSettings.platform, "global")
          )
        );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.log("Database error in deleteGlobalCharacterPrompt:", error);
      return false;
    }
  }

  /**
   * ユーザー設定を初期化（ユーザー登録時に使用）
   */
  async initializeUserSettings(userId: string): Promise<UserSettings> {
    try {
      const defaultPrompt = this.getDefaultGlobalCharacterPrompt();

      // Ensure user exists
      await this.ensureUserExists(userId);

      // Insert settings if they don't exist
      const result = await db
        .insert(userSettings)
        .values({
          userId,
          platform: "global",
          globalCharacterPrompt: defaultPrompt,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();

      // If no insert happened (already exists), fetch existing settings
      if (result.length === 0) {
        const existing = await db
          .select()
          .from(userSettings)
          .where(
            and(
              eq(userSettings.userId, userId),
              eq(userSettings.platform, "global")
            )
          )
          .limit(1);

        if (existing.length > 0) {
          return {
            userId: existing[0].userId,
            platform: existing[0].platform,
            globalCharacterPrompt: existing[0].globalCharacterPrompt,
            characterPrompt: existing[0].characterPrompt,
            characterImagePath: existing[0].characterImagePath,
            characterImageName: existing[0].characterImageName,
            characterImageSize: existing[0].characterImageSize,
            createdAt: existing[0].createdAt,
            updatedAt: existing[0].updatedAt,
          };
        }
      }

      // Return the newly created settings
      return {
        userId: result[0].userId,
        platform: result[0].platform,
        globalCharacterPrompt: result[0].globalCharacterPrompt,
        characterPrompt: result[0].characterPrompt,
        characterImagePath: result[0].characterImagePath,
        characterImageName: result[0].characterImageName,
        characterImageSize: result[0].characterImageSize,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt,
      };
    } catch (error) {
      console.log("Database error in initializeUserSettings:", error);
      return {
        userId: userId,
        platform: "global",
        globalCharacterPrompt: this.getDefaultGlobalCharacterPrompt(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * ユーザー設定全体を取得
   */
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const result = await db
        .select()
        .from(userSettings)
        .where(
          and(
            eq(userSettings.userId, userId),
            eq(userSettings.platform, "global")
          )
        )
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return {
        userId: result[0].userId,
        platform: result[0].platform,
        globalCharacterPrompt: result[0].globalCharacterPrompt,
        characterPrompt: result[0].characterPrompt,
        characterImagePath: result[0].characterImagePath,
        characterImageName: result[0].characterImageName,
        characterImageSize: result[0].characterImageSize,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt,
      };
    } catch (error) {
      console.log("Database error in getUserSettings:", error);
      return null;
    }
  }

  /**
   * デフォルトのグローバルキャラクタープロンプトを取得
   */
  getDefaultGlobalCharacterPrompt(): string {
    return "あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。";
  }
}
