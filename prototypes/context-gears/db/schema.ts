import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const contextEntries = sqliteTable("context_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }), blockId: text("block_id").notNull(), kind: text("kind").notNull(), status: text("status").notNull(), category: text("category").notNull(), body: text("body").notNull(), createdAt: text("created_at").notNull(),
});
