import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { confirmSeatReservations, getBookingByValidationCode } from '@/lib/db/queries'

export async function POST(request: NextRequest) {
  console.log('🔔 Stripe webhook endpoint hit');

  // Check webhook secret configuration
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!
  if (!endpointSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Initialize Stripe client inside the function to avoid build-time errors
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
  })

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ No Stripe signature in request headers');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
      console.log(`✅ Webhook signature verified for event: ${event.type}`);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log(`🔔 Processing webhook event: ${event.type}`)

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`💳 Checkout session completed:`, {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        metadata: session.metadata,
        customerEmail: session.customer_details?.email,
        customerName: session.customer_details?.name,
        amountTotal: session.amount_total
      })

      if (session.payment_status === 'paid') {
        console.log('✅ Payment confirmed as successful for session:', session.id)

        // Extract metadata with improved validation
        const showId = session.metadata?.show_id
        const reservationId = session.metadata?.reservation_session_token || session.metadata?.reservation_id
        const customerEmail = session.customer_details?.email

        console.log(`🎫 Extracted webhook metadata:`, {
          showId,
          reservationId,
          customerEmail,
          hasMetadata: !!session.metadata,
          metadataKeys: session.metadata ? Object.keys(session.metadata) : []
        })

        // Validate required data
        if (!showId) {
          console.error('❌ Missing show_id in session metadata:', session.metadata);
          return NextResponse.json({ error: 'Missing show_id in metadata' }, { status: 400 });
        }

        if (!reservationId) {
          console.error('❌ Missing reservation_id in session metadata:', session.metadata);
          return NextResponse.json({ error: 'Missing reservation_id in metadata' }, { status: 400 });
        }

        if (!customerEmail) {
          console.error('❌ Missing customer email in session details');
          return NextResponse.json({ error: 'Missing customer email' }, { status: 400 });
        }

        try {
          console.log(`🎫 Attempting to confirm reservation: ${reservationId}`);

          // Check if already processed to prevent duplicates
          try {
            const existingBooking = await getBookingByValidationCode(reservationId)
            if (existingBooking) {
              console.log('⚠️ Reservation already confirmed, skipping:', reservationId);
              return NextResponse.json({ 
                success: true, 
                message: 'Already processed',
                reservationId 
              });
            }
          } catch (error) {
            console.log('📝 No existing booking found, proceeding with confirmation');
          }

          // Confirm the seat reservations
          console.log(`🎫 Calling confirmSeatReservations:`, {
            reservationId,
            customerEmail,
            customerName: session.customer_details?.name || 'Unknown Customer',
            paymentIntentId: session.payment_intent as string || session.id
          });

          const confirmResult = await confirmSeatReservations(
            reservationId,
            customerEmail,
            session.customer_details?.name || 'Unknown Customer',
            session.payment_intent as string || session.id
          )

          console.log(`🎫 Confirmation result:`, confirmResult);

          const confirmation = confirmResult[0]
          
          if (!confirmation?.success) {
            console.error('❌ Seat confirmation failed:', confirmation?.message || 'Unknown error');
            return NextResponse.json({ 
              error: 'Seat confirmation failed',
              details: confirmation?.message || 'Unknown error'
            }, { status: 500 });
          }

          console.log(`🎉 Webhook successfully confirmed reservation:`, {
            reservationId,
            confirmedSeats: (confirmation as any).confirmed_count || 0,
            verificationCode: (confirmation as any).verification_code
          });
          
          return NextResponse.json({ 
            success: true, 
            message: 'Seats confirmed successfully',
            reservationId,
            confirmed_count: (confirmation as any).confirmed_count || 0,
            verification_code: (confirmation as any).verification_code
          });

        } catch (error) {
          console.error('❌ Error in webhook seat confirmation:', error);
          console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
          
          return NextResponse.json({ 
            error: 'Failed to confirm reservation in webhook',
            details: error instanceof Error ? error.message : 'Unknown error',
            reservationId
          }, { status: 500 });
        }
      } else {
        console.log(`⚠️ Payment not successful. Status: ${session.payment_status} for session: ${session.id}`);
        return NextResponse.json({ 
          message: 'Payment not completed',
          paymentStatus: session.payment_status 
        });
      }
    } 
    
    // Handle other event types
    else if (event.type === 'payment_intent.succeeded') {
      console.log(`💰 Payment intent succeeded: ${event.data.object.id}`);
    }
    else if (event.type === 'payment_intent.payment_failed') {
      console.log(`❌ Payment intent failed: ${event.data.object.id}`);
    }
    else {
      console.log(`🔔 Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ 
      received: true, 
      eventType: event.type
    });

  } catch (error) {
    console.error('❌ Webhook handler failed:', error);
    console.error('❌ Webhook error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: 'Webhook handler failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 