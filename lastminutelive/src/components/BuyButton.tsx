'use client'

import { useState } from 'react'

interface BuyButtonProps {
  showId: string
  showName: string
  availableTickets: number
}

export default function BuyButton({ showId, showName, availableTickets }: BuyButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleSeatSelection = () => {
    if (availableTickets === 0) {
      alert('Sorry, this show is sold out!')
      return
    }

    // Navigate to seat selection page
    window.location.href = `/show/${showId}/seats`
  }

  if (availableTickets === 0) {
    return (
      <button
        disabled
        className="px-6 py-3 bg-gray-500/50 text-gray-300 rounded-xl font-bold text-sm cursor-not-allowed border border-gray-400/30"
      >
        Sold Out
      </button>
    )
  }

  return (
    <button
      onClick={handleSeatSelection}
      className="group relative px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
    >
      Reserve your seats
    </button>
  )
}