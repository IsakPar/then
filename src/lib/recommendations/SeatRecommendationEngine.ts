import React from 'react';
import { Seat, SectionInfo } from '../../components/seatmap/types';

// ============================================================================
// SEAT RECOMMENDATION ENGINE
// ============================================================================

export interface UserPreferences {
  budgetRange: {
    min: number;
    max: number;
  };
  preferredSections?: string[];
  accessibilityNeeds: boolean;
  viewQualityPriority: 'best' | 'good' | 'budget'; // best view vs budget
  groupSize: number;
  seatingArrangement: 'together' | 'nearby' | 'any';
  
  // Historical preferences (learned from past bookings)
  previousBookings?: {
    sectionIds: string[];
    priceRanges: number[];
    showTypes: string[];
  };
  
  // Advanced preferences
  proximityToStage: 'close' | 'middle' | 'far' | 'any';
  sidePreference: 'left' | 'center' | 'right' | 'any';
  rowPreference: 'front' | 'middle' | 'back' | 'any';
  avoidPartialView: boolean;
}

export interface SeatRecommendation {
  seats: Seat[];
  score: number; // 0-100, higher is better
  reasoning: string[];
  priceTotal: number;
  avgViewQuality: number; // 0-100
  groupingQuality: number; // 0-100, how well seats are grouped
  matchingPreferences: string[];
  warnings?: string[];
}

export interface RecommendationConfig {
  maxRecommendations: number;
  diversityFactor: number; // 0-1, higher = more diverse recommendations
  learningEnabled: boolean;
  includeAlternatives: boolean;
}

// Seat scoring weights
interface ScoringWeights {
  price: number;
  viewQuality: number;
  grouping: number;
  accessibility: number;
  preference: number;
  proximity: number;
}

export class SeatRecommendationEngine {
  private scoringWeights: ScoringWeights = {
    price: 0.25,
    viewQuality: 0.30,
    grouping: 0.25,
    accessibility: 0.05,
    preference: 0.10,
    proximity: 0.05
  };

  private venueLayouts: Map<string, VenueLayout> = new Map();
  private userLearningData: Map<string, UserLearningProfile> = new Map();

  constructor(
    private config: RecommendationConfig = {
      maxRecommendations: 5,
      diversityFactor: 0.3,
      learningEnabled: true,
      includeAlternatives: true
    }
  ) {}

  /**
   * Generate seat recommendations based on user preferences
   */
  async getRecommendations(
    seats: Seat[],
    sections: SectionInfo[],
    preferences: UserPreferences,
    venueId?: string,
    userId?: string
  ): Promise<SeatRecommendation[]> {
    // Filter available seats
    const availableSeats = seats.filter(seat => seat.status === 'available');
    
    if (availableSeats.length === 0) {
      return [];
    }

    // Apply learning if enabled and user data available
    let enhancedPreferences = preferences;
    if (this.config.learningEnabled && userId) {
      enhancedPreferences = await this.enhancePreferencesWithLearning(preferences, userId);
    }

    // Get venue layout for advanced recommendations
    const venueLayout = venueId ? this.venueLayouts.get(venueId) : null;

    // Generate candidate seat groups
    const candidateGroups = this.generateSeatCombinations(
      availableSeats,
      sections,
      enhancedPreferences.groupSize,
      enhancedPreferences.seatingArrangement
    );

    // Score each candidate group
    const scoredRecommendations = candidateGroups.map(group => 
      this.scoreSeatGroup(group, sections, enhancedPreferences, venueLayout)
    );

    // Sort by score and apply diversity
    let recommendations = scoredRecommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxRecommendations * 2); // Get more for diversity filtering

    // Apply diversity filtering
    if (this.config.diversityFactor > 0) {
      recommendations = this.applyDiversityFiltering(recommendations, this.config.diversityFactor);
    }

    // Add alternatives if enabled
    if (this.config.includeAlternatives) {
      const alternatives = this.generateAlternativeRecommendations(
        availableSeats,
        sections,
        enhancedPreferences,
        recommendations
      );
      recommendations.push(...alternatives);
    }

    return recommendations.slice(0, this.config.maxRecommendations);
  }

  /**
   * Generate seat combinations based on group size and arrangement preference
   */
  private generateSeatCombinations(
    seats: Seat[],
    sections: SectionInfo[],
    groupSize: number,
    arrangement: 'together' | 'nearby' | 'any'
  ): Seat[][] {
    const combinations: Seat[][] = [];
    
    if (groupSize === 1) {
      // Single seat - return all available seats
      return seats.map(seat => [seat]);
    }

    // Group seats by section and row for efficient processing
    const seatGroups = this.groupSeatsByLocation(seats);

    for (const [locationKey, locationSeats] of seatGroups) {
      const [sectionId, rowLetter] = locationKey.split('|');
      
      if (arrangement === 'together') {
        // Find consecutive seats in the same row
        const consecutiveGroups = this.findConsecutiveSeats(locationSeats, groupSize);
        combinations.push(...consecutiveGroups);
      } else if (arrangement === 'nearby') {
        // Find seats in the same section, possibly different rows
        const nearbyGroups = this.findNearbySeats(locationSeats, groupSize, 2); // max 2 rows apart
        combinations.push(...nearbyGroups);
      }
    }

    if (arrangement === 'any') {
      // Generate combinations from any available seats
      const anyGroups = this.generateAnyCombinations(seats, groupSize);
      combinations.push(...anyGroups);
    }

    return combinations;
  }

  /**
   * Score a group of seats based on user preferences
   */
  private scoreSeatGroup(
    seats: Seat[],
    sections: SectionInfo[],
    preferences: UserPreferences,
    venueLayout: VenueLayout | null
  ): SeatRecommendation {
    const scores = {
      price: this.calculatePriceScore(seats, preferences.budgetRange),
      viewQuality: this.calculateViewQualityScore(seats, sections, preferences, venueLayout),
      grouping: this.calculateGroupingScore(seats, preferences.seatingArrangement),
      accessibility: this.calculateAccessibilityScore(seats, preferences.accessibilityNeeds),
      preference: this.calculatePreferenceScore(seats, sections, preferences),
      proximity: this.calculateProximityScore(seats, preferences, venueLayout)
    };

    // Calculate weighted total score
    const totalScore = Object.entries(scores).reduce((total, [key, score]) => {
      return total + (score * this.scoringWeights[key as keyof ScoringWeights]);
    }, 0);

    // Generate reasoning
    const reasoning = this.generateReasoning(seats, scores, preferences);
    
    // Calculate metrics
    const priceTotal = seats.reduce((sum, seat) => sum + (seat.price_pence || 0), 0) / 100;
    const avgViewQuality = scores.viewQuality;
    const groupingQuality = scores.grouping;
    
    // Find matching preferences
    const matchingPreferences = this.identifyMatchingPreferences(seats, sections, preferences);
    
    // Identify potential warnings
    const warnings = this.identifyWarnings(seats, preferences);

    return {
      seats,
      score: Math.round(totalScore),
      reasoning,
      priceTotal,
      avgViewQuality,
      groupingQuality,
      matchingPreferences,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Calculate price score (0-100, higher is better value)
   */
  private calculatePriceScore(seats: Seat[], budgetRange: { min: number; max: number }): number {
    const totalPrice = seats.reduce((sum, seat) => sum + (seat.price_pence || 0), 0) / 100;
    const { min, max } = budgetRange;
    
    if (totalPrice < min) {
      // Too cheap might indicate poor quality
      return 60 + (totalPrice / min) * 30;
    } else if (totalPrice <= max) {
      // Within budget - score based on value
      const budgetPosition = (totalPrice - min) / (max - min);
      return 90 - (budgetPosition * 20); // Prefer lower end of budget
    } else {
      // Over budget - significant penalty but not zero
      const overBudget = (totalPrice - max) / max;
      return Math.max(10, 50 - (overBudget * 40));
    }
  }

  /**
   * Calculate view quality score based on seat position
   */
  private calculateViewQualityScore(
    seats: Seat[],
    sections: SectionInfo[],
    preferences: UserPreferences,
    venueLayout: VenueLayout | null
  ): number {
    let totalScore = 0;
    
    for (const seat of seats) {
      const section = sections.find(s => s.id === seat.section_id);
      if (!section) continue;

      let seatScore = 50; // Base score

      // Use venue layout if available for precise scoring
      if (venueLayout && seat.position) {
        seatScore = this.calculatePositionalViewScore(seat, venueLayout, preferences);
      } else {
        // Use section-based approximation
        seatScore = this.calculateSectionViewScore(seat, section, preferences);
      }

      // Apply accessibility adjustments
      if (preferences.accessibilityNeeds && seat.is_accessible) {
        seatScore += 15;
      }

      totalScore += seatScore;
    }

    return Math.min(100, totalScore / seats.length);
  }

  /**
   * Calculate how well seats are grouped together
   */
  private calculateGroupingScore(seats: Seat[], arrangement: 'together' | 'nearby' | 'any'): number {
    if (seats.length === 1) return 100;

    const groupedBySection = this.groupBy(seats, seat => seat.section_id);
    const groupedByRow = this.groupBy(seats, seat => `${seat.section_id}|${seat.row_letter}`);

    let score = 50; // Base score

    // Same section bonus
    if (groupedBySection.size === 1) {
      score += 25;
    }

    // Same row bonus
    if (groupedByRow.size === 1) {
      score += 15;
      
      // Consecutive seat bonus
      if (this.areSeatsConsecutive(seats)) {
        score += 10;
      }
    }

    // Apply arrangement preference
    switch (arrangement) {
      case 'together':
        if (groupedByRow.size > 1) score -= 30;
        break;
      case 'nearby':
        if (groupedBySection.size > 1) score -= 20;
        break;
      case 'any':
        // No penalty for spreading out
        break;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate reasoning text for a recommendation
   */
  private generateReasoning(
    seats: Seat[],
    scores: any,
    preferences: UserPreferences
  ): string[] {
    const reasoning: string[] = [];
    
    // Price reasoning
    if (scores.price > 80) {
      reasoning.push('Excellent value within your budget');
    } else if (scores.price > 60) {
      reasoning.push('Good value for money');
    } else if (scores.price < 40) {
      reasoning.push('Above your preferred budget range');
    }

    // View quality reasoning
    if (scores.viewQuality > 85) {
      reasoning.push('Premium view quality');
    } else if (scores.viewQuality > 70) {
      reasoning.push('Good view of the stage');
    } else if (scores.viewQuality < 50) {
      reasoning.push('Partial or restricted view');
    }

    // Grouping reasoning
    if (seats.length > 1) {
      if (scores.grouping > 80) {
        reasoning.push('Seats are perfectly together');
      } else if (scores.grouping > 60) {
        reasoning.push('Seats are close to each other');
      } else {
        reasoning.push('Seats are spread across different areas');
      }
    }

    // Accessibility reasoning
    if (preferences.accessibilityNeeds) {
      const accessibleSeats = seats.filter(seat => seat.is_accessible);
      if (accessibleSeats.length === seats.length) {
        reasoning.push('All seats are wheelchair accessible');
      } else if (accessibleSeats.length > 0) {
        reasoning.push('Some seats are wheelchair accessible');
      }
    }

    return reasoning;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private groupSeatsByLocation(seats: Seat[]): Map<string, Seat[]> {
    const groups = new Map<string, Seat[]>();
    
    for (const seat of seats) {
      const key = `${seat.section_id}|${seat.row_letter}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(seat);
    }
    
    return groups;
  }

  private findConsecutiveSeats(seats: Seat[], groupSize: number): Seat[][] {
    const sortedSeats = seats.sort((a, b) => a.seat_number - b.seat_number);
    const consecutive: Seat[][] = [];
    
    for (let i = 0; i <= sortedSeats.length - groupSize; i++) {
      const group = sortedSeats.slice(i, i + groupSize);
      if (this.areSeatsConsecutive(group)) {
        consecutive.push(group);
      }
    }
    
    return consecutive;
  }

  private areSeatsConsecutive(seats: Seat[]): boolean {
    if (seats.length <= 1) return true;
    
    const sorted = seats.sort((a, b) => a.seat_number - b.seat_number);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].seat_number !== sorted[i - 1].seat_number + 1) {
        return false;
      }
    }
    return true;
  }

  private findNearbySeats(seats: Seat[], groupSize: number, maxRowDistance: number): Seat[][] {
    // Implementation for finding nearby seats across rows
    // This would involve more complex logic for row proximity
    return [];
  }

  private generateAnyCombinations(seats: Seat[], groupSize: number): Seat[][] {
    // Generate combinations of any seats (with reasonable limits)
    if (groupSize > 4 || seats.length > 50) {
      // Limit combinations for performance
      return [];
    }
    
    const combinations: Seat[][] = [];
    const generate = (start: number, current: Seat[]) => {
      if (current.length === groupSize) {
        combinations.push([...current]);
        return;
      }
      
      for (let i = start; i < seats.length && combinations.length < 100; i++) {
        current.push(seats[i]);
        generate(i + 1, current);
        current.pop();
      }
    };
    
    generate(0, []);
    return combinations;
  }

  private groupBy<T>(array: T[], keyFunction: (item: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    for (const item of array) {
      const key = keyFunction(item);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }
    return groups;
  }

  private calculateSectionViewScore(seat: Seat, section: SectionInfo, preferences: UserPreferences): number {
    // Basic section-based view scoring
    let score = 60;
    
    // Add section-specific bonuses based on typical theatre layouts
    const sectionName = section.name.toLowerCase();
    
    if (sectionName.includes('orchestra') || sectionName.includes('stall')) {
      score += 20; // Premium section
    } else if (sectionName.includes('dress circle') || sectionName.includes('mezzanine')) {
      score += 15; // Good section
    } else if (sectionName.includes('upper') || sectionName.includes('balcony')) {
      score += 5; // Budget section
    }
    
    // Row-based adjustments (approximate)
    const rowLetter = seat.row_letter.charCodeAt(0) - 65; // A=0, B=1, etc.
    if (rowLetter < 5) {
      score += 10; // Front rows
    } else if (rowLetter > 15) {
      score -= 10; // Back rows
    }
    
    return Math.min(100, score);
  }

  private calculatePositionalViewScore(seat: Seat, layout: VenueLayout, preferences: UserPreferences): number {
    // Advanced positional scoring using venue layout data
    // This would use precise coordinates and sight lines
    return 75; // Placeholder implementation
  }

  private calculateAccessibilityScore(seats: Seat[], needsAccessibility: boolean): number {
    if (!needsAccessibility) return 100; // Not applicable
    
    const accessibleSeats = seats.filter(seat => seat.is_accessible);
    return (accessibleSeats.length / seats.length) * 100;
  }

  private calculatePreferenceScore(seats: Seat[], sections: SectionInfo[], preferences: UserPreferences): number {
    let score = 50;
    
    // Preferred sections bonus
    if (preferences.preferredSections && preferences.preferredSections.length > 0) {
      const inPreferredSection = seats.some(seat => 
        preferences.preferredSections!.includes(seat.section_id)
      );
      if (inPreferredSection) score += 30;
    }
    
    // Historical preferences (if available)
    if (preferences.previousBookings) {
      const matchesPrevious = seats.some(seat =>
        preferences.previousBookings!.sectionIds.includes(seat.section_id)
      );
      if (matchesPrevious) score += 20;
    }
    
    return Math.min(100, score);
  }

  private calculateProximityScore(seats: Seat[], preferences: UserPreferences, layout: VenueLayout | null): number {
    // Calculate proximity score based on stage distance preference
    let score = 50;
    
    if (preferences.proximityToStage !== 'any') {
      // Use row letter as approximation for distance
      const avgRow = seats.reduce((sum, seat) => 
        sum + (seat.row_letter.charCodeAt(0) - 65), 0) / seats.length;
      
      switch (preferences.proximityToStage) {
        case 'close':
          score += Math.max(0, 30 - avgRow * 2);
          break;
        case 'middle':
          score += Math.max(0, 20 - Math.abs(avgRow - 8) * 3);
          break;
        case 'far':
          score += Math.max(0, avgRow * 2 - 10);
          break;
      }
    }
    
    return Math.min(100, score);
  }

  private identifyMatchingPreferences(seats: Seat[], sections: SectionInfo[], preferences: UserPreferences): string[] {
    const matches: string[] = [];
    
    // Check budget match
    const totalPrice = seats.reduce((sum, seat) => sum + (seat.price_pence || 0), 0) / 100;
    if (totalPrice >= preferences.budgetRange.min && totalPrice <= preferences.budgetRange.max) {
      matches.push('Within budget range');
    }
    
    // Check accessibility
    if (preferences.accessibilityNeeds && seats.every(seat => seat.is_accessible)) {
      matches.push('Meets accessibility requirements');
    }
    
    // Check preferred sections
    if (preferences.preferredSections && 
        seats.some(seat => preferences.preferredSections!.includes(seat.section_id))) {
      matches.push('In preferred section');
    }
    
    return matches;
  }

  private identifyWarnings(seats: Seat[], preferences: UserPreferences): string[] {
    const warnings: string[] = [];
    
    // Budget warnings
    const totalPrice = seats.reduce((sum, seat) => sum + (seat.price_pence || 0), 0) / 100;
    if (totalPrice > preferences.budgetRange.max) {
      warnings.push('Exceeds maximum budget');
    }
    
    // Accessibility warnings
    if (preferences.accessibilityNeeds && !seats.every(seat => seat.is_accessible)) {
      warnings.push('Not all seats are wheelchair accessible');
    }
    
    // Grouping warnings
    if (preferences.seatingArrangement === 'together' && !this.areSeatsConsecutive(seats)) {
      warnings.push('Seats are not consecutive');
    }
    
    return warnings;
  }

  private applyDiversityFiltering(recommendations: SeatRecommendation[], diversityFactor: number): SeatRecommendation[] {
    // Apply diversity filtering to avoid too similar recommendations
    const diverse: SeatRecommendation[] = [];
    
    for (const rec of recommendations) {
      const isDiverse = diverse.every(existing => {
        const priceDiff = Math.abs(rec.priceTotal - existing.priceTotal) / Math.max(rec.priceTotal, existing.priceTotal);
        const sectionDiff = new Set(rec.seats.map(s => s.section_id)).size !== 
                          new Set(existing.seats.map(s => s.section_id)).size;
        
        return priceDiff > diversityFactor || sectionDiff;
      });
      
      if (isDiverse || diverse.length === 0) {
        diverse.push(rec);
      }
    }
    
    return diverse;
  }

  private generateAlternativeRecommendations(
    seats: Seat[],
    sections: SectionInfo[],
    preferences: UserPreferences,
    mainRecommendations: SeatRecommendation[]
  ): SeatRecommendation[] {
    // Generate alternative recommendations with relaxed preferences
    const alternatives: SeatRecommendation[] = [];
    
    // Budget alternative (higher budget)
    if (preferences.budgetRange.max < 200) {
      const relaxedPrefs = {
        ...preferences,
        budgetRange: { ...preferences.budgetRange, max: preferences.budgetRange.max * 1.5 }
      };
      // Generate with relaxed budget...
    }
    
    // Grouping alternative (less strict grouping)
    if (preferences.seatingArrangement === 'together') {
      const relaxedPrefs = {
        ...preferences,
        seatingArrangement: 'nearby' as const
      };
      // Generate with relaxed grouping...
    }
    
    return alternatives;
  }

  private async enhancePreferencesWithLearning(preferences: UserPreferences, userId: string): Promise<UserPreferences> {
    // Enhance preferences based on user's learning profile
    const learningProfile = this.userLearningData.get(userId);
    if (!learningProfile) return preferences;
    
    // Apply learning-based enhancements
    return {
      ...preferences,
      preferredSections: [...(preferences.preferredSections || []), ...learningProfile.preferredSections],
      // Add other learning-based enhancements
    };
  }
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

interface VenueLayout {
  id: string;
  sightLines: SightLine[];
  stagePosition: { x: number; y: number };
  acousticZones: AcousticZone[];
}

interface SightLine {
  seatPosition: { x: number; y: number };
  viewQuality: number; // 0-100
  hasObstruction: boolean;
  obstructionType?: 'pillar' | 'overhang' | 'railing';
}

interface AcousticZone {
  bounds: { x1: number; y1: number; x2: number; y2: number };
  audioQuality: number; // 0-100
}

interface UserLearningProfile {
  userId: string;
  preferredSections: string[];
  avgSpending: number;
  showTypePreferences: string[];
  groupSizeHistory: number[];
  lastUpdated: Date;
}

// ============================================================================
// REACT HOOK
// ============================================================================

export const useSeatRecommendations = (
  seats: Seat[],
  sections: SectionInfo[],
  preferences: UserPreferences,
  venueId?: string,
  userId?: string
) => {
  const [recommendations, setRecommendations] = React.useState<SeatRecommendation[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const engine = React.useMemo(() => new SeatRecommendationEngine(), []);

  const generateRecommendations = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const recs = await engine.getRecommendations(seats, sections, preferences, venueId, userId);
      setRecommendations(recs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  }, [engine, seats, sections, preferences, venueId, userId]);

  React.useEffect(() => {
    if (seats.length > 0 && sections.length > 0) {
      generateRecommendations();
    }
  }, [generateRecommendations]);

  return {
    recommendations,
    loading,
    error,
    refresh: generateRecommendations
  };
};

export default SeatRecommendationEngine; 