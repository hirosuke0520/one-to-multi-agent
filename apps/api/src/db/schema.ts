import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  picture: text("picture"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

// User settings table
export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 50 }).notNull(),
    globalCharacterPrompt: text("global_character_prompt"),
    characterPrompt: text("character_prompt"),
    characterImagePath: text("character_image_path"),
    characterImageName: text("character_image_name"),
    characterImageSize: integer("character_image_size"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.platform] }),
  })
);

// User prompts table
export const userPrompts = pgTable(
  "user_prompts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 50 }).notNull(),
    prompt: text("prompt").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.platform] }),
  })
);

// Content metadata table
export const contentMetadata = pgTable("content_metadata", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  originalFileName: varchar("original_file_name", { length: 255 }),
  originalFileSize: integer("original_file_size"),
  originalMimeType: varchar("original_mime_type", { length: 100 }),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  tags: jsonb("tags"),
  transcript: text("transcript"),
  duration: integer("duration"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  usedPrompts: jsonb("used_prompts"),
  generatedContent: jsonb("generated_content"),
});

// Preview data table
export const previewData = pgTable("preview_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id")
    .notNull()
    .references(() => contentMetadata.id, { onDelete: "cascade" }),
  previewType: varchar("preview_type", { length: 50 }),
  duration: integer("duration"),
  waveformData: jsonb("waveform_data"),
  thumbnailBase64: text("thumbnail_base64"),
  videoWidth: integer("video_width"),
  videoHeight: integer("video_height"),
  transcriptPreview: text("transcript_preview"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Generation history table
export const generationHistory = pgTable("generation_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  contentId: uuid("content_id").references(() => contentMetadata.id, {
    onDelete: "cascade",
  }),
  platforms: jsonb("platforms").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  prompt: text("prompt"),
  results: jsonb("results"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  settings: many(userSettings),
  prompts: many(userPrompts),
  contentMetadata: many(contentMetadata),
  generationHistory: many(generationHistory),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const userPromptsRelations = relations(userPrompts, ({ one }) => ({
  user: one(users, {
    fields: [userPrompts.userId],
    references: [users.id],
  }),
}));

export const contentMetadataRelations = relations(
  contentMetadata,
  ({ one, many }) => ({
    user: one(users, {
      fields: [contentMetadata.userId],
      references: [users.id],
    }),
    previewData: many(previewData),
    generationHistory: many(generationHistory),
  })
);

export const previewDataRelations = relations(previewData, ({ one }) => ({
  contentMetadata: one(contentMetadata, {
    fields: [previewData.contentId],
    references: [contentMetadata.id],
  }),
}));

export const generationHistoryRelations = relations(
  generationHistory,
  ({ one }) => ({
    user: one(users, {
      fields: [generationHistory.userId],
      references: [users.id],
    }),
    contentMetadata: one(contentMetadata, {
      fields: [generationHistory.contentId],
      references: [contentMetadata.id],
    }),
  })
);
