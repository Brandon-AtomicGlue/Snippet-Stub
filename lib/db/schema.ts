import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const snippets = pgTable("snippets", {
  id: uuid("id").primaryKey().defaultRandom(),
  shareCode: text("share_code").notNull().unique(),
  ownerToken: text("owner_token").notNull(),
  language: text("language").notNull(),
  code: text("code").notNull(),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  accessCount: integer("access_count").notNull().default(0),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const snippetImages = pgTable("snippet_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  snippetId: uuid("snippet_id")
    .notNull()
    .references(() => snippets.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Snippet = typeof snippets.$inferSelect;
export type NewSnippet = typeof snippets.$inferInsert;
export type SnippetImage = typeof snippetImages.$inferSelect;
export type NewSnippetImage = typeof snippetImages.$inferInsert;
