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

console.log(`🚀 Running migrations at ${dbPath}...`);

try {
  // Run migrations
  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, '../server/database/migrations')
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
