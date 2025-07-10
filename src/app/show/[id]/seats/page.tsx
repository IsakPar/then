'use client'

import { useState, useEffect, useCallback, useReducer } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SeatMap from '@/components/SeatMap'
import { SeatMapErrorBoundary } from '@/components/SeatMapErrorBoundary'

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
}

type SeatSelectionAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_SHOW'; show: Show | null }
  | { type: 'SET_PURCHASING'; purchasing: boolean }
  | { type: 'ADD_SEAT'; seat: SelectedSeat }
  | { type: 'REMOVE_SEAT'; seatId: string }
  | { type: 'CLEAR_SEATS' }

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
    default:
      return state
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SeatSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const showId = params.id as string
  
  // Debug logging
  console.log('🎫 [SeatSelection] Component mounted, params:', params, 'showId:', showId)
  
  const [state, dispatch] = useReducer(seatSelectionReducer, {
    show: null,
    loading: true,
    selectedSeats: [],
    purchasing: false
  })

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadShow = useCallback(async () => {
    if (!showId) return;

    try {
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
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [showId])

  // ============================================================================
  // SEAT SELECTION HANDLERS
  // ============================================================================

  const handleSeatSelect = useCallback((seat: any) => {
    console.log('🎫 [SeatSelection] handleSeatSelect called with:', seat);
    
    // Find the price from sections using the correct field name
    const section = state.show?.seat_pricing?.find(sp => sp.category_id === seat.section_id) // Changed from venue_section_id
    if (!section) {
      console.log('❌ [SeatSelection] No section found for section_id:', seat.section_id);
      return;
    }

    // Use unified row parsing with correct field name
    const rowNumber = SeatIdentifier.parseRowNumber(seat.row_letter); // Changed from row_name

    const newSeat: SelectedSeat = {
      databaseSeatId: seat.id,
      categoryId: seat.section_id, // Changed from venue_section_id
      categoryName: section.category_name,
      price: section.price,
      section: seat.row_letter, // Keep original format for display, changed from row_name
      row: rowNumber, // Parsed number
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
      console.log('🎫 [SeatSelection] Calling loadShow()')
      loadShow()
    } else {
      console.log('❌ [SeatSelection] No showId, not loading')
    }
  }, [showId, loadShow])

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
          {/* Advanced Seat Map */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Select Your Seats</h2>
              <div className="w-full" style={{ aspectRatio: '5/4', minHeight: '350px', maxHeight: '65vh' }}>
                <SeatMapErrorBoundary
                  onError={(error, errorInfo) => {
                    console.error('🚨 [SeatSelection] Seat map error:', error)
                    // Could integrate with error tracking here
                  }}
                >
                  <div className="w-full h-full">
                    <SeatMap
                      showId={showId}
                      onSeatSelect={handleSeatSelect}
                      onSeatDeselect={handleSeatDeselect}
                      selectedSeats={state.selectedSeats.map(s => ({
                        id: s.databaseSeatId,
                        row_letter: s.section, // Map section back to row_letter
                        seat_number: s.seat,
                        status: 'available' as const,
                        section_id: s.categoryId
                      }))}
                    />
                  </div>
                </SeatMapErrorBoundary>
              </div>
            </div>
          </div>

          {/* Seat Selection Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 sticky top-4">
              <h2 className="text-xl font-bold text-white mb-6">Your Selection</h2>
              
              {state.selectedSeats.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg mb-2">No seats selected</p>
                  <p className="text-sm">Click on available seats in the map to select them</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Seats List */}
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {state.selectedSeats.map((seat, index) => (
                      <div key={`${seat.categoryId}-${seat.row}-${seat.seat}`} className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                        <div className="flex-1">
                          <div className="font-medium text-white">
                            {seat.categoryName}
                          </div>
                          <div className="text-sm text-gray-300">
                            Row {seat.section} • Seat {seat.seat}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">
                            £{(seat.price / 100).toFixed(2)}
                          </div>
                          <button
                            onClick={() => handleSeatDeselect(seat.databaseSeatId)}
                            className="text-red-400 hover:text-red-300 text-xs mt-1"
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
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    {state.purchasing ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      `Proceed to Checkout • £${(getTotalPrice() / 100).toFixed(2)}`
                    )}
                  </button>
                </div>
              )}

              {/* Pricing Guide */}
              <div className="mt-8 pt-6 border-t border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Pricing Guide</h3>
                <div className="space-y-2">
                  {state.show.seat_pricing.map((category) => (
                    <div key={category.category_id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: category.color_code }}
                        ></div>
                        <span className="text-gray-300">{category.category_name}</span>
                      </div>
                      <span className="text-white font-medium">£{(category.price / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 