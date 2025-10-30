import { useState, useCallback, useEffect, useRef } from 'react';

export interface LoadingState {
  isLoading: boolean;
  message: string;
  progress?: number;
  startTime: number;
  operation: string;
  hasTimedOut: boolean;
  showFallback: boolean;
}

export interface LoadingOptions {
  message?: string;
  timeout?: number;
  showProgressAfter?: number;
  progressSimulation?: boolean;
}

/**
 * Enhanced loading state manager with comprehensive indicators
 */
export const useEnhancedLoading = () => {
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const progressRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const DEFAULT_TIMEOUT = 10000; // 10 seconds as per requirements
  const DEFAULT_PROGRESS_DELAY = 3000; // Show progress after 3 seconds

  // Start loading for a specific operation
  const startLoading = useCallback((
    operationId: string,
    options: LoadingOptions = {}
  ) => {
    const {
      message = 'Loading...',
      timeout = DEFAULT_TIMEOUT,
      showProgressAfter = DEFAULT_PROGRESS_DELAY,
      progressSimulation = true,
    } = options;

    // Clear any existing timeouts for this operation
    const existingTimeout = timeoutRefs.current.get(operationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    const existingProgress = progressRefs.current.get(operationId);
    if (existingProgress) {
      clearTimeout(existingProgress as any);
    }

    // Set initial loading state
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.set(operationId, {
        isLoading: true,
        message,
        startTime: Date.now(),
        operation: operationId,
        hasTimedOut: false,
        showFallback: false,
      });
      return newMap;
    });

    // Set up timeout
    if (timeout > 0) {
      const timeoutId = setTimeout(() => {
        console.warn(`Loading timeout reached for operation: ${operationId}`);
        setLoadingStates(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(operationId);
          if (current) {
            newMap.set(operationId, {
              ...current,
              hasTimedOut: true,
              showFallback: true,
              message: 'Taking longer than expected...',
            });
          }
          return newMap;
        });
      }, timeout);

      timeoutRefs.current.set(operationId, timeoutId);
    }

    // Set up progress simulation
    if (progressSimulation && showProgressAfter > 0) {
      const progressId = setTimeout(() => {
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 15 + 5; // Random progress between 5-20%
          if (progress >= 90) {
            progress = 90; // Don't complete until actually done
            clearInterval(progressInterval);
          }

          setLoadingStates(prev => {
            const newMap = new Map(prev);
            const current = newMap.get(operationId);
            if (current && current.isLoading) {
              newMap.set(operationId, {
                ...current,
                progress: Math.min(progress, 90),
              });
            } else {
              clearInterval(progressInterval);
            }
            return newMap;
          });
        }, 500);
      }, showProgressAfter);

      progressRefs.current.set(operationId, progressId as any);
    }
  }, []);

  // Stop loading for a specific operation
  const stopLoading = useCallback((operationId: string) => {
    // Clear timeouts
    const timeoutId = timeoutRefs.current.get(operationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(operationId);
    }

    const progressId = progressRefs.current.get(operationId);
    if (progressId) {
      clearTimeout(progressId as any);
      progressRefs.current.delete(operationId);
    }

    // Complete progress if it was shown
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(operationId);
      if (current && current.progress !== undefined) {
        // Briefly show 100% before removing
        newMap.set(operationId, {
          ...current,
          progress: 100,
        });
        
        setTimeout(() => {
          setLoadingStates(latest => {
            const finalMap = new Map(latest);
            finalMap.delete(operationId);
            return finalMap;
          });
        }, 300);
      } else {
        newMap.delete(operationId);
      }
      return newMap;
    });
  }, []);

  // Update loading message
  const updateLoadingMessage = useCallback((operationId: string, message: string) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(operationId);
      if (current) {
        newMap.set(operationId, {
          ...current,
          message,
        });
      }
      return newMap;
    });
  }, []);

  // Update loading progress manually
  const updateLoadingProgress = useCallback((operationId: string, progress: number) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(operationId);
      if (current) {
        newMap.set(operationId, {
          ...current,
          progress: Math.max(0, Math.min(100, progress)),
        });
      }
      return newMap;
    });
  }, []);

  // Clear timeout for operation (useful for manual handling)
  const clearLoadingTimeout = useCallback((operationId: string) => {
    const timeoutId = timeoutRefs.current.get(operationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(operationId);
    }

    setLoadingStates(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(operationId);
      if (current) {
        newMap.set(operationId, {
          ...current,
          hasTimedOut: false,
          showFallback: false,
        });
      }
      return newMap;
    });
  }, []);

  // Get loading state for specific operation
  const getLoadingState = useCallback((operationId: string): LoadingState | null => {
    return loadingStates.get(operationId) || null;
  }, [loadingStates]);

  // Check if any operation is loading
  const isAnyLoading = loadingStates.size > 0;

  // Get all loading operations
  const getAllLoadingStates = useCallback(() => {
    return Array.from(loadingStates.entries()).map(([id, state]) => ({
      id,
      ...state,
    }));
  }, [loadingStates]);

  // Get operations that have timed out
  const getTimedOutOperations = useCallback(() => {
    return Array.from(loadingStates.entries())
      .filter(([, state]) => state.hasTimedOut)
      .map(([id, state]) => ({ id, ...state }));
  }, [loadingStates]);

  // Check if any operation has timed out
  const hasTimedOutOperations = getTimedOutOperations().length > 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      progressRefs.current.forEach(progressId => clearTimeout(progressId));
    };
  }, []);

  return {
    startLoading,
    stopLoading,
    updateLoadingMessage,
    updateLoadingProgress,
    clearLoadingTimeout,
    getLoadingState,
    isAnyLoading,
    getAllLoadingStates,
    getTimedOutOperations,
    hasTimedOutOperations,
    loadingCount: loadingStates.size,
  };
};

/**
 * Hook for managing loading states for specific operations
 */
export const useOperationLoading = (operationId: string) => {
  const {
    startLoading,
    stopLoading,
    updateLoadingMessage,
    updateLoadingProgress,
    getLoadingState,
  } = useEnhancedLoading();

  const start = useCallback((options?: LoadingOptions) => {
    startLoading(operationId, options);
  }, [operationId, startLoading]);

  const stop = useCallback(() => {
    stopLoading(operationId);
  }, [operationId, stopLoading]);

  const updateMessage = useCallback((message: string) => {
    updateLoadingMessage(operationId, message);
  }, [operationId, updateLoadingMessage]);

  const updateProgress = useCallback((progress: number) => {
    updateLoadingProgress(operationId, progress);
  }, [operationId, updateLoadingProgress]);

  const state = getLoadingState(operationId);

  return {
    start,
    stop,
    updateMessage,
    updateProgress,
    isLoading: state?.isLoading || false,
    message: state?.message || '',
    progress: state?.progress,
    hasTimedOut: state?.hasTimedOut || false,
    showFallback: state?.showFallback || false,
    startTime: state?.startTime,
    duration: state ? Date.now() - state.startTime : 0,
  };
};

/**
 * Hook for wrapping async operations with enhanced loading
 */
export const useAsyncWithLoading = () => {
  const { startLoading, stopLoading, updateLoadingMessage } = useEnhancedLoading();

  const executeWithLoading = useCallback(async <T>(
    operationId: string,
    operation: () => Promise<T>,
    options: LoadingOptions & {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<T | null> => {
    const {
      successMessage,
      errorMessage = 'Operation failed',
      onSuccess,
      onError,
      ...loadingOptions
    } = options;

    try {
      startLoading(operationId, loadingOptions);
      const result = await operation();
      
      if (successMessage) {
        updateLoadingMessage(operationId, successMessage);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      stopLoading(operationId);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      stopLoading(operationId);
      
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error(`Operation ${operationId} failed:`, errorObj);
      
      if (onError) {
        onError(errorObj);
      }
      
      return null;
    }
  }, [startLoading, stopLoading, updateLoadingMessage]);

  return {
    executeWithLoading,
  };
};
