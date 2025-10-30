import React from 'react';
import { LoadingSpinner } from './LoadingScreen';
import { useRetryMechanism } from '../hooks/useRetryMechanism';

interface RetryIndicatorProps {
  operationId: string;
  className?: string;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const RetryIndicator: React.FC<RetryIndicatorProps> = ({
  operationId,
  className = '',
  showDetails = false,
  size = 'medium',
}) => {
  const { getOperationState, retryOperation, cancelRetry } = useRetryMechanism();
  const state = getOperationState(operationId);

  if (!state || (!state.isRetrying && !state.hasExhaustedRetries)) {
    return null;
  }

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-2',
    large: 'text-base px-4 py-3',
  };

  const iconSizes = {
    small: 'small' as const,
    medium: 'small' as const,
    large: 'medium' as const,
  };

  if (state.isRetrying) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg ${sizeClasses[size]} ${className}`}>
        <div className="flex items-center space-x-2">
          <LoadingSpinner size={iconSizes[size]} color="red" />
          <div className="flex-1">
            <div className="font-medium text-yellow-800">
              Retrying operation...
            </div>
            {showDetails && (
              <div className="text-yellow-600 mt-1">
                <div>Attempt {state.currentAttempt + 1} of {state.maxAttempts + 1}</div>
                {state.nextRetryIn > 0 && (
                  <div>Next retry in {Math.ceil(state.nextRetryIn / 1000)}s</div>
                )}
                {state.lastError && (
                  <div className="text-xs mt-1">
                    Last error: {state.lastError.message}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => cancelRetry(operationId)}
            className="text-yellow-600 hover:text-yellow-800 text-xs underline"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state.hasExhaustedRetries) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg ${sizeClasses[size]} ${className}`}>
        <div className="flex items-center space-x-2">
          <span className="text-red-500 text-lg">⚠️</span>
          <div className="flex-1">
            <div className="font-medium text-red-800">
              Operation failed
            </div>
            {showDetails && state.lastError && (
              <div className="text-red-600 text-xs mt-1">
                {state.lastError.message}
              </div>
            )}
          </div>
          <button
            onClick={() => retryOperation(operationId)}
            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return null;
};

interface RetryStatusPanelProps {
  className?: string;
  maxOperationsToShow?: number;
}

export const RetryStatusPanel: React.FC<RetryStatusPanelProps> = ({
  className = '',
  maxOperationsToShow = 5,
}) => {
  const { getAllOperations, retryOperation, cancelRetry } = useRetryMechanism();
  const operations = getAllOperations();
  
  const activeOperations = operations.filter(op => 
    op.isRetrying || op.hasExhaustedRetries
  );

  if (activeOperations.length === 0) {
    return null;
  }

  const displayOperations = activeOperations.slice(0, maxOperationsToShow);
  const hasMoreOperations = activeOperations.length > maxOperationsToShow;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">Operation Status</h4>
        <span className="text-xs text-gray-500">
          {activeOperations.length} active
        </span>
      </div>

      <div className="space-y-2">
        {displayOperations.map((op) => (
          <div key={op.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center space-x-2 flex-1">
              {op.isRetrying ? (
                <LoadingSpinner size="small" color="red" />
              ) : (
                <span className="text-red-500">⚠️</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {op.id}
                </div>
                <div className="text-xs text-gray-500">
                  {op.isRetrying ? (
                    <>
                      Attempt {op.currentAttempt + 1}/{op.maxAttempts + 1}
                      {op.nextRetryIn > 0 && (
                        <span className="ml-2">
                          Next: {Math.ceil(op.nextRetryIn / 1000)}s
                        </span>
                      )}
                    </>
                  ) : (
                    'Failed after all retries'
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-1">
              {op.isRetrying ? (
                <button
                  onClick={() => cancelRetry(op.id)}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 underline"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => retryOperation(op.id)}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        ))}
        
        {hasMoreOperations && (
          <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
            +{activeOperations.length - maxOperationsToShow} more operations
          </div>
        )}
      </div>
    </div>
  );
};

interface RetryButtonProps {
  operationId: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'danger';
  children?: React.ReactNode;
}

export const RetryButton: React.FC<RetryButtonProps> = ({
  operationId,
  className = '',
  size = 'medium',
  variant = 'primary',
  children = 'Retry',
}) => {
  const { getOperationState, retryOperation } = useRetryMechanism();
  const state = getOperationState(operationId);

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-2 text-sm',
    large: 'px-4 py-3 text-base',
  };

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const isDisabled = !state || (!state.hasExhaustedRetries && !state.lastError);

  return (
    <button
      onClick={() => retryOperation(operationId)}
      disabled={isDisabled}
      className={`
        ${sizeClasses[size]} 
        ${variantClasses[variant]} 
        rounded font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  );
};

interface AutoRetryBannerProps {
  className?: string;
  onDisableAutoRetry?: () => void;
}

export const AutoRetryBanner: React.FC<AutoRetryBannerProps> = ({
  className = '',
  onDisableAutoRetry,
}) => {
  const { hasRetryingOperations, getAllOperations } = useRetryMechanism();
  const retryingOps = getAllOperations().filter(op => op.isRetrying);

  if (!hasRetryingOperations) {
    return null;
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center space-x-3">
        <LoadingSpinner size="small" color="blue" />
        <div className="flex-1">
          <div className="text-sm font-medium text-blue-900">
            Automatically retrying failed operations
          </div>
          <div className="text-xs text-blue-700">
            {retryingOps.length} operation{retryingOps.length !== 1 ? 's' : ''} retrying
          </div>
        </div>
        {onDisableAutoRetry && (
          <button
            onClick={onDisableAutoRetry}
            className="text-blue-600 hover:text-blue-800 text-xs underline"
          >
            Disable auto-retry
          </button>
        )}
      </div>
    </div>
  );
};
