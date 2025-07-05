'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Seat {
  id: string;
  row_name: string;
  seat_number: number;
  status: 'available' | 'reserved' | 'booked';
  venue_section_id: string;
}

interface SeatRow {
  row_name: string;
  seats: Seat[];
}

interface SeatSection {
  section_id: string;
  section_name: string;
  price: number;
  rows: SeatRow[];
}

interface SeatMapProps {
  showId: string;
  onSeatSelect: (seat: Seat) => void;
  onSeatDeselect: (seatId: string) => void;
  selectedSeats: Seat[];
}

const SeatMap: React.FC<SeatMapProps> = ({ 
  showId, 
  onSeatSelect, 
  onSeatDeselect, 
  selectedSeats 
}) => {
  const [sections, setSections] = useState<SeatSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced viewport and zoom controls
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.2;
  
  // SVG dimensions and layout constants
  const SEAT_SIZE = 28;
  const SEAT_SPACING = 6;
  const ROW_SPACING = 40;
  const SECTION_SPACING = 100;
  const STAGE_HEIGHT = 80;
  const MARGIN = 60;

  // Enhanced color schemes for different sections
  const sectionColors = [
    { bg: '#8B5CF6', border: '#7C3AED', name: '#F3E8FF' }, // Purple
    { bg: '#06B6D4', border: '#0891B2', name: '#CFFAFE' }, // Cyan
    { bg: '#F59E0B', border: '#D97706', name: '#FEF3C7' }, // Amber
    { bg: '#EF4444', border: '#DC2626', name: '#FEE2E2' }, // Red
    { bg: '#10B981', border: '#059669', name: '#D1FAE5' }, // Emerald
    { bg: '#8B5CF6', border: '#7C3AED', name: '#F3E8FF' }, // Purple (repeat)
  ];

  useEffect(() => {
    loadSeats();
  }, [showId]);

  const loadSeats = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: seatsData, error: seatsError } = await supabase
        .from('seats')
        .select(`
          id,
          row_name,
          seat_number,
          status,
          venue_section_id,
          venue_sections!inner (
            name,
            sort_order
          )
        `)
        .eq('show_id', showId)
        .order('venue_section_id')
        .order('row_name')
        .order('seat_number');

      if (seatsError) throw seatsError;

      const { data: pricingData, error: pricingError } = await supabase
        .from('show_section_pricing')
        .select('venue_section_id, price')
        .eq('show_id', showId);

      if (pricingError) throw pricingError;

      const pricingMap = new Map(
        pricingData?.map(p => [p.venue_section_id, p.price]) || []
      );

      const sectionsMap = new Map<string, SeatSection>();

      seatsData?.forEach((seat: any) => {
        const sectionId = seat.venue_section_id;
        const sectionName = seat.venue_sections.name;
        const price = pricingMap.get(sectionId) || 0;

        if (!sectionsMap.has(sectionId)) {
          sectionsMap.set(sectionId, {
            section_id: sectionId,
            section_name: sectionName,
            price: price,
            rows: []
          });
        }

        const section = sectionsMap.get(sectionId)!;
        let row = section.rows.find(r => r.row_name === seat.row_name);
        
        if (!row) {
          row = { row_name: seat.row_name, seats: [] };
          section.rows.push(row);
        }

        row.seats.push({
          id: seat.id,
          row_name: seat.row_name,
          seat_number: seat.seat_number,
          status: seat.status,
          venue_section_id: seat.venue_section_id
        });
      });

      sectionsMap.forEach(section => {
        section.rows.sort((a, b) => a.row_name.localeCompare(b.row_name));
        section.rows.forEach(row => {
          row.seats.sort((a, b) => a.seat_number - b.seat_number);
        });
      });

      setSections(Array.from(sectionsMap.values()));
    } catch (err) {
      console.error('Error loading seats:', err);
      setError('Failed to load seat map');
    } finally {
      setLoading(false);
    }
  };

  const getSeatColor = (seat: Seat, sectionIndex: number) => {
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    const sectionColor = sectionColors[sectionIndex % sectionColors.length];
    
    switch (seat.status) {
      case 'booked':
        return { fill: '#6B7280', stroke: '#4B5563', opacity: 0.5 };
      case 'reserved':
        return { fill: '#F59E0B', stroke: '#D97706', opacity: 0.8 };
      case 'available':
        if (isSelected) {
          return { fill: '#FFFFFF', stroke: '#3B82F6', opacity: 1 };
        }
        return { fill: sectionColor.bg, stroke: sectionColor.border, opacity: 0.9 };
      default:
        return { fill: '#6B7280', stroke: '#4B5563', opacity: 0.5 };
    }
  };

  const getSectionColor = (sectionIndex: number) => {
    return sectionColors[sectionIndex % sectionColors.length];
  };

  const calculateLayout = () => {
    let currentY = MARGIN + STAGE_HEIGHT;
    const layout: Array<{
      section: SeatSection;
      sectionIndex: number;
      y: number;
      rows: Array<{
        row: SeatRow;
        y: number;
        seats: Array<{ seat: Seat; x: number; y: number }>
      }>
    }> = [];

    sections.forEach((section, sectionIndex) => {
      const sectionLayout = {
        section,
        sectionIndex,
        y: currentY,
        rows: [] as Array<{
          row: SeatRow;
          y: number;
          seats: Array<{ seat: Seat; x: number; y: number }>
        }>
      };

      section.rows.forEach(row => {
        const maxSeats = Math.max(...sections.flatMap(s => s.rows.map(r => r.seats.length)));
        const totalRowWidth = (row.seats.length * SEAT_SIZE) + ((row.seats.length - 1) * SEAT_SPACING);
        const startX = (900 - totalRowWidth) / 2; // Center the row
        
        const rowLayout = {
          row,
          y: currentY,
          seats: [] as Array<{ seat: Seat; x: number; y: number }>
        };

        row.seats.forEach((seat, seatIndex) => {
          const x = startX + (seatIndex * (SEAT_SIZE + SEAT_SPACING));
          rowLayout.seats.push({ seat, x, y: currentY });
        });

        sectionLayout.rows.push(rowLayout);
        currentY += ROW_SPACING;
      });

      layout.push(sectionLayout);
      currentY += SECTION_SPACING;
    });

    return { layout, totalHeight: currentY + MARGIN };
  };

  // Enhanced zoom and pan controls with boundaries
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Enhanced mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
  }, []);

  // Enhanced drag functionality that works anywhere in the SVG
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent dragging when clicking on seats
    if ((e.target as Element).tagName === 'rect' && (e.target as Element).getAttribute('data-seat')) {
      return;
    }
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart(pan);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    
    // Change cursor to grabbing
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) {
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Calculate boundaries to prevent dragging too far
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      const maxPanX = containerRect.width * 0.3;
      const maxPanY = containerRect.height * 0.3;
      
      const newPanX = Math.max(-maxPanX, Math.min(maxPanX, panStart.x + deltaX));
      const newPanY = Math.max(-maxPanY, Math.min(maxPanY, panStart.y + deltaY));
      
      setPan({ x: newPanX, y: newPanY });
    } else {
      setPan({
        x: panStart.x + deltaX,
        y: panStart.y + deltaY
      });
    }
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    // Reset cursor
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  }, []);

  // Enhanced mouse leave handler
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  }, []);

  // Enhanced event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add wheel event listener for zoom
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseLeave);
    }
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleMouseLeave, handleWheel]);

  // Enhanced seat click handler to prevent drag interference
  const handleSeatClick = (seat: Seat, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag from starting
    
    if (seat.status !== 'available') return;

    const isSelected = selectedSeats.some(s => s.id === seat.id);
    if (isSelected) {
      onSeatDeselect(seat.id);
    } else {
      onSeatSelect(seat);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-900 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-gray-900 rounded-lg">
        <p className="text-red-400 text-lg">{error}</p>
        <button 
          onClick={loadSeats}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-900 rounded-lg">
        <p className="text-gray-400 text-lg">No seats available for this show.</p>
      </div>
    );
  }

  const { layout, totalHeight } = calculateLayout();

  return (
    <div className="bg-gray-900 rounded-lg shadow-2xl relative border border-gray-700">
      {/* Control Panel */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="w-12 h-12 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg text-white transition-all"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="w-12 h-12 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg text-white transition-all"
        >
          −
        </button>
        <button
          onClick={handleReset}
          className="w-12 h-12 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-lg hover:bg-gray-700 flex items-center justify-center text-sm font-bold text-white transition-all"
          title="Reset view"
        >
          ⌂
        </button>
      </div>

      {/* Enhanced zoom indicator */}
      <div className="absolute top-4 left-4 z-10 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-lg px-4 py-2 text-sm font-semibold text-white">
        {Math.round(zoom * 100)}%
      </div>

      {/* Enhanced SVG Container */}
      <div 
        ref={containerRef}
        className="relative overflow-hidden h-[700px] cursor-grab select-none"
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        style={{ 
          userSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 900 ${totalHeight}`}
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          {/* Dark Background with Gradient */}
          <defs>
            <radialGradient id="bgGradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#1F2937" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/> 
              </feMerge>
            </filter>
          </defs>
          
          <rect width="900" height={totalHeight} fill="url(#bgGradient)" />
          
          {/* Enhanced Stage with Professional Design */}
          <g>
            {/* Stage Base Shadow */}
            <ellipse 
              cx="450" 
              cy="75" 
              rx="320" 
              ry="20" 
              fill="#000000" 
              opacity="0.2"
            />
            
            {/* Stage Platform */}
            <path 
              d="M 120 30 L 780 30 Q 800 30 800 50 L 800 70 Q 800 90 780 90 L 120 90 Q 100 90 100 70 L 100 50 Q 100 30 120 30 Z" 
              fill="url(#stageGradient)"
              stroke="#8B5CF6"
              strokeWidth="3"
            />
            
            {/* Stage Inner Platform */}
            <path 
              d="M 140 40 L 760 40 Q 775 40 775 55 L 775 65 Q 775 80 760 80 L 140 80 Q 125 80 125 65 L 125 55 Q 125 40 140 40 Z" 
              fill="#1F2937"
              stroke="#374151"
              strokeWidth="2"
            />
            
            {/* Stage Curtains */}
            <path 
              d="M 120 30 Q 130 25 140 30 L 140 90 Q 130 95 120 90 Z" 
              fill="#7C2D12"
              opacity="0.8"
            />
            <path 
              d="M 780 30 Q 770 25 760 30 L 760 90 Q 770 95 780 90 Z" 
              fill="#7C2D12"
              opacity="0.8"
            />
            
            {/* Stage Lights */}
            <circle cx="200" cy="25" r="4" fill="#FCD34D" opacity="0.9" filter="url(#glow)"/>
            <circle cx="300" cy="20" r="4" fill="#FCD34D" opacity="0.9" filter="url(#glow)"/>
            <circle cx="450" cy="18" r="5" fill="#FBBF24" opacity="1" filter="url(#glow)"/>
            <circle cx="600" cy="20" r="4" fill="#FCD34D" opacity="0.9" filter="url(#glow)"/>
            <circle cx="700" cy="25" r="4" fill="#FCD34D" opacity="0.9" filter="url(#glow)"/>
            
            {/* Stage Text with Better Styling */}
            <text 
              x="450" 
              y="65" 
              textAnchor="middle" 
              fill="#F9FAFB" 
              fontSize="22" 
              fontWeight="bold"
              filter="url(#glow)"
              letterSpacing="2px"
            >
              🎭 STAGE 🎭
            </text>
          </g>

          {/* Sections and Seats */}
          {layout.map(({ section, sectionIndex, rows }) => {
            const sectionColor = getSectionColor(sectionIndex);
            return (
              <g key={section.section_id}>
                {/* Section Background */}
                <rect
                  x="50"
                  y={rows[0]?.y - 50 || 0}
                  width="800"
                  height={(rows.length * ROW_SPACING) + 80}
                  rx="15"
                  fill={sectionColor.bg}
                  opacity="0.1"
                  stroke={sectionColor.border}
                  strokeWidth="2"
                  strokeOpacity="0.3"
                />
                
                {/* Section Label with Enhanced Styling */}
                <rect
                  x="350"
                  y={rows[0]?.y - 40 || 0}
                  width="200"
                  height="30"
                  rx="15"
                  fill={sectionColor.bg}
                  opacity="0.9"
                />
                <text 
                  x="450" 
                  y={rows[0]?.y - 20 || 0} 
                  textAnchor="middle" 
                  fontSize="16" 
                  fontWeight="bold" 
                  fill="#FFFFFF"
                >
                  {section.section_name}
                </text>
                <text 
                  x="450" 
                  y={rows[0]?.y - 5 || 0} 
                  textAnchor="middle" 
                  fontSize="14" 
                  fontWeight="600" 
                  fill={sectionColor.name}
                >
                  £{section.price}
                </text>
                
                {/* Rows */}
                {rows.map(({ row, seats }) => (
                  <g key={row.row_name}>
                    {/* Row Labels with Enhanced Styling */}
                    <circle
                      cx={seats[0]?.x - 40 || 0}
                      cy={seats[0]?.y + SEAT_SIZE/2 || 0}
                      r="15"
                      fill={sectionColor.bg}
                      opacity="0.8"
                    />
                    <text 
                      x={seats[0]?.x - 40 || 0} 
                      y={seats[0]?.y + SEAT_SIZE/2 + 5 || 0} 
                      textAnchor="middle" 
                      fontSize="12" 
                      fontWeight="bold" 
                      fill="#FFFFFF"
                    >
                      {row.row_name}
                    </text>
                    
                    <circle
                      cx={(seats[seats.length - 1]?.x || 0) + SEAT_SIZE + 40}
                      cy={seats[0]?.y + SEAT_SIZE/2 || 0}
                      r="15"
                      fill={sectionColor.bg}
                      opacity="0.8"
                    />
                    <text 
                      x={(seats[seats.length - 1]?.x || 0) + SEAT_SIZE + 40} 
                      y={seats[0]?.y + SEAT_SIZE/2 + 5 || 0} 
                      textAnchor="middle" 
                      fontSize="12" 
                      fontWeight="bold" 
                      fill="#FFFFFF"
                    >
                      {row.row_name}
                    </text>
                    
                    {/* Seats with Enhanced Design */}
                    {seats.map(({ seat, x, y }) => {
                      const colors = getSeatColor(seat, sectionIndex);
                      const isClickable = seat.status === 'available';
                      const isSelected = selectedSeats.some(s => s.id === seat.id);
                      
                      return (
                        <g key={seat.id}>
                          {/* Seat Shadow */}
                          <rect
                            x={x + 2}
                            y={y + 2}
                            width={SEAT_SIZE}
                            height={SEAT_SIZE}
                            rx="6"
                            fill="#000000"
                            opacity="0.3"
                          />
                          {/* Enhanced Seat with data attribute */}
                          <rect
                            x={x}
                            y={y}
                            width={SEAT_SIZE}
                            height={SEAT_SIZE}
                            rx="6"
                            fill={colors.fill}
                            stroke={colors.stroke}
                            strokeWidth={isSelected ? "3" : "2"}
                            opacity={colors.opacity}
                            data-seat="true"
                            className={isClickable ? 'cursor-pointer hover:opacity-100 transition-all duration-200' : 'cursor-not-allowed'}
                            onClick={(e) => handleSeatClick(seat, e)}
                            filter={isSelected ? "url(#glow)" : "none"}
                          />
                          {/* Seat Number */}
                          <text
                            x={x + SEAT_SIZE/2}
                            y={y + SEAT_SIZE/2 + 4}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="bold"
                            fill={isSelected ? "#1F2937" : "#FFFFFF"}
                            className="pointer-events-none"
                          >
                            {seat.seat_number}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Enhanced Legend */}
      <div className="mx-6 mb-6 p-6 bg-gray-800 rounded-lg border border-gray-600">
        <h4 className="font-bold text-xl mb-4 text-center text-white">Seat Legend</h4>
        <div className="flex flex-wrap justify-center gap-8 text-sm">
          <div className="flex items-center">
            <div className="w-7 h-7 rounded-md bg-purple-500 border-2 border-purple-600 mr-3 shadow-lg"></div>
            <span className="text-gray-300 font-medium">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-7 h-7 rounded-md bg-white border-2 border-blue-500 mr-3 shadow-lg"></div>
            <span className="text-gray-300 font-medium">Selected</span>
          </div>
          <div className="flex items-center">
            <div className="w-7 h-7 rounded-md bg-yellow-500 border-2 border-yellow-600 mr-3 shadow-lg"></div>
            <span className="text-gray-300 font-medium">Reserved</span>
          </div>
          <div className="flex items-center">
            <div className="w-7 h-7 rounded-md bg-gray-500 border-2 border-gray-600 mr-3 shadow-lg opacity-50"></div>
            <span className="text-gray-300 font-medium">Booked</span>
          </div>
        </div>
      </div>

      {/* Enhanced Instructions */}
      <div className="mx-6 mb-6 p-4 bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg text-center text-sm border border-purple-700">
        <p className="text-purple-200">💡 <strong className="text-white">Navigation:</strong> Click and drag to pan • Mouse wheel or buttons to zoom • Click seats to select</p>
      </div>
    </div>
  );
};

export default SeatMap;

<defs>
  <radialGradient id="bgGradient" cx="50%" cy="30%" r="70%">
    <stop offset="0%" stopColor="#1F2937" />
    <stop offset="100%" stopColor="#111827" />
  </radialGradient>
  
  {/* Enhanced Stage Gradient */}
  <linearGradient id="stageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stopColor="#6366F1" />
    <stop offset="30%" stopColor="#4F46E5" />
    <stop offset="70%" stopColor="#3730A3" />
    <stop offset="100%" stopColor="#312E81" />
  </linearGradient>
  
  <filter id="glow">
    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
    <feMerge> 
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="SourceGraphic"/> 
    </feMerge>
  </filter>
</defs>