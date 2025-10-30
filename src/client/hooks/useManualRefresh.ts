import { useState, useCallback, useRef } from 'react';
import { useGameActions } from './useGameActions';
import { useValidatedGameData } from './useValidatedGameData';

/**
 * Hook for manual refresh functionality with comprehensive feedback
 * Implements requirements 5.3 and 5.4 for manual refresh and error handling
 */
export const useManualRefresh = () => {
  const { refreshGameState, loading, error } = useGameActions();
  const { validationStatus, dataFreshness } = useValidatedGameData();
  
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  
  // Track refresh attempts to prevent spam
  const refreshAttempts = useRef<number[]>([]);
  const maxRefreshesPerMinute = 10;

  // Check if refresh is needed based on data validation status
  const refreshNeeded = validationStatus.needsRefresh || 
                       dataFreshness.isVeryStale || 
                       !validationStatus.allDataValid;

  // Check if refresh is available (not rate limited)
  const canRefresh = useCallback(() => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old attempts
    refreshAttempts.current = refreshAttempts.current.filter(time => time > oneMinuteAgo);
    
    // Check if under rate limit
    return refreshAttempts.current.length < maxRefreshesPerMinute;
  }, []);

  // Get time until next refresh is allowed
  const getRefreshCooldown = useCallback(() => {
    if (canRefresh()) return 0;
    
    const oldestAttempt = Math.min(...refreshAttempts.current);
    const cooldownEnd = oldestAttempt + 60000;
    return Math.max(0, cooldownEnd - Date.now());
  }, [canRefresh]);

  // Manual refresh with comprehensive error handling and feedback
  const performManualRefresh = useCallback(async (reason?: string) => {
    if (!canRefresh()) {
      const cooldown = getRefreshCooldown();
      const seconds = Math.ceil(cooldown / 1000);
      setRefreshError(`Please wait ${seconds} seconds before refreshing again`);
      return false;
    }

    try {
      setIsManualRefreshing(true);
      setRefreshError(null);
      
      // Record refresh attempt
      refreshAttempts.current.push(Date.now());
      
      console.log(`Manual refresh triggered${reason ? ` (${reason})` : ''}`);
      
      await refreshGameState();
      
      // Update refresh tracking
      setRefreshCount(prev => prev + 1);
      setLastRefreshTime(Date.now());
      
      console.log('Manual refresh completed successfully');
      return true;
      
    } catch (error) {
      console.error('Manual refresh failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Refresh failed';
      setRefreshError(errorMessage);
      
      return false;
    } finally {
      setIsManualRefreshing(false);
    }
  }, [refreshGameState, canRefresh, getRefreshCooldown]);

  // Refresh with specific reason
  const refreshForConnectionIssues = useCallback(() => {
    return performManualRefresh('connection issues');
  }, [performManualRefresh]);

  const refreshForStaleData = useCallback(() => {
    return performManualRefresh('stale data');
  }, [performManualRefresh]);

  const refreshForValidationErrors = useCallback(() => {
    return performManualRefresh('validation errors');
  }, [performManualRefresh]);

  const refreshForUserRequest = useCallback(() => {
    return performManualRefresh('user request');
  }, [performManualRefresh]);

  // Clear refresh error
  const clearRefreshError = useCallback(() => {
    setRefreshError(null);
  }, []);

  // Get refresh status message
  const getRefreshStatusMessage = useCallback(() => {
    if (isManualRefreshing || loading) {
      return 'Refreshing game state...';
    }
    
    if (refreshError) {
      return `Refresh failed: ${refreshError}`;
    }
    
    if (error) {
      return `Game error: ${error}`;
    }
    
    if (lastRefreshTime) {
      const timeSince = Date.now() - lastRefreshTime;
      const seconds = Math.floor(timeSince / 1000);
      const minutes = Math.floor(seconds / 60);
      
      if (minutes > 0) {
        return `Last refreshed ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
      } else if (seconds > 0) {
        return `Last refreshed ${seconds} second${seconds === 1 ? '' : 's'} ago`;
      } else {
        return 'Just refreshed';
      }
    }
    
    if (refreshNeeded) {
      return 'Refresh recommended';
    }
    
    return 'Data is up to date';
  }, [isManualRefreshing, loading, refreshError, error, lastRefreshTime, refreshNeeded]);

  // Get refresh button state
  const getRefreshButtonState = useCallback(() => {
    const isRefreshing = isManualRefreshing || loading;
    const isDisabled = isRefreshing || !canRefresh();
    const cooldown = getRefreshCooldown();
    
    let variant: 'primary' | 'secondary' | 'warning' | 'error' = 'secondary';
    let urgency: 'low' | 'medium' | 'high' = 'low';
    
    if (refreshError || error) {
      variant = 'error';
      urgency = 'high';
    } else if (validationStatus.needsRefresh || dataFreshness.isVeryStale) {
      variant = 'warning';
      urgency = 'high';
    } else if (!validationStatus.allDataValid || dataFreshness.isStale) {
      variant = 'warning';
      urgency = 'medium';
    } else if (refreshNeeded) {
      variant = 'primary';
      urgency = 'medium';
    }
    
    return {
      isRefreshing,
      isDisabled,
      variant,
      urgency,
      cooldown,
      canRefresh: canRefresh()
    };
  }, [
    isManualRefreshing,
    loading,
    canRefresh,
    getRefreshCooldown,
    refreshError,
    error,
    validationStatus,
    dataFreshness,
    refreshNeeded
  ]);

  return {
    // Refresh functions
    performManualRefresh,
    refreshForConnectionIssues,
    refreshForStaleData,
    refreshForValidationErrors,
    refreshForUserRequest,
    
    // State
    isManualRefreshing,
    refreshCount,
    lastRefreshTime,
    refreshError,
    refreshNeeded,
    
    // Status helpers
    getRefreshStatusMessage,
    getRefreshButtonState,
    clearRefreshError,
    canRefresh: canRefresh(),
    refreshCooldown: getRefreshCooldown()
  };
};
