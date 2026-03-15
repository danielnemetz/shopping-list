import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
}, (table) => [
  index('idx_items_completed').on(table.isCompleted),
  index('idx_items_position').on(table.position),
  index('idx_items_completed_position').on(table.isCompleted, table.position),
]);

export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  itemName: text('item_name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  index('idx_activities_created_at').on(table.createdAt),
]);

export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: text('item_id').notNull().references(() => items.id),
  userId: text('user_id').notNull().references(() => users.id),
  text: text('text').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  index('idx_comments_item_id').on(table.itemId),
  index('idx_comments_item_created').on(table.itemId, table.createdAt),
]);

/** Polymorphic reactions: comments and items (entity_type + entity_id) */
export const reactions = sqliteTable('reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(), // 'comment' | 'item'
  entityId: text('entity_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  emoji: text('emoji').notNull(),
}, (table) => [
  index('idx_reactions_entity').on(table.entityType, table.entityId),
  uniqueIndex('reactions_entity_user_emoji').on(table.entityType, table.entityId, table.userId, table.emoji),
]);

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const itemTags = sqliteTable('item_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: text('item_id').notNull().references(() => items.id),
  tagId: integer('tag_id').notNull().references(() => tags.id),
});
