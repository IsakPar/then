'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface BookingDetails {
  id: string
  showTitle: string
  venueName: string
  date: string
  time: string
  status: string
  seats: {
    sectionName: string
    rowLetter: string
    seatNumber: number
    price: number
  }[]
  totalAmount: number
  createdAt: string
}

export default function AccountPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    
    if (session) {
      loadUserBookings()
    }
  }, [session, status])

  const loadUserBookings = async () => {
    try {
      const response = await fetch('/api/user/bookings')
      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }
      
      const data = await response.json()
      setBookings(data)
    } catch (error) {
      console.error('Error loading bookings:', error)
      setError('Failed to load your bookings')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string, timeString?: string) => {
    const date = new Date(dateString)
    const dateFormatted = date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    return timeString ? `${dateFormatted} at ${timeString}` : dateFormatted
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'from-green-500 to-emerald-500'
      case 'pending':
        return 'from-yellow-500 to-orange-500'
      case 'cancelled':
        return 'from-red-500 to-pink-500'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    try {
      await signIn(provider, { callbackUrl: '/account' })
    } catch (error) {
      console.error('OAuth sign-in failed:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    )
  }

  // Show beautiful login/signup interface for non-logged-in users
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-30">
          <div className="w-full h-full bg-white/5" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        {/* Floating theater elements */}
        <div className="absolute top-10 left-10 text-6xl opacity-20 animate-pulse">🎭</div>
        <div className="absolute top-20 right-20 text-4xl opacity-15 animate-bounce">🎪</div>
        <div className="absolute bottom-20 left-20 text-5xl opacity-10 animate-pulse">🎵</div>
        <div className="absolute bottom-10 right-10 text-3xl opacity-20 animate-bounce">🎼</div>

        <div className="relative z-10 max-w-lg mx-auto px-4 py-16 flex flex-col justify-center min-h-screen">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl shadow-2xl">
                <span className="text-3xl">🎭</span>
              </div>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">Welcome to Your Account</h1>
            <p className="text-purple-200 text-xl">
              Sign in to manage your tickets and bookings
            </p>
          </div>

          {/* Auth Options */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="space-y-4 mb-8">
              {/* Google Sign-In */}
              <button
                onClick={() => handleOAuthSignIn('google')}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Manual Sign In/Sign Up */}
              <div className="flex space-x-3">
                <Link
                  href="/auth/signin"
                  className="flex-1 bg-transparent border-2 border-white/30 hover:border-white/50 text-white font-semibold py-4 px-6 rounded-2xl text-center transition-all duration-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-2xl text-center transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Sign Up
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="text-purple-200 text-sm">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="underline hover:text-white">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-white">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          {/* Browse without account */}
          <div className="text-center mt-8">
            <p className="text-purple-300 mb-4">Want to browse shows first?</p>
            <Link 
              href="/" 
              className="inline-flex items-center text-white hover:text-purple-200 font-medium transition-colors"
            >
              <span className="mr-2">🎪</span>
              Explore All Shows
              <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-40">
        <div className="w-full h-full bg-white/5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl shadow-2xl">
              <span className="text-2xl">🎭</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">My Account</h1>
          <p className="text-purple-200 text-lg">Welcome back, {session.user?.name || session.user?.email?.split('@')[0] || 'User'}!</p>
        </div>

        {/* User Profile Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-2xl">
                {session.user?.name ? session.user.name[0].toUpperCase() : session.user?.email?.[0].toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {session.user?.name || 'User'}
              </h2>
              <p className="text-purple-200 text-lg">{session.user?.email}</p>
              <p className="text-purple-300 text-sm mt-2">
                Account Role: {session.user?.role === 'admin' ? 'Administrator' : 'Customer'}
              </p>
            </div>
          </div>
        </div>

        {/* Booking History */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">My Tickets</h2>
            <Link 
              href="/" 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200"
            >
              Browse Shows
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="text-white mt-4">Loading your bookings...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="text-red-400 mb-4">⚠️</div>
              <p className="text-red-200">{error}</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 rounded-3xl mb-6">
                <span className="text-4xl">🎫</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">No bookings yet</h3>
              <p className="text-purple-200 mb-6">Start exploring amazing shows and book your first tickets!</p>
              <Link 
                href="/" 
                className="inline-flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200"
              >
                <span className="mr-2">🎭</span>
                Browse Shows
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings.map((booking) => (
                <div key={booking.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{booking.showTitle}</h3>
                      <p className="text-purple-200">{booking.venueName}</p>
                      <p className="text-purple-300 text-sm">{formatDateTime(booking.date, booking.time)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getStatusColor(booking.status)}`}>
                        {booking.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/20 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-white mb-2">Seats</h4>
                        <div className="space-y-1">
                          {booking.seats.map((seat, index) => (
                            <div key={index} className="text-purple-200 text-sm">
                              {seat.sectionName} - Row {seat.rowLetter}, Seat {seat.seatNumber}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <h4 className="font-semibold text-white mb-2">Total</h4>
                        <div className="text-2xl font-bold text-white">
                          £{(booking.totalAmount / 100).toFixed(2)}
                        </div>
                        <div className="text-purple-300 text-sm mt-1">
                          Booked {new Date(booking.createdAt).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back to home */}
        <div className="text-center mt-8">
          <Link href="/" className="text-purple-300 hover:text-white text-sm font-medium transition-colors">
            ← Back to shows
          </Link>
        </div>
      </div>
    </div>
  )
} 