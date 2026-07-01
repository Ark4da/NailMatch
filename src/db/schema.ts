import { pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";

export const nailDesigns = pgTable("nail_designs", {
  id: uuid("id").defaultRandom().primaryKey(),
  storagePath: text("storage_path").notNull(),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  title: text("title").notNull(),
  tone: text("tone").notNull(),
  description: text("description").notNull(),
  embedding: vector("embedding", { dimensions: 3072 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});
