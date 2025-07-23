import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('🔍 Database Debug: Checking tables and auth setup...');
    
    // Check all tables
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = tableCheck.map(row => row.table_name);
    console.log('📋 Available tables:', tables);
    
    // Check if auth tables exist
    const authTables = ['users', 'accounts', 'sessions', 'verification_tokens'];
    const authTablesStatus = {};
    
    for (const table of authTables) {
      try {
        const result = await db.execute(sql`
          SELECT COUNT(*) as count 
          FROM ${sql.identifier(table)} 
          LIMIT 1
        `);
        authTablesStatus[table] = {
          exists: true,
          count: result[0]?.count || 0
        };
      } catch (error) {
        authTablesStatus[table] = {
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    // Check sample user data
    let sampleUsers = null;
    try {
      const userResult = await db.execute(sql`
        SELECT id, name, email, email_verified, role, created_at
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      sampleUsers = userResult;
    } catch (error) {
      console.error('Failed to fetch sample users:', error);
    }
    
    // Check environment variables
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      MAILJET_API_KEY: !!process.env.MAILJET_API_KEY,
      MAILJET_SECRET_KEY: !!process.env.MAILJET_SECRET_KEY,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NODE_ENV: process.env.NODE_ENV
    };
    
    return NextResponse.json({
      success: true,
      tables,
      authTablesStatus,
      sampleUsers,
      envCheck,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database debug failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check for bulk insert mappings request
    if (body.action === 'bulk-insert-mappings' && Array.isArray(body.mappings)) {
      console.log(`🎭 Bulk inserting ${body.mappings.length} hardcoded seat mappings...`);
      
      const { hardcodedSeatMappings } = await import('@/lib/db/schema');
      
      try {
        // Insert mappings in chunks to avoid query size limits
        const chunkSize = 100;
        let inserted = 0;
        
        for (let i = 0; i < body.mappings.length; i += chunkSize) {
          const chunk = body.mappings.slice(i, i + chunkSize);
          
          const mappingData = chunk.map(mapping => ({
            showId: mapping.showId,
            hardcodedSeatId: mapping.hardcodedSeatId,
            realSeatId: mapping.realSeatId
          }));
          
          await db.insert(hardcodedSeatMappings).values(mappingData);
          inserted += chunk.length;
          
          console.log(`   ✅ Inserted ${inserted}/${body.mappings.length} mappings`);
        }
        
        return NextResponse.json({
          success: true,
          message: `Successfully inserted ${inserted} hardcoded seat mappings`,
          inserted: inserted
        });
        
      } catch (error) {
        console.error('❌ Bulk insert error:', error);
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to insert mappings'
        }, { status: 500 });
      }
    }
    
    // Check for migration request
    if (body.action === 'create-auth-tables' && body.confirm === 'lastminutelive-auth-migration') {
      console.log('🚀 Creating auth tables...');
      
      const results = [];
      
      // 1. Create users table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS "users" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "name" text,
            "email" text NOT NULL UNIQUE,
            "email_verified" timestamp with time zone,
            "image" text,
            "password_hash" text,
            "role" text DEFAULT 'customer' NOT NULL CHECK (role IN ('customer', 'venue', 'admin')),
            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
          );
        `);
        
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
        `);
        
        results.push('✅ Users table created');
      } catch (error) {
        results.push(`❌ Users table error: ${error}`);
      }
      
      // 2. Create accounts table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS "accounts" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
            "type" text NOT NULL,
            "provider" text NOT NULL CHECK (provider IN ('email', 'google', 'apple', 'github')),
            "provider_account_id" text NOT NULL,
            "refresh_token" text,
            "access_token" text,
            "expires_at" integer,
            "token_type" text,
            "scope" text,
            "id_token" text,
            "session_state" text,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
            UNIQUE(provider, provider_account_id)
          );
        `);
        
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS "idx_accounts_user" ON "accounts" ("user_id");
        `);
        
        results.push('✅ Accounts table created');
      } catch (error) {
        results.push(`❌ Accounts table error: ${error}`);
      }
      
      // 3. Create verification_tokens table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS "verification_tokens" (
            "identifier" text NOT NULL,
            "token" text NOT NULL,
            "expires" timestamp with time zone NOT NULL,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
            UNIQUE(identifier, token)
          );
        `);
        
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS "idx_verification_tokens_token" ON "verification_tokens" ("token");
        `);
        
        results.push('✅ Verification tokens table created');
      } catch (error) {
        results.push(`❌ Verification tokens error: ${error}`);
      }
      
      // 4. Verify creation
      const verifyTables = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'accounts', 'verification_tokens')
        ORDER BY table_name;
      `);
      
      const createdTables = verifyTables.map((row: any) => row.table_name);
      results.push(`📊 Created tables: ${createdTables.join(', ')}`);
      
      return NextResponse.json({
        success: true,
        message: 'Auth tables migration completed',
        results,
        createdTables,
        timestamp: new Date().toISOString()
      });
      
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid migration request' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
} 