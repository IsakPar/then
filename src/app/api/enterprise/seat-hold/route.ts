import { NextRequest, NextResponse } from 'next/server'
import { enterpriseBookingService } from '@/lib/services/EnterpriseBookingService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { seatIds, sessionId, userId, userEmail, metadata } = body

    // Validate required fields
    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'seatIds array is required'
      }, { status: 400 })
    }

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId is required'
      }, { status: 400 })
    }

    // Extract audit context from request
    const auditContext = {
      userId,
      userEmail,
      sessionId,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    console.log(`🔒 Enterprise seat hold request for ${seatIds.length} seats by session ${sessionId}`)

    // Execute enterprise seat hold with row-level locking
    const result = await enterpriseBookingService.holdSeats({
      seatIds,
      sessionId,
      userId,
      userEmail,
      metadata
    }, auditContext)

    if (result.success) {
      return NextResponse.json({
        success: true,
        holdId: result.holdId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        message: `Successfully held ${seatIds.length} seats`,
        audit: {
          operation: 'SEAT_HOLD',
          sessionId,
          seatCount: seatIds.length,
          timestamp: new Date().toISOString()
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        conflictingSeats: result.conflictingSeats,
        audit: {
          operation: 'SEAT_HOLD_FAILED',
          sessionId,
          reason: result.error,
          timestamp: new Date().toISOString()
        }
      }, { status: 409 })
    }

  } catch (error) {
    console.error('❌ Enterprise seat hold API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId is required'
      }, { status: 400 })
    }

    // Auto-cleanup expired holds
    const cleanupResult = await enterpriseBookingService.cleanupExpiredHolds()

    return NextResponse.json({
      success: true,
      message: 'Seat holds cleanup completed',
      releasedCount: cleanupResult.releasedCount
    })

  } catch (error) {
    console.error('❌ Seat hold cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup holds'
    }, { status: 500 })
  }
} 