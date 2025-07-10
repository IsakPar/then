import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/connection';
import { sections } from '@/lib/db/schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seatMapId } = await params;
    
    console.log(`🗺️ Fetching sections for seat map: ${seatMapId}`);

    // Get all sections for this seat map
    const result = await db
      .select({
        id: sections.id,
        name: sections.name,
        displayName: sections.displayName,
        colorHex: sections.colorHex,
        basePricePence: sections.basePricePence,
        seatPattern: sections.seatPattern,
        positionConfig: sections.positionConfig,
        isAccessible: sections.isAccessible,
        sortOrder: sections.sortOrder,
      })
      .from(sections)
      .where(eq(sections.seatMapId, seatMapId))
      .orderBy(sections.sortOrder);

    console.log(`✅ Found ${result.length} sections for seat map: ${seatMapId}`);

    return NextResponse.json({
      success: true,
      sections: result.map(section => ({
        ...section,
        basePriceFormatted: (section.basePricePence / 100).toFixed(2)
      }))
    });

  } catch (error) {
    console.error('💥 Seat map sections API error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch seat map sections',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 