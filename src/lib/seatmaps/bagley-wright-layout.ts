/**
 * Bagley Wright Theater Layout Configuration
 * 
 * This layout precisely recreates the professional theater design shown in the reference image
 * featuring 6 curved sections with proper spacing, colors, and architectural planning.
 * 
 * SECTION MAPPING:
 * - Section 1: Left Upper (Purple) - Left wing of main orchestra
 * - Section 2: Center Upper (Orange) - Main premium orchestra center  
 * - Section 3: Right Upper (Purple) - Right wing of main orchestra
 * - Section 4: Left Balcony (Cyan) - Elevated left side seating
 * - Section 5: Right Balcony (Cyan) - Elevated right side seating
 * - Section 6: Center Balcony (Cyan) - Elevated center premium balcony
 */

export interface SectionConfig {
  id: string;
  name: string;
  displayName: string;
  color: string;
  capacity: number;
  rows: number;
  priceLevel: number; // 1-5, 5 being most expensive
  accessibility: boolean;
  
  // Geometric configuration
  shape: 'curved-arc' | 'curved-wing' | 'curved-balcony';
  curveConfig: {
    centerX: number;
    centerY: number;
    startAngle: number; // degrees
    endAngle: number;   // degrees
    innerRadius: number;
    outerRadius: number;
    rowSpacing: number;
    seatSpacing: number;
  };
  
  // Visual boundaries (prevent section overlap)
  boundaries: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    buffer: number; // minimum space from other sections
  };
}

export interface StageConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  style: {
    backgroundColor: string;
    borderRadius: number;
    fontSize: number;
    fontColor: string;
  };
}

export interface BagleyWrightLayout {
  name: string;
  description: string;
  totalCapacity: number;
  svgViewBox: string;
  stage: StageConfig;
  sections: SectionConfig[];
  
  // Theater-wide styling
  theme: {
    background: string;
    sectionLabelColor: string;
    seatDefaults: {
      radius: number;
      strokeWidth: number;
      selectedColor: string;
      unavailableColor: string;
      hoveredColor: string;
    };
  };
}

/**
 * PRECISE BAGLEY WRIGHT THEATER LAYOUT
 * Coordinates calculated to match the reference image exactly
 */
export const BAGLEY_WRIGHT_LAYOUT: BagleyWrightLayout = {
  name: "Bagley Wright Theater",
  description: "Professional 6-section curved theater layout matching Seattle Repertory Theatre design",
  totalCapacity: 1400,
  svgViewBox: "0 0 1400 900",
  
  stage: {
    x: 600,
    y: 50,
    width: 200,
    height: 50,
    label: "STAGE",
    style: {
      backgroundColor: "#1F2937",
      borderRadius: 8,
      fontSize: 18,
      fontColor: "#FFFFFF"
    }
  },

  sections: [
    // === UPPER LEVEL (MAIN ORCHESTRA) ===
    
    {
      id: "section-1",
      name: "Section 1",
      displayName: "SECTION 1",
      color: "#7C3AED", // Purple/Violet
      capacity: 250,
      rows: 15,
      priceLevel: 4,
      accessibility: true,
      shape: "curved-wing",
      
      curveConfig: {
        centerX: 700,  // Central focal point for all sections
        centerY: 650,  // Behind the seating area
        startAngle: 135, // Left wing angle
        endAngle: 180,
        innerRadius: 150,
        outerRadius: 320,
        rowSpacing: 12,
        seatSpacing: 18
      },
      
      boundaries: {
        minX: 50,
        maxX: 480,
        minY: 200,
        maxY: 450,
        buffer: 20
      }
    },

    {
      id: "section-2", 
      name: "Section 2",
      displayName: "SECTION 2", 
      color: "#F59E0B", // Orange/Gold - Premium center
      capacity: 400,
      rows: 18,
      priceLevel: 5, // Highest price
      accessibility: true,
      shape: "curved-arc",
      
      curveConfig: {
        centerX: 700,
        centerY: 650,
        startAngle: 210, // Narrower center section to avoid overlap
        endAngle: 330,
        innerRadius: 120,
        outerRadius: 320,
        rowSpacing: 10,
        seatSpacing: 16
      },
      
      boundaries: {
        minX: 450,
        maxX: 950,
        minY: 180,
        maxY: 480,
        buffer: 20
      }
    },

    {
      id: "section-3",
      name: "Section 3", 
      displayName: "SECTION 3",
      color: "#7C3AED", // Purple/Violet (matching Section 1)
      capacity: 250,
      rows: 15,
      priceLevel: 4,
      accessibility: true,
      shape: "curved-wing",
      
      curveConfig: {
        centerX: 700,
        centerY: 650,
        startAngle: 0,   // Right wing angle  
        endAngle: 45,
        innerRadius: 150,
        outerRadius: 320,
        rowSpacing: 12,
        seatSpacing: 18
      },
      
      boundaries: {
        minX: 920,
        maxX: 1350,
        minY: 200,
        maxY: 450,
        buffer: 20
      }
    },

    // === LOWER LEVEL (BALCONY) ===
    
    {
      id: "section-4",
      name: "Section 4",
      displayName: "SECTION 4",
      color: "#06B6D4", // Cyan/Blue - Balcony level
      capacity: 150,
      rows: 8,
      priceLevel: 3,
      accessibility: false,
      shape: "curved-balcony",
      
      curveConfig: {
        centerX: 700,
        centerY: 550,
        startAngle: 120,
        endAngle: 160,
        innerRadius: 200,
        outerRadius: 320,
        rowSpacing: 15,
        seatSpacing: 20
      },
      
      boundaries: {
        minX: 50,
        maxX: 350,
        minY: 500,
        maxY: 700,
        buffer: 25
      }
    },

    {
      id: "section-5",
      name: "Section 5",
      displayName: "SECTION 5", 
      color: "#06B6D4", // Cyan/Blue - Balcony level
      capacity: 150,
      rows: 8,
      priceLevel: 3,
      accessibility: false,
      shape: "curved-balcony",
      
      curveConfig: {
        centerX: 700,
        centerY: 550,
        startAngle: 20,
        endAngle: 60,
        innerRadius: 200,
        outerRadius: 320,
        rowSpacing: 15,
        seatSpacing: 20
      },
      
      boundaries: {
        minX: 1050,
        maxX: 1350,
        minY: 500,
        maxY: 700,
        buffer: 25
      }
    },

    {
      id: "section-6",
      name: "Section 6",
      displayName: "SECTION 6",
      color: "#06B6D4", // Cyan/Blue - Center balcony premium
      capacity: 200,
      rows: 10,
      priceLevel: 4, // Higher than side balconies
      accessibility: true,
      shape: "curved-balcony",
      
      curveConfig: {
        centerX: 700,
        centerY: 500, // Move center higher to avoid overlap
        startAngle: 230, // Adjust angles to avoid section 2
        endAngle: 310,
        innerRadius: 280, // Increase radius to create separation
        outerRadius: 380,
        rowSpacing: 14,
        seatSpacing: 18
      },
      
      boundaries: {
        minX: 350,
        maxX: 1050,
        minY: 600, // Move boundaries lower to balcony level
        maxY: 800,
        buffer: 25
      }
    }
  ],

  theme: {
    background: "#F8FAFC", // Light gray background
    sectionLabelColor: "#374151", // Dark gray labels
    seatDefaults: {
      radius: 8,
      strokeWidth: 1,
      selectedColor: "#10B981", // Green for selection
      unavailableColor: "#DC2626", // Red for booked/blocked
      hoveredColor: "#FCD34D" // Yellow for hover
    }
  }
};

/**
 * Helper function to get section by ID
 */
export function getSectionById(sectionId: string): SectionConfig | undefined {
  return BAGLEY_WRIGHT_LAYOUT.sections.find(section => section.id === sectionId);
}

/**
 * Helper function to get all sections by level
 */
export function getSectionsByLevel(level: 'upper' | 'lower'): SectionConfig[] {
  if (level === 'upper') {
    return BAGLEY_WRIGHT_LAYOUT.sections.filter(s => 
      s.id === 'section-1' || s.id === 'section-2' || s.id === 'section-3'
    );
  } else {
    return BAGLEY_WRIGHT_LAYOUT.sections.filter(s => 
      s.id === 'section-4' || s.id === 'section-5' || s.id === 'section-6'
    );
  }
}

/**
 * Helper function to validate section boundaries (prevent overlaps)
 */
export function validateSectionBoundaries(): { valid: boolean; conflicts: string[] } {
  const conflicts: string[] = [];
  const sections = BAGLEY_WRIGHT_LAYOUT.sections;

  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const sectionA = sections[i];
      const sectionB = sections[j];
      
      // Check for boundary overlaps
      const overlapX = !(sectionA.boundaries.maxX + sectionA.boundaries.buffer < sectionB.boundaries.minX || 
                       sectionB.boundaries.maxX + sectionB.boundaries.buffer < sectionA.boundaries.minX);
      const overlapY = !(sectionA.boundaries.maxY + sectionA.boundaries.buffer < sectionB.boundaries.minY || 
                       sectionB.boundaries.maxY + sectionB.boundaries.buffer < sectionA.boundaries.minY);
      
      if (overlapX && overlapY) {
        conflicts.push(`${sectionA.name} overlaps with ${sectionB.name}`);
      }
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts
  };
}

/**
 * Export pricing information for database updates
 */
export const BAGLEY_WRIGHT_PRICING = {
  "section-1": 8500,  // £85.00
  "section-2": 12000, // £120.00 - Premium center
  "section-3": 8500,  // £85.00  
  "section-4": 7000,  // £70.00 - Balcony
  "section-5": 7000,  // £70.00 - Balcony
  "section-6": 9000   // £90.00 - Premium balcony
} as const; 