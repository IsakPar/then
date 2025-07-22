import { getShowSeats } from '../db/queries';

interface SeatData {
  id: string;
  row_letter: string;
  seat_number: number;
  status: string;
  section_name: string;
  section_id: string;
  position: any; // Database returns JSONB, can be parsed
  is_accessible?: boolean;
  price_pence: number;
}

interface ValidationContext {
  showId: string;
  requestedSeats: string[];
  userId: string;
  allSeats: SeatData[];
  selectedSeats: SeatData[];
  sessionId?: string;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  suggestedAlternatives?: SeatData[];
  warnings?: string[];
}

interface SeatSuggestion {
  seats: SeatData[];
  reason: string;
  score: number; // Higher is better
}

abstract class ValidationRule {
  abstract name: string;
  abstract priority: number; // Lower numbers = higher priority
  abstract validate(context: ValidationContext): Promise<ValidationResult>;
}

/**
 * Prevents orphan seats - single seats left isolated between booked seats
 */
class OrphanSeatRule extends ValidationRule {
  name = 'OrphanSeatPrevention';
  priority = 1;

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const orphanSeats: SeatData[] = [];
    const warnings: string[] = [];

    for (const seatId of context.requestedSeats) {
      const seat = context.selectedSeats.find(s => s.id === seatId);
      if (!seat) continue;

      const wouldCreateOrphan = await this.wouldCreateOrphanSeat(seat, context);
      if (wouldCreateOrphan.hasOrphan) {
        orphanSeats.push(seat);
        if (wouldCreateOrphan.orphanSeat) {
          warnings.push(
            `Selecting ${seat.row_letter}${seat.seat_number} would isolate seat ${wouldCreateOrphan.orphanSeat.row_letter}${wouldCreateOrphan.orphanSeat.seat_number}`
          );
        }
      }
    }

    if (orphanSeats.length > 0) {
      const alternatives = await this.findAlternativeSeats(context, orphanSeats.length);
      
      return {
        valid: false,
        message: `Selection would create ${orphanSeats.length} orphan seat(s). Please select contiguous seats or include the isolated seats.`,
        suggestedAlternatives: alternatives,
        warnings
      };
    }

    return { valid: true };
  }

  private async wouldCreateOrphanSeat(
    seat: SeatData, 
    context: ValidationContext
  ): Promise<{ hasOrphan: boolean; orphanSeat?: SeatData }> {
    const sameRowSeats = context.allSeats
      .filter(s => s.row_letter === seat.row_letter && s.section_id === seat.section_id)
      .sort((a, b) => a.seat_number - b.seat_number);

    const seatIndex = sameRowSeats.findIndex(s => s.id === seat.id);
    if (seatIndex === -1) return { hasOrphan: false };

    // Check left neighbor
    if (seatIndex > 0) {
      const leftSeat = sameRowSeats[seatIndex - 1];
      if (this.wouldBecomeOrphan(leftSeat, sameRowSeats, context.requestedSeats, seatIndex - 1)) {
        return { hasOrphan: true, orphanSeat: leftSeat };
      }
    }

    // Check right neighbor
    if (seatIndex < sameRowSeats.length - 1) {
      const rightSeat = sameRowSeats[seatIndex + 1];
      if (this.wouldBecomeOrphan(rightSeat, sameRowSeats, context.requestedSeats, seatIndex + 1)) {
        return { hasOrphan: true, orphanSeat: rightSeat };
      }
    }

    return { hasOrphan: false };
  }

  private wouldBecomeOrphan(
    seat: SeatData, 
    rowSeats: SeatData[], 
    requestedSeats: string[], 
    seatIndex: number
  ): boolean {
    // Skip if seat is not available
    if (seat.status !== 'available' || requestedSeats.includes(seat.id)) {
      return false;
    }

    // Check if seat would be isolated
    const leftOccupied = seatIndex === 0 || 
      rowSeats[seatIndex - 1].status !== 'available' || 
      requestedSeats.includes(rowSeats[seatIndex - 1].id);

    const rightOccupied = seatIndex === rowSeats.length - 1 || 
      rowSeats[seatIndex + 1].status !== 'available' || 
      requestedSeats.includes(rowSeats[seatIndex + 1].id);

    return leftOccupied && rightOccupied;
  }

  private async findAlternativeSeats(context: ValidationContext, count: number): Promise<SeatData[]> {
    const suggestions = await this.generateSeatSuggestions(context, count);
    return suggestions.slice(0, 3).flatMap(s => s.seats); // Return top 3 suggestions
  }

  private async generateSeatSuggestions(context: ValidationContext, count: number): Promise<SeatSuggestion[]> {
    const availableSeats = context.allSeats.filter(seat => seat.status === 'available');
    const suggestions: SeatSuggestion[] = [];

    // Group by row and section
    const seatsByRow = new Map<string, SeatData[]>();
    availableSeats.forEach(seat => {
      const key = `${seat.section_id}:${seat.row_letter}`;
      if (!seatsByRow.has(key)) {
        seatsByRow.set(key, []);
      }
      seatsByRow.get(key)!.push(seat);
    });

    // Find contiguous blocks
    for (const [rowKey, rowSeats] of seatsByRow) {
      const sortedSeats = rowSeats.sort((a, b) => a.seat_number - b.seat_number);
      const contiguousBlocks = this.findContiguousBlocks(sortedSeats, count);
      
      contiguousBlocks.forEach(block => {
        suggestions.push({
          seats: block,
          reason: `Contiguous seats in ${block[0].section_name} Row ${block[0].row_letter}`,
          score: this.calculateSuggestionScore(block, context)
        });
      });
    }

    return suggestions.sort((a, b) => b.score - a.score);
  }

  private findContiguousBlocks(seats: SeatData[], minCount: number): SeatData[][] {
    const blocks: SeatData[][] = [];
    
    for (let i = 0; i <= seats.length - minCount; i++) {
      const block: SeatData[] = [seats[i]];
      
      for (let j = i + 1; j < seats.length; j++) {
        if (seats[j].seat_number === seats[j - 1].seat_number + 1) {
          block.push(seats[j]);
        } else {
          break;
        }
      }
      
      if (block.length >= minCount) {
        blocks.push(block.slice(0, minCount)); // Take exactly what's needed
      }
    }
    
    return blocks;
  }

  private calculateSuggestionScore(seats: SeatData[], context: ValidationContext): number {
    // Score based on:
    // 1. Price (lower is better)
    // 2. Section preference
    // 3. Row preference (closer to front/middle)
    
    const avgPrice = seats.reduce((sum, seat) => sum + seat.price_pence, 0) / seats.length;
    const priceScore = Math.max(0, 10000 - avgPrice); // Prefer cheaper seats
    
    // Prefer center seats
    const avgSeatNumber = seats.reduce((sum, seat) => sum + seat.seat_number, 0) / seats.length;
    const centerScore = Math.max(0, 100 - Math.abs(avgSeatNumber - 15)); // Assume row center is around seat 15
    
    return priceScore + centerScore;
  }
}

/**
 * Ensures seats are contiguous when multiple seats are selected
 */
class ContiguousSeatsRule extends ValidationRule {
  name = 'ContiguousSeats';
  priority = 2;

  async validate(context: ValidationContext): Promise<ValidationResult> {
    if (context.selectedSeats.length <= 1) {
      return { valid: true };
    }

    // Group seats by section and row
    const seatsByRow = new Map<string, SeatData[]>();
    
    context.selectedSeats.forEach(seat => {
      const key = `${seat.section_id}:${seat.row_letter}`;
      if (!seatsByRow.has(key)) {
        seatsByRow.set(key, []);
      }
      seatsByRow.get(key)!.push(seat);
    });

    // Check if seats span multiple rows
    if (seatsByRow.size > 1) {
      return {
        valid: false,
        message: 'Please select seats in the same row for the best theater experience',
        warnings: ['Seats are in different rows or sections']
      };
    }

    // Check contiguity within the row
    const [rowSeats] = Array.from(seatsByRow.values());
    const sortedSeats = rowSeats.sort((a, b) => a.seat_number - b.seat_number);
    
    for (let i = 1; i < sortedSeats.length; i++) {
      if (sortedSeats[i].seat_number !== sortedSeats[i - 1].seat_number + 1) {
        return {
          valid: false,
          message: 'Please select contiguous seats for the best theater experience',
          warnings: [`Gap between seat ${sortedSeats[i - 1].seat_number} and ${sortedSeats[i].seat_number}`]
        };
      }
    }

    return { valid: true };
  }
}

/**
 * Limits maximum seats per user/transaction
 */
class MaxSeatsPerUserRule extends ValidationRule {
  name = 'MaxSeatsPerUser';
  priority = 3;
  
  constructor(private maxSeats: number = 8) {
    super();
  }

  async validate(context: ValidationContext): Promise<ValidationResult> {
    if (context.selectedSeats.length > this.maxSeats) {
      return {
        valid: false,
        message: `Maximum ${this.maxSeats} seats allowed per booking`,
        warnings: [`You selected ${context.selectedSeats.length} seats`]
      };
    }

    return { valid: true };
  }
}

/**
 * Ensures accessibility requirements are met
 */
class AccessibilityRule extends ValidationRule {
  name = 'Accessibility';
  priority = 4;

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const accessibleSeats = context.selectedSeats.filter(seat => seat.is_accessible);
    const nonAccessibleSeats = context.selectedSeats.filter(seat => !seat.is_accessible);

    // If mixing accessible and non-accessible seats, provide warning
    if (accessibleSeats.length > 0 && nonAccessibleSeats.length > 0) {
      return {
        valid: true,
        warnings: [
          'You have selected both accessible and standard seats. Please ensure this meets your needs.'
        ]
      };
    }

    return { valid: true };
  }
}

/**
 * Main business rules engine
 */
export class BusinessRulesEngine {
  private static instance: BusinessRulesEngine;
  private rules: ValidationRule[];

  private constructor() {
    this.rules = [
      new OrphanSeatRule(),
      new ContiguousSeatsRule(),
      new MaxSeatsPerUserRule(8),
      new AccessibilityRule()
    ];
    
    // Sort by priority
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  static getInstance(): BusinessRulesEngine {
    if (!BusinessRulesEngine.instance) {
      BusinessRulesEngine.instance = new BusinessRulesEngine();
    }
    return BusinessRulesEngine.instance;
  }

  /**
   * Validate seat selection against all business rules
   */
  async validateSeatSelection(
    showId: string,
    requestedSeatIds: string[],
    userId: string,
    sessionId?: string
  ): Promise<ValidationResult> {
    try {
      // Build validation context
      const context = await this.buildValidationContext(showId, requestedSeatIds, userId, sessionId);
      
      // Run all validation rules
      for (const rule of this.rules) {
        console.log(`🔍 Running rule: ${rule.name}`);
        const result = await rule.validate(context);
        
        if (!result.valid) {
          console.log(`❌ Rule ${rule.name} failed: ${result.message}`);
          return result;
        }
        
        if (result.warnings && result.warnings.length > 0) {
          console.log(`⚠️  Rule ${rule.name} warnings:`, result.warnings);
        }
      }

      console.log('✅ All business rules passed');
      return { valid: true };
      
    } catch (error) {
      console.error('❌ Error validating seat selection:', error);
      return {
        valid: false,
        message: 'Server error during validation'
      };
    }
  }

  /**
   * Get seat recommendations based on preferences
   */
  async getSeatRecommendations(
    showId: string,
    seatCount: number,
    preferences?: {
      maxPrice?: number;
      sectionPreference?: string;
      accessibilityRequired?: boolean;
    }
  ): Promise<SeatSuggestion[]> {
    try {
      const allSeats = await getShowSeats(showId);
      const availableSeats = allSeats.filter(seat => seat.status === 'available');
      
      // Apply preference filters
      let filteredSeats = availableSeats;
      
      if (preferences?.maxPrice) {
        filteredSeats = filteredSeats.filter(seat => seat.price_pence <= preferences.maxPrice! * 100);
      }
      
      if (preferences?.sectionPreference) {
        filteredSeats = filteredSeats.filter(seat => 
          seat.section_name.toLowerCase().includes(preferences.sectionPreference!.toLowerCase())
        );
      }
      
      if (preferences?.accessibilityRequired) {
        filteredSeats = filteredSeats.filter(seat => seat.is_accessible);
      }

      // Generate suggestions using OrphanSeatRule logic
      const orphanRule = this.rules.find(rule => rule.name === 'OrphanSeatPrevention') as OrphanSeatRule;
      if (orphanRule) {
        const context: ValidationContext = {
          showId,
          requestedSeats: [],
          userId: 'recommendation',
          allSeats,
          selectedSeats: []
        };
        
        return await (orphanRule as any).generateSeatSuggestions(context, seatCount);
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error generating seat recommendations:', error);
      return [];
    }
  }

  private async buildValidationContext(
    showId: string,
    requestedSeatIds: string[],
    userId: string,
    sessionId?: string
  ): Promise<ValidationContext> {
    const allSeats = await getShowSeats(showId);
    const selectedSeats = allSeats.filter(seat => requestedSeatIds.includes(seat.id));
    
    return {
      showId,
      requestedSeats: requestedSeatIds,
      userId,
      allSeats,
      selectedSeats,
      sessionId
    };
  }
}

// Export singleton instance
export const businessRulesEngine = BusinessRulesEngine.getInstance(); 