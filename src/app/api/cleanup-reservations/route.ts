import { NextRequest, NextResponse } from 'next/server'
import { paymentReservationService } from '@/lib/services/PaymentReservationService'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * 🧹 RESERVATION CLEANUP API
 * 
 * This endpoint cleans up expired reservations and maintains system integrity.
 * It should be called periodically (e.g., every 5-10 minutes) via cron job or external scheduler.
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Cleanup endpoint triggered')

    // Basic authentication check (optional)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CLEANUP_API_TOKEN
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.log('❌ Invalid or missing cleanup API token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run cleanup
    const cleanedCount = await paymentReservationService.cleanupExpiredReservations()

    console.log(`✅ Cleanup completed: ${cleanedCount} reservations cleaned`)

    return NextResponse.json({
      success: true,
      cleanedCount,
      timestamp: new Date().toISOString(),
      message: `Cleaned up ${cleanedCount} expired reservations`
    })

  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    service: 'Reservation Cleanup',
    status: 'active',
    timestamp: new Date().toISOString()
  })
} 