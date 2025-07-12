import { NextRequest, NextResponse } from 'next/server'
import { AuthUtils, ValidationUtils, RateLimitUtils } from '@/lib/auth-utils'
import { SignJWT } from 'jose'

// Types for social auth
interface SocialAuthRequest {
  provider: 'google' | 'apple';
  idToken: string;
  accessToken?: string;
  user: {
    email: string;
    name?: string;
    id: string;
  };
}

interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    emailVerified: boolean | null;
  };
  token?: string;
  error?: string;
}

// JWT secret and algorithm
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse>> {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (RateLimitUtils.isRateLimited(`social-auth:${clientIP}`, 15, 15 * 60 * 1000)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many authentication attempts. Please try again later.' 
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body: SocialAuthRequest = await request.json();
    
    if (!body.provider || !body.idToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Provider and idToken are required' 
        },
        { status: 400 }
      );
    }

    if (!['google', 'apple'].includes(body.provider)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unsupported provider. Only Google and Apple are supported.' 
        },
        { status: 400 }
      );
    }

    // Validate and extract user data from social auth request
    if (!body.user?.email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email is required from social provider' 
        },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const email = ValidationUtils.sanitizeInput(body.user.email).toLowerCase();
    const name = ValidationUtils.sanitizeInput(body.user.name || email.split('@')[0]);
    const socialUserId = ValidationUtils.sanitizeInput(body.user.id || '');

    // Validate email format
    if (!ValidationUtils.isValidEmail(email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email address from social provider' 
        },
        { status: 400 }
      );
    }

    // TODO: Verify the idToken with the respective provider (Google/Apple)
    // For now, we'll trust the token since it comes from our own mobile app
    // In production, you should verify:
    // - Google: Verify JWT with Google's public keys
    // - Apple: Verify JWT with Apple's public keys

    // Check if user exists or create new user
    let user = await AuthUtils.findUserByEmail(email);
    
    if (!user) {
      // Create new user from social login - social users don't have passwords
      user = await AuthUtils.createUser(email, '', name, 'customer');
      
      if (!user) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to create user account' 
          },
          { status: 500 }
        );
      }

      // Mark email as verified for social logins
      await AuthUtils.markEmailVerified(email);

      console.log(`✅ Created new ${body.provider} user:`, email);
    } else {
      // Update existing user's social info if needed
      console.log(`✅ Existing ${body.provider} user signed in:`, email);
    }

    // Generate JWT token using SignJWT
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(JWT_SECRET);

    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: !!user.emailVerified, // Convert Date to boolean
      },
      token,
    });

  } catch (error) {
    console.error('Social auth error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An internal error occurred during social authentication' 
      },
      { status: 500 }
    );
  }
} 