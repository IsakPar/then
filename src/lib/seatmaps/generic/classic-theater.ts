import { GenericSeatMapConfig } from './types';

/**
 * Classic Theater Layout
 * 
 * Traditional theater with 5 distinct sections:
 * - Premium Orchestra (front center)
 * - Orchestra Left/Right (sides) 
 * - Dress Circle (middle tier)
 * - Balcony (upper tier)
 * 
 * Total capacity: ~850 seats
 */
export const CLASSIC_THEATER: GenericSeatMapConfig = {
  name: "Classic Theater",
  description: "Traditional theater layout with orchestra, dress circle, and balcony sections",
  totalCapacity: 852,
  svgViewbox: "0 0 1400 1000",
  sections: [
    {
      id: "premium-orchestra",
      name: "Premium Orchestra",
      shape: "grid",
      rows: 12,
      cols: 24,
      seatSpacing: 22,
      rowSpacing: 20,
      offset: { x: 500, y: 180 },
      capacity: 288,
      defaultPrice: 8500, // £85.00
      colorHex: "#8B5CF6"
    },
    {
      id: "orchestra-left",
      name: "Orchestra Left",
      shape: "grid",
      rows: 12,
      cols: 8,
      seatSpacing: 22,
      rowSpacing: 20,
      offset: { x: 350, y: 180 },
      capacity: 96,
      defaultPrice: 6500, // £65.00
      colorHex: "#06B6D4"
    },
    {
      id: "orchestra-right", 
      name: "Orchestra Right",
      shape: "grid",
      rows: 12,
      cols: 8,
      seatSpacing: 22,
      rowSpacing: 20,
      offset: { x: 1028, y: 180 },
      capacity: 96,
      defaultPrice: 6500, // £65.00
      colorHex: "#06B6D4"
    },
    {
      id: "dress-circle",
      name: "Dress Circle", 
      shape: "grid",
      rows: 8,
      cols: 32,
      seatSpacing: 20,
      rowSpacing: 18,
      offset: { x: 380, y: 460 },
      capacity: 256,
      defaultPrice: 5500, // £55.00
      colorHex: "#F59E0B"
    },
    {
      id: "balcony",
      name: "Balcony",
      shape: "trapezoid",
      rowCounts: [18, 20, 22, 24, 26, 28, 26, 24],
      seatSpacing: 19,
      rowSpacing: 18,
      offset: { x: 480, y: 620 },
      capacity: 188,
      defaultPrice: 3500, // £35.00
      colorHex: "#EF4444"
    }
  ]
}; 