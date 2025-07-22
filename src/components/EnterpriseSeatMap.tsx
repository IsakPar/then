'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BAGLEY_WRIGHT_LAYOUT } from '@/lib/seatmaps/bagley-wright-layout';

// Type declaration for window object
declare global {
  interface Window {
    seatMapRenderer?: {
      handleSeatClick?: (seatId: string) => void;
      zoomIn?: () => void;
      zoomOut?: () => void;
      autoZoom?: () => void;
    };
  }
}

/**
 * Enhanced Bagley Wright Theater Renderer
 * 
 * Professional implementation that renders the 6-section curved theater layout
 * matching the reference image exactly.
 */
const createBagleyWrightRenderer = (container: any, options: any) => {
  console.log("🎭 Creating Bagley Wright theater renderer with:", options);
  
  let selectedSeats = new Set<string>();
  let currentScale = 1;
  let seatMapElement: HTMLElement | null = null;
  let hoveredSeatId: string | null = null;
  
  // Calculate optimal scale to fit the complete theater layout
  const calculateOptimalScale = (seatMapWidth: number, seatMapHeight: number) => {
    const containerWidth = container.clientWidth - 60; // More padding for professional look
    const containerHeight = container.clientHeight - 60;
    
    const scaleX = containerWidth / seatMapWidth;
    const scaleY = containerHeight / seatMapHeight;
    
    // Use smaller scale to ensure everything fits, with reasonable bounds
    return Math.max(0.4, Math.min(1.5, Math.min(scaleX, scaleY) * 0.85));
  };
  
  // Auto-zoom to fit the complete Bagley Wright theater
  const autoZoom = () => {
    if (!seatMapElement) return;
    
    // Use the SVG viewBox dimensions from our layout
    const viewBox = BAGLEY_WRIGHT_LAYOUT.svgViewBox.split(' ').map(Number);
    const [, , width, height] = viewBox;
    
    const optimalScale = calculateOptimalScale(width, height);
    currentScale = optimalScale;
    
    seatMapElement.style.transform = `scale(${currentScale})`;
    seatMapElement.style.transformOrigin = 'top center';
    
    console.log(`🔍 Auto-zoom applied: ${(currentScale * 100).toFixed(0)}% for ${width}x${height} theater`);
  };

  /**
   * Render the complete Bagley Wright Theater with professional styling
   */
  const renderBagleyWrightTheater = (data: any) => {
    console.log("🎨 Rendering Bagley Wright Theater with data:", {
      sections: data?.sections?.length || 0,
      totalSeats: data?.sections?.reduce((total: number, section: any) => 
        total + (section?.seats?.length || 0), 0) || 0
    });
    
    const sections = data?.sections || [];
    const totalSeats = sections.reduce((total: number, section: any) => 
      total + (section?.seats?.length || 0), 0);
    
    // Group seats by section for organized rendering
    const sectionMap = new Map();
    sections.forEach((section: any) => {
      const sectionId = section.section?.id || section.section_id || 'unknown';
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, {
          info: section.section || { name: 'Unknown Section', color_hex: '#3B82F6' },
          seats: []
        });
      }
      sectionMap.get(sectionId).seats.push(section);
    });

    /**
     * Generate curved section with seats positioned along mathematical arcs
     */
    const renderCurvedSection = (sectionSeats: any[], sectionInfo: any, sectionConfig: any) => {
      if (!sectionSeats.length) return '';
      
      const color = sectionInfo.color_hex || sectionConfig?.color || '#3B82F6';
      const displayName = sectionInfo.display_name || sectionConfig?.displayName || sectionInfo.name;
      
      // Group seats by row for better organization
      const seatsByRow = sectionSeats.reduce((acc: any, seat: any) => {
        const row = seat.row_letter || 'A';
        if (!acc[row]) acc[row] = [];
        acc[row].push(seat);
        return acc;
      }, {});
      
      const rows = Object.keys(seatsByRow).sort();
      
      let seatsHTML = '';
      let sectionBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
      
      // Render all seats with precise positioning
      sectionSeats.forEach((seat: any) => {
        const position = seat.position || { x: 0, y: 0 };
        const seatId = seat.id;
        const isSelected = selectedSeats.has(seatId);
        const isHovered = hoveredSeatId === seatId;
        const isBooked = seat.status === 'booked' || seat.status === 'reserved';
        
        // Update section bounds
        sectionBounds.minX = Math.min(sectionBounds.minX, position.x);
        sectionBounds.maxX = Math.max(sectionBounds.maxX, position.x);
        sectionBounds.minY = Math.min(sectionBounds.minY, position.y);
        sectionBounds.maxY = Math.max(sectionBounds.maxY, position.y);
        
        // Determine seat color based on status
        let seatColor = color;
        if (isBooked) {
          seatColor = '#DC2626'; // Red for unavailable
        } else if (isSelected) {
          seatColor = '#10B981'; // Green for selected
        } else if (isHovered) {
          seatColor = '#FCD34D'; // Yellow for hovered
        }
        
        seatsHTML += `
          <circle
            cx="${position.x}"
            cy="${position.y}"
            r="6"
            fill="${seatColor}"
            stroke="#FFFFFF"
            stroke-width="1"
            class="seat-circle"
            data-seat-id="${seatId}"
            data-section="${sectionInfo.name}"
            data-row="${seat.row_letter}"
            data-seat="${seat.seat_number}"
            style="cursor: ${isBooked ? 'not-allowed' : 'pointer'}; transition: all 0.2s;"
          />
        `;
        
        // Add seat label for zoomed view
        if (currentScale > 0.8) {
          seatsHTML += `
            <text
              x="${position.x}"
              y="${position.y + 2}"
              text-anchor="middle"
              fill="#FFFFFF"
              font-size="8"
              font-family="Arial, sans-serif"
              pointer-events="none"
              style="font-weight: bold;"
            >
              ${seat.row_letter}${seat.seat_number}
            </text>
          `;
        }
      });
      
      // Add section label positioned appropriately
      const labelX = (sectionBounds.minX + sectionBounds.maxX) / 2;
      const labelY = sectionBounds.minY - 25; // Above the section
      
      const sectionLabel = `
        <text
          x="${labelX}"
          y="${labelY}"
          text-anchor="middle"
          fill="#374151"
          font-size="16"
          font-family="Arial, sans-serif"
          font-weight="bold"
          pointer-events="none"
        >
          ${displayName}
        </text>
      `;
      
      return seatsHTML + sectionLabel;
    };

    // Generate SVG for the complete theater
    const theaterSVG = `
      <svg
        width="100%"
        height="100%"
        viewBox="${BAGLEY_WRIGHT_LAYOUT.svgViewBox}"
        style="background: ${BAGLEY_WRIGHT_LAYOUT.theme.background};"
        class="bagley-wright-theater"
      >
        <!-- Stage -->
        <rect
          x="${BAGLEY_WRIGHT_LAYOUT.stage.x}"
          y="${BAGLEY_WRIGHT_LAYOUT.stage.y}"
          width="${BAGLEY_WRIGHT_LAYOUT.stage.width}"
          height="${BAGLEY_WRIGHT_LAYOUT.stage.height}"
          fill="${BAGLEY_WRIGHT_LAYOUT.stage.style.backgroundColor}"
          rx="${BAGLEY_WRIGHT_LAYOUT.stage.style.borderRadius}"
          stroke="#4B5563"
          stroke-width="2"
        />
        <text
          x="${BAGLEY_WRIGHT_LAYOUT.stage.x + BAGLEY_WRIGHT_LAYOUT.stage.width / 2}"
          y="${BAGLEY_WRIGHT_LAYOUT.stage.y + BAGLEY_WRIGHT_LAYOUT.stage.height / 2 + 6}"
          text-anchor="middle"
          fill="${BAGLEY_WRIGHT_LAYOUT.stage.style.fontColor}"
          font-size="${BAGLEY_WRIGHT_LAYOUT.stage.style.fontSize}"
          font-family="Arial, sans-serif"
          font-weight="bold"
        >
          ${BAGLEY_WRIGHT_LAYOUT.stage.label}
        </text>
        
        <!-- Theater Sections -->
        ${BAGLEY_WRIGHT_LAYOUT.sections.map(sectionConfig => {
          const sectionData = sectionMap.get(sectionConfig.id);
          if (!sectionData) return '';
          
          return `<g class="theater-section" data-section="${sectionConfig.id}">
            ${renderCurvedSection(sectionData.seats, sectionData.info, sectionConfig)}
          </g>`;
        }).join('')}
      </svg>
    `;

    return `
      <div class="bagley-wright-container" style="
        width: 100%;
        height: 100%;
        position: relative;
        background: linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%);
        overflow: hidden;
        border-radius: 12px;
        box-shadow: inset 0 2px 10px rgba(0,0,0,0.1);
      ">
        <!-- Theater Header -->
        <div class="theater-header" style="
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          text-align: center;
          background: rgba(255,255,255,0.95);
          padding: 12px 24px;
          border-radius: 20px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          backdrop-filter: blur(10px);
        ">
          <h2 style="
            margin: 0;
            color: #1F2937;
            font-size: 20px;
            font-weight: bold;
            font-family: Arial, sans-serif;
          ">
            ${BAGLEY_WRIGHT_LAYOUT.name}
          </h2>
          <p style="
            margin: 4px 0 0 0;
            color: #6B7280;
            font-size: 14px;
            font-weight: 500;
          ">
            ${totalSeats.toLocaleString()} Total Seats • ${sectionMap.size} Sections
          </p>
        </div>
        
        <!-- Zoom Controls -->
        <div class="zoom-controls" style="
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 100;
          display: flex;
          gap: 8px;
          background: rgba(255,255,255,0.95);
          padding: 8px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          backdrop-filter: blur(10px);
        ">
          <button class="zoom-btn zoom-in" style="
            width: 40px; height: 40px; border: none;
            background: #3B82F6; color: white; border-radius: 8px;
            cursor: pointer; font-size: 18px; font-weight: bold;
            transition: all 0.2s; display: flex; align-items: center; justify-content: center;
          ">+</button>
          <button class="zoom-btn zoom-out" style="
            width: 40px; height: 40px; border: none;
            background: #3B82F6; color: white; border-radius: 8px;
            cursor: pointer; font-size: 18px; font-weight: bold;
            transition: all 0.2s; display: flex; align-items: center; justify-content: center;
          ">−</button>
          <button class="zoom-btn auto-zoom" style="
            width: 40px; height: 40px; border: none;
            background: #10B981; color: white; border-radius: 8px;
            cursor: pointer; font-size: 12px; font-weight: bold;
            transition: all 0.2s; display: flex; align-items: center; justify-content: center;
          ">⌂</button>
        </div>
        
        <!-- Theater SVG -->
        <div class="theater-svg-container" style="
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 40px 40px 40px;
        ">
          ${theaterSVG}
        </div>
        
        <!-- Section Legend -->
        <div class="section-legend" style="
          position: absolute;
          bottom: 20px;
          left: 20px;
          background: rgba(255,255,255,0.95);
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          backdrop-filter: blur(10px);
          max-width: 300px;
        ">
          <h4 style="margin: 0 0 12px 0; color: #1F2937; font-size: 14px; font-weight: bold;">
            Section Guide
          </h4>
          ${BAGLEY_WRIGHT_LAYOUT.sections.map(section => `
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <div style="
                width: 12px; height: 12px; border-radius: 50%;
                background: ${section.color}; margin-right: 8px;
              "></div>
              <span style="font-size: 12px; color: #374151; font-weight: 500;">
                ${section.displayName}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };
  
  return {
    render: (data: any) => {
      const renderedHTML = renderBagleyWrightTheater(data);
      container.innerHTML = renderedHTML;
      
      // Get the SVG element for scaling
      seatMapElement = container.querySelector('.theater-svg-container');
      
      if (seatMapElement) {
        setTimeout(() => autoZoom(), 100); // Auto-fit on render
      }
      
      // Add event listeners for seats
      const seatElements = container.querySelectorAll('.seat-circle');
      seatElements.forEach((seat: any) => {
        seat.addEventListener('click', (e: any) => {
          const seatId = e.target.getAttribute('data-seat-id');
          if (seatId && window.seatMapRenderer?.handleSeatClick) {
            window.seatMapRenderer.handleSeatClick(seatId);
          }
        });
        
        seat.addEventListener('mouseenter', (e: any) => {
          hoveredSeatId = e.target.getAttribute('data-seat-id');
          e.target.setAttribute('r', '8'); // Slightly larger on hover
        });
        
        seat.addEventListener('mouseleave', (e: any) => {
          hoveredSeatId = null;
          e.target.setAttribute('r', '6'); // Back to normal size
        });
      });
      
      // Add zoom control listeners
      const zoomInBtn = container.querySelector('.zoom-in');
      const zoomOutBtn = container.querySelector('.zoom-out');
      const autoZoomBtn = container.querySelector('.auto-zoom');
      
      if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
          currentScale = Math.min(currentScale * 1.2, 3);
          if (seatMapElement) {
            seatMapElement.style.transform = `scale(${currentScale})`;
          }
        });
      }
      
      if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
          currentScale = Math.max(currentScale * 0.8, 0.3);
          if (seatMapElement) {
            seatMapElement.style.transform = `scale(${currentScale})`;
          }
        });
      }
      
      if (autoZoomBtn) {
        autoZoomBtn.addEventListener('click', autoZoom);
      }
    },
    
    // Expose functions for external control
    zoomIn: () => {
      currentScale = Math.min(currentScale * 1.2, 3);
      if (seatMapElement) {
        seatMapElement.style.transform = `scale(${currentScale})`;
      }
    },
    
    zoomOut: () => {
      currentScale = Math.max(currentScale * 0.8, 0.3);
      if (seatMapElement) {
        seatMapElement.style.transform = `scale(${currentScale})`;
      }
    },
    
    autoZoom: autoZoom,
    
    updateSelectedSeats: (newSelectedSeats: string[]) => {
      selectedSeats = new Set(newSelectedSeats);
      // Re-render to update visual state
    }
  };
};

// Transform database data to expected format for the Bagley Wright renderer
const transformDatabaseData = (dbData: any) => {
  console.log("🔄 Transforming database data for Bagley Wright renderer");
  
  if (!dbData) {
    console.warn("❌ No database data provided");
    return { sections: [] };
  }

  // Handle both array of seats and structured data
  let seats = [];
  if (Array.isArray(dbData)) {
    seats = dbData;
  } else if (dbData.seats && Array.isArray(dbData.seats)) {
    seats = dbData.seats;
  } else {
    console.warn("❌ Invalid data structure");
    return { sections: [] };
  }

  console.log(`✅ Processing ${seats.length} seats for Bagley Wright layout`);
  
  return {
    id: 'bagley-wright-theater',
    name: BAGLEY_WRIGHT_LAYOUT.name,
    sections: seats,
    metadata: {
      totalSeats: seats.length,
      layoutType: 'bagley_wright_curved',
      generatedAt: new Date().toISOString()
    }
  };
};

const validateVenueDataStructure = (venueData: any) => {
  console.log("🔍 Validating Bagley Wright venue data structure");
  
  if (!venueData) {
    return { isValid: false, errors: ['No venue data provided'] };
  }

  const errors = [];
  
  if (!venueData.sections || !Array.isArray(venueData.sections)) {
    errors.push('Sections array is required');
  }

  if (venueData.sections && venueData.sections.length === 0) {
    errors.push('At least one section is required');
  }

  // Validate that we have the expected Bagley Wright sections
  const expectedSections = BAGLEY_WRIGHT_LAYOUT.sections.length;
  if (venueData.sections && venueData.sections.length > 0) {
    // Group by section to count unique sections
    const sectionGroups = new Map();
    venueData.sections.forEach((seat: any) => {
      const sectionId = seat.section?.id || seat.section_id || 'unknown';
      if (!sectionGroups.has(sectionId)) {
        sectionGroups.set(sectionId, 0);
      }
      sectionGroups.set(sectionId, sectionGroups.get(sectionId) + 1);
    });
    
    console.log(`📊 Found ${sectionGroups.size} unique sections in data`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

interface EnterpriseSeatMapProps {
  showData?: any;
  seatData?: any;
  seatmapData?: any;
  selectedSeats?: string[];
  onSeatSelect?: (seatId: string) => void;
  onSeatDeselect?: (seatId: string) => void;
  onSelectionChange?: (selectedSeats: string[]) => void;
  editorMode?: boolean;
  className?: string;
}

const EnterpriseSeatMap: React.FC<EnterpriseSeatMapProps> = ({
  showData,
  seatData,
  seatmapData,
  selectedSeats = [],
  onSeatSelect,
  onSeatDeselect,
  onSelectionChange,
  editorMode = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderer, setRenderer] = useState<any>(null);

  console.log("👁 Rendering EnterpriseSeatMap", {
    hasShowData: !!showData,
    hasSeatData: !!seatData,
    seatCount: Array.isArray(seatData) ? seatData.length : 0,
    selectedCount: selectedSeats.length,
    editorMode
  });

  // Initialize renderer when container is ready
  useEffect(() => {
    if (containerRef.current && !renderer) {
      console.log("🎭 Initializing Bagley Wright renderer");
      
      const newRenderer = createBagleyWrightRenderer(containerRef.current, {
        editorMode,
        responsive: true,
        autoZoom: true
      });
      
      setRenderer(newRenderer);
      
      // Expose renderer globally for external control
      window.seatMapRenderer = {
        ...newRenderer,
        handleSeatClick: (seatId: string) => {
          console.log("🎫 Seat clicked:", seatId);
          
          if (selectedSeats.includes(seatId)) {
            onSeatDeselect?.(seatId);
          } else {
            onSeatSelect?.(seatId);
          }
        }
      };
    }
  }, [containerRef.current, editorMode, onSeatSelect, onSeatDeselect]);

  // Render seat map when data is available
  useEffect(() => {
    if (renderer && seatData) {
      console.log("🎨 Rendering seat map with data");
      
      setIsLoading(true);
      setError(null);
      
      try {
        const transformedData = transformDatabaseData(seatData);
        const validation = validateVenueDataStructure(transformedData);
        
        if (!validation.isValid) {
          throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
        }
        
        renderer.render(transformedData);
        setIsLoading(false);
        
      } catch (err) {
        console.error("❌ Error rendering seat map:", err);
        setError(err instanceof Error ? err.message : 'Rendering failed');
        setIsLoading(false);
      }
    }
  }, [renderer, seatData]);

  // Update selected seats when prop changes
  useEffect(() => {
    if (renderer && renderer.updateSelectedSeats) {
      renderer.updateSelectedSeats(selectedSeats);
    }
  }, [renderer, selectedSeats]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (renderer && renderer.autoZoom) {
        setTimeout(() => renderer.autoZoom(), 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderer]);

  console.log("👁 Rendering container", containerRef.current);
  
  return (
    <div className={`seat-map-container ${className}`} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Loading State */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          textAlign: 'center',
          background: 'rgba(255,255,255,0.95)',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #E5E7EB',
            borderTop: '4px solid #3B82F6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }}></div>
          <div style={{ fontWeight: 'bold', color: '#1F2937' }}>Loading Bagley Wright Theater...</div>
          <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            Preparing {Array.isArray(seatData) ? seatData.length : 'theater'} seats
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          textAlign: 'center',
          background: 'rgba(255,255,255,0.95)',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontWeight: 'bold', color: '#DC2626', marginBottom: '8px' }}>
            Theater Loading Error
          </div>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>{error}</div>
        </div>
      )}

      {/* Main Theater Container */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          opacity: isLoading || error ? 0.3 : 1,
          transition: 'opacity 0.3s ease'
        }} 
      />

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .zoom-btn:hover {
          background-color: #2563EB !important;
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};

export default EnterpriseSeatMap;