import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../database/schema';

// DB path: same default as drizzle.config.ts so app and migrations use one file
const rawPath = process.env.DB_URL || process.env.NUXT_DB_URL || 'data/sqlite.db';
const dbPath = isAbsolute(rawPath) ? rawPath : resolve(process.cwd(), rawPath);
// Only create directory for relative paths (dev); absolute paths (e.g. Docker /app/data) must exist or be mounted
if (!isAbsolute(rawPath)) {
  mkdirSync(dirname(dbPath), { recursive: true });
}
const sqlite = new Database(dbPath);

// Creates a single SQLite connection to be reused in the server
export const db = drizzle(sqlite, { schema });

// Export the raw sqlite instance for raw queries (avoids importing better-sqlite3 in API routes which breaks Nitro bundling)
export { sqlite };
