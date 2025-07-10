'use client'

import React, { useState, useEffect, useRef } from 'react';

interface Seat {
  id: string;
  row_name: string;
  seat_number: number;
  status: 'available' | 'reserved' | 'booked';
  venue_section_id: string;
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

const SeatMap: React.FC<SeatMapProps> = ({ 
  showId, 
  onSeatSelect, 
  onSeatDeselect, 
  selectedSeats 
}) => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatMapData, setSeatMapData] = useState<SeatMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    loadSeatMapAndSeats();
  }, [showId]);

  // 🔥 SIMPLIFIED: Single useEffect for all seat visual updates
  useEffect(() => {
    console.log('🎫 useEffect triggered:', {
      loading,
      seatsLength: seats.length,
      hasSeatMapData: !!seatMapData,
      hasSvgRef: !!svgRef.current,
      selectedSeatsLength: selectedSeats.length
    });
    
    if (!loading && seats.length > 0 && svgRef.current) {
      console.log('🎫 Calling updateSeatStatuses from useEffect');
      // Small delay to ensure SVG is fully rendered
      setTimeout(() => updateSeatStatuses(), 5);
    } else {
      console.log('🎫 useEffect conditions not met for updateSeatStatuses');
    }
  }, [seats, loading, selectedSeats, seatMapData]);

  const loadSeatMapAndSeats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load seatmap configuration
      console.log('🎫 Loading seatmap configuration...');
      const seatMapResponse = await fetch(`/api/shows/${showId}/seatmap`);
      if (!seatMapResponse.ok) {
        throw new Error('Failed to fetch seatmap');
      }
      
      const seatMapResult = await seatMapResponse.json();
      if (!seatMapResult.success) {
        throw new Error(seatMapResult.message || 'Failed to load seatmap');
      }

      console.log('🎫 Seatmap data loaded:', seatMapResult.seatMap);
      setSeatMapData(seatMapResult.seatMap);

      // If no generated SVG, fall back to hardcoded layout
      if (!seatMapResult.seatMap.generatedSVG) {
        console.warn('🎫 No generated SVG found, using fallback layout');
        setUseFallback(true);
      } else {
        console.log('🎫 Using dynamic seatmap with generated SVG');
      }

      // Load seats data
      console.log('🎫 Loading seats data...');
      const seatsResponse = await fetch(`/api/shows/${showId}/seats`);
      if (!seatsResponse.ok) {
        throw new Error('Failed to fetch seats');
      }
      
      const seatsData = await seatsResponse.json();
      console.log(`🎫 Loaded ${seatsData.length} seats from API`);
      
      // 🔥 DEBUG: Analyze seat status distribution
      const statusCounts = seatsData.reduce((acc: any, seat: any) => {
        acc[seat.status] = (acc[seat.status] || 0) + 1;
        return acc;
      }, {});
      console.log('🎫 Seat status distribution:', statusCounts);
      
      // 🔥 DEBUG: Show booked seats specifically
      const bookedSeats = seatsData.filter((seat: any) => seat.status === 'booked');
      console.log(`🎫 Found ${bookedSeats.length} booked seats:`, bookedSeats);
      
      // 🔥 DEBUG: Show all seat data structure
      console.log('🎫 Sample seat data structure:', seatsData.slice(0, 3));
      
      setSeats(seatsData);
      
    } catch (err) {
      console.error('Error loading seatmap and seats:', err);
      setError('Failed to load seat map');
      setUseFallback(true); // Use fallback on error
    } finally {
      setLoading(false);
    }
  };

  // 🔥 DEBUG: Add SVG structure inspection function
  const inspectSVGStructure = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const seatElements = svg.querySelectorAll('rect.seat');
    console.log(`🔍 SVG STRUCTURE INSPECTION:`);
    console.log(`🔍 Found ${seatElements.length} seat elements in SVG`);
    
    // Sample first 10 seats to understand structure
    const sampleSeats = Array.from(seatElements).slice(0, 10).map((element, index) => {
      const rect = element as SVGRectElement;
      return {
        index,
        tagName: rect.tagName,
        classes: rect.classList.toString(),
        section: rect.getAttribute('data-section'),
        row: rect.getAttribute('data-row'),
        seat: rect.getAttribute('data-seat'),
        sectionType: rect.getAttribute('data-section-type'),
        id: rect.id,
        allAttributes: Array.from(rect.attributes).map(attr => `${attr.name}="${attr.value}"`),
        position: {
          x: rect.getAttribute('x'),
          y: rect.getAttribute('y'),
          width: rect.getAttribute('width'),
          height: rect.getAttribute('height')
        }
      };
    });

    console.table(sampleSeats);

    // Group by section to see structure
    const sectionGroups = Array.from(seatElements).reduce((acc: any, element) => {
      const section = (element as SVGRectElement).getAttribute('data-section') || 'unknown';
      if (!acc[section]) acc[section] = [];
      acc[section].push({
        row: (element as SVGRectElement).getAttribute('data-row'),
        seat: (element as SVGRectElement).getAttribute('data-seat')
      });
      return acc;
    }, {});

    console.log(`🔍 SVG Sections structure:`, Object.keys(sectionGroups).map(section => ({
      section,
      count: sectionGroups[section].length,
      sampleSeats: sectionGroups[section].slice(0, 3)
    })));

    // Check if any booked seats exist in SVG
    const bookedElements = svg.querySelectorAll('.seat-booked');
    console.log(`🔍 Currently ${bookedElements.length} elements with .seat-booked class`);
    Array.from(bookedElements).forEach((element, index) => {
      const rect = element as SVGRectElement;
      console.log(`🔴 Booked seat ${index + 1}:`, {
        section: rect.getAttribute('data-section'),
        row: rect.getAttribute('data-row'),
        seat: rect.getAttribute('data-seat'),
        classes: rect.classList.toString()
      });
    });

    return sampleSeats;
  };

  // Add to window for browser console access
  if (typeof window !== 'undefined') {
    (window as any).inspectSeatMapSVG = inspectSVGStructure;
    // 🔥 AUTO-DEBUG: Trigger inspection automatically for debugging
    (window as any).debugSeatPositioning = true;
  }

  const updateSeatStatuses = () => {
    const svg = svgRef.current;
    if (!svg) {
      console.log('🎫 updateSeatStatuses: No SVG ref found');
      return;
    }

    // 🔥 DEBUG: Analyze database seat statuses before processing
    const dbStatusCounts = seats.reduce((acc: any, seat: Seat) => {
      acc[seat.status] = (acc[seat.status] || 0) + 1;
      return acc;
    }, {});
    console.log('🎫 Database seat status counts:', dbStatusCounts);
    
    const dbBookedSeats = seats.filter(seat => seat.status === 'booked');
    console.log(`🎫 Database has ${dbBookedSeats.length} booked seats:`, dbBookedSeats.map(s => `${s.section_name} ${s.row_name} seat ${s.seat_number}`));

    // Get all seat elements from the SVG
    const seatElements = svg.querySelectorAll('rect.seat');
    console.log(`🎫 updateSeatStatuses: Found ${seatElements.length} seat elements in SVG`);
    console.log(`🎫 updateSeatStatuses: Database has ${seats.length} seats`);
    
    // If no seats found with 'rect.seat', try alternative selectors
    if (seatElements.length === 0) {
      const allRects = svg.querySelectorAll('rect');
      const allCircles = svg.querySelectorAll('circle');
      const allPaths = svg.querySelectorAll('path');
      console.log(`🎫 Alternative element counts: rects=${allRects.length}, circles=${allCircles.length}, paths=${allPaths.length}`);
      
      // Try to find any element with seat-related attributes
      const elementsWithDataAttributes = svg.querySelectorAll('[data-section], [data-row], [data-seat]');
      console.log(`🎫 Elements with seat data attributes: ${elementsWithDataAttributes.length}`);
    }
    
    let clickHandlersAdded = 0;
    let seatMatches = 0;
    let bookedSeatMatches = 0;
    let unmatchedSeats: Array<{section: string, row: number, seat: number}> = [];
    
    seatElements.forEach((seatElement, index) => {
      const section = seatElement.getAttribute('data-section');
      const row = parseInt(seatElement.getAttribute('data-row') || '0');
      const seatNum = parseInt(seatElement.getAttribute('data-seat') || '0');
      const sectionType = seatElement.getAttribute('data-section-type');
      
      if (index < 3) { // Log first 3 for debugging
        console.log(`🎫 Seat element ${index}: section=${section}, row=${row}, seat=${seatNum}, type=${sectionType}`);
      }
      
      // 🔥 ENHANCED: Robust seat matching logic for correct positioning
      const dbSeat = seats.find(seat => {
        // 🔥 FIXED: Correct row parsing - for "B1" format, use the NUMBER (1) not letter (B=2)
        let seatRowNum = 0;
        if (seat.row_name) {
          // 🔥 CRITICAL FIX: For formats like "B1", "M3", "L2" - use the NUMBER part
          const numMatch = seat.row_name.match(/(\d+)/);
          if (numMatch) {
            seatRowNum = parseInt(numMatch[1]);
          } else {
            // Fallback: pure letter format (A=1, B=2, etc.) - rare case
            const letterMatch = seat.row_name.match(/([A-Za-z])/);
            if (letterMatch) {
              seatRowNum = letterMatch[1].toUpperCase().charCodeAt(0) - 64;
            }
          }
        }
        
        // 🔥 COMPREHENSIVE: Enhanced section mapping for better edge seat matching
        let mappedSection = '';
        if (seat.section_name) {
          // First try exact matches
          if (seat.section_name === section) {
            mappedSection = section;
          } else {
            // Then try comprehensive mapping
            const sectionMap: { [key: string]: string[] } = {
              'Premium': ['Premium', 'Premium Orchestra', 'premium', 'Premium Section'],
              'Orchestra': ['Orchestra', 'Mezzanine', 'orchestra', 'Main Floor'],
              'Mezzanine': ['Mezzanine', 'Orchestra', 'mezzanine', 'Middle'],
              'Dress Circle': ['Dress Circle', 'Side Left', 'dress circle', 'Circle'],
              'Upper Circle': ['Upper Circle', 'Side Right', 'upper circle', 'Upper'],
              'Balcony': ['Balcony', 'balcony', 'back', 'Back', 'Upper Balcony'],
              'Side Left': ['Side Left', 'Dress Circle', 'Left Side', 'side left'],
              'Side Right': ['Side Right', 'Upper Circle', 'Right Side', 'side right'],
              // Handle common edge section variations
              'back': ['Balcony', 'balcony', 'back', 'Back'],
              'front': ['Premium', 'premium', 'Orchestra'],
              'middle': ['Mezzanine', 'Orchestra', 'Middle'],
              'left': ['Side Left', 'Left Side'],
              'right': ['Side Right', 'Right Side']
            };
            
            // Find section that matches our target
            for (const [targetSection, variations] of Object.entries(sectionMap)) {
              if (variations.includes(seat.section_name) && 
                  (targetSection.toLowerCase() === section?.toLowerCase() ||
                   variations.includes(section || ''))) {
                mappedSection = section || targetSection;
                break;
              }
            }
            
            // If still no match, try fuzzy matching
            if (!mappedSection && section) {
              const sectionLower = section.toLowerCase();
              const seatSectionLower = seat.section_name.toLowerCase();
              
              if (sectionLower.includes(seatSectionLower) || 
                  seatSectionLower.includes(sectionLower)) {
                mappedSection = section;
              }
            }
            
            // Last resort: use original if still no match
            if (!mappedSection) {
              mappedSection = seat.section_name;
            }
          }
        } else {
          // Use position-based mapping for seats without section names
          mappedSection = mapSeatToSvgSection(seatRowNum, seatNum, seat.venue_section_id);
        }
        
        // 🔥 IMPROVED: More flexible matching with tolerance for edge cases
        const sectionMatch = mappedSection === section || 
                           mappedSection?.toLowerCase() === section?.toLowerCase() ||
                           (section && mappedSection?.includes(section)) ||
                           (mappedSection && section?.includes(mappedSection));
        
        // Allow some tolerance in row/seat matching for edge seats
        const rowMatch = seatRowNum === row || 
                        Math.abs(seatRowNum - row) <= 1; // Allow ±1 tolerance
        
        const seatMatch = seat.seat_number === seatNum ||
                         Math.abs(seat.seat_number - seatNum) <= 1; // Allow ±1 tolerance for edge seats
        
        const isMatch = sectionMatch && rowMatch && seatMatch;
        
        // 🔥 ENHANCED DEBUGGING: Show matches and near-misses for edge seats
        if ((index < 3 || seat.status === 'booked') || 
            (!isMatch && sectionMatch && (Math.abs(seatRowNum - row) <= 1 || Math.abs(seat.seat_number - seatNum) <= 1))) {
          console.log(`🎫 Seat matching ${isMatch ? 'SUCCESS' : 'attempt'} ${index}:`, {
            svgSeat: `${section} row ${row} seat ${seatNum}`,
            dbSeat: `${seat.section_name} ${seat.row_name} seat ${seat.seat_number}`,
            mappedSection,
            seatRowNum,
            matches: { section: sectionMatch, row: rowMatch, seat: seatMatch },
            isMatch,
            status: seat.status
          });
        }
        
        return isMatch;
      });

      if (dbSeat) {
        seatMatches++;
        
        // Check if seat is selected using correct ID format
        // 🔥 FIXED: Use same corrected row parsing logic - NUMBER first
        let rowNum = 1;
        if (dbSeat.row_name) {
          const numMatch = dbSeat.row_name.match(/(\d+)/);
          if (numMatch) {
            rowNum = parseInt(numMatch[1]);
          } else {
            const letterMatch = dbSeat.row_name.match(/([A-Za-z])/);
            if (letterMatch) {
              rowNum = letterMatch[1].toUpperCase().charCodeAt(0) - 64; // A=1, B=2, etc.
            }
          }
        }
        const expectedId = dbSeat.venue_section_id + '_' + rowNum + '_' + dbSeat.seat_number;
        const isSelected = selectedSeats.some(s => s.id === expectedId);
        
        // 🔥 DEBUG: Track booked seat matches specifically
        if (dbSeat.status === 'booked') {
          bookedSeatMatches++;
          console.log(`🔥 BOOKED SEAT MATCH ${bookedSeatMatches}:`, {
            svgElement: `${section} row ${row} seat ${seatNum}`,
            dbSeat: `${dbSeat.section_name} ${dbSeat.row_name} seat ${dbSeat.seat_number}`,
            status: dbSeat.status,
            sectionType,
            elementClasses: (seatElement as SVGRectElement).classList.toString(),
            elementFill: (seatElement as SVGRectElement).getAttribute('fill')
          });
        }
        
        // 🔥 REDUCED LOGGING: Only log first 3 matches or booked seats
        if (seatMatches <= 3 || dbSeat.status === 'booked') {
          console.log(`🎫 Seat match ${seatMatches}:`, {
            dbSeat: `${dbSeat.section_name} ${dbSeat.row_name} seat ${dbSeat.seat_number}`,
            status: dbSeat.status,
            expectedId,
            isSelected,
            selectedIds: selectedSeats.map(s => s.id)
          });
        }
        
        // 🔥 REDUCED LOGGING: Only log for first 3 or booked seats
        if (seatMatches <= 3 || dbSeat.status === 'booked') {
          console.log(`🎨 About to update seat appearance: ${dbSeat.status} for ${dbSeat.section_name} ${dbSeat.row_name} seat ${dbSeat.seat_number}`);
        }
        updateSeatAppearance(seatElement as SVGRectElement, dbSeat.status, isSelected, sectionType || 'standard');
        
        // 🔥 FIX: Clean, single event handler to prevent duplicates
        if (dbSeat.status === 'available') {
          // Use onclick for single, replaceable handler (no duplicates)
          (seatElement as SVGRectElement).onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            console.log(`🎫 Individual seat clicked: ${dbSeat.section_name} ${dbSeat.row_name} seat ${dbSeat.seat_number}`);
            handleSeatClick(dbSeat);
          };
          clickHandlersAdded++;
        } else {
          // Clear click handlers for unavailable seats
          (seatElement as SVGRectElement).onclick = null;
          (seatElement as SVGRectElement).style.pointerEvents = 'none';
        }
      } else {
        // 🔥 NEW: Track unmatched seats and apply fallback styling
        unmatchedSeats.push({section: section || 'unknown', row, seat: seatNum});
        
        // 🔥 CRITICAL FIX: Apply smart fallback styling to unmatched seats
        const seatEl = seatElement as SVGRectElement;
        seatEl.classList.remove('seat-available', 'seat-selected', 'seat-booked', 'seat-reserved');
        seatEl.classList.add('seat', 'seat-available');
        
        // 🔥 IMPROVED: Determine section type for better fallback colors
        let fallbackSectionType = sectionType || 'standard';
        
        // Infer section type from position if not provided
        if (!sectionType && section) {
          const sectionLower = section.toLowerCase();
          if (sectionLower.includes('premium') || sectionLower.includes('orchestra')) {
            fallbackSectionType = 'premium';
          } else if (sectionLower.includes('side') || sectionLower.includes('left') || sectionLower.includes('right')) {
            fallbackSectionType = 'side';
          } else if (sectionLower.includes('middle') || sectionLower.includes('mezzanine')) {
            fallbackSectionType = 'middle';
          } else if (sectionLower.includes('back') || sectionLower.includes('balcony')) {
            fallbackSectionType = 'back';
          }
        }
        
        seatEl.setAttribute('data-section-type', fallbackSectionType);
        
        // Remove any default fills and let CSS take control
        seatEl.removeAttribute('fill');
        seatEl.removeAttribute('stroke');
        seatEl.style.pointerEvents = 'auto'; // Allow clicks on unmatched seats for debugging
        
        // Add visual indicator that this is an unmatched seat (slightly dimmed)
        seatEl.style.opacity = '0.7';
        seatEl.style.filter = 'grayscale(20%)';
        
        // Add click handler for debugging unmatched seats
        seatEl.onclick = (event) => {
          event.preventDefault();
          console.log(`🚨 UNMATCHED SEAT CLICKED:`, {
            svgSection: section,
            svgRow: row,
            svgSeat: seatNum,
            sectionType: fallbackSectionType,
            position: { row, seat: seatNum },
            message: 'This seat was not matched to any database record'
          });
        };
        
        if (index < 3) {
          console.log(`🚨 UNMATCHED SEAT ${index}: ${section} row ${row} seat ${seatNum} - applying smart fallback styling (${fallbackSectionType})`);
        }
      }
    });
    
    console.log(`🎫 updateSeatStatuses complete: ${seatMatches} seats matched, ${clickHandlersAdded} click handlers added`);
    console.log(`🔥 BOOKED SEAT SUMMARY: ${bookedSeatMatches} booked seats found and processed out of ${dbBookedSeats.length} in database`);
    console.log(`🚨 UNMATCHED SEATS: ${unmatchedSeats.length} seats in SVG not found in database`);
    
    // 🔥 DEBUG: Show sample unmatched seats to understand the pattern
    if (unmatchedSeats.length > 0) {
      console.log(`🚨 Sample unmatched seats (first 10):`, unmatchedSeats.slice(0, 10));
      
      // Group unmatched seats by section to see patterns
      const unmatchedBySection = unmatchedSeats.reduce((acc: any, seat) => {
        acc[seat.section] = (acc[seat.section] || 0) + 1;
        return acc;
      }, {});
      console.log(`🚨 Unmatched seats by section:`, unmatchedBySection);
    }
    
    // 🔥 DEBUG: Check final state of all booked seat elements in DOM
    const processedBookedElements = svg.querySelectorAll('.seat-booked');
    console.log(`🔥 Final DOM check: ${processedBookedElements.length} elements with .seat-booked class found`);
    processedBookedElements.forEach((element, index) => {
      console.log(`🔥 Booked element ${index + 1}:`, {
        classes: element.classList.toString(),
        fill: element.getAttribute('fill'),
        computedFill: window.getComputedStyle(element as Element).fill,
        section: element.getAttribute('data-section'),
        row: element.getAttribute('data-row'),
        seat: element.getAttribute('data-seat')
      });
    });
  };

  // Map seat position to SVG section based on seat layout
  const mapSeatToSvgSection = (rowNum: number, seatNum: number, sectionId: string): string => {
    // Premium section: rows 1-8, seats 1-12 (center front)
    if (rowNum >= 1 && rowNum <= 8 && seatNum >= 1 && seatNum <= 12) {
      return 'Premium';
    }
    // Side sections: smaller capacity, specific positioning
    if (rowNum >= 1 && rowNum <= 6 && seatNum >= 1 && seatNum <= 5) {
      return Math.random() > 0.5 ? 'SideA' : 'SideB'; // Randomly assign for demo
    }
    // Middle section: rows 1-12, seats 1-14 (center middle)
    if (rowNum >= 1 && rowNum <= 12 && seatNum >= 1 && seatNum <= 14) {
      return 'Middle';
    }
    // Back section: rows 1-6, variable seats (triangular)
    if (rowNum >= 1 && rowNum <= 6) {
      return 'Back';
    }
    // Default fallback
    return 'Premium';
  };

  const updateSeatAppearance = (
    seatElement: SVGRectElement, 
    status: string, 
    isSelected: boolean, 
    sectionType: string
  ) => {
    // 🔥 FIX: Let CSS handle ALL styling - no inline attributes
    
    // Remove all existing status classes
    seatElement.classList.remove('seat-available', 'seat-selected', 'seat-booked', 'seat-reserved');
    
    // 🔥 CRITICAL: Remove ALL inline styles to let CSS take control
    seatElement.removeAttribute('fill');
    seatElement.removeAttribute('stroke');
    seatElement.removeAttribute('stroke-width');
    seatElement.style.removeProperty('opacity');
    seatElement.style.removeProperty('cursor');
    seatElement.style.removeProperty('animation');
    seatElement.style.removeProperty('transform');
    seatElement.style.removeProperty('filter');
    
    // Always add base seat class
    seatElement.classList.add('seat');
    
    // Determine the appropriate class
    let className;
    if (status === 'booked' || status === 'reserved') {
      className = status === 'booked' ? 'seat-booked' : 'seat-reserved';
    } else if (isSelected) {
      className = 'seat-selected';
    } else {
      className = 'seat-available';
    }
    
    // Add section type for color differentiation
    seatElement.setAttribute('data-section-type', sectionType);
    
    // 🔥 ONLY add the status class - CSS handles the rest!
    seatElement.classList.add(className);
    
    // 🔥 DEBUG: Special logging for booked seats
    if (status === 'booked') {
      console.log(`🔥 BOOKED SEAT STYLED:`, {
        className,
        finalClasses: seatElement.classList.toString(),
        computedFill: window.getComputedStyle(seatElement).fill,
        inlineFill: seatElement.getAttribute('fill'),
        cssRules: 'Check if .seat-booked styles are applied'
      });
      
      // Force a style recalculation for SVG element
      seatElement.getBBox();
    }
    
    // 🔥 REDUCED LOGGING: Only log for booked seats to reduce spam
    if (status === 'booked') {
      console.log(`🎨 Updated seat: ${className}, selected: ${isSelected}, section: ${sectionType}`, {
        finalClasses: seatElement.classList.toString(),
        element: seatElement
      });
    }
  };

  const handleSeatClick = (seat: Seat) => {
    console.log('🎫 Seat clicked:', seat);
    
    if (seat.status !== 'available') {
      console.log('❌ Seat not available, status:', seat.status);
      return;
    }
    
    // 🔥 CRITICAL: Check selection using the parent's ID format (venue_section_id_row_seat)
    // 🔥 FIXED: Use corrected row parsing logic - NUMBER first
    let rowNumber = 1;
    if (seat.row_name) {
      const numMatch = seat.row_name.match(/(\d+)/);
      if (numMatch) {
        rowNumber = parseInt(numMatch[1]);
      } else {
        const letterMatch = seat.row_name.match(/([A-Za-z])/);
        if (letterMatch) {
          rowNumber = letterMatch[1].toUpperCase().charCodeAt(0) - 64; // A=1, B=2, etc.
        }
      }
    }
    const parentIdFormat = seat.venue_section_id + '_' + rowNumber + '_' + seat.seat_number;
    
    const isSelected = selectedSeats.some(s => s.id === parentIdFormat);
    
    console.log('🎫 Seat selection check:', {
      seatId: seat.id,
      parentIdFormat,
      isSelected,
      selectedSeatsIds: selectedSeats.map(s => s.id)
    });
    
    if (isSelected) {
      console.log('🎫 Deselecting seat:', parentIdFormat);
      onSeatDeselect(parentIdFormat);
    } else {
      console.log('🎫 Selecting seat:', seat);
      onSeatSelect(seat);
    }
    
    // 🔥 IMMEDIATE VISUAL FEEDBACK: Update the clicked element directly
    // Use the same mapping logic as updateSeatStatuses to find the SVG element
    let mappedSection = '';
    if (seat.section_name) {
      const sectionMap: { [key: string]: string } = {
        'Premium Orchestra': 'Premium',
        'Orchestra': 'Mezzanine',
        'Dress Circle': 'Side Left', 
        'Upper Circle': 'Side Right',
        'Balcony': 'Balcony'
      };
      mappedSection = sectionMap[seat.section_name] || seat.section_name;
    }
    
    const seatElement = svgRef.current?.querySelector(
      `rect[data-section="${mappedSection}"][data-row="${rowNumber}"][data-seat="${seat.seat_number}"]`
    ) as SVGRectElement;
    
    if (seatElement) {
      console.log('🎨 Applying immediate visual feedback to clicked seat');
      // Remove existing classes and apply new state
      seatElement.classList.remove('seat-available', 'seat-selected');
      if (isSelected) {
        seatElement.classList.add('seat-available');
      } else {
        seatElement.classList.add('seat-selected');
      }
    } else {
      console.log('⚠️ Could not find seat element for immediate feedback:', {
        mappedSection,
        rowNumber,
        seatNumber: seat.seat_number,
        querySelector: `rect[data-section="${mappedSection}"][data-row="${rowNumber}"][data-seat="${seat.seat_number}"]`
      });
    }
    
    // Also trigger full update immediately as backup
    if (svgRef.current) {
      console.log('🎨 Running full updateSeatStatuses after click');
      updateSeatStatuses();
    }
  };

  // Fallback hardcoded SVG (original implementation)
  const renderFallbackSeatMap = () => {
    console.log('🎫 Rendering fallback seatmap');
    
    return (
      <svg 
        ref={svgRef}
        viewBox="200 100 1000 900" 
        xmlns="http://www.w3.org/2000/svg" 
        style={{
          backgroundColor: '#1a1a1a', 
          width: '100%', 
          height: '100%', 
          maxWidth: '100%', 
          margin: '0 auto', 
          display: 'block'
        }}
      >
        <defs>
          {/* Basic gradients for fallback */}
          <linearGradient id="fallbackGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{stopColor:'#e0e0e0', stopOpacity:1}} />
            <stop offset="100%" style={{stopColor:'#b0b0b0', stopOpacity:1}} />
          </linearGradient>
        </defs>

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
                  x={475 + col * 30}
                  y={190 + row * 28}
                  width="24"
                  height="22"
                  rx="4"
                  fill={isSelected ? "#ef4444" : "#60a5fa"}
                  stroke={isSelected ? "#dc2626" : "#3b82f6"}
                  strokeWidth={isSelected ? "2" : "1"}
                  data-section="Fallback"
                  data-row={row + 1}
                  data-seat={col + 1}
                  data-section-type="standard"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    console.log(`🎫 Fallback seat clicked: row ${row + 1}, seat ${col + 1}`);
                    // Create a mock seat object for testing
                    const mockSeat = {
                      id: seatId,
                      row_name: `Row ${String.fromCharCode(65 + row)}`, // A, B, C, etc.
                      seat_number: col + 1,
                      status: 'available' as const,
                      venue_section_id: 'fallback-section',
                      section_name: 'Fallback Section'
                    };
                    handleSeatClick(mockSeat);
                  }}
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !useFallback) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-600">{error}</div>
        <button
          onClick={() => setUseFallback(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Use Fallback Layout
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {/* Show dynamic seatmap if available, otherwise show fallback */}
      {!useFallback && seatMapData?.generatedSVG ? (
        <div 
          ref={(div) => {
            if (div && seatMapData.generatedSVG) {
              console.log('🎫 Setting dynamic SVG content');
              div.innerHTML = seatMapData.generatedSVG;
              const svg = div.querySelector('svg');
              if (svg && svgRef.current !== svg) {
                console.log('🎫 SVG ref updated, applying styles');
                svgRef.current = svg as SVGSVGElement;
                // Apply styles to the SVG
                svg.style.width = '100%';
                svg.style.height = '100%';
                svg.style.maxWidth = '100%';
                svg.style.margin = '0 auto';
                svg.style.display = 'block';
                // Trigger seat status update after SVG is loaded
                if (seats.length > 0) {
                  console.log('🎫 Triggering updateSeatStatuses after SVG load');
                  setTimeout(() => updateSeatStatuses(), 100);
                } else {
                  console.log('🎫 No seats data available yet for updateSeatStatuses');
                }
              }
            }
          }}
          className="w-full h-full"
        />
      ) : (
        renderFallbackSeatMap()
      )}
    </div>
  );
};

export default SeatMap; 