const { sql } = require('drizzle-orm');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

// Get database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lastminutelive';
const client = postgres(connectionString, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

const db = drizzle(client);

async function runGuestSessionsMigration() {
  try {
    console.log('🚀 Running guest sessions migration...');
    
    // Create guest_sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS guest_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_token TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        device_info JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        converted_at TIMESTAMP WITH TIME ZONE,
        converted_user_id UUID REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_guest_sessions_token ON guest_sessions(session_token);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_guest_sessions_email ON guest_sessions(email);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires ON guest_sessions(expires_at);`);

    console.log('✅ Guest sessions table created successfully!');
    
    // Verify table exists
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'guest_sessions';
    `);
    
    if (result.length > 0) {
      console.log('✅ Verified: guest_sessions table exists');
    } else {
      console.log('❌ Error: guest_sessions table not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

runGuestSessionsMigration(); 