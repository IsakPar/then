import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { 
  AuthUtils, 
  ValidationUtils, 
  RateLimitUtils 
} from '@/lib/auth-utils';
import { randomBytes } from 'crypto';

interface GuestSessionRequest {
  email: string;
  deviceInfo: {
    platform?: string;
    version?: string;
    device?: string;
    [key: string]: any;
  };
}

interface GuestSessionResponse {
  success: boolean;
  sessionToken?: string;
  userId?: string;
  expiresAt?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    isGuest: boolean;
  };
  error?: string;
}

// JWT secret and algorithm
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
const JWT_ALGORITHM = 'HS256';

export async function POST(request: NextRequest): Promise<NextResponse<GuestSessionResponse>> {
  console.log('🎭 Guest session endpoint hit');
  
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.log('🌐 Guest session request from IP:', clientIP);
    
    if (RateLimitUtils.isRateLimited(`guest-session:${clientIP}`, 20, 15 * 60 * 1000)) {
      console.log('⚠️ Rate limited guest session creation:', clientIP);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many guest session attempts. Please try again later.' 
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    let body: GuestSessionRequest;
    try {
      console.log('📝 Parsing guest session request...');
      body = await request.json();
      console.log('✅ Request parsed:', { 
        email: body.email, 
        hasDeviceInfo: !!body.deviceInfo 
      });
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request format' 
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.email) {
      console.error('❌ Missing email in guest session request');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email is required for guest session' 
        },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const email = ValidationUtils.sanitizeInput(body.email).toLowerCase();
    
    // Validate email format
    if (!ValidationUtils.isValidEmail(email)) {
      console.error('❌ Invalid email format:', email);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please provide a valid email address' 
        },
        { status: 400 }
      );
    }

    console.log('🔍 Creating guest session for:', email);

    // Check if user already exists as registered user
    const existingUser = await AuthUtils.findUserByEmail(email);
    
    let dbUser;
    if (existingUser) {
      console.log('👤 Found existing user, using existing account');
      dbUser = existingUser;
    } else {
      console.log('👤 Creating new guest user account');
      
      // Create guest user with temporary password
      const tempPassword = randomBytes(32).toString('hex');
      const guestName = email.split('@')[0]; // Use email prefix as name
      
      try {
        dbUser = await AuthUtils.createUser(email, tempPassword, guestName, 'customer');
        console.log('✅ Created guest user:', dbUser.email);
      } catch (createError) {
        console.error('❌ Failed to create guest user:', createError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to create guest session' 
          },
          { status: 500 }
        );
      }
    }

    // Calculate session expiration (24 hours for guest sessions)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create JWT token for guest session
    console.log('🔑 Generating guest session token...');
    const sessionToken = await new SignJWT({
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      name: dbUser.name,
      isGuest: true,
      sessionType: 'guest',
      deviceInfo: body.deviceInfo || {}
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime('24h') // Guest sessions expire in 24 hours
      .setIssuer('lastminutelive')
      .setAudience('lastminutelive-mobile')
      .sign(JWT_SECRET);

    // Log successful guest session creation
    console.log('✅ Guest session created successfully for:', email);

    // Reset rate limit on success
    RateLimitUtils.resetRateLimit(`guest-session:${clientIP}`);

    // Return success response
    return NextResponse.json({
      success: true,
      sessionToken,
      userId: dbUser.id,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        isGuest: true
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Guest session creation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An internal error occurred while creating guest session' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to validate guest session
export async function GET(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No guest session token provided' 
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // For now, just return a simple validation response
    // TODO: Implement full token verification when needed
    return NextResponse.json({
      success: true,
      message: 'Guest session endpoint is working',
      hasToken: !!token,
    });

  } catch (error) {
    console.error('Guest session validation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An internal error occurred' 
      },
      { status: 500 }
    );
  }
} 