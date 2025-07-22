import HardcodedSeatMap from '@/components/HardcodedSeatMap';
import { useState } from 'react';

export default function SeatmapTestPage() {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎭 Seatmap Test
          </h1>
          <p className="text-gray-600">
            Testing hardcoded seat map with Hamilton theater data
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <HardcodedSeatMap
            selectedSeats={selectedSeats}
            onSeatSelect={(seatId) => setSelectedSeats(prev => [...prev, seatId])}
            onSeatDeselect={(seatId) => setSelectedSeats(prev => prev.filter(id => id !== seatId))}
            className="w-full h-[500px]"
          />
        </div>
      </div>
    </div>
  );
} 