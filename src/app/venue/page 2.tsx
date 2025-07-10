'use client'

import { useState, useEffect } from 'react'
// Import seat map builder components
import { SectionForm } from '@/components/seatmap-builder/SectionForm'
import { SeatMapPreview } from '@/components/seatmap-builder/SeatMapPreview'
import { SectionConfig, MapConfig, SectionType, SectionShape } from '@/lib/seatmap-builder/types'
import { generateSeatMap } from '@/lib/seatmap-builder/generator'

interface Venue {
  id: string
  name: string
  slug: string
  address?: string
  description?: string
  lat?: number
  lng?: number
  createdAt: string
  updatedAt: string
}

interface SeatMap {
  id: string
  name: string
  description?: string
  layoutConfig: any
  totalCapacity: number
  svgViewbox?: string
  createdAt: string
  updatedAt: string
  usedByVenuesCount?: number
}

interface VenueSection {
  id: string
  name: string
  displayName?: string
  colorHex: string
  basePricePence: number
  sortOrder: number
}

interface Show {
  id: string
  title: string
  description?: string
  date: string
  time: string
  durationMinutes?: number
  imageUrl?: string
  isActive: boolean
  createdAt: string
  venue: {
    id: string
    name: string
    address?: string
  }
  totalSeats: number
  ticketsSold: number
  ticketsReserved: number
  ticketsAvailable: number
  minPrice?: number
  maxPrice?: number
}

interface SoldTicket {
  id: string
  customerEmail: string
  customerName?: string
  validationCode: string
  totalAmountPence: number
  seatCount: number
  createdAt: string
}

type CreationStep = 'venue' | 'seatMap'
type ShowCreationStep = 'details' | 'capacity'

interface ShowSectionCapacity {
  sectionId: string
  capacity: number
}

// TODO: Require admin auth
export default function VenueDashboard() {
  const [activeTab, setActiveTab] = useState<'venues' | 'shows' | 'seatMaps'>('venues')
  const [venues, setVenues] = useState<Venue[]>([])
  const [seatMaps, setSeatMaps] = useState<SeatMap[]>([])
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateVenueForm, setShowCreateVenueForm] = useState(false)
  const [showCreateSeatMapForm, setShowCreateSeatMapForm] = useState(false)
  const [showCreateShowForm, setShowCreateShowForm] = useState(false)
  const [editingShow, setEditingShow] = useState<string | null>(null)
  const [soldTickets, setSoldTickets] = useState<SoldTicket[]>([])
  const [showingSoldTickets, setShowingSoldTickets] = useState<string | null>(null)
  const [showSeatMapBuilder, setShowSeatMapBuilder] = useState(false)
  
  // Seat Map Builder state
  const [seatMapConfig, setSeatMapConfig] = useState<MapConfig>({ sections: [] })
  const [generatedSeatMap, setGeneratedSeatMap] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Creation state
  const [creationStep, setCreationStep] = useState<CreationStep>('venue')
  const [newlyCreatedVenue, setNewlyCreatedVenue] = useState<Venue | null>(null)
  const [sectionsToCreate, setSectionsToCreate] = useState<Omit<VenueSection, 'id'>[]>([
    { name: 'A', displayName: 'Section A', basePricePence: 5000, colorHex: '#3B82F6', sortOrder: 0 },
    { name: 'B', displayName: 'Section B', basePricePence: 5500, colorHex: '#10B981', sortOrder: 1 },
    { name: 'C', displayName: 'Section C', basePricePence: 6000, colorHex: '#F59E0B', sortOrder: 2 },
    { name: 'D', displayName: 'Section D', basePricePence: 6500, colorHex: '#EF4444', sortOrder: 3 }
  ])
  
  // Show creation state
  const [showCreationStep, setShowCreationStep] = useState<ShowCreationStep>('details')
  const [pendingShowData, setPendingShowData] = useState<any>(null)
  const [showSectionCapacities, setShowSectionCapacities] = useState<ShowSectionCapacity[]>([])
  const [selectedShowVenue, setSelectedShowVenue] = useState<string>('')
  const [selectedSeatMap, setSelectedSeatMap] = useState<string>('')
  const [selectedVenueForSeatMap, setSelectedVenueForSeatMap] = useState<string>('')
  const [assigningSeatMap, setAssigningSeatMap] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadVenues(),
        loadSeatMaps(),
        loadShows()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadVenues = async () => {
    try {
      const response = await fetch('/api/admin/venues')
      if (!response.ok) throw new Error('Failed to fetch venues')
      const data = await response.json()
      setVenues(data)
    } catch (error) {
      console.error('Error loading venues:', error)
    }
  }

  const loadSeatMaps = async () => {
    try {
      const response = await fetch('/api/venue/seatmaps')
      if (!response.ok) throw new Error('Failed to fetch seat maps')
      const data = await response.json()
      setSeatMaps(data.seatMaps)
    } catch (error) {
      console.error('Error loading seat maps:', error)
    }
  }

  const loadShows = async () => {
    try {
      const response = await fetch('/api/admin/shows')
      if (!response.ok) throw new Error('Failed to fetch shows')
      const data = await response.json()
      setShows(data)
    } catch (error) {
      console.error('Error loading shows:', error)
    }
  }

  const createVenue = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const venueData = {
        name: formData.get('name') as string,
        address: formData.get('address') as string,
        description: formData.get('description') as string,
      }

      const response = await fetch('/api/admin/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(venueData),
      })

      if (!response.ok) throw new Error('Failed to create venue')
      
      const venue = await response.json()
      setNewlyCreatedVenue(venue)
      setCreationStep('seatMap')
    } catch (error) {
      console.error('Error creating venue:', error)
      alert('Failed to create venue. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const createSeatMapWithSections = async () => {
    if (!newlyCreatedVenue) return

    setLoading(true)
    try {
      const seatMapData = {
        name: `${newlyCreatedVenue.name} - Default Layout`,
        description: `Default seat map for ${newlyCreatedVenue.name}`,
      }

      const response = await fetch('/api/admin/seat-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatMapData,
          sectionsData: sectionsToCreate,
        }),
      })

      if (!response.ok) throw new Error('Failed to create seat map')

      alert('Venue and seat map created successfully!')
      setShowCreateVenueForm(false)
      setCreationStep('venue')
      setNewlyCreatedVenue(null)
      resetSectionsToDefault()
      loadData()
    } catch (error) {
      console.error('Error creating seat map:', error)
      alert('Failed to create seat map. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetSectionsToDefault = () => {
    setSectionsToCreate([
      { name: 'A', displayName: 'Section A', basePricePence: 5000, colorHex: '#3B82F6', sortOrder: 0 },
      { name: 'B', displayName: 'Section B', basePricePence: 5500, colorHex: '#10B981', sortOrder: 1 },
      { name: 'C', displayName: 'Section C', basePricePence: 6000, colorHex: '#F59E0B', sortOrder: 2 },
      { name: 'D', displayName: 'Section D', basePricePence: 6500, colorHex: '#EF4444', sortOrder: 3 }
    ])
  }

  const addSection = () => {
    const nextLetter = String.fromCharCode(65 + sectionsToCreate.length) // A=65, B=66, etc.
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
    
    setSectionsToCreate([
      ...sectionsToCreate,
      {
        name: nextLetter,
        displayName: `Section ${nextLetter}`,
        basePricePence: 5000 + (sectionsToCreate.length * 500),
        colorHex: colors[sectionsToCreate.length % colors.length],
        sortOrder: sectionsToCreate.length
      }
    ])
  }

  const updateSection = (index: number, field: keyof Omit<VenueSection, 'id'>, value: string | number) => {
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

  const loadSeatMapSections = async (seatMapId: string) => {
    if (!seatMapId) return
    
    try {
      const response = await fetch(`/api/admin/seat-maps/${seatMapId}/sections`)
      if (!response.ok) throw new Error('Failed to fetch sections')
      
      const sections = await response.json()
      
      // Initialize section capacities with default values
      const capacities: ShowSectionCapacity[] = sections.map((section: VenueSection) => ({
        sectionId: section.id,
        capacity: 50 // Default capacity per section
      }))
      
      setShowSectionCapacities(capacities)
    } catch (error) {
      console.error('Error loading seat map sections:', error)
    }
  }

  const updateSectionCapacity = (sectionId: string, capacity: number) => {
    setShowSectionCapacities(capacities =>
      capacities.map(section =>
        section.sectionId === sectionId
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
    const seatMapId = formData.get('seatMapId') as string
    
    if (!venueId || !seatMapId) {
      alert('Please select both a venue and seat map')
      return
    }
    
    const showData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      venueId,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      durationMinutes: parseInt(formData.get('durationMinutes') as string) || 120,
      imageUrl: formData.get('imageUrl') as string || undefined,
    }

    setPendingShowData(showData)
    setSelectedSeatMap(seatMapId)
    await loadSeatMapSections(seatMapId)
    setShowCreationStep('capacity')
  }

  const createShow = async () => {
    if (!pendingShowData) return
    
    setLoading(true)

    try {
      const response = await fetch('/api/admin/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showData: pendingShowData,
          sectionCapacities: showSectionCapacities,
        }),
      })

      if (!response.ok) throw new Error('Failed to create show')

      alert('Show created successfully!')
      setShowCreateShowForm(false)
      setShowCreationStep('details')
      setPendingShowData(null)
      setSelectedShowVenue('')
      setSelectedSeatMap('')
      setShowSectionCapacities([])
      loadShows()
    } catch (error) {
      console.error('Error creating show:', error)
      alert('Failed to create show. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const deleteShow = async (showId: string, showTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${showTitle}"?`)) return

    setLoading(true)

    try {
      const response = await fetch(`/api/admin/shows?id=${showId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete show')

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
      const response = await fetch(`/api/admin/shows/${showId}/tickets`)
      if (!response.ok) throw new Error('Failed to fetch tickets')

      const tickets = await response.json()
      setSoldTickets(tickets)
      setShowingSoldTickets(showId)
    } catch (error) {
      console.error('Error loading sold tickets:', error)
      alert('Failed to load tickets. Please try again.')
    }
  }

  const formatDateTime = (dateString: string, timeString?: string) => {
    if (timeString) {
      const dateTime = new Date(`${dateString}T${timeString}`)
      return dateTime.toLocaleDateString('en-GB', { 
        weekday: 'short',
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    })
  }

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  // Seat Map Builder Functions
  const addSeatMapSection = () => {
    const newSection: SectionConfig = {
      id: `section-${Date.now()}`,
      name: `Section ${seatMapConfig.sections.length + 1}`,
      type: 'premium',
      shape: 'grid',
      rows: 5,
      cols: 10,
      offset: { x: 0, y: 0 },
      seatSpacing: 30,
      rowSpacing: 28
    }
    setSeatMapConfig(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }))
  }

  const updateSeatMapSection = (id: string, updates: Partial<SectionConfig>) => {
    setSeatMapConfig(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === id ? { ...section, ...updates } : section
      )
    }))
  }

  const deleteSection = (id: string) => {
    setSeatMapConfig(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== id)
    }))
  }

  const generateSeatMapFromConfig = async () => {
    if (seatMapConfig.sections.length === 0) return

    setIsGenerating(true)
    try {
      const result = generateSeatMap(seatMapConfig)
      setGeneratedSeatMap(result)
    } catch (error) {
      console.error('Error generating seat map:', error)
      alert('Failed to generate seat map. Please check your configuration.')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadSVG = () => {
    if (!generatedSeatMap) return
    
    const blob = new Blob([generatedSeatMap.svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `seat-map-${Date.now()}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyConfigToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(seatMapConfig, null, 2))
      .then(() => alert('Configuration copied to clipboard!'))
      .catch(() => alert('Failed to copy configuration'))
  }

  const resetSeatMapBuilder = () => {
    setSeatMapConfig({ sections: [] })
    setGeneratedSeatMap(null)
    setIsGenerating(false)
  }

  const loadPerfectPreset = () => {
    const perfectConfig: MapConfig = {
      title: "Hamilton Theater Layout",
      description: "Perfect 502-seat theater configuration with Premium, Side, Middle, and Back sections",
      sections: [
        {
          id: 'premium-section',
          name: 'Premium',
          type: 'premium',
          shape: 'grid',
          rows: 10,
          cols: 15,
          offset: { x: 475, y: 190 },
          seatSpacing: 30,
          rowSpacing: 28
        },
        {
          id: 'side-a-section',
          name: 'Side A',
          type: 'side',
          shape: 'grid',
          rows: 5,
          cols: 10,
          offset: { x: 200, y: 280 },
          seatSpacing: 25,
          rowSpacing: 26
        },
        {
          id: 'side-b-section',
          name: 'Side B',
          type: 'side',
          shape: 'grid',
          rows: 5,
          cols: 10,
          offset: { x: 1100, y: 280 },
          seatSpacing: 25,
          rowSpacing: 26
        },
        {
          id: 'middle-section',
          name: 'Middle',
          type: 'middle',
          shape: 'grid',
          rows: 10,
          cols: 15,
          offset: { x: 475, y: 500 },
          seatSpacing: 30,
          rowSpacing: 28
        },
        {
          id: 'back-section',
          name: 'Back',
          type: 'back',
          shape: 'trapezoid',
          rows: 6,
          rowCounts: [20, 18, 16, 16, 16, 16],
          offset: { x: 450, y: 780 },
          seatSpacing: 28,
          rowSpacing: 30
        }
      ]
    }
    setSeatMapConfig(perfectConfig)
    setGeneratedSeatMap(null)
  }

  const saveSeatMapToDatabase = async () => {
    if (!generatedSeatMap || seatMapConfig.sections.length === 0) {
      alert('Please generate a seat map first')
      return
    }

    try {
      const seatMapData = {
        name: seatMapConfig.title || `Seat Map - ${Date.now()}`,
        description: seatMapConfig.description || 'Custom seat map created with builder',
        layoutConfig: seatMapConfig,
        totalCapacity: generatedSeatMap.totalSeats,
        svgViewbox: `${generatedSeatMap.viewBox.x} ${generatedSeatMap.viewBox.y} ${generatedSeatMap.viewBox.width} ${generatedSeatMap.viewBox.height}`,
        svgContent: generatedSeatMap.svg
      }

      const response = await fetch('/api/admin/seat-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seatMapData),
      })

      if (!response.ok) throw new Error('Failed to save seat map')
      
      const savedSeatMap = await response.json()
      alert(`Seat map "${savedSeatMap.name}" saved successfully!`)
      
      // Reload seat maps to show the new one
      await loadSeatMaps()
      
      // Optionally switch back to the list view
      setShowSeatMapBuilder(false)
    } catch (error) {
      console.error('Error saving seat map:', error)
      alert('Failed to save seat map. Please try again.')
    }
  }

  const assignSeatMapToVenue = async (seatMapId: string, venueSlug: string) => {
    setAssigningSeatMap(seatMapId)
    
    try {
      const response = await fetch(`/api/venue/${venueSlug}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultSeatMapId: seatMapId }),
      })

      if (!response.ok) throw new Error('Failed to assign seatmap to venue')
      
      await loadVenues() // Reload venues to reflect the change
      alert('Seatmap assigned to venue successfully!')
    } catch (error) {
      console.error('Error assigning seatmap to venue:', error)
      alert('Failed to assign seatmap to venue. Please try again.')
    } finally {
      setAssigningSeatMap(null)
      setSelectedVenueForSeatMap('')
    }
  }

  const initializePerfectPresetInDatabase = async () => {
    try {
      const response = await fetch('/api/admin/seat-maps/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error('Failed to initialize preset')
      
      const result = await response.json()
      alert(`✅ ${result.message}\n\nThe perfect seat map is now available for venue creation!`)
      
      // Reload seat maps to show the new one
      await loadSeatMaps()
    } catch (error) {
      console.error('Error initializing preset:', error)
      alert('Failed to initialize preset. Please check your database connection.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading admin dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Venue Admin Dashboard</h1>
          <p className="text-gray-600">Manage venues, seat maps, and shows</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'venues', label: 'Venues', count: venues.length },
                { key: 'seatMaps', label: 'Seat Maps', count: seatMaps.length },
                { key: 'shows', label: 'Shows', count: shows.length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Venues Tab */}
        {activeTab === 'venues' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Venues</h2>
              <a
                href="/venue/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add New Venue
              </a>
            </div>

            {/* Venue Creation Form */}
            {showCreateVenueForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                {creationStep === 'venue' ? (
                  <form onSubmit={createVenue}>
                    <h3 className="text-lg font-semibold mb-4">Create New Venue</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Venue Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., The Royal Opera House"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Bow Street, London WC2E 9DD"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          name="description"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Brief description of the venue..."
                        />
                      </div>
                    </div>
                    <div className="flex gap-4 mt-6">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Creating...' : 'Next: Create Seat Map'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateVenueForm(false)}
                        className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Create Seat Map for {newlyCreatedVenue?.name}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Configure the sections for this venue's default seat map:
                    </p>
                    
                    <div className="space-y-4">
                      {sectionsToCreate.map((section, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Section Name
                            </label>
                            <input
                              type="text"
                              value={section.name}
                              onChange={(e) => updateSection(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Display Name
                            </label>
                            <input
                              type="text"
                              value={section.displayName || ''}
                              onChange={(e) => updateSection(index, 'displayName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Base Price (£)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={section.basePricePence / 100}
                              onChange={(e) => updateSection(index, 'basePricePence', Math.round(parseFloat(e.target.value) * 100))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Color
                            </label>
                            <input
                              type="color"
                              value={section.colorHex}
                              onChange={(e) => updateSection(index, 'colorHex', e.target.value)}
                              className="w-full h-10 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeSection(index)}
                              className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                              disabled={sectionsToCreate.length <= 1}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4 mt-6">
                      <button
                        type="button"
                        onClick={addSection}
                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                      >
                        Add Section
                      </button>
                      <button
                        type="button"
                        onClick={createSeatMapWithSections}
                        disabled={loading}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading ? 'Creating...' : 'Create Venue & Seat Map'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreationStep('venue')
                          setNewlyCreatedVenue(null)
                        }}
                        className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Venues List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => (
                <div key={venue.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{venue.name}</h3>
                      <p className="text-sm text-gray-500 font-mono">{venue.slug}</p>
                    </div>
                    <div className="flex space-x-1">
                      <a
                        href={`/venue/${venue.slug}/edit`}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        title="Edit venue"
                      >
                        Edit
                      </a>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${venue.name}"? This action cannot be undone.`)) {
                            // TODO: Implement delete functionality
                            alert('Delete functionality not yet implemented');
                          }
                        }}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title="Delete venue"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-gray-600 text-sm">{venue.address}</p>
                    {venue.description && (
                      <p className="text-gray-500 text-sm">{venue.description}</p>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-gray-500">Admin Access:</span>
                      <a
                        href={`/venue/${venue.slug}`}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Open Dashboard
                      </a>
                    </div>
                    <p className="text-xs text-gray-400">
                      Created: {formatDateTime(venue.createdAt)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Updated: {formatDateTime(venue.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {venues.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 text-xl mb-4">No venues yet</div>
                <p className="text-gray-400 mb-6">
                  Create your first venue to start managing shows and tickets
                </p>
                <a
                  href="/venue/new"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Your First Venue
                </a>
              </div>
            )}
          </div>
        )}

        {/* Seat Maps Tab */}
        {activeTab === 'seatMaps' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Seat Maps</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (!showSeatMapBuilder && seatMapConfig.sections.length === 0) {
                      // Auto-load perfect preset when opening builder for first time
                      loadPerfectPreset()
                    }
                    setShowSeatMapBuilder(!showSeatMapBuilder)
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {showSeatMapBuilder ? 'View Existing Maps' : 'Create New Seat Map'}
                </button>
              </div>
            </div>

            {showSeatMapBuilder ? (
              /* Seat Map Builder Interface */
              <div className="space-y-6">
                                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Seat Map Builder</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={initializePerfectPresetInDatabase}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          💾 Save Perfect to DB
                        </button>
                        <button
                          onClick={loadPerfectPreset}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                        >
                          Load Perfect Layout
                        </button>
                        <button
                          onClick={resetSeatMapBuilder}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                          Reset All
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Create professional seat maps using controlled inputs. Start with our perfect 502-seat layout or build from scratch.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">🎯 Quick Start Guide:</h4>
                      <ol className="text-sm text-blue-700 space-y-1">
                        <li>1. Click "💾 Save Perfect to DB" to add the beloved Hamilton layout to your database</li>
                        <li>2. Click "Load Perfect Layout" to see the 502-seat configuration</li>
                        <li>3. Modify sections or create new layouts as needed</li>
                        <li>4. Generate and save your seat maps to use in venue creation</li>
                        <li>5. Saved seat maps will appear in the "Create New Venue" workflow</li>
                      </ol>
                    </div>
                  </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Configuration Panel */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Sections</h3>
                        <button
                          onClick={addSeatMapSection}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Add Section
                        </button>
                      </div>

                      {seatMapConfig.sections.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">🪑</div>
                          <p>No sections yet</p>
                          <p className="text-sm">Click "Add Section" to start building</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {seatMapConfig.sections.map((section, index) => (
                            <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium text-gray-900">
                                  Section {index + 1}: {section.name}
                                </h4>
                                <button
                                  onClick={() => deleteSection(section.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                              <SectionForm
                                section={section}
                                onChange={(updates) => updateSeatMapSection(section.id, updates)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Generation Controls */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate & Export</h3>
                      <div className="space-y-3">
                        <button
                          onClick={generateSeatMapFromConfig}
                          disabled={seatMapConfig.sections.length === 0 || isGenerating}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGenerating ? 'Generating...' : 'Generate Seat Map'}
                        </button>

                        {generatedSeatMap && (
                          <div className="space-y-2">
                            <button
                              onClick={saveSeatMapToDatabase}
                              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                            >
                              💾 Save to Database
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={downloadSVG}
                                className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                              >
                                Download SVG
                              </button>
                              <button
                                onClick={copyConfigToClipboard}
                                className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700"
                              >
                                Copy Config
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preview Panel */}
                  <div>
                    <SeatMapPreview
                      config={seatMapConfig}
                      generatedMap={generatedSeatMap}
                      isGenerating={isGenerating}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Existing Seat Maps List */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {seatMaps.map((seatMap) => (
                  <div key={seatMap.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{seatMap.name}</h3>
                    {seatMap.description && (
                      <p className="text-gray-600 mb-3">{seatMap.description}</p>
                    )}
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                      <span>Capacity: {seatMap.totalCapacity}</span>
                      <span>{formatDateTime(seatMap.createdAt)}</span>
                    </div>
                    {seatMap.usedByVenuesCount !== undefined && (
                      <div className="text-sm text-blue-600 mb-4">
                        Used by {seatMap.usedByVenuesCount} venue{seatMap.usedByVenuesCount !== 1 ? 's' : ''}
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="border-t pt-4 space-y-3">
                      {/* View Seatmap Button */}
                      <div>
                        <button
                          onClick={() => {
                            const previewUrl = `/seatmap-preview/${seatMap.id}`;
                            window.open(previewUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                          }}
                          className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                          <span>🎭</span>
                          View Seatmap
                        </button>
                      </div>
                      
                      {/* Venue Assignment Section */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Assign to venue:</p>
                        <div className="flex gap-2">
                          <select
                            value={assigningSeatMap === seatMap.id ? selectedVenueForSeatMap : ''}
                            onChange={(e) => setSelectedVenueForSeatMap(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={assigningSeatMap === seatMap.id}
                          >
                            <option value="">Select venue...</option>
                            {venues.map((venue) => (
                              <option key={venue.id} value={venue.slug}>
                                {venue.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              if (selectedVenueForSeatMap) {
                                assignSeatMapToVenue(seatMap.id, selectedVenueForSeatMap)
                              }
                            }}
                            disabled={!selectedVenueForSeatMap || assigningSeatMap === seatMap.id}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {assigningSeatMap === seatMap.id ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shows Tab */}
        {activeTab === 'shows' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Shows</h2>
              <button
                onClick={() => setShowCreateShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Show
              </button>
            </div>

            {/* Show Creation Form */}
            {showCreateShowForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                {showCreationStep === 'details' ? (
                  <form onSubmit={handleShowDetailsSubmit}>
                    <h3 className="text-lg font-semibold mb-4">Create New Show</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Show Title
                        </label>
                        <input
                          type="text"
                          name="title"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Hamilton"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Venue
                        </label>
                        <select
                          name="venueId"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select a venue</option>
                          {venues.map((venue) => (
                            <option key={venue.id} value={venue.id}>
                              {venue.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seat Map
                        </label>
                        <select
                          name="seatMapId"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select a seat map</option>
                          {seatMaps.map((seatMap) => (
                            <option key={seatMap.id} value={seatMap.id}>
                              {seatMap.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date
                        </label>
                        <input
                          type="date"
                          name="date"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time
                        </label>
                        <input
                          type="time"
                          name="time"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          name="durationMinutes"
                          defaultValue={120}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          name="description"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Show description..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Image URL
                        </label>
                        <input
                          type="url"
                          name="imageUrl"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://example.com/show-image.jpg"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4 mt-6">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Next: Set Capacities
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateShowForm(false)}
                        className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Set Section Capacities
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Configure how many seats each section should have for this show:
                    </p>
                    
                    <div className="space-y-4">
                      {showSectionCapacities.map((section) => (
                        <div key={section.sectionId} className="grid grid-cols-2 gap-4 p-4 border border-gray-200 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Section {section.sectionId}
                            </label>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Capacity
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={section.capacity}
                              onChange={(e) => updateSectionCapacity(section.sectionId, parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Total Show Capacity: <span className="font-semibold">{getTotalShowCapacity()} seats</span>
                      </p>
                    </div>

                    <div className="flex gap-4 mt-6">
                      <button
                        type="button"
                        onClick={createShow}
                        disabled={loading || getTotalShowCapacity() === 0}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading ? 'Creating...' : 'Create Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreationStep('details')
                          setPendingShowData(null)
                          setShowSectionCapacities([])
                        }}
                        className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Shows List */}
            <div className="space-y-4">
              {shows.map((show) => (
                <div key={show.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{show.title}</h3>
                      <p className="text-gray-600 mb-2">{show.venue.name}</p>
                      {show.description && (
                        <p className="text-gray-500 text-sm mb-3">{show.description}</p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Date/Time:</span>
                          <p className="font-medium">{formatDateTime(show.date, show.time)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Capacity:</span>
                          <p className="font-medium">{show.totalSeats} seats</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Sold:</span>
                          <p className="font-medium text-green-600">{show.ticketsSold}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Available:</span>
                          <p className="font-medium text-blue-600">{show.ticketsAvailable}</p>
                        </div>
                      </div>
                      {show.minPrice && show.maxPrice && (
                        <p className="text-sm text-gray-500 mt-2">
                          Price range: {formatCurrency(show.minPrice * 100)} - {formatCurrency(show.maxPrice * 100)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => loadSoldTickets(show.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Tickets ({show.ticketsSold})
                      </button>
                      <button
                        onClick={() => deleteShow(show.id, show.title)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sold Tickets Modal */}
        {showingSoldTickets && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Sold Tickets</h3>
                  <button
                    onClick={() => {
                      setShowingSoldTickets(null)
                      setSoldTickets([])
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6">
                {soldTickets.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No tickets sold yet</p>
                ) : (
                  <div className="space-y-4">
                    {soldTickets.map((ticket) => (
                      <div key={ticket.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Customer:</span>
                            <p className="font-medium">{ticket.customerName}</p>
                            <p className="text-gray-600">{ticket.customerEmail}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Validation Code:</span>
                            <p className="font-mono font-medium">{ticket.validationCode}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Amount:</span>
                            <p className="font-medium">{formatCurrency(ticket.totalAmountPence)}</p>
                            <p className="text-gray-600">{ticket.seatCount} seat(s)</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Purchased:</span>
                            <p className="font-medium">{formatDateTime(ticket.createdAt)}</p>
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