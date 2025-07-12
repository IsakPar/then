import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { eq, and, gt } from 'drizzle-orm';
import { db } from './db/connection';
import { users, verificationTokens } from './db/schema';
import { emailService } from './email';

/**
 * Password utility functions
 */
export class PasswordUtils {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Token utility functions
 */
export class TokenUtils {
  /**
   * Generate a secure random token
   */
  static generateToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate a short verification code (for mobile display)
   */
  static generateVerificationCode(length: number = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a verification token in the database
   */
  static async createVerificationToken(
    email: string,
    type: 'email-verification' | 'password-reset',
    expirationMinutes: number = 15
  ): Promise<string> {
    const token = this.generateToken();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + expirationMinutes);

    // Clean up any existing tokens for this email and type
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, `${email}:${type}`));

    // Create new token
    await db
      .insert(verificationTokens)
      .values({
        identifier: `${email}:${type}`,
        token,
        expires,
      });

    return token;
  }

  /**
   * Verify and consume a token
   */
  static async verifyAndConsumeToken(
    email: string,
    token: string,
    type: 'email-verification' | 'password-reset'
  ): Promise<boolean> {
    const now = new Date();
    
    // Find valid token
    const tokenRecord = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, `${email}:${type}`),
          eq(verificationTokens.token, token),
          gt(verificationTokens.expires, now)
        )
      )
      .limit(1);

    if (tokenRecord.length === 0) {
      return false;
    }

    // Token is valid, delete it (one-time use)
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, `${email}:${type}`),
          eq(verificationTokens.token, token)
        )
      );

    return true;
  }

  /**
   * Clean up expired tokens
   */
  static async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    await db
      .delete(verificationTokens)
      .where(
        gt(verificationTokens.expires, now)
      );
  }
}

/**
 * User authentication functions
 */
export class AuthUtils {
  /**
   * Find user by email
   */
  static async findUserByEmail(email: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a new user
   */
  static async createUser(
    email: string,
    password: string,
    name: string,
    role: 'customer' | 'venue' | 'admin' = 'customer'
  ) {
    const hashedPassword = await PasswordUtils.hashPassword(password);
    const now = new Date();

    const result = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        name,
        passwordHash: hashedPassword,
        role,
        emailVerified: null, // Will be set when email is verified
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return result[0];
  }

  /**
   * Authenticate user with email and password
   */
  static async authenticateUser(email: string, password: string) {
    const user = await this.findUserByEmail(email);

    if (!user || !user.passwordHash) {
      return null;
    }

    const isValidPassword = await PasswordUtils.verifyPassword(password, user.passwordHash);
    
    if (!isValidPassword) {
      return null;
    }

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user password
   */
  static async updateUserPassword(email: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await PasswordUtils.hashPassword(newPassword);
    
    const result = await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email.toLowerCase()))
      .returning();

    return result.length > 0;
  }

  /**
   * Mark user email as verified
   */
  static async markEmailVerified(email: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({
        emailVerified: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.email, email.toLowerCase()))
      .returning();

    return result.length > 0;
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string): Promise<boolean> {
    const user = await this.findUserByEmail(email);
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return true;
    }

    try {
      const resetToken = await TokenUtils.createVerificationToken(
        email,
        'password-reset',
        15 // 15 minutes expiration
      );

      const emailSent = await emailService.sendPasswordReset(
        email,
        resetToken,
        user.name || undefined
      );

      return emailSent;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification(email: string): Promise<boolean> {
    const user = await this.findUserByEmail(email);
    
    if (!user) {
      return false;
    }

    try {
      const verificationToken = await TokenUtils.createVerificationToken(
        email,
        'email-verification',
        60 * 24 // 24 hours expiration
      );

      const emailSent = await emailService.sendEmailVerification(
        email,
        verificationToken,
        user.name || undefined
      );

      return emailSent;
    } catch (error) {
      console.error('Failed to send email verification:', error);
      return false;
    }
  }
}

/**
 * Input validation functions
 */
export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize and validate user input
   */
  static sanitizeInput(input: string): string {
    return input.trim();
  }

  /**
   * Validate name format
   */
  static isValidName(name: string): boolean {
    return name.trim().length >= 2 && name.trim().length <= 100;
  }

  /**
   * Validate role
   */
  static isValidRole(role: string): role is 'customer' | 'venue' | 'admin' {
    return ['customer', 'venue', 'admin'].includes(role);
  }
}

/**
 * Rate limiting utilities
 */
export class RateLimitUtils {
  private static attempts = new Map<string, { count: number; firstAttempt: number }>();

  /**
   * Check if request should be rate limited
   */
  static isRateLimited(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt) {
      this.attempts.set(identifier, { count: 1, firstAttempt: now });
      return false;
    }

    // Reset window if enough time has passed
    if (now - attempt.firstAttempt > windowMs) {
      this.attempts.set(identifier, { count: 1, firstAttempt: now });
      return false;
    }

    // Increment attempt count
    attempt.count++;

    // Check if limit exceeded
    return attempt.count > maxAttempts;
  }

  /**
   * Reset rate limit for identifier
   */
  static resetRateLimit(identifier: string): void {
    this.attempts.delete(identifier);
  }
} 