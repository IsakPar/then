import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🏛️ Admin: Creating new venue...')
    
    const { 
      name, 
      address, 
      description, 
      capacity, 
      city, 
      country 
    } = await request.json()
    
    // Validate required fields
    if (!name || !address) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, address'
      }, { status: 400 })
    }
    
    // Import database dependencies
    const { db } = await import('@/lib/db/connection')
    const { venues } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    
    // Generate slug from name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    
    console.log(`📍 Creating venue: ${name} (slug: ${slug})`)
    
    // Check if venue already exists (by name or slug)
    const existingVenue = await db.select()
      .from(venues)
      .where(eq(venues.name, name))
      .limit(1)
    
    if (existingVenue.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Venue "${name}" already exists`,
        existingVenue: existingVenue[0]
      }, { status: 409 })
    }
    
    // Check slug uniqueness
    const existingSlug = await db.select()
      .from(venues)
      .where(eq(venues.slug, slug))
      .limit(1)
    
    if (existingSlug.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Venue slug "${slug}" already exists. Please use a different name.`,
        suggestion: `Try: "${name} Theatre" or "${name} ${city}"`
      }, { status: 409 })
    }
    
    // Create the venue
    const newVenue = await db.insert(venues).values({
      name,
      slug,
      address: `${address}${city ? `, ${city}` : ''}${country ? `, ${country}` : ''}`,
      description: description || `${name} - Premier theatre venue${city ? ` in ${city}` : ''}`
    }).returning({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      address: venues.address
    })
    
    const createdVenue = newVenue[0]
    console.log(`✅ Created venue: ${createdVenue.name} (ID: ${createdVenue.id})`)
    
    return NextResponse.json({
      success: true,
      message: `🏛️ Venue "${name}" created successfully!`,
      venue: createdVenue,
      details: {
        venueId: createdVenue.id,
        slug: createdVenue.slug,
        capacity: capacity ? parseInt(capacity) : 'TBD',
        location: {
          city: city || 'Not specified',
          country: country || 'Not specified'
        },
        next_steps: [
          'Venue is now available for show creation',
          'Add venue-specific seat maps if needed',
          'Configure venue settings and contact info',
          'Upload venue images and floor plans'
        ]
      },
      integration: {
        database: 'completed',
        slug_generation: 'automatic',
        show_ready: true
      }
    })
    
  } catch (error) {
    console.error('❌ Admin venue creation failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create venue',
      details: error instanceof Error ? error.message : 'Unknown error',
      help: {
        commonIssues: [
          'Name already exists - use a unique venue name',
          'Invalid characters in name (use letters, numbers, spaces)',
          'Missing required fields (name, address)',
          'Database connection issue'
        ],
        examples: {
          name: 'Royal Opera House',
          address: 'Bow Street, Covent Garden',
          city: 'London',
          country: 'United Kingdom',
          capacity: '2256'
        }
      }
    }, { status: 500 })
  }
} 