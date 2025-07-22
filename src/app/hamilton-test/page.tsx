'use client';

import React, { useState } from 'react';
import HardcodedSeatMap from '../../components/HardcodedSeatMap';

export default function HamiltonTestPage() {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const handleSeatSelect = (seatId: string) => {
    setSelectedSeats(prev => [...prev, seatId]);
  };

  const handleSeatDeselect = (seatId: string) => {
    setSelectedSeats(prev => prev.filter(id => id !== seatId));
  };

  const handleSelectionChange = (seats: string[]) => {
    setSelectedSeats(seats);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Hamilton at Victoria Palace Theatre</h1>
          <p className="text-gray-600 mt-2">
            Testing our new hardcoded seat map with 502 seats
          </p>
          
          {selectedSeats.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold">Selected Seats: {selectedSeats.length}</h3>
              <div className="text-sm text-gray-600">
                {selectedSeats.slice(0, 5).join(', ')}
                {selectedSeats.length > 5 && ` and ${selectedSeats.length - 5} more...`}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Interactive Seat Map</h2>
            <p className="text-gray-600">Click seats to select/deselect them</p>
          </div>

          <HardcodedSeatMap
            selectedSeats={selectedSeats}
            onSeatSelect={handleSeatSelect}
            onSeatDeselect={handleSeatDeselect}
            className="w-full h-[600px] border border-gray-200 rounded"
          />
        </div>
      </div>
    </div>
  );
} 