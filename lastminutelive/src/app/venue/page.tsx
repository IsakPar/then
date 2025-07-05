'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Venue {
  id: string
  name: string
  slug?: string
  address: string
  capacity: number
  email: string
  lat: number
  lng: number
  seat_map_url?: string
  seat_map_config?: any
  created_at: string
}

interface VenueSection {
  id: string
  venue_id: string
  section_name: string
  price_multiplier: number
  color_code: string
  sort_order: number
  created_at: string
}

interface Show {
  id: string
  name: string
  start_time: string
  price: number
  total_tickets: number
  tickets_sold: number
  created_at: string
  location?: string
  image_url?: string
  venue_id: string
  venue_name?: string
  min_price?: number
  max_price?: number
}

interface SoldTicket {
  id: string
  customer_email: string
  verification_code: string
  amount: number
  quantity?: number
  created_at: string
}

type CreationStep = 'venue' | 'sections'
type ShowCreationStep = 'details' | 'capacity'

interface ShowSectionCapacity {
  section_id: string
  section_name: string
  price_multiplier: number
  color_code: string
  capacity: number
}

export default function VenueDashboard() {
  const [activeTab, setActiveTab] = useState<'venues' | 'shows'>('venues')
  const [venues, setVenues] = useState<Venue[]>([])
  const [shows, setShows] = useState<Show[]>([])
  const [venueSections, setVenueSections] = useState<VenueSection[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateVenueForm, setShowCreateVenueForm] = useState(false)
  const [showCreateShowForm, setShowCreateShowForm] = useState(false)
  const [editingShow, setEditingShow] = useState<string | null>(null)
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null)
  const [soldTickets, setSoldTickets] = useState<SoldTicket[]>([])
  const [showingSoldTickets, setShowingSoldTickets] = useState<string | null>(null)
  
  // Venue wizard state
  const [creationStep, setCreationStep] = useState<CreationStep>('venue')
  const [newlyCreatedVenue, setNewlyCreatedVenue] = useState<Venue | null>(null)
  const [sectionsToCreate, setSectionsToCreate] = useState<Omit<VenueSection, 'id' | 'venue_id' | 'created_at'>[]>([
    { section_name: 'A', price_multiplier: 1.00, color_code: '#3B82F6', sort_order: 0 },
    { section_name: 'B', price_multiplier: 1.10, color_code: '#10B981', sort_order: 1 },
    { section_name: 'C', price_multiplier: 1.20, color_code: '#F59E0B', sort_order: 2 },
    { section_name: 'D', price_multiplier: 1.30, color_code: '#EF4444', sort_order: 3 }
  ])
  
  // Show wizard state
  const [showCreationStep, setShowCreationStep] = useState<ShowCreationStep>('details')
  const [pendingShowData, setPendingShowData] = useState<any>(null)
  const [showSectionCapacities, setShowSectionCapacities] = useState<ShowSectionCapacity[]>([])
  const [selectedShowVenue, setSelectedShowVenue] = useState<string>('')
  
  // Validation state
  const [activeValidationTab, setActiveValidationTab] = useState<'all' | 'today'>('today')
  const [validationMode, setValidationMode] = useState(false)
  const [searchCode, setSearchCode] = useState('')
  const [validatedTickets, setValidatedTickets] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadVenues()
    loadShows()
  }, [])

  useEffect(() => {
    if (selectedVenue) {
      loadVenueSections(selectedVenue)
    }
  }, [selectedVenue])

  useEffect(() => {
    if (selectedShowVenue) {
      loadVenueSectionsForShow(selectedShowVenue)
    }
  }, [selectedShowVenue])

  const loadVenues = async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setVenues(data || [])
    } catch (error) {
      console.error('Error loading venues:', error)
    }
  }

  const loadShows = async () => {
    try {
      const { data, error } = await supabase
        .from('show_with_section_pricing')
        .select('*')
        .order('start_time', { ascending: false })

      if (error) throw error
      setShows(data || [])
    } catch (error) {
      console.error('Error loading shows:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadVenueSections = async (venueId: string) => {
    try {
      const { data, error } = await supabase
        .from('venue_sections')
        .select('*')
        .eq('venue_id', venueId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setVenueSections(data || [])
    } catch (error) {
      console.error('Error loading venue sections:', error)
    }
  }

  const loadVenueSectionsForShow = async (venueId: string) => {
    if (!venueId) return
    
    try {
      const { data, error } = await supabase
        .from('venue_sections')
        .select('*')
        .eq('venue_id', venueId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      
      // Initialize section capacities with default values
      const capacities: ShowSectionCapacity[] = (data || []).map((section: VenueSection) => ({
        section_id: section.id,
        section_name: section.section_name,
        price_multiplier: section.price_multiplier,
        color_code: section.color_code,
        capacity: 50 // Default capacity per section
      }))
      
      setShowSectionCapacities(capacities)
    } catch (error) {
      console.error('Error loading venue sections for show:', error)
    }
  }

  // Generate slug from venue name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
  }

  // Get coordinates from UK address using Nominatim (free)
  const getCoordinatesFromAddress = async (address: string): Promise<{ lat: number; lng: number }> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', UK')}&limit=1`
      )
      const data = await response.json()
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        }
      }
      
      // Fallback to London coordinates if address not found
      return { lat: 51.5074, lng: -0.1278 }
    } catch (error) {
      console.warn('Failed to geocode address, using London fallback:', error)
      return { lat: 51.5074, lng: -0.1278 }
    }
  }

  const createVenue = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const venueName = formData.get('name') as string
      const venueAddress = formData.get('address') as string
      const venueSlug = formData.get('slug') as string || generateSlug(venueName)
      
      // Get coordinates from address
      const coordinates = await getCoordinatesFromAddress(venueAddress)
      
      // Handle seat map upload
      const seatMapFile = formData.get('seatMap') as File
      let seatMapUrl = null
      
      if (seatMapFile && seatMapFile.size > 0) {
        seatMapUrl = `seat-maps/${Date.now()}-${seatMapFile.name}`
        console.log('Seat map would be uploaded:', seatMapFile.name)
      }

      const venueData = {
        name: venueName,
        slug: venueSlug,
        address: venueAddress,
        capacity: parseInt(formData.get('capacity') as string),
        email: formData.get('email'),
        lat: coordinates.lat,
        lng: coordinates.lng,
        seat_map_url: seatMapUrl
      }
      
      console.log('About to insert venue data:', venueData)

      const { data: venue, error } = await supabase
        .from('venues')
        .insert(venueData)
        .select()
        .single()

      if (error) throw error

      setNewlyCreatedVenue(venue)
      setCreationStep('sections')
      
    } catch (error) {
      console.error('Detailed error creating venue:', {
        error,
        errorType: typeof error,
        errorString: String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack'
      })
      
      // Show more detailed error to help debug
      let errorMessage = 'Unknown error'
      
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      } else if (error && typeof error === 'object' && 'error' in error) {
        errorMessage = String((error as any).error)
      } else if (typeof error === 'string') {
        errorMessage = error
      } else {
        errorMessage = JSON.stringify(error, null, 2)
      }
      
      alert(`Failed to create venue: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const saveSections = async () => {
    if (!newlyCreatedVenue) return

    setLoading(true)
    try {
      const sectionsWithVenueId = sectionsToCreate.map(section => ({
        ...section,
        venue_id: newlyCreatedVenue.id
      }))

      const { error } = await supabase
        .from('venue_sections')
        .insert(sectionsWithVenueId)

      if (error) throw error

      alert('Venue and sections created successfully!')
      setShowCreateVenueForm(false)
      setCreationStep('venue')
      setNewlyCreatedVenue(null)
      setSectionsToCreate([
        { section_name: 'A', price_multiplier: 1.00, color_code: '#3B82F6', sort_order: 0 },
        { section_name: 'B', price_multiplier: 1.10, color_code: '#10B981', sort_order: 1 },
        { section_name: 'C', price_multiplier: 1.20, color_code: '#F59E0B', sort_order: 2 },
        { section_name: 'D', price_multiplier: 1.30, color_code: '#EF4444', sort_order: 3 }
      ])
      loadVenues()
    } catch (error) {
      console.error('Error saving sections:', error)
      alert('Failed to save sections. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addSection = () => {
    const nextLetter = String.fromCharCode(65 + sectionsToCreate.length) // A=65, B=66, etc.
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
    
    setSectionsToCreate([
      ...sectionsToCreate,
      {
        section_name: nextLetter,
        price_multiplier: 1.00 + (sectionsToCreate.length * 0.1),
        color_code: colors[sectionsToCreate.length % colors.length],
        sort_order: sectionsToCreate.length
      }
    ])
  }

  const updateSection = (index: number, field: keyof Omit<VenueSection, 'id' | 'venue_id' | 'created_at'>, value: string | number) => {
    const updated = [...sectionsToCreate]
    updated[index] = { ...updated[index], [field]: value }
    setSectionsToCreate(updated)
  }

  const removeSection = (index: number) => {
    if (sectionsToCreate.length <= 1) {
      alert('You must have at least one section')
      return
    }
    const updated = sectionsToCreate.filter((_, i) => i !== index)
    setSectionsToCreate(updated)
  }

  const updateSectionCapacity = (sectionId: string, capacity: number) => {
    setShowSectionCapacities(capacities =>
      capacities.map(section =>
        section.section_id === sectionId
          ? { ...section, capacity: Math.max(0, capacity) }
          : section
      )
    )
  }

  const getTotalShowCapacity = () => {
    return showSectionCapacities.reduce((total, section) => total + section.capacity, 0)
  }

  const handleShowDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const formData = new FormData(e.target as HTMLFormElement)
    const venueId = formData.get('venueId') as string
    
    if (!venueId) {
      alert('Please select a venue')
      return
    }
    
    const date = formData.get('date')
    const time = formData.get('time')
    const startTime = new Date(`${date}T${time}`).toISOString()

    const showData = {
      name: formData.get('name'),
      venue_id: venueId,
      start_time: startTime,
      base_price: parseFloat(formData.get('price') as string),
      total_tickets: parseInt(formData.get('totalTickets') as string),
      location: formData.get('location'),
      image_url: formData.get('imageUrl') || null
    }

    setPendingShowData(showData)
    setSelectedShowVenue(venueId)
    setShowCreationStep('capacity')
  }

  const createShow = async () => {
    if (!pendingShowData) return
    
    setLoading(true)

    try {
      // First create the show
      const { data: show, error: showError } = await supabase
        .from('shows')
        .insert(pendingShowData)
        .select()
        .single()

      if (showError) throw showError

      // Update section pricing with custom capacities (trigger creates default records)
      for (const section of showSectionCapacities) {
        const { error: pricingError } = await supabase
          .from('show_section_pricing')
          .update({
            base_price: pendingShowData.base_price,
            final_price: pendingShowData.base_price * section.price_multiplier,
            tickets_available: section.capacity,
            tickets_sold: 0
          })
          .eq('show_id', show.id)
          .eq('section_id', section.section_id)

        if (pricingError) throw pricingError
      }

      alert('Show created successfully with custom section capacities!')
      setShowCreateShowForm(false)
      setShowCreationStep('details')
      setPendingShowData(null)
      setSelectedShowVenue('')
      setShowSectionCapacities([])
      loadShows()
    } catch (error) {
      console.error('Detailed error creating show:', {
        error,
        errorType: typeof error,
        errorString: String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack'
      })
      
      let errorMessage = 'Unknown error'
      
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      } else if (error && typeof error === 'object' && 'error' in error) {
        errorMessage = String((error as any).error)
      } else if (typeof error === 'string') {
        errorMessage = error
      } else {
        errorMessage = JSON.stringify(error, null, 2)
      }
      
      alert(`Failed to create show: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const updateShow = async (e: React.FormEvent, showId: string) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const date = formData.get('date')
      const time = formData.get('time')
      const startTime = new Date(`${date}T${time}`).toISOString()

      const { error } = await supabase
        .from('shows')
        .update({
          name: formData.get('name'),
          venue_id: formData.get('venueId'),
          start_time: startTime,
          base_price: Math.round(parseFloat(formData.get('price') as string) * 100),
          total_tickets: parseInt(formData.get('totalTickets') as string),
          location: formData.get('location'),
          image_url: formData.get('imageUrl') || null
        })
        .eq('id', showId)

      if (error) throw error

      alert('Show updated successfully!')
      setEditingShow(null)
      loadShows()
    } catch (error) {
      console.error('Detailed error updating show:', {
        error,
        errorType: typeof error,
        errorString: String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack'
      })
      
      let errorMessage = 'Unknown error'
      
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      } else if (error && typeof error === 'object' && 'error' in error) {
        errorMessage = String((error as any).error)
      } else if (typeof error === 'string') {
        errorMessage = error
      } else {
        errorMessage = JSON.stringify(error, null, 2)
      }
      
      alert(`Failed to update show: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const deleteShow = async (showId: string, showName: string) => {
    if (!confirm(`Are you sure you want to delete "${showName}"?`)) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('shows')
        .delete()
        .eq('id', showId)

      if (error) throw error

      alert('Show deleted successfully!')
      loadShows()
    } catch (error) {
      console.error('Error deleting show:', error)
      alert('Failed to delete show. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadSoldTickets = async (showId: string) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('show_id', showId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setSoldTickets(data || [])
      setShowingSoldTickets(showId)
    } catch (error) {
      console.error('Error loading sold tickets:', error)
      alert('Failed to load tickets. Please try again.')
    }
  }

  const validateTicket = async (verificationCode: string) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          shows!inner(
            name,
            start_time,
            venue_name
          )
        `)
        .eq('verification_code', verificationCode)
        .single()

      if (error) {
        alert('❌ Invalid verification code')
        return
      }

      if (validatedTickets.has(verificationCode)) {
        alert('⚠️ This ticket has already been validated')
        return
      }

      setValidatedTickets(prev => new Set([...prev, verificationCode]))
      alert(`✅ Valid ticket for ${data.shows.name}\nCustomer: ${data.customer_email}`)
      setSearchCode('')
    } catch (error) {
      console.error('Error validating ticket:', error)
      alert('❌ Error validating ticket')
    }
  }

  const getAllTodaysTickets = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          shows!inner(
            name,
            start_time,
            venue_name
          )
        `)
        .gte('shows.start_time', today)
        .lt('shows.start_time', today + 'T23:59:59')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error loading today\'s tickets:', error)
      return []
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getFormattedDate = (dateString: string) => {
    return new Date(dateString).toISOString().split('T')[0]
  }

  const getFormattedTime = (dateString: string) => {
    return new Date(dateString).toTimeString().slice(0, 5)
  }

  const renderVenueForm = () => {
    if (creationStep === 'sections') {
      return renderSectionBuilder()
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Venue
            </h2>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium mr-2">1</span>
                Venue Details
              </span>
              <span className="mx-2">→</span>
              <span className="flex items-center text-gray-400">
                <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-xs font-medium mr-2">2</span>
                Customize Sections
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setShowCreateVenueForm(false)
              setCreationStep('venue')
              setNewlyCreatedVenue(null)
            }}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={createVenue} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Venue Name *
              </label>
              <input
                name="name"
                type="text"
                required
                placeholder="e.g., The Comedy Store"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={(e) => {
                  // Auto-generate slug when name changes
                  const slugField = document.querySelector('input[name="slug"]') as HTMLInputElement
                  if (slugField && !slugField.value) {
                    slugField.value = generateSlug(e.target.value)
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Venue Slug
              </label>
              <input
                name="slug"
                type="text"
                placeholder="the-comedy-store"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-generated from name, used for custom URLs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Capacity *
              </label>
              <input
                name="capacity"
                type="number"
                min="1"
                required
                placeholder="300"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email *
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="venue@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full UK Address *
            </label>
            <input
              name="address"
              type="text"
              required
              placeholder="1A Leicester Square, London WC2H 7NA"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              📍 We'll automatically find the coordinates from this UK address
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seat Map (PNG/JPG image)
            </label>
            <input
              name="seatMap"
              type="file"
              accept=".png,.jpg,.jpeg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Upload an image showing your venue's seat layout. This will be displayed to customers.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                  Getting coordinates & creating venue...
                </span>
              ) : (
                'Continue to Sections →'
              )}
            </button>
          </div>
        </form>
      </div>
    )
  }

  const renderSectionBuilder = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customize Venue Sections
            </h2>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <span className="flex items-center text-green-600">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium mr-2">✓</span>
                Venue Details
              </span>
              <span className="mx-2">→</span>
              <span className="flex items-center">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium mr-2">2</span>
                Customize Sections
              </span>
            </div>
            {newlyCreatedVenue && (
              <p className="text-sm text-gray-600 mt-2">
                Setting up sections for <strong>{newlyCreatedVenue.name}</strong>
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setShowCreateVenueForm(false)
              setCreationStep('venue')
              setNewlyCreatedVenue(null)
            }}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Create sections for your venue. Each section can have different pricing.
            </p>
            <button
              onClick={addSection}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
            >
              + Add Section
            </button>
          </div>

          <div className="grid gap-4">            {sectionsToCreate.map((section, index) => (
              <div key={`section-${index}-${section.section_name}`} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div 
                      className="w-6 h-6 rounded-full mr-3"
                      style={{ backgroundColor: section.color_code }}
                    ></div>
                    <h4 className="font-medium text-gray-900">Section {section.section_name}</h4>
                  </div>
                  {sectionsToCreate.length > 1 && (
                    <button
                      onClick={() => removeSection(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Section Name
                    </label>
                    <input
                      type="text"
                      value={section.section_name}
                      onChange={(e) => updateSection(index, 'section_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Price Multiplier
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="3.0"
                      value={section.price_multiplier}
                      onChange={(e) => updateSection(index, 'price_multiplier', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={section.color_code}
                      onChange={(e) => updateSection(index, 'color_code', e.target.value)}
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setCreationStep('venue')
                setNewlyCreatedVenue(null)
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel Setup
            </button>
            <button
              onClick={saveSections}
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Finish Setup'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderShowForm = (show?: Show) => {
    const isEditing = !!show
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Show' : 'Create New Show'}
          </h2>
          <button
            onClick={() => {
              setShowCreateShowForm(false)
              setEditingShow(null)
            }}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={isEditing ? (e) => updateShow(e, show.id) : handleShowDetailsSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Show Name
              </label>
              <input
                name="name"
                type="text"
                required
                defaultValue={show?.name}
                placeholder="e.g., Comedy Night Special"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Venue
              </label>
              <select
                name="venueId"
                required
                defaultValue={show?.venue_id}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a venue</option>
                {venues.map(venue => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              name="location"
              type="text"
              required
              defaultValue={show?.location}
              placeholder="e.g., London, UK"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                name="date"
                type="date"
                required
                defaultValue={show ? getFormattedDate(show.start_time) : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                name="time"
                type="time"
                required
                defaultValue={show ? getFormattedTime(show.start_time) : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Price (£) - will be multiplied by seat category
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={show ? (show.price / 100) : ''}
                placeholder="25.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Tickets (auto-calculated from venue)
              </label>
              <input
                name="totalTickets"
                type="number"
                min="1"
                required
                defaultValue={show?.total_tickets}
                placeholder="300"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL (optional)
            </label>
            <input
              name="imageUrl"
              type="url"
              defaultValue={show?.image_url || ''}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Show' : 'Next: Set Capacities')}
            </button>
            
            {isEditing && (
              <button
                type="button"
                onClick={() => setEditingShow(null)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    )
  }

  const renderShowCapacityForm = () => {
    if (!pendingShowData) return null

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customize Section Capacities
            </h2>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <span className="flex items-center text-green-600">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium mr-2">✓</span>
                Show Details
              </span>
              <span className="mx-2">→</span>
              <span className="flex items-center">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium mr-2">2</span>
                Section Capacities
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Creating show: <strong>{pendingShowData.name}</strong>
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateShowForm(false)
              setShowCreationStep('details')
              setPendingShowData(null)
              setSelectedShowVenue('')
              setShowSectionCapacities([])
            }}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {showSectionCapacities.length === 0 ? (
            <p className="text-gray-500">Loading venue sections...</p>
          ) : (
            <>
              <div className="grid gap-4">
                {showSectionCapacities.map((section, index) => (
                  <div key={section.section_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-6 h-6 rounded-full mr-3"
                          style={{ backgroundColor: section.color_code }}
                        ></div>
                        <div>
                          <h3 className="font-medium text-gray-900">Section {section.section_name}</h3>
                          <p className="text-sm text-gray-500">
                            Price: £{(pendingShowData.base_price * section.price_multiplier).toFixed(2)} 
                            ({section.price_multiplier}x base price)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <label className="text-sm font-medium text-gray-700 mr-2">
                          Capacity:
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={section.capacity}
                          onChange={(e) => updateSectionCapacity(section.section_id, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 mt-6">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Total Capacity: <span className="font-medium">{getTotalShowCapacity()} seats</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreationStep('details')
                        setPendingShowData(null)
                        setSelectedShowVenue('')
                        setShowSectionCapacities([])
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Back to Details
                    </button>
                    <button
                      onClick={createShow}
                      disabled={loading || getTotalShowCapacity() === 0}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Creating Show...' : 'Create Show'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (loading && venues.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Venue Dashboard
            </h1>
            <p className="text-gray-600 text-sm">
              Manage your venues and shows
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <a 
              href="/" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Shows
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <nav className="flex space-x-8 px-6 py-4 border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('venues')
                setValidationMode(false)
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'venues' && !validationMode
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏛️ Venues ({venues.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('shows')
                setValidationMode(false)
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'shows' && !validationMode
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🎭 Shows ({shows.length})
            </button>
            <button
              onClick={() => {
                setValidationMode(true)
                setActiveTab('shows')
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                validationMode
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ✅ Ticket Validation
            </button>
          </nav>
        </div>

        {/* Ticket Validation Tab */}
        {validationMode && (
          <div>
            {/* Quick Validation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                🎫 Quick Ticket Validation
              </h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit verification code"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-mono"
                  maxLength={6}
                />
                <button
                  onClick={() => validateTicket(searchCode)}
                  disabled={searchCode.length !== 6}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Validate
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Enter the 6-digit code from customer's ticket to validate entry
              </p>
            </div>

            {/* Today's Shows */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  📅 Today's Shows
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveValidationTab('today')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeValidationTab === 'today'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Today Only
                  </button>
                  <button
                    onClick={() => setActiveValidationTab('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeValidationTab === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    All Shows
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {shows
                  .filter(show => {
                    if (activeValidationTab === 'today') {
                      const today = new Date().toDateString()
                      const showDate = new Date(show.start_time).toDateString()
                      return today === showDate
                    }
                    return true
                  })
                  .map(show => (
                    <div key={show.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{show.name}</h3>
                          <p className="text-sm text-gray-600">{formatDateTime(show.start_time)}</p>
                          <p className="text-sm text-gray-500">{show.venue_name}</p>
                          <p className="text-sm text-gray-500">
                            {show.tickets_sold}/{show.total_tickets} tickets sold
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {show.tickets_sold > 0 && (
                            <button
                              onClick={() => loadSoldTickets(show.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              View Door List
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                }
                
                {shows.filter(show => {
                  if (activeValidationTab === 'today') {
                    const today = new Date().toDateString()
                    const showDate = new Date(show.start_time).toDateString()
                    return today === showDate
                  }
                  return true
                }).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📅</div>
                    <p>No shows {activeValidationTab === 'today' ? 'today' : 'found'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Venues Tab */}
        {activeTab === 'venues' && !validationMode && (
          <div>
            {/* Create Venue Button */}
            {!showCreateVenueForm && (
              <div className="mb-6">
                <button
                  onClick={() => setShowCreateVenueForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  + Create New Venue
                </button>
              </div>
            )}

            {/* Create Venue Form */}
            {showCreateVenueForm && renderVenueForm()}

            {/* Venues List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {venues.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200">
                  <div className="text-4xl mb-4">🏛️</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No venues created yet
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Create your first venue to get started with seat management
                  </p>
                </div>
              ) : (
                venues.map(venue => (
                  <div key={venue.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {venue.name}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><span className="font-medium">Address:</span> {venue.address}</p>
                          <p><span className="font-medium">Capacity:</span> {venue.capacity} seats</p>
                          {venue.slug && <p><span className="font-medium">Slug:</span> /{venue.slug}</p>}
                          <p><span className="font-medium">Seat Map:</span> {venue.seat_map_url ? '✅ Uploaded' : '❌ Not uploaded'}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedVenue(selectedVenue === venue.id ? null : venue.id)}
                      className="w-full mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      {selectedVenue === venue.id ? 'Hide' : 'View'} Venue Sections
                    </button>

                    {/* Venue Sections */}
                    {selectedVenue === venue.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-3">Venue Sections</h4>
                        {venueSections.length === 0 ? (
                          <p className="text-sm text-gray-500">No venue sections found</p>
                        ) : (
                          <div className="space-y-2">
                            {venueSections.map(section => (
                              <div key={section.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                  <div 
                                    className="w-4 h-4 rounded-full mr-3"
                                    style={{ backgroundColor: section.color_code }}
                                  ></div>
                                  <div>
                                    <p className="font-medium text-sm">{section.section_name}</p>
                                    <p className="text-xs text-gray-500">{section.price_multiplier}x price</p>
                                  </div>
                                </div>
                                <div className="text-right text-sm">
                                  <p className="font-medium">{section.price_multiplier}x price</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Shows Tab */}
        {activeTab === 'shows' && !validationMode && (
          <div>
            {/* Create Show Button */}
            {!showCreateShowForm && !editingShow && (
              <div className="mb-6">
                <button
                  onClick={() => {
                    setShowCreateShowForm(true)
                    setShowCreationStep('details')
                  }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  disabled={venues.length === 0}
                >
                  {venues.length === 0 ? 'Create a venue first' : '+ Create New Show'}
                </button>
                {venues.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    You need to create at least one venue before adding shows
                  </p>
                )}
              </div>
            )}

            {/* Create Show Form */}
            {showCreateShowForm && showCreationStep === 'details' && renderShowForm()}
            
            {/* Show Capacity Form */}
            {showCreateShowForm && showCreationStep === 'capacity' && renderShowCapacityForm()}

            {/* Edit Show Form */}
            {editingShow && renderShowForm(shows.find(s => s.id === editingShow))}

            {/* Shows List */}
            <div className="space-y-4">
              {shows.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <div className="text-4xl mb-4">🎭</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No shows created yet
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Create your first show to get started
                  </p>
                </div>
              ) : (
                shows.map(show => (
                  <div key={show.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {show.name}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><span className="font-medium">Venue:</span> {show.venue_name}</p>
                          <p><span className="font-medium">When:</span> {formatDateTime(show.start_time)}</p>
                          <p><span className="font-medium">Location:</span> {show.location}</p>
                          <p><span className="font-medium">Base Price:</span> £{(show.price / 100).toFixed(2)}</p>
                          <p><span className="font-medium">Tickets:</span> {show.tickets_sold}/{show.total_tickets} sold</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        {show.tickets_sold > 0 && (
                          <button
                            onClick={() => loadSoldTickets(show.id)}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            View Tickets
                          </button>
                        )}
                        
                        <button
                          onClick={() => setEditingShow(show.id)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        
                        <button
                          onClick={() => deleteShow(show.id, show.name)}
                          disabled={loading}
                          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Sold Tickets Modal */}
        {showingSoldTickets && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Sold Tickets
                  </h2>
                  <button
                    onClick={() => setShowingSoldTickets(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {soldTickets.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">
                    No tickets sold yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-900 mb-4">
                      Door List - Print and check off codes at entrance:
                    </div>
                    
                    {soldTickets.map((ticket, index) => (
                      <div key={ticket.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-mono text-lg font-bold text-blue-600">
                              {ticket.verification_code}
                            </div>
                            <div className="text-sm text-gray-600">
                              {ticket.customer_email}
                            </div>
                            <div className="text-xs text-gray-500">
                              Purchased: {new Date(ticket.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              £{(ticket.amount / 100).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Qty: {ticket.quantity || 1}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}