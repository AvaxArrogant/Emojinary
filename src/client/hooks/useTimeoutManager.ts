import { useEffect, useState, useCallback, useRef } from 'react';
import { globalTimeoutManager, TimeoutConfig, DEFAULT_TIMEOUTS } from '../utils/timeoutManager';

/**
 * Hook for managing operation timeouts with fallback mechanisms
 * Addresses Requirements: 5.1, 5.3, 5.4
 */
export function useTimeoutManager() {
  const [timedOutOperations, setTimedOutOperations] = useState<string[]>([]);
  const [activeTimeouts, setActiveTimeouts] = useState<string[]>([]);
  const callbacksRef = useRef<Map<string, () => void>>(new Map());

  // Update state when timeouts change
  const updateTimeoutState = useCallback(() => {
    setTimedOutOperations(globalTimeoutManager.getTimedOutOperations());
    setActiveTimeouts(globalTimeoutManager.getActiveTimeouts());
  }, []);

  // Start a timeout for an operation
  const startTimeout = useCallback((
    operationId: string, 
    config: TimeoutConfig,
    onTimeoutCallback?: () => void
  ) => {
    // Store callback if provided
    if (onTimeoutCallback) {
      callbacksRef.current.set(operationId, onTimeoutCallback);
    }

    // Set up timeout with callback
    const timeoutConfig = {
      ...config,
      onTimeout: () => {
        config.onTimeout?.();
        const callback = callbacksRef.current.get(operationId);
        if (callback) {
          callback();
        }
        updateTimeoutState();
      },
    };

    globalTimeoutManager.startTimeout(operationId, timeoutConfig);
    updateTimeoutState();
  }, [updateTimeoutState]);

  // Clear a timeout
  const clearTimeout = useCallback((operationId: string) => {
    globalTimeoutManager.clearTimeout(operationId);
    callbacksRef.current.delete(operationId);
    updateTimeoutState();
  }, [updateTimeoutState]);

  // Reset a timeout
  const resetTimeout = useCallback((operationId: string) => {
    globalTimeoutManager.resetTimeout(operationId);
    callbacksRef.current.delete(operationId);
    updateTimeoutState();
  }, [updateTimeoutState]);

  // Check if operation has timed out
  const hasTimedOut = useCallback((operationId: string) => {
    return globalTimeoutManager.hasTimedOut(operationId);
  }, []);

  // Check if timeout is active
  const isTimeoutActive = useCallback((operationId: string) => {
    return globalTimeoutManager.isTimeoutActive(operationId);
  }, []);

  // Get remaining time
  const getRemainingTime = useCallback((operationId: string) => {
    return globalTimeoutManager.getRemainingTime(operationId);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all callbacks for this component
      callbacksRef.current.clear();
    };
  }, []);

  return {
    timedOutOperations,
    activeTimeouts,
    startTimeout,
    clearTimeout,
    resetTimeout,
    hasTimedOut,
    isTimeoutActive,
    getRemainingTime,
    hasAnyTimedOut: timedOutOperations.length > 0,
    hasActiveTimeouts: activeTimeouts.length > 0,
  };
}

/**
 * Hook for managing a specific operation timeout
 */
export function useOperationTimeout(
  operationId: string,
  defaultConfig?: TimeoutConfig
) {
  const timeoutManager = useTimeoutManager();
  const [remainingTime, setRemainingTime] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Start timeout with default or custom config
  const startTimeout = useCallback((
    config?: TimeoutConfig,
    onTimeoutCallback?: () => void
  ) => {
    const finalConfig = config || defaultConfig || DEFAULT_TIMEOUTS.NETWORK_REQUEST;
    timeoutManager.startTimeout(operationId, finalConfig, onTimeoutCallback);
    
    // Start countdown timer
    intervalRef.current = window.setInterval(() => {
      const remaining = timeoutManager.getRemainingTime(operationId);
      setRemainingTime(remaining);
      
      if (remaining <= 0 && intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 100);
  }, [operationId, defaultConfig, timeoutManager]);

  // Clear timeout
  const clearTimeout = useCallback(() => {
    timeoutManager.clearTimeout(operationId);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRemainingTime(0);
  }, [operationId, timeoutManager]);

  // Reset timeout
  const resetTimeout = useCallback(() => {
    timeoutManager.resetTimeout(operationId);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRemainingTime(0);
  }, [operationId, timeoutManager]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    startTimeout,
    clearTimeout,
    resetTimeout,
    hasTimedOut: timeoutManager.hasTimedOut(operationId),
    isActive: timeoutManager.isTimeoutActive(operationId),
    remainingTime,
    remainingTimeFormatted: formatTime(remainingTime),
  };
}

/**
 * Format time in milliseconds to human readable format
 */
function formatTime(ms: number): string {
  if (ms <= 0) return '0s';
  
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
