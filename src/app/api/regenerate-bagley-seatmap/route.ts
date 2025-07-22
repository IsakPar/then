import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { seats, sections, shows, seatMaps } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateBagleyWrightTheater } from '@/lib/seatmaps/curved-theater-generator';
import { BAGLEY_WRIGHT_LAYOUT, BAGLEY_WRIGHT_PRICING } from '@/lib/seatmaps/bagley-wright-layout';

/**
 * API Endpoint to Regenerate Hamilton Seat Map with Bagley Wright Theater Layout
 * 
 * This endpoint completely recreates the Hamilton show's seat map to match
 * the professional Bagley Wright Theater design with 6 curved sections.
 * 
 * PROCESS:
 * 1. Generate new seat positions using curved theater algorithm
 * 2. Clear existing Hamilton seats and sections
 * 3. Create new sections with proper colors and pricing
 * 4. Insert all seats with precise curved coordinates
 * 5. Validate the complete layout
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 Starting Hamilton seat map regeneration with Bagley Wright layout...');

    // Generate the complete Bagley Wright theater layout
    const { sections: generatedSections, accessibilityMap, validation } = generateBagleyWrightTheater();
    
    // Check for critical validation errors (not just warnings)
    const criticalErrors = validation.warnings.filter(warning => 
      warning.includes('Capacity mismatch:') && warning.includes('(') && 
      parseFloat(warning.match(/\((\d+\.?\d*)%/)?.[1] || '0') < 30
    );
    
    if (criticalErrors.length > 0) {
      console.warn('❌ Critical layout validation errors:', criticalErrors);
      return NextResponse.json({
        success: false,
        error: 'Generated layout failed validation',
        warnings: validation.warnings
      }, { status: 400 });
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Layout validation warnings (proceeding):', validation.warnings);
    }

    console.log(`✅ Generated ${validation.statistics.totalSeats} seats across ${validation.statistics.sectionsGenerated} sections`);

    // Find the Hamilton show
    const hamiltonShow = await db
      .select()
      .from(shows)
      .where(eq(shows.title, 'Hamilton'))
      .limit(1);

    if (hamiltonShow.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Hamilton show not found' 
      }, { status: 404 });
    }

    const show = hamiltonShow[0];
    console.log(`✅ Found Hamilton show: ${show.id}`);

    // Get the seat map ID for this show
    const showSeatMap = await db
      .select()
      .from(seatMaps)
      .where(eq(seatMaps.id, show.seatMapId))
      .limit(1);

    if (showSeatMap.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Hamilton seat map not found'
      }, { status: 404 });
    }

    const seatMapId = showSeatMap[0].id;
    console.log(`✅ Found seat map: ${seatMapId}`);

    // === PHASE 1: Clear existing data ===
    console.log('🧹 Clearing existing Hamilton seats and sections...');
    
    // Delete all existing seats for this show
    await db
      .delete(seats)
      .where(eq(seats.showId, show.id));
    
    // Delete all existing sections for this seat map
    await db
      .delete(sections)
      .where(eq(sections.seatMapId, seatMapId));

    console.log('✅ Cleared existing data');

    // === PHASE 2: Update seat map metadata ===
    console.log('📝 Updating seat map metadata...');
    
    await db
      .update(seatMaps)
      .set({
        name: BAGLEY_WRIGHT_LAYOUT.name,
        description: BAGLEY_WRIGHT_LAYOUT.description,
        totalCapacity: validation.statistics.totalSeats,
        svgViewbox: BAGLEY_WRIGHT_LAYOUT.svgViewBox,
        layoutConfig: {
          type: 'bagley_wright_theater',
          stage: BAGLEY_WRIGHT_LAYOUT.stage,
          sections: BAGLEY_WRIGHT_LAYOUT.sections.map(s => ({
            id: s.id,
            name: s.name,
            displayName: s.displayName,
            color: s.color,
            capacity: s.capacity,
            shape: s.shape,
            boundaries: s.boundaries
          })),
          theme: BAGLEY_WRIGHT_LAYOUT.theme,
          generatedAt: new Date().toISOString(),
          totalSeats: validation.statistics.totalSeats
        },
        updatedAt: new Date()
      })
      .where(eq(seatMaps.id, seatMapId));

    console.log('✅ Updated seat map metadata');

    // === PHASE 3: Create new sections ===
    console.log('🎪 Creating Bagley Wright sections...');
    
    const sectionIdMap = new Map<string, string>(); // Map from layout ID to database ID
    
    for (const sectionConfig of BAGLEY_WRIGHT_LAYOUT.sections) {
      const generatedSection = generatedSections.find(gs => gs.sectionId === sectionConfig.id);
      const actualCapacity = generatedSection?.seats.length || sectionConfig.capacity;
      
      const [newSection] = await db
        .insert(sections)
        .values({
          seatMapId: seatMapId,
          name: sectionConfig.id, // Use ID as name for database lookups
          displayName: sectionConfig.displayName,
          colorHex: sectionConfig.color,
          basePricePence: BAGLEY_WRIGHT_PRICING[sectionConfig.id as keyof typeof BAGLEY_WRIGHT_PRICING],
          seatPattern: {
            shape: sectionConfig.shape,
            rows: sectionConfig.rows,
            capacity: actualCapacity,
            curveConfig: sectionConfig.curveConfig
          },
          positionConfig: {
            boundaries: sectionConfig.boundaries,
            accessibility: sectionConfig.accessibility
          },
          sortOrder: parseInt(sectionConfig.id.split('-')[1]) // Extract number from "section-1"
        })
        .returning({ id: sections.id });

      sectionIdMap.set(sectionConfig.id, newSection.id);
      
      console.log(`✅ Created section ${sectionConfig.displayName} (${actualCapacity} seats) -> DB ID: ${newSection.id}`);
    }

    // === PHASE 4: Insert all seats with curved coordinates ===
    console.log('💺 Inserting seats with curved coordinates...');
    
    let totalSeatsInserted = 0;
    
    for (const generatedSection of generatedSections) {
      const databaseSectionId = sectionIdMap.get(generatedSection.sectionId);
      
      if (!databaseSectionId) {
        console.error(`❌ No database section ID found for ${generatedSection.sectionId}`);
        continue;
      }

      const sectionConfig = BAGLEY_WRIGHT_LAYOUT.sections.find(s => s.id === generatedSection.sectionId);
      const basePricePence = BAGLEY_WRIGHT_PRICING[generatedSection.sectionId as keyof typeof BAGLEY_WRIGHT_PRICING];

      // Prepare seat data for batch insert
      const seatData = generatedSection.seats.map(seat => {
        const seatId = `${seat.sectionId}-${seat.row}-${seat.seatNumber}`;
        const isAccessible = accessibilityMap.get(seatId) || false;
        
        return {
          showId: show.id,
          sectionId: databaseSectionId,
          rowLetter: seat.row,
          seatNumber: seat.seatNumber,
          pricePence: basePricePence,
          status: 'available' as const,
          position: { x: Math.round(seat.x), y: Math.round(seat.y) },
          isAccessible: isAccessible,
          notes: isAccessible ? 'Wheelchair accessible' : null
        };
      });

      // Batch insert seats for this section
      await db.insert(seats).values(seatData);
      
      totalSeatsInserted += seatData.length;
      console.log(`✅ Inserted ${seatData.length} seats for ${generatedSection.sectionName}`);
    }

    // === PHASE 5: Final validation ===
    console.log('🔍 Performing final validation...');
    
    // Count seats in database
    const [seatCount] = await db
      .select({ count: seats.id })
      .from(seats)
      .where(eq(seats.showId, show.id));

    // Count sections in database  
    const [sectionCount] = await db
      .select({ count: sections.id })
      .from(sections)
      .where(eq(sections.seatMapId, seatMapId));

    const finalValidation = {
      seatsInDatabase: seatCount?.count || 0,
      sectionsInDatabase: sectionCount?.count || 0,
      expectedSeats: validation.statistics.totalSeats,
      expectedSections: BAGLEY_WRIGHT_LAYOUT.sections.length,
      seatsMatch: (seatCount?.count || 0) === validation.statistics.totalSeats,
      sectionsMatch: (sectionCount?.count || 0) === BAGLEY_WRIGHT_LAYOUT.sections.length
    };

    console.log('📊 Final Validation:', finalValidation);

    if (!finalValidation.seatsMatch || !finalValidation.sectionsMatch) {
      return NextResponse.json({
        success: false,
        error: 'Database validation failed',
        validation: finalValidation
      }, { status: 500 });
    }

    // === SUCCESS ===
    console.log('🎉 Hamilton seat map regeneration completed successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Hamilton seat map regenerated with Bagley Wright Theater layout',
      statistics: {
        totalSeats: finalValidation.seatsInDatabase,
        totalSections: finalValidation.sectionsInDatabase,
        layoutValidation: validation,
        generatedSections: generatedSections.map(gs => ({
          sectionId: gs.sectionId,
          sectionName: gs.sectionName,
          seats: gs.seats.length,
          rows: gs.metadata.actualRows,
          averageSeatsPerRow: gs.metadata.averageSeatsPerRow
        }))
      },
      layout: {
        name: BAGLEY_WRIGHT_LAYOUT.name,
        svgViewBox: BAGLEY_WRIGHT_LAYOUT.svgViewBox,
        stage: BAGLEY_WRIGHT_LAYOUT.stage,
        sectionsCount: BAGLEY_WRIGHT_LAYOUT.sections.length
      }
    });

  } catch (error) {
    console.error('❌ Error regenerating Hamilton seat map:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error during seat map regeneration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check current Hamilton seat map status
 */
export async function GET() {
  try {
    // Find Hamilton show
    const hamiltonShow = await db
      .select({
        id: shows.id,
        title: shows.title,
        seatMapId: shows.seatMapId
      })
      .from(shows)
      .where(eq(shows.title, 'Hamilton'))
      .limit(1);

    if (hamiltonShow.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Hamilton show not found'
      }, { status: 404 });
    }

    const show = hamiltonShow[0];

    // Get current seat count
    const [seatCount] = await db
      .select({ count: seats.id })
      .from(seats)
      .where(eq(seats.showId, show.id));

    // Get current section count and details
    const currentSections = await db
      .select({
        id: sections.id,
        name: sections.name,
        displayName: sections.displayName,
        colorHex: sections.colorHex,
        basePricePence: sections.basePricePence
      })
      .from(sections)
      .where(eq(sections.seatMapId, show.seatMapId));

    // Get seat map metadata
    const [seatMapData] = await db
      .select()
      .from(seatMaps)
      .where(eq(seatMaps.id, show.seatMapId))
      .limit(1);

    return NextResponse.json({
      success: true,
      hamilton: {
        showId: show.id,
        currentSeats: seatCount?.count || 0,
        currentSections: currentSections.length,
        sections: currentSections,
        seatMap: {
          id: seatMapData?.id,
          name: seatMapData?.name,
          totalCapacity: seatMapData?.totalCapacity,
          svgViewbox: seatMapData?.svgViewbox,
          lastUpdated: seatMapData?.updatedAt
        }
      },
      bagleyWrightTarget: {
        expectedSeats: BAGLEY_WRIGHT_LAYOUT.totalCapacity,
        expectedSections: BAGLEY_WRIGHT_LAYOUT.sections.length,
        sections: BAGLEY_WRIGHT_LAYOUT.sections.map(s => ({
          id: s.id,
          name: s.displayName,
          color: s.color,
          capacity: s.capacity,
          pricing: BAGLEY_WRIGHT_PRICING[s.id as keyof typeof BAGLEY_WRIGHT_PRICING]
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error checking Hamilton status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 