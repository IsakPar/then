import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.payment_status === 'paid') {
        console.log('✅ Payment successful for session:', session.id)

        // Extract metadata
        const showId = session.metadata?.show_id
        const reservationId = session.metadata?.reservation_id
        const customerEmail = session.customer_details?.email

        if (!showId || !reservationId || !customerEmail) {
          console.error('❌ Missing required metadata in session:', {
            showId,
            reservationId,
            hasEmail: !!customerEmail
          })
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
        }

        try {
          console.log('🎫 Confirming reservation:', reservationId)

          // Check if already confirmed (prevent duplicates)
          const { data: existingBookings } = await supabase
            .from('seat_bookings')
            .select('id')
            .eq('stripe_session_id', session.id)
            .eq('status', 'confirmed')
            .limit(1)

          if (existingBookings && existingBookings.length > 0) {
            console.log('⚠️ Reservation already confirmed for session:', session.id)
            return NextResponse.json({ success: true, message: 'Already processed' })
          }

          // Confirm the reservation
          const { data: confirmResult, error: confirmError } = await supabase
            .rpc('confirm_seat_reservations', {
              p_reservation_id: reservationId,
              p_customer_email: customerEmail,
              p_stripe_session_id: session.id
            })

          if (confirmError) {
            console.error('❌ Failed to confirm reservation:', confirmError)
            throw new Error(`Failed to confirm reservation: ${confirmError.message}`)
          }

          const confirmation = confirmResult[0]
          
          if (!confirmation.success) {
            console.error('❌ Reservation confirmation failed:', confirmation.message)
            throw new Error(confirmation.message)
          }

          console.log(`🎉 Successfully confirmed ${confirmation.confirmed_count} seat bookings`)
          
          return NextResponse.json({ 
            success: true, 
            message: confirmation.message,
            confirmed_count: confirmation.confirmed_count
          })

        } catch (error) {
          console.error('❌ Error confirming reservation:', error)
          
          return NextResponse.json({ 
            error: 'Failed to confirm reservation',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ 
      error: 'Webhook handler failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 