import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { supabase } from '@/lib/supabase'
import { sendTicketEmails } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price.product']
    })

    let verificationCode = null
    let showDetails = null

    if (session.payment_status === 'paid') {
      // Update database - increment tickets sold
      const showId = session.metadata?.showId
      const quantity = parseInt(session.metadata?.quantity || '1')

      if (showId) {
        // Check if purchase already recorded
        const { data: existingPurchase } = await supabase
          .from('purchases')
          .select('id, verification_code')
          .eq('stripe_session_id', sessionId)
          .single()

        if (existingPurchase) {
          verificationCode = existingPurchase.verification_code
        } else {
          // Generate verification code
          const { data: codeData } = await supabase.rpc('generate_verification_code')
          verificationCode = codeData || Math.floor(100000 + Math.random() * 900000).toString()

          // Get show and venue details for email
          const { data: showDetailsData, error: showError } = await supabase
            .from('shows')
            .select(`
              name, start_time, price, location, theater_name,
              venues!inner(email, name)
            `)
            .eq('id', showId)
            .single()

          if (!showError) {
            showDetails = showDetailsData
          }

          // Record the purchase
          const { error: purchaseError } = await supabase
            .from('purchases')
            .insert({
              show_id: showId,
              customer_email: session.customer_details?.email,
              stripe_session_id: sessionId,
              amount: session.amount_total,
              quantity: quantity,
              payment_status: 'completed',
              verification_code: verificationCode
            })

          if (purchaseError) {
            console.error('Failed to record purchase:', purchaseError)
          }

          // Update show tickets sold
          const { error: updateError } = await supabase.rpc('increment_tickets_sold', {
            show_id: showId,
            quantity: quantity
          })

          if (updateError) {
            console.error('Failed to update tickets sold:', updateError)
          }

          // Send emails if we have show details and emails
          if (showDetails && session.customer_details?.email && showDetails.venues?.email) {
            try {
              // TEMPORARILY DISABLED - Email sending causing 500 error
              // await sendTicketEmails({
              //   buyerEmail: session.customer_details.email,
              //   venueEmail: showDetails.venues.email,
              //   showName: showDetails.name,
              //   theaterName: showDetails.theater_name || 'Unknown Venue',
              //   showTime: showDetails.start_time,
              //   location: showDetails.location || 'Location TBD',
              //   price: showDetails.price,
              //   verificationCode: verificationCode,
              //   stripeSessionId: sessionId
              // })
              console.log('Email sending temporarily disabled - verification code:', verificationCode)
            } catch (emailError) {
              console.error('Failed to send emails:', emailError)
              // Don't fail the entire process if emails fail
            }
          }
        }

        // Get show details if we don't have them yet
        if (!showDetails) {
          const { data: showDetailsData } = await supabase
            .from('shows')
            .select(`
              name, start_time,
              venues!inner(name)
            `)
            .eq('id', showId)
            .single()
          
          showDetails = showDetailsData
        }
      }
    }

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
    console.error('Success route error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    )
  }
}