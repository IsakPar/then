import { NextRequest, NextResponse } from 'next/server';
// import { PROFESSIONAL_THEATER } from '@/lib/seatmaps/generic/professional-theater';
// import { ProfessionalSeatGenerator } from '@/lib/seatmaps/professional-seat-generator';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🔄 Professional theater test temporarily disabled due to missing dependencies')
    
    return NextResponse.json({ 
      error: 'Professional theater test temporarily disabled - missing professional theater layout files',
      status: 'disabled'
    }, { status: 503 })

    /*
    // TODO: Re-enable once missing files are created
    console.log('🎭 Testing professional theater layout configuration');
    
    const config = PROFESSIONAL_THEATER;
    
    // Validate configuration structure
    const validation = {
      hasName: !!config.name,
      hasDescription: !!config.description,
      hasSections: Array.isArray(config.sections) && config.sections.length > 0,
      hasValidCapacity: config.totalCapacity > 0,
      hasValidViewbox: !!config.svgViewbox,
      sectionsValid: config.sections.every(section => 
        section.id && 
        section.name && 
        section.shape &&
        section.capacity > 0
      )
    };
    
    const isValid = Object.values(validation).every(v => v === true);
    
    console.log(`✅ Configuration validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    return NextResponse.json({
      success: isValid,
      configuration: {
        name: config.name,
        description: config.description,
        totalCapacity: config.totalCapacity,
        svgViewbox: config.svgViewbox,
        sectionsCount: config.sections.length,
        sections: config.sections.map(s => ({
          id: s.id,
          name: s.name,
          displayName: s.displayName,
          shape: s.shape,
          capacity: s.capacity,
          defaultPrice: s.defaultPrice,
          colorHex: s.colorHex
        }))
      },
      validation,
      message: isValid ? 'Professional theater configuration is valid' : 'Configuration has validation errors'
    });
    */
    
  } catch (error) {
    console.error('❌ Error testing professional theater:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test professional theater configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 