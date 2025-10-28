import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../contexts/GameContext';

type ErrorType = 'network' | 'validation' | 'permission' | 'timeout' | 'unknown';

interface GameError {
  type: ErrorType;
  message: string;
  timestamp: number;
  action?: string;
}

/**
 * Custom hook for enhanced error handling and user feedback
 */
export const useGameError = () => {
  const { error, clearError } = useGame();
  const [errorHistory, setErrorHistory] = useState<GameError[]>([]);
  const [showError, setShowError] = useState(false);

  // Categorize error type based on message
  const categorizeError = useCallback((errorMessage: string): ErrorType => {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    
    if (message.includes('invalid') || message.includes('required') || message.includes('empty')) {
      return 'validation';
    }
    
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('not allowed')) {
      return 'permission';
    }
    
    if (message.includes('timeout') || message.includes('expired')) {
      return 'timeout';
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
        return 'You don\'t have permission to perform this action.';
      case 'timeout':
        return 'Request timed out. Please try again.';
      default:
        return error.message || 'Something went wrong. Please try again.';
    }
  }, []);

  // Handle new errors
  useEffect(() => {
    if (error) {
      const gameError: GameError = {
        type: categorizeError(error),
        message: error,
        timestamp: Date.now(),
      };
      
      setErrorHistory(prev => [gameError, ...prev.slice(0, 9)]); // Keep last 10 errors
      setShowError(true);
    }
  }, [error, categorizeError]);

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
    // This would need to be implemented based on the specific action that failed
    // For now, just clear the error
    dismissError();
  }, [dismissError]);

  const currentError = errorHistory[0] || null;
  const userFriendlyMessage = currentError ? getUserFriendlyMessage(currentError) : null;

  return {
    error: currentError,
    userFriendlyMessage,
    showError: showError && !!currentError,
    errorHistory,
    dismissError,
    retryLastAction,
    hasNetworkError: currentError?.type === 'network',
    hasValidationError: currentError?.type === 'validation',
    hasPermissionError: currentError?.type === 'permission',
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
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // 2 seconds

  const attemptReconnect = useCallback(async () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      return false;
    }

    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);

    try {
      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, reconnectDelay));
      
      // Try to reconnect by making a simple API call
      const response = await fetch('/api/game/ping');
      const success = response.ok;
      
      if (success) {
        setReconnectAttempts(0);
      }
      
      setIsReconnecting(false);
      return success;
    } catch (error) {
      setIsReconnecting(false);
      return false;
    }
  }, [reconnectAttempts]);

  // Auto-reconnect when disconnected
  useEffect(() => {
    if (!connected && reconnectAttempts < maxReconnectAttempts) {
      const timer = setTimeout(() => {
        attemptReconnect();
      }, reconnectDelay);
      
      return () => clearTimeout(timer);
    }
  }, [connected, reconnectAttempts, attemptReconnect]);

  const resetReconnectAttempts = useCallback(() => {
    setReconnectAttempts(0);
  }, []);

  return {
    connected,
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    canReconnect: reconnectAttempts < maxReconnectAttempts,
    attemptReconnect,
    resetReconnectAttempts,
  };
};
