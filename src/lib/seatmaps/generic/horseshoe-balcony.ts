import { GenericSeatMapConfig } from './types';

/**
 * Horseshoe Balcony Layout
 * 
 * Classic opera house style with horseshoe balcony:
 * - Orchestra floor
 * - Horseshoe balcony (curved)
 * - Box seats
 * - Upper balcony
 * 
 * Total capacity: ~1,800 seats
 */
export const HORSESHOE_BALCONY: GenericSeatMapConfig = {
  name: "Horseshoe Balcony",
  description: "Classic opera house with horseshoe-shaped balcony and box seats",
  totalCapacity: 1764,
  svgViewbox: "0 0 1400 1200",
  sections: [
    {
      id: "orchestra-floor",
      name: "Orchestra Floor",
      shape: "grid",
      rows: 25,
      cols: 35,
      seatSpacing: 20,
      rowSpacing: 18,
      offset: { x: 350, y: 200 },
      capacity: 875,
      defaultPrice: 8500, // £85.00
      colorHex: "#8B5CF6"
    },
    {
      id: "box-seats-left",
      name: "Box Seats Left",
      shape: "grid",
      rows: 8,
      cols: 6,
      seatSpacing: 25,
      rowSpacing: 22,
      offset: { x: 150, y: 300 },
      capacity: 48,
      defaultPrice: 15000, // £150.00
      colorHex: "#DC2626"
    },
    {
      id: "box-seats-right",
      name: "Box Seats Right",
      shape: "grid",
      rows: 8,
      cols: 6,
      seatSpacing: 25,
      rowSpacing: 22,
      offset: { x: 1080, y: 300 },
      capacity: 48,
      defaultPrice: 15000, // £150.00
      colorHex: "#DC2626"
    },
    {
      id: "horseshoe-balcony",
      name: "Horseshoe Balcony",
      shape: "curve",
      rows: 12,
      cols: 60,
      seatSpacing: 18,
      rowSpacing: 16,
      offset: { x: 250, y: 650 },
      capacity: 720,
      defaultPrice: 6500, // £65.00
      colorHex: "#06B6D4"
    },
    {
      id: "upper-balcony",
      name: "Upper Balcony",
      shape: "trapezoid",
      rowCounts: [12, 15, 18, 21, 24, 21, 18, 15, 12],
      seatSpacing: 16,
      rowSpacing: 14,
      offset: { x: 540, y: 850 },
      capacity: 156,
      defaultPrice: 4500, // £45.00
      colorHex: "#F59E0B"
    }
  ]
}; 