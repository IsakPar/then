import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Seat, SectionInfo } from './types';

interface SelectionBounds {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface MultiSeatSelectorProps {
  seats: Seat[];
  sections: SectionInfo[];
  selectedSeats: string[];
  onSeatSelectionChange: (seatIds: string[]) => void;
  isMultiSelectEnabled: boolean;
  maxSeatsSelection?: number;
  onSelectionStart?: () => void;
  onSelectionEnd?: (selectedSeats: Seat[]) => void;
  containerRef: React.RefObject<SVGSVGElement>;
  coordinateTransform: (x: number, y: number) => { x: number; y: number };
}

interface DragState {
  isDragging: boolean;
  selectionBounds: SelectionBounds | null;
  startSeat: Seat | null;
  draggedSeats: Set<string>;
}

export const MultiSeatSelector: React.FC<MultiSeatSelectorProps> = ({
  seats,
  sections,
  selectedSeats,
  onSeatSelectionChange,
  isMultiSelectEnabled,
  maxSeatsSelection = 8,
  onSelectionStart,
  onSelectionEnd,
  containerRef,
  coordinateTransform
}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    selectionBounds: null,
    startSeat: null,
    draggedSeats: new Set()
  });

  const [selectionMode, setSelectionMode] = useState<'add' | 'remove' | 'toggle'>('add');
  const dragStartTimeRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);

  // Performance throttling for drag updates
  const DRAG_UPDATE_THROTTLE = 16; // 60fps
  const MIN_DRAG_DISTANCE = 5; // Minimum pixels to start drag
  const MAX_SELECTION_AREA = 10000; // Max selection area in pixels²

  const getSeatsBySectionPriority = useCallback((seatIds: string[]): Seat[] => {
    const seatMap = new Map(seats.map(seat => [seat.id, seat]));
    const selectedSeatsData = seatIds.map(id => seatMap.get(id)).filter(Boolean) as Seat[];
    
    // Group by section and sort by section priority
    const sectionGroups = new Map<string, Seat[]>();
    selectedSeatsData.forEach(seat => {
      const sectionId = seat.section_id;
      if (!sectionGroups.has(sectionId)) {
        sectionGroups.set(sectionId, []);
      }
      sectionGroups.get(sectionId)!.push(seat);
    });

    // Prioritize sections by average price (higher price = higher priority)
    const sortedSections = Array.from(sectionGroups.entries()).sort((a, b) => {
      const avgPriceA = a[1].reduce((sum, seat) => sum + (seat.price_pence || 0), 0) / a[1].length;
      const avgPriceB = b[1].reduce((sum, seat) => sum + (seat.price_pence || 0), 0) / b[1].length;
      return avgPriceB - avgPriceA;
    });

    return sortedSections.flatMap(([_, seats]) => seats);
  }, [seats]);

  const getSeatsInBounds = useCallback((bounds: SelectionBounds): Seat[] => {
    const { startX, startY, endX, endY } = bounds;
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    // Calculate selection area for performance limiting
    const selectionArea = (maxX - minX) * (maxY - minY);
    if (selectionArea > MAX_SELECTION_AREA) {
      console.warn('Selection area too large, limiting results');
    }

    return seats.filter(seat => {
      if (!seat.position || seat.status !== 'available') return false;
      
      const transformed = coordinateTransform(seat.position.x, seat.position.y);
      return (
        transformed.x >= minX &&
        transformed.x <= maxX &&
        transformed.y >= minY &&
        transformed.y <= maxY
      );
    }).slice(0, Math.min(maxSeatsSelection * 2, 100)); // Limit for performance
  }, [seats, coordinateTransform, maxSeatsSelection]);

  const handleDragStart = useCallback((event: React.MouseEvent<SVGElement>) => {
    if (!isMultiSelectEnabled || !containerRef.current) return;

    // Determine selection mode based on modifiers
    const mode: 'add' | 'remove' | 'toggle' = 
      event.ctrlKey || event.metaKey ? 'toggle' :
      event.shiftKey ? 'add' : 
      'add';

    setSelectionMode(mode);

    const rect = containerRef.current.getBoundingClientRect();
    const startX = event.clientX - rect.left;
    const startY = event.clientY - rect.top;

    dragStartTimeRef.current = Date.now();
    lastUpdateTimeRef.current = Date.now();

    setDragState({
      isDragging: true,
      selectionBounds: { startX, startY, endX: startX, endY: startY },
      startSeat: null,
      draggedSeats: new Set()
    });

    onSelectionStart?.();
    event.preventDefault();
  }, [isMultiSelectEnabled, containerRef, onSelectionStart]);

  const handleDragMove = useCallback((event: MouseEvent) => {
    if (!dragState.isDragging || !containerRef.current || !dragState.selectionBounds) return;

    const now = Date.now();
    if (now - lastUpdateTimeRef.current < DRAG_UPDATE_THROTTLE) return;
    lastUpdateTimeRef.current = now;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    // Check minimum drag distance
    const dragDistance = Math.sqrt(
      Math.pow(currentX - dragState.selectionBounds.startX, 2) +
      Math.pow(currentY - dragState.selectionBounds.startY, 2)
    );

    if (dragDistance < MIN_DRAG_DISTANCE) return;

    const updatedBounds: SelectionBounds = {
      ...dragState.selectionBounds,
      endX: currentX,
      endY: currentY
    };

    const seatsInBounds = getSeatsInBounds(updatedBounds);
    const seatIds = seatsInBounds.map(seat => seat.id);

    setDragState(prev => ({
      ...prev,
      selectionBounds: updatedBounds,
      draggedSeats: new Set(seatIds)
    }));
  }, [dragState.isDragging, dragState.selectionBounds, containerRef, getSeatsInBounds]);

  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging) return;

    const dragDuration = Date.now() - dragStartTimeRef.current;
    const seatsToSelect = Array.from(dragState.draggedSeats);

    // Apply selection based on mode
    let newSelection: string[];
    
    switch (selectionMode) {
      case 'add':
        newSelection = [...new Set([...selectedSeats, ...seatsToSelect])];
        break;
      case 'remove':
        newSelection = selectedSeats.filter(id => !dragState.draggedSeats.has(id));
        break;
      case 'toggle':
        newSelection = selectedSeats.slice();
        seatsToSelect.forEach(id => {
          const index = newSelection.indexOf(id);
          if (index >= 0) {
            newSelection.splice(index, 1);
          } else {
            newSelection.push(id);
          }
        });
        break;
      default:
        newSelection = selectedSeats;
    }

    // Enforce maximum selection limit
    if (newSelection.length > maxSeatsSelection) {
      const prioritizedSeats = getSeatsBySectionPriority(newSelection);
      newSelection = prioritizedSeats.slice(0, maxSeatsSelection).map(seat => seat.id);
    }

    onSeatSelectionChange(newSelection);

    // Get selected seat objects for callback
    const selectedSeatObjects = seats.filter(seat => newSelection.includes(seat.id));
    onSelectionEnd?.(selectedSeatObjects);

    setDragState({
      isDragging: false,
      selectionBounds: null,
      startSeat: null,
      draggedSeats: new Set()
    });
  }, [
    dragState.isDragging,
    dragState.draggedSeats,
    selectionMode,
    selectedSeats,
    maxSeatsSelection,
    getSeatsBySectionPriority,
    onSeatSelectionChange,
    onSelectionEnd,
    seats
  ]);

  // Mouse event listeners
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleDragMove(e);
    const handleMouseUp = () => handleDragEnd();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  // Keyboard shortcuts for multi-selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMultiSelectEnabled) return;

      // Ctrl/Cmd + A to select all available seats
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const availableSeats = seats
          .filter(seat => seat.status === 'available')
          .slice(0, maxSeatsSelection);
        onSeatSelectionChange(availableSeats.map(seat => seat.id));
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        onSeatSelectionChange([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMultiSelectEnabled, seats, maxSeatsSelection, onSeatSelectionChange]);

  // Render selection overlay
  const renderSelectionOverlay = () => {
    if (!dragState.isDragging || !dragState.selectionBounds) return null;

    const { startX, startY, endX, endY } = dragState.selectionBounds;
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="rgb(59, 130, 246)"
        strokeWidth={2}
        strokeDasharray="5,5"
        pointerEvents="none"
        className="selection-overlay"
      />
    );
  };

  return (
    <>
      {/* Invisible overlay for drag detection */}
      {isMultiSelectEnabled && (
        <rect
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill="transparent"
          onMouseDown={handleDragStart}
          className="multi-select-overlay"
          style={{ cursor: dragState.isDragging ? 'crosshair' : 'default' }}
        />
      )}
      
      {/* Selection overlay */}
      {renderSelectionOverlay()}
      
      {/* Selection info display */}
      {dragState.isDragging && dragState.draggedSeats.size > 0 && (
        <g className="selection-info">
          <rect
            x={10}
            y={10}
            width={200}
            height={30}
            fill="rgba(0, 0, 0, 0.8)"
            rx={4}
          />
          <text
            x={20}
            y={28}
            fill="white"
            fontSize={12}
            fontFamily="system-ui, sans-serif"
          >
            {dragState.draggedSeats.size} seat{dragState.draggedSeats.size !== 1 ? 's' : ''} selected
          </text>
        </g>
      )}
    </>
  );
};

// Hook for using multi-seat selection
export const useMultiSeatSelection = (
  maxSelection: number = 8,
  onSelectionLimitReached?: () => void
) => {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const handleSeatSelectionChange = useCallback((seatIds: string[]) => {
    if (seatIds.length > maxSelection) {
      onSelectionLimitReached?.();
      return;
    }
    setSelectedSeats(seatIds);
  }, [maxSelection, onSelectionLimitReached]);

  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(prev => !prev);
    if (isMultiSelectMode) {
      setSelectedSeats([]); // Clear selection when exiting multi-select
    }
  }, [isMultiSelectMode]);

  const clearSelection = useCallback(() => {
    setSelectedSeats([]);
  }, []);

  const selectSeatRange = useCallback((startSeatId: string, endSeatId: string, seats: Seat[]) => {
    const startIndex = seats.findIndex(seat => seat.id === startSeatId);
    const endIndex = seats.findIndex(seat => seat.id === endSeatId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    const rangeSeats = seats
      .slice(minIndex, maxIndex + 1)
      .filter(seat => seat.status === 'available')
      .slice(0, maxSelection);
    
    setSelectedSeats(rangeSeats.map(seat => seat.id));
  }, [maxSelection]);

  return {
    selectedSeats,
    isMultiSelectMode,
    handleSeatSelectionChange,
    toggleMultiSelectMode,
    clearSelection,
    selectSeatRange,
    canSelectMore: selectedSeats.length < maxSelection
  };
};

export default MultiSeatSelector; 