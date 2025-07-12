import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { 
  AuthUtils, 
  ValidationUtils, 
  RateLimitUtils 
} from '@/lib/auth-utils';

interface SigninRequest {
  email: string;
  password: string;
}

interface SigninResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    emailVerified: Date | null;
  };
  token?: string;
}

// JWT secret and algorithm
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
const JWT_ALGORITHM = 'HS256';

export async function POST(request: NextRequest): Promise<NextResponse<SigninResponse>> {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (RateLimitUtils.isRateLimited(`signin:${clientIP}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many signin attempts. Please try again later.' 
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body: SigninRequest = await request.json();
    
    if (!body.email || !body.password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email and password are required' 
        },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const email = ValidationUtils.sanitizeInput(body.email).toLowerCase();
    const password = ValidationUtils.sanitizeInput(body.password);

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

    // Authenticate user
    const user = await AuthUtils.authenticateUser(email, password);
    
    if (!user) {
      // Don't reveal whether email exists or password is wrong for security
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email or password' 
        },
        { status: 401 }
      );
    }

    // Check if email is verified (optional - you can enforce this)
    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.emailVerified) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please verify your email before signing in',
          requiresVerification: true
        },
        { status: 403 }
      );
    }

    // Create JWT token
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime('7d') // Token expires in 7 days
      .setIssuer('lastminutelive')
      .setAudience('lastminutelive-mobile')
      .sign(JWT_SECRET);

    // Reset rate limit on successful signin
    RateLimitUtils.resetRateLimit(`signin:${clientIP}`);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Signed in successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      token,
    }, { status: 200 });

  } catch (error) {
    console.error('Signin error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An internal error occurred. Please try again later.' 
      },
      { status: 500 }
    );
  }
}

// Optional: Add a GET endpoint for testing authentication status
export async function GET(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No authentication token provided' 
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // For now, just return a simple response
    // TODO: Implement token verification when needed
    return NextResponse.json({
      success: true,
      message: 'Authentication endpoint is working',
      hasToken: !!token,
    });

  } catch (error) {
    console.error('Auth check error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An internal error occurred' 
      },
      { status: 500 }
    );
  }
} 