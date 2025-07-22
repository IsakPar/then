import { redisManager } from '../redis/redis-client';
import { updateSeatStatus } from '../db/queries';
import type { SeatStatus } from '../db/schema';

// NOTE: Redis is mocked/disabled for investor prototype.
// Production build should enable Redis for full real-time seat locking & pub/sub updates.
// Current implementation gracefully falls back to database-only mode when Redis unavailable.

interface SeatLock {
  userId: string;
  sessionId: string;
  showId: string;
  seatId: string;
  heldAt: string;
  expiresAt: string;
}

interface SeatLockResult {
  success: boolean;
  message: string;
  lock?: SeatLock;
  conflictUserId?: string;
}

export class SeatLockingService {
  private static instance: SeatLockingService;
  private lockDuration = 15 * 60; // 15 minutes in seconds
  private readonly LOCK_PREFIX = 'seat-lock:';
  private readonly USER_LOCKS_PREFIX = 'user-locks:';

  private constructor() {}

  static getInstance(): SeatLockingService {
    if (!SeatLockingService.instance) {
      SeatLockingService.instance = new SeatLockingService();
    }
    return SeatLockingService.instance;
  }

  /**
   * Hold a seat for a specific user with TTL
   */
  async holdSeat(
    showId: string, 
    seatId: string, 
    userId: string, 
    sessionId: string
  ): Promise<SeatLockResult> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        // Fallback: update database directly if Redis is unavailable
        await updateSeatStatus(seatId, 'reserved');
        return {
          success: true,
          message: 'Seat held (Redis unavailable, using database fallback)',
          lock: {
            userId,
            sessionId,
            showId,
            seatId,
            heldAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.lockDuration * 1000).toISOString()
          }
        };
      }

      const lockKey = this.getLockKey(showId, seatId);
      const userLocksKey = this.getUserLocksKey(userId);
      
      // Check if user already has too many locks
      const userLockCount = await redis.scard(userLocksKey);
      if (userLockCount >= 8) { // Maximum 8 seats per user
        return {
          success: false,
          message: 'Maximum seat limit reached (8 seats per user)'
        };
      }

      const lockValue: SeatLock = {
        userId,
        sessionId,
        showId,
        seatId,
        heldAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.lockDuration * 1000).toISOString()
      };

      // Atomic operation - only set if key doesn't exist
      const result = await redis.set(
        lockKey,
        JSON.stringify(lockValue),
        'EX',
        this.lockDuration,
        'NX'
      );

      if (result === 'OK') {
        // Add to user's lock set
        await redis.sadd(userLocksKey, seatId);
        await redis.expire(userLocksKey, this.lockDuration);

        // Update database
        await updateSeatStatus(seatId, 'reserved');

        console.log(`🔒 Seat locked: ${showId}:${seatId} for user ${userId}`);
        
        return {
          success: true,
          message: 'Seat held successfully',
          lock: lockValue
        };
      } else {
        // Seat is already locked, get the existing lock info
        const existingLockData = await redis.get(lockKey);
        if (existingLockData) {
          const existingLock: SeatLock = JSON.parse(existingLockData);
          
          if (existingLock.userId === userId) {
            return {
              success: true,
              message: 'Seat already held by you',
              lock: existingLock
            };
          }
          
          return {
            success: false,
            message: 'Seat is already held by another user',
            conflictUserId: existingLock.userId
          };
        }
        
        return {
          success: false,
          message: 'Failed to acquire seat lock'
        };
      }
    } catch (error) {
      console.log('⚠️ Redis unavailable, falling back to database-only mode');
      // Fallback: update database directly if Redis is unavailable
      try {
        await updateSeatStatus(seatId, 'reserved');
        return {
          success: true,
          message: 'Seat held (Redis unavailable, using database fallback)',
          lock: {
            userId,
            sessionId,
            showId,
            seatId,
            heldAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.lockDuration * 1000).toISOString()
          }
        };
      } catch (dbError) {
        console.error('❌ Error holding seat in database fallback:', dbError);
        return {
          success: false,
          message: 'Server error while holding seat'
        };
      }
    }
  }

  /**
   * Release a seat lock
   */
  async releaseSeat(
    showId: string, 
    seatId: string, 
    userId: string
  ): Promise<SeatLockResult> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        // Fallback: update database directly
        await updateSeatStatus(seatId, 'available');
        return {
          success: true,
          message: 'Seat released (Redis unavailable, using database fallback)'
        };
      }

      const lockKey = this.getLockKey(showId, seatId);
      const userLocksKey = this.getUserLocksKey(userId);

      // Get existing lock
      const lockData = await redis.get(lockKey);
      if (!lockData) {
        return {
          success: false,
          message: 'No lock found for this seat'
        };
      }

      const lock: SeatLock = JSON.parse(lockData);
      
      // Verify ownership
      if (lock.userId !== userId) {
        return {
          success: false,
          message: 'Unauthorized: You cannot release this seat'
        };
      }

      // Remove lock atomically
      const pipeline = redis.pipeline();
      pipeline.del(lockKey);
      pipeline.srem(userLocksKey, seatId);
      await pipeline.exec();

      // Update database
      await updateSeatStatus(seatId, 'available');

      console.log(`🔓 Seat released: ${showId}:${seatId} by user ${userId}`);

      return {
        success: true,
        message: 'Seat released successfully'
      };
    } catch (error) {
      console.log('⚠️ Redis unavailable, falling back to database-only mode for seat release');
      // Fallback: update database directly if Redis is unavailable
      try {
        await updateSeatStatus(seatId, 'available');
        return {
          success: true,
          message: 'Seat released (Redis unavailable, using database fallback)'
        };
      } catch (dbError) {
        console.error('❌ Error releasing seat in database fallback:', dbError);
        return {
          success: false,
          message: 'Server error while releasing seat'
        };
      }
    }
  }

  /**
   * Get all seats held by a user
   */
  async getUserHeldSeats(userId: string): Promise<SeatLock[]> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return [];

      const userLocksKey = this.getUserLocksKey(userId);
      const seatIds = await redis.smembers(userLocksKey);
      
      const locks: SeatLock[] = [];
      for (const seatId of seatIds) {
        // Find the lock key by pattern (we need showId)
        const pattern = `${this.LOCK_PREFIX}*:${seatId}`;
        const keys = await redis.keys(pattern);
        
        for (const key of keys) {
          const lockData = await redis.get(key);
          if (lockData) {
            const lock: SeatLock = JSON.parse(lockData);
            if (lock.userId === userId) {
              locks.push(lock);
            }
          }
        }
      }
      
      return locks;
    } catch (error) {
      console.error('❌ Error getting user held seats:', error);
      return [];
    }
  }

  /**
   * Cleanup expired locks (called periodically)
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return 0;

      const pattern = `${this.LOCK_PREFIX}*`;
      const keys = await redis.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) { // Key exists but has no TTL
          await redis.del(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired seat locks`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning up expired locks:', error);
      return 0;
    }
  }

  /**
   * Get lock status for a specific seat
   */
  async getSeatLockStatus(showId: string, seatId: string): Promise<SeatLock | null> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return null;

      const lockKey = this.getLockKey(showId, seatId);
      const lockData = await redis.get(lockKey);
      
      if (!lockData) return null;
      
      return JSON.parse(lockData);
    } catch (error) {
      console.error('❌ Error getting seat lock status:', error);
      return null;
    }
  }

  /**
   * Extend lock duration for a seat
   */
  async extendLock(
    showId: string, 
    seatId: string, 
    userId: string, 
    additionalSeconds: number = 300 // 5 minutes default
  ): Promise<SeatLockResult> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        return {
          success: false,
          message: 'Redis unavailable'
        };
      }

      const lockKey = this.getLockKey(showId, seatId);
      const lockData = await redis.get(lockKey);
      
      if (!lockData) {
        return {
          success: false,
          message: 'No lock found for this seat'
        };
      }

      const lock: SeatLock = JSON.parse(lockData);
      
      if (lock.userId !== userId) {
        return {
          success: false,
          message: 'Unauthorized: You cannot extend this lock'
        };
      }

      // Extend TTL
      await redis.expire(lockKey, additionalSeconds);
      
      // Update lock data
      const updatedLock: SeatLock = {
        ...lock,
        expiresAt: new Date(Date.now() + additionalSeconds * 1000).toISOString()
      };
      
      await redis.set(lockKey, JSON.stringify(updatedLock), 'EX', additionalSeconds);

      return {
        success: true,
        message: 'Lock extended successfully',
        lock: updatedLock
      };
    } catch (error) {
      console.error('❌ Error extending lock:', error);
      return {
        success: false,
        message: 'Server error while extending lock'
      };
    }
  }

  private getLockKey(showId: string, seatId: string): string {
    return `${this.LOCK_PREFIX}${showId}:${seatId}`;
  }

  private getUserLocksKey(userId: string): string {
    return `${this.USER_LOCKS_PREFIX}${userId}`;
  }
}

// Export singleton instance
export const seatLockingService = SeatLockingService.getInstance(); 