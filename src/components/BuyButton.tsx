'use client'

import React, { useState } from 'react'

interface BuyButtonProps {
  showId: string
  showName?: string
  price: number
  maxPrice?: number
  availableTickets: number
  onSuccess?: () => void
}

export default function BuyButton({ 
  showId, 
  showName = 'Show',
  price, 
  maxPrice,
  availableTickets, 
  onSuccess 
}: BuyButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if (isLoading || availableTickets === 0) return
    
    // Redirect to seat selection page
    window.location.href = `/show/${showId}/seats`
  }

  const formatPrice = () => {
    if (maxPrice && maxPrice > price) {
      return `£${Math.round(price)}–${Math.round(maxPrice)}`
    }
    return `£${Math.round(price)}`
  }

  const getButtonText = () => {
    if (availableTickets === 0) return 'Sold Out'
    if (isLoading) return 'Loading...'
    return 'Book Now'
  }

  const getButtonStyles = () => {
    if (availableTickets === 0) {
      return 'bg-gray-500 cursor-not-allowed opacity-50'
    }
    
    if (availableTickets <= 10) {
      return 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/25'
    }
    
    if (availableTickets <= 50) {
      return 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/25'
    }
    
    return 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25'
  }

  return (
    <div className="flex flex-col items-end space-y-2">
      {/* Price display */}
      <div className="text-right">
        <div className="text-sm text-purple-200 opacity-75">from</div>
        <div className="font-bold text-white text-lg leading-none">
          {formatPrice()}
        </div>
      </div>
      
      {/* Buy button */}
      <button
        onClick={handleClick}
        disabled={isLoading || availableTickets === 0}
        className={`
          relative overflow-hidden
          px-6 py-3 
          rounded-xl 
          font-semibold text-white text-sm
          transition-all duration-200
          transform hover:scale-105 active:scale-95
          shadow-lg hover:shadow-xl
          ${getButtonStyles()}
          disabled:transform-none disabled:shadow-none
        `}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        {/* Button content */}
        <div className="relative flex items-center justify-center space-x-2">
          <span>{getButtonText()}</span>
          {!isLoading && availableTickets > 0 && (
            <svg 
              className="w-4 h-4 transition-transform group-hover:translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          
          {isLoading && (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          )}
        </div>
        
        {/* Urgency indicator */}
        {availableTickets > 0 && availableTickets <= 10 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-lg"></div>
        )}
      </button>
      
      {/* Urgency message */}
      {availableTickets > 0 && availableTickets <= 10 && (
        <div className="text-xs text-red-300 font-medium text-right animate-pulse">
          Only {availableTickets} left!
        </div>
      )}
      
      {availableTickets === 0 && (
        <div className="text-xs text-gray-400 text-right">
          No tickets available
        </div>
      )}
    </div>
  )
} 