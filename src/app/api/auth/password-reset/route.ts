import { NextRequest, NextResponse } from 'next/server';
import { 
  AuthUtils, 
  PasswordUtils,
  ValidationUtils, 
  RateLimitUtils,
  TokenUtils
} from '@/lib/auth-utils';

interface PasswordResetRequest {
  email: string;
}

interface PasswordResetConfirm {
  email: string;
  token: string;
  newPassword: string;
}

/**
 * POST /api/auth/password-reset
 * Request a password reset - sends email with reset link
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (RateLimitUtils.isRateLimited(`password-reset:${clientIP}`, 3, 15 * 60 * 1000)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many password reset attempts. Please try again later.' 
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body: PasswordResetRequest = await request.json();
    
    if (!body.email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email is required' 
        },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const email = ValidationUtils.sanitizeInput(body.email).toLowerCase();

    // Validate email format
    if (!ValidationUtils.isValidEmail(email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please provide a valid email address' 
        },
        { status: 400 }
      );
    }

    // Send password reset email (this will return true even if user doesn't exist for security)
    const emailSent = await AuthUtils.sendPasswordResetEmail(email);

    if (!emailSent) {
      console.error('Failed to send password reset email for:', email);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    }, { status: 200 });

  } catch (error) {
    console.error('Password reset request error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An internal error occurred. Please try again later.' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/password-reset
 * Complete password reset with token and new password
 */
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (RateLimitUtils.isRateLimited(`password-reset-confirm:${clientIP}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many password reset attempts. Please try again later.' 
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body: PasswordResetConfirm = await request.json();
    
    if (!body.email || !body.token || !body.newPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email, token, and new password are required' 
        },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const email = ValidationUtils.sanitizeInput(body.email).toLowerCase();
    const token = ValidationUtils.sanitizeInput(body.token);

    // Validate email format
    if (!ValidationUtils.isValidEmail(email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please provide a valid email address' 
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = PasswordUtils.validatePassword(body.newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password requirements not met',
          details: passwordValidation.errors
        },
        { status: 400 }
      );
    }

    // Verify the reset token
    const isValidToken = await TokenUtils.verifyAndConsumeToken(
      email, 
      token, 
      'password-reset'
    );

    if (!isValidToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired reset token. Please request a new password reset.' 
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await AuthUtils.findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account not found' 
        },
        { status: 404 }
      );
    }

    // Update password
    const passwordUpdated = await AuthUtils.updateUserPassword(email, body.newPassword);

    if (!passwordUpdated) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update password. Please try again.' 
        },
        { status: 500 }
      );
    }

    // Reset rate limit on successful password reset
    RateLimitUtils.resetRateLimit(`password-reset-confirm:${clientIP}`);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    }, { status: 200 });

  } catch (error) {
    console.error('Password reset confirm error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An internal error occurred. Please try again later.' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/password-reset?token=...&email=...
 * Verify if a password reset token is valid (for frontend validation)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email || !token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email and token are required' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    if (!ValidationUtils.isValidEmail(email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email format' 
        },
        { status: 400 }
      );
    }

    // Check if token is valid (without consuming it)
    const now = new Date();
    const { db } = await import('@/lib/db/connection');
    const { verificationTokens } = await import('@/lib/db/schema');
    const { eq, and, gt } = await import('drizzle-orm');
    
    const tokenRecord = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, `${email.toLowerCase()}:password-reset`),
          eq(verificationTokens.token, token),
          gt(verificationTokens.expires, now)
        )
      )
      .limit(1);

    const isValid = tokenRecord.length > 0;

    return NextResponse.json({
      success: true,
      valid: isValid,
      message: isValid 
        ? 'Reset token is valid' 
        : 'Reset token is invalid or expired',
    }, { status: 200 });

  } catch (error) {
    console.error('Token validation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An internal error occurred' 
      },
      { status: 500 }
    );
  }
} 