import { NextRequest, NextResponse } from 'next/server'
import { confirmSeatReservations } from '@/lib/db/queries'
import { db } from '@/lib/db/connection'
import { reservations } from '@/lib/db/schema'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting bulk fix for reserved seats...');

    // Get ALL current reservations
    const allReservations = await db
      .select({
        sessionToken: reservations.sessionToken,
        seatId: reservations.seatId,
        expiresAt: reservations.expiresAt,
      })
      .from(reservations);

    if (allReservations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No reserved seats found to fix',
        processed: 0
      });
    }

    console.log(`🔧 Found ${allReservations.length} reserved seats to fix`);

    // Group by sessionToken to get unique reservations
    const uniqueReservations = allReservations.reduce((acc: any[], curr) => {
      if (!acc.find(item => item.sessionToken === curr.sessionToken)) {
        acc.push(curr);
      }
      return acc;
    }, []);

    console.log(`🔧 Converting ${uniqueReservations.length} reservations to bookings`);

    const results = [];
    let successCount = 0;
    
    for (const reservation of uniqueReservations) {
      try {
        console.log(`🔧 Converting reservation: ${reservation.sessionToken}`);
        
        const confirmResult = await confirmSeatReservations(
          reservation.sessionToken,
          'recovered@lastminutelive.com', // Use a recovery email
          'Recovered Customer',
          'bulk_recovery_' + reservation.sessionToken.slice(0, 8)
        );

        if (confirmResult[0]?.success) {
          successCount++;
          results.push({
            sessionToken: reservation.sessionToken,
            success: true,
            confirmedSeats: (confirmResult[0] as any).confirmed_count || 0
          });
          console.log(`✅ Successfully converted ${reservation.sessionToken}`);
        } else {
          results.push({
            sessionToken: reservation.sessionToken,
            success: false,
            error: confirmResult[0]?.message || 'Unknown error'
          });
          console.log(`❌ Failed to convert ${reservation.sessionToken}: ${confirmResult[0]?.message}`);
        }

      } catch (error) {
        console.error(`🔧 Error converting ${reservation.sessionToken}:`, error);
        results.push({
          sessionToken: reservation.sessionToken,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const totalSeatsRecovered = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.confirmedSeats || 0), 0);
    
    console.log(`🎉 Bulk fix complete: ${successCount}/${uniqueReservations.length} reservations converted, ${totalSeatsRecovered} seats recovered`);

    return NextResponse.json({
      success: true,
      message: `Bulk recovery completed: ${successCount}/${uniqueReservations.length} reservations converted to bookings`,
      totalReservationsProcessed: uniqueReservations.length,
      successfulConversions: successCount,
      totalSeatsRecovered,
      results: results.slice(0, 5) // Only return first 5 for brevity
    });

  } catch (error) {
    console.error('🔧 Bulk reserved seats fix error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 