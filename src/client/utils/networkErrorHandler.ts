import { useToast } from '../components/ToastNotification';

export interface NetworkError extends Error {
  status?: number;
  statusText?: string;
  url?: string;
  isNetworkError?: boolean;
  isTimeout?: boolean;
  retryable?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: NetworkError) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    return !!(
      error.isNetworkError ||
      error.isTimeout ||
      (error.status && error.status >= 500)
    );
  },
};

/**
 * Enhanced fetch wrapper with automatic retry logic and error handling
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: NetworkError | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Add timeout to request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is ok
      if (!response.ok) {
        const error: NetworkError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.statusText = response.statusText;
        error.url = url;
        error.retryable = config.retryCondition?.(error) ?? false;

        // Don't retry client errors (4xx) except for specific cases
        if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
          throw error;
        }

        lastError = error;
      } else {
        return response;
      }
    } catch (error) {
      const networkError: NetworkError = error instanceof Error ? error : new Error('Unknown error');
      
      // Categorize the error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        networkError.isNetworkError = true;
        networkError.retryable = true;
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        networkError.isTimeout = true;
        networkError.retryable = true;
      }

      networkError.url = url;
      lastError = networkError;
    }

    // Don't retry on last attempt
    if (attempt === config.maxRetries) {
      break;
    }

    // Check if we should retry
    if (!config.retryCondition?.(lastError)) {
      break;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffFactor, attempt),
      config.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    await new Promise(resolve => setTimeout(resolve, delay + jitter));
  }

  throw lastError || new Error('Unknown network error');
}

/**
 * Hook for handling network errors with user-friendly messages
 */
export function useNetworkErrorHandler() {
  const { showError, showWarning, showInfo } = useToast();

  const handleNetworkError = (error: NetworkError, context?: string) => {
    console.error('Network error:', error, { context });

    let message = 'Something went wrong';
    let action: { label: string; onClick: () => void } | undefined;

    if (error.isNetworkError) {
      message = 'Connection problem. Please check your internet connection.';
      action = {
        label: 'Retry',
        onClick: () => window.location.reload(),
      };
    } else if (error.isTimeout) {
      message = 'Request timed out. The server might be busy.';
      action = {
        label: 'Try Again',
        onClick: () => window.location.reload(),
      };
    } else if (error.status) {
      switch (error.status) {
        case 400:
          message = 'Invalid request. Please check your input.';
          break;
        case 401:
          message = 'You need to log in to continue.';
          action = {
            label: 'Refresh',
            onClick: () => window.location.reload(),
          };
          break;
        case 403:
          message = 'You don\'t have permission to do that.';
          break;
        case 404:
          message = 'The requested resource was not found.';
          break;
        case 408:
          message = 'Request timed out. Please try again.';
          action = {
            label: 'Retry',
            onClick: () => window.location.reload(),
          };
          break;
        case 429:
          message = 'Too many requests. Please wait a moment.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          action = {
            label: 'Retry',
            onClick: () => window.location.reload(),
          };
          break;
        case 502:
        case 503:
        case 504:
          message = 'Server is temporarily unavailable. Please try again.';
          action = {
            label: 'Retry',
            onClick: () => window.location.reload(),
          };
          break;
        default:
          message = `Server responded with error ${error.status}`;
      }
    }

    if (context) {
      message = `${context}: ${message}`;
    }

    const toastOptions: any = {};
    if (action) {
      toastOptions.action = action;
    }
    
    if (error.status && error.status >= 400 && error.status < 500) {
      showWarning(message, toastOptions);
    } else {
      toastOptions.duration = 8000;
      showError(message, toastOptions);
    }
  };

  const handleSuccess = (message: string) => {
    showInfo(message, { duration: 3000 });
  };

  return {
    handleNetworkError,
    handleSuccess,
    fetchWithRetry,
  };
}

/**
 * Utility function to create a network-aware fetch function
 */
export function createNetworkAwareFetch() {
  return async (url: string, options: RequestInit = {}) => {
    try {
      return await fetchWithRetry(url, options);
    } catch (error) {
      // Re-throw with additional context
      const networkError = error as NetworkError;
      networkError.url = url;
      throw networkError;
    }
  };
}

/**
 * Check if the browser is online
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const { showWarning, showInfo } = useToast();

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showInfo('Connection restored!', { duration: 2000 });
    };

    const handleOffline = () => {
      setIsOnline(false);
      showWarning('You appear to be offline. Some features may not work.', {
        duration: 0, // Don't auto-dismiss
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showInfo, showWarning]);

  return isOnline;
}

// Add React import for the hook
import React from 'react';
