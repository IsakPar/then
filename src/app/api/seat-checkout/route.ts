import { NextRequest, NextResponse } from 'next/server'
import { createReservations, getShowWithPricing } from '@/lib/db/queries'
import Stripe from 'stripe'

// TODO: Require auth - seat reservations should be protected
// import { getServerSession } from 'next-auth'
// import { authOptions } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil'
})

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
    
    const { showId, specificSeatIds } = body;
    
    if (!showId) {
      console.error('❌ Missing showId in request');
      return NextResponse.json({ error: 'Missing show ID' }, { status: 400 });
    }
    
    if (!Array.isArray(specificSeatIds) || specificSeatIds.length === 0) {
      console.error('❌ No seat IDs provided or invalid format:', specificSeatIds);
      return NextResponse.json({ error: 'No specific seat IDs provided' }, { status: 400 });
    }
    
    console.log('🎫 Creating seat reservations for show:', showId)
    console.log('🎯 Specific seat IDs to reserve:', specificSeatIds)

    // Generate session token for this reservation
    const sessionToken = crypto.randomUUID();

    // Reserve the specific seats using the new createReservations function
    const reservationResult = await createReservations(
      specificSeatIds,
      sessionToken,
      15 // 15 minutes expiration
    );

    if (!reservationResult || reservationResult.length === 0) {
      console.log('⚠️ Reservation failed: No results returned')
      return NextResponse.json(
        { error: 'Failed to reserve seats' },
        { status: 400 }
      )
    }

    console.log('✅ Reservation successful. Reserved seats:', reservationResult.length)

    // Get show information for Stripe session using Drizzle
    const shows = await getShowWithPricing(showId)
    const showData = shows[0]

    if (!showData) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Calculate total amount - we need to get the seat prices
    // This is a simplified calculation, you might want to fetch actual seat prices
    const totalAmount = specificSeatIds.length * showData.min_price * 100; // Convert to pence

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `${showData?.title || 'Show'} - Tickets`,
            description: `${specificSeatIds.length} ticket(s) for ${showData?.title}`,
          },
          unit_amount: Math.round(showData.min_price * 100), // Convert to pence
        },
        quantity: specificSeatIds.length,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/show/${showId}/seats`,
      metadata: {
        reservation_session_token: sessionToken,
        show_id: showId,
        seat_ids: specificSeatIds.join(','),
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes (Stripe minimum)
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      reservationId: sessionToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      totalAmount: totalAmount,
      reservedSeats: specificSeatIds.length
    })

  } catch (error) {
    console.error('💥 Seat checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 