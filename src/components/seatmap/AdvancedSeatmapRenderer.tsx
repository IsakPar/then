"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Seatmap } from '@alisaitteke/seatmap-canvas-react';

interface SeatData {
  id: string;
  row_letter: string;
  seat_number: number;
  position: { x: number; y: number };
  status: string;
  section_name: string;
  color_hex: string;
  price_pence: number;
  is_accessible?: boolean;
  notes?: string;
}

interface PerformanceMetrics {
  renderTime: number;
  totalSeats: number;
  visibleSeats: number;
  fps: number;
  memoryUsage: number;
}

interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Level-of-Detail (LOD) System
class LODManager {
  private zoomLevels = {
    OVERVIEW: 0.3,   // Show sections only
    MEDIUM: 0.7,     // Show seat clusters  
    DETAIL: 1.2      // Show individual seats with labels
  };

  getCurrentLOD(zoomLevel: number): 'overview' | 'medium' | 'detail' {
    if (zoomLevel < this.zoomLevels.OVERVIEW) return 'overview';
    if (zoomLevel < this.zoomLevels.MEDIUM) return 'medium';
    return 'detail';
  }

  getOptimalSeatSize(zoomLevel: number): number {
    return Math.max(8, Math.min(24, 12 * zoomLevel));
  }

  shouldShowLabels(zoomLevel: number): boolean {
    return zoomLevel >= this.zoomLevels.DETAIL;
  }
}

// Performance Monitor
class PerformanceMonitor {
  private frameStart: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;

  startFrame(): void {
    this.frameStart = performance.now();
  }

  endFrame(): number {
    const renderTime = performance.now() - this.frameStart;
    this.frameCount++;
    
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    
    return renderTime;
  }

  getFps(): number {
    return this.currentFps;
  }

  getMemoryUsage(): number {
    if ('memory' in performance) {
      return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0;
  }
}

// Viewport Culling System
class ViewportCuller {
  private static readonly CULLING_MARGIN = 50; // Extra margin for smooth scrolling

  static cullSeats(seats: SeatData[], viewport: ViewportBounds): SeatData[] {
    const culledViewport = {
      minX: viewport.minX - this.CULLING_MARGIN,
      minY: viewport.minY - this.CULLING_MARGIN,
      maxX: viewport.maxX + this.CULLING_MARGIN,
      maxY: viewport.maxY + this.CULLING_MARGIN
    };

    return seats.filter(seat => {
      const { x, y } = seat.position;
      return x >= culledViewport.minX && x <= culledViewport.maxX &&
             y >= culledViewport.minY && y <= culledViewport.maxY;
    });
  }

  static getSectionBounds(seats: SeatData[]): ViewportBounds {
    if (seats.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    const positions = seats.map(seat => seat.position);
    return {
      minX: Math.min(...positions.map(p => p.x)),
      minY: Math.min(...positions.map(p => p.y)),
      maxX: Math.max(...positions.map(p => p.x)),
      maxY: Math.max(...positions.map(p => p.y))
    };
  }
}

const AdvancedSeatmapRenderer: React.FC = () => {
  const seatmapRef = useRef<any>(null);
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [currentZoom, setCurrentZoom] = useState<number>(1);
  const [viewport, setViewport] = useState<ViewportBounds>({ minX: 0, minY: 0, maxX: 1000, maxY: 1000 });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    totalSeats: 0,
    visibleSeats: 0,
    fps: 0,
    memoryUsage: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize managers
  const lodManager = useMemo(() => new LODManager(), []);
  const performanceMonitor = useMemo(() => new PerformanceMonitor(), []);

  // Fetch seat data
  useEffect(() => {
    const fetchSeats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/shows/81447867-94ac-47b1-96cf-d70d3d5ad02e/seats');
        const data = await response.json();
        
        console.log('🎭 Fetched Hamilton seats:', data.length);
        setSeats(data);
        
        // Calculate initial viewport
        const bounds = ViewportCuller.getSectionBounds(data);
        setViewport(bounds);
        
      } catch (error) {
        console.error('Error fetching seats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeats();
  }, []);

  // Transform seats with performance optimization
  const transformSeatsToLibraryFormat = useCallback((seats: SeatData[]) => {
    performanceMonitor.startFrame();
    
    const sectionMap = new Map<string, any>();
    const currentLOD = lodManager.getCurrentLOD(currentZoom);
    
    // Viewport culling for performance
    const visibleSeats = ViewportCuller.cullSeats(seats, viewport);
    
    // Group seats by section
    visibleSeats.forEach(seat => {
      if (!sectionMap.has(seat.section_name)) {
        sectionMap.set(seat.section_name, {
          id: seat.section_name,
          title: seat.section_name,
          color: seat.color_hex,
          labels: [],
          seats: []
        });
      }
      
      const seatObj = {
        id: seat.id,
        title: currentLOD === 'detail' ? `${seat.row_letter}${seat.seat_number}` : '',
        x: seat.position.x,
        y: seat.position.y,
        salable: seat.status === 'available',
        note: `Row ${seat.row_letter}, Seat ${seat.seat_number} - ${seat.status}`,
        custom_data: {
          original_id: seat.id,
          row: seat.row_letter,
          seat_number: seat.seat_number,
          price: seat.price_pence / 100,
          status: seat.status,
          is_accessible: seat.is_accessible || false
        }
      };
      
      sectionMap.get(seat.section_name)?.seats.push(seatObj);
    });

    // Add section labels based on LOD
    const sections = Array.from(sectionMap.values());
    sections.forEach(section => {
      if (section.seats.length > 0 && lodManager.shouldShowLabels(currentZoom)) {
        const xPositions = section.seats.map((seat: any) => seat.x);
        const yPositions = section.seats.map((seat: any) => seat.y);
        const minX = Math.min(...xPositions);
        const maxX = Math.max(...xPositions);
        const minY = Math.min(...yPositions);
        const centerX = (minX + maxX) / 2;
        
        section.labels = [
          {
            title: section.title,
            x: centerX,
            y: minY - 30
          }
        ];
      } else {
        section.labels = [];
      }
    });

    const renderTime = performanceMonitor.endFrame();
    
    // Update performance metrics
    setPerformanceMetrics(prev => ({
      ...prev,
      renderTime: Math.round(renderTime * 100) / 100,
      totalSeats: seats.length,
      visibleSeats: visibleSeats.length,
      fps: performanceMonitor.getFps(),
      memoryUsage: performanceMonitor.getMemoryUsage()
    }));

    return sections;
  }, [currentZoom, viewport, lodManager, performanceMonitor]);

  // Enhanced seat click handler with touch optimization
  const handleSeatClick = useCallback((seat: any) => {
    console.log('🎪 Seat clicked:', seat);
    
    if (!seat.item.salable) {
      console.log('❌ Seat not available');
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
      return newSelected;
    });
  }, []);

  // Handle zoom changes for LOD
  const handleZoomChange = useCallback((zoomLevel: number) => {
    setCurrentZoom(zoomLevel);
    console.log('🔍 Zoom changed:', zoomLevel, 'LOD:', lodManager.getCurrentLOD(zoomLevel));
  }, [lodManager]);

  // Dynamic configuration based on LOD and performance
  const config = useMemo(() => {
    const currentLOD = lodManager.getCurrentLOD(currentZoom);
    const seatSize = lodManager.getOptimalSeatSize(currentZoom);
    
    return {
      legend: true,
      style: {
        seat: {
          hover: '#8fe100',
          color: '#f0f7fa',
          selected: '#8fe100',
          check_icon_color: '#fff',
          not_salable: '#ff6b6b',
          focus: '#8fe100',
          radius: seatSize / 2
        },
        legend: {
          font_color: '#3b3b3b',
          show: true
        },
        block: {
          title_color: '#333',
          title_size: currentLOD === 'detail' ? 14 : 12
        }
      },
      responsive: true,
      touch_optimized: true
    };
  }, [currentZoom, lodManager]);

  const blocks = useMemo(() => transformSeatsToLibraryFormat(seats), [seats, transformSeatsToLibraryFormat]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        <div className="ml-4">
          <p className="text-lg font-semibold">Loading Hamilton Theatre...</p>
          <p className="text-sm text-gray-600">Preparing 1644 seats for rendering</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Performance Dashboard */}
      <div className="bg-gray-100 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">🚀 Performance Dashboard</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div className="bg-white p-2 rounded">
            <div className="font-medium">Render Time</div>
            <div className="text-blue-600">{performanceMetrics.renderTime}ms</div>
          </div>
          <div className="bg-white p-2 rounded">
            <div className="font-medium">FPS</div>
            <div className="text-green-600">{performanceMetrics.fps}</div>
          </div>
          <div className="bg-white p-2 rounded">
            <div className="font-medium">Total Seats</div>
            <div className="text-purple-600">{performanceMetrics.totalSeats}</div>
          </div>
          <div className="bg-white p-2 rounded">
            <div className="font-medium">Visible Seats</div>
            <div className="text-orange-600">{performanceMetrics.visibleSeats}</div>
          </div>
          <div className="bg-white p-2 rounded">
            <div className="font-medium">Memory (MB)</div>
            <div className="text-red-600">{performanceMetrics.memoryUsage}</div>
          </div>
        </div>
      </div>

      {/* Seat Map Controls */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">🎭 Hamilton - Advanced Renderer</h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="font-medium">LOD: </span>
              <span className="text-blue-600">{lodManager.getCurrentLOD(currentZoom)}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium">Zoom: </span>
              <span className="text-blue-600">{Math.round(currentZoom * 100)}%</span>
            </div>
            <div className="text-sm">
              <span className="font-medium">Selected: </span>
              <span className="text-green-600">{selectedSeats.size}</span>
            </div>
          </div>
        </div>

        {/* Seat Map */}
        <div className="border rounded-lg" style={{ height: '600px' }}>
          <Seatmap
            ref={seatmapRef}
            seatClick={handleSeatClick}
            blocks={blocks}
            config={config}
            onZoomChange={handleZoomChange}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Selected Seats Summary */}
      {selectedSeats.size > 0 && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">Selected Seats ({selectedSeats.size})</h3>
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedSeats).slice(0, 10).map(seatId => {
              const seat = seats.find(s => s.id === seatId);
              return seat ? (
                <span key={seatId} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                  {seat.section_name} - {seat.row_letter}{seat.seat_number}
                </span>
              ) : null;
            })}
            {selectedSeats.size > 10 && (
              <span className="text-green-600 text-sm">... and {selectedSeats.size - 10} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSeatmapRenderer; 