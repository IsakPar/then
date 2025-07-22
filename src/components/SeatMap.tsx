'use client'

import React from 'react';
import SeatMapContainer from './seatmap/SeatMapContainer';

// ============================================================================
// LEGACY SEAT MAP WRAPPER - Uses new modular system
// ============================================================================

interface Seat {
  id: string;
  row_letter: string;
  seat_number: number;
  status: 'available' | 'reserved' | 'booked';
  section_id: string;
  section_name?: string;
  display_name?: string;
  color_hex?: string;
  position?: {
    x: number;
    y: number;
  };
  price_pence?: number;
  is_accessible?: boolean;
  notes?: string;
}

interface SeatMapProps {
  showId: string;
  onSeatSelect: (seat: Seat) => void;
  onSeatDeselect: (seatId: string) => void;
  selectedSeats: Seat[];
}

/**
 * Legacy SeatMap component that wraps the new modular system
 * This maintains backward compatibility while using the enterprise-grade architecture
 */
const SeatMap: React.FC<SeatMapProps> = ({ 
  showId, 
  onSeatSelect, 
  onSeatDeselect, 
  selectedSeats 
}) => {
  console.log('🎯 [SeatMap] Using modular seat map system for show:', showId);
  
  return (
    <SeatMapContainer
      showId={showId}
      onSeatSelect={onSeatSelect}
      onSeatDeselect={onSeatDeselect}
      selectedSeats={selectedSeats}
    />
  );
};

export default SeatMap; 