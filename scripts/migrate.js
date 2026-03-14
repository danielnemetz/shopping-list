import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve dependencies from the Nuxt output directory if we're in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In production (Docker), we need to find better-sqlite3 and drizzle-orm in the .output directory
const isProduction = fs.existsSync(path.resolve(__dirname, '../.output'));
const baseDir = isProduction ? path.resolve(__dirname, '../.output/server/node_modules') : path.resolve(__dirname, '../node_modules');

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function loadLibrary(name) {
  try {
    // Try standard import first
    return await import(name);
  } catch (e) {
    // Fallback for production/Docker: use require with explicit path
    if (fs.existsSync(path.resolve(__dirname, '../.output'))) {
      const prodRequire = createRequire(path.resolve(__dirname, '../.output/server/index.mjs'));
      try {
        const lib = prodRequire(name);
        return lib.default ? lib : { default: lib, ...lib };
      } catch (e2) {
        // Continue to error if all fail
      }
    }
    console.error(`Failed to load library: ${name}`);
    throw e;
  }
}

const { default: Database } = await loadLibrary('better-sqlite3');
const { drizzle } = await loadLibrary('drizzle-orm/better-sqlite3');
const { migrate } = await loadLibrary('drizzle-orm/better-sqlite3/migrator');

const dbPath = process.env.DB_URL || './sqlite.db';
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

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
