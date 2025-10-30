import React, { useEffect, useState } from 'react';
import { useTimeoutManager } from '../hooks/useTimeoutManager';
import { TimeoutFallbackUI, MultipleTimeoutsDisplay } from './TimeoutFallbackUI';
import { RefreshButton } from './RefreshButton';

interface FallbackManagerProps {
  /** Child components to render */
  children: React.ReactNode;
  /** Whether to show timeout fallbacks */
  enableTimeoutFallbacks?: boolean;
  /** Whether to show multiple timeout summary */
  showMultipleTimeoutSummary?: boolean;
  /** Custom refresh handler for all operations */
  onRefreshAll?: () => void;
  /** Custom retry handler for all operations */
  onRetryAll?: () => void;
  /** Maximum number of individual timeout displays */
  maxIndividualTimeouts?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Comprehensive fallback manager that handles timeouts and provides fallback UI
 * Addresses Requirements: 5.1, 5.3, 5.4
 */
export const FallbackManager: React.FC<FallbackManagerProps> = ({
  children,
  enableTimeoutFallbacks = true,
  showMultipleTimeoutSummary = true,
  onRefreshAll,
  onRetryAll,
  maxIndividualTimeouts = 3,
  className = '',
}) => {
  const timeoutManager = useTimeoutManager();
  const [showFallbacks, setShowFallbacks] = useState(false);

  // Show fallbacks when timeouts occur
  useEffect(() => {
    if (enableTimeoutFallbacks && timeoutManager.hasAnyTimedOut) {
      setShowFallbacks(true);
    }
  }, [enableTimeoutFallbacks, timeoutManager.hasAnyTimedOut]);

  // Hide fallbacks when all timeouts are cleared
  useEffect(() => {
    if (!timeoutManager.hasAnyTimedOut) {
      setShowFallbacks(false);
    }
  }, [timeoutManager.hasAnyTimedOut]);

  const handleRefreshAll = () => {
    // Clear all timeouts
    timeoutManager.timedOutOperations.forEach(operationId => {
      timeoutManager.resetTimeout(operationId);
    });
    
    // Call custom refresh handler
    if (onRefreshAll) {
      onRefreshAll();
    }
    
    setShowFallbacks(false);
  };

  const handleRetryAll = () => {
    // Reset all timeouts
    timeoutManager.timedOutOperations.forEach(operationId => {
      timeoutManager.resetTimeout(operationId);
    });
    
    // Call custom retry handler
    if (onRetryAll) {
      onRetryAll();
    }
    
    setShowFallbacks(false);
  };

  return (
    <div className={className}>
      {/* Main content */}
      {children}
      
      {/* Timeout fallbacks */}
      {showFallbacks && enableTimeoutFallbacks && (
        <div className="space-y-4 mt-4">
          {/* Multiple timeouts summary */}
          {showMultipleTimeoutSummary && timeoutManager.timedOutOperations.length > maxIndividualTimeouts && (
            <MultipleTimeoutsDisplay
              timedOutOperations={timeoutManager.timedOutOperations}
              onRefreshAll={handleRefreshAll}
              onRetryAll={handleRetryAll}
            />
          )}
          
          {/* Individual timeout displays */}
          {timeoutManager.timedOutOperations.length <= maxIndividualTimeouts && 
            timeoutManager.timedOutOperations.map(operationId => (
              <TimeoutFallbackUI
                key={operationId}
                operationId={operationId}
                variant="inline"
                onRefresh={() => {
                  timeoutManager.resetTimeout(operationId);
                  if (onRefreshAll) {
                    onRefreshAll();
                  }
                }}
                onRetry={() => {
                  timeoutManager.resetTimeout(operationId);
                  if (onRetryAll) {
                    onRetryAll();
                  }
                }}
                remainingTime={timeoutManager.getRemainingTime(operationId)}
              />
            ))
          }
        </div>
      )}
    </div>
  );
};

/**
 * Loading fallback component for when initial loading takes too long
 */
export const LoadingFallback: React.FC<{
  isLoading: boolean;
  hasTimedOut: boolean;
  message?: string;
  onRefresh?: () => void;
  onRetry?: () => void;
  className?: string;
}> = ({
  isLoading,
  hasTimedOut,
  message = 'Loading is taking longer than expected',
  onRefresh,
  onRetry,
  className = '',
}) => {
  if (!isLoading || !hasTimedOut) {
    return null;
  }

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-yellow-800 font-medium">
            Still Loading...
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            {message}
          </p>
        </div>
        <div className="flex space-x-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-3 py-1 rounded-md border border-yellow-300"
            >
              Retry
            </button>
          )}
          {onRefresh && (
            <RefreshButton
              size="small"
              showText={false}
              reason="timeout"
              onRefresh={onRefresh}
              className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300"
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Network fallback component for connection issues
 */
export const NetworkFallback: React.FC<{
  isOffline: boolean;
  hasConnectionIssues: boolean;
  onRefresh?: () => void;
  onRetry?: () => void;
  className?: string;
}> = ({
  isOffline,
  hasConnectionIssues,
  onRefresh,
  onRetry,
  className = '',
}) => {
  if (!isOffline && !hasConnectionIssues) {
    return null;
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-red-800 font-medium">
            {isOffline ? 'No Internet Connection' : 'Connection Issues'}
          </p>
          <p className="text-sm text-red-700 mt-1">
            {isOffline 
              ? 'Please check your internet connection and try again.'
              : 'Having trouble connecting to the game servers.'
            }
          </p>
        </div>
        <div className="flex space-x-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded-md border border-red-300"
            >
              Retry
            </button>
          )}
          {onRefresh && (
            <RefreshButton
              size="small"
              showText={false}
              reason="connection"
              onRefresh={onRefresh}
              className="bg-red-100 text-red-800 hover:bg-red-200 border-red-300"
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Data fallback component for when data is unavailable
 */
export const DataFallback: React.FC<{
  hasData: boolean;
  isLoading: boolean;
  message?: string;
  onRefresh?: () => void;
  className?: string;
}> = ({
  hasData,
  isLoading,
  message = 'Unable to load data',
  onRefresh,
  className = '',
}) => {
  if (hasData || isLoading) {
    return null;
  }

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-800 font-medium">
            No Data Available
          </p>
          <p className="text-sm text-gray-700 mt-1">
            {message}
          </p>
        </div>
        {onRefresh && (
          <RefreshButton
            size="small"
            showText={false}
            reason="validation"
            onRefresh={onRefresh}
            className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300"
          />
        )}
      </div>
    </div>
  );
};
