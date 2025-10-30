import React from 'react';
import { LoadingSpinner } from './LoadingScreen';
import { useManualRefresh } from '../hooks/useManualRefresh';

type RefreshButtonProps = {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  showStatus?: boolean;
  className?: string;
  onRefresh?: () => void;
  reason?: string;
};

/**
 * Refresh button component with comprehensive feedback
 * Implements requirements 5.3 and 5.4 for manual refresh functionality
 */
export const RefreshButton: React.FC<RefreshButtonProps> = ({
  size = 'medium',
  showText = true,
  showStatus = false,
  className = '',
  onRefresh,
  reason
}) => {
  const {
    refreshForConnectionIssues,
    refreshForStaleData,
    refreshForValidationErrors,
    refreshForUserRequest,
    getRefreshStatusMessage,
    getRefreshButtonState,
    refreshNeeded
  } = useManualRefresh();

  const buttonState = getRefreshButtonState();
  const statusMessage = getRefreshStatusMessage();

  // Handle refresh click
  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh();
      return;
    }

    // Choose appropriate refresh function based on reason
    switch (reason) {
      case 'connection':
        await refreshForConnectionIssues();
        break;
      case 'stale':
        await refreshForStaleData();
        break;
      case 'validation':
        await refreshForValidationErrors();
        break;
      default:
        await refreshForUserRequest();
    }
  };

  // Size classes
  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-2 text-sm',
    large: 'px-4 py-2 text-base'
  };

  const iconSizeClasses = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300',
    warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300',
    error: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300'
  };

  // Get appropriate classes
  const baseClasses = `
    inline-flex items-center justify-center
    border rounded-md font-medium
    transition-colors duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
  `.trim();

  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[buttonState.variant]}
    ${className}
  `.trim();

  // Refresh icon
  const RefreshIcon = () => (
    <svg 
      className={`${iconSizeClasses[size]} ${buttonState.isRefreshing ? 'animate-spin' : ''}`}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
      />
    </svg>
  );

  // Button content
  const getButtonContent = () => {
    if (buttonState.isRefreshing) {
      return (
        <>
          <LoadingSpinner size="small" color="gray" />
          {showText && <span className="ml-2">Refreshing...</span>}
        </>
      );
    }

    if (buttonState.cooldown > 0) {
      const seconds = Math.ceil(buttonState.cooldown / 1000);
      return (
        <>
          <RefreshIcon />
          {showText && <span className="ml-2">Wait {seconds}s</span>}
        </>
      );
    }

    // Default content based on urgency and state
    if (buttonState.urgency === 'high') {
      return (
        <>
          <RefreshIcon />
          {showText && (
            <span className="ml-2">
              {reason === 'connection' ? 'Retry' : 
               reason === 'stale' ? 'Update' :
               reason === 'validation' ? 'Fix' :
               'Refresh'}
            </span>
          )}
        </>
      );
    }

    return (
      <>
        <RefreshIcon />
        {showText && <span className="ml-2">Refresh</span>}
      </>
    );
  };

  // Tooltip text
  const getTooltipText = () => {
    if (buttonState.isRefreshing) {
      return 'Refreshing game state...';
    }
    
    if (buttonState.cooldown > 0) {
      const seconds = Math.ceil(buttonState.cooldown / 1000);
      return `Please wait ${seconds} seconds before refreshing again`;
    }
    
    if (refreshNeeded) {
      return 'Refresh recommended - click to update game state';
    }
    
    return 'Refresh game state';
  };

  return (
    <div className="inline-flex flex-col items-center">
      <button
        onClick={handleRefresh}
        disabled={buttonState.isDisabled}
        className={buttonClasses}
        title={getTooltipText()}
        aria-label={getTooltipText()}
      >
        {getButtonContent()}
      </button>
      
      {showStatus && (
        <div className={`mt-1 text-xs text-center max-w-xs ${
          buttonState.variant === 'error' ? 'text-red-600' :
          buttonState.variant === 'warning' ? 'text-yellow-600' :
          'text-gray-500'
        }`}>
          {statusMessage}
        </div>
      )}
    </div>
  );
};

/**
 * Compact refresh button for tight spaces
 */
export const CompactRefreshButton: React.FC<Omit<RefreshButtonProps, 'size' | 'showText'>> = (props) => (
  <RefreshButton {...props} size="small" showText={false} />
);

/**
 * Refresh button with status text
 */
export const RefreshButtonWithStatus: React.FC<Omit<RefreshButtonProps, 'showStatus'>> = (props) => (
  <RefreshButton {...props} showStatus={true} />
);
