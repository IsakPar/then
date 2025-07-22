"use client";

import HardcodedSeatMap from '@/components/HardcodedSeatMap';
import { useState } from 'react';

export default function TheaterSeatmapTest() {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            🎭 Theater Seatmap Test
          </h1>
          <p className="text-lg text-gray-600">
            Testing the simplified hardcoded seat map
          </p>
          <div className="flex justify-center space-x-4 text-sm text-gray-500">
            <span>✅ Hardcoded Layout</span>
            <span>✅ Simple & Fast</span>
            <span>✅ No Complex Dependencies</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <HardcodedSeatMap
            selectedSeats={selectedSeats}
            onSeatSelect={(seatId) => setSelectedSeats(prev => [...prev, seatId])}
            onSeatDeselect={(seatId) => setSelectedSeats(prev => prev.filter(id => id !== seatId))}
            className="w-full h-[600px]"
          />
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Theater-Grade Seat Map Renderer | Performance Test',
  description: 'WebGL-powered seat selection system with PixiJS and Hamilton theater data',
}; 