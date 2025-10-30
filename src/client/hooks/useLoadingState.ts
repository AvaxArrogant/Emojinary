import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '../components/ToastNotification';

interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
  startTime?: number;
}

interface LoadingOptions {
  message?: string;
  timeout?: number;
  showProgressAfter?: number;
  onTimeout?: () => void;
}

/**
 * Enhanced loading state management hook with timeout detection and user feedback
 */
export const useLoadingState = () => {
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map());
  const { showWarning } = useToast();
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const progressRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Start loading for a specific operation
  const startLoading = useCallback((
    operationId: string, 
    options: LoadingOptions = {}
  ) => {
    const {
      message = 'Loading...',
      timeout = 30000, // 30 seconds default
      showProgressAfter = 3000, // Show progress after 3 seconds
      onTimeout,
    } = options;

    setLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.set(operationId, {
        isLoading: true,
        loadingMessage: message,
        startTime: Date.now(),
      });
      return newMap;
    });

    // Set up timeout
    if (timeout > 0) {
      const timeoutId = setTimeout(() => {
        showWarning('This is taking longer than expected...', {
          action: {
            label: 'Cancel',
            onClick: () => stopLoading(operationId),
          },
        });

        if (onTimeout) {
          onTimeout();
        }
      }, timeout);

      timeoutRefs.current.set(operationId, timeoutId);
    }

    // Set up progress indicator
    if (showProgressAfter > 0) {
      const progressId = setTimeout(() => {
        setLoadingStates(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(operationId);
          if (current) {
            newMap.set(operationId, {
              ...current,
              progress: 0,
            });
          }
          return newMap;
        });

        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 20; // Random progress increments
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

      progressRefs.current.set(operationId, progressId);
    }
  }, [showWarning]);

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
      clearTimeout(progressId);
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
        }, 200);
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
          loadingMessage: message,
        });
      }
      return newMap;
    });
  }, []);

  // Check if any operation is loading
  const isAnyLoading = loadingStates.size > 0;

  // Get loading state for specific operation
  const getLoadingState = useCallback((operationId: string) => {
    return loadingStates.get(operationId) || { isLoading: false };
  }, [loadingStates]);

  // Get all loading operations
  const getAllLoadingStates = useCallback(() => {
    return Array.from(loadingStates.entries()).map(([id, state]) => ({
      id,
      ...state,
    }));
  }, [loadingStates]);

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
    isAnyLoading,
    getLoadingState,
    getAllLoadingStates,
    loadingCount: loadingStates.size,
  };
};

/**
 * Hook for wrapping async operations with loading states
 */
export const useAsyncOperation = () => {
  const { startLoading, stopLoading, updateLoadingMessage } = useLoadingState();

  const executeWithLoading = useCallback(async <T>(
    operationId: string,
    operation: () => Promise<T>,
    options: LoadingOptions & {
      successMessage?: string;
      errorMessage?: string;
    } = {}
  ): Promise<T | null> => {
    const {
      successMessage,
      errorMessage = 'Operation failed',
      ...loadingOptions
    } = options;

    try {
      startLoading(operationId, loadingOptions);
      const result = await operation();
      
      if (successMessage) {
        // Brief success message before stopping loading
        updateLoadingMessage(operationId, successMessage);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      stopLoading(operationId);
      return result;
    } catch (error) {
      stopLoading(operationId);
      
      console.error('Operation failed:', error);
      
      return null;
    }
  }, [startLoading, stopLoading, updateLoadingMessage]);

  return {
    executeWithLoading,
  };
};

/**
 * Hook for managing loading states in components
 */
export const useComponentLoading = (componentName: string) => {
  const { startLoading, stopLoading, getLoadingState, updateLoadingMessage } = useLoadingState();

  const setLoading = useCallback((loading: boolean, message?: string) => {
    if (loading) {
      startLoading(componentName, message ? { message } : {});
    } else {
      stopLoading(componentName);
    }
  }, [componentName, startLoading, stopLoading]);

  const updateMessage = useCallback((message: string) => {
    updateLoadingMessage(componentName, message);
  }, [componentName, updateLoadingMessage]);

  const loadingState = getLoadingState(componentName);

  return {
    isLoading: loadingState.isLoading,
    loadingMessage: loadingState.loadingMessage,
    progress: loadingState.progress,
    setLoading,
    updateMessage,
  };
};
