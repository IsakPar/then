import { NextRequest, NextResponse } from 'next/server';
import { seatLockingService } from '@/lib/services/SeatLockingService';
import { validateUUID } from '@/lib/db/queries';

interface ReleaseSeatRequest {
  showId: string;
  seatIds: string[];
  userId: string;
}

interface ReleaseSeatResponse {
  success: boolean;
  message: string;
  releasedSeats?: any[];
  failedSeats?: any[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ReleaseSeatRequest = await request.json();
    const { showId, seatIds, userId } = body;

    // Validate input
    if (!showId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0 || !userId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields: showId, seatIds (array), userId' 
        },
        { status: 400 }
      );
    }

    // Validate UUIDs
    try {
      validateUUID(showId);
      validateUUID(userId);
      seatIds.forEach(validateUUID);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid UUID format in request' 
        },
        { status: 400 }
      );
    }

    console.log(`🔓 Releasing seats for show ${showId}, user ${userId}:`, seatIds);

    // Attempt to release each seat
    const releasedSeats: any[] = [];
    const failedSeats: any[] = [];

    for (const seatId of seatIds) {
      const result = await seatLockingService.releaseSeat(showId, seatId, userId);

      if (result.success) {
        releasedSeats.push({
          seatId,
          message: result.message
        });
        console.log(`✅ Seat ${seatId} released successfully`);
      } else {
        failedSeats.push({
          seatId,
          reason: result.message
        });
        console.log(`❌ Failed to release seat ${seatId}: ${result.message}`);
      }
    }

    const response: ReleaseSeatResponse = {
      success: releasedSeats.length > 0,
      message: releasedSeats.length === seatIds.length 
        ? `Successfully released all ${releasedSeats.length} seats`
        : `Released ${releasedSeats.length} of ${seatIds.length} seats`,
      releasedSeats,
      failedSeats: failedSeats.length > 0 ? failedSeats : undefined
    };

    console.log(`🎉 Released ${releasedSeats.length}/${seatIds.length} seats for user ${userId}`);
    
    return NextResponse.json(response, { 
      status: releasedSeats.length === seatIds.length ? 200 : 207 // 207 = Multi-Status
    });

  } catch (error) {
    console.error('❌ Error in seat release API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error while releasing seats',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to release all seats for a user
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const showId = searchParams.get('showId');

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required parameter: userId' 
        },
        { status: 400 }
      );
    }

    validateUUID(userId);
    if (showId) validateUUID(showId);

    console.log(`🔓 Releasing all seats for user ${userId}${showId ? ` in show ${showId}` : ''}`);

    // Get all seats held by user
    const userHeldSeats = await seatLockingService.getUserHeldSeats(userId);
    
    // Filter by showId if provided
    const seatsToRelease = showId 
      ? userHeldSeats.filter(seat => seat.showId === showId)
      : userHeldSeats;

    if (seatsToRelease.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No seats to release',
        releasedSeats: []
      });
    }

    // Release each seat
    const releasedSeats: any[] = [];
    const failedSeats: any[] = [];

    for (const seat of seatsToRelease) {
      const result = await seatLockingService.releaseSeat(seat.showId, seat.seatId, userId);

      if (result.success) {
        releasedSeats.push({
          seatId: seat.seatId,
          showId: seat.showId,
          message: result.message
        });
      } else {
        failedSeats.push({
          seatId: seat.seatId,
          showId: seat.showId,
          reason: result.message
        });
      }
    }

    const response = {
      success: releasedSeats.length > 0,
      message: `Released ${releasedSeats.length}/${seatsToRelease.length} seats`,
      releasedSeats,
      failedSeats: failedSeats.length > 0 ? failedSeats : undefined
    };

    console.log(`🎉 Bulk released ${releasedSeats.length}/${seatsToRelease.length} seats for user ${userId}`);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in bulk seat release API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error while releasing all seats',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 