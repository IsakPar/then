import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

/**
 * Emergency Auth Tables Migration
 * 
 * This endpoint creates the missing auth tables that are required for signup to work.
 * It should only be run once to fix the missing tables issue.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting auth tables migration...');

    // Security: Only allow in production with a special header
    const migrationKey = request.headers.get('x-migration-key');
    if (migrationKey !== 'lastminutelive-auth-migration-2024') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized migration attempt' },
        { status: 401 }
      );
    }

    const results = [];

    // 1. Create users table if not exists
    console.log('📋 Creating users table...');
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
      
      results.push('✅ Users table created/verified');
      console.log('✅ Users table created/verified');
    } catch (error) {
      results.push(`❌ Users table error: ${error}`);
      console.error('❌ Users table error:', error);
    }

    // 2. Create accounts table if not exists
    console.log('📋 Creating accounts table...');
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
      
      results.push('✅ Accounts table created/verified');
      console.log('✅ Accounts table created/verified');
    } catch (error) {
      results.push(`❌ Accounts table error: ${error}`);
      console.error('❌ Accounts table error:', error);
    }

    // 3. Create verification_tokens table if not exists
    console.log('📋 Creating verification_tokens table...');
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
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS "idx_verification_tokens_expires" ON "verification_tokens" ("expires");
      `);
      
      results.push('✅ Verification tokens table created/verified');
      console.log('✅ Verification tokens table created/verified');
    } catch (error) {
      results.push(`❌ Verification tokens table error: ${error}`);
      console.error('❌ Verification tokens table error:', error);
    }

    // 4. Verify tables exist
    console.log('📋 Verifying tables...');
    try {
      const tables = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'accounts', 'verification_tokens')
        ORDER BY table_name;
      `);
      
      const tableNames = tables.map((row: any) => row.table_name);
      results.push(`📊 Verified tables: ${tableNames.join(', ')}`);
      console.log(`📊 Verified tables: ${tableNames.join(', ')}`);
    } catch (error) {
      results.push(`❌ Verification error: ${error}`);
      console.error('❌ Verification error:', error);
    }

    // 5. Test table access
    console.log('📋 Testing table access...');
    try {
      const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM "users"`);
      const accountCount = await db.execute(sql`SELECT COUNT(*) as count FROM "accounts"`);
      const tokenCount = await db.execute(sql`SELECT COUNT(*) as count FROM "verification_tokens"`);
      
      results.push(`📊 Current counts - Users: ${(userCount[0] as any).count}, Accounts: ${(accountCount[0] as any).count}, Tokens: ${(tokenCount[0] as any).count}`);
      console.log(`📊 Current counts - Users: ${(userCount[0] as any).count}, Accounts: ${(accountCount[0] as any).count}, Tokens: ${(tokenCount[0] as any).count}`);
    } catch (error) {
      results.push(`❌ Access test error: ${error}`);
      console.error('❌ Access test error:', error);
    }

    console.log('🎉 Auth tables migration completed!');

    return NextResponse.json({
      success: true,
      message: 'Auth tables migration completed successfully',
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint to check migration status
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking auth tables status...');
    
    const results = [];
    
    // Check if tables exist
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'accounts', 'verification_tokens')
      ORDER BY table_name;
    `);
    
    const existingTables = tables.map((row: any) => row.table_name);
    const requiredTables = ['users', 'accounts', 'verification_tokens'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    results.push(`✅ Existing tables: ${existingTables.join(', ') || 'none'}`);
    if (missingTables.length > 0) {
      results.push(`❌ Missing tables: ${missingTables.join(', ')}`);
    }
    
    // If all tables exist, get counts
    if (missingTables.length === 0) {
      try {
        const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM "users"`);
        const accountCount = await db.execute(sql`SELECT COUNT(*) as count FROM "accounts"`);
        const tokenCount = await db.execute(sql`SELECT COUNT(*) as count FROM "verification_tokens"`);
        
        results.push(`📊 Counts - Users: ${(userCount[0] as any).count}, Accounts: ${(accountCount[0] as any).count}, Tokens: ${(tokenCount[0] as any).count}`);
      } catch (error) {
        results.push(`⚠️ Could not get counts: ${error}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      tablesExist: missingTables.length === 0,
      existingTables,
      missingTables,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Status check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Status check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 