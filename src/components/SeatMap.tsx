'use client'

import React, { useState, useEffect, useRef, useCallback, useReducer, useMemo } from 'react'
import { SeatMapDebugPanel, exposeSeatMapTestingToConsole } from './SeatMapTestUtils'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface Seat {
  id: string;
  row_letter: string; // Changed from row_name to match API
  seat_number: number;
  status: 'available' | 'reserved' | 'booked';
  section_id: string; // Changed from venue_section_id to match API
  section_name?: string;
}

interface SeatMapData {
  id: string;
  name: string;
  layoutConfig: any;
  totalCapacity: number;
  svgViewbox: string;
  generatedSVG: string | null;
  seats: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    section: string;
    row: number;
    seat: number;
    type: string;
  }>;
  viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

interface SeatMapProps {
  showId: string;
  onSeatSelect: (seat: Seat) => void;
  onSeatDeselect: (seatId: string) => void;
  selectedSeats: Seat[];
}

// ============================================================================
// UNIFIED SEAT IDENTIFICATION SYSTEM
// ============================================================================

/**
 * Enterprise-grade seat identification utilities
 * Ensures consistent seat ID generation across the entire application
 */
class SeatIdentifier {
  static parseRowNumber(rowName: string): number {
    if (!rowName) return 1;
    
    // Priority 1: Extract number from row name (B1 -> 1, M3 -> 3)
    const numMatch = rowName.match(/(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }
    
    // Priority 2: Pure letter format (A=1, B=2, etc.)
    const letterMatch = rowName.match(/([A-Za-z])/);
    if (letterMatch) {
      return letterMatch[1].toUpperCase().charCodeAt(0) - 64;
    }
    
    return 1; // Fallback
  }

  static generateSeatId(seat: Seat): string {
    const rowNum = this.parseRowNumber(seat.row_letter); // Changed from row_name
    return `${seat.section_id}_${rowNum}_${seat.seat_number}`; // Changed from venue_section_id
  }

  static generateSelectorQuery(section: string, row: number, seatNumber: number): string {
    return `rect[data-section="${section}"][data-row="${row}"][data-seat="${seatNumber}"]`;
  }

  static mapSectionName(dbSectionName: string): string {
    const sectionMap: Record<string, string> = {
      'Premium Orchestra': 'Premium',
      'Orchestra': 'Mezzanine',
      'Dress Circle': 'Side Left',
      'Upper Circle': 'Side Right',
      'Balcony': 'Balcony'
    };
    
    return sectionMap[dbSectionName] || dbSectionName;
  }
}

// ============================================================================
// STATE MANAGEMENT WITH REDUCER
// ============================================================================

interface SeatMapState {
  seats: Seat[];
  seatMapData: SeatMapData | null;
  loading: boolean;
  error: string | null;
  useFallback: boolean;
  renderVersion: number; // Force re-renders when needed
}

type SeatMapAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_SEATS'; seats: Seat[] }
  | { type: 'SET_SEAT_MAP_DATA'; data: SeatMapData | null }
  | { type: 'SET_USE_FALLBACK'; useFallback: boolean }
  | { type: 'FORCE_RENDER' }
  | { type: 'RESET' };

function seatMapReducer(state: SeatMapState, action: SeatMapAction): SeatMapState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_SEATS':
      return { ...state, seats: action.seats, renderVersion: state.renderVersion + 1 };
    case 'SET_SEAT_MAP_DATA':
      return { ...state, seatMapData: action.data };
    case 'SET_USE_FALLBACK':
      return { ...state, useFallback: action.useFallback };
    case 'FORCE_RENDER':
      return { ...state, renderVersion: state.renderVersion + 1 };
    case 'RESET':
      return {
        seats: [],
        seatMapData: null,
        loading: true,
        error: null,
        useFallback: false,
        renderVersion: 0
      };
    default:
      return state;
  }
}

// ============================================================================
// DEBOUNCING UTILITIES
// ============================================================================

function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]) as T;
}

function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRunRef.current >= delay) {
      lastRunRef.current = now;
      callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        lastRunRef.current = Date.now();
        callback(...args);
      }, delay - (now - lastRunRef.current));
    }
  }, [callback, delay]) as T;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SeatMap: React.FC<SeatMapProps> = ({ 
  showId, 
  onSeatSelect, 
  onSeatDeselect, 
  selectedSeats 
}) => {
  // State management with reducer
  const [state, dispatch] = useReducer(seatMapReducer, {
    seats: [],
    seatMapData: null,
    loading: true,
    error: null,
    useFallback: false,
    renderVersion: 0
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // ============================================================================
  // MEMOIZED SELECTED SEAT IDS FOR PERFORMANCE
  // ============================================================================

  const selectedSeatIds = useMemo(() => {
    return new Set(selectedSeats.map(seat => seat.id));
  }, [selectedSeats]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadSeatMapAndSeats = useCallback(async () => {
    if (!showId) return;

    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });

      console.log('🎫 [SeatMap] Loading data for show:', showId);

      // Load seatmap configuration
      const seatMapResponse = await fetch(`/api/shows/${showId}/seatmap`);
      if (!seatMapResponse.ok) {
        throw new Error('Failed to fetch seatmap');
      }
      
      const seatMapResult = await seatMapResponse.json();
      if (!seatMapResult.success) {
        throw new Error(seatMapResult.message || 'Failed to load seatmap');
      }

      dispatch({ type: 'SET_SEAT_MAP_DATA', data: seatMapResult.seatMap });

      // Check if we need fallback - use layoutConfig instead of generatedSVG
      if (!seatMapResult.seatMap.layoutConfig) {
        console.warn('🎫 [SeatMap] No layout config found, using fallback layout');
        dispatch({ type: 'SET_USE_FALLBACK', useFallback: true });
      } else {
        console.log('🎭 [SeatMap] Hamilton Theater layout config found, using dynamic layout');
        dispatch({ type: 'SET_USE_FALLBACK', useFallback: false });
      }

      // Load seats data
      const seatsResponse = await fetch(`/api/shows/${showId}/seats`);
      if (!seatsResponse.ok) {
        throw new Error('Failed to fetch seats');
      }
      
      const seatsData = await seatsResponse.json();
      console.log(`🎫 [SeatMap] Loaded ${seatsData.length} seats from API`);
      
      dispatch({ type: 'SET_SEATS', seats: seatsData });
      
    } catch (err) {
      console.error('🎫 [SeatMap] Error loading data:', err);
      dispatch({ type: 'SET_ERROR', error: 'Failed to load seat map' });
      dispatch({ type: 'SET_USE_FALLBACK', useFallback: true });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [showId]);

  // ============================================================================
  // SEAT STATUS UPDATE WITH DEBOUNCING
  // ============================================================================

  const updateSeatStatusesImpl = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || state.seats.length === 0) {
      console.log('🎫 [SeatMap] updateSeatStatuses: No SVG or seats available');
      return;
    }

    console.log('🎫 [SeatMap] Updating seat statuses...');

    // Get all seat elements
    const seatElements = svg.querySelectorAll('rect.seat, rect[data-seat]');
    console.log(`🎫 [SeatMap] Found ${seatElements.length} seat elements in SVG`);

    let matchedSeats = 0;
    let processedSelections = 0;

    seatElements.forEach((element) => {
      const seatEl = element as SVGRectElement;
      const section = seatEl.getAttribute('data-section');
      const rowLetter = seatEl.getAttribute('data-row-letter') || '';
      const seatNum = parseInt(seatEl.getAttribute('data-seat') || '0');

      // Find matching database seat - direct matching since we now use exact database format
      const dbSeat = state.seats.find(seat => {
        return seat.section_name === section && 
               seat.row_letter === rowLetter && 
               seat.seat_number === seatNum;
      });

      if (dbSeat) {
        matchedSeats++;
        
        // Check if seat is selected using the database seat ID
        const isSelected = selectedSeatIds.has(dbSeat.id);
        
        if (isSelected) processedSelections++;

        // Update appearance
        updateSeatAppearance(seatEl, dbSeat.status, isSelected);
      } else {
        // Apply fallback styling for unmatched seats
        applyFallbackSeatStyling(seatEl, section || 'unknown');
      }
    });

    console.log(`🎫 [SeatMap] Updated ${matchedSeats} seats, ${processedSelections} selections`);
  }, [state.seats, selectedSeatIds]);

  // Debounced version for frequent updates
  const updateSeatStatuses = useDebounce(updateSeatStatusesImpl, 50);

  // ============================================================================
  // SEAT APPEARANCE MANAGEMENT
  // ============================================================================

  const updateSeatAppearance = useCallback((
    seatElement: SVGRectElement,
    status: string,
    isSelected: boolean
  ) => {
    // Remove all status classes
    seatElement.classList.remove('seat-available', 'seat-selected', 'seat-booked', 'seat-reserved');
    
    // Remove inline styles to let CSS take control
    seatElement.removeAttribute('fill');
    seatElement.removeAttribute('stroke');
    seatElement.removeAttribute('stroke-width');
    seatElement.style.removeProperty('opacity');
    seatElement.style.removeProperty('cursor');
    seatElement.style.removeProperty('animation');
    seatElement.style.removeProperty('transform');
    seatElement.style.removeProperty('filter');
    
    // Add base class
    seatElement.classList.add('seat');
    
    // Determine status class
    let statusClass: string;
    if (status === 'booked' || status === 'reserved') {
      statusClass = status === 'booked' ? 'seat-booked' : 'seat-reserved';
    } else if (isSelected) {
      statusClass = 'seat-selected';
    } else {
      statusClass = 'seat-available';
    }
    
    seatElement.classList.add(statusClass);
  }, []);

  const applyFallbackSeatStyling = useCallback((
    seatElement: SVGRectElement,
    section: string
  ) => {
    seatElement.classList.remove('seat-available', 'seat-selected', 'seat-booked', 'seat-reserved');
    seatElement.classList.add('seat', 'seat-available');
    
    // Infer section type for styling
    const sectionLower = section.toLowerCase();
    let sectionType = 'standard';
    
    if (sectionLower.includes('premium') || sectionLower.includes('orchestra')) {
      sectionType = 'premium';
    } else if (sectionLower.includes('side')) {
      sectionType = 'side';
    } else if (sectionLower.includes('middle') || sectionLower.includes('mezzanine')) {
      sectionType = 'middle';
    } else if (sectionLower.includes('back') || sectionLower.includes('balcony')) {
      sectionType = 'back';
    }
    
    seatElement.setAttribute('data-section-type', sectionType);
    seatElement.style.opacity = '0.7';
  }, []);

  // ============================================================================
  // EVENT DELEGATION SYSTEM
  // ============================================================================

  const handleSeatClick = useThrottle(useCallback((event: Event) => {
    const target = event.target as SVGRectElement;
    
    // Validate that this is a seat element
    if (!target || target.tagName !== 'rect' || !target.classList.contains('seat')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const section = target.getAttribute('data-section');
    const rowLetter = target.getAttribute('data-row-letter') || '';
    const seatNum = parseInt(target.getAttribute('data-seat') || '0');

    console.log(`🎫 [SeatMap] Seat clicked: ${section} row ${rowLetter} seat ${seatNum}`);

    // Find corresponding database seat - direct matching since we now use exact database format
    const dbSeat = state.seats.find(seat => {
      return seat.section_name === section && 
             seat.row_letter === rowLetter && 
             seat.seat_number === seatNum;
    });

    if (!dbSeat) {
      console.log(`🎫 [SeatMap] No database seat found for: ${section} row ${rowLetter} seat ${seatNum}`);
      return;
    }

    if (dbSeat.status !== 'available') {
      console.log(`🎫 [SeatMap] Seat not available, status: ${dbSeat.status}`);
      return;
    }

    // Check if seat is currently selected using the database seat ID
    const isSelected = selectedSeatIds.has(dbSeat.id);

    if (isSelected) {
      console.log(`🎫 [SeatMap] Deselecting seat with database ID: ${dbSeat.id}`);
      onSeatDeselect(dbSeat.id); // Pass the actual database seat ID
    } else {
      console.log(`🎫 [SeatMap] Selecting seat:`, dbSeat);
      onSeatSelect(dbSeat);
    }

    // Immediate visual feedback
    const newIsSelected = !isSelected;
    updateSeatAppearance(target, dbSeat.status, newIsSelected);
    
  }, [state.seats, selectedSeatIds, onSeatSelect, onSeatDeselect, updateSeatAppearance]), 100);

  // ============================================================================
  // SVG INITIALIZATION AND EVENT DELEGATION SETUP
  // ============================================================================

  const initializeSVG = useCallback((svg: SVGSVGElement) => {
    if (isInitializedRef.current) {
      // Clean up existing event listeners
      svg.removeEventListener('click', handleSeatClick);
    }

    console.log('🎫 [SeatMap] Initializing SVG with event delegation');
    
    // Apply base styles
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.maxWidth = '100%';
    svg.style.margin = '0 auto';
    svg.style.display = 'block';
    svg.style.userSelect = 'none';
    
    // Set up single event delegation listener
    svg.addEventListener('click', handleSeatClick, { passive: false });
    
    isInitializedRef.current = true;
    
    // Trigger seat status update
    updateSeatStatuses();
  }, [handleSeatClick, updateSeatStatuses]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load data when showId changes
  useEffect(() => {
    dispatch({ type: 'RESET' });
    isInitializedRef.current = false;
    loadSeatMapAndSeats();
  }, [showId, loadSeatMapAndSeats]);

  // Update seat statuses when selections change
  useEffect(() => {
    if (!state.loading && state.seats.length > 0 && svgRef.current) {
      updateSeatStatuses();
    }
  }, [selectedSeats, state.loading, state.seats.length, state.renderVersion, updateSeatStatuses]);

  // Expose testing utilities to console in development
  useEffect(() => {
    if (svgRef.current && state.seats.length > 0) {
      exposeSeatMapTestingToConsole(svgRef as React.RefObject<SVGSVGElement>, state.seats);
    }
  }, [state.seats, svgRef.current]);

  // ============================================================================
  // HAMILTON THEATER SVG GENERATOR
  // ============================================================================

  const generateHamiltonTheaterSVG = useCallback(() => {
    if (!state.seatMapData?.layoutConfig) {
      return null;
    }

    const config = state.seatMapData.layoutConfig;
    const viewBox = state.seatMapData.svgViewbox || "0 0 1400 1000";
    
    console.log('🎭 [SeatMap] Generating Hamilton Theater SVG from layoutConfig');

    return (
      <svg 
        ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg" 
        style={{
          backgroundColor: '#1a1a1a', 
          width: '100%', 
          height: '100%', 
          maxWidth: '95%', 
          maxHeight: '95%',
          margin: '0 auto', 
          display: 'block',
          userSelect: 'none'
        }}
      >
        {/* Stage */}
        <path d="M 300 50 L 800 50 L 780 130 L 320 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="2"/>
        <text x="550" y="95" textAnchor="middle" fill="#888" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold" pointerEvents="none">STAGE</text>

        {/* Generate seats from layoutConfig */}
        <g id="theaterSeats">
          {config.sections?.map((section: any, sectionIndex: number) => {
            const sectionElement = [];
            const offset = section.offset || { x: 0, y: 0 };
            
            if (section.shape === 'grid') {
              // Grid sections (Premium Orchestra, Mezzanine, Sides)
              for (let row = 0; row < section.rows; row++) {
                for (let col = 0; col < section.cols; col++) {
                  const seatX = offset.x + col * (section.seatSpacing || 22);
                  const seatY = offset.y + row * (section.rowSpacing || 20);
                  const rowLetter = String.fromCharCode(65 + row); // A, B, C...
                  const seatNumber = col + 1;

                  // Map section names and generate correct row letters to match database
                  let mappedSectionName = section.name;
                  let sectionType = 'standard';
                  let actualRowLetter = rowLetter; // Default A, B, C...
                  
                  if (section.name === 'Premium Orchestra') {
                    mappedSectionName = 'Premium Orchestra'; // Use full name to match database
                    sectionType = 'premium';
                    actualRowLetter = 'P' + String.fromCharCode(65 + row); // PA, PB, PC...
                  } else if (section.name === 'Side Left') {
                    mappedSectionName = 'Side Left';
                    sectionType = 'side';
                    actualRowLetter = 'L' + (row + 1); // L1, L2, L3...
                  } else if (section.name === 'Side Right') {
                    mappedSectionName = 'Side Right';
                    sectionType = 'side';
                    actualRowLetter = 'R' + (row + 1); // R1, R2, R3...
                  } else if (section.name === 'Mezzanine') {
                    mappedSectionName = 'Mezzanine';
                    sectionType = 'middle';
                    actualRowLetter = 'M' + (row + 1); // M1, M2, M3...
                  } else if (section.name === 'Balcony') {
                    mappedSectionName = 'Balcony';
                    sectionType = 'back';
                    actualRowLetter = 'B' + (row + 1); // B1, B2, B3...
                  }

                  // Find the actual seat data from database to get status
                  const seatData = state.seats?.find(seat => {
                    return seat.section_name === mappedSectionName && 
                           seat.row_letter === actualRowLetter && 
                           seat.seat_number === seatNumber;
                  });
                  
                  // Determine seat class based on status and selection
                  let seatClass = 'seat';
                  if (seatData?.status === 'booked') {
                    seatClass += ' seat-booked';
                  } else if (seatData?.status === 'reserved') {
                    seatClass += ' seat-reserved';
                  } else if (selectedSeats.some(s => s.id === seatData?.id)) {
                    seatClass += ' seat-selected';
                  } else {
                    seatClass += ' seat-available';
                  }

                  sectionElement.push(
                    <rect
                      key={`${sectionIndex}-${row}-${col}`}
                      className={seatClass}
                      x={seatX}
                      y={seatY}
                      width="18"
                      height="16"
                      rx="3"
                      data-section={mappedSectionName}
                      data-row-letter={actualRowLetter}
                      data-seat={seatNumber}
                      data-section-type={sectionType}
                    />
                  );
                }
              }
            } else if (section.shape === 'trapezoid' && section.rowCounts) {
              // Trapezoid sections (Balcony)
              section.rowCounts.forEach((colCount: number, row: number) => {
                const rowStartX = offset.x + (22 - colCount) * (section.seatSpacing || 19) / 2; // Center the row
                
                for (let col = 0; col < colCount; col++) {
                  const seatX = rowStartX + col * (section.seatSpacing || 19);
                  const seatY = offset.y + row * (section.rowSpacing || 18);
                  const rowLetter = String.fromCharCode(65 + row); // A, B, C...
                  const seatNumber = col + 1;

                  // Generate correct row letter for Balcony section
                  const actualRowLetter = 'B' + (row + 1); // B1, B2, B3...
                  
                  // Find the actual seat data from database to get status for Balcony section
                  const seatData = state.seats?.find(seat => {
                    return seat.section_name === 'Balcony' && 
                           seat.row_letter === actualRowLetter && 
                           seat.seat_number === seatNumber;
                  });
                  
                  // Determine seat class based on status and selection
                  let seatClass = 'seat';
                  if (seatData?.status === 'booked') {
                    seatClass += ' seat-booked';
                  } else if (seatData?.status === 'reserved') {
                    seatClass += ' seat-reserved';
                  } else if (selectedSeats.some(s => s.id === seatData?.id)) {
                    seatClass += ' seat-selected';
                  } else {
                    seatClass += ' seat-available';
                  }

                  sectionElement.push(
                    <rect
                      key={`balcony-${row}-${col}`}
                      className={seatClass}
                      x={seatX}
                      y={seatY}
                      width="18"
                      height="16"
                      rx="3"
                      data-section="Balcony"
                      data-row-letter={actualRowLetter}
                      data-seat={seatNumber}
                      data-section-type="back"
                    />
                  );
                }
              });
            }

            return (
              <g key={`section-${sectionIndex}`} id={`section-${section.id}`}>
                {sectionElement}
                {/* Section label */}
                <text 
                  x={offset.x + (section.cols || 15) * (section.seatSpacing || 22) / 2} 
                  y={offset.y - 8} 
                  textAnchor="middle" 
                  fill="#888" 
                  fontFamily="Arial, sans-serif" 
                  fontSize="12" 
                  fontWeight="bold" 
                  pointerEvents="none"
                >
                  {section.name}
                </text>
              </g>
            );
          })}
        </g>

        {/* Theater info */}
        <text x="550" y="780" textAnchor="middle" fill="#666" fontFamily="Arial, sans-serif" fontSize="14" pointerEvents="none">
          {state.seatMapData.name} - {state.seatMapData.totalCapacity} seats
        </text>
      </svg>
    );
  }, [state.seatMapData, state.seats, selectedSeats]);

  // ============================================================================
  // FALLBACK SEAT MAP
  // ============================================================================

  const renderFallbackSeatMap = useCallback(() => {
    console.log('🎫 [SeatMap] Rendering fallback seatmap');
    
    return (
      <svg 
        ref={svgRef}
        viewBox="0 0 1400 1000" 
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg" 
        style={{
          backgroundColor: '#1a1a1a', 
          width: '100%', 
          height: '100%', 
          maxWidth: '95%', 
          maxHeight: '95%',
          margin: '0 auto', 
          display: 'block',
          userSelect: 'none'
        }}
      >
        {/* Stage */}
        <path d="M 300 50 L 1100 50 L 1050 130 L 350 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="2"/>
        <text x="700" y="95" textAnchor="middle" fill="#888" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="bold" pointerEvents="none">STAGE</text>

        {/* Simple fallback seat layout */}
        <g id="fallbackSeats">
          {Array.from({length: 10}, (_, row) =>
            Array.from({length: 15}, (_, col) => {
              const seatId = `fallback-${row}-${col}`;
              const isSelected = selectedSeats.some(s => s.id === seatId);
              
              return (
                <rect
                  key={seatId}
                  className={`seat ${isSelected ? 'seat-selected' : 'seat-available'}`}
                  x={500 + col * 24}
                  y={220 + row * 22}
                  width="18"
                  height="16"
                  rx="3"
                  data-section="Fallback"
                  data-row={row + 1}
                  data-seat={col + 1}
                  data-section-type="standard"
                />
              );
            })
          )}
        </g>

        {/* Fallback notice */}
        <text x="700" y="600" textAnchor="middle" fill="#666" fontFamily="Arial, sans-serif" fontSize="14" pointerEvents="none">
          Using fallback seat layout - dynamic seatmap not available
        </text>
      </svg>
    );
  }, [selectedSeats]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      const svg = svgRef.current;
      if (svg && isInitializedRef.current) {
        svg.removeEventListener('click', handleSeatClick);
      }
    };
  }, [handleSeatClick]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading seat map...</span>
      </div>
    );
  }

  if (state.error && !state.useFallback) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-600">{state.error}</div>
        <button
          onClick={() => dispatch({ type: 'SET_USE_FALLBACK', useFallback: true })}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Use Fallback Layout
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden"
              style={{
        minHeight: '300px',
        maxHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px'
      }}
    >
      {!state.useFallback && state.seatMapData?.layoutConfig ? (
        <div
          ref={(div) => {
            if (div && svgRef.current) {
              initializeSVG(svgRef.current);
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {generateHamiltonTheaterSVG()}
        </div>
      ) : (
        <div
          ref={(div) => {
            if (div && svgRef.current) {
              initializeSVG(svgRef.current);
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {renderFallbackSeatMap()}
        </div>
      )}
      
      {/* Debug Panel - Only visible in development */}
      <SeatMapDebugPanel
        svgRef={svgRef as React.RefObject<SVGSVGElement>}
        seats={state.seats}
        selectedSeats={selectedSeats}
      />
    </div>
  );
};

export default SeatMap; 