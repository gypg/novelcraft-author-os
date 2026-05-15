// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const books = sqliteTable('books', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull().default(''),
  synopsis: text('synopsis').notNull().default(''),
  cover: text('cover'),
  status: text('status', { enum: ['ongoing', 'completed', 'paused'] }).notNull().default('ongoing'),
  wordCount: integer('word_count').notNull().default(0),
  targetDailyWords: integer('target_daily_words'),
  genre: text('genre').default(''),
  tags: text('tags').default(''),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const volumes = sqliteTable('volumes', {
  id: text('id').primaryKey(),
  bookId: text('book_id').notNull().references(() => books.id),
  title: text('title').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
})

export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  bookId: text('book_id').notNull().references(() => books.id),
  volumeId: text('volume_id').references(() => volumes.id),
  title: text('title').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  content: text('content').notNull().default(''), // Tiptap JSON string
  wordCount: integer('word_count').notNull().default(0),
  status: text('status', { enum: ['draft', 'reviewed', 'final', 'ai-generated'] }).notNull().default('draft'),
  aiAuditScore: integer('ai_audit_score'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export type Book = typeof books.$inferSelect
export type NewBook = typeof books.$inferInsert
export type Volume = typeof volumes.$inferSelect
export type Chapter = typeof chapters.$inferSelect
export type NewChapter = typeof chapters.$inferInsert
