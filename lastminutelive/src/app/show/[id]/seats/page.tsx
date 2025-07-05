'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SeatMap from '@/components/SeatMap'

interface Show {
  id: string
  name: string
  venue_name: string
  start_time: string
  location?: string
  image_url?: string
}

interface Seat {
  id: string
  row_name: string
  seat_number: number
  status: 'available' | 'reserved' | 'booked'
  venue_section_id: string
}

export default function SeatSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const showId = params.id as string
  
  const [show, setShow] = useState<Show | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [purchasing, setPurchasing] = useState(false)
  const [sectionPricing, setSectionPricing] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (showId) {
      loadShow()
      loadPricing()
    }
  }, [showId])

  const loadShow = async () => {
    try {
      setLoading(true)
      
      const { data: showData, error: showError } = await supabase
        .from('shows')
        .select(`
          id,
          name,
          start_time,
          description,
          image_url,
          venues!inner (
            name,
            address
          )
        `)
        .eq('id', showId)
        .single()

      if (showError) throw showError
      if (!showData) throw new Error('Show not found')

      const showWithVenue = {
        ...showData,
        venue_name: showData.venues.name,
        location: showData.venues.address
      }

      setShow(showWithVenue)
    } catch (error) {
      console.error('Error loading show:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPricing = async () => {
    try {
      const { data: pricingData, error } = await supabase
        .from('show_section_pricing')
        .select('venue_section_id, price')
        .eq('show_id', showId)

      if (error) throw error

      const pricingMap = new Map(
        pricingData?.map(p => [p.venue_section_id, parseFloat(p.price)]) || []
      )
      setSectionPricing(pricingMap)
    } catch (error) {
      console.error('Error loading pricing:', error)
    }
  }

  const handleSeatSelect = (seat: Seat) => {
    setSelectedSeats(prev => [...prev, seat])
  }

  const handleSeatDeselect = (seatId: string) => {
    setSelectedSeats(prev => prev.filter(seat => seat.id !== seatId))
  }

  const getTotalPrice = () => {
    return selectedSeats.reduce((total, seat) => {
      const price = sectionPricing.get(seat.venue_section_id) || 0
      return total + price
    }, 0)
  }

  const handleCheckout = async () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat')
      return
    }

    setPurchasing(true)

    try {
      // Reserve the selected seats first
      const seatIds = selectedSeats.map(seat => seat.id)
      
      const { data, error } = await supabase
        .from('seats')
        .update({ 
          status: 'reserved',
          reserved_until: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
        })
        .in('id', seatIds)
        .eq('status', 'available')

      if (error) {
        console.error('Reservation error:', error)
        throw new Error('Failed to reserve seats. They may have been taken by another customer.')
      }

      // Create booking record and redirect to payment
      const response = await fetch('/api/seat-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          showId,
          seatIds,
          totalAmount: getTotalPrice()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create booking')
      }

      const { checkoutUrl } = await response.json()
      
      if (!checkoutUrl) {
        throw new Error('No checkout URL received')
      }
      
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Checkout error:', error)
      alert(`Failed to proceed to checkout: ${error.message}`)
      
      // Release the reserved seats on error
      const seatIds = selectedSeats.map(seat => seat.id)
      await supabase
        .from('seats')
        .update({ 
          status: 'available',
          reserved_until: null
        })
        .in('id', seatIds)
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!show) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Show Not Found</h1>
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md p-6">
        <div className="max-w-6xl mx-auto">
          <button 
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← Back to Show
          </button>
          <h1 className="text-3xl font-bold text-gray-800">{show.name}</h1>
          <p className="text-gray-600">{show.venue_name}</p>
          <p className="text-gray-600">
            {new Date(show.start_time).toLocaleDateString()} at{' '}
            {new Date(show.start_time).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seat Map */}
          <div className="lg:col-span-2">
            <SeatMap
              showId={showId}
              onSeatSelect={handleSeatSelect}
              onSeatDeselect={handleSeatDeselect}
              selectedSeats={selectedSeats}
            />
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-md sticky top-6">
              <h3 className="text-xl font-bold mb-4">Booking Summary</h3>
              
              {selectedSeats.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  Select seats to see your booking summary
                </p>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {selectedSeats.map((seat, index) => {
                      const price = sectionPricing.get(seat.venue_section_id) || 0
                      return (
                        <div key={seat.id} className="flex justify-between items-center">
                          <span className="text-sm">
                            Row {seat.row_name}, Seat {seat.seat_number}
                          </span>
                          <span className="font-semibold">£{price.toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span>£{getTotalPrice().toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCheckout}
                    disabled={purchasing}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {purchasing ? 'Processing...' : 'Proceed to Payment'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}