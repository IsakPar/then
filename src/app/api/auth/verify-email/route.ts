import { NextRequest, NextResponse } from 'next/server';
import { 
  AuthUtils, 
  ValidationUtils, 
  RateLimitUtils,
  TokenUtils
} from '@/lib/auth-utils';

interface ResendVerificationRequest {
  email: string;
}

/**
 * GET /api/auth/verify-email?token=...&email=...
 * Verify email address with token from email link
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
          error: 'Email and verification token are required' 
        },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const cleanEmail = ValidationUtils.sanitizeInput(email).toLowerCase();
    const cleanToken = ValidationUtils.sanitizeInput(token);

    // Validate email format
    if (!ValidationUtils.isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email format' 
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await AuthUtils.findUserByEmail(cleanEmail);
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account not found' 
        },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email address is already verified',
        alreadyVerified: true,
      }, { status: 200 });
    }

    // Verify and consume the token
    const isValidToken = await TokenUtils.verifyAndConsumeToken(
      cleanEmail, 
      cleanToken, 
      'email-verification'
    );

    if (!isValidToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired verification token. Please request a new verification email.' 
        },
        { status: 400 }
      );
    }

    // Mark email as verified
    const emailVerified = await AuthUtils.markEmailVerified(cleanEmail);

    if (!emailVerified) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to verify email. Please try again.' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email address has been verified successfully! You can now sign in.',
      verified: true,
    }, { status: 200 });

  } catch (error) {
    console.error('Email verification error:', error);
    
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
 * POST /api/auth/verify-email
 * Resend email verification email
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (RateLimitUtils.isRateLimited(`verify-email:${clientIP}`, 3, 15 * 60 * 1000)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many verification email requests. Please try again later.' 
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body: ResendVerificationRequest = await request.json();
    
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

    // Check if user exists
    const user = await AuthUtils.findUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists and is not verified, a verification email has been sent.',
      }, { status: 200 });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email address is already verified',
        alreadyVerified: true,
      }, { status: 200 });
    }

    // Send verification email
    const emailSent = await AuthUtils.sendEmailVerification(email);

    if (!emailSent) {
      console.error('Failed to send verification email for:', email);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send verification email. Please try again later.' 
        },
        { status: 500 }
      );
    }

    // Reset rate limit on successful email send
    RateLimitUtils.resetRateLimit(`verify-email:${clientIP}`);

    return NextResponse.json({
      success: true,
      message: 'Verification email has been sent. Please check your inbox.',
    }, { status: 200 });

  } catch (error) {
    console.error('Resend verification email error:', error);
    
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
 * PUT /api/auth/verify-email
 * Check verification status for an email (for frontend)
 */
export async function PUT(request: NextRequest) {
  try {
    // Parse and validate request body
    const body: ResendVerificationRequest = await request.json();
    
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
          error: 'Invalid email format' 
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

    return NextResponse.json({
      success: true,
      verified: !!user.emailVerified,
      verifiedAt: user.emailVerified,
      message: user.emailVerified 
        ? 'Email is verified' 
        : 'Email is not verified',
    }, { status: 200 });

  } catch (error) {
    console.error('Check verification status error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An internal error occurred' 
      },
      { status: 500 }
    );
  }
} 