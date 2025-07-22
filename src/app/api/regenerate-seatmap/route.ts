import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/connection'
import { seats, sections, seatMaps } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
// import { PROFESSIONAL_THEATER } from '@/lib/seatmaps/generic/professional-theater'
// import { ProfessionalSeatGenerator } from '@/lib/seatmaps/professional-seat-generator'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Seatmap regeneration temporarily disabled due to missing dependencies')
    
    return NextResponse.json({ 
      error: 'Seatmap regeneration temporarily disabled - missing professional theater layout files',
      status: 'disabled'
    }, { status: 503 })

    /*
    // TODO: Re-enable once missing files are created
    const { seat_map_id } = await request.json()
    
    if (!seat_map_id) {
      return NextResponse.json({ error: 'seat_map_id is required' }, { status: 400 })
    }

    console.log(`🧹 Clearing existing data for seat map: ${seat_map_id}`)
    
    // First get all section IDs for this seat map
    const existingSections = await db.select({ id: sections.id })
      .from(sections)
      .where(eq(sections.seatMapId, seat_map_id))
    
    // Delete seats for each section
    for (const section of existingSections) {
      await db.delete(seats).where(eq(seats.sectionId, section.id))
    }
    
    // Delete all sections for this seat map
    await db.delete(sections).where(eq(sections.seatMapId, seat_map_id))
    
    console.log(`🎭 Generating new professional theater layout`)
    
    // Generate new professional theater layout
    // const layout = PROFESSIONAL_THEATER
    
    // Insert new sections one by one
    const insertedSections = []
    for (let index = 0; index < layout.sections.length; index++) {
      const section = layout.sections[index]
      console.log(`📝 Inserting section: ${section.name} (${section.displayName})`)
      
      try {
        const [insertedSection] = await db.insert(sections).values({
          seatMapId: seat_map_id,
          name: section.displayName, // Use displayName as unique identifier
          displayName: section.displayName,
          colorHex: section.colorHex,
          basePricePence: section.defaultPrice,
          seatPattern: {
            shape: section.shape,
            rows: section.rows || 10,
            cols: section.cols || 15,
            curveConfig: section.curveConfig,
            boundaries: section.boundaries
          },
          positionConfig: {
            offset: { x: 0, y: 0 },
            seatSpacing: 22,
            rowSpacing: 20
          },
          isAccessible: false,
          sortOrder: index
        }).returning()
        
        insertedSections.push(insertedSection)
        console.log(`✅ Inserted section: ${insertedSection.name}`)
      } catch (error) {
        console.error(`❌ Failed to insert section ${section.name}:`, error)
        throw error
      }
    }
    
    console.log(`✅ Created ${insertedSections.length} sections`)
    
    // Generate seats for each section using the professional generator
    const generator = new ProfessionalSeatGenerator()
    const fullSeatMap = generator.generateSeatMap(layout, seat_map_id)
    
    let totalSeats = 0
    for (const section of insertedSections) {
      const generatedSection = fullSeatMap.sections.find(s => s.display_name === section.name)
      if (generatedSection) {
        const sectionSeats = fullSeatMap.seats
          .filter(seat => seat.section_id === generatedSection.id)
          .map(seat => ({
            showId: '81447867-94ac-47b1-96cf-d70d3d5ad02e', // Hamilton show ID
            sectionId: section.id, // Use the actual DB section ID
            rowLetter: seat.row_letter,
            seatNumber: seat.seat_number,
            pricePence: seat.price_pence,
            status: seat.status as 'available' | 'booked' | 'reserved',
            position: seat.position,
            isAccessible: seat.is_accessible,
            notes: null
          }))
        
        if (sectionSeats.length > 0) {
          await db.insert(seats).values(sectionSeats)
          totalSeats += sectionSeats.length
          console.log(`✅ Generated ${sectionSeats.length} seats for ${section.name}`)
        }
      }
    }
    
    // Update seat map with new layout config
    await db.update(seatMaps)
      .set({
        layoutConfig: layout,
        totalCapacity: totalSeats,
        svgViewbox: "0 0 1600 1000"
      })
      .where(eq(seatMaps.id, seat_map_id))
    
    console.log(`🎉 Successfully regenerated seat map with ${totalSeats} seats`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully regenerated seat map with ${totalSeats} seats`,
      sections: insertedSections.length,
      totalSeats
    })
    */
    
  } catch (error) {
    console.error('❌ Error regenerating seat map:', error)
    return NextResponse.json({
      error: 'Failed to regenerate seat map',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 