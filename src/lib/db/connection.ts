import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Database connection configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lastminutelive';

// Check if we're in a build environment
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL;

let db: any;

if (isBuildTime) {
  // During build time, create a completely mocked database client
  console.log('🔧 Build time detected - using dummy database client');
  
  // Create a mock drizzle instance that returns empty results for all operations
  db = {
    // Mock all the common drizzle operations
    select: () => ({ from: () => Promise.resolve([]) }),
    insert: () => ({ values: () => Promise.resolve([]) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve([]) }) }),
    delete: () => ({ where: () => Promise.resolve([]) }),
    // Add any other drizzle methods you use
  };
} else {
  // Normal runtime client with connection pooling
  const client = postgres(connectionString, {
    max: 5,
    ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
    debug: process.env.NODE_ENV === 'development' ? false : false,
  });

  // Create Drizzle instance
  db = drizzle(client, { 
    schema,
    logger: process.env.NODE_ENV === 'development'
  });

  // Log connection configuration (without exposing credentials)
  console.log('🗄️  Database connection configured:');
  console.log(`   URL: ${connectionString.replace(/:[^:]*@/, ':***@')}`);
  console.log(`   Pool size: 5`);
  console.log(`   SSL: ${process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled'}`);
  console.log(`   Debug SQL: ${process.env.NODE_ENV === 'development' ? 'false' : 'false'}`);
}

export { db };
export default db; 