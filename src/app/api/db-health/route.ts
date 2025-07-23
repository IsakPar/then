import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Test basic database connection
    const connectionTest = await db.execute(sql`SELECT 1 as test`);
    
    // Check if guest_sessions table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'guest_sessions'
      ) as table_exists
    `);
    
    // Get database URL info (without password)
    const dbUrl = process.env.DATABASE_URL;
    const dbInfo = dbUrl ? {
      host: dbUrl.split('@')[1]?.split(':')[0] || 'unknown',
      port: dbUrl.split(':')[3]?.split('/')[0] || 'unknown',
      database: dbUrl.split('/').pop() || 'unknown'
    } : null;
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        guest_sessions_table_exists: tableCheck[0]?.table_exists || false,
        connection_info: dbInfo
      },
      message: 'Database health check passed'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 