import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface TicketEmailData {
  buyerEmail: string
  venueEmail: string
  showName: string
  theaterName: string
  showTime: string
  location: string
  price: number
  verificationCode: string
  stripeSessionId: string
}

export async function sendTicketEmails(data: TicketEmailData) {
  try {
    // Email to buyer
    const buyerEmail = await resend.emails.send({
      from: 'Last Minute Live <tickets@lastminutelive.com>',
      to: data.buyerEmail,
      subject: `Your ticket for ${data.showName} - Code: ${data.verificationCode}`,
      html: generateBuyerEmailHTML(data),
    })

    // Email to venue
    const venueEmail = await resend.emails.send({
      from: 'Last Minute Live <notifications@lastminutelive.com>',
      to: data.venueEmail,
      subject: `New ticket sale for ${data.showName} - Code: ${data.verificationCode}`,
      html: generateVenueEmailHTML(data),
    })

    return { success: true, buyerEmailId: buyerEmail.data?.id, venueEmailId: venueEmail.data?.id }
  } catch (error) {
    console.error('Email sending failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

function generateBuyerEmailHTML(data: TicketEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .verification-code { background: #f3f4f6; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .code { font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 3px; }
    .show-details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .important { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎭 Last Minute Live</div>
      <h1>Your Ticket Confirmation</h1>
    </div>

    <div class="verification-code">
      <h2>Your Verification Code</h2>
      <div class="code">${data.verificationCode}</div>
      <p>Show this code at the venue entrance</p>
    </div>

    <div class="show-details">
      <h3>Show Details</h3>
      <p><strong>🎪 Show:</strong> ${data.showName}</p>
      <p><strong>🎭 Venue:</strong> ${data.theaterName}</p>
      <p><strong>📅 Date & Time:</strong> ${new Date(data.showTime).toLocaleString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
      <p><strong>📍 Location:</strong> ${data.location}</p>
      <p><strong>💰 Price:</strong> £${(data.price / 100).toFixed(2)}</p>
    </div>

    <div class="important">
      <h3>⚠️ Important Instructions</h3>
      <ul>
        <li>Arrive 15 minutes before show time</li>
        <li>Show your verification code <strong>${data.verificationCode}</strong> at the door</li>
        <li>Have a valid ID ready if requested</li>
        <li>Contact the venue directly for any show-specific questions</li>
      </ul>
    </div>

    <div class="footer">
      <p>Transaction ID: ${data.stripeSessionId}</p>
      <p>Questions? Contact us at support@lastminutelive.com</p>
      <p>© 2024 Last Minute Live</p>
    </div>
  </div>
</body>
</html>
  `
}

function generateVenueEmailHTML(data: TicketEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .verification-code { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .code { font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 3px; }
    .sale-details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .action { background: #dbeafe; border: 1px solid #3b82f6; border-radius: 6px; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎭 Last Minute Live</div>
      <h1>💰 New Ticket Sale!</h1>
    </div>

    <div class="verification-code">
      <h2>Verification Code</h2>
      <div class="code">${data.verificationCode}</div>
      <p>Check this code when customer arrives</p>
    </div>

    <div class="sale-details">
      <h3>Sale Details</h3>
      <p><strong>🎪 Show:</strong> ${data.showName}</p>
      <p><strong>🎭 Venue:</strong> ${data.theaterName}</p>
      <p><strong>📅 Date & Time:</strong> ${new Date(data.showTime).toLocaleString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
      <p><strong>👤 Customer Email:</strong> ${data.buyerEmail}</p>
      <p><strong>💰 Sale Amount:</strong> £${(data.price / 100).toFixed(2)}</p>
    </div>

    <div class="action">
      <h3>🎫 At the Door</h3>
      <ul>
        <li>Customer will present verification code: <strong>${data.verificationCode}</strong></li>
        <li>Verify the code matches this email</li>
        <li>Allow entry and enjoy the show!</li>
        <li>Contact us if there are any issues</li>
      </ul>
    </div>

    <div class="footer">
      <p>Transaction ID: ${data.stripeSessionId}</p>
      <p>Need help? Contact us at support@lastminutelive.com</p>
      <p>© 2024 Last Minute Live</p>
    </div>
  </div>
</body>
</html>
  `
} 