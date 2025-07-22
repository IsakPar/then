import { CoordinateEngine, type RawPosition, type BoundingBox } from '../../../src/components/seatmap/CoordinateEngine';

describe('CoordinateEngine', () => {
  let engine: CoordinateEngine;
  let mockPositions: RawPosition[];

  beforeEach(() => {
    mockPositions = [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
      { x: 100, y: 400 }
    ];
  });

  describe('initialization', () => {
    it('should initialize with valid position data', () => {
      expect(() => {
        engine = new CoordinateEngine(mockPositions);
      }).not.toThrow();
    });

    it('should throw error for empty position array', () => {
      expect(() => {
        engine = new CoordinateEngine([]);
      }).toThrow('Cannot initialize with empty positions array');
    });

    it('should validate coordinate bounds on initialization', () => {
      const invalidPositions = [
        { x: NaN, y: 200 }
      ];

      expect(() => {
        engine = new CoordinateEngine(invalidPositions);
      }).toThrow();
    });
  });

  describe('coordinate transformations', () => {
    beforeEach(() => {
      engine = new CoordinateEngine(mockPositions);
    });

    it('should calculate correct bounding box', () => {
      const bounds = engine.getBounds();
      
      expect(bounds.raw.minX).toBe(100);
      expect(bounds.raw.maxX).toBe(300);
      expect(bounds.raw.minY).toBe(200);
      expect(bounds.raw.maxY).toBe(400);
      expect(bounds.raw.width).toBe(200);
      expect(bounds.raw.height).toBe(200);
    });

    it('should normalize coordinates to 0-1 range', () => {
      const normalized = engine.normalizePosition({ x: 200, y: 300 });
      
      expect(normalized.x).toBeCloseTo(0.5); // Middle of x range
      expect(normalized.y).toBeCloseTo(0.5); // Middle of y range
    });

    it('should handle edge coordinates correctly', () => {
      const topLeft = engine.normalizePosition({ x: 100, y: 200 });
      const bottomRight = engine.normalizePosition({ x: 300, y: 400 });
      
      expect(topLeft.x).toBeCloseTo(0);
      expect(topLeft.y).toBeCloseTo(0);
      expect(bottomRight.x).toBeCloseTo(1);
      expect(bottomRight.y).toBeCloseTo(1);
    });

    it('should scale coordinates to target dimensions', () => {
      const normalized = { x: 0.5, y: 0.5 };
      const scaled = engine.scalePosition(normalized);
      
      expect(scaled.x).toBeGreaterThan(0);
      expect(scaled.y).toBeGreaterThan(0);
    });

    it('should transform raw coordinates to final viewport coordinates', () => {
      const transformed = engine.transformPosition({ x: 200, y: 300 });
      
      expect(transformed.x).toBeGreaterThan(0);
      expect(transformed.y).toBeGreaterThan(0);
    });
  });

  describe('density analysis', () => {
    beforeEach(() => {
      engine = new CoordinateEngine(mockPositions);
    });

    it('should calculate seat density correctly', () => {
      const densityInfo = engine.getDensityInfo();
      
      expect(densityInfo.density).toBeGreaterThan(0);
      expect(densityInfo.totalSeats).toBe(3);
      expect(densityInfo.averageSpacingX).toBeGreaterThan(0);
      expect(densityInfo.averageSpacingY).toBeGreaterThan(0);
    });

    it('should determine optimal seat radius based on zoom', () => {
      const radius = engine.calculateSeatRadius(1.0);
      
      expect(radius).toBeGreaterThan(0);
      expect(radius).toBeLessThan(50);
    });

    it('should adjust radius based on zoom level', () => {
      const normalRadius = engine.calculateSeatRadius(1.0);
      const zoomedRadius = engine.calculateSeatRadius(2.0);
      
      expect(zoomedRadius).toBeGreaterThan(normalRadius);
    });
  });

  describe('error handling and validation', () => {
    beforeEach(() => {
      engine = new CoordinateEngine(mockPositions);
    });

    it('should validate position data', () => {
      expect(engine.isValidPosition({ x: 100, y: 200 })).toBe(true);
      expect(engine.isValidPosition({ x: NaN, y: 200 })).toBe(false);
      expect(engine.isValidPosition({ x: 100, y: Infinity })).toBe(false);
    });

    it('should handle malformed position data gracefully', () => {
      const malformedPositions = [
        { x: NaN, y: 200 }
      ];

      expect(() => {
        engine = new CoordinateEngine(malformedPositions);
      }).toThrow();
    });

    it('should validate SVG viewBox calculations', () => {
      const viewBox = engine.getViewBox();
      
      expect(viewBox.viewBoxString.split(' ')).toHaveLength(4);
      expect(viewBox.viewBoxString).toMatch(/^[\d.\-\s]+$/);
      expect(viewBox.aspectRatio).toBeGreaterThan(0);
    });
  });

  describe('performance considerations', () => {
    beforeEach(() => {
      // Create large dataset for performance testing
      const largePositions: RawPosition[] = [];
      for (let i = 0; i < 1200; i++) {
        largePositions.push({
          x: (i % 40) * 20,
          y: Math.floor(i / 40) * 25
        });
      }
      engine = new CoordinateEngine(largePositions);
    });

    it('should handle large datasets efficiently', () => {
      const startTime = performance.now();
      
      // Perform coordinate transformations on all positions
      for (let i = 0; i < 1200; i++) {
        engine.transformPosition({ x: i * 20, y: i * 25 });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(200); // Should complete in under 200ms
    });

    it('should cache expensive calculations', () => {
      const firstCall = performance.now();
      engine.getBounds();
      const firstDuration = performance.now() - firstCall;

      const secondCall = performance.now();
      engine.getBounds();
      const secondDuration = performance.now() - secondCall;

      expect(secondDuration).toBeLessThanOrEqual(firstDuration);
    });
  });
}); 