import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { useToast } from '../components/ToastNotification';

type ErrorType =
  | 'network'
  | 'validation'
  | 'permission'
  | 'timeout'
  | 'unknown'
  | 'rate_limit'
  | 'server_error';

interface GameError {
  type: ErrorType;
  message: string;
  timestamp: number;
  action?: string;
  retryable?: boolean;
  statusCode?: number;
}

interface RetryableAction {
  action: () => Promise<void>;
  maxRetries: number;
  currentRetries: number;
  backoffMs: number;
}

/**
 * Custom hook for enhanced error handling and user feedback
 */
export const useGameError = () => {
  const { error, clearError } = useGame();
  const { showError: showToast, showWarning } = useToast();
  const [errorHistory, setErrorHistory] = useState<GameError[]>([]);
  const [showError, setShowError] = useState(false);
  const [retryableActions, setRetryableActions] = useState<Map<string, RetryableAction>>(new Map());

  // Categorize error type based on message and status code
  const categorizeError = useCallback((errorMessage: string, statusCode?: number): ErrorType => {
    const message = errorMessage.toLowerCase();

    // Check status code first for more accurate categorization
    if (statusCode) {
      if (statusCode === 429) return 'rate_limit';
      if (statusCode >= 500) return 'server_error';
      if (statusCode === 401 || statusCode === 403) return 'permission';
      if (statusCode === 408) return 'timeout';
      if (statusCode >= 400 && statusCode < 500) return 'validation';
    }

    // Fallback to message-based categorization
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('failed to fetch')
    ) {
      return 'network';
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limit';
    }

    if (
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('empty') ||
      message.includes('bad request')
    ) {
      return 'validation';
    }

    if (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('not allowed') ||
      message.includes('forbidden')
    ) {
      return 'permission';
    }

    if (message.includes('timeout') || message.includes('expired')) {
      return 'timeout';
    }

    if (message.includes('server error') || message.includes('internal error')) {
      return 'server_error';
    }

    return 'unknown';
  }, []);

  // Get user-friendly error message
  const getUserFriendlyMessage = useCallback((error: GameError): string => {
    switch (error.type) {
      case 'network':
        return 'Connection problem. Please check your internet and try again.';
      case 'validation':
        return error.message; // Validation messages are usually user-friendly
      case 'permission':
        return "You don't have permission to perform this action.";
      case 'timeout':
        return 'Request timed out. Please try again.';
      case 'rate_limit':
        return "You're doing that too fast. Please wait a moment and try again.";
      case 'server_error':
        return 'Server is experiencing issues. Please try again in a moment.';
      default:
        return error.message || 'Something went wrong. Please try again.';
    }
  }, []);

  // Check if error is retryable
  const isRetryable = useCallback((error: GameError): boolean => {
    return ['network', 'timeout', 'server_error', 'rate_limit'].includes(error.type);
  }, []);

  // Retry with exponential backoff
  const retryWithBackoff = useCallback(
    async (actionId: string, action: () => Promise<void>) => {
      const retryAction = retryableActions.get(actionId);
      if (!retryAction || retryAction.currentRetries >= retryAction.maxRetries) {
        return false;
      }

      try {
        // Wait for backoff period
        await new Promise((resolve) => setTimeout(resolve, retryAction.backoffMs));

        // Attempt the action
        await action();

        // Success - remove from retry actions
        setRetryableActions((prev) => {
          const newMap = new Map(prev);
          newMap.delete(actionId);
          return newMap;
        });

        showToast('Action completed successfully!');
        return true;
      } catch (error) {
        // Update retry count and backoff
        setRetryableActions((prev) => {
          const newMap = new Map(prev);
          const updated = {
            ...retryAction,
            currentRetries: retryAction.currentRetries + 1,
            backoffMs: Math.min(retryAction.backoffMs * 2, 30000), // Max 30 seconds
          };
          newMap.set(actionId, updated);
          return newMap;
        });

        return false;
      }
    },
    [retryableActions, showToast]
  );

  // Register a retryable action
  const registerRetryableAction = useCallback(
    (actionId: string, action: () => Promise<void>, maxRetries = 3) => {
      setRetryableActions((prev) => {
        const newMap = new Map(prev);
        newMap.set(actionId, {
          action,
          maxRetries,
          currentRetries: 0,
          backoffMs: 1000, // Start with 1 second
        });
        return newMap;
      });
    },
    []
  );

  // Handle new errors
  useEffect(() => {
    if (error) {
      // Try to extract status code from error message
      const statusCodeMatch = error.match(/(\d{3})/);
      const statusCode = statusCodeMatch?.[1] ? parseInt(statusCodeMatch[1], 10) : undefined;

      const gameError: GameError = {
        type: categorizeError(error, statusCode),
        message: error,
        timestamp: Date.now(),
        retryable: false, // Will be set below
        ...(statusCode && { statusCode }),
      };

      gameError.retryable = isRetryable(gameError);

      setErrorHistory((prev) => [gameError, ...prev.slice(0, 9)]); // Keep last 10 errors
      setShowError(true);

      // Show appropriate toast notification
      const userMessage = getUserFriendlyMessage(gameError);

      if (gameError.type === 'validation') {
        showWarning(userMessage);
      } else {
        const toastOptions: any = {
          duration: gameError.type === 'rate_limit' ? 3000 : 6000,
        };

        if (gameError.retryable) {
          toastOptions.action = {
            label: 'Retry',
            onClick: () => retryLastAction(),
          };
        }

        showToast(userMessage, toastOptions);
      }
    }
  }, [error, categorizeError, isRetryable, getUserFriendlyMessage, showToast, showWarning]);

  // Auto-hide error after delay
  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => {
        setShowError(false);
      }, 5000); // Hide after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [showError]);

  const dismissError = useCallback(() => {
    setShowError(false);
    clearError();
  }, [clearError]);

  const retryLastAction = useCallback(() => {
    const lastError = errorHistory[0];
    if (!lastError || !lastError.retryable) {
      dismissError();
      return;
    }

    // Try to find a registered retryable action
    const actionId = `retry-${lastError.timestamp}`;
    const retryAction = retryableActions.get(actionId);

    if (retryAction) {
      retryWithBackoff(actionId, retryAction.action);
    } else {
      // Fallback: just clear the error and suggest manual retry
      dismissError();
      showWarning('Please try your last action again manually.');
    }
  }, [errorHistory, retryableActions, retryWithBackoff, dismissError, showWarning]);

  const currentError = errorHistory[0] || null;
  const userFriendlyMessage = currentError ? getUserFriendlyMessage(currentError) : null;

  return {
    error: currentError,
    userFriendlyMessage,
    showError: showError && !!currentError,
    errorHistory,
    dismissError,
    retryLastAction,
    registerRetryableAction,
    hasNetworkError: currentError?.type === 'network',
    hasValidationError: currentError?.type === 'validation',
    hasPermissionError: currentError?.type === 'permission',
    hasRateLimitError: currentError?.type === 'rate_limit',
    hasServerError: currentError?.type === 'server_error',
    isRetryable: currentError ? isRetryable(currentError) : false,
  };
};

/**
 * Custom hook for loading states with timeout
 */
export const useGameLoading = () => {
  const { loading } = useGame();
  const [isStuck, setIsStuck] = useState(false);

  // Detect if loading is stuck (taking too long)
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setIsStuck(true);
      }, 10000); // 10 seconds timeout

      return () => {
        clearTimeout(timer);
        setIsStuck(false);
      };
    } else {
      setIsStuck(false);
    }
  }, [loading]);

  return {
    loading,
    isStuck,
    isQuick: loading, // For immediate feedback
    isSlow: loading && isStuck, // For stuck operations
  };
};

/**
 * Custom hook for connection status and retry logic
 */
export const useConnectionStatus = () => {
  const { connected } = useGame();
  const { showInfo, showError } = useToast();
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [lastSuccessfulConnection, setLastSuccessfulConnection] = useState(Date.now());

  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // Start with 1 second

  // Monitor connection quality
  useEffect(() => {
    if (connected) {
      setConnectionQuality('good');
      setLastSuccessfulConnection(Date.now());
      setReconnectAttempts(0);
    } else {
      const timeSinceLastConnection = Date.now() - lastSuccessfulConnection;
      if (timeSinceLastConnection > 30000) {
        // 30 seconds
        setConnectionQuality('offline');
      } else {
        setConnectionQuality('poor');
      }
    }
  }, [connected, lastSuccessfulConnection]);

  const attemptReconnect = useCallback(async () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      showError('Unable to reconnect. Please refresh the page.', {
        duration: 0, // Don't auto-dismiss
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      });
      return false;
    }

    setIsReconnecting(true);
    setReconnectAttempts((prev) => prev + 1);

    try {
      // Exponential backoff
      const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
      await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 10000))); // Max 10 seconds

      // Try to reconnect by making a simple API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/game/ping', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);
      const success = response.ok;

      if (success) {
        setReconnectAttempts(0);
        showInfo('Reconnected successfully!', { duration: 2000 });
      }

      setIsReconnecting(false);
      return success;
    } catch (error) {
      setIsReconnecting(false);

      if (reconnectAttempts === maxReconnectAttempts - 1) {
        showError('Connection failed. Please check your internet connection.', {
          action: {
            label: 'Try Again',
            onClick: () => {
              setReconnectAttempts(0);
              attemptReconnect();
            },
          },
        });
      }

      return false;
    }
  }, [reconnectAttempts, showError, showInfo]);

  // Auto-reconnect when disconnected
  useEffect(() => {
    if (!connected && !isReconnecting && reconnectAttempts < maxReconnectAttempts) {
      const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
      const timer = setTimeout(
        () => {
          attemptReconnect();
        },
        Math.min(delay, 10000)
      );

      return () => clearTimeout(timer);
    }
  }, [connected, isReconnecting, reconnectAttempts, attemptReconnect]);

  const resetReconnectAttempts = useCallback(() => {
    setReconnectAttempts(0);
  }, []);

  const forceReconnect = useCallback(() => {
    setReconnectAttempts(0);
    attemptReconnect();
  }, [attemptReconnect]);

  return {
    connected,
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    connectionQuality,
    canReconnect: reconnectAttempts < maxReconnectAttempts,
    attemptReconnect,
    forceReconnect,
    resetReconnectAttempts,
    timeSinceLastConnection: Date.now() - lastSuccessfulConnection,
  };
};
