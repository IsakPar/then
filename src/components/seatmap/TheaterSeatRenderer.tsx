import React from 'react'

interface TheaterSeatRendererProps {
  seats: any[]
  selectedSeats: string[]
  onSeatClick: (seatId: string) => void
  onSeatHover?: (seat: any | null) => void
  className?: string
  maxWidth?: number
  maxHeight?: number
}

const TheaterSeatRenderer: React.FC<TheaterSeatRendererProps> = () => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
      <p>Theater Seat Renderer placeholder - Use HardcodedSeatMap instead</p>
    </div>
  )
}

export default TheaterSeatRenderer 