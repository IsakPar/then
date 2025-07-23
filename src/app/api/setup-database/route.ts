import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

/**
 * Complete Database Setup API
 * 
 * This endpoint sets up ALL required database tables for the application.
 * Should be called once after Railway deployment to initialize the database.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting complete database setup...');

    // Security: Only allow with special header in production
    const setupKey = request.headers.get('x-setup-key');
    if (!setupKey || setupKey !== 'lastminutelive-setup-2024') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized setup attempt' },
        { status: 401 }
      );
    }

    const results = [];

    // 1. Create users table
    console.log('📋 Setting up users table...');
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
      
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");`);
      results.push('✅ Users table created/verified');
    } catch (error) {
      results.push(`❌ Users table error: ${error}`);
    }

    // 2. Create guest_sessions table
    console.log('📋 Setting up guest_sessions table...');
    try {
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

      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_guest_sessions_token ON guest_sessions(session_token);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_guest_sessions_email ON guest_sessions(email);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires ON guest_sessions(expires_at);`);
      
      results.push('✅ Guest sessions table created/verified');
    } catch (error) {
      results.push(`❌ Guest sessions table error: ${error}`);
    }

    // 3. Create accounts table for NextAuth
    console.log('📋 Setting up accounts table...');
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "accounts" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "user_id" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "type" text NOT NULL,
          "provider" text NOT NULL,
          "provider_account_id" text NOT NULL,
          "refresh_token" text,
          "access_token" text,
          "expires_at" integer,
          "token_type" text,
          "scope" text,
          "id_token" text,
          "session_state" text,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
          UNIQUE(provider, provider_account_id)
        );
      `);
      
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_accounts_user_id" ON "accounts" ("user_id");`);
      results.push('✅ Accounts table created/verified');
    } catch (error) {
      results.push(`❌ Accounts table error: ${error}`);
    }

    // 4. Create verification_tokens table
    console.log('📋 Setting up verification_tokens table...');
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
      
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_verification_tokens_token" ON "verification_tokens" ("token");`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_verification_tokens_expires" ON "verification_tokens" ("expires");`);
      
      results.push('✅ Verification tokens table created/verified');
    } catch (error) {
      results.push(`❌ Verification tokens table error: ${error}`);
    }

    // 5. Verify all tables exist
    console.log('📋 Verifying all tables...');
    try {
      const tables = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'accounts', 'verification_tokens', 'guest_sessions')
        ORDER BY table_name;
      `);
      
      const tableNames = tables.map((row: any) => row.table_name);
      results.push(`📊 Verified tables: ${tableNames.join(', ')}`);
      
      const expectedTables = ['users', 'accounts', 'verification_tokens', 'guest_sessions'];
      const missingTables = expectedTables.filter(table => !tableNames.includes(table));
      
      if (missingTables.length === 0) {
        results.push('🎉 All required tables present!');
      } else {
        results.push(`⚠️ Missing tables: ${missingTables.join(', ')}`);
      }
    } catch (error) {
      results.push(`❌ Verification error: ${error}`);
    }

    console.log('🎉 Database setup completed!');

    return NextResponse.json({
      success: true,
      message: 'Complete database setup completed successfully',
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Database setup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint to check database status
export async function GET() {
  try {
    console.log('🔍 Checking database status...');
    
    const results = [];
    
    // Check if all required tables exist
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'accounts', 'verification_tokens', 'guest_sessions')
      ORDER BY table_name;
    `);
    
    const existingTables = tables.map((row: any) => row.table_name);
    const requiredTables = ['users', 'accounts', 'verification_tokens', 'guest_sessions'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    results.push(`✅ Existing tables: ${existingTables.join(', ') || 'none'}`);
    if (missingTables.length > 0) {
      results.push(`❌ Missing tables: ${missingTables.join(', ')}`);
    }
    
    return NextResponse.json({
      success: true,
      databaseReady: missingTables.length === 0,
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