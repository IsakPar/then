import { NextRequest, NextResponse } from 'next/server';
import { validateVenueTicket, getVenueById } from '@/lib/db/queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { validationCode } = body;
    
    console.log(`🎫 Validating ticket for venue: ${id}, code: ${validationCode}`);
    
    if (!validationCode || typeof validationCode !== 'string') {
      return NextResponse.json(
        { error: 'Validation code is required' },
        { status: 400 }
      );
    }
    
    // Check if venue exists
    const venue = await getVenueById(id);
    
    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }
    
    const ticket = await validateVenueTicket(id, validationCode.trim().toUpperCase());
    
    if (!ticket) {
      console.log(`❌ Invalid ticket code: ${validationCode} for venue: ${venue.name}`);
      return NextResponse.json(
        { error: 'Invalid verification code or ticket not found' },
        { status: 404 }
      );
    }
    
    console.log(`✅ Ticket validated successfully for venue: ${venue.name}`, {
      customer: ticket.booking.customerName,
      show: ticket.show.title,
      seats: ticket.seats
    });
    
    return NextResponse.json(ticket);
  } catch (error) {
    console.error('❌ Error validating venue ticket:', error);
    return NextResponse.json(
      { error: 'Failed to validate ticket' },
      { status: 500 }
    );
  }
} 