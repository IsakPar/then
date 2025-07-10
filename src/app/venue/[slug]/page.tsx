'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import QrScanner from 'qr-scanner'

interface Venue {
  id: string
  name: string
  slug: string
  address: string | null
  description: string | null
  defaultSeatMapId: string | null
  createdAt: Date
  updatedAt: Date
}

interface VenueStats {
  totalShows: number
  activeShows: number
  totalBookings: number
  totalRevenue: number
}

interface Show {
  id: string
  title: string
  description: string | null
  date: string
  time: string
  imageUrl: string | null
  isActive: boolean
  createdAt: Date
}

interface Booking {
  booking: {
    id: string
    customerName: string
    customerEmail: string
    validationCode: string
    totalAmountPence: number
    status: string
    createdAt: Date
  }
  show: {
    id: string
    title: string
    date: string
    time: string
  }
  seatCount: number
}

interface TicketValidation {
  booking: {
    id: string
    customerName: string
    customerEmail: string
    validationCode: string
    totalAmountPence: number
    status: string
  }
  show: {
    id: string
    title: string
    date: string
    time: string
    venueName: string
  }
  seats: number
}

export default function VenueSlugPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [venue, setVenue] = useState<Venue | null>(null)
  const [stats, setStats] = useState<VenueStats | null>(null)
  const [shows, setShows] = useState<Show[]>([])
  const [todaysBookings, setTodaysBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Ticket verification state
  const [validationCode, setValidationCode] = useState('')
  const [validationResult, setValidationResult] = useState<TicketValidation | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validatingTicket, setValidatingTicket] = useState(false)
  const [validatedTickets, setValidatedTickets] = useState<Set<string>>(new Set())

  // Camera/QR scanning state
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'verification' | 'shows' | 'bookings'>('dashboard')

  useEffect(() => {
    if (slug) {
      loadVenueData()
    }
  }, [slug])

  const loadVenueData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🏛️ Loading venue data for slug: ${slug}`)

      // Load venue by slug
      const venueResponse = await fetch(`/api/venues/slug/${slug}`)
      if (!venueResponse.ok) {
        console.error(`❌ Venue API error: ${venueResponse.status} ${venueResponse.statusText}`)
        if (venueResponse.status === 404) {
          setError(`Venue with slug "${slug}" not found. Please check the URL or create this venue first.`)
        } else {
          throw new Error(`Failed to load venue (${venueResponse.status})`)
        }
        return
      }
      
      const venueData = await venueResponse.json()
      console.log('✅ Venue loaded:', venueData)
      setVenue(venueData)

      // Load venue stats
      console.log(`📊 Loading stats for venue: ${venueData.id}`)
      const statsResponse = await fetch(`/api/venues/${venueData.id}/stats`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        console.log('✅ Stats loaded:', statsData)
        setStats(statsData)
      } else {
        console.warn(`⚠️ Failed to load stats: ${statsResponse.status}`)
      }

      // Load venue shows
      console.log(`🎭 Loading shows for venue: ${venueData.id}`)
      const showsResponse = await fetch(`/api/venues/${venueData.id}/shows`)
      if (showsResponse.ok) {
        const showsData = await showsResponse.json()
        console.log(`✅ Shows loaded: ${showsData.length} shows`)
        setShows(showsData)
      } else {
        console.warn(`⚠️ Failed to load shows: ${showsResponse.status}`)
      }

      // Load today's bookings
      console.log(`🎫 Loading today's bookings for venue: ${venueData.id}`)
      const bookingsResponse = await fetch(`/api/venues/${venueData.id}/bookings/today`)
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        console.log(`✅ Bookings loaded: ${bookingsData.length} bookings`)
        setTodaysBookings(bookingsData)
      } else {
        console.warn(`⚠️ Failed to load bookings: ${bookingsResponse.status}`)
      }

    } catch (error) {
      console.error('❌ Error loading venue data:', error)
      setError('Failed to load venue data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const validateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!venue || !validationCode.trim()) return

    setValidatingTicket(true)
    setValidationError(null)
    setValidationResult(null)

    try {
      const response = await fetch(`/api/venues/${venue.id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ validationCode: validationCode.trim().toUpperCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setValidationError(data.error || 'Invalid verification code')
        return
      }

      if (validatedTickets.has(validationCode.trim().toUpperCase())) {
        setValidationError('⚠️ This ticket has already been validated')
        return
      }

      setValidationResult(data)
      setValidatedTickets(prev => new Set([...prev, validationCode.trim().toUpperCase()]))
      setValidationCode('')
      
      // Show success message
      setTimeout(() => {
        setValidationResult(null)
      }, 5000) // Clear result after 5 seconds

    } catch (error) {
      console.error('Error validating ticket:', error)
      setValidationError('Failed to validate ticket. Please try again.')
    } finally {
      setValidatingTicket(false)
    }
  }

  // Camera and QR scanning functions
  const startCamera = async () => {
    try {
      setIsCameraOpen(true)
      setIsScanning(true)
      setValidationError(null)

      if (!videoRef.current) {
        throw new Error('Video element not found')
      }

      // Initialize QR Scanner
      const qrScanner = new QrScanner(
        videoRef.current,
        (result: string) => {
          // QR code detected
          console.log('📷 QR Code detected:', result)
          const code = result.trim().toUpperCase()
          setValidationCode(code)
          stopCamera()
          
          // Auto-validate the scanned code if it looks like a validation code
          if (code && code.length >= 8) {
            // Trigger validation after a short delay
            setTimeout(() => {
              const form = document.querySelector('form[data-validation-form]') as HTMLFormElement
              if (form) {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
              }
            }, 500)
          }
        }
      )

      // Scanner initialized with basic options

      qrScannerRef.current = qrScanner
      await qrScanner.start()
      
    } catch (error) {
      console.error('Error starting camera:', error)
      setValidationError('Failed to access camera. Please check permissions.')
      setIsCameraOpen(false)
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      qrScannerRef.current.destroy()
      qrScannerRef.current = null
    }
    setIsCameraOpen(false)
    setIsScanning(false)
  }

  // Cleanup camera on component unmount or tab change
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'verification') {
      stopCamera()
    }
  }, [activeTab])

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5) // HH:MM format
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading venue dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={() => router.push('/venue')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            ← Back to Venues
          </button>
        </div>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Venue not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{venue.name}</h1>
            <p className="text-gray-300">{venue.address}</p>
            {venue.description && (
              <p className="text-gray-400 text-sm mt-1">{venue.description}</p>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/venue')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg border border-white/20 text-white transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Venues
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg border border-white/20 text-white transition-all duration-200"
            >
              🏠 Home
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 text-center">
              <div className="text-3xl font-bold text-white">{stats.totalShows}</div>
              <div className="text-sm text-gray-300">Total Shows</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 text-center">
              <div className="text-3xl font-bold text-white">{stats.activeShows}</div>
              <div className="text-sm text-gray-300">Active Shows</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 text-center">
              <div className="text-3xl font-bold text-white">{stats.totalBookings}</div>
              <div className="text-sm text-gray-300">Total Bookings</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 text-center">
              <div className="text-3xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</div>
              <div className="text-sm text-gray-300">Total Revenue</div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 mb-6">
          <nav className="flex space-x-8 px-6 py-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'verification'
                  ? 'border-green-400 text-green-300'
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
              }`}
            >
              ✅ Ticket Verification
            </button>
            <button
              onClick={() => setActiveTab('shows')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'shows'
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
              }`}
            >
              🎭 Shows ({shows.length})
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'bookings'
                  ? 'border-yellow-400 text-yellow-300'
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
              }`}
            >
              🎫 Today's Bookings ({todaysBookings.length})
            </button>
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Today's Shows Quick Overview */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Today's Activity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-300 mb-3">Shows Today</h3>
                  {shows.filter(show => {
                    const today = new Date().toISOString().split('T')[0]
                    return show.date === today && show.isActive
                  }).length === 0 ? (
                    <p className="text-gray-400">No shows scheduled for today</p>
                  ) : (
                    <div className="space-y-2">
                      {shows.filter(show => {
                        const today = new Date().toISOString().split('T')[0]
                        return show.date === today && show.isActive
                      }).map(show => (
                        <div key={show.id} className="text-sm text-gray-300">
                          <span className="font-medium">{show.title}</span> at {formatTime(show.time)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-300 mb-3">Tickets Sold Today</h3>
                  <div className="text-2xl font-bold text-white">{todaysBookings.length}</div>
                  <div className="text-sm text-gray-400">
                    {todaysBookings.reduce((sum, booking) => sum + booking.seatCount, 0)} seats booked
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('verification')}
                  className="p-4 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-white transition-colors"
                >
                  <div className="text-2xl mb-2">✅</div>
                  <div className="font-medium">Verify Ticket</div>
                  <div className="text-sm text-gray-300">Check customer entry</div>
                </button>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className="p-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-white transition-colors"
                >
                  <div className="text-2xl mb-2">🎫</div>
                  <div className="font-medium">View Door List</div>
                  <div className="text-sm text-gray-300">Today's bookings</div>
                </button>
                <button
                  onClick={() => setActiveTab('shows')}
                  className="p-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-white transition-colors"
                >
                  <div className="text-2xl mb-2">🎭</div>
                  <div className="font-medium">Manage Shows</div>
                  <div className="text-sm text-gray-300">View all shows</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Verification Tab */}
        {activeTab === 'verification' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Ticket Verification</h2>
              
              <form onSubmit={validateTicket} data-validation-form className="mb-6">
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={validationCode}
                      onChange={(e) => setValidationCode(e.target.value.toUpperCase())}
                      placeholder="Enter verification code (e.g., ABC123DEF)"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg tracking-wider"
                      maxLength={20}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={validatingTicket || !validationCode.trim()}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {validatingTicket ? 'Validating...' : 'Verify'}
                  </button>
                </div>
                
                {/* Camera Controls */}
                <div className="flex gap-2 justify-center">
                  {!isCameraOpen ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      📷 Scan QR Code
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    >
                      ❌ Stop Camera
                    </button>
                  )}
                </div>
                
                {/* Camera Video Feed */}
                {isCameraOpen && (
                  <div className="mt-4 flex justify-center">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        className="w-80 h-60 object-cover"
                        style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
                      />
                      {isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-48 h-48 border-2 border-green-400 border-dashed rounded-lg flex items-center justify-center">
                            <div className="text-white text-center">
                              <div className="text-2xl mb-2">📱</div>
                              <div className="text-sm">Point camera at QR code</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>

              {/* Validation Result */}
              {validationResult && (
                <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">✅</span>
                    <span className="text-lg font-semibold text-green-300">Valid Ticket!</span>
                  </div>
                  <div className="text-white space-y-1">
                    <p><strong>Show:</strong> {validationResult.show.title}</p>
                    <p><strong>Date:</strong> {formatDate(validationResult.show.date)} at {formatTime(validationResult.show.time)}</p>
                    <p><strong>Customer:</strong> {validationResult.booking.customerName}</p>
                    <p><strong>Email:</strong> {validationResult.booking.customerEmail}</p>
                    <p><strong>Seats:</strong> {validationResult.seats}</p>
                    <p><strong>Total Paid:</strong> {formatCurrency(validationResult.booking.totalAmountPence)}</p>
                  </div>
                </div>
              )}

              {/* Validation Error */}
              {validationError && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">❌</span>
                    <span className="font-medium">{validationError}</span>
                  </div>
                </div>
              )}

              {/* Validated Tickets List */}
              {validatedTickets.size > 0 && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-3">Recently Validated ({validatedTickets.size})</h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(validatedTickets).map(code => (
                      <span
                        key={code}
                        className="px-3 py-1 bg-green-600/30 text-green-200 rounded-full text-sm font-mono"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shows Tab */}
        {activeTab === 'shows' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">All Shows</h2>
            </div>
            
            {shows.length === 0 ? (
              <div className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="text-4xl mb-4">🎭</div>
                <h3 className="text-lg font-semibold text-white mb-2">No shows for this venue</h3>
                <p className="text-gray-300 text-sm">Shows will appear here when they are created</p>
              </div>
            ) : (
              shows.map(show => (
                <div key={show.id} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{show.title}</h3>
                      <div className="space-y-1 text-sm text-gray-300">
                        <p><span className="font-medium">Date:</span> {formatDate(show.date)}</p>
                        <p><span className="font-medium">Time:</span> {formatTime(show.time)}</p>
                        {show.description && (
                          <p><span className="font-medium">Description:</span> {show.description}</p>
                        )}
                        <p>
                          <span className="font-medium">Status:</span>{' '}
                          <span className={show.isActive ? 'text-green-400' : 'text-red-400'}>
                            {show.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/show/${show.id}/seats`)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        View Seats
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Today's Bookings</h2>
              <div className="text-sm text-gray-300">
                {todaysBookings.length} bookings • {todaysBookings.reduce((sum, booking) => sum + booking.seatCount, 0)} seats
              </div>
            </div>
            
            {todaysBookings.length === 0 ? (
              <div className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="text-4xl mb-4">🎫</div>
                <h3 className="text-lg font-semibold text-white mb-2">No bookings for today</h3>
                <p className="text-gray-300 text-sm">Bookings for today's shows will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysBookings.map(({ booking, show, seatCount }) => (
                  <div key={booking.id} className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white">{booking.customerName}</h3>
                          <span className="px-2 py-1 bg-blue-600/30 text-blue-200 rounded text-xs font-mono">
                            {booking.validationCode}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-300">
                          <p><span className="font-medium">Show:</span> {show.title}</p>
                          <p><span className="font-medium">Time:</span> {formatTime(show.time)}</p>
                          <p><span className="font-medium">Email:</span> {booking.customerEmail}</p>
                          <p><span className="font-medium">Seats:</span> {seatCount}</p>
                          <p><span className="font-medium">Total:</span> {formatCurrency(booking.totalAmountPence)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          validatedTickets.has(booking.validationCode) 
                            ? 'bg-green-600/30 text-green-200' 
                            : 'bg-gray-600/30 text-gray-300'
                        }`}>
                          {validatedTickets.has(booking.validationCode) ? '✅ Verified' : '⏳ Pending'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 