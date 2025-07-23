import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { seats, sections, shows, seatMaps } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
// import { TheaterCoordinateGenerator } from '@/lib/seatmaps/theater-coordinate-generator';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

// Professional theater layout configuration for Hamilton/Victoria Palace Theater
const HAMILTON_SEAT_CONFIG = {
  name: "Victoria Palace Theatre - Hamilton",
  svgViewbox: "0 0 1200 800",
  sections: [
    {
      id: "stalls-left",
      name: "Stalls Left",
      shape: "curved-orchestra",
      rows: 15,
      seatsPerRow: [18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46],
      curveConfig: {
        centerX: 600,
        centerY: 700,
        startAngle: 200,
        endAngle: 240,
        innerRadius: 120,
        rowDepth: 25
      },
      colorHex: "#DC2626",
      defaultPrice: 8500 // £85.00
    },
    {
      id: "stalls-center",
      name: "Stalls Center",
      shape: "curved-orchestra", 
      rows: 18,
      seatsPerRow: [20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54],
      curveConfig: {
        centerX: 600,
        centerY: 700,
        startAngle: 240,
        endAngle: 300,
        innerRadius: 100,
        rowDepth: 22
      },
      colorHex: "#DC2626",
      defaultPrice: 10000 // £100.00
    },
    {
      id: "stalls-right",
      name: "Stalls Right",
      shape: "curved-orchestra",
      rows: 15,
      seatsPerRow: [18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46],
      curveConfig: {
        centerX: 600,
        centerY: 700,
        startAngle: 300,
        endAngle: 340,
        innerRadius: 120,
        rowDepth: 25
      },
      colorHex: "#DC2626",
      defaultPrice: 8500 // £85.00
    },
    {
      id: "royal-circle-left",
      name: "Royal Circle Left",
      shape: "curved-balcony",
      rows: 8,
      seatsPerRow: [12, 14, 16, 18, 20, 22, 24, 26],
      curveConfig: {
        centerX: 600,
        centerY: 700,
        startAngle: 210,
        endAngle: 240,
        innerRadius: 200,
        rowDepth: 20
      },
      colorHex: "#7C3AED",
      defaultPrice: 7500 // £75.00
    },
    {
      id: "royal-circle-center",
      name: "Royal Circle Center",
      shape: "curved-balcony",
      rows: 10,
      seatsPerRow: [16, 18, 20, 22, 24, 26, 28, 30, 32, 34],
      curveConfig: {
        centerX: 600,
        centerY: 700,
        startAngle: 240,
        endAngle: 300,
        innerRadius: 180,
        rowDepth: 18
      },
      colorHex: "#7C3AED",
      defaultPrice: 8500 // £85.00
    },
    {
      id: "royal-circle-right",
      name: "Royal Circle Right",
      shape: "curved-balcony",
      rows: 8,
      seatsPerRow: [12, 14, 16, 18, 20, 22, 24, 26],
      curveConfig: {
        centerX: 600,
        centerY: 700,
        startAngle: 300,
        endAngle: 330,
        innerRadius: 200,
        rowDepth: 20
      },
      colorHex: "#7C3AED",
      defaultPrice: 7500 // £75.00
    }
  ]
};

interface SeatPosition {
  x: number;
  y: number;
  row: string;
  seatNumber: number;
}

class TheaterCoordinateGenerator {
  /**
   * Generate curved orchestra section (main floor, curved towards stage)
   */
  generateCurvedOrchestra(config: any, rows: number, seatsPerRow: number[]): SeatPosition[] {
    const seats: SeatPosition[] = [];
    
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowLetter = String.fromCharCode(65 + rowIndex); // A, B, C, etc.
      const seatsInRow = seatsPerRow[rowIndex] || seatsPerRow[seatsPerRow.length - 1];
      
      // Calculate radius for this row (closer to stage = smaller radius)
      const rowRadius = config.innerRadius + (rowIndex * config.rowDepth);
      
      // Calculate angle step for even seat distribution
      const totalAngle = config.endAngle - config.startAngle;
      const angleStep = totalAngle / (seatsInRow - 1);
      
      // Generate seats for this row
      for (let seatIndex = 0; seatIndex < seatsInRow; seatIndex++) {
        const angle = config.startAngle + (seatIndex * angleStep);
        const angleRad = (angle * Math.PI) / 180;
        
        const x = config.centerX + rowRadius * Math.cos(angleRad);
        const y = config.centerY + rowRadius * Math.sin(angleRad);
        
        seats.push({
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
          row: rowLetter,
          seatNumber: seatIndex + 1
        });
      }
    }
    
    return seats;
  }

  /**
   * Generate curved balcony section (upper level, curved towards stage)
   */
  generateCurvedBalcony(config: any, rows: number, seatsPerRow: number[]): SeatPosition[] {
    const seats: SeatPosition[] = [];
    
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowLetter = String.fromCharCode(65 + rowIndex); // A, B, C, etc.
      const seatsInRow = seatsPerRow[rowIndex] || seatsPerRow[seatsPerRow.length - 1];
      
      // Calculate radius for this row (balcony rows are further from stage)
      const rowRadius = config.innerRadius + (rowIndex * config.rowDepth);
      
      // Calculate angle step for even seat distribution
      const totalAngle = config.endAngle - config.startAngle;
      const angleStep = totalAngle / (seatsInRow - 1);
      
      // Generate seats for this row
      for (let seatIndex = 0; seatIndex < seatsInRow; seatIndex++) {
        const angle = config.startAngle + (seatIndex * angleStep);
        const angleRad = (angle * Math.PI) / 180;
        
        const x = config.centerX + rowRadius * Math.cos(angleRad);
        const y = config.centerY + rowRadius * Math.sin(angleRad);
        
        seats.push({
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
          row: rowLetter,
          seatNumber: seatIndex + 1
        });
      }
    }
    
    return seats;
  }

  /**
   * Generate section seats based on configuration
   */
  generateSectionSeats(sectionConfig: any): SeatPosition[] {
    switch (sectionConfig.shape) {
      case 'curved-orchestra':
        return this.generateCurvedOrchestra(
          sectionConfig.curveConfig,
          sectionConfig.rows,
          sectionConfig.seatsPerRow
        );
      
      case 'curved-balcony':
        return this.generateCurvedBalcony(
          sectionConfig.curveConfig,
          sectionConfig.rows,
          sectionConfig.seatsPerRow
        );
      
      default:
        throw new Error(`Unsupported section shape: ${sectionConfig.shape}`);
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🎭 Starting Hamilton seat map regeneration');

    // Find the Hamilton show
    const hamiltonShow = await db
      .select()
      .from(shows)
      .where(eq(shows.title, 'Hamilton'))
      .limit(1);

    if (hamiltonShow.length === 0) {
      return NextResponse.json({ error: 'Hamilton show not found' }, { status: 404 });
    }

    const show = hamiltonShow[0];
    console.log(`✅ Found Hamilton show: ${show.id}`);

    // Get all sections for this show
    const showSections = await db
      .select()
      .from(sections)
      .innerJoin(seatMaps, eq(sections.seatMapId, seatMaps.id))
      .innerJoin(shows, eq(shows.seatMapId, seatMaps.id))
      .where(eq(shows.id, show.id));

    console.log(`📊 Found ${showSections.length} sections for Hamilton`);

    // Generate professional coordinates
    const generator = new TheaterCoordinateGenerator();
    const updatedSeats: Array<{
      seatId: string;
      sectionName: string;
      position: { x: number; y: number };
    }> = [];

    // Process each section configuration
    for (const sectionConfig of HAMILTON_SEAT_CONFIG.sections) {
      // Find matching database section
      const dbSection = showSections.find(s => s.sections.name === sectionConfig.name);
      if (!dbSection) {
        console.warn(`⚠️ Section not found in database: ${sectionConfig.name}`);
        continue;
      }

      console.log(`🎪 Processing section: ${sectionConfig.name}`);

      // Get existing seats for this section
      const sectionSeats = await db
        .select()
        .from(seats)
        .where(
          and(
            eq(seats.showId, show.id),
            eq(seats.sectionId, dbSection.sections.id)
          )
        );

      console.log(`💺 Found ${sectionSeats.length} seats in ${sectionConfig.name}`);

      // Generate professional coordinates for this section
      const seatPositions = generator.generateSectionSeats(sectionConfig);
      console.log(`🎯 Generated ${seatPositions.length} coordinates for ${sectionConfig.name}`);

      // Match existing seats with generated positions
      let positionIndex = 0;
      for (const seat of sectionSeats) {
        if (positionIndex < seatPositions.length) {
          const position = seatPositions[positionIndex];
          
          // Update the seat with new position
          await db
            .update(seats)
            .set({
              position: { x: position.x, y: position.y },
              updatedAt: new Date()
            })
            .where(eq(seats.id, seat.id));

          updatedSeats.push({
            seatId: seat.id,
            sectionName: sectionConfig.name,
            position: { x: position.x, y: position.y }
          });

          positionIndex++;
        }
      }

      console.log(`✅ Updated ${positionIndex} seats in ${sectionConfig.name}`);
    }

    console.log(`🎉 Successfully regenerated ${updatedSeats.length} seat positions for Hamilton`);

    return NextResponse.json({
      success: true,
      message: `Successfully regenerated ${updatedSeats.length} seat positions for Hamilton`,
      updatedSeats: updatedSeats.length,
      sectionsProcessed: HAMILTON_SEAT_CONFIG.sections.length,
      showId: show.id
    });

  } catch (error) {
    console.error('❌ Error regenerating Hamilton seat map:', error);
    return NextResponse.json(
      { 
        error: 'Failed to regenerate Hamilton seat map',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 