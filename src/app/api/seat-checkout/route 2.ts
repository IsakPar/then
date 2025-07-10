import { NextRequest, NextResponse } from 'next/server'
import { reserveSeats, getShowWithPricing } from '@/lib/db/queries'
import Stripe from 'stripe'

// TODO: Require auth - seat reservations should be protected
// import { getServerSession } from 'next-auth'
// import { authOptions } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil'
})

interface SectionBooking {
  section_id: string
  quantity: string
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Require auth - uncomment when NextAuth is implemented
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    // }

    // Check for development mode (Stripe not configured)
    const isStripeConfigured = process.env.STRIPE_SECRET_KEY && 
                              process.env.STRIPE_SECRET_KEY !== 'sk_test_...' &&
                              (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') || process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) &&
                              process.env.STRIPE_SECRET_KEY.length > 20;
    
    if (!isStripeConfigured) {
      console.error('❌ STRIPE_SECRET_KEY not properly configured');
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    const body = await request.json();
    console.log('🧾 Incoming checkout request:', body);
    
    const { showId, sectionBookings } = body;
    
    if (!showId) {
      console.error('❌ Missing showId in request');
      return NextResponse.json({ error: 'Missing show ID' }, { status: 400 });
    }
    
    if (!Array.isArray(sectionBookings) || sectionBookings.length === 0) {
      console.error('❌ No seats provided or invalid format:', sectionBookings);
      return NextResponse.json({ error: 'No seats provided' }, { status: 400 });
    }
    
    console.log('🎫 Creating seat reservations for show:', showId)
    console.log('📋 Section bookings:', sectionBookings)

    // Clean up any invalid bookings
    const validBookings = sectionBookings.filter((booking: any) => 
      booking.section_id && parseInt(booking.quantity) > 0
    )

    if (validBookings.length === 0) {
      return NextResponse.json({ error: 'No valid bookings provided' }, { status: 400 })
    }

    // Reserve seats using Drizzle
    const reservationResult = await reserveSeats(showId, validBookings)

    if (!reservationResult || reservationResult.length === 0) {
      console.log('⚠️ Reservation failed: null')
      return NextResponse.json(
        { error: 'No reservation result returned' },
        { status: 400 }
      )
    }

    const reservation = reservationResult[0]
    
    if (!reservation.success) {
      console.log('❌ Reservation unsuccessful')
      return NextResponse.json(
        { error: 'Failed to reserve seats' },
        { status: 400 }
      )
    }

    console.log('✅ Reservation successful:', reservation.reservation_id)

    // Calculate total amount
    const totalAmount = reservation.booking_details.reduce(
      (sum: number, item: any) => sum + (item.total_price || 0), 
      0
    )

    // Get show information for Stripe session using Drizzle
    const shows = await getShowWithPricing(showId)
    const showData = shows[0]

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: reservation.booking_details.map((item: any) => ({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `${showData?.title || 'Show'} - ${item.section_name}`,
            description: `${item.quantity} ticket(s) for ${item.section_name}`,
          },
          unit_amount: item.unit_price,
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/show/${showId}/seats`,
      metadata: {
        reservation_id: reservation.reservation_id,
        show_id: showId,
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes (Stripe minimum)
    });

    return NextResponse.json({
      sessionId: session.id,
      reservationId: reservation.reservation_id,
      expiresAt: reservation.expires_at,
      totalAmount,
      bookingDetails: reservation.booking_details
    })

  } catch (error) {
    console.error('💥 Seat checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 