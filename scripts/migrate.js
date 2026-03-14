import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

// Ensure we have __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_URL || './sqlite.db';
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

const migrationsPath = path.resolve(__dirname, '../server/database/migrations');
console.log(`📂 Migrations folder: ${migrationsPath} (Exists: ${fs.existsSync(migrationsPath)})`);

// Check if the DB was previously created without Drizzle's migration tracking.
// If the 'users' table exists but '__drizzle_migrations' does not, the DB was
// created manually. We pre-seed the tracking table so Drizzle skips those migrations.
const hasMigrationsTable = sqlite.prepare(
  `SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'`
).get();
const hasUsersTable = sqlite.prepare(
  `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`
).get();

if (!hasMigrationsTable && hasUsersTable) {
  console.log('⚠️  DB was created manually (no Drizzle history). Pre-seeding migration history...');
  sqlite.exec(`CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL,
    created_at NUMERIC
  )`);

  // Read journal to know which migrations to mark as done
  const journalPath = path.resolve(migrationsPath, 'meta/_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
  const insertMigration = sqlite.prepare(
    `INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`
  );
  const { createHash } = await import('crypto');
  for (const entry of journal.entries) {
    const sqlPath = path.resolve(migrationsPath, `${entry.tag}.sql`);
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    const hash = createHash('sha256').update(sqlContent).digest('hex');
    insertMigration.run(hash, entry.when);
    console.log(`  ✅ Marked migration as done: ${entry.tag}`);
  }
  console.log('✅ Migration history pre-seeded successfully.');
}

console.log(`🚀 Running migrations at ${dbPath}...`);

try {
  // Run migrations (Drizzle will skip already-tracked ones)
  await migrate(db, {
    migrationsFolder: migrationsPath
  });
  
  console.log('✅ Migrations completed successfully!');

  // Ensure system admin user exists
  sqlite.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, created_at)
    VALUES (?, ?, ?, ?)
  `).run('admin', 'Administrator', 'admin@local', Math.floor(Date.now() / 1000));

  console.log('✅ System admin check completed.');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
