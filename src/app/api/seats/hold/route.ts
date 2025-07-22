import { NextRequest, NextResponse } from 'next/server';
import { seatLockingService } from '@/lib/services/SeatLockingService';
import { businessRulesEngine } from '@/lib/services/BusinessRulesEngine';
import { validateUUID } from '@/lib/db/queries';

interface HoldSeatRequest {
  showId: string;
  seatIds: string[];
  userId: string;
  sessionId?: string;
}

interface HoldSeatResponse {
  success: boolean;
  message: string;
  heldSeats?: any[];
  failedSeats?: any[];
  validationResult?: any;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: HoldSeatRequest = await request.json();
    const { showId, seatIds, userId, sessionId } = body;

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

    console.log(`🎫 Holding seats for show ${showId}, user ${userId}:`, seatIds);

    // Step 1: Validate seat selection against business rules
    const validationResult = await businessRulesEngine.validateSeatSelection(
      showId,
      seatIds,
      userId,
      sessionId
    );

    if (!validationResult.valid) {
      console.log(`❌ Business rules validation failed: ${validationResult.message}`);
      return NextResponse.json({
        success: false,
        message: validationResult.message,
        validationResult,
        suggestedAlternatives: validationResult.suggestedAlternatives
      }, { status: 422 }); // Unprocessable Entity
    }

    // Step 2: Attempt to hold each seat
    const heldSeats: any[] = [];
    const failedSeats: any[] = [];

    for (const seatId of seatIds) {
      const result = await seatLockingService.holdSeat(
        showId,
        seatId,
        userId,
        sessionId || `session-${Date.now()}`
      );

      if (result.success) {
        heldSeats.push({
          seatId,
          lock: result.lock,
          message: result.message
        });
        console.log(`✅ Seat ${seatId} held successfully`);
      } else {
        failedSeats.push({
          seatId,
          reason: result.message,
          conflictUserId: result.conflictUserId
        });
        console.log(`❌ Failed to hold seat ${seatId}: ${result.message}`);
      }
    }

    // Step 3: If any seats failed, release the successfully held ones
    if (failedSeats.length > 0) {
      console.log(`⏪ Releasing ${heldSeats.length} successfully held seats due to conflicts`);
      
      for (const heldSeat of heldSeats) {
        await seatLockingService.releaseSeat(showId, heldSeat.seatId, userId);
      }

      return NextResponse.json({
        success: false,
        message: `Failed to hold ${failedSeats.length} of ${seatIds.length} seats`,
        failedSeats,
        allOrNothing: true
      }, { status: 409 }); // Conflict
    }

    // Step 4: All seats held successfully
    const response: HoldSeatResponse = {
      success: true,
      message: `Successfully held ${heldSeats.length} seats`,
      heldSeats,
      validationResult
    };

    console.log(`🎉 All ${heldSeats.length} seats held successfully for user ${userId}`);
    
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Error in seat hold API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error while holding seats',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check current seat locks for a user
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const showId = searchParams.get('showId');
    const seatId = searchParams.get('seatId');

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

    if (showId && seatId) {
      // Get specific seat lock status
      validateUUID(showId);
      validateUUID(seatId);
      
      const lockStatus = await seatLockingService.getSeatLockStatus(showId, seatId);
      
      return NextResponse.json({
        success: true,
        lockStatus,
        isHeld: !!lockStatus,
        isHeldByUser: lockStatus?.userId === userId
      });
    } else {
      // Get all seats held by user
      const userHeldSeats = await seatLockingService.getUserHeldSeats(userId);
      
      return NextResponse.json({
        success: true,
        heldSeats: userHeldSeats,
        count: userHeldSeats.length
      });
    }

  } catch (error) {
    console.error('❌ Error in seat hold GET API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error while checking seat holds',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 