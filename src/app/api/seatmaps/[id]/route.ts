import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/connection';
import { seatMaps } from '@/lib/db/schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seatMapId } = await params;
    
    console.log(`🗺️ Fetching seat map: ${seatMapId}`);

    const result = await db
      .select()
      .from(seatMaps)
      .where(eq(seatMaps.id, seatMapId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Seat map not found' }, { status: 404 });
    }

    const seatMap = result[0];
    
    console.log(`✅ Seat map found: ${seatMap.name}`);

    return NextResponse.json({
      success: true,
      seatMap
    });

  } catch (error) {
    console.error('💥 Seat map API error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch seat map',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seatMapId } = await params;
    const body = await request.json();
    
    console.log(`🗺️ Updating seat map: ${seatMapId}`);

    const updateData: any = {};
    
    if (body.svgViewbox) updateData.svgViewbox = body.svgViewbox;
    if (body.layoutConfig) updateData.layoutConfig = body.layoutConfig;
    if (body.name) updateData.name = body.name;
    if (body.description) updateData.description = body.description;
    if (body.totalCapacity) updateData.totalCapacity = body.totalCapacity;

    const result = await db
      .update(seatMaps)
      .set(updateData)
      .where(eq(seatMaps.id, seatMapId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Seat map not found' }, { status: 404 });
    }

    console.log(`✅ Seat map updated: ${result[0].name}`);

    return NextResponse.json({
      success: true,
      seatMap: result[0]
    });

  } catch (error) {
    console.error('💥 Seat map update error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to update seat map',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 