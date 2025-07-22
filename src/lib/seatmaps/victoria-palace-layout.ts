// import { GenericSeatMapConfig } from './generic/types';

// Temporary type definitions until generic/types is created
export interface GenericSeatMapConfig {
  name: string;
  description: string;
  totalCapacity: number;
  svgViewbox: string;
  stageArea: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  };
  sections: Array<{
    id: string;
    name: string;
    displayName: string;
    shape: string;
    curveConfig?: any;
    boundaries: any;
    capacity: number;
    defaultPrice: number;
    colorHex: string;
    theme: string;
  }>;
}

/**
 * Victoria Palace Theatre - Hamilton Layout
 * 
 * ARCHITECTURAL PLANNING:
 * 
 * This layout is designed like a real theater architect would plan it:
 * 1. Stage positioned at top-center as focal point
 * 2. All sections curve toward stage naturally
 * 3. Sections have clear boundaries with buffer zones
 * 4. Seat distributions match real theater proportions
 * 5. No overlapping sections or visual conflicts
 * 
 * SECTION HIERARCHY (closest to stage first):
 * 1. Stalls (Orchestra) - 3 sections, curved toward stage
 * 2. Royal Circle (Dress Circle) - 3 sections, elevated tier
 * 3. Grand Circle (Upper Circle) - 1 section, highest tier
 * 
 * Total capacity: 1,200 seats (matching Hamilton show data)
 */
export const VICTORIA_PALACE_LAYOUT: GenericSeatMapConfig = {
  name: "Victoria Palace Theatre - Hamilton",
  description: "Professional theater layout with precise architectural planning",
  totalCapacity: 1200,
  svgViewbox: "0 0 1600 1200",
  
  stageArea: {
    x: 750,
    y: 30,
    width: 100,
    height: 60,
    label: "STAGE"
  },
  
  sections: [
    // =======================================================================
    // STALLS (ORCHESTRA LEVEL) - Closest to stage
    // =======================================================================
    
    {
      id: "stalls-center",
      name: "Stalls Center",
      displayName: "STALLS",
      shape: "curved-orchestra",
      curveConfig: {
        centerX: 800,
        centerY: 100,        // Stage focal point
        startAngle: 150,     // Gentle curve
        endAngle: 30,        // Gentle curve
        innerRadius: 140,    // Close to stage
        outerRadius: 340,    // Deep section
        rowDepth: 20         // Proper row spacing
      },
      boundaries: {
        minX: 450,
        maxX: 1150,
        minY: 110,
        maxY: 400,
        buffer: 40
      },
      capacity: 400,
      defaultPrice: 7500,   // £75.00
      colorHex: "#8B5CF6",  // Purple
      theme: "premium"
    },
    
    {
      id: "stalls-left",
      name: "Stalls Left",
      displayName: "STALLS LEFT",
      shape: "curved-orchestra",
      curveConfig: {
        centerX: 800,
        centerY: 100,
        startAngle: 180,     // Wider angle for side
        endAngle: 150,       // Connect to center
        innerRadius: 160,
        outerRadius: 320,
        rowDepth: 18
      },
      boundaries: {
        minX: 200,
        maxX: 450,
        minY: 130,
        maxY: 380,
        buffer: 30
      },
      capacity: 140,
      defaultPrice: 6500,   // £65.00
      colorHex: "#F59E0B",  // Orange
      theme: "standard"
    },
    
    {
      id: "stalls-right",
      name: "Stalls Right",
      displayName: "STALLS RIGHT",
      shape: "curved-orchestra",
      curveConfig: {
        centerX: 800,
        centerY: 100,
        startAngle: 30,      // Connect to center
        endAngle: 0,         // Wider angle for side
        innerRadius: 160,
        outerRadius: 320,
        rowDepth: 18
      },
      boundaries: {
        minX: 1150,
        maxX: 1400,
        minY: 130,
        maxY: 380,
        buffer: 30
      },
      capacity: 140,
      defaultPrice: 6500,   // £65.00
      colorHex: "#F59E0B",  // Orange
      theme: "standard"
    },
    
    // =======================================================================
    // ROYAL CIRCLE (DRESS CIRCLE LEVEL) - Middle tier
    // =======================================================================
    
    {
      id: "royal-circle-center",
      name: "Royal Circle Center",
      displayName: "ROYAL CIRCLE",
      shape: "curved-balcony",
      curveConfig: {
        centerX: 800,
        centerY: 100,
        startAngle: 160,
        endAngle: 20,
        innerRadius: 380,    // Above stalls
        outerRadius: 520,    // Good depth
        rowDepth: 22
      },
      boundaries: {
        minX: 400,
        maxX: 1200,
        minY: 420,
        maxY: 580,
        buffer: 45
      },
      capacity: 260,
      defaultPrice: 9500,   // £95.00 (premium balcony)
      colorHex: "#06B6D4",  // Cyan
      theme: "premium"
    },
    
    {
      id: "royal-circle-left",
      name: "Royal Circle Left",
      displayName: "ROYAL CIRCLE LEFT",
      shape: "curved-balcony",
      curveConfig: {
        centerX: 800,
        centerY: 100,
        startAngle: 190,
        endAngle: 160,
        innerRadius: 400,
        outerRadius: 500,
        rowDepth: 20
      },
      boundaries: {
        minX: 180,
        maxX: 400,
        minY: 440,
        maxY: 560,
        buffer: 35
      },
      capacity: 80,
      defaultPrice: 8500,   // £85.00
      colorHex: "#06B6D4",  // Cyan
      theme: "standard"
    },
    
    {
      id: "royal-circle-right",
      name: "Royal Circle Right",
      displayName: "ROYAL CIRCLE RIGHT",
      shape: "curved-balcony",
      curveConfig: {
        centerX: 800,
        centerY: 100,
        startAngle: 20,
        endAngle: -10,
        innerRadius: 400,
        outerRadius: 500,
        rowDepth: 20
      },
      boundaries: {
        minX: 1200,
        maxX: 1420,
        minY: 440,
        maxY: 560,
        buffer: 35
      },
      capacity: 80,
      defaultPrice: 8500,   // £85.00
      colorHex: "#06B6D4",  // Cyan
      theme: "standard"
    },
    
    // =======================================================================
    // GRAND CIRCLE (UPPER CIRCLE) - Highest tier
    // =======================================================================
    
    {
      id: "grand-circle",
      name: "Grand Circle",
      displayName: "GRAND CIRCLE",
      shape: "curved-balcony",
      curveConfig: {
        centerX: 800,
        centerY: 100,
        startAngle: 170,
        endAngle: 10,
        innerRadius: 560,    // Above royal circle
        outerRadius: 680,    // Full depth
        rowDepth: 24
      },
      boundaries: {
        minX: 300,
        maxX: 1300,
        minY: 600,
        maxY: 760,
        buffer: 50
      },
      capacity: 100,
      defaultPrice: 5500,   // £55.00 (budget tier)
      colorHex: "#EF4444",  // Red
      theme: "budget"
    }
  ]
}; 