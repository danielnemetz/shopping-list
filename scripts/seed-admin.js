import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

// Use same DB path as your .env or default to local root
const dbPath = process.env.DB_URL || './sqlite.db';

const db = new Database(dbPath);

console.log(`Connecting to SQLite DB at: ${dbPath}`);

const email = process.argv[2];
const name = process.argv[3];

if (!email || !name) {
  console.error("Usage: node seed-admin.js <email> <name>");
  process.exit(1);
}

try {
  const stmt = db.prepare('INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)');
  stmt.run(randomUUID(), name, email.toLowerCase(), Date.now());
  console.log(`✅ User ${name} (${email}) created successfully!`);
  console.log('You can now use this email to log in through the app.');
} catch (error) {
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    console.log(`⚠️ User with email ${email} already exists!`);
  } else {
    console.error('Failed to create user:', error);
  }
}
