import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './server/database/migrations',
  schema: './server/database/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.NUXT_DB_URL || process.env.DB_URL || 'data/sqlite.db',
  },
});
