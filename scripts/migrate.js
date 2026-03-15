import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Same env vars as server/utils/db.ts so migrations run against the same DB the app uses
const dbPath = process.env.DB_URL || process.env.NUXT_DB_URL || './sqlite.db';
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

const migrationsPath = path.resolve(__dirname, '../server/database/migrations');
console.log(`📂 Migrations folder: ${migrationsPath} (Exists: ${fs.existsSync(migrationsPath)})`);
console.log(`🚀 Running migrations at ${dbPath}...`);

// --- Step 1: Run Drizzle migrations ---
try {
  await migrate(db, { migrationsFolder: migrationsPath });
  console.log('✅ Drizzle migrations completed successfully!');
} catch (error) {
  const isAlreadyExists = error?.cause?.message?.includes('already exists') ||
                           error?.message?.includes('already exists');
  if (isAlreadyExists) {
    console.log('⚠️  Tables already exist — DB was set up before Drizzle. Continuing with manual migrations...');
  } else {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// --- Step 2: Ensure indexes exist (idempotent, safe to re-run) ---
const indexes = [
  { name: 'idx_items_completed',          sql: 'CREATE INDEX IF NOT EXISTS `idx_items_completed` ON `items` (`is_completed`)' },
  { name: 'idx_items_position',           sql: 'CREATE INDEX IF NOT EXISTS `idx_items_position` ON `items` (`position`)' },
  { name: 'idx_items_completed_position', sql: 'CREATE INDEX IF NOT EXISTS `idx_items_completed_position` ON `items` (`is_completed`, `position`)' },
  { name: 'idx_activities_created_at',    sql: 'CREATE INDEX IF NOT EXISTS `idx_activities_created_at` ON `activities` (`created_at`)' },
  { name: 'idx_comments_item_id',         sql: 'CREATE INDEX IF NOT EXISTS `idx_comments_item_id` ON `comments` (`item_id`)' },
  { name: 'idx_comments_item_created',    sql: 'CREATE INDEX IF NOT EXISTS `idx_comments_item_created` ON `comments` (`item_id`, `created_at`)' },
  { name: 'idx_item_tags_item_id',        sql: 'CREATE INDEX IF NOT EXISTS `idx_item_tags_item_id` ON `item_tags` (`item_id`)' },
  { name: 'idx_item_tags_tag_id',         sql: 'CREATE INDEX IF NOT EXISTS `idx_item_tags_tag_id` ON `item_tags` (`tag_id`)' },
];

console.log('🔧 Ensuring performance indexes...');
for (const idx of indexes) {
  try {
    sqlite.prepare(idx.sql).run();
    console.log(`   ✅ ${idx.name}`);
  } catch (err) {
    console.warn(`   ⚠️  ${idx.name}: ${err.message}`);
  }
}

// --- Step 3: Migrate comment_reactions into reactions (if old table exists) ---
const tableList = sqlite.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='comment_reactions'"
).all();
if (tableList.length > 0) {
  try {
    sqlite.prepare(`
      INSERT OR IGNORE INTO reactions (entity_type, entity_id, user_id, emoji)
      SELECT 'comment', CAST(comment_id AS TEXT), user_id, emoji FROM comment_reactions
    `).run();
    sqlite.prepare('DROP TABLE comment_reactions').run();
    console.log('   ✅ Migrated comment_reactions → reactions');
  } catch (err) {
    console.warn('   ⚠️  comment_reactions migration:', err.message);
  }
}

// --- Step 4: Ensure system admin user exists ---
sqlite.prepare(`
  INSERT OR IGNORE INTO users (id, name, email, created_at)
  VALUES (?, ?, ?, ?)
`).run('admin', 'Administrator', 'admin@local', Math.floor(Date.now() / 1000));

console.log('✅ All migrations and checks completed.');
