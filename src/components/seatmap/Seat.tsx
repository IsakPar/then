import React, { memo, useCallback } from 'react';
import { SeatRenderProps, DEFAULT_THEME } from './types';
import { PROFESSIONAL_COLOR_SYSTEM } from '../../lib/seatmaps/enhanced-geometry-engine';

// ============================================================================
// PROFESSIONAL SEAT COMPONENT - Bagley Wright Theater styling
// ============================================================================

const Seat: React.FC<SeatRenderProps> = memo(({
  seat,
  position,
  radius,
  isSelected,
  isHovered,
  showLabel,
  showDetails,
  onSeatClick,
  onSeatHover
}) => {
  // ============================================================================
  // PROFESSIONAL STYLING LOGIC - Based on Bagley Wright Theater
  // ============================================================================
  
  const getSeatColor = useCallback(() => {
    // Selected seats always use blue selection color
    if (isSelected) return '#3B82F6';
    
    switch (seat.status) {
      case 'booked': 
        return '#EF4444'; // Red for booked (clear unavailable)
      case 'reserved': 
        return '#F59E0B'; // Orange for reserved (temporary hold)
      case 'available': 
        // Use section color from enhanced color system
        return seat.color_hex || '#8B5CF6'; // Default to purple
      default: 
        return '#6B7280'; // Gray for unknown status
    }
  }, [seat.status, seat.color_hex, isSelected]);

  const getSeatStroke = useCallback(() => {
    if (isSelected) return '#1D4ED8'; // Darker blue for selected border
    
    switch (seat.status) {
      case 'booked': return '#DC2626';   // Dark red
      case 'reserved': return '#D97706'; // Dark orange  
      case 'available': return seat.color_hex ? getDarkerShade(seat.color_hex) : '#7C3AED'; // Darker purple
      default: return '#4B5563';         // Dark gray
    }
  }, [seat.status, seat.color_hex, isSelected]);

  const getDarkerShade = (hex: string): string => {
    // Simple function to make a color darker for border
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = -40; // Darken by 40
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  };

  const getStrokeWidth = useCallback(() => {
    return isSelected ? 2.5 : 1.5; // Professional stroke widths
  }, [isSelected]);

  const getSeatOpacity = useCallback(() => {
    if (seat.status === 'booked') return 0.7;    // Slightly transparent for booked
    if (seat.status === 'reserved') return 0.8;  // Slightly transparent for reserved
    if (isHovered && !isSelected) return 0.9;    // Slight hover effect
    return 1; // Full opacity for available seats
  }, [seat.status, isHovered, isSelected]);

  const getTextColor = useCallback(() => {
    if (isSelected) return '#FFFFFF'; // White text on blue selection
    if (seat.status === 'available') return '#FFFFFF'; // White text on colored seats
    return '#FFFFFF'; // White text for all seats (like reference image)
  }, [isSelected, seat.status]);

  // ============================================================================
  // INTERACTION HANDLERS WITH ACCESSIBILITY ENHANCEMENTS
  // ============================================================================

  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (seat.status === 'available') {
      onSeatClick(seat);
      // TODO [Phase 1]: Add haptic feedback for mobile devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }
  }, [seat, onSeatClick]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // TODO [Phase 1]: Enhanced keyboard navigation support
    if (seat.status !== 'available') return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        event.stopPropagation();
        onSeatClick(seat);
        // Announce selection to screen readers
        const announcement = `Seat ${seat.seat_number} selected`;
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(announcement);
          utterance.volume = 0.3;
          utterance.rate = 1.2;
          window.speechSynthesis.speak(utterance);
        }
        break;
      case 'Escape':
        // Allow deselecting with Escape key
        if (isSelected) {
          event.preventDefault();
          event.stopPropagation();
          // Note: This would need to be implemented in parent component
          // onSeatDeselect?.(seat.id);
        }
        break;
    }
  }, [seat, onSeatClick, isSelected]);

  const handleMouseEnter = useCallback(() => {
    if (onSeatHover && seat.status === 'available') {
      onSeatHover(seat);
    }
  }, [seat, onSeatHover]);

  const handleMouseLeave = useCallback(() => {
    if (onSeatHover) {
      onSeatHover(null);
    }
  }, [onSeatHover]);

  const handleFocus = useCallback(() => {
    // Announce seat details when focused for screen readers
    if (seat.status === 'available' && onSeatHover) {
      onSeatHover(seat);
    }
  }, [seat, onSeatHover]);

  const handleBlur = useCallback(() => {
    if (onSeatHover) {
      onSeatHover(null);
    }
  }, [onSeatHover]);

  // ============================================================================
  // DYNAMIC SIZING
  // ============================================================================

  const effectiveRadius = radius * (isSelected ? 1.15 : isHovered ? 1.05 : 1);
  const fontSize = Math.max(4, radius * 0.6);
  const isClickable = seat.status === 'available';

  // ============================================================================
  // ACCESSIBILITY ATTRIBUTES - TODO [Phase 1]: Comprehensive ARIA support
  // ============================================================================

  const getAriaLabel = useCallback(() => {
    const statusText = seat.status === 'available' ? 'available' : seat.status;
    const priceText = seat.price_pence ? `, £${(seat.price_pence / 100).toFixed(2)}` : '';
    const accessibleText = seat.is_accessible ? ', wheelchair accessible' : '';
    const selectionText = isSelected ? ', currently selected' : '';
    const actionText = seat.status === 'available' ? ', press Enter or Space to select' : '';
    
    return `Seat ${seat.seat_number}, Row ${seat.row_letter}, ${seat.section_name || 'General seating'}, ${statusText}${priceText}${accessibleText}${selectionText}${actionText}`;
  }, [seat, isSelected]);

  const getAriaDescription = useCallback(() => {
    const parts = [];
    
    if (seat.notes) {
      parts.push(seat.notes);
    }
    
    if (seat.is_accessible) {
      parts.push('This seat has wheelchair accessibility features');
    }
    
    if (seat.price_pence && seat.price_pence > 15000) {
      parts.push('Premium seat with enhanced amenities');
    }

    if (seat.status === 'booked') {
      parts.push('This seat is not available for selection');
    } else if (seat.status === 'reserved') {
      parts.push('This seat is temporarily reserved');
    }
    
    return parts.length > 0 ? parts.join('. ') : undefined;
  }, [seat]);

  const getAriaPressed = useCallback(() => {
    if (seat.status !== 'available') return undefined;
    return isSelected;
  }, [seat.status, isSelected]);

  const getAriaDisabled = useCallback(() => {
    return seat.status !== 'available';
  }, [seat.status]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <g>
      {/* Invisible focusable rect for accessibility */}
      <rect
        x={position.x - effectiveRadius}
        y={position.y - effectiveRadius}
        width={effectiveRadius * 2}
        height={effectiveRadius * 2}
        fill="transparent"
        role={isClickable ? "button" : "img"}
        aria-label={getAriaLabel()}
        aria-description={getAriaDescription()}
        aria-pressed={getAriaPressed()}
        aria-disabled={getAriaDisabled()}
        tabIndex={isClickable ? 0 : -1}
        style={{ 
          cursor: isClickable ? 'pointer' : 'not-allowed',
          outline: isClickable ? '2px solid #007bff' : 'none',
          outlineOffset: '2px'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      />
      {/* Main seat circle */}
      <circle
        cx={position.x}
        cy={position.y}
        r={effectiveRadius}
        fill={getSeatColor()}
        stroke={getSeatStroke()}
        strokeWidth={getStrokeWidth()}
        opacity={getSeatOpacity()}
        style={{
          transition: 'all 0.2s ease-in-out',
          filter: isHovered ? 'brightness(1.1)' : undefined
        }}
      />

      {/* Seat number label - only show when zoomed in enough */}
      {showLabel && (
        <text
          x={position.x}
          y={position.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize}
          fill={getTextColor()}
          fontWeight={DEFAULT_THEME.fonts.seatNumber.weight}
          fontFamily={DEFAULT_THEME.fonts.seatNumber.family}
          pointerEvents="none"
          style={{ 
            userSelect: 'none',
            textShadow: isSelected ? '0 0 2px rgba(0,0,0,0.5)' : undefined
          }}
        >
          {seat.seat_number}
        </text>
      )}

      {/* Accessibility indicator - only show when very zoomed in */}
      {showDetails && seat.is_accessible && (
        <circle
          cx={position.x + effectiveRadius * 0.6}
          cy={position.y - effectiveRadius * 0.6}
          r={effectiveRadius * 0.25}
          fill={DEFAULT_THEME.colors.accessible}
          stroke="#ffffff"
          strokeWidth={0.5}
          style={{
            opacity: 0.9
          }}
        />
      )}

      {/* Premium seat indicator (high price) */}
      {showDetails && seat.price_pence && seat.price_pence > 10000 && (
        <circle
          cx={position.x - effectiveRadius * 0.6}
          cy={position.y - effectiveRadius * 0.6}
          r={effectiveRadius * 0.2}
          fill="#ffd700"
          stroke="#ffffff"
          strokeWidth={0.5}
          style={{
            opacity: 0.8
          }}
        />
      )}

      {/* Row letter indicator - for very detailed view */}
      {showDetails && radius > 8 && (
        <text
          x={position.x}
          y={position.y + effectiveRadius + fontSize * 0.8}
          textAnchor="middle"
          fontSize={fontSize * 0.7}
          fill="#9ca3af"
          fontWeight="normal"
          fontFamily={DEFAULT_THEME.fonts.seatNumber.family}
          pointerEvents="none"
          style={{ userSelect: 'none' }}
        >
          {seat.row_letter}
        </text>
      )}

      {/* Selection highlight ring */}
      {isSelected && (
        <circle
          cx={position.x}
          cy={position.y}
          r={effectiveRadius + 2}
          fill="none"
          stroke={DEFAULT_THEME.colors.selectedBorder}
          strokeWidth={1}
          opacity={0.6}
          style={{
            animation: 'pulse 2s infinite'
          }}
        />
      )}

      {/* Hover glow effect */}
      {isHovered && !isSelected && isClickable && (
        <circle
          cx={position.x}
          cy={position.y}
          r={effectiveRadius + 1}
          fill="none"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={1}
          style={{
            opacity: 0.7
          }}
        />
      )}
    </g>
  );
});

Seat.displayName = 'Seat';

export default Seat;

// ============================================================================
// CSS ANIMATIONS (to be added to global styles)
// ============================================================================

export const SEAT_ANIMATIONS = `
@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}
`; 