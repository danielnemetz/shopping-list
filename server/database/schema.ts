import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const authCodes = sqliteTable('auth_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id),
  code: text('code').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by').notNull().references(() => users.id),
  position: real('position').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  itemName: text('item_name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: text('item_id').notNull().references(() => items.id),
  userId: text('user_id').notNull().references(() => users.id),
  text: text('text').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const itemTags = sqliteTable('item_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: text('item_id').notNull().references(() => items.id),
  tagId: integer('tag_id').notNull().references(() => tags.id),
});
