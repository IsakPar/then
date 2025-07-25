// ============================================================================
// SEATMAP COMPONENT TYPES
// ============================================================================

export interface Seat {
  id: string;
  row_letter: string;
  seat_number: number;
  section_id: string;
  section_name?: string;
  display_name?: string;
  price_pence: number;
  status: 'available' | 'selected' | 'booked' | 'reserved';
  position: {
    x: number;
    y: number;
  };
  color_hex?: string;
  is_accessible?: boolean;
  notes?: string;
}

export interface SectionInfo {
  id: string;
  name: string;
  display_name?: string;
  displayName?: string; // Add alias for compatibility
  color_hex: string;
  color?: string; // Add alias for compatibility
  base_price_pence: number;
  seat_map_id: string;
  sort_order: number;
  seats?: Seat[]; // Add seats array
}

export interface SeatMapData {
  id: string;
  name: string;
  description?: string;
  layout_config: any;
  total_capacity: number;
  svg_viewbox: string;
  created_at: string;
  updated_at: string;
}

export interface SeatMapTheme {
  name: string;
  background: string;
  seatColors: {
    available: string;
    selected: string;
    booked: string;
    reserved: string;
    accessible: string;
  };
  sectionColors: string[];
  stageColor: string;
  textColor: string;
  colors?: {
    background: string;
    accessible: string;
    selectedBorder: string;
    sectionLabel: string;
  };
  fonts?: {
    seatNumber: {
      family: string;
      weight: string;
    };
    sectionLabel: {
      family: string;
      weight: string;
    };
  };
}

export interface SeatRenderProps {
  seat: Seat;
  position?: { x: number; y: number };
  radius?: number;
  isSelected: boolean;
  isHovered: boolean;
  showLabel?: boolean;
  showDetails?: boolean;
  onClick?: () => void;
  onHover?: () => void;
  onSeatClick?: (seat: Seat) => void;
  onSeatHover?: (seat: Seat) => void;
  theme?: SeatMapTheme;
}

// Missing type exports
export interface SeatMapContainerProps {
  showId?: string;
  seatMapData?: SeatMapData;
  seats?: Seat[];
  sections?: SectionInfo[];
  selectedSeatIds?: Set<string>;
  selectedSeats?: Seat[];
  onSeatClick?: (seat: Seat) => void;
  onSeatSelect?: (seat: Seat) => void;
  onSeatDeselect?: (seat: Seat) => void;
  onSeatHover?: (seat: Seat) => void;
  theme?: SeatMapTheme;
  className?: string;
  style?: React.CSSProperties;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  panX: number;
  panY: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;
  };
}

export interface SectionRenderProps {
  section: SectionInfo;
  seats: Seat[];
  selectedSeatIds: Set<string>;
  hoveredSeatId?: string;
  seatRadius: number;
  showLabels: boolean;
  showDetails: boolean;
  onSeatClick: (seat: Seat) => void;
  onSeatHover: (seat: Seat) => void;
  coordinateEngine: any;
  zoomLevel: number;
  hideSectionLabels: boolean;
  theme?: SeatMapTheme;
}

export interface SectionRendererInternalProps {
  section: SectionInfo;
  seats: Seat[];
  selectedSeatIds: Set<string>;
  hoveredSeatId?: string;
  seatRadius: number;
  showLabels: boolean;
  showDetails: boolean;
  onSeatClick: (seat: Seat) => void;
  onSeatHover: (seat: Seat) => void;
}

export interface SVGCanvasProps {
  width: number;
  height: number;
  viewBox: string;
  children: React.ReactNode;
  aspectRatio?: number;
  onWheel?: (event: React.WheelEvent) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseMove?: (event: React.MouseEvent) => void;
  onMouseUp?: (event: React.MouseEvent) => void;
  className?: string;
}

export interface CoordinateTransform {
  translateX: number;
  translateY: number;
  scale: number;
}

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export const DEFAULT_SEAT_MAP_CONFIG = {
  seatRadius: 12,
  showLabels: true,
  showDetails: false,
  hideSectionLabels: false,
  minZoom: 0.5,
  maxZoom: 3,
  zoomStep: 0.1,
  zoomThresholds: {
    showLabels: 1.2,
    showDetails: 1.8,
    hideSection: 2.5
  },
  interaction: {
    enabled: true,
    panEnabled: true,
    zoomEnabled: true,
    initialZoom: 1.0,
    minZoom: 0.5,
    maxZoom: 3.0,
    zoomStep: 0.1,
    enableZoom: true,
    enablePan: true,
    enableDoubleClick: true
  },
  coordinateSystem: {
    paddingPercent: 0.1,
    minSeatRadius: 3,
    maxSeatRadius: 12,
    seatSpacingFactor: 0.35
  }
};

export const DEFAULT_THEME = {
  fonts: {
    seatNumber: {
      family: 'Arial, sans-serif',
      weight: 'normal'
    },
    sectionLabel: {
      family: 'Arial, sans-serif',
      weight: 'bold'
    }
  },
  colors: {
    background: '#f8f9fa',
    accessible: '#007bff',
    selectedBorder: '#ffd700',
    sectionLabel: '#333333'
  }
}; 