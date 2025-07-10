import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  dbCredentials: {
    url: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
}); 