import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getBookingByValidationCode } from '@/lib/db/queries'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export async function GET(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not configured in success API');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      console.error('❌ No session_id provided to success API');
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    console.log(`🎫 Success API: Retrieving session ${sessionId}`);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price.product']
    })

    console.log(`🎫 Session retrieved: payment_status=${session.payment_status}`);

    let verificationCode = null
    let showDetails = null

    if (session.payment_status === 'paid') {
      // Get the reservation ID from metadata
      const reservationId = session.metadata?.reservation_session_token || session.metadata?.reservation_id

      if (reservationId) {
        console.log(`🎫 Looking up booking by reservation ID: ${reservationId}`);
        
        try {
          // Get the booking by Stripe payment intent ID instead of reservation ID
          const paymentIntentId = session.payment_intent as string
          console.log(`🎫 Looking up booking by payment intent: ${paymentIntentId}`);
          
          // Import the db and tables to query directly
          const { db } = await import('@/lib/db/connection')
          const { bookings, shows, venues, bookingSeats, seats, sections } = await import('@/lib/db/schema')
          const { eq } = await import('drizzle-orm')
          
          const bookingResult = await db
            .select({
              booking: bookings,
              show: shows,
              venue: venues,
            })
            .from(bookings)
            .innerJoin(shows, eq(bookings.showId, shows.id))
            .innerJoin(venues, eq(shows.venueId, venues.id))
            .where(eq(bookings.stripePaymentIntentId, paymentIntentId))
            .limit(1)
          
          if (bookingResult.length > 0) {
            const booking = bookingResult[0]
            console.log(`✅ Booking found by payment intent: ${booking.booking.validationCode}`);
            verificationCode = booking.booking.validationCode
            
            // Get seat details for this booking
            const seatDetails = await db
              .select({
                seat: seats,
                section: sections,
                pricePaid: bookingSeats.pricePaidPence,
              })
              .from(bookingSeats)
              .innerJoin(seats, eq(bookingSeats.seatId, seats.id))
              .innerJoin(sections, eq(seats.sectionId, sections.id))
              .where(eq(bookingSeats.bookingId, booking.booking.id))
            
            console.log(`✅ Found ${seatDetails.length} seats for booking`);
            
            // Get show details from booking with seat information
            showDetails = {
              name: booking.show.title || 'Unknown Show',
              description: booking.show.description,
              image_url: booking.show.imageUrl,
              start_time: booking.show.date ? `${booking.show.date}T${booking.show.time || '19:30'}` : null,
              date: booking.show.date,
              time: booking.show.time,
              venue: {
                name: booking.venue.name || 'Unknown Venue',
                address: booking.venue.address
              },
              booking: {
                id: booking.booking.id,
                validation_code: booking.booking.validationCode,
                customer_name: booking.booking.customerName,
                customer_email: booking.booking.customerEmail,
                total_amount: booking.booking.totalAmountPence / 100,
                status: booking.booking.status,
                created_at: booking.booking.createdAt
              },
              seats: seatDetails.map(s => ({
                id: s.seat.id,
                section_name: s.section.name,
                row: s.seat.rowLetter,
                number: s.seat.seatNumber,
                price_paid: s.pricePaid / 100,
                section_color: s.section.colorHex
              }))
            }
          } else {
            console.log(`⚠️ No booking found for payment intent: ${paymentIntentId}`);
            // Session is paid but booking not found - this might happen if webhook hasn't processed yet
            verificationCode = 'PROCESSING'
            showDetails = {
              name: 'Your Show',
              start_time: null,
              venue: {
                name: 'Processing...'
              },
              booking: null,
              seats: []
            }
          }
        } catch (error) {
          console.error('❌ Error looking up booking:', error);
          verificationCode = 'ERROR'
          showDetails = {
            name: 'Show',
            start_time: null,
            venue: {
              name: 'Please contact support'
            },
            booking: null,
            seats: []
          }
        }
      } else {
        console.error('❌ No reservation_id in session metadata');
        verificationCode = 'NO_RESERVATION'
      }
    }

    console.log(`🎫 Success API response: verification_code=${verificationCode}`);

    return NextResponse.json({
      id: session.id,
      payment_status: session.payment_status,
      customer_details: session.customer_details,
      line_items: session.line_items,
      amount_total: session.amount_total,
      verification_code: verificationCode,
      show_details: showDetails
    })

  } catch (error) {
    console.error('❌ Success API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 