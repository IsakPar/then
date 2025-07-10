import { NextRequest, NextResponse } from 'next/server';
import { getVenueById, updateVenue, deleteVenue } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log(`🏛️ Fetching venue: ${id}`);
    
    const venue = await getVenueById(id);
    
    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Venue found:', venue);
    
    return NextResponse.json(venue);
  } catch (error) {
    console.error('❌ Error fetching venue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    console.log(`🏛️ Updating venue: ${id}`, body);
    
    const venue = await getVenueById(id);
    
    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }
    
    const updatedVenue = await updateVenue(id, body);
    
    console.log('✅ Venue updated:', updatedVenue);
    
    return NextResponse.json(updatedVenue);
  } catch (error) {
    console.error('❌ Error updating venue:', error);
    
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'A venue with this slug already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update venue' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    console.log(`🏛️ Deleting venue: ${id}`);
    
    const venue = await getVenueById(id);
    
    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }
    
    const deletedVenue = await deleteVenue(id);
    
    console.log('✅ Venue deleted:', deletedVenue);
    
    return NextResponse.json({ message: 'Venue deleted successfully', venue: deletedVenue });
  } catch (error) {
    console.error('❌ Error deleting venue:', error);
    return NextResponse.json(
      { error: 'Failed to delete venue' },
      { status: 500 }
    );
  }
} 