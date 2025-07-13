import Mailjet from 'node-mailjet';

// Lazy initialization of Mailjet client
let mailjet: Mailjet | null = null;

function getMailjetClient(): Mailjet {
  if (!mailjet) {
    // At this point, we know the keys are configured (checked in sendEmail method)
    mailjet = new Mailjet({
      apiKey: process.env.MAILJET_API_KEY!,
      apiSecret: process.env.MAILJET_SECRET_KEY!,
    });
  }
  return mailjet;
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export class EmailService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@lml-tickets.com';
    this.fromName = process.env.FROM_NAME || 'LastMinuteLive';
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, resetToken: string, userName?: string): Promise<boolean> {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const template = this.createPasswordResetTemplate(resetUrl, userName);
    
    return this.sendEmail(
      email,
      template.subject,
      template.htmlContent,
      template.textContent
    );
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(email: string, verificationToken: string, userName?: string): Promise<boolean> {
    const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    const template = this.createEmailVerificationTemplate(verifyUrl, userName);
    
    return this.sendEmail(
      email,
      template.subject,
      template.htmlContent,
      template.textContent
    );
  }

  /**
   * Send welcome email for new users
   */
  async sendWelcomeEmail(email: string, userName: string, userRole: 'customer' | 'venue' | 'admin'): Promise<boolean> {
    const template = this.createWelcomeTemplate(userName, userRole);
    
    return this.sendEmail(
      email,
      template.subject,
      template.htmlContent,
      template.textContent
    );
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(
    email: string, 
    userName: string, 
    showTitle: string, 
    showDate: string, 
    showTime: string, 
    venue: string, 
    validationCode: string,
    seatInfo: string
  ): Promise<boolean> {
    const template = this.createBookingConfirmationTemplate(
      userName, showTitle, showDate, showTime, venue, validationCode, seatInfo
    );
    
    return this.sendEmail(
      email,
      template.subject,
      template.htmlContent,
      template.textContent
    );
  }

  /**
   * Core email sending function using Mailjet
   */
  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<boolean> {
          try {
        // Skip email sending in development if Mailjet keys are not configured
        if (process.env.NODE_ENV === 'development' && (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY)) {
          console.log('📧 Development mode: Email would be sent to:', to);
          console.log('📧 Subject:', subject);
          console.log('📧 Content (first 200 chars):', textContent.substring(0, 200) + '...');
          return true;
        }

        // In production, if Mailjet keys are not configured, simulate sending
        if (process.env.NODE_ENV === 'production' && (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY)) {
          console.log('⚠️  Production mode: Mailjet not configured, simulating email to:', to);
          console.log('📧 Subject:', subject);
          console.log('📧 Content (first 200 chars):', textContent.substring(0, 200) + '...');
          return true;
        }

        // Get Mailjet client (lazy initialization)
        const mailjetClient = getMailjetClient();

      const request = await mailjetClient
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: {
                Email: this.fromEmail,
                Name: this.fromName,
              },
              To: [
                {
                  Email: to,
                },
              ],
              Subject: subject,
              TextPart: textContent,
              HTMLPart: htmlContent,
            },
          ],
        });

      console.log('📧 Email sent successfully to:', to);
      return true;
    } catch (error) {
      console.error('📧 Email sending failed:', error);
      return false;
    }
  }

  /**
   * Create password reset email template
   */
  private createPasswordResetTemplate(resetUrl: string, userName?: string): EmailTemplate {
    const greeting = userName ? `Hi ${userName}` : 'Hi there';
    
    return {
      subject: 'Reset Your LastMinuteLive Password',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎭 LastMinuteLive</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <p>${greeting},</p>
              <p>You requested to reset your password for your LastMinuteLive account. Click the button below to create a new password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p><strong>This link will expire in 15 minutes.</strong></p>
              <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              <p>Best regards,<br>The LastMinuteLive Team</p>
            </div>
            <div class="footer">
              <p>If the button doesn't work, copy and paste this link: ${resetUrl}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
${greeting},

You requested to reset your password for your LastMinuteLive account. 

To reset your password, visit this link: ${resetUrl}

This link will expire in 15 minutes.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The LastMinuteLive Team
      `.trim(),
    };
  }

  /**
   * Create email verification template
   */
  private createEmailVerificationTemplate(verifyUrl: string, userName?: string): EmailTemplate {
    const greeting = userName ? `Hi ${userName}` : 'Hi there';
    
    return {
      subject: 'Verify Your LastMinuteLive Email',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎭 LastMinuteLive</h1>
              <p>Email Verification</p>
            </div>
            <div class="content">
              <p>${greeting},</p>
              <p>Welcome to LastMinuteLive! Please verify your email address to complete your account setup:</p>
              <p style="text-align: center;">
                <a href="${verifyUrl}" class="button">Verify Email</a>
              </p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>Once verified, you'll be able to book tickets and access all LastMinuteLive features.</p>
              <p>Best regards,<br>The LastMinuteLive Team</p>
            </div>
            <div class="footer">
              <p>If the button doesn't work, copy and paste this link: ${verifyUrl}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
${greeting},

Welcome to LastMinuteLive! Please verify your email address to complete your account setup.

To verify your email, visit this link: ${verifyUrl}

This link will expire in 24 hours.

Once verified, you'll be able to book tickets and access all LastMinuteLive features.

Best regards,
The LastMinuteLive Team
      `.trim(),
    };
  }

  /**
   * Create welcome email template
   */
  private createWelcomeTemplate(userName: string, userRole: 'customer' | 'venue' | 'admin'): EmailTemplate {
    const roleMessage = {
      customer: 'You can now book tickets for amazing shows and events!',
      venue: 'You can now manage your venue and validate tickets.',
      admin: 'You have full administrative access to the platform.',
    };

    return {
      subject: 'Welcome to LastMinuteLive! 🎭',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to LastMinuteLive</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
            .feature { margin: 20px 0; padding: 15px; background: white; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎭 Welcome to LastMinuteLive!</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Welcome to LastMinuteLive! Your account has been created successfully.</p>
              <p>${roleMessage[userRole]}</p>
              
              ${userRole === 'customer' ? `
              <div class="feature">
                <h3>🎫 Book Amazing Shows</h3>
                <p>Discover and book tickets for the best theater shows, concerts, and events.</p>
              </div>
              <div class="feature">
                <h3>📱 Mobile Access</h3>
                <p>Use our mobile app for easy ticket management and QR code access.</p>
              </div>
              ` : ''}
              
              ${userRole === 'venue' ? `
              <div class="feature">
                <h3>🏢 Venue Management</h3>
                <p>Manage your shows, view bookings, and validate tickets with QR codes.</p>
              </div>
              <div class="feature">
                <h3>📊 Analytics</h3>
                <p>Track your venue's performance with detailed booking analytics.</p>
              </div>
              ` : ''}
              
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Best regards,<br>The LastMinuteLive Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
Hi ${userName},

Welcome to LastMinuteLive! Your account has been created successfully.

${roleMessage[userRole]}

If you have any questions, feel free to reach out to our support team.

Best regards,
The LastMinuteLive Team
      `.trim(),
    };
  }

  /**
   * Create booking confirmation email template
   */
  private createBookingConfirmationTemplate(
    userName: string,
    showTitle: string,
    showDate: string,
    showTime: string,
    venue: string,
    validationCode: string,
    seatInfo: string
  ): EmailTemplate {
    return {
      subject: `Your Ticket Confirmation - ${showTitle}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
            .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .validation-code { font-size: 24px; font-weight: bold; color: #667eea; text-align: center; background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎭 Booking Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Your booking has been confirmed! Here are your ticket details:</p>
              
              <div class="ticket-info">
                <h3>🎭 ${showTitle}</h3>
                <p><strong>📅 Date:</strong> ${showDate}</p>
                <p><strong>🕐 Time:</strong> ${showTime}</p>
                <p><strong>📍 Venue:</strong> ${venue}</p>
                <p><strong>🎫 Seats:</strong> ${seatInfo}</p>
              </div>
              
              <p><strong>Your validation code:</strong></p>
              <div class="validation-code">${validationCode}</div>
              
              <p>Present this code (or the QR code in your mobile app) at the venue for entry.</p>
              <p>We hope you enjoy the show!</p>
              <p>Best regards,<br>The LastMinuteLive Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
Hi ${userName},

Your booking has been confirmed! Here are your ticket details:

🎭 ${showTitle}
📅 Date: ${showDate}
🕐 Time: ${showTime}
📍 Venue: ${venue}
🎫 Seats: ${seatInfo}

Your validation code: ${validationCode}

Present this code at the venue for entry.

We hope you enjoy the show!

Best regards,
The LastMinuteLive Team
      `.trim(),
    };
  }
}

// Export singleton instance
export const emailService = new EmailService(); 