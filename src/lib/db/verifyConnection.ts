import { db } from './connection';
import { sql } from 'drizzle-orm';

/**
 * Verify database connection and basic functionality
 */
export async function verifyDatabaseConnection() {
  try {
    console.log('🔍 Verifying database connection...');
    
    // Test basic connection
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection successful:', result);
    
    // Test schema access
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📋 Available tables:', tableCheck.map(row => row.table_name));
    
    return {
      success: true,
      tables: tableCheck.map(row => row.table_name),
      connection: 'verified'
    };
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      connection: 'failed'
    };
  }
}

/**
 * Check specific tables exist
 */
export async function checkTablesExist() {
  const requiredTables = [
    'venues',
    'seat_maps', 
    'shows',
    'sections',
    'seats',
    'reservations',
    'bookings',
    'booking_seats'
  ];
  
  try {
    const missingTables = [];
    
    for (const table of requiredTables) {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        )
      `);
      
      if (!result[0]?.exists) {
        missingTables.push(table);
      }
    }
    
    return {
      success: missingTables.length === 0,
      missingTables,
      requiredTables
    };
    
  } catch (error) {
    console.error('❌ Table check failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Quick seat data check
 */
export async function quickSeatCheck(showId?: string) {
  try {
    if (showId) {
      const seatCount = await db.execute(sql`
        SELECT 
          status,
          COUNT(*) as count
        FROM seats 
        WHERE show_id = ${showId}
        GROUP BY status
        ORDER BY status
      `);
      
      console.log(`🎫 Seat status for show ${showId}:`, seatCount);
      return { success: true, seatCount };
    }
    
    return { success: true, message: 'No show ID provided' };
    
  } catch (error) {
    console.error('❌ Seat check failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 