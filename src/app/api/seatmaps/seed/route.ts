import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { seatMaps, sections } from '@/lib/db/schema';
import { getAllSeatMapTemplates } from '@/lib/seatmaps/generic';

export async function POST() {
  try {
    console.log('🌱 Seeding database with all comprehensive seat map templates');
    
    // Get all available seat map templates
    const allTemplates = getAllSeatMapTemplates();
    
    // Use all available templates for comprehensive seeding
    const seatMapConfigs = allTemplates;
    
    const createdSeatMaps = [];
    
    for (const config of seatMapConfigs) {
      console.log(`🗺️ Creating seat map: ${config.name}`);
      
      // Create seat map
      const [seatMap] = await db
        .insert(seatMaps)
        .values({
          name: config.name,
          description: config.description,
          layoutConfig: config as any,
          totalCapacity: config.totalCapacity,
          svgViewbox: config.svgViewbox,
        })
        .returning();
        
      console.log(`✅ Created seat map: ${seatMap.id}`);
      
      // Create sections for this seat map
      const sectionsToCreate = config.sections.map((section, index) => ({
        seatMapId: seatMap.id,
        name: section.name,
        displayName: section.name,
        colorHex: section.colorHex || '#3B82F6',
        basePricePence: section.defaultPrice || 5000,
        seatPattern: {
          rows: section.rows || 10,
          cols: section.cols || 15,
          shape: section.shape || 'grid'
        },
        positionConfig: {
          offset: section.offset || { x: 0, y: 0 },
          seatSpacing: section.seatSpacing || 22,
          rowSpacing: section.rowSpacing || 20
        },
        isAccessible: false,
        sortOrder: index,
      }));
      
      await db.insert(sections).values(sectionsToCreate);
      console.log(`✅ Created ${sectionsToCreate.length} sections for ${config.name}`);
      
      createdSeatMaps.push({
        seatMap,
        sectionCount: sectionsToCreate.length
      });
    }
    
    console.log(`🎉 Successfully seeded ${createdSeatMaps.length} comprehensive seat map templates`);
    
    return NextResponse.json({
      success: true,
      message: `Created ${createdSeatMaps.length} comprehensive seat map templates`,
      seatMaps: createdSeatMaps
    });
    
  } catch (error) {
    console.error('❌ Error seeding seat maps:', error);
    return NextResponse.json(
      { 
        error: 'Failed to seed seat maps',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 