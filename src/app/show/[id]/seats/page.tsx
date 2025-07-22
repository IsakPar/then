'use client'

import { useState, useEffect, useCallback, useReducer, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import HardcodedSeatMap from '@/components/HardcodedSeatMap'
import { SeatData } from '@/lib/seatmaps/CoordinateEngine'

// ============================================================================
// UNIFIED SEAT IDENTIFICATION (shared with SeatMap)
// ============================================================================

/**
 * Enterprise-grade seat identification utilities
 * Ensures consistent seat ID generation across the entire application
 */
class SeatIdentifier {
  static parseRowNumber(rowName: string): number {
    if (!rowName) return 1;
    
    // Priority 1: Extract number from row name (B1 -> 1, M3 -> 3)
    const numMatch = rowName.match(/(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }
    
    // Priority 2: Pure letter format (A=1, B=2, etc.)
    const letterMatch = rowName.match(/([A-Za-z])/);
    if (letterMatch) {
      return letterMatch[1].toUpperCase().charCodeAt(0) - 64;
    }
    
    return 1; // Fallback
  }

  static generateSeatId(seat: any): string {
    const rowNum = this.parseRowNumber(seat.row_letter); // Changed from row_name
    return `${seat.section_id}_${rowNum}_${seat.seat_number}`; // Changed from venue_section_id
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface Show {
  id: string
  title: string
  venue_name: string
  start_time: string
  location: string
  imageUrl?: string
  seat_pricing: SeatCategory[]
  date: string
  time: string
  description?: string
}

interface SeatCategory {
  category_id: string
  category_name: string
  color_code: string
  price: number // in cents
  available_seats: number
  sold_seats: number
  description: string
}

interface SelectedSeat {
  databaseSeatId: string // The actual database UUID of the seat
  categoryId: string
  categoryName: string
  price: number
  section: string // original row format (e.g., "B1", "M3")
  row: number // parsed row number
  seat: number
  sectionType: string
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

interface SeatSelectionState {
  show: Show | null
  loading: boolean
  selectedSeats: SelectedSeat[]
  purchasing: boolean
  seats: SeatData[]
  seatsLoading: boolean
}

type SeatSelectionAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_SHOW'; show: Show | null }
  | { type: 'SET_PURCHASING'; purchasing: boolean }
  | { type: 'ADD_SEAT'; seat: SelectedSeat }
  | { type: 'REMOVE_SEAT'; seatId: string }
  | { type: 'CLEAR_SEATS' }
  | { type: 'SET_SEATS'; seats: SeatData[] }
  | { type: 'SET_SEATS_LOADING'; loading: boolean }

function seatSelectionReducer(state: SeatSelectionState, action: SeatSelectionAction): SeatSelectionState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'SET_SHOW':
      return { ...state, show: action.show }
    case 'SET_PURCHASING':
      return { ...state, purchasing: action.purchasing }
    case 'ADD_SEAT':
      // Prevent duplicates by checking database seat ID
      const exists = state.selectedSeats.some(s => s.databaseSeatId === action.seat.databaseSeatId);
      if (exists) {
        console.log('⚠️ [SeatSelection] Seat already selected, ignoring duplicate:', action.seat);
        return state;
      }
      return { ...state, selectedSeats: [...state.selectedSeats, action.seat] }
    case 'REMOVE_SEAT':
      return { 
        ...state, 
        selectedSeats: state.selectedSeats.filter(s => s.databaseSeatId !== action.seatId)
      }
    case 'CLEAR_SEATS':
      return { ...state, selectedSeats: [] }
    case 'SET_SEATS':
      return { ...state, seats: action.seats }
    case 'SET_SEATS_LOADING':
      return { ...state, seatsLoading: action.loading }
    default:
      return state
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Add mount counter outside component to track actual mounts
let mountCounter = 0;

export default function SeatSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const showId = params.id as string
  
  // Request deduplication
  const activeRequests = useRef(new Set<string>())
  
  // Track actual mounts only
  const mountRef = useRef(false);
  if (!mountRef.current) {
    mountCounter++;
    mountRef.current = true;
    console.log(`🎫 [SeatSelection] Component mounted (${mountCounter}), params:`, params, 'showId:', showId)
  }
  
  const [state, dispatch] = useReducer(seatSelectionReducer, {
    show: null,
    loading: true,
    selectedSeats: [],
    purchasing: false,
    seats: [],
    seatsLoading: false
  })

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadShow = useCallback(async () => {
    if (!showId) return;

    // Request deduplication
    const requestKey = `show-${showId}`;
    if (activeRequests.current.has(requestKey)) {
      console.log('🎫 [SeatSelection] Show request already in progress, skipping:', showId);
      return;
    }

    try {
      activeRequests.current.add(requestKey);
      dispatch({ type: 'SET_LOADING', loading: true });
      
      console.log('🎫 [SeatSelection] Loading show data for:', showId);

      // Use our new API endpoint instead of direct Supabase
      const response = await fetch(`/api/shows?id=${showId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch show details')
      }
      
      const showData = await response.json()

      console.log('🎫 [SeatSelection] Show data loaded:', showData)

      // Transform the seat_pricing to match the expected SeatCategory interface
      const seat_pricing = (showData.seat_pricing || []).map((section: any) => ({
        category_id: section.section_id,
        category_name: section.section_name,
        color_code: section.color_code || '#3b82f6', // Default blue if no color
        price: Number(section.price) * 100, // Convert to cents for consistency with existing code
        available_seats: section.available_seats || 0,
        sold_seats: (section.total_seats || 0) - (section.available_seats || 0),
        description: `Section ${section.section_name} - £${(Number(section.price) || 0).toFixed(2)} each`
      }))

      const show: Show = {
        id: showData.id,
        title: showData.title,
        venue_name: showData.venue_name,
        start_time: `${showData.date}T${showData.time}`, // Combine date and time
        location: showData.location,
        imageUrl: showData.imageUrl,
        seat_pricing,
        date: showData.date,
        time: showData.time,
        description: showData.description
      }

      console.log('🎫 [SeatSelection] Final show object:', show)
      dispatch({ type: 'SET_SHOW', show })
    } catch (error) {
      console.error('🎫 [SeatSelection] Error loading show:', error)
      alert('Failed to load show details. Please try again.')
    } finally {
      activeRequests.current.delete(requestKey);
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [showId])

  const loadSeats = useCallback(async () => {
    if (!showId) return;

    // Request deduplication
    const requestKey = `seats-${showId}`;
    if (activeRequests.current.has(requestKey)) {
      console.log('🎭 [EnterpriseSeatMap] Seats request already in progress, skipping:', showId);
      return;
    }

    try {
      activeRequests.current.add(requestKey);
      dispatch({ type: 'SET_SEATS_LOADING', loading: true });
      
      console.log('🎭 [EnterpriseSeatMap] Loading seats for show:', showId);

      // Load seats data for EnterpriseSeatMap
      const seatsResponse = await fetch(`/api/shows/${showId}/seats`);
      if (!seatsResponse.ok) {
        throw new Error('Failed to fetch seats data')
      }
      
      const seatsData = await seatsResponse.json()
      console.log('🎭 [EnterpriseSeatMap] Loaded seats data:', seatsData.length, 'seats')

      // Transform API seats to SeatData format for EnterpriseSeatMap
      const transformedSeats: SeatData[] = seatsData.map((seat: any) => ({
        id: seat.id,
        position: seat.position || { x: 0, y: 0 }, // Fallback if no position
        section: {
          id: seat.section_id,
          name: seat.section_name,
          display_name: seat.section_display_name || seat.section_name,
          color_hex: seat.section_color_hex || '#3b82f6'
        },
        row_letter: seat.row_letter,
        seat_number: seat.seat_number,
        status: seat.status as 'available' | 'selected' | 'booked' | 'reserved',
        price_pence: seat.price_pence || 0,
        is_accessible: seat.is_accessible
      }))

      console.log('🎭 [EnterpriseSeatMap] Transformed seats for EnterpriseSeatMap:', transformedSeats.length)
      dispatch({ type: 'SET_SEATS', seats: transformedSeats })
    } catch (error) {
      console.error('🎭 [EnterpriseSeatMap] Error loading seats:', error)
      // Don't show alert for seats loading error, just log it
    } finally {
      activeRequests.current.delete(requestKey);
      dispatch({ type: 'SET_SEATS_LOADING', loading: false })
    }
  }, [showId])

  // ============================================================================
  // SEAT SELECTION HANDLERS
  // ============================================================================

  const handleSeatSelect = useCallback((seat: any) => {
    console.log('🎫 [SeatSelection] handleSeatSelect called with:', seat);
    
    // For hardcoded map, create section pricing based on seat section
    let section;
    const sectionName = seat.section_id || seat.id?.split('-')[0];
    
    // Define hardcoded pricing for each section
    switch (sectionName) {
      case 'premium':
        section = { category_id: 'premium', category_name: 'Premium Orchestra', price: 8500 }; // £85
        break;
      case 'sideA':
      case 'sideB':
        section = { category_id: 'side', category_name: 'Side Section', price: 6500 }; // £65
        break;
      case 'middle':
        section = { category_id: 'middle', category_name: 'Mezzanine', price: 6500 }; // £65
        break;
      case 'back':
        section = { category_id: 'back', category_name: 'Balcony', price: 4500 }; // £45
        break;
      default:
        section = { category_id: 'general', category_name: 'General Admission', price: 4500 }; // £45
    }

    // Use unified row parsing with correct field name
    const rowNumber = typeof seat.row_letter === 'string' ? 
      SeatIdentifier.parseRowNumber(seat.row_letter) : 
      parseInt(seat.row_letter) || 1;

    const newSeat: SelectedSeat = {
      databaseSeatId: seat.id,
      categoryId: section.category_id,
      categoryName: section.category_name,
      price: section.price,
      section: seat.row_letter || rowNumber.toString(),
      row: rowNumber,
      seat: seat.seat_number,
      sectionType: section.category_name.toLowerCase()
    }

    console.log('🎫 [SeatSelection] Adding new seat to selection:', newSeat);
    dispatch({ type: 'ADD_SEAT', seat: newSeat });
  }, [state.show?.seat_pricing])

  const handleSeatDeselect = useCallback((seatId: string) => {
    console.log('🎫 [SeatSelection] handleSeatDeselect called with seatId:', seatId);
    dispatch({ type: 'REMOVE_SEAT', seatId });
  }, [])

  // ============================================================================
  // CHECKOUT LOGIC
  // ============================================================================

  const getTotalPrice = useCallback(() => {
    return state.selectedSeats.reduce((sum, seat) => sum + seat.price, 0)
  }, [state.selectedSeats])

  const proceedToCheckout = useCallback(async () => {
    if (state.selectedSeats.length === 0) {
      alert('Please select at least one seat')
      return
    }

    dispatch({ type: 'SET_PURCHASING', purchasing: true })
    
    try {
      // 🔥 CRITICAL FIX: Send specific seat IDs instead of section bookings
      console.log('🎫 [SeatSelection] Reserving specific seats:', state.selectedSeats)
      
      // Extract the specific database seat IDs
      const specificSeatIds = state.selectedSeats.map(seat => seat.databaseSeatId);
      
      console.log('🎫 [SeatSelection] Specific seat IDs to reserve:', specificSeatIds)

      // Reserve seats using our seat-checkout API with specific seat IDs
      const reservationResponse = await fetch('/api/seat-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          showId: state.show?.id,
          specificSeatIds // Send specific seat IDs instead of section bookings
        }),
      })

      if (!reservationResponse.ok) {
        const errorData = await reservationResponse.json()
        throw new Error(errorData.error || 'Failed to reserve seats')
      }

      const reservationData = await reservationResponse.json()

      console.log('✅ [SeatSelection] Seats reserved successfully:', reservationData)

      // Store reservation details in localStorage for checkout success page
      localStorage.setItem('currentReservation', JSON.stringify({
        reservationId: reservationData.reservationId,
        showId: state.show?.id,
        seats: state.selectedSeats,
        expiresAt: reservationData.expiresAt
      }))

      // Proceed to Stripe checkout
      window.location.href = reservationData.url
      
    } catch (error) {
      console.error('❌ [SeatSelection] Checkout error:', error)
      alert(`Checkout failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      dispatch({ type: 'SET_PURCHASING', purchasing: false })
    }
  }, [state.selectedSeats, state.show?.id])

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    console.log('🎫 [SeatSelection] useEffect triggered, showId:', showId)
    if (showId) {
      console.log('🎫 [SeatSelection] Calling loadShow() - using hardcoded seat map')
      loadShow()
    } else {
      console.log('❌ [SeatSelection] No showId, not loading')
    }
  }, [showId]) // Only showId as dependency to avoid infinite re-renders

  // Track unmounting
  useEffect(() => {
    return () => {
      console.log('🎫 [SeatSelection] Component unmounting')
    }
  }, [])

  // ============================================================================
  // RENDER
  // ============================================================================

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
          <p className="text-white text-lg">Loading show details...</p>
        </div>
      </div>
    )
  }

  if (!state.show) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Show not found</h1>
          <p className="text-gray-300">The show you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Back Button */}
          <div className="flex justify-start mb-6">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg border border-white/20 text-white hover:text-white transition-all duration-200 group"
            >
              <svg 
                className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-200" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back to Browse Shows</span>
            </button>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {state.show.title}
          </h1>
          <div className="flex flex-wrap justify-center items-center gap-6 text-lg text-gray-300">
            <div className="flex items-center gap-2">
              <span>📍</span>
              <span>{state.show.venue_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>{new Date(state.show.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🕐</span>
              <span>{state.show.time}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Enterprise Seat Map */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Select Your Seats</h2>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-300">
                    {state.seats.length} seats available
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-400">Live</span>
                  </div>
                </div>
              </div>
              <div className="w-full bg-slate-800/50 rounded-xl p-4 border border-slate-700/30" style={{ aspectRatio: '5/4', minHeight: '400px', maxHeight: '65vh' }}>
                <div className="w-full h-full relative">
                  <HardcodedSeatMap
                    selectedSeats={state.selectedSeats.map(s => s.databaseSeatId)}
                    onSeatSelect={(seatId) => {
                      console.log('🎭 [HardcodedSeatMap] Seat selected:', seatId)
                      // Create a mock seat object for the hardcoded map
                      const mockSeat = {
                        id: seatId,
                        section_id: seatId.split('-')[0],
                        row_letter: seatId.split('-')[1],
                        seat_number: parseInt(seatId.split('-')[2]),
                        status: 'available'
                      }
                      handleSeatSelect(mockSeat)
                    }}
                    onSeatDeselect={(seatId) => {
                      console.log('🎭 [HardcodedSeatMap] Seat deselected:', seatId)
                      handleSeatDeselect(seatId)
                    }}
                    className="rounded-lg overflow-hidden"
                  />
                  </div>
              </div>
            </div>
          </div>

          {/* Seat Selection Summary */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-2xl sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Your Selection</h2>
                {state.selectedSeats.length > 0 && (
                  <div className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                    {state.selectedSeats.length} selected
                  </div>
                )}
              </div>
              
              {state.selectedSeats.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="mb-4">
                    <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-lg mb-2 font-medium">No seats selected</p>
                  <p className="text-sm">Click on available seats in the map to select them</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Seats List */}
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {state.selectedSeats.map((seat, index) => (
                      <div key={`${seat.categoryId}-${seat.row}-${seat.seat}`} className="flex items-center justify-between bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-lg p-4 border border-slate-600/30 hover:border-slate-500/50 transition-colors">
                        <div className="flex-1">
                          <div className="font-semibold text-white mb-1">
                            {seat.categoryName}
                          </div>
                          <div className="text-sm text-gray-300">
                            Row {seat.section} • Seat {seat.seat}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white text-lg">
                            £{(seat.price / 100).toFixed(2)}
                          </div>
                          <button
                            onClick={() => handleSeatDeselect(seat.databaseSeatId)}
                            className="text-red-400 hover:text-red-300 text-xs mt-1 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t border-white/20 pt-4">
                    <div className="flex justify-between items-center text-lg font-bold text-white">
                      <span>Total ({state.selectedSeats.length} seat{state.selectedSeats.length !== 1 ? 's' : ''})</span>
                      <span>£{(getTotalPrice() / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={proceedToCheckout}
                    disabled={state.purchasing}
                    className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl border border-blue-500/20"
                  >
                    {state.purchasing ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing Payment...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span>Proceed to Checkout • £{(getTotalPrice() / 100).toFixed(2)}</span>
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* Pricing Guide */}
              <div className="mt-8 pt-6 border-t border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Pricing Guide
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ backgroundColor: '#ffd700' }}></div>
                      <div>
                        <div className="text-gray-300 font-medium">Premium Orchestra</div>
                        <div className="text-gray-500 text-xs">150 seats</div>
                      </div>
                    </div>
                    <span className="text-white font-bold">£85.00</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ backgroundColor: '#66bb6a' }}></div>
                      <div>
                        <div className="text-gray-300 font-medium">Side Sections</div>
                        <div className="text-gray-500 text-xs">100 seats</div>
                      </div>
                    </div>
                    <span className="text-white font-bold">£65.00</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ backgroundColor: '#ab47bc' }}></div>
                      <div>
                        <div className="text-gray-300 font-medium">Mezzanine</div>
                        <div className="text-gray-500 text-xs">150 seats</div>
                      </div>
                    </div>
                    <span className="text-white font-bold">£65.00</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ backgroundColor: '#ff7043' }}></div>
                      <div>
                        <div className="text-gray-300 font-medium">Balcony</div>
                        <div className="text-gray-500 text-xs">102 seats</div>
                      </div>
                    </div>
                    <span className="text-white font-bold">£45.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 