import React from 'react';
import { RefreshButton } from './RefreshButton';

interface TimeoutFallbackUIProps {
  /** The operation that timed out */
  operationId: string;
  /** Custom message to display */
  message?: string;
  /** Whether to show manual refresh option */
  showRefresh?: boolean;
  /** Custom refresh handler */
  onRefresh?: () => void;
  /** Whether to show retry option */
  showRetry?: boolean;
  /** Custom retry handler */
  onRetry?: () => void;
  /** Variant of the fallback UI */
  variant?: 'full' | 'inline' | 'compact';
  /** Additional CSS classes */
  className?: string;
  /** Remaining time until next auto-retry (if applicable) */
  remainingTime?: number;
}

/**
 * Fallback UI component shown when operations timeout
 * Addresses Requirements: 5.1, 5.3, 5.4
 */
export const TimeoutFallbackUI: React.FC<TimeoutFallbackUIProps> = ({
  operationId,
  message,
  showRefresh = true,
  onRefresh,
  showRetry = true,
  onRetry,
  variant = 'inline',
  className = '',
  remainingTime,
}) => {
  const defaultMessage = getDefaultMessage(operationId);
  const displayMessage = message || defaultMessage;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 text-sm ${className}`}>
        <span className="text-yellow-600">⏱️</span>
        <span className="text-gray-700">Taking longer than expected</span>
        {showRefresh && onRefresh && (
          <RefreshButton
            size="small"
            showText={false}
            reason="timeout"
            onRefresh={onRefresh}
            className="ml-2"
          />
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 ${className}`}>
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Taking Longer Than Expected
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {displayMessage}
            </p>
            {remainingTime && remainingTime > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                Auto-retry in {Math.ceil(remainingTime / 1000)}s
              </p>
            )}
          </div>
          
          <div className="flex flex-col space-y-3">
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            )}
            {showRefresh && onRefresh && (
              <RefreshButton
                size="medium"
                showText={true}
                reason="timeout"
                onRefresh={onRefresh}
                className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
              />
            )}
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              If this problem persists, try refreshing the page
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Taking Longer Than Expected
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            {displayMessage}
          </p>
          {remainingTime && remainingTime > 0 && (
            <p className="mt-1 text-xs text-yellow-600">
              Auto-retry in {Math.ceil(remainingTime / 1000)}s
            </p>
          )}
          
          <div className="mt-3 flex space-x-2">
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className="text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-3 py-1 rounded-md border border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Try Again
              </button>
            )}
            {showRefresh && onRefresh && (
              <RefreshButton
                size="small"
                showText={true}
                reason="timeout"
                onRefresh={onRefresh}
                className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Get default timeout message based on operation ID
 */
function getDefaultMessage(operationId: string): string {
  const messages: Record<string, string> = {
    'initial-load': 'The game is taking longer to load than usual. This might be due to network conditions.',
    'join-game': 'Joining the game is taking longer than expected. Please check your connection.',
    'start-game': 'Starting the game is taking longer than usual. Please wait or try again.',
    'refresh-game': 'Refreshing game data is taking longer than expected.',
    'network-request': 'The network request is taking longer than usual.',
  };

  return messages[operationId] || 'This operation is taking longer than expected.';
}

/**
 * Timeout indicator component for showing remaining time
 */
export const TimeoutIndicator: React.FC<{
  remainingTime: number;
  totalTime: number;
  className?: string;
}> = ({ remainingTime, totalTime, className = '' }) => {
  const progress = Math.max(0, Math.min(100, ((totalTime - remainingTime) / totalTime) * 100));
  const seconds = Math.ceil(remainingTime / 1000);

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div 
          className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-gray-600 text-xs font-mono">
        {seconds}s
      </span>
    </div>
  );
};

/**
 * Multiple timeouts display component
 */
export const MultipleTimeoutsDisplay: React.FC<{
  timedOutOperations: string[];
  onRefreshAll?: () => void;
  onRetryAll?: () => void;
  className?: string;
}> = ({ timedOutOperations, onRefreshAll, onRetryAll, className = '' }) => {
  if (timedOutOperations.length === 0) {
    return null;
  }

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Multiple Operations Taking Longer Than Expected
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            {timedOutOperations.length} operation{timedOutOperations.length !== 1 ? 's' : ''} 
            {timedOutOperations.length === 1 ? ' is' : ' are'} experiencing delays.
          </p>
          
          <div className="mt-2">
            <ul className="text-xs text-yellow-600 space-y-1">
              {timedOutOperations.slice(0, 3).map((operationId) => (
                <li key={operationId}>
                  • {getOperationDisplayName(operationId)}
                </li>
              ))}
              {timedOutOperations.length > 3 && (
                <li>• And {timedOutOperations.length - 3} more...</li>
              )}
            </ul>
          </div>
          
          <div className="mt-3 flex space-x-2">
            {onRetryAll && (
              <button
                onClick={onRetryAll}
                className="text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-3 py-1 rounded-md border border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Retry All
              </button>
            )}
            {onRefreshAll && (
              <RefreshButton
                size="small"
                showText={true}
                reason="timeout"
                onRefresh={onRefreshAll}
                className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Get display name for operation ID
 */
function getOperationDisplayName(operationId: string): string {
  const names: Record<string, string> = {
    'initial-load': 'Initial loading',
    'join-game': 'Joining game',
    'start-game': 'Starting game',
    'refresh-game': 'Refreshing data',
    'network-request': 'Network request',
  };

  return names[operationId] || operationId.replace(/-/g, ' ');
}
