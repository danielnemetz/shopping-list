import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../database/schema';

// Use environment variable DB_URL if set, otherwise fallback to local file
const dbPath = process.env.DB_URL || './sqlite.db';
const sqlite = new Database(dbPath);

// Creates a single SQLite connection to be reused in the server
export const db = drizzle(sqlite, { schema });

// Export the raw sqlite instance for raw queries (avoids importing better-sqlite3 in API routes which breaks Nitro bundling)
export { sqlite };
