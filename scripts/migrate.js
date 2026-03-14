import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve better-sqlite3 from the Nuxt output directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlitePath = path.resolve(__dirname, '../.output/server/node_modules/better-sqlite3/lib/database.js');

let Database;
try {
  Database = (await import(sqlitePath)).default || (await import(sqlitePath));
} catch (e) {
  console.error('Failed to load better-sqlite3. Are you running this inside the Docker container?', e);
  process.exit(1);
}

const dbPath = process.env.DB_URL || './sqlite.db';
const db = new Database(dbPath);

console.log(`🚀 Initializing database schema at ${dbPath}...`);

try {
  // Create Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL,
      "created_at" integer NOT NULL
    );
  `);
  
  // Create Auth Codes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS "auth_codes" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "user_id" text NOT NULL,
      "code" text NOT NULL,
      "expires_at" integer NOT NULL,
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
    );
  `);
  
  // Create Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS "items" (
      "id" text PRIMARY KEY NOT NULL,
      "text" text NOT NULL,
      "is_completed" integer DEFAULT 0 NOT NULL,
      "created_by" text NOT NULL,
      "position" real NOT NULL,
      "created_at" text NOT NULL,
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS \`activities\` (
      \`id\` INTEGER PRIMARY KEY AUTOINCREMENT,
      \`user_id\` TEXT NOT NULL,
      \`action\` TEXT NOT NULL,
      \`item_name\` TEXT NOT NULL,
      \`created_at\` INTEGER NOT NULL,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE no action
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS \`comments\` (
      \`id\` INTEGER PRIMARY KEY AUTOINCREMENT,
      \`item_id\` TEXT NOT NULL,
      \`user_id\` TEXT NOT NULL,
      \`text\` TEXT NOT NULL,
      \`created_at\` INTEGER NOT NULL,
      FOREIGN KEY (\`item_id\`) REFERENCES \`items\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE no action
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS \`tags\` (
      \`id\` INTEGER PRIMARY KEY AUTOINCREMENT,
      \`name\` TEXT NOT NULL UNIQUE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS \`item_tags\` (
      \`id\` INTEGER PRIMARY KEY AUTOINCREMENT,
      \`item_id\` TEXT NOT NULL,
      \`tag_id\` INTEGER NOT NULL,
      FOREIGN KEY (\`item_id\`) REFERENCES \`items\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`tag_id\`) REFERENCES \`tags\`(\`id\`) ON UPDATE no action ON DELETE cascade
    )
  `);

  // Ensure system admin user exists for password-only logins
  db.exec(`
    INSERT OR IGNORE INTO users (id, name, email, created_at)
    VALUES ('admin', 'Administrator', 'admin@local', ${Date.now()})
  `);

  console.log('✅ Database schema initialized successfully!');
} catch (error) {
  console.error('❌ Failed to initialize database schema:', error);
  process.exit(1);
}
