'use client'

import React, { useState, useCallback, useEffect } from 'react'

interface HardcodedSeatMapProps {
  onSeatSelect: (seatId: string) => void
  onSeatDeselect: (seatId: string) => void
  selectedSeats: string[]
  className?: string
}

interface SeatData {
  id: string
  section: string
  row: number
  seat: number
  sectionType: string
  x: number
  y: number
}

const HardcodedSeatMap: React.FC<HardcodedSeatMapProps> = ({
  onSeatSelect,
  onSeatDeselect,
  selectedSeats,
  className = ''
}) => {
  const [seats, setSeats] = useState<SeatData[]>([])

  // Generate all seats programmatically
  const generateSeats = useCallback(() => {
    const allSeats: SeatData[] = []

    // Premium Section - 150 seats (15 cols x 10 rows)
    const premiumStartX = 475
    const premiumStartY = 190
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 15; col++) {
        allSeats.push({
          id: `premium-${row + 1}-${col + 1}`,
          section: 'Premium',
          row: row + 1,
          seat: col + 1,
          sectionType: 'premium',
          x: premiumStartX + col * 30,
          y: premiumStartY + row * 28
        })
      }
    }

    // Side Section A - 50 seats (5 cols x 10 rows)
    const sideAStartX = 290
    const sideAStartY = 220
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 5; col++) {
        allSeats.push({
          id: `sideA-${row + 1}-${col + 1}`,
          section: 'SideA',
          row: row + 1,
          seat: col + 1,
          sectionType: 'side',
          x: sideAStartX + col * 30,
          y: sideAStartY + row * 28
        })
      }
    }

    // Side Section B - 50 seats (5 cols x 10 rows)
    const sideBStartX = 970
    const sideBStartY = 220
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 5; col++) {
        allSeats.push({
          id: `sideB-${row + 1}-${col + 1}`,
          section: 'SideB',
          row: row + 1,
          seat: col + 1,
          sectionType: 'side',
          x: sideBStartX + col * 30,
          y: sideBStartY + row * 28
        })
      }
    }

    // Middle Section - 150 seats (15 cols x 10 rows)
    const middleStartX = 475
    const middleStartY = 500
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 15; col++) {
        allSeats.push({
          id: `middle-${row + 1}-${col + 1}`,
          section: 'Middle',
          row: row + 1,
          seat: col + 1,
          sectionType: 'middle',
          x: middleStartX + col * 30,
          y: middleStartY + row * 28
        })
      }
    }

    // Back Section - 102 seats in triangular/trapezoid arrangement
    const backStartY = 820
    const backRows = [
      { seats: 14, startX: 490 }, // Row 1: 14 seats
      { seats: 13, startX: 505 }, // Row 2: 13 seats
      { seats: 12, startX: 520 }, // Row 3: 12 seats
      { seats: 11, startX: 535 }, // Row 4: 11 seats
      { seats: 10, startX: 550 }, // Row 5: 10 seats
      { seats: 9, startX: 565 },  // Row 6: 9 seats
      { seats: 9, startX: 565 },  // Row 7: 9 seats
      { seats: 8, startX: 580 },  // Row 8: 8 seats
      { seats: 8, startX: 580 },  // Row 9: 8 seats
      { seats: 8, startX: 580 },  // Row 10: 8 seats
    ]

    backRows.forEach((rowConfig, rowIndex) => {
      for (let col = 0; col < rowConfig.seats; col++) {
        allSeats.push({
          id: `back-${rowIndex + 1}-${col + 1}`,
          section: 'Back',
          row: rowIndex + 1,
          seat: col + 1,
          sectionType: 'back',
          x: rowConfig.startX + col * 30,
          y: backStartY + rowIndex * 28
        })
      }
    })

    return allSeats
  }, [])

  useEffect(() => {
    setSeats(generateSeats())
  }, [generateSeats])

  const handleSeatClick = useCallback((seat: SeatData) => {
    if (selectedSeats.includes(seat.id)) {
      onSeatDeselect(seat.id)
    } else {
      onSeatSelect(seat.id)
    }
  }, [selectedSeats, onSeatSelect, onSeatDeselect])

  const getSeatFill = (seat: SeatData): string => {
    if (selectedSeats.includes(seat.id)) {
      return 'url(#selectedGradient)'
    }

    switch (seat.sectionType) {
      case 'premium':
        return 'url(#premiumGradient)'
      case 'side':
        return 'url(#sideGradient)'
      case 'middle':
        return 'url(#middleGradient)'
      case 'back':
        return 'url(#backGradient)'
      default:
        return 'url(#seatGradient)'
    }
  }

  const getSeatStroke = (seat: SeatData): string => {
    if (selectedSeats.includes(seat.id)) {
      return '#2e7cd6'
    }

    switch (seat.sectionType) {
      case 'premium':
        return '#cc9900'
      case 'side':
        return '#388e3c'
      case 'middle':
        return '#7b1fa2'
      case 'back':
        return '#d84315'
      default:
        return '#999'
    }
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <svg 
        viewBox="200 100 1000 900" 
        className="w-full h-full max-w-full mx-auto block"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <defs>
          {/* Gradient for seats */}
          <linearGradient id="seatGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e0e0e0" stopOpacity="1" />
            <stop offset="100%" stopColor="#b0b0b0" stopOpacity="1" />
          </linearGradient>

          {/* Gradient for selected seats */}
          <linearGradient id="selectedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a90e2" stopOpacity="1" />
            <stop offset="100%" stopColor="#357abd" stopOpacity="1" />
          </linearGradient>

          {/* Premium gradient - Gold */}
          <linearGradient id="premiumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffb300" stopOpacity="1" />
          </linearGradient>

          {/* Side sections gradient - Green */}
          <linearGradient id="sideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#66bb6a" stopOpacity="1" />
            <stop offset="100%" stopColor="#43a047" stopOpacity="1" />
          </linearGradient>

          {/* Middle section gradient - Purple */}
          <linearGradient id="middleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ab47bc" stopOpacity="1" />
            <stop offset="100%" stopColor="#8e24aa" stopOpacity="1" />
          </linearGradient>

          {/* Back section gradient - Orange */}
          <linearGradient id="backGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff7043" stopOpacity="1" />
            <stop offset="100%" stopColor="#f4511e" stopOpacity="1" />
          </linearGradient>

          {/* Shadow filter */}
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
            <feOffset dx="0" dy="1" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Stage */}
        <path d="M 300 50 L 1100 50 L 1050 130 L 350 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="2"/>
        <text x="700" y="95" textAnchor="middle" fill="#888" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="bold">STAGE</text>

        {/* Section Labels */}
        <text x="700" y="170" textAnchor="middle" fill="#FFD700" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold">PREMIUM SECTION (150 seats)</text>
        <text x="250" y="200" textAnchor="middle" fill="#ccc" fontFamily="Arial, sans-serif" fontSize="14">SIDE A (50 seats)</text>
        <text x="1120" y="200" textAnchor="middle" fill="#ccc" fontFamily="Arial, sans-serif" fontSize="14">SIDE B (50 seats)</text>
        <text x="700" y="480" textAnchor="middle" fill="#ccc" fontFamily="Arial, sans-serif" fontSize="16">MIDDLE SECTION (150 seats)</text>
        <text x="700" y="800" textAnchor="middle" fill="#ccc" fontFamily="Arial, sans-serif" fontSize="16">BACK SECTION (102 seats)</text>

        {/* Render all seats */}
        {seats.map((seat) => (
          <rect
            key={seat.id}
            x={seat.x}
            y={seat.y}
            width="24"
            height="22"
            rx="4"
            fill={getSeatFill(seat)}
            stroke={getSeatStroke(seat)}
            strokeWidth="1"
            filter="url(#shadow)"
            className="cursor-pointer hover:opacity-80"
            onClick={() => handleSeatClick(seat)}
            role="button"
            aria-label={`Seat ${seat.seat} in row ${seat.row}, ${seat.section} section`}
          />
        ))}

        {/* Wheelchair accessible spots */}
        <g transform="translate(440, 195)">
          <rect x="-12" y="-5" width="24" height="22" rx="4" fill="#4a90e2" stroke="#357abd" strokeWidth="1" filter="url(#shadow)" />
          <text x="0" y="12" textAnchor="middle" fill="white" fontSize="16" fontFamily="Arial, sans-serif">♿</text>
        </g>
        <g transform="translate(925, 195)">
          <rect x="-12" y="-5" width="24" height="22" rx="4" fill="#4a90e2" stroke="#357abd" strokeWidth="1" filter="url(#shadow)" />
          <text x="0" y="12" textAnchor="middle" fill="white" fontSize="16" fontFamily="Arial, sans-serif">♿</text>
        </g>
        <g transform="translate(165, 275)">
          <rect x="-12" y="-5" width="24" height="22" rx="4" fill="#4a90e2" stroke="#357abd" strokeWidth="1" filter="url(#shadow)" />
          <text x="0" y="12" textAnchor="middle" fill="white" fontSize="16" fontFamily="Arial, sans-serif">♿</text>
        </g>
        <g transform="translate(1215, 275)">
          <rect x="-12" y="-5" width="24" height="22" rx="4" fill="#4a90e2" stroke="#357abd" strokeWidth="1" filter="url(#shadow)" />
          <text x="0" y="12" textAnchor="middle" fill="white" fontSize="16" fontFamily="Arial, sans-serif">♿</text>
        </g>

        {/* Center aisle - pointer-events disabled to allow seat clicks */}
        <rect x="690" y="180" width="20" height="820" fill="#2a2a2a" opacity="0.5" pointerEvents="none" />

        {/* Side aisles - pointer-events disabled to allow seat clicks */}
        <rect x="360" y="260" width="80" height="300" fill="#2a2a2a" opacity="0.3" pointerEvents="none" />
        <rect x="960" y="260" width="80" height="300" fill="#2a2a2a" opacity="0.3" pointerEvents="none" />
      </svg>
    </div>
  )
}

export default HardcodedSeatMap 