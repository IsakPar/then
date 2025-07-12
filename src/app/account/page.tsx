'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
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
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    loadUserBookings()
  }, [session, status, router])

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

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to signin
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