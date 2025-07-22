import React, { memo, useMemo } from 'react';
import { SectionRenderProps, DEFAULT_THEME } from './types';
import { CoordinateEngine } from './CoordinateEngine';
import Seat from './Seat';

// ============================================================================
// SECTION RENDERER - Handles rendering all seats in a section with grouping
// ============================================================================

interface SectionRendererInternalProps extends SectionRenderProps {
  coordinateEngine: CoordinateEngine;
  zoomLevel: number;
  hideSectionLabels: boolean;
}

const SectionRenderer: React.FC<SectionRendererInternalProps> = memo(({
  section,
  seats,
  selectedSeatIds,
  hoveredSeatId,
  seatRadius,
  showLabels,
  showDetails,
  onSeatClick,
  onSeatHover,
  coordinateEngine,
  zoomLevel,
  hideSectionLabels
}) => {
  // ============================================================================
  // COORDINATE TRANSFORMATIONS
  // ============================================================================

  const sectionData = useMemo(() => {
    // Filter seats for this section
    const sectionSeats = seats.filter(seat => seat.section_name === section.name);
    
    if (sectionSeats.length === 0) {
      return {
        transformedSeats: [],
        scaledBounds: null,
        centerPosition: null
      };
    }

    // Check if seats have valid positions
    const seatsWithValidPositions = sectionSeats.filter(seat => 
      seat.position && 
      typeof seat.position.x === 'number' && 
      typeof seat.position.y === 'number' &&
      isFinite(seat.position.x) && 
      isFinite(seat.position.y)
    );

    let transformedSeats: Array<{ seat: any; position: { x: number; y: number } }> = [];

    if (seatsWithValidPositions.length > 0) {
      // Use proper coordinate transformation for seats with valid positions
      transformedSeats = seatsWithValidPositions.map(seat => ({
        seat,
        position: coordinateEngine.transformPosition(seat.position!)
      }));
    } else {
      // Fallback: Generate grid layout for seats without valid positions
      console.warn(`⚠️ Section "${section.name}" has seats without valid positions, using fallback grid layout`);
      
      // Generate a simple grid layout as fallback
      const gridSpacing = 30;
      const seatsPerRow = Math.ceil(Math.sqrt(sectionSeats.length));
      const startX = 100 + (parseInt(section.id.slice(-1)) || 0) * 200; // Offset each section
      const startY = 100 + (parseInt(section.id.slice(-1)) || 0) * 100;
      
      transformedSeats = sectionSeats.map((seat, index) => {
        const row = Math.floor(index / seatsPerRow);
        const col = index % seatsPerRow;
        
        const fallbackPosition = {
          x: startX + (col * gridSpacing),
          y: startY + (row * gridSpacing)
        };
        
        return {
          seat,
          position: coordinateEngine.transformPosition(fallbackPosition)
        };
      });
    }

    // Calculate section bounds in scaled coordinates
    if (transformedSeats.length === 0) {
      return {
        transformedSeats: [],
        scaledBounds: null,
        centerPosition: null
      };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    transformedSeats.forEach(({ position }) => {
      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x);
      maxY = Math.max(maxY, position.y);
    });

    const scaledBounds = {
      minX,
      minY,
      maxX,
      maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: maxX - minX,
      height: maxY - minY
    };

    // Position for section label (top-center of section)
    const centerPosition = {
      x: scaledBounds.centerX,
      y: scaledBounds.minY
    };

    return {
      transformedSeats,
      scaledBounds,
      centerPosition
    };
  }, [seats, section.name, section.id, coordinateEngine]);

  // ============================================================================
  // SECTION STYLING
  // ============================================================================

  const sectionStyle = useMemo(() => {
    if (!sectionData.scaledBounds) return null;

    const { scaledBounds } = sectionData;
    const padding = seatRadius * 2;
    const fontSize = Math.max(8, Math.min(16, 40 / zoomLevel));
    
    return {
      backgroundColor: {
        x: scaledBounds.minX - padding,
        y: scaledBounds.minY - fontSize * 2 - padding,
        width: scaledBounds.width + padding * 2,
        height: scaledBounds.height + fontSize * 2 + padding * 2,
        rx: fontSize * 0.3,
        fill: section.color,
        fillOpacity: 0.1,
        stroke: section.color,
        strokeWidth: 1,
        strokeOpacity: 0.3
      },
      label: {
        x: scaledBounds.centerX,
        y: scaledBounds.minY - fontSize * 0.5,
        fontSize,
        text: section.displayName
      },
      seatCount: {
        x: scaledBounds.centerX,
        y: scaledBounds.minY - fontSize * 0.5 + fontSize * 1.2,
        fontSize: fontSize * 0.8,
        text: `${sectionData.transformedSeats.length} seats`
      }
    };
  }, [sectionData.scaledBounds, section, seatRadius, zoomLevel]);

  // ============================================================================
  // RENDERING
  // ============================================================================

  // Don't render if no seats in this section
  if (sectionData.transformedSeats.length === 0) {
    console.warn(`⚠️ Section "${section.name}" has no seats to render`);
    return null;
  }

  return (
    <g className={`section-${section.id}`}>
      {/* Section background - only show when not too zoomed in */}
      {!hideSectionLabels && sectionStyle && (
        <>
          {/* Background rectangle */}
          <rect
            {...sectionStyle.backgroundColor}
            style={{
              transition: 'all 0.3s ease'
            }}
          />
          
          {/* Section label */}
          <text
            x={sectionStyle.label.x}
            y={sectionStyle.label.y}
            textAnchor="middle"
            fontSize={sectionStyle.label.fontSize}
            fill={DEFAULT_THEME.colors.sectionLabel}
            fontWeight={DEFAULT_THEME.fonts.sectionLabel.weight}
            fontFamily={DEFAULT_THEME.fonts.sectionLabel.family}
            pointerEvents="none"
            style={{ 
              userSelect: 'none',
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
            }}
          >
            {sectionStyle.label.text}
          </text>
          
          {/* Seat count */}
          <text
            x={sectionStyle.seatCount.x}
            y={sectionStyle.seatCount.y}
            textAnchor="middle"
            fontSize={sectionStyle.seatCount.fontSize}
            fill={DEFAULT_THEME.colors.sectionLabel}
            fontWeight="normal"
            fontFamily={DEFAULT_THEME.fonts.sectionLabel.family}
            pointerEvents="none"
            style={{ 
              userSelect: 'none',
              opacity: 0.8,
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
            }}
          >
            {sectionStyle.seatCount.text}
          </text>
        </>
      )}

      {/* All seats in this section */}
      <g className={`section-seats-${section.id}`}>
        {sectionData.transformedSeats.map(({ seat, position }) => (
          <Seat
            key={seat.id}
            seat={seat}
            position={position}
            radius={seatRadius}
            isSelected={selectedSeatIds.has(seat.id)}
            isHovered={hoveredSeatId === seat.id}
            showLabel={showLabels}
            showDetails={showDetails}
            onSeatClick={onSeatClick}
            onSeatHover={onSeatHover}
          />
        ))}
      </g>

      {/* Section statistics overlay - only for very detailed zoom */}
      {showDetails && zoomLevel > 3 && sectionData.scaledBounds && (
        <SectionStatistics
          section={section}
          seats={sectionData.transformedSeats.map(s => s.seat)}
          bounds={sectionData.scaledBounds}
          selectedCount={sectionData.transformedSeats.filter(s => selectedSeatIds.has(s.seat.id)).length}
        />
      )}
    </g>
  );
});

SectionRenderer.displayName = 'SectionRenderer';

// ============================================================================
// SECTION STATISTICS SUB-COMPONENT
// ============================================================================

interface SectionStatisticsProps {
  section: {
    name: string;
    color: string;
  };
  seats: Array<{
    status: string;
    price_pence?: number;
  }>;
  bounds: {
    centerX: number;
    maxY: number;
    width: number;
  };
  selectedCount: number;
}

const SectionStatistics: React.FC<SectionStatisticsProps> = memo(({ 
  section, 
  seats, 
  bounds, 
  selectedCount 
}) => {
  const stats = useMemo(() => {
    const available = seats.filter(s => s.status === 'available').length;
    const booked = seats.filter(s => s.status === 'booked').length;
    const avgPrice = seats.length > 0 
      ? seats.reduce((sum, s) => sum + (s.price_pence || 0), 0) / (seats.length * 100)
      : 0;

    return {
      available,
      booked,
      total: seats.length,
      selected: selectedCount,
      avgPrice: avgPrice.toFixed(2)
    };
  }, [seats, selectedCount]);

  // Position statistics below section
  const statsY = bounds.maxY + 30;
  const statsX = bounds.centerX;

  return (
    <g className="section-statistics" style={{ pointerEvents: 'none' }}>
      <rect
        x={statsX - 80}
        y={statsY - 15}
        width={160}
        height={50}
        fill="rgba(0,0,0,0.8)"
        stroke={section.color}
        strokeWidth={1}
        rx={5}
      />
      
      <text
        x={statsX}
        y={statsY}
        textAnchor="middle"
        fontSize={10}
        fill="white"
        fontWeight="bold"
      >
        {section.name}
      </text>
      
      <text
        x={statsX}
        y={statsY + 12}
        textAnchor="middle"
        fontSize={8}
        fill="lightgray"
      >
        {stats.available}/{stats.total} available
      </text>
      
      <text
        x={statsX}
        y={statsY + 24}
        textAnchor="middle"
        fontSize={8}
        fill="lightgray"
      >
        £{stats.avgPrice} avg • {stats.selected} selected
      </text>
    </g>
  );
});

SectionStatistics.displayName = 'SectionStatistics';

export default SectionRenderer; 