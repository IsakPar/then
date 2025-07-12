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