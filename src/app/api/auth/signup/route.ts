import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { 
  AuthUtils, 
  PasswordUtils, 
  ValidationUtils, 
  RateLimitUtils 
} from '@/lib/auth-utils';
import { emailService } from '@/lib/email';

interface SignupRequest {
  email: string;
  password: string;
  name: string;
  role?: 'customer' | 'venue' | 'admin';
}

// JWT secret and algorithm
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
const JWT_ALGORITHM = 'HS256';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (RateLimitUtils.isRateLimited(`signup:${clientIP}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many signup attempts. Please try again later.' 
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body: SignupRequest = await request.json();
    
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email, password, and name are required' 
        },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const email = ValidationUtils.sanitizeInput(body.email).toLowerCase();
    const name = ValidationUtils.sanitizeInput(body.name);
    
    // SECURITY: Mobile app can only create customer accounts
    // All other roles must be created by administrators via CMS
    const isMobileApp = request.headers.get('x-mobile-app') === 'true';
    let role = body.role || 'customer';
    
    if (isMobileApp && role !== 'customer') {
      console.log(`🔒 Security: Mobile app attempted to create ${role} account, forcing to customer`);
      role = 'customer';
    }

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

    // Validate name
    if (!ValidationUtils.isValidName(name)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name must be between 2 and 100 characters' 
        },
        { status: 400 }
      );
    }

    // Validate role
    if (!ValidationUtils.isValidRole(role)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid role specified' 
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = PasswordUtils.validatePassword(body.password);
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

    // Check if user already exists
    const existingUser = await AuthUtils.findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'An account with this email already exists' 
        },
        { status: 409 }
      );
    }

    // Create user account
    const newUser = await AuthUtils.createUser(email, body.password, name, role);

    // Send email verification
    const emailSent = await AuthUtils.sendEmailVerification(email);

    // Send welcome email
    const welcomeEmailSent = await emailService.sendWelcomeEmail(email, name, role);

    // Create JWT token for automatic login after signup
    const token = await new SignJWT({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
      emailVerified: newUser.emailVerified ? newUser.emailVerified.toISOString() : null,
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime('7d') // Token expires in 7 days
      .setIssuer('lastminutelive')
      .setAudience('lastminutelive-mobile')
      .sign(JWT_SECRET);

    // Reset rate limit on successful signup
    RateLimitUtils.resetRateLimit(`signup:${clientIP}`);

    // Return success response (don't include sensitive data)
    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        emailVerified: newUser.emailVerified,
      },
      token, // Include JWT token for automatic login
      emailSent,
      welcomeEmailSent,
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An internal error occurred. Please try again later.' 
      },
      { status: 500 }
    );
  }
} 