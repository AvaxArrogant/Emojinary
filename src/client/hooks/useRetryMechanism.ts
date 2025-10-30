import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '../components/ToastNotification';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitterFactor: number;
  retryCondition?: (error: Error, attempt: number) => boolean;
}

export interface RetryState {
  isRetrying: boolean;
  currentAttempt: number;
  maxAttempts: number;
  nextRetryIn: number;
  lastError: Error | null;
  hasExhaustedRetries: boolean;
}

export interface RetryableOperation<T = any> {
  id: string;
  operation: () => Promise<T>;
  config: RetryConfig;
  state: RetryState;
  onSuccess?: (result: T) => void;
  onFailure?: (error: Error) => void;
  onRetryAttempt?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  jitterFactor: 0.1,
  retryCondition: (error: Error) => {
    // Default: retry on network errors, timeouts, and server errors
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  },
};

/**
 * Hook for managing retry mechanisms with exponential backoff
 */
export const useRetryMechanism = () => {
  const [operations, setOperations] = useState<Map<string, RetryableOperation>>(new Map());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { showError, showWarning, showInfo } = useToast();

  // Calculate delay with exponential backoff and jitter
  const calculateDelay = useCallback((config: RetryConfig, attempt: number): number => {
    const exponentialDelay = Math.min(
      config.baseDelay * Math.pow(config.backoffFactor, attempt),
      config.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * config.jitterFactor * (Math.random() - 0.5);
    return Math.max(config.baseDelay, exponentialDelay + jitter);
  }, []);

  // Register a retryable operation
  const registerOperation = useCallback(<T>(
    id: string,
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    callbacks: {
      onSuccess?: (result: T) => void;
      onFailure?: (error: Error) => void;
      onRetryAttempt?: (attempt: number, error: Error) => void;
    } = {}
  ) => {
    const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    
    const retryableOp: RetryableOperation<T> = {
      id,
      operation,
      config: fullConfig,
      state: {
        isRetrying: false,
        currentAttempt: 0,
        maxAttempts: fullConfig.maxRetries,
        nextRetryIn: 0,
        lastError: null,
        hasExhaustedRetries: false,
      },
      ...callbacks,
    };

    setOperations(prev => new Map(prev).set(id, retryableOp));
  }, []);

  // Execute operation with retry logic
  const executeWithRetry = useCallback(async <T>(
    id: string,
    operation?: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T | null> => {
    let retryableOp = operations.get(id);
    
    // If operation not registered, register it temporarily
    if (!retryableOp && operation) {
      registerOperation(id, operation, config);
      retryableOp = operations.get(id);
    }
    
    if (!retryableOp) {
      throw new Error(`Operation ${id} not found and no operation provided`);
    }

    const executeAttempt = async (attempt: number): Promise<T | null> => {
      try {
        // Update state to show current attempt
        setOperations(prev => {
          const newMap = new Map(prev);
          const op = newMap.get(id);
          if (op) {
            op.state = {
              ...op.state,
              isRetrying: attempt > 0,
              currentAttempt: attempt,
            };
            newMap.set(id, op);
          }
          return newMap;
        });

        const result = await retryableOp.operation();
        
        // Success - clear retry state
        setOperations(prev => {
          const newMap = new Map(prev);
          const op = newMap.get(id);
          if (op) {
            op.state = {
              ...op.state,
              isRetrying: false,
              currentAttempt: 0,
              lastError: null,
              hasExhaustedRetries: false,
            };
            newMap.set(id, op);
          }
          return newMap;
        });

        if (retryableOp.onSuccess) {
          retryableOp.onSuccess(result);
        }

        if (attempt > 0) {
          showInfo(`Operation "${id}" succeeded after ${attempt + 1} attempts`);
        }

        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        // Update state with error
        setOperations(prev => {
          const newMap = new Map(prev);
          const op = newMap.get(id);
          if (op) {
            op.state = {
              ...op.state,
              lastError: errorObj,
            };
            newMap.set(id, op);
          }
          return newMap;
        });

        // Check if we should retry
        const shouldRetry = 
          attempt < retryableOp.config.maxRetries &&
          retryableOp.config.retryCondition?.(errorObj, attempt);

        if (shouldRetry) {
          const delay = calculateDelay(retryableOp.config, attempt);
          
          // Notify about retry attempt
          if (retryableOp.onRetryAttempt) {
            retryableOp.onRetryAttempt(attempt + 1, errorObj);
          }

          showWarning(
            `Operation "${id}" failed. Retrying in ${Math.round(delay / 1000)} seconds... (${attempt + 1}/${retryableOp.config.maxRetries})`,
            { duration: Math.min(delay, 5000) }
          );

          // Update state to show countdown
          let remainingTime = delay;
          const countdownInterval = setInterval(() => {
            remainingTime -= 100;
            setOperations(prev => {
              const newMap = new Map(prev);
              const op = newMap.get(id);
              if (op) {
                op.state = {
                  ...op.state,
                  nextRetryIn: Math.max(0, remainingTime),
                };
                newMap.set(id, op);
              }
              return newMap;
            });

            if (remainingTime <= 0) {
              clearInterval(countdownInterval);
            }
          }, 100);

          // Schedule retry
          return new Promise((resolve) => {
            const timeoutId = setTimeout(async () => {
              clearInterval(countdownInterval);
              const result = await executeAttempt(attempt + 1);
              resolve(result);
            }, delay);

            timeoutRefs.current.set(`${id}-${attempt}`, timeoutId);
          });
        } else {
          // No more retries - mark as exhausted
          setOperations(prev => {
            const newMap = new Map(prev);
            const op = newMap.get(id);
            if (op) {
              op.state = {
                ...op.state,
                isRetrying: false,
                hasExhaustedRetries: true,
              };
              newMap.set(id, op);
            }
            return newMap;
          });

          if (retryableOp.onFailure) {
            retryableOp.onFailure(errorObj);
          }

          showError(
            `Operation "${id}" failed after ${attempt + 1} attempts: ${errorObj.message}`,
            {
              duration: 8000,
              action: {
                label: 'Retry Manually',
                onClick: () => executeWithRetry(id),
              },
            }
          );

          return null;
        }
      }
    };

    return executeAttempt(0);
  }, [operations, registerOperation, calculateDelay, showError, showWarning, showInfo]);

  // Manual retry for a specific operation
  const retryOperation = useCallback(async (id: string) => {
    const operation = operations.get(id);
    if (!operation) {
      throw new Error(`Operation ${id} not found`);
    }

    // Reset retry state
    setOperations(prev => {
      const newMap = new Map(prev);
      const op = newMap.get(id);
      if (op) {
        op.state = {
          ...op.state,
          isRetrying: false,
          currentAttempt: 0,
          hasExhaustedRetries: false,
          nextRetryIn: 0,
        };
        newMap.set(id, op);
      }
      return newMap;
    });

    return executeWithRetry(id);
  }, [operations, executeWithRetry]);

  // Cancel retry for a specific operation
  const cancelRetry = useCallback((id: string) => {
    // Clear any pending timeouts
    timeoutRefs.current.forEach((timeoutId, key) => {
      if (key.startsWith(id)) {
        clearTimeout(timeoutId);
        timeoutRefs.current.delete(key);
      }
    });

    // Update state
    setOperations(prev => {
      const newMap = new Map(prev);
      const op = newMap.get(id);
      if (op) {
        op.state = {
          ...op.state,
          isRetrying: false,
          nextRetryIn: 0,
        };
        newMap.set(id, op);
      }
      return newMap;
    });
  }, []);

  // Remove operation
  const removeOperation = useCallback((id: string) => {
    cancelRetry(id);
    setOperations(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, [cancelRetry]);

  // Get operation state
  const getOperationState = useCallback((id: string): RetryState | null => {
    return operations.get(id)?.state || null;
  }, [operations]);

  // Get all operations
  const getAllOperations = useCallback(() => {
    return Array.from(operations.entries()).map(([id, op]) => ({
      id,
      ...op.state,
    }));
  }, [operations]);

  // Check if any operations are retrying
  const hasRetryingOperations = Array.from(operations.values()).some(op => op.state.isRetrying);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, []);

  return {
    registerOperation,
    executeWithRetry,
    retryOperation,
    cancelRetry,
    removeOperation,
    getOperationState,
    getAllOperations,
    hasRetryingOperations,
    operationCount: operations.size,
  };
};

/**
 * Hook for automatic retry of failed operations
 */
export const useAutoRetry = <T>(
  operationId: string,
  operation: () => Promise<T>,
  config: Partial<RetryConfig> & {
    enabled?: boolean;
    triggerDependencies?: any[];
  } = {}
) => {
  const { enabled = true, triggerDependencies = [], ...retryConfig } = config;
  const { registerOperation, executeWithRetry, getOperationState } = useRetryMechanism();
  const [result, setResult] = useState<T | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Register operation
  useEffect(() => {
    if (enabled) {
      registerOperation(
        operationId,
        operation,
        retryConfig,
        {
          onSuccess: (result) => {
            setResult(result);
            setIsExecuting(false);
          },
          onFailure: () => {
            setIsExecuting(false);
          },
        }
      );
    }
  }, [enabled, operationId, operation, retryConfig, registerOperation]);

  // Execute operation when dependencies change
  useEffect(() => {
    if (enabled && triggerDependencies.length > 0) {
      setIsExecuting(true);
      executeWithRetry(operationId);
    }
  }, [enabled, operationId, executeWithRetry, ...triggerDependencies]);

  const state = getOperationState(operationId);

  return {
    result,
    isExecuting,
    retryState: state,
    execute: () => {
      setIsExecuting(true);
      return executeWithRetry(operationId);
    },
  };
};
