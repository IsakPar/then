import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from './db/connection'
import { users, accounts, bookings } from './db/schema'
import { eq, desc } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

// Extend NextAuth types
declare module 'next-auth' {
  interface User {
    id: string
    role: string
  }
  
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password provider
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Find user by email
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email),
          with: {
            accounts: true
          }
        })

        if (!user) {
          return null
        }

        // Check if user has email/password account
        const emailAccount = user.accounts.find(account => account.provider === 'email')
        if (!emailAccount) {
          return null
        }

        // Verify password (stored in provider_account_id for email accounts)
        const isPasswordValid = await bcrypt.compare(credentials.password, emailAccount.providerAccountId)
        
        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      }
    }),

    // Google OAuth provider - only include if both client ID and secret are available
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),

    // Apple OAuth provider  
    {
      id: 'apple',
      name: 'Apple',
      type: 'oauth',
      authorization: {
        url: 'https://appleid.apple.com/auth/authorize',
        params: {
          scope: 'name email',
          response_mode: 'form_post',
        },
      },
      token: 'https://appleid.apple.com/auth/token',
      userinfo: {
        url: 'https://appleid.apple.com/auth/userinfo',
        async request({ tokens }: any) {
          // Apple doesn't provide user info endpoint, we get it from the ID token
          if (tokens.id_token) {
            const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString())
            return {
              sub: payload.sub,
              email: payload.email,
              email_verified: payload.email_verified,
              name: payload.name || null,
            }
          }
          return {}
        },
      },
      client: {
        id: process.env.APPLE_CLIENT_ID || '',
        secret: process.env.APPLE_CLIENT_SECRET || '',
      },
      profile(profile: any) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: null,
          role: 'customer',
        }
      },
    },
  ],
  
  pages: {
    signIn: '/auth/signin',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle OAuth sign-ins (Google, Apple)
      if (account?.provider === 'google' || account?.provider === 'apple') {
        try {
          // Check if user exists
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, user.email!),
          })

          if (!existingUser) {
            // Create new user
            const [newUser] = await db.insert(users).values({
              email: user.email!,
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
              role: 'customer',
            }).returning()

            // Create OAuth account record
            await db.insert(accounts).values({
              userId: newUser.id,
              type: 'oauth',
              provider: account.provider as any,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            })

            // Update user object for JWT
            user.id = newUser.id
            user.role = newUser.role
          } else {
            // Update user object for JWT
            user.id = existingUser.id
            user.role = existingUser.role
          }
        } catch (error) {
          console.error('Error handling OAuth sign-in:', error)
          return false
        }
      }

      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role || 'customer'
      }
      return token
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },

  events: {
    async signIn({ user, account }) {
      console.log(`User ${user.email} signed in with ${account?.provider}`)
    },
  },

  debug: process.env.NODE_ENV === 'development',
}

// Helper function to create a new user with email/password
export async function createUserWithPassword(email: string, password: string, name?: string) {
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      throw new Error('User already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      name: name || null,
      emailVerified: new Date(), // Auto-verify for demo purposes
      role: 'customer',
    }).returning()

    // Create email account record with hashed password
    await db.insert(accounts).values({
      userId: newUser.id,
      type: 'credentials',
      provider: 'email',
      providerAccountId: hashedPassword, // Store hashed password here
    })

    return newUser
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

// Helper function to check if user exists
export async function getUserByEmail(email: string) {
  return await db.query.users.findFirst({
    where: eq(users.email, email),
  })
}

// Helper function to get user bookings
export async function getUserBookings(userId: string) {
  return await db.query.bookings.findMany({
    where: eq(bookings.userId, userId),
    with: {
      show: {
        with: {
          venue: true
        }
      },
      bookingSeats: {
        with: {
          seat: {
            with: {
              section: true
            }
          }
        }
      }
    },
    orderBy: desc(bookings.createdAt)
  })
}

 