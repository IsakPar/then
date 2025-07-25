import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 Creating Phantom of the Opera seat map manually...')
    
    // Check MongoDB connection
    if (!process.env.MONGODB_URI && !process.env.MONGODB_URL && !process.env.MONGO_URL) {
      return NextResponse.json({ 
        success: false, 
        error: 'MongoDB not configured' 
      }, { status: 503 })
    }

    const { connectToMongoDB } = await import('@/lib/mongodb/connection')
    const { db } = await connectToMongoDB()
    
    console.log('✅ MongoDB connection established')
    
    // Get or create seatmaps collection
    const collection = db.collection('seatmaps')
    
    // Create indexes for performance
    try {
      await collection.createIndex({ venueId: 1 })
      await collection.createIndex({ 'shows.sections.seats.hardcodedId': 1 })
      console.log('✅ Indexes created')
    } catch (error) {
      console.log('📝 Indexes already exist or creation failed:', error)
    }
    
    // Define venue and show
    const venueId = 'her-majestys-theatre'
    const showSlug = 'phantom-of-the-opera'
    
    console.log(`🎪 Creating seat map for ${venueId}/${showSlug}`)
    
    // Helper function to generate seats for a section
    const generateSeats = (sectionId: string, rows: number, seatsPerRow: number, startX: number, startY: number, seatSpacing: number = 32, rowSpacing: number = 42) => {
      const seats = []
      for (let row = 0; row < rows; row++) {
        const rowLetter = String.fromCharCode(65 + row) // A, B, C, etc.
        
        for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
          // Enhanced accessibility logic
          const isAccessible = (
            (row === 0 && [1, 2, seatsPerRow - 1, seatsPerRow].includes(seatNum)) ||
            (row === rows - 1 && [1, 2, seatsPerRow - 1, seatsPerRow].includes(seatNum))
          )

          seats.push({
            id: `${sectionId}_${rowLetter}_${seatNum}`,
            hardcodedId: `${sectionId}-${rowLetter}-${seatNum}`, // iOS format
            row: rowLetter,
            number: seatNum,
            x: startX + (seatNum - 1) * seatSpacing,
            y: startY + row * rowSpacing,
            isAccessible,
            seatType: sectionId.includes('premium') ? 'premium' : 
                     sectionId.includes('box') ? 'box' : 
                     sectionId.includes('grand') ? 'grand' : 'standard',
            metadata: {
              level: sectionId.includes('Orchestra') ? 0 : 
                     sectionId.includes('Circle') ? 1 :
                     sectionId.includes('Upper') ? 2 : 3,
              viewQuality: sectionId.includes('premium') ? 'excellent' :
                          sectionId.includes('standard') ? 'good' :
                          sectionId.includes('rear') ? 'fair' : 'very-good'
            }
          })
        }
      }
      return seats
    }
    
    // Complete Phantom of the Opera seat map data
    const phantomSeatMap = {
      _id: venueId,
      venueId,
      venueName: "Her Majesty's Theatre",
      address: "Haymarket, St. James's, London SW1Y 4QL",
      shows: {
        [showSlug]: {
          sections: {
            // ORCHESTRA LEVEL (Level 0)
            premiumOrchestra: {
              id: 'premiumOrchestra',
              name: 'Premium Orchestra',
              color: '#8B0000', // Deep red for premium
              seats: generateSeats('premiumOrchestra', 8, 24, 200, 400, 35, 45),
              layout: {
                rows: 8,
                seatsPerRow: 24,
                startX: 200,
                startY: 400,
                seatSpacing: 35,
                rowSpacing: 45
              }
            },
            standardOrchestra: {
              id: 'standardOrchestra',
              name: 'Standard Orchestra', 
              color: '#CD5C5C', // Indian red
              seats: generateSeats('standardOrchestra', 12, 28, 150, 760, 32, 42),
              layout: {
                rows: 12,
                seatsPerRow: 28,
                startX: 150,
                startY: 760,
                seatSpacing: 32,
                rowSpacing: 42
              }
            },
            sideBoxLeft: {
              id: 'sideBoxLeft',
              name: 'Side Box Left',
              color: '#4B0082', // Indigo for boxes
              seats: generateSeats('sideBoxLeft', 4, 8, 50, 500, 40, 50),
              layout: {
                rows: 4,
                seatsPerRow: 8,
                startX: 50,
                startY: 500,
                seatSpacing: 40,
                rowSpacing: 50
              }
            },
            sideBoxRight: {
              id: 'sideBoxRight',
              name: 'Side Box Right',
              color: '#4B0082',
              seats: generateSeats('sideBoxRight', 4, 8, 1100, 500, 40, 50),
              layout: {
                rows: 4,
                seatsPerRow: 8,
                startX: 1100,
                startY: 500,
                seatSpacing: 40,
                rowSpacing: 50
              }
            },

            // DRESS CIRCLE LEVEL (Level 1)
            premiumCircle: {
              id: 'premiumCircle',
              name: 'Premium Dress Circle',
              color: '#B8860B', // Dark goldenrod
              seats: generateSeats('premiumCircle', 6, 26, 180, 300, 34, 44),
              layout: {
                rows: 6,
                seatsPerRow: 26,
                startX: 180,
                startY: 300,
                seatSpacing: 34,
                rowSpacing: 44
              }
            },
            standardCircle: {
              id: 'standardCircle',
              name: 'Standard Dress Circle',
              color: '#DAA520', // Goldenrod
              seats: generateSeats('standardCircle', 8, 30, 160, 564, 32, 42),
              layout: {
                rows: 8,
                seatsPerRow: 30,
                startX: 160,
                startY: 564,
                seatSpacing: 32,
                rowSpacing: 42
              }
            },
            circleBoxLeft: {
              id: 'circleBoxLeft',
              name: 'Circle Box Left',
              color: '#9932CC', // Dark orchid
              seats: generateSeats('circleBoxLeft', 3, 6, 70, 350, 38, 48),
              layout: {
                rows: 3,
                seatsPerRow: 6,
                startX: 70,
                startY: 350,
                seatSpacing: 38,
                rowSpacing: 48
              }
            },
            circleBoxRight: {
              id: 'circleBoxRight',
              name: 'Circle Box Right',
              color: '#9932CC',
              seats: generateSeats('circleBoxRight', 3, 6, 1080, 350, 38, 48),
              layout: {
                rows: 3,
                seatsPerRow: 6,
                startX: 1080,
                startY: 350,
                seatSpacing: 38,
                rowSpacing: 48
              }
            },
            grandBoxes: {
              id: 'grandBoxes',
              name: 'Grand Boxes',
              color: '#800080', // Purple for grand boxes
              seats: generateSeats('grandBoxes', 2, 12, 400, 200, 45, 55),
              layout: {
                rows: 2,
                seatsPerRow: 12,
                startX: 400,
                startY: 200,
                seatSpacing: 45,
                rowSpacing: 55
              }
            },

            // UPPER CIRCLE LEVEL (Level 2)
            frontUpper: {
              id: 'frontUpper',
              name: 'Front Upper Circle',
              color: '#2E8B57', // Sea green
              seats: generateSeats('frontUpper', 5, 32, 140, 250, 30, 40),
              layout: {
                rows: 5,
                seatsPerRow: 32,
                startX: 140,
                startY: 250,
                seatSpacing: 30,
                rowSpacing: 40
              }
            },
            rearUpper: {
              id: 'rearUpper',
              name: 'Rear Upper Circle',
              color: '#228B22', // Forest green
              seats: generateSeats('rearUpper', 8, 34, 130, 450, 29, 38),
              layout: {
                rows: 8,
                seatsPerRow: 34,
                startX: 130,
                startY: 450,
                seatSpacing: 29,
                rowSpacing: 38
              }
            },
            upperBoxLeft: {
              id: 'upperBoxLeft',
              name: 'Upper Box Left',
              color: '#6A5ACD', // Slate blue
              seats: generateSeats('upperBoxLeft', 3, 8, 60, 300, 36, 46),
              layout: {
                rows: 3,
                seatsPerRow: 8,
                startX: 60,
                startY: 300,
                seatSpacing: 36,
                rowSpacing: 46
              }
            },
            upperBoxRight: {
              id: 'upperBoxRight',
              name: 'Upper Box Right',
              color: '#6A5ACD',
              seats: generateSeats('upperBoxRight', 3, 8, 1090, 300, 36, 46),
              layout: {
                rows: 3,
                seatsPerRow: 8,
                startX: 1090,
                startY: 300,
                seatSpacing: 36,
                rowSpacing: 46
              }
            },

            // BALCONY LEVEL (Level 3)
            grandCircle: {
              id: 'grandCircle',
              name: 'Grand Circle',
              color: '#DC143C', // Crimson for top level
              seats: generateSeats('grandCircle', 4, 30, 150, 200, 33, 43),
              layout: {
                rows: 4,
                seatsPerRow: 30,
                startX: 150,
                startY: 200,
                seatSpacing: 33,
                rowSpacing: 43
              }
            }
          },
          layout: {
            width: 1200,
            height: 800,
            scale: 1.0,
            levels: 4,
            centerX: 600,
            centerY: 400,
            stageArea: {
              x: 350,
              y: 50,
              width: 500,
              height: 100
            }
          },
          metadata: {
            totalSeats: 0, // Will be calculated
            accessibleSeats: 0, // Will be calculated
            levels: ['Orchestra', 'Dress Circle', 'Upper Circle', 'Balcony'],
            openingYear: 1897,
            architect: 'Charles J. Phipps',
            notes: 'Historic theatre, home of Phantom of the Opera since 1986'
          }
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Calculate totals
    let totalSeats = 0
    let accessibleSeats = 0
    
    Object.values(phantomSeatMap.shows[showSlug].sections).forEach(section => {
      totalSeats += section.seats.length
      accessibleSeats += section.seats.filter(seat => seat.isAccessible).length
    })
    
    phantomSeatMap.shows[showSlug].metadata.totalSeats = totalSeats
    phantomSeatMap.shows[showSlug].metadata.accessibleSeats = accessibleSeats
    
    console.log(`🎭 Generated ${totalSeats} seats (${accessibleSeats} accessible) across ${Object.keys(phantomSeatMap.shows[showSlug].sections).length} sections`)
    
    // Insert the seat map
    const result = await collection.replaceOne(
      { _id: venueId } as any,
      phantomSeatMap,
      { upsert: true }
    )
    
    console.log('✅ Phantom seat map inserted:', result)
    
    // Verify insertion
    const inserted = await collection.findOne({ _id: venueId } as any)
    const verified = !!inserted
    
    console.log(`✅ Verification: ${verified ? 'SUCCESS' : 'FAILED'}`)
    
    return NextResponse.json({
      success: true,
      message: 'Phantom of the Opera seat map created successfully!',
      details: {
        venue: venueId,
        show: showSlug,
        sections: Object.keys(phantomSeatMap.shows[showSlug].sections).length,
        totalSeats,
        accessibleSeats,
        levels: 4,
        result: {
          matched: result.matchedCount,
          modified: result.modifiedCount,
          upserted: result.upsertedCount,
          verified
        }
      },
      sampleHardcodedIds: [
        'premiumOrchestra-A-1',
        'standardOrchestra-B-15', 
        'grandBoxes-A-6',
        'frontUpper-C-20',
        'grandCircle-D-25'
      ]
    })
    
  } catch (error) {
    console.error('❌ Phantom seat map creation failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create Phantom seat map',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 