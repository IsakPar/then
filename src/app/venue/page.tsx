'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'


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

interface VenueWithStats {
  venue: Venue
  showCount: number
  activeShowCount: number
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

interface VenueStats {
  totalShows: number
  activeShows: number
  totalBookings: number
  totalRevenue: number
}

interface SeatMap {
  id: string
  name: string
  description: string | null
  totalCapacity: number
  createdAt: Date
}

interface SeatMapSection {
  id: string
  name: string
  displayName: string | null
  colorHex: string
  basePricePence: number
  basePriceFormatted: string
  seatPattern: any
  positionConfig: any
  isAccessible: boolean
  sortOrder: number
}

export default function VenuePage() {
  return <VenueDashboard />
}

function VenueDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'venues' | 'shows' | 'seatmaps'>('venues')
  const [previewSeatMapId, setPreviewSeatMapId] = useState<string | null>(null)
  const [showCreateSeatMapForm, setShowCreateSeatMapForm] = useState(false)
  const [seatMapSections, setSeatMapSections] = useState<SeatMapSection[]>([])
  const [loadingSections, setLoadingSections] = useState(false)
  const [venues, setVenues] = useState<VenueWithStats[]>([])
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null)
  const [venueShows, setVenueShows] = useState<Show[]>([])
  const [venueStats, setVenueStats] = useState<VenueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateVenueForm, setShowCreateVenueForm] = useState(false)
  const [showCreateShowForm, setShowCreateShowForm] = useState(false)
  const [seatMaps, setSeatMaps] = useState<SeatMap[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadVenues()
    loadSeatMaps()
  }, [])

  useEffect(() => {
    if (selectedVenue && activeTab === 'shows') {
      loadVenueDetails(selectedVenue)
    }
  }, [selectedVenue, activeTab])

  const loadVenues = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/venues')
      if (!response.ok) throw new Error('Failed to load venues')
      
      const data = await response.json()
      setVenues(data)
    } catch (error) {
      console.error('Error loading venues:', error)
      setError('Failed to load venues. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadSeatMaps = async () => {
    try {
      const response = await fetch('/api/seatmaps')
      if (!response.ok) throw new Error('Failed to load seat maps')
      
      const data = await response.json()
      setSeatMaps(data)
    } catch (error) {
      console.error('Error loading seat maps:', error)
    }
  }

  const loadSeatMapSections = async (seatMapId: string) => {
    try {
      setLoadingSections(true)
      const response = await fetch(`/api/seatmaps/${seatMapId}/sections`)
      if (!response.ok) throw new Error('Failed to fetch seat map sections')
      
      const result = await response.json()
      setSeatMapSections(result.sections || [])
      console.log('✅ Found', result.sections?.length || 0, 'sections for seat map', seatMapId)
    } catch (error) {
      console.error('Error loading seat map sections:', error)
      setError('Failed to load seat map sections')
    } finally {
      setLoadingSections(false)
    }
  }

  const previewSeatMap = (seatMapId: string) => {
    // Open the interactive seat map preview in a new window
    const previewUrl = `/seatmap-preview/${seatMapId}`
    const previewWindow = window.open(
      previewUrl, 
      'seatMapPreview', 
      'width=1400,height=900,scrollbars=yes,resizable=yes,toolbar=no,location=no,status=no,menubar=no'
    )
    
    if (previewWindow) {
      previewWindow.focus()
    } else {
      // Fallback: if popup was blocked, open in same tab
      window.open(previewUrl, '_blank')
    }
  }

  const toggleInlinePreview = async (seatMapId: string) => {
    if (previewSeatMapId === seatMapId) {
      setPreviewSeatMapId(null)
    } else {
      setPreviewSeatMapId(seatMapId)
      await loadSeatMapSections(seatMapId)
    }
  }

  const loadVenueDetails = async (venueId: string) => {
    try {
      setLoading(true)
      
      // Load shows for this venue
      const showsResponse = await fetch(`/api/venues/${venueId}/shows`)
      if (showsResponse.ok) {
        const shows = await showsResponse.json()
        setVenueShows(shows)
      }

      // Load venue statistics
      const statsResponse = await fetch(`/api/venues/${venueId}/stats`)
      if (statsResponse.ok) {
        const stats = await statsResponse.json()
        setVenueStats(stats)
      }
    } catch (error) {
      console.error('Error loading venue details:', error)
      setError('Failed to load venue details.')
    } finally {
      setLoading(false)
    }
  }

  const createVenue = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const venueData = {
        name: formData.get('name') as string,
        slug: formData.get('slug') as string,
        address: formData.get('address') as string,
        description: formData.get('description') as string,
      }
      
      const response = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(venueData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create venue')
      }
      
      console.log('✅ Venue created successfully')
      setShowCreateVenueForm(false)
      setError(null)
      await loadVenues()
      
    } catch (error) {
      console.error('❌ Error creating venue:', error)
      setError(error instanceof Error ? error.message : 'Failed to create venue')
    } finally {
      setLoading(false)
    }
  }

  const createShow = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const showData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        date: formData.get('date') as string,
        time: formData.get('time') as string,
        venueId: selectedVenue,
        seatMapId: formData.get('seatMapId') as string,
        imageUrl: formData.get('imageUrl') as string,
        durationMinutes: parseInt(formData.get('durationMinutes') as string) || 120,
      }
      
      const response = await fetch('/api/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(showData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create show')
      }
      
      console.log('✅ Show created successfully')
      setShowCreateShowForm(false)
      setError(null)
      
      // Reload venue details to show the new show
      if (selectedVenue) {
        await loadVenueDetails(selectedVenue)
      }
      
    } catch (error) {
      console.error('❌ Error creating show:', error)
      setError(error instanceof Error ? error.message : 'Failed to create show')
    } finally {
      setLoading(false)
    }
  }

  const deleteVenue = async (venueId: string, venueName: string) => {
    if (!confirm(`Are you sure you want to delete "${venueName}"? This will also delete all shows for this venue.`)) {
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch(`/api/venues/${venueId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete venue')
      }
      
      console.log('✅ Venue deleted successfully')
      await loadVenues()
      
      // Clear selection if deleted venue was selected
      if (selectedVenue === venueId) {
        setSelectedVenue(null)
        setVenueShows([])
        setVenueStats(null)
      }
      
    } catch (error) {
      console.error('❌ Error deleting venue:', error)
      setError('Failed to delete venue. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (pence: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(pence / 100)
  }

  if (loading && venues.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading venue dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Venue Dashboard</h1>
            <p className="text-gray-300">Manage your venues and shows</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg border border-white/20 text-white transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Shows
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-100">
            {error}
            <button 
              onClick={() => setError(null)}
              className="float-right text-red-200 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 mb-6">
          <nav className="flex space-x-8 px-6 py-4">
            <button
              onClick={() => setActiveTab('venues')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'venues'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
              }`}
            >
              🏛️ Venues ({venues.length})
            </button>
            <button
              onClick={() => setActiveTab('shows')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'shows'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
              }`}
            >
              🎭 Shows
            </button>
            <button
              onClick={() => setActiveTab('seatmaps')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'seatmaps'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
              }`}
            >
              🗺️ Seat Maps ({seatMaps.length})
            </button>
          </nav>
        </div>

        {/* Venues Tab */}
        {activeTab === 'venues' && (
          <div>
            {/* Create Venue Button */}
            {!showCreateVenueForm && (
              <div className="mb-6">
                <button
                  onClick={() => setShowCreateVenueForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  + Create New Venue
                </button>
              </div>
            )}

            {/* Create Venue Form */}
            {showCreateVenueForm && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white">Create New Venue</h2>
                  <button
                    onClick={() => {
                      setShowCreateVenueForm(false)
                      setError(null)
                    }}
                    className="text-gray-400 hover:text-white text-xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={createVenue} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Venue Name *
                      </label>
                      <input
                        name="name"
                        type="text"
                        required
                        placeholder="e.g., The Royal Theatre"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Address
                      </label>
                      <input
                        name="address"
                        type="text"
                        placeholder="e.g., 123 Theatre Row, London"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Brief description of the venue..."
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Venue'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateVenueForm(false)
                        setError(null)
                      }}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Venues List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {venues.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="text-4xl mb-4">🏛️</div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No venues created yet
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Create your first venue to get started with show management
                  </p>
                </div>
              ) : (
                venues.map(({ venue, showCount, activeShowCount }) => (
                  <div key={venue.id} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {venue.name}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-300">
                          {venue.address && (
                            <p><span className="font-medium">Address:</span> {venue.address}</p>
                          )}
                          <p><span className="font-medium">Total Shows:</span> {showCount}</p>
                          <p><span className="font-medium">Active Shows:</span> {activeShowCount}</p>
                          {venue.slug && (
                            <p><span className="font-medium">Slug:</span> /{venue.slug}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => router.push(`/venue/${venue.slug}`)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        🏛️ Visit Venue Page
                      </button>
                      <button
                        onClick={() => {
                          setSelectedVenue(venue.id)
                          setActiveTab('shows')
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        View Shows
                      </button>
                      <button
                        onClick={() => deleteVenue(venue.id, venue.name)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Shows Tab */}
        {activeTab === 'shows' && (
          <div>
            {/* Venue Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Venue
              </label>
              <select
                value={selectedVenue || ''}
                onChange={(e) => setSelectedVenue(e.target.value || null)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a venue...</option>
                {venues.map(({ venue }) => (
                  <option key={venue.id} value={venue.id} className="bg-gray-800">
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedVenue && (
              <>
                {/* Venue Stats */}
                {venueStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 text-center">
                      <div className="text-2xl font-bold text-white">{venueStats.totalShows}</div>
                      <div className="text-sm text-gray-300">Total Shows</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 text-center">
                      <div className="text-2xl font-bold text-white">{venueStats.activeShows}</div>
                      <div className="text-sm text-gray-300">Active Shows</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 text-center">
                      <div className="text-2xl font-bold text-white">{venueStats.totalBookings}</div>
                      <div className="text-sm text-gray-300">Total Bookings</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 text-center">
                      <div className="text-2xl font-bold text-white">{formatCurrency(venueStats.totalRevenue)}</div>
                      <div className="text-sm text-gray-300">Total Revenue</div>
                    </div>
                  </div>
                )}

                {/* Create Show Button */}
                {!showCreateShowForm && (
                  <div className="mb-6">
                    <button
                      onClick={() => setShowCreateShowForm(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      + Create New Show
                    </button>
                  </div>
                )}

                {/* Create Show Form */}
                {showCreateShowForm && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold text-white">Create New Show</h2>
                      <button
                        onClick={() => {
                          setShowCreateShowForm(false)
                          setError(null)
                        }}
                        className="text-gray-400 hover:text-white text-xl"
                      >
                        ×
                      </button>
                    </div>

                    <form onSubmit={createShow} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Show Title *
                          </label>
                          <input
                            type="text"
                            name="title"
                            required
                            placeholder="e.g., Hamilton"
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Seat Map *
                          </label>
                          <select
                            name="seatMapId"
                            required
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select a seat map...</option>
                            {seatMaps.map(seatMap => (
                              <option key={seatMap.id} value={seatMap.id} className="bg-gray-800">
                                {seatMap.name} ({seatMap.totalCapacity} seats)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Date *
                          </label>
                          <input
                            type="date"
                            name="date"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Time *
                          </label>
                          <input
                            type="time"
                            name="time"
                            required
                            defaultValue="19:30"
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Duration (minutes)
                          </label>
                          <input
                            type="number"
                            name="durationMinutes"
                            defaultValue="120"
                            min="30"
                            max="300"
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Image URL
                          </label>
                          <input
                            type="url"
                            name="imageUrl"
                            placeholder="https://example.com/show-image.jpg"
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Description
                        </label>
                        <textarea
                          name="description"
                          rows={3}
                          placeholder="Brief description of the show..."
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex gap-4">
                        <button
                          type="submit"
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Creating...' : 'Create Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateShowForm(false)
                            setError(null)
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Shows List */}
                <div className="space-y-4">
                  {venueShows.length === 0 ? (
                    <div className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                      <div className="text-4xl mb-4">🎭</div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        No shows for this venue
                      </h3>
                      <p className="text-gray-300 text-sm">
                        Shows will appear here when they are created for this venue
                      </p>
                    </div>
                  ) : (
                    venueShows.map(show => (
                      <div key={show.id} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">
                              {show.title}
                            </h3>
                            <div className="space-y-1 text-sm text-gray-300">
                              <p><span className="font-medium">Date:</span> {formatDate(show.date)}</p>
                              <p><span className="font-medium">Time:</span> {show.time}</p>
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
              </>
            )}
          </div>
        )}

        {/* Seat Maps Tab */}
        {activeTab === 'seatmaps' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Available Seat Maps</h2>
                <p className="text-gray-300">View all seat map templates available for creating shows</p>
              </div>
              <button
                onClick={() => setShowCreateSeatMapForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                + Create New Seat Map
              </button>
            </div>

            {/* Seat Maps Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {seatMaps.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="text-4xl mb-4">🗺️</div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No seat maps available
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Contact your administrator to add seat map templates
                  </p>
                </div>
              ) : (
                seatMaps.map(seatMap => (
                  <div key={seatMap.id} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {seatMap.name}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-300">
                          {seatMap.description && (
                            <p><span className="font-medium">Description:</span> {seatMap.description}</p>
                          )}
                          <p><span className="font-medium">Total Capacity:</span> {seatMap.totalCapacity.toLocaleString()} seats</p>
                          <p><span className="font-medium">Created:</span> {new Date(seatMap.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => previewSeatMap(seatMap.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        🔍 Interactive Preview
                      </button>
                      <button
                        onClick={() => toggleInlinePreview(seatMap.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          previewSeatMapId === seatMap.id
                            ? 'bg-gray-600 hover:bg-gray-700 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {previewSeatMapId === seatMap.id ? '🔺 Hide Details' : '📋 Details'}
                      </button>
                      <button
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        📄 Duplicate
                      </button>
                    </div>

                    {/* Expandable Details */}
                    {previewSeatMapId === seatMap.id && (
                      <div className="border-t border-white/20 pt-4 mt-4">
                        <h4 className="text-white font-medium mb-3">🎭 Sections ({seatMapSections.length})</h4>
                        {loadingSections ? (
                          <div className="text-gray-400 text-sm">Loading sections...</div>
                        ) : (
                          <div className="space-y-2">
                            {seatMapSections.map(section => (
                              <div key={section.id} className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-4 h-4 rounded"
                                      style={{ backgroundColor: section.colorHex }}
                                    ></div>
                                    <div>
                                      <div className="text-white text-sm font-medium">{section.name}</div>
                                      <div className="text-gray-400 text-xs">
                                        {section.seatPattern?.rows || 'N/A'} rows × {section.seatPattern?.cols || 'N/A'} cols
                                        {section.seatPattern?.shape && ` (${section.seatPattern.shape})`}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-green-400 font-semibold">£{section.basePriceFormatted}</div>
                                    <div className="text-gray-400 text-xs">base price</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <div className="flex items-center gap-2 text-blue-300 text-sm">
                            <span>💡</span>
                            <span>
                              Click "Interactive Preview" above to see the full visual seat map layout with interactive seats!
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setPreviewSeatMapId(null)}
                          className="mt-3 text-gray-400 hover:text-white text-sm"
                        >
                          ▲ Hide Details
                        </button>
                      </div>
                    )}
                    
                    <div className="border-t border-white/20 pt-4 mt-4">
                      <div className="text-xs text-gray-400">
                        Seat Map ID: {seatMap.id}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Create Seat Map Form */}
            {showCreateSeatMapForm && (
              <div className="mt-8 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">🎨 Create New Seat Map</h3>
                
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="Custom Theater Layout"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Total Capacity *
                      </label>
                      <input
                        type="number"
                        name="totalCapacity"
                        required
                        min="10"
                        max="50000"
                        placeholder="500"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Describe the layout and features of this seat map..."
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="border border-yellow-500/30 bg-yellow-500/10 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-yellow-400 text-xl">⚡</div>
                      <div>
                        <h4 className="text-yellow-300 font-medium mb-1">Advanced Seat Map Builder</h4>
                        <p className="text-yellow-200/80 text-sm">
                          Full seat map creation with section builder, pricing zones, and visual editor coming soon! 
                          For now, you can duplicate existing seat maps and modify them.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateSeatMapForm(false)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={true}
                      className="flex-1 bg-green-600/50 text-white px-6 py-2 rounded-lg font-medium cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Seat Map Actions */}
            <div className="mt-8 p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-2">
                🔧 Seat Map Management
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                These seat maps are used as templates when creating shows. Each show gets its own copy of seats from the selected seat map.
              </p>
              <div className="text-xs text-gray-400">
                💡 Tip: When creating a show, you'll choose one of these seat maps as the seating layout.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 