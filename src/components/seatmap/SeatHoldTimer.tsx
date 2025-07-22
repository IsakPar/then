// TODO [Phase 2]: Add seat hold timer visualization for real-time seat reservations
// Purpose: Display countdown timers and warning states for held seats

import React, { useState, useEffect, useCallback } from 'react';
import { SeatHoldConfig } from '../../types/seat-map-shared';

interface SeatHoldTimerProps {
  seatId: string;
  holdExpiresAt: Date;
  onExpired: (seatId: string) => void;
  onWarning?: (seatId: string, timeLeft: number) => void;
  onExtendRequest?: (seatId: string) => void;
  config?: Partial<SeatHoldConfig>;
  className?: string;
}

interface TimerState {
  timeLeft: number;
  isWarning: boolean;
  isExpired: boolean;
  canExtend: boolean;
  extensionsUsed: number;
}

/**
 * Default hold configuration
 */
const DEFAULT_HOLD_CONFIG: SeatHoldConfig = {
  holdDurationMs: 10 * 60 * 1000,    // 10 minutes
  warningThresholdMs: 2 * 60 * 1000, // 2 minutes
  extendable: true,
  maxExtensions: 2
};

/**
 * Seat hold timer visualization component
 */
export const SeatHoldTimer: React.FC<SeatHoldTimerProps> = ({
  seatId,
  holdExpiresAt,
  onExpired,
  onWarning,
  onExtendRequest,
  config = {},
  className = ''
}) => {
  const holdConfig = { ...DEFAULT_HOLD_CONFIG, ...config };
  
  const [timerState, setTimerState] = useState<TimerState>({
    timeLeft: 0,
    isWarning: false,
    isExpired: false,
    canExtend: holdConfig.extendable,
    extensionsUsed: 0
  });

  /**
   * Calculate time left and update state
   */
  const updateTimer = useCallback(() => {
    const now = Date.now();
    const expiresAt = holdExpiresAt.getTime();
    const timeLeft = Math.max(0, expiresAt - now);
    
    const isWarning = timeLeft <= holdConfig.warningThresholdMs;
    const isExpired = timeLeft === 0;
    const canExtend = holdConfig.extendable && 
                     timerState.extensionsUsed < holdConfig.maxExtensions && 
                     !isExpired;

    setTimerState(prev => ({
      ...prev,
      timeLeft,
      isWarning,
      isExpired,
      canExtend
    }));

    // Trigger callbacks
    if (isExpired && !timerState.isExpired) {
      onExpired(seatId);
    } else if (isWarning && !timerState.isWarning && onWarning) {
      onWarning(seatId, timeLeft);
    }
  }, [holdExpiresAt, holdConfig, seatId, onExpired, onWarning, timerState.isExpired, timerState.isWarning, timerState.extensionsUsed]);

  /**
   * Setup timer interval
   */
  useEffect(() => {
    updateTimer(); // Initial calculation
    
    const interval = setInterval(updateTimer, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, [updateTimer]);

  /**
   * Handle extend request
   */
  const handleExtendRequest = useCallback(() => {
    if (timerState.canExtend && onExtendRequest) {
      setTimerState(prev => ({
        ...prev,
        extensionsUsed: prev.extensionsUsed + 1,
        canExtend: prev.extensionsUsed + 1 < holdConfig.maxExtensions
      }));
      onExtendRequest(seatId);
    }
  }, [timerState.canExtend, onExtendRequest, seatId, holdConfig.maxExtensions]);

  /**
   * Format time remaining
   */
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  };

  /**
   * Get timer color based on state
   */
  const getTimerColor = (): string => {
    if (timerState.isExpired) return 'text-red-600';
    if (timerState.isWarning) return 'text-orange-500';
    return 'text-green-600';
  };

  /**
   * Get progress percentage
   */
  const getProgressPercentage = (): number => {
    const totalDuration = holdConfig.holdDurationMs;
    const elapsed = totalDuration - timerState.timeLeft;
    return Math.min(100, (elapsed / totalDuration) * 100);
  };

  // Don't render if expired
  if (timerState.isExpired) {
    return null;
  }

  return (
    <div className={`seat-hold-timer ${className}`}>
      {/* Timer display */}
      <div className={`timer-display ${getTimerColor()}`}>
        <div className="timer-text text-xs font-mono">
          ⏱️ {formatTime(timerState.timeLeft)}
        </div>
        
        {/* Progress bar */}
        <div className="progress-container w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`progress-bar h-full transition-all duration-1000 ${
              timerState.isWarning ? 'bg-orange-500' : 'bg-green-500'
            }`}
            style={{ width: `${100 - getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Warning state */}
      {timerState.isWarning && (
        <div className="warning-indicator">
          <div className="warning-pulse animate-pulse text-orange-500 text-xs">
            ⚠️ Expiring soon
          </div>
          
          {/* Extend button */}
          {timerState.canExtend && (
            <button
              onClick={handleExtendRequest}
              className="extend-btn text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
              title={`Extend hold (${holdConfig.maxExtensions - timerState.extensionsUsed} extensions left)`}
            >
              +5min
            </button>
          )}
        </div>
      )}

      {/* Extension info */}
      {timerState.extensionsUsed > 0 && (
        <div className="extension-info text-xs text-gray-500">
          Extended {timerState.extensionsUsed}/{holdConfig.maxExtensions}
        </div>
      )}
    </div>
  );
};

/**
 * Hook for managing seat hold timers
 */
export function useSeatHoldTimer(
  seatId: string,
  holdExpiresAt: Date | null,
  config?: Partial<SeatHoldConfig>
) {
  const [isHeld, setIsHeld] = useState(!!holdExpiresAt);
  const [isWarning, setIsWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    setIsHeld(!!holdExpiresAt);
  }, [holdExpiresAt]);

  const handleExpired = useCallback((expiredSeatId: string) => {
    if (expiredSeatId === seatId) {
      setIsHeld(false);
      setIsWarning(false);
      setTimeLeft(0);
    }
  }, [seatId]);

  const handleWarning = useCallback((warningSeatId: string, timeRemaining: number) => {
    if (warningSeatId === seatId) {
      setIsWarning(true);
      setTimeLeft(timeRemaining);
    }
  }, [seatId]);

  return {
    isHeld,
    isWarning,
    timeLeft,
    renderTimer: holdExpiresAt ? (
      <SeatHoldTimer
        seatId={seatId}
        holdExpiresAt={holdExpiresAt}
        onExpired={handleExpired}
        onWarning={handleWarning}
        config={config}
      />
    ) : null
  };
}

/**
 * Batch timer component for multiple held seats
 */
interface BatchSeatHoldTimersProps {
  heldSeats: Array<{
    seatId: string;
    holdExpiresAt: Date;
  }>;
  onSeatExpired: (seatId: string) => void;
  onExtendRequest?: (seatId: string) => void;
  config?: Partial<SeatHoldConfig>;
  className?: string;
}

export const BatchSeatHoldTimers: React.FC<BatchSeatHoldTimersProps> = ({
  heldSeats,
  onSeatExpired,
  onExtendRequest,
  config,
  className = ''
}) => {
  const [expiredSeats, setExpiredSeats] = useState<Set<string>>(new Set());

  const handleSeatExpired = useCallback((seatId: string) => {
    setExpiredSeats(prev => new Set([...prev, seatId]));
    onSeatExpired(seatId);
  }, [onSeatExpired]);

  // Filter out expired seats
  const activeHeldSeats = heldSeats.filter(seat => !expiredSeats.has(seat.seatId));

  if (activeHeldSeats.length === 0) {
    return null;
  }

  return (
    <div className={`batch-seat-timers ${className}`}>
      <div className="timers-header text-sm font-medium text-gray-700 mb-2">
        🎫 Held Seats ({activeHeldSeats.length})
      </div>
      
      <div className="timers-grid space-y-2">
        {activeHeldSeats.map(({ seatId, holdExpiresAt }) => (
          <div key={seatId} className="timer-item flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="seat-label text-sm font-mono">{seatId}</span>
            <SeatHoldTimer
              seatId={seatId}
              holdExpiresAt={holdExpiresAt}
              onExpired={handleSeatExpired}
              onExtendRequest={onExtendRequest}
              config={config}
              className="ml-2"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeatHoldTimer; 