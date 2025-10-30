import { useState, useCallback, useEffect, useRef } from 'react';
import { useTimeoutManager, useOperationTimeout } from './useTimeoutManager';
import { DEFAULT_TIMEOUTS, TimeoutConfig } from '../utils/timeoutManager';

interface LoadingState {
  isLoading: boolean;
  message: string;
  progress: number | undefined;
  hasTimedOut: boolean;
  remainingTime: number;
  canRetry: boolean;
  error: string | undefined;
}

interface LoadingOptions {
  message?: string;
  timeout?: number;
  timeoutConfig?: TimeoutConfig;
  enableProgress?: boolean;
  progressSimulation?: boolean;
  onTimeout?: () => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * Enhanced loading state manager with timeout and fallback mechanisms
 * Addresses Requirements: 5.1, 5.3, 5.4
 */
export function useEnhancedLoadingWithTimeout(operationId: string) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: '',
    progress: undefined,
    hasTimedOut: false,
    remainingTime: 0,
    canRetry: false,
    error: undefined,
  });

  const operationTimeout = useOperationTimeout(operationId);
  const progressIntervalRef = useRef<number | null>(null);
  const optionsRef = useRef<LoadingOptions>({});

  // Update loading state when timeout changes
  useEffect(() => {
    setLoadingState(prev => ({
      ...prev,
      hasTimedOut: operationTimeout.hasTimedOut,
      remainingTime: operationTimeout.remainingTime,
    }));
  }, [operationTimeout.hasTimedOut, operationTimeout.remainingTime]);

  // Start loading with timeout
  const startLoading = useCallback((options: LoadingOptions = {}) => {
    optionsRef.current = options;
    
    const timeoutConfig = options.timeoutConfig || {
      ...DEFAULT_TIMEOUTS.NETWORK_REQUEST,
      timeout: options.timeout || DEFAULT_TIMEOUTS.NETWORK_REQUEST.timeout,
    };

    setLoadingState({
      isLoading: true,
      message: options.message || 'Loading...',
      progress: options.enableProgress ? 0 : undefined,
      hasTimedOut: false,
      remainingTime: timeoutConfig.timeout,
      canRetry: false,
      error: undefined,
    });

    // Start timeout
    operationTimeout.startTimeout(timeoutConfig, () => {
      setLoadingState(prev => ({
        ...prev,
        hasTimedOut: true,
        canRetry: true,
      }));
      
      if (options.onTimeout) {
        options.onTimeout();
      }
    });

    // Start progress simulation if enabled
    if (options.progressSimulation && options.enableProgress) {
      startProgressSimulation(timeoutConfig.timeout);
    }
  }, [operationTimeout]);

  // Stop loading
  const stopLoading = useCallback((error?: string) => {
    operationTimeout.clearTimeout();
    
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      error,
      canRetry: !!error || prev.hasTimedOut,
    }));

    if (error && optionsRef.current.onError) {
      optionsRef.current.onError(error);
    } else if (!error && optionsRef.current.onComplete) {
      optionsRef.current.onComplete();
    }
  }, [operationTimeout]);

  // Update loading message
  const updateMessage = useCallback((message: string) => {
    setLoadingState(prev => ({
      ...prev,
      message,
    }));
  }, []);

  // Update progress
  const updateProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
    }));
  }, []);

  // Retry loading
  const retryLoading = useCallback((options?: LoadingOptions) => {
    const retryOptions = options || optionsRef.current;
    operationTimeout.resetTimeout();
    startLoading(retryOptions);
  }, [startLoading, operationTimeout]);

  // Start progress simulation
  const startProgressSimulation = useCallback((totalTime: number) => {
    let currentProgress = 0;
    const increment = 100 / (totalTime / 200); // Update every 200ms
    
    progressIntervalRef.current = window.setInterval(() => {
      currentProgress += increment;
      
      if (currentProgress >= 95) {
        // Slow down near the end
        currentProgress = Math.min(95, currentProgress);
        if (progressIntervalRef.current) {
          window.clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }
      
      updateProgress(currentProgress);
    }, 200);
  }, [updateProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      operationTimeout.clearTimeout();
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, [operationTimeout]);

  return {
    ...loadingState,
    startLoading,
    stopLoading,
    updateMessage,
    updateProgress,
    retryLoading,
    isTimeoutActive: operationTimeout.isActive,
    remainingTimeFormatted: operationTimeout.remainingTimeFormatted,
  };
}

/**
 * Hook for managing multiple loading operations with timeouts
 */
export function useMultipleLoadingWithTimeout() {
  const [operations, setOperations] = useState<Map<string, LoadingState>>(new Map());
  const timeoutManager = useTimeoutManager();

  // Add or update operation
  const updateOperation = useCallback((operationId: string, state: Partial<LoadingState>) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(operationId) || {
        isLoading: false,
        message: '',
        progress: undefined,
        hasTimedOut: false,
        remainingTime: 0,
        canRetry: false,
        error: undefined,
      };
      
      newMap.set(operationId, { ...currentState, ...state });
      return newMap;
    });
  }, []);

  // Remove operation
  const removeOperation = useCallback((operationId: string) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      newMap.delete(operationId);
      return newMap;
    });
  }, []);

  // Get operation state
  const getOperation = useCallback((operationId: string) => {
    return operations.get(operationId);
  }, [operations]);

  // Check if any operations are loading
  const hasLoadingOperations = Array.from(operations.values()).some(op => op.isLoading);

  // Check if any operations have timed out
  const hasTimedOutOperations = Array.from(operations.values()).some(op => op.hasTimedOut);

  // Get all timed out operations
  const timedOutOperations = Array.from(operations.entries())
    .filter(([, state]) => state.hasTimedOut)
    .map(([operationId]) => operationId);

  // Get all loading operations
  const loadingOperations = Array.from(operations.entries())
    .filter(([, state]) => state.isLoading)
    .map(([operationId]) => operationId);

  // Retry all timed out operations
  const retryAllTimedOut = useCallback(() => {
    timedOutOperations.forEach(operationId => {
      timeoutManager.resetTimeout(operationId);
      updateOperation(operationId, {
        hasTimedOut: false,
        canRetry: false,
        isLoading: true,
      });
    });
  }, [timedOutOperations, timeoutManager, updateOperation]);

  return {
    operations: Array.from(operations.entries()).map(([id, state]) => ({ id, ...state })),
    updateOperation,
    removeOperation,
    getOperation,
    hasLoadingOperations,
    hasTimedOutOperations,
    timedOutOperations,
    loadingOperations,
    retryAllTimedOut,
    operationCount: operations.size,
  };
}
