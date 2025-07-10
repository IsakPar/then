import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getBookingByValidationCode, confirmSeatReservations } from '@/lib/db/queries'

// In-memory cache to prevent duplicate processing - only cache successful results
const processedSessions = new Map<string, any>()

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

    // Initialize Stripe client inside the function to avoid build-time errors
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    })

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    console.log(`🎫 Success API: Retrieving session ${sessionId}`)

    // Check cache first - but only return cached results if they're successful (not PROCESSING)
    if (processedSessions.has(sessionId)) {
      const cachedResult = processedSessions.get(sessionId)
      if (cachedResult.verification_code !== 'PROCESSING') {
        console.log(`🎫 Success API: Returning cached result for session ${sessionId}`)
        return NextResponse.json(cachedResult)
      } else {
        console.log(`🎫 Success API: Cached result is PROCESSING, removing from cache to retry`)
        processedSessions.delete(sessionId)
      }
    }

    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer_details']
    })

    console.log(`🎫 Session retrieved: payment_status=${session.payment_status}`)

    let verificationCode = 'PROCESSING'
    let showDetails = null

    if (session.payment_status === 'paid') {
      // Get the reservation ID from metadata
      const reservationId = session.metadata?.reservation_session_token || session.metadata?.reservation_id
      const paymentIntentId = session.payment_intent as string

      if (reservationId && paymentIntentId) {
        console.log(`🎫 Looking up booking by reservation ID: ${reservationId}`);
        console.log(`🎫 Looking up booking by payment intent: ${paymentIntentId}`);
        
        try {
          // Import the db and tables to query directly
          const { db } = await import('@/lib/db/connection')
          const { bookings, shows, venues, bookingSeats, seats, sections } = await import('@/lib/db/schema')
          const { eq } = await import('drizzle-orm')
          
          // First try to find existing booking by payment intent
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
            // Booking exists, get its details
            const booking = bookingResult[0]
            console.log(`✅ Booking found by payment intent: ${booking.booking.validationCode}`);
            
            const result = await buildSuccessResponse(booking, db, bookingSeats, seats, sections, eq)
            
            // Cache the successful result
            processedSessions.set(sessionId, result)
            return NextResponse.json(result)
            
          } else {
            console.log(`⚠️ No booking found for payment intent: ${paymentIntentId}`);
            console.log(`🎫 Attempting to create booking from reservation: ${reservationId}`);
            
            // Try to create booking only once per session
            try {
              const confirmResult = await confirmSeatReservations(
                reservationId,
                session.customer_details?.email || 'unknown@email.com',
                session.customer_details?.name || 'Unknown Customer',
                paymentIntentId
              )

              console.log(`🎫 Booking creation result:`, confirmResult);

              const confirmation = confirmResult[0]
               
              if (confirmation?.success && 'verification_code' in confirmation) {
                const verificationCodeValue = confirmation.verification_code
                console.log(`✅ Booking created successfully with verification code: ${verificationCodeValue}`);
                
                // Wait a moment for database consistency
                await new Promise(resolve => setTimeout(resolve, 1000))
                
                // Now fetch the newly created booking details
                const newBookingResult = await db
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
                
                if (newBookingResult.length > 0) {
                  const result = await buildSuccessResponse(newBookingResult[0], db, bookingSeats, seats, sections, eq)
                  
                  // Cache the successful result
                  processedSessions.set(sessionId, result)
                  return NextResponse.json(result)
                } else {
                  console.log(`⚠️ Booking creation succeeded but can't find booking in database yet`);
                  // DON'T cache this - let it retry
                  const basicResult = {
                    verification_code: verificationCodeValue,
                    payment_status: session.payment_status,
                    customer_details: session.customer_details,
                    amount_total: session.amount_total,
                    show_details: {
                      name: 'Your Show',
                      start_time: null,
                      venue: { name: 'Processing...' },
                      booking: {
                        id: 'unknown',
                        validation_code: verificationCodeValue,
                        customer_name: session.customer_details?.name || 'Unknown',
                        customer_email: session.customer_details?.email || 'unknown@email.com',
                        total_amount: (session.amount_total || 0) / 100,
                        status: 'confirmed',
                        created_at: new Date().toISOString()
                      },
                      seats: []
                    }
                  }
                  
                  // Cache this successful result since we have a verification code
                  processedSessions.set(sessionId, basicResult)
                  return NextResponse.json(basicResult)
                }
              } else {
                console.log(`❌ Booking creation failed: ${confirmation?.message || 'Unknown error'}`);
                throw new Error(`Booking creation failed: ${confirmation?.message || 'Unknown error'}`)
              }
            } catch (bookingError) {
              console.error('❌ Error creating booking:', bookingError);
              
              // Don't return PROCESSING immediately, check if booking was created despite error
              await new Promise(resolve => setTimeout(resolve, 2000))
              
              const retryBookingResult = await db
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
              
              if (retryBookingResult.length > 0) {
                console.log(`✅ Booking found on retry after error`);
                const result = await buildSuccessResponse(retryBookingResult[0], db, bookingSeats, seats, sections, eq)
                
                // Cache the successful result
                processedSessions.set(sessionId, result)
                return NextResponse.json(result)
              }
              
              // Return PROCESSING but DON'T cache it - let it retry
              return NextResponse.json({
                verification_code: 'PROCESSING',
                payment_status: session.payment_status,
                customer_details: session.customer_details,
                amount_total: session.amount_total,
                show_details: null,
                error: 'Booking is being processed. Please wait...'
              })
            }
          }
        } catch (error) {
          console.error('❌ Database error in success API:', error);
          
          // Return PROCESSING but DON'T cache it - let it retry
          return NextResponse.json({
            verification_code: 'PROCESSING',
            payment_status: session.payment_status,
            customer_details: session.customer_details,
            amount_total: session.amount_total,
            show_details: null,
            error: 'Database connection error. Please wait...'
          })
        }
      } else {
        console.log(`⚠️ Missing reservation ID or payment intent ID`);
        return NextResponse.json({
          verification_code: 'ERROR',
          payment_status: session.payment_status,
          customer_details: session.customer_details,
          amount_total: session.amount_total,
          error: 'Missing reservation information'
        }, { status: 400 })
      }
    } else {
      console.log(`⚠️ Payment not completed: ${session.payment_status}`);
      return NextResponse.json({
        verification_code: 'ERROR',
        payment_status: session.payment_status,
        customer_details: session.customer_details,
        amount_total: session.amount_total,
        error: 'Payment not completed'
      }, { status: 400 })
    }

    // Default fallback (should not reach here)
    return NextResponse.json({
      verification_code: 'PROCESSING',
      payment_status: session.payment_status,
      customer_details: session.customer_details,
      amount_total: session.amount_total,
      show_details: null
    })

  } catch (error) {
    console.error('❌ Error in success API:', error);
    return NextResponse.json({
      verification_code: 'ERROR',
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to build success response
async function buildSuccessResponse(booking: any, db: any, bookingSeats: any, seats: any, sections: any, eq: any) {
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
  
  return {
    verification_code: booking.booking.validationCode,
    payment_status: 'paid',
    customer_details: {
      email: booking.booking.customerEmail,
      name: booking.booking.customerName
    },
    amount_total: booking.booking.totalAmountPence,
    show_details: {
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
      seats: seatDetails.map((s: any) => ({
        id: s.seat.id,
        section_name: s.section.name,
        row: s.seat.rowLetter,
        number: s.seat.seatNumber,
        price_paid: s.pricePaid / 100,
        section_color: s.section.colorHex
      }))
    }
  }
} 