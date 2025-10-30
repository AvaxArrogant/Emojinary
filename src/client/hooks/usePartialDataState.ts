import { useMemo } from 'react';
import { useValidatedGameData } from './useValidatedGameData';
import { useGameActions } from './useGameActions';

/**
 * Hook for managing partial data states gracefully
 * Implements requirements 1.1, 4.1, and 5.4 for partial data handling
 */
export const usePartialDataState = () => {
  const {
    hasValidGameData,
    hasValidPlayerData,
    hasValidUserData,
    hasValidRoundData,
    validationStatus,
    dataFreshness,
    safeGameState,
    safePlayersArray
  } = useValidatedGameData();
  
  const { loading, error } = useGameActions();

  // Determine what UI elements can be shown based on available data
  const uiCapabilities = useMemo(() => {
    return {
      // Basic UI elements that can always be shown
      canShowHeader: true,
      canShowFooter: true,
      canShowLoadingStates: true,
      
      // Game-specific UI elements
      canShowGameInfo: hasValidGameData,
      canShowGameStatus: hasValidGameData,
      canShowGameId: hasValidGameData && safeGameState.id !== 'loading',
      
      // Player-related UI elements
      canShowPlayerList: true, // Always show structure, even if empty
      canShowPlayerCount: hasValidPlayerData,
      canShowPlayerDetails: hasValidPlayerData && safePlayersArray.length > 0,
      canShowEmptyPlayerState: !hasValidPlayerData || safePlayersArray.length === 0,
      
      // User-specific UI elements
      canShowUserStatus: hasValidUserData,
      canShowJoinButton: hasValidGameData, // Need game state to determine if user can join
      canShowStartButton: hasValidGameData && hasValidUserData && hasValidPlayerData,
      canShowModeratorControls: hasValidUserData && hasValidPlayerData,
      
      // Interactive elements
      canEnableJoinAction: hasValidGameData && !loading && !error,
      canEnableStartAction: hasValidGameData && hasValidUserData && hasValidPlayerData && !loading && !error,
      canEnableRefreshAction: true, // Always allow refresh
      
      // Round-specific UI elements
      canShowRoundInfo: hasValidRoundData,
      canShowGameplayElements: hasValidRoundData && hasValidUserData
    };
  }, [
    hasValidGameData,
    hasValidPlayerData,
    hasValidUserData,
    hasValidRoundData,
    safeGameState,
    safePlayersArray,
    loading,
    error
  ]);

  // Determine loading states for different sections
  const sectionLoadingStates = useMemo(() => {
    return {
      gameInfo: !hasValidGameData && loading,
      playerList: !hasValidPlayerData && loading,
      userStatus: !hasValidUserData && loading,
      roundInfo: !hasValidRoundData && loading,
      
      // Overall loading state
      isInitialLoading: !validationStatus.partialDataAvailable && loading,
      isPartiallyLoaded: validationStatus.partialDataAvailable && loading,
      isFullyLoaded: validationStatus.allDataValid && !loading
    };
  }, [
    hasValidGameData,
    hasValidPlayerData,
    hasValidUserData,
    hasValidRoundData,
    validationStatus,
    loading
  ]);

  // Determine what fallback content to show for missing sections
  const fallbackContent = useMemo(() => {
    return {
      gameInfo: !hasValidGameData ? {
        type: 'loading' as const,
        message: 'Loading game information...',
        showSpinner: loading,
        showRefresh: !loading
      } : null,
      
      playerList: !hasValidPlayerData ? {
        type: 'empty' as const,
        message: 'No player data available',
        showSpinner: loading,
        showRefresh: !loading
      } : null,
      
      userStatus: !hasValidUserData ? {
        type: 'loading' as const,
        message: 'Loading user information...',
        showSpinner: loading,
        showRefresh: !loading
      } : null,
      
      roundInfo: !hasValidRoundData ? {
        type: 'empty' as const,
        message: 'No active round',
        showSpinner: false,
        showRefresh: false
      } : null
    };
  }, [
    hasValidGameData,
    hasValidPlayerData,
    hasValidUserData,
    hasValidRoundData,
    loading
  ]);

  // Determine interaction restrictions based on data availability
  const interactionRestrictions = useMemo(() => {
    const restrictions: string[] = [];
    
    if (!hasValidGameData) {
      restrictions.push('Game data required for most actions');
    }
    
    if (!hasValidUserData) {
      restrictions.push('User authentication required');
    }
    
    if (!hasValidPlayerData) {
      restrictions.push('Player data required for game actions');
    }
    
    if (dataFreshness.isVeryStale) {
      restrictions.push('Data is outdated - refresh recommended');
    }
    
    if (error) {
      restrictions.push(`Error: ${error}`);
    }
    
    return restrictions;
  }, [
    hasValidGameData,
    hasValidUserData,
    hasValidPlayerData,
    dataFreshness.isVeryStale,
    error
  ]);

  // Determine priority actions based on current state
  const priorityActions = useMemo(() => {
    const actions: Array<{
      type: 'refresh' | 'join' | 'wait';
      message: string;
      urgency: 'low' | 'medium' | 'high';
    }> = [];
    
    if (validationStatus.needsRefresh) {
      actions.push({
        type: 'refresh',
        message: 'Refresh required to continue',
        urgency: 'high'
      });
    } else if (dataFreshness.isVeryStale) {
      actions.push({
        type: 'refresh',
        message: 'Data is outdated - refresh recommended',
        urgency: 'medium'
      });
    } else if (!validationStatus.allDataValid && !loading) {
      actions.push({
        type: 'refresh',
        message: 'Some data is missing - try refreshing',
        urgency: 'medium'
      });
    } else if (loading) {
      actions.push({
        type: 'wait',
        message: 'Loading data...',
        urgency: 'low'
      });
    }
    
    return actions;
  }, [
    validationStatus.needsRefresh,
    validationStatus.allDataValid,
    dataFreshness.isVeryStale,
    loading
  ]);

  // Get user-friendly status message
  const getStatusMessage = () => {
    if (sectionLoadingStates.isInitialLoading) {
      return 'Loading game...';
    }
    
    if (sectionLoadingStates.isPartiallyLoaded) {
      return 'Loading additional data...';
    }
    
    if (error) {
      return `Error: ${error}`;
    }
    
    if (dataFreshness.isVeryStale) {
      return 'Data is outdated';
    }
    
    if (!validationStatus.allDataValid) {
      return 'Some data is unavailable';
    }
    
    if (sectionLoadingStates.isFullyLoaded) {
      return 'Ready';
    }
    
    return 'Initializing...';
  };

  return {
    // UI capabilities
    uiCapabilities,
    
    // Loading states
    sectionLoadingStates,
    
    // Fallback content
    fallbackContent,
    
    // Interaction restrictions
    interactionRestrictions,
    canInteract: interactionRestrictions.length === 0,
    
    // Priority actions
    priorityActions,
    
    // Status
    statusMessage: getStatusMessage(),
    
    // Data availability summary
    dataAvailability: {
      game: hasValidGameData,
      players: hasValidPlayerData,
      user: hasValidUserData,
      round: hasValidRoundData,
      overall: validationStatus.allDataValid,
      partial: validationStatus.partialDataAvailable
    }
  };
};
