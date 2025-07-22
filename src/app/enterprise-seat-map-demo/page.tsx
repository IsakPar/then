'use client';

import React, { useState } from 'react';
import HardcodedSeatMap from '@/components/HardcodedSeatMap';

// ============================================================================
// DEMO PAGE FOR HARDCODED SEAT MAP
// ============================================================================

export default function EnterpriseSeatMapDemo() {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleSeatClick = (seatId: string) => {
    if (selectedSeats.includes(seatId)) {
      handleSeatDeselect(seatId);
    } else {
      handleSeatSelect(seatId);
    }
  };

  const handleSeatSelect = (seatId: string) => {
    setSelectedSeats(prev => [...prev, seatId]);
    console.log('🎫 Seat selected:', seatId);
  };

  const handleSeatDeselect = (seatId: string) => {
    setSelectedSeats(prev => prev.filter(id => id !== seatId));
    console.log('🎫 Seat deselected:', seatId);
  };

  const clearSelection = () => {
    setSelectedSeats([]);
  };

  // Calculate total price
  const calculateTotal = () => {
    return selectedSeats.reduce((total, seatId) => {
      const parts = seatId.split('-');
      const section = parts[0];
      
      switch (section) {
        case 'premium': return total + 85;
        case 'sideA':
        case 'sideB':
        case 'middle': return total + 65;
        case 'back': return total + 45;
        default: return total;
      }
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🎭 Interactive Seat Map Demo
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Experience our hardcoded Hamilton theater seat map with 502 seats across 4 sections.
            Click seats to select them and see real-time pricing updates.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Hardcoded Seat Map */}
          <div className="xl:col-span-3">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Interactive Seat Map
                </h2>
                {selectedSeats.length > 0 && (
                  <button
                    onClick={clearSelection}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              
              <HardcodedSeatMap
                selectedSeats={selectedSeats}
                onSeatSelect={handleSeatClick}
                onSeatDeselect={handleSeatDeselect}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Selection Summary */}
          <div className="xl:col-span-1">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 h-fit">
              <h3 className="text-xl font-bold text-white mb-4">Selection Summary</h3>
              
              {selectedSeats.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Click on seats to select them
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="text-white">
                    <p className="font-semibold">Selected Seats: {selectedSeats.length}</p>
                    <div className="text-sm text-gray-300 mt-2 max-h-32 overflow-y-auto">
                      {selectedSeats.map(seatId => (
                        <div key={seatId} className="flex justify-between">
                          <span>{seatId.replace('-', ' Row ').replace('-', ' Seat ')}</span>
                          <span>£{
                            (() => {
                              const section = seatId.split('-')[0];
                              switch (section) {
                                case 'premium': return '85';
                                case 'sideA':
                                case 'sideB':
                                case 'middle': return '65';
                                case 'back': return '45';
                                default: return '0';
                              }
                            })()
                          }</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <hr className="border-white/20" />
                  
                  <div className="text-white">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Total:</span>
                      <span className="font-bold text-xl text-green-400">£{calculateTotal()}</span>
                    </div>
                  </div>
                  
                  <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </div>

            {/* Pricing Guide */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mt-6">
              <h3 className="text-lg font-bold text-white mb-4">Pricing Guide</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                    <span className="text-white">Premium</span>
                  </div>
                  <span className="text-white font-semibold">£85</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                    <span className="text-white">Side Sections</span>
                  </div>
                  <span className="text-white font-semibold">£65</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
                    <span className="text-white">Middle</span>
                  </div>
                  <span className="text-white font-semibold">£65</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                    <span className="text-white">Back</span>
                  </div>
                  <span className="text-white font-semibold">£45</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-bold text-white mb-2">Lightning Fast</h3>
            <p className="text-gray-300 text-sm">Hardcoded layout loads instantly with zero dependencies</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-lg font-bold text-white mb-2">Pixel Perfect</h3>
            <p className="text-gray-300 text-sm">Every seat positioned exactly where it should be</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
            <div className="text-3xl mb-4">📱</div>
            <h3 className="text-lg font-bold text-white mb-2">Mobile Ready</h3>
            <p className="text-gray-300 text-sm">Responsive design works perfectly on all devices</p>
          </div>
        </div>
      </div>
    </div>
  );
} 