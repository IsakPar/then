// ============================================================================
// SEATMAP COMPONENT TYPES
// ============================================================================

export interface Seat {
  id: string;
  row_letter: string;
  seat_number: number;
  section_id: string;
  price_pence: number;
  status: 'available' | 'selected' | 'booked' | 'reserved';
  position: {
    x: number;
    y: number;
  };
  is_accessible?: boolean;
  notes?: string;
}

export interface SectionInfo {
  id: string;
  name: string;
  display_name?: string;
  color_hex: string;
  base_price_pence: number;
  seat_map_id: string;
  sort_order: number;
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
}

export interface SeatRenderProps {
  seat: Seat;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: () => void;
  theme: SeatMapTheme;
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