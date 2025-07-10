import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Database connection configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lastminutelive';

// Create postgres client with connection pooling
const client = postgres(connectionString, {
  max: 5,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  debug: process.env.NODE_ENV === 'development' ? false : false,
});

// Create Drizzle instance
export const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
});

// Log connection configuration (without exposing credentials)
console.log('🗄️  Database connection configured:');
console.log(`   URL: ${connectionString.replace(/:[^:]*@/, ':***@')}`);
console.log(`   Pool size: 5`);
console.log(`   SSL: ${process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled'}`);
console.log(`   Debug SQL: ${process.env.NODE_ENV === 'development' ? 'false' : 'false'}`);

export default db; 