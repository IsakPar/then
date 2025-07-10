import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/connection';
import { shows, seatMaps } from '@/lib/db/schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: showId } = await params;
    
    console.log(`🗺️  Fetching seatmap for show: ${showId}`);

    // Get show with seatmap data
    const result = await db
      .select({
        showId: shows.id,
        showTitle: shows.title,
        seatMapId: shows.seatMapId,
        seatMapData: {
          id: seatMaps.id,
          name: seatMaps.name,
          layoutConfig: seatMaps.layoutConfig,
          totalCapacity: seatMaps.totalCapacity,
          svgViewbox: seatMaps.svgViewbox,
        }
      })
      .from(shows)
      .innerJoin(seatMaps, eq(shows.seatMapId, seatMaps.id))
      .where(eq(shows.id, showId))
      .limit(1);

    if (result.length === 0) {
      console.log(`❌ Show/seatmap not found: ${showId}`);
      return NextResponse.json({ error: 'Show or seatmap not found' }, { status: 404 });
    }

    const seatMapResult = result[0];
    
    console.log(`✅ Seatmap found: ${seatMapResult.seatMapData.name}`);

    return NextResponse.json({
      success: true,
      seatMap: {
        id: seatMapResult.seatMapData.id,
        name: seatMapResult.seatMapData.name,
        totalCapacity: seatMapResult.seatMapData.totalCapacity,
        svgViewbox: seatMapResult.seatMapData.svgViewbox,
        layoutConfig: seatMapResult.seatMapData.layoutConfig,
        generatedSVG: null // This would contain SVG data if generated
      }
    });

  } catch (error) {
    console.error('💥 Seatmap API error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch seatmap',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 