"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Seatmap } from '@alisaitteke/seatmap-canvas-react';

interface TouchOptimizedSeatmapProps {
  showId: string;
  onSeatSelect?: (seatId: string, seatData: any) => void;
  className?: string;
}

// Touch gesture detection
class TouchGestureHandler {
  private lastTouchTime: number = 0;
  private touchStartTime: number = 0;
  private touchThreshold: number = 16; // Larger touch targets for mobile
  private doubleTapThreshold: number = 300; // ms

  constructor(private element: HTMLElement) {
    this.setupTouchEvents();
  }

  private setupTouchEvents(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
  }

  private handleTouchStart(event: TouchEvent): void {
    this.touchStartTime = Date.now();
    
    // Prevent default to avoid double-tap zoom
    if (event.touches.length === 1) {
      event.preventDefault();
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - this.touchStartTime;
    
    // Quick tap detection
    if (touchDuration < 200) {
      this.handleQuickTap(event);
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    // Allow pinch-to-zoom
    if (event.touches.length === 2) {
      return;
    }
    
    // Prevent scrolling when panning the seatmap
    event.preventDefault();
  }

  private handleQuickTap(event: TouchEvent): void {
    const now = Date.now();
    const timeSinceLastTouch = now - this.lastTouchTime;
    
    if (timeSinceLastTouch < this.doubleTapThreshold) {
      this.handleDoubleTap(event);
    }
    
    this.lastTouchTime = now;
  }

  private handleDoubleTap(event: TouchEvent): void {
    // Emit custom double-tap event
    const customEvent = new CustomEvent('seatmapDoubleTap', {
      detail: { originalEvent: event }
    });
    this.element.dispatchEvent(customEvent);
  }

  getTouchThreshold(): number {
    return this.touchThreshold;
  }
}

// Mobile-specific seat rendering optimizations
class MobileRenderingOptimizer {
  private static readonly MOBILE_BREAKPOINT = 768;
  
  static isMobile(): boolean {
    return window.innerWidth < this.MOBILE_BREAKPOINT;
  }

  static getMobileConfig(baseConfig: any): any {
    if (!this.isMobile()) {
      return baseConfig;
    }

    return {
      ...baseConfig,
      style: {
        ...baseConfig.style,
        seat: {
          ...baseConfig.style.seat,
          radius: 12, // Larger seats for touch
          strokeWidth: 2,
          fontSize: 11
        },
        block: {
          ...baseConfig.style.block,
          title_size: 16,
          font_weight: 'bold'
        }
      },
      touch_optimized: true,
      gesture_enabled: true,
      zoom_controls: true
    };
  }

  static optimizeForTouch(seatData: any[]): any[] {
    if (!this.isMobile()) {
      return seatData;
    }

    // Add touch-friendly spacing
    return seatData.map(seat => ({
      ...seat,
      touch_radius: 20, // Larger touch area
      visual_feedback: true
    }));
  }
}

const TouchOptimizedSeatmap: React.FC<TouchOptimizedSeatmapProps> = ({
  showId,
  onSeatSelect,
  className = "w-full h-full"
}) => {
  const seatmapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [touchGestureHandler, setTouchGestureHandler] = useState<TouchGestureHandler | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(MobileRenderingOptimizer.isMobile());
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Initialize touch gesture handler
  useEffect(() => {
    if (containerRef.current && isMobile) {
      const handler = new TouchGestureHandler(containerRef.current);
      setTouchGestureHandler(handler);
      
      // Handle double-tap to zoom
      const handleDoubleTap = (event: any) => {
        if (seatmapRef.current) {
          // Implement zoom-to-fit or zoom-in logic
          console.log('Double tap detected - zooming');
        }
      };
      
      containerRef.current.addEventListener('seatmapDoubleTap', handleDoubleTap);
      
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('seatmapDoubleTap', handleDoubleTap);
        }
      };
    }
  }, [isMobile]);

  // Fetch seat data
  useEffect(() => {
    const fetchSeats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/shows/${showId}/seats`);
        const data = await response.json();
        setSeats(data);
      } catch (error) {
        console.error('Error fetching seats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (showId) {
      fetchSeats();
    }
  }, [showId]);

  // Transform seats for mobile optimization
  const transformSeatsForMobile = useCallback((seats: any[]) => {
    const sectionMap = new Map<string, any>();
    
    // Optimize for touch
    const optimizedSeats = MobileRenderingOptimizer.optimizeForTouch(seats);
    
    // Group by section
    optimizedSeats.forEach(seat => {
      if (!sectionMap.has(seat.section_name)) {
        sectionMap.set(seat.section_name, {
          id: seat.section_name,
          title: seat.section_name,
          color: seat.color_hex,
          labels: [],
          seats: []
        });
      }
      
      sectionMap.get(seat.section_name)?.seats.push({
        id: seat.id,
        title: isMobile ? `${seat.row_letter}${seat.seat_number}` : `${seat.row_letter}${seat.seat_number}`,
        x: seat.position.x,
        y: seat.position.y,
        salable: seat.status === 'available',
        note: `${seat.section_name} - Row ${seat.row_letter}, Seat ${seat.seat_number}`,
        custom_data: {
          original_id: seat.id,
          row: seat.row_letter,
          seat_number: seat.seat_number,
          price: seat.price_pence / 100,
          status: seat.status,
          section: seat.section_name,
          touch_optimized: isMobile
        }
      });
    });

    // Add section labels
    const sections = Array.from(sectionMap.values());
    sections.forEach(section => {
      if (section.seats.length > 0) {
        const positions = section.seats.map((seat: any) => ({ x: seat.x, y: seat.y }));
        const minY = Math.min(...positions.map(p => p.y));
        const centerX = (Math.min(...positions.map(p => p.x)) + Math.max(...positions.map(p => p.x))) / 2;
        
        section.labels = [
          {
            title: section.title,
            x: centerX,
            y: minY - (isMobile ? 40 : 30) // More space on mobile
          }
        ];
      }
    });

    return sections;
  }, [isMobile]);

  // Enhanced seat click handler for mobile
  const handleSeatClick = useCallback((seat: any) => {
    if (!seat.item.salable) {
      // Show feedback for unavailable seats
      if (isMobile) {
        // Could add haptic feedback here
        console.log('Seat not available - mobile feedback');
      }
      return;
    }

    const seatId = seat.item.custom_data.original_id;
    
    setSelectedSeats(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(seatId)) {
        newSelected.delete(seatId);
        seat.unSelect();
      } else {
        newSelected.add(seatId);
        seat.select();
      }
      
      // Trigger callback
      if (onSeatSelect) {
        onSeatSelect(seatId, seat.item.custom_data);
      }
      
      return newSelected;
    });
  }, [isMobile, onSeatSelect]);

  // Mobile-optimized configuration
  const config = MobileRenderingOptimizer.getMobileConfig({
    legend: !isMobile, // Hide legend on mobile to save space
    style: {
      seat: {
        hover: '#8fe100',
        color: '#f0f7fa',
        selected: '#8fe100',
        check_icon_color: '#fff',
        not_salable: '#ff6b6b',
        focus: '#8fe100',
      },
      legend: {
        font_color: '#3b3b3b',
        show: !isMobile
      },
      block: {
        title_color: '#333'
      }
    }
  });

  const blocks = transformSeatsForMobile(seats);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
        <div className="ml-4">
          <p className="font-semibold">Loading seats...</p>
          <p className="text-sm text-gray-600">
            {isMobile ? 'Optimizing for mobile' : 'Preparing theater layout'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Mobile controls */}
      {isMobile && (
        <div className="absolute top-2 right-2 z-10 bg-white rounded-lg shadow-lg p-2">
          <div className="flex items-center space-x-2 text-xs">
            <div className="text-gray-600">Selected: {selectedSeats.size}</div>
            <div className="text-gray-600">Total: {seats.length}</div>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full">
        <Seatmap
          ref={seatmapRef}
          seatClick={handleSeatClick}
          blocks={blocks}
          config={config}
          className="w-full h-full"
        />
      </div>

      {/* Mobile-specific selected seats footer */}
      {isMobile && selectedSeats.size > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white p-3 rounded-t-lg">
          <div className="flex justify-between items-center">
            <span className="font-semibold">
              {selectedSeats.size} seat{selectedSeats.size > 1 ? 's' : ''} selected
            </span>
            <button 
              className="bg-white text-green-500 px-3 py-1 rounded text-sm font-medium"
              onClick={() => {
                // Handle checkout or next step
                console.log('Proceed with selected seats:', Array.from(selectedSeats));
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TouchOptimizedSeatmap; 