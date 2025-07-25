'use client'

import React from 'react';
import SeatMapContainer from './seatmap/SeatMapContainer';
import { Seat } from './seatmap/types';

// ============================================================================
// LEGACY SEAT MAP WRAPPER - Uses new modular system
// ============================================================================

interface SeatMapProps {
  showId: string;
  onSeatSelect: (seat: Seat) => void;
  onSeatDeselect: (seat: Seat) => void;
  selectedSeats: Seat[];
  className?: string;
  style?: React.CSSProperties;
}

const SeatMap: React.FC<SeatMapProps> = ({
  showId,
  onSeatSelect,
  onSeatDeselect,
  selectedSeats,
  className,
  style
}) => {
  // Convert selected seats to Set of IDs
  const selectedSeatIds = new Set(selectedSeats.map(seat => seat.id));

  return (
    <div className={className} style={style}>
      <SeatMapContainer
        showId={showId}
        selectedSeatIds={selectedSeatIds}
        onSeatSelect={onSeatSelect}
        onSeatDeselect={onSeatDeselect}
        selectedSeats={selectedSeats}
      />
    </div>
  );
};

export default SeatMap; 