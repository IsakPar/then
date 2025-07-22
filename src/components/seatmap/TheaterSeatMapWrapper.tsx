"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Types matching our API response
interface SeatData {
  id: string;
  row_letter: string;
  seat_number: number;
  position: { x: number; y: number };
  status: 'available' | 'selected' | 'booked' | 'reserved' | 'held';
  section_id: string;
  section_name: string;
  display_name: string;
  color_hex: string;
  price_pence: number;
  is_accessible: boolean;
  notes?: string;
}

interface ShowData {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: {
    name: string;
    address: string;
  };
}

// Simple Canvas-based renderer for now (we'll upgrade to WebGL later)
const SimpleCanvasRenderer: React.FC<{
  seats: SeatData[];
  selectedSeats: string[];
  onSeatClick: (seatId: string) => void;
  onSeatHover?: (seat: SeatData | null) => void;
}> = ({ seats, selectedSeats, onSeatClick, onSeatHover }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hoveredSeat, setHoveredSeat] = useState<SeatData | null>(null);
  
  // Calculate bounds
  const bounds = React.useMemo(() => {
    if (seats.length === 0) return { minX: 0, minY: 0, maxX: 1000, maxY: 600 };
    
    const positions = seats.map(seat => seat.position);
    return {
      minX: Math.min(...positions.map(p => p.x)),
      minY: Math.min(...positions.map(p => p.y)),
      maxX: Math.max(...positions.map(p => p.x)),
      maxY: Math.max(...positions.map(p => p.y))
    };
  }, [seats]);
  
  // Render seats
  const renderSeats = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scale
    const padding = 50;
    const scaleX = (canvas.width - padding * 2) / (bounds.maxX - bounds.minX);
    const scaleY = (canvas.height - padding * 2) / (bounds.maxY - bounds.minY);
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate offset for centering
    const offsetX = padding + (canvas.width - padding * 2 - (bounds.maxX - bounds.minX) * scale) / 2;
    const offsetY = padding + (canvas.height - padding * 2 - (bounds.maxY - bounds.minY) * scale) / 2;
    
    // Group seats by section for better rendering
    const seatsBySection = new Map<string, SeatData[]>();
    seats.forEach(seat => {
      if (!seatsBySection.has(seat.section_name)) {
        seatsBySection.set(seat.section_name, []);
      }
      seatsBySection.get(seat.section_name)!.push(seat);
    });
    
    // Render section backgrounds
    seatsBySection.forEach((sectionSeats, sectionName) => {
      const sectionPositions = sectionSeats.map(seat => seat.position);
      const sectionBounds = {
        minX: Math.min(...sectionPositions.map(p => p.x)),
        minY: Math.min(...sectionPositions.map(p => p.y)),
        maxX: Math.max(...sectionPositions.map(p => p.x)),
        maxY: Math.max(...sectionPositions.map(p => p.y))
      };
      
      const x = (sectionBounds.minX - bounds.minX) * scale + offsetX - 20;
      const y = (sectionBounds.minY - bounds.minY) * scale + offsetY - 20;
      const width = (sectionBounds.maxX - sectionBounds.minX) * scale + 40;
      const height = (sectionBounds.maxY - sectionBounds.minY) * scale + 40;
      
      ctx.fillStyle = sectionSeats[0].color_hex + '20';
      ctx.fillRect(x, y, width, height);
      
      // Section label
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.fillText(sectionName, x, y - 5);
    });
    
    // Render seats
    seats.forEach(seat => {
      const x = (seat.position.x - bounds.minX) * scale + offsetX;
      const y = (seat.position.y - bounds.minY) * scale + offsetY;
      const radius = 6;
      
      // Determine color based on status
      let color = '#4CAF50'; // available - green
      if (selectedSeats.includes(seat.id)) {
        color = '#2196F3'; // selected - blue
      } else if (seat.status === 'booked') {
        color = '#F44336'; // booked - red
      } else if (seat.status === 'held') {
        color = '#9C27B0'; // held - purple
      }
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      
      // Highlight hovered seat
      if (hoveredSeat && hoveredSeat.id === seat.id) {
        ctx.strokeStyle = '#FFEB3B';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Add seat number for available seats when zoomed in
      if (scale > 0.8 && seat.status === 'available') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${seat.row_letter}${seat.seat_number}`, x, y + 2);
      }
    });
    
  }, [seats, selectedSeats, bounds, hoveredSeat]);
  
  // Handle canvas events
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Find clicked seat
    const padding = 50;
    const scaleX = (canvas.width - padding * 2) / (bounds.maxX - bounds.minX);
    const scaleY = (canvas.height - padding * 2) / (bounds.maxY - bounds.minY);
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = padding + (canvas.width - padding * 2 - (bounds.maxX - bounds.minX) * scale) / 2;
    const offsetY = padding + (canvas.height - padding * 2 - (bounds.maxY - bounds.minY) * scale) / 2;
    
    const clickedSeat = seats.find(seat => {
      const seatX = (seat.position.x - bounds.minX) * scale + offsetX;
      const seatY = (seat.position.y - bounds.minY) * scale + offsetY;
      const distance = Math.sqrt(Math.pow(x - seatX, 2) + Math.pow(y - seatY, 2));
      return distance < 12 && seat.status === 'available';
    });
    
    if (clickedSeat) {
      onSeatClick(clickedSeat.id);
    }
  };
  
  const handleCanvasHover = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Find hovered seat
    const padding = 50;
    const scaleX = (canvas.width - padding * 2) / (bounds.maxX - bounds.minX);
    const scaleY = (canvas.height - padding * 2) / (bounds.maxY - bounds.minY);
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = padding + (canvas.width - padding * 2 - (bounds.maxX - bounds.minX) * scale) / 2;
    const offsetY = padding + (canvas.height - padding * 2 - (bounds.maxY - bounds.minY) * scale) / 2;
    
    const hoveredSeat = seats.find(seat => {
      const seatX = (seat.position.x - bounds.minX) * scale + offsetX;
      const seatY = (seat.position.y - bounds.minY) * scale + offsetY;
      const distance = Math.sqrt(Math.pow(x - seatX, 2) + Math.pow(y - seatY, 2));
      return distance < 12;
    });
    
    setHoveredSeat(hoveredSeat || null);
    if (onSeatHover) {
      onSeatHover(hoveredSeat || null);
    }
  };
  
  // Render on changes
  useEffect(() => {
    renderSeats();
  }, [renderSeats]);
  
  return (
    <canvas
      ref={canvasRef}
      width={1400}
      height={900}
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasHover}
      onMouseLeave={() => {
        setHoveredSeat(null);
        if (onSeatHover) onSeatHover(null);
      }}
      style={{
        width: '100%',
        height: '100%',
        cursor: 'crosshair',
        background: '#1a1a1a'
      }}
    />
  );
};

const TheaterSeatMapWrapper: React.FC = () => {
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [show, setShow] = useState<ShowData | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredSeat, setHoveredSeat] = useState<SeatData | null>(null);
  const [stats, setStats] = useState({
    totalSeats: 0,
    availableSeats: 0,
    bookedSeats: 0,
    selectedSeats: 0
  });

  // Fetch seat data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch show data
        const showResponse = await fetch('/api/shows?id=81447867-94ac-47b1-96cf-d70d3d5ad02e');
        const showData = await showResponse.json();
        
        // Fetch seats data
        const seatsResponse = await fetch('/api/shows/81447867-94ac-47b1-96cf-d70d3d5ad02e/seats');
        const seatsData = await seatsResponse.json();
        
        if (showData && seatsData) {
          setShow(showData);
          
          // Transform API data to match our renderer format
          const transformedSeats: SeatData[] = seatsData.map((seat: any) => ({
            id: seat.id,
            row_letter: seat.row_letter,
            seat_number: seat.seat_number,
            position: seat.position,
            status: seat.status,
            section_id: seat.section_id,
            section_name: seat.section_name,
            display_name: seat.display_name,
            color_hex: seat.color_hex,
            price_pence: seat.price_pence,
            is_accessible: seat.is_accessible || false,
            notes: seat.notes
          }));
          
          setSeats(transformedSeats);
          
          // Calculate stats
          const stats = {
            totalSeats: transformedSeats.length,
            availableSeats: transformedSeats.filter(s => s.status === 'available').length,
            bookedSeats: transformedSeats.filter(s => s.status === 'booked').length,
            selectedSeats: 0
          };
          setStats(stats);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load seat map data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle seat selection
  const handleSeatClick = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat || seat.status !== 'available') return;
    
    setSelectedSeats(prev => {
      const newSelection = prev.includes(seatId) 
        ? prev.filter(id => id !== seatId)
        : [...prev, seatId];
      
      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        selectedSeats: newSelection.length
      }));
      
      return newSelection;
    });
  };

  // Handle seat hover
  const handleSeatHover = (seat: SeatData | null) => {
    setHoveredSeat(seat);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading theater seat map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🎭 Theater-Grade Seat Map Renderer
              </h1>
              <p className="text-gray-600 mt-2">
                High-performance seat selection with Canvas rendering
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Performance Test</div>
              <div className="text-lg font-semibold">
                {stats.totalSeats.toLocaleString()} seats
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Show Info */}
      {show && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{show.title}</h2>
                <p className="text-gray-600">
                  {show.venue.name} • {show.date} at {show.time}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Selected Seats</div>
                <div className="text-lg font-semibold text-blue-600">
                  {selectedSeats.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-sm">
                  Available ({stats.availableSeats.toLocaleString()})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-sm">
                  Selected ({stats.selectedSeats})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full opacity-60"></div>
                <span className="text-sm">
                  Booked ({stats.bookedSeats.toLocaleString()})
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedSeats([]);
                  setStats(prev => ({ ...prev, selectedSeats: 0 }));
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                disabled={selectedSeats.length === 0}
              >
                Clear Selection
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={selectedSeats.length === 0}
              >
                Book {selectedSeats.length} Seat{selectedSeats.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seat Map */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-gray-900">
          <SimpleCanvasRenderer
            seats={seats}
            selectedSeats={selectedSeats}
            onSeatClick={handleSeatClick}
            onSeatHover={handleSeatHover}
          />
        </div>

        {/* Seat Tooltip */}
        {hoveredSeat && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-10">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: hoveredSeat.color_hex }}
              />
              <div>
                <div className="font-semibold">
                  {hoveredSeat.section_name} • Row {hoveredSeat.row_letter}, Seat {hoveredSeat.seat_number}
                </div>
                <div className="text-sm text-gray-600">
                  £{(hoveredSeat.price_pence / 100).toFixed(2)}
                  {hoveredSeat.is_accessible && ' • Accessible'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Status: {hoveredSeat.status}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white rounded-lg p-4 text-sm">
          <div className="font-semibold mb-2">🎮 Controls</div>
          <div>• Click to select seats</div>
          <div>• Hover for seat details</div>
          <div>• Canvas-based rendering</div>
          <div>• Performance optimized</div>
        </div>
      </div>
    </div>
  );
};

export default TheaterSeatMapWrapper; 