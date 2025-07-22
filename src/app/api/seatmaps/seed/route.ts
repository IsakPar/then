import { NextRequest, NextResponse } from 'next/server';
// import { seedSeatMaps } from '@/lib/db/queries';
import { db } from '@/lib/db/connection';
// import { getAllSeatMapTemplates } from '@/lib/seatmaps/generic';
// import { PROFESSIONAL_THEATER } from '@/lib/seatmaps/generic/professional-theater';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Seatmap seeding temporarily disabled due to missing dependencies')
    
    return NextResponse.json({ 
      error: 'Seatmap seeding temporarily disabled - missing generic seatmap files',
      status: 'disabled'
    }, { status: 503 })

    /*
    // TODO: Re-enable once missing files are created
    console.log('🌱 Starting seatmap seeding process...');
    
    // Get all available seat map templates
    const templates = getAllSeatMapTemplates();
    console.log(`📋 Found ${templates.length} seat map templates`);
    
    const results = [];
    
    for (const template of templates) {
      console.log(`🎭 Seeding seat map: ${template.name}`);
      
      try {
        const result = await seedSeatMaps(template);
        results.push({
          name: template.name,
          success: true,
          seatMapId: result.seatMapId,
          sections: result.sectionsCreated,
          seats: result.seatsCreated
        });
        console.log(`✅ Successfully seeded ${template.name}`);
      } catch (error) {
        console.error(`❌ Failed to seed ${template.name}:`, error);
        results.push({
          name: template.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`🎉 Seeding complete: ${successful.length} successful, ${failed.length} failed`);
    
    return NextResponse.json({
      success: true,
      message: `Seeded ${successful.length} seat maps successfully`,
      results,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length
      }
    });
    */
    
  } catch (error) {
    console.error('❌ Error in seatmap seeding:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to seed seat maps',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 