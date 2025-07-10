import { NextRequest, NextResponse } from 'next/server'
import { confirmSeatReservations } from '@/lib/db/queries'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reservationId, customerEmail, customerName, paymentIntentId } = body

    if (!reservationId || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: reservationId, customerEmail' },
        { status: 400 }
      )
    }

    console.log('🧪 Testing webhook confirmation with:', {
      reservationId,
      customerEmail,
      customerName: customerName || 'Test Customer',
      paymentIntentId: paymentIntentId || 'test_pi_' + Date.now()
    })

    const result = await confirmSeatReservations(
      reservationId,
      customerEmail,
      customerName || 'Test Customer',
      paymentIntentId || 'test_pi_' + Date.now()
    )

    console.log('✅ Test webhook result:', result)

    return NextResponse.json({
      success: true,
      message: 'Test webhook processing completed',
      result
    })

  } catch (error) {
    console.error('❌ Test webhook error:', error)
    return NextResponse.json(
      { 
        error: 'Test webhook failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 