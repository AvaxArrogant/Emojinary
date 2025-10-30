import React, { useEffect, useState } from 'react';
import { useGameActions } from '../hooks/useGameActions';
import { useGamePlayers } from '../hooks/useGamePlayers';
import { useValidatedGameData } from '../hooks/useValidatedGameData';
import { useResponsiveBreakpoint, getDeviceInfo } from '../utils/mobileResponsiveness';
import { useGame } from '../contexts/GameContext';

import { useConnectionState } from '../utils/connectionManager';
import { useComponentLoading } from '../hooks/useLoadingState';
import { useGameError } from '../hooks/useGameError';
import { useSoundEffects } from '../utils/soundEffects';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorDisplay } from './ErrorDisplay';
import { RefreshButton, CompactRefreshButton } from './RefreshButton';
import { PartialDataHandler } from './PartialDataHandler';
import { usePartialDataState } from '../hooks/usePartialDataState';
import { useEnhancedLoading, useOperationLoading } from '../hooks/useEnhancedLoading';
import { useEnhancedLoadingWithTimeout } from '../hooks/useEnhancedLoadingWithTimeout';

import { FallbackManager, LoadingFallback, NetworkFallback } from './FallbackManager';
import { TimeoutFallbackUI } from './TimeoutFallbackUI';
import { 
  PlayerListSkeleton, 
  GameInfoSkeleton, 
  LoadingOverlay,
  StartupLoadingScreen,
  JoinGameLoading,
  StartGameLoading
} from './SkeletonLoader';
import { 
  ComprehensiveLoadingIndicator, 
  LoadingStatusBadge 
} from './ComprehensiveLoadingIndicator';
import { 
  EnhancedConnectionStatus, 
  NetworkQualityIndicator,
  ConnectionProblemAlert 
} from './EnhancedConnectionStatus';
import { useConnectionMonitor, useConnectionAlerts } from '../hooks/useConnectionMonitor';
import { useRetryMechanism } from '../hooks/useRetryMechanism';
import { 
  RetryIndicator, 
  RetryStatusPanel, 
  AutoRetryBanner 
} from './RetryIndicator';
import { LobbyTimer, useLobbyTimerDisplay } from './LobbyTimer';
import { EnhancedPlayerList } from './EnhancedPlayerList';
import { PlayerCapacityIndicator } from './PlayerCapacityIndicator';

export const GameLobby: React.FC = () => {
  const { joinGame, startGame, loading, error, refreshGameState } = useGameActions();
  
  // Debug: Get raw game context data
  const { gameState: rawGameState, players: rawPlayers, currentUser: rawCurrentUser } = useGame();
  const { 
    isCurrentUserModerator, 
    canStartGame,
    gameReadyStatus 
  } = useGamePlayers();
  
  // Mobile responsiveness utilities
  const { isMobile } = useResponsiveBreakpoint();
  const deviceInfo = getDeviceInfo();
  
  // Use validated data with safe defaults
  const {
    safeGameState,
    safePlayersArray,
    safePlayerCount,
    safeCurrentUser,
    hasValidGameData,
    hasValidPlayerData,
    hasValidUserData,
    dataFreshness,
    validationStatus
  } = useValidatedGameData();
  
  const { isConnected: connected } = useConnectionState();
  const { isLoading: componentLoading, setLoading } = useComponentLoading('game-lobby');
  const { registerRetryableAction, hasNetworkError } = useGameError();
  const { play, playGameStart } = useSoundEffects();
  
  // Partial data state management
  const {
    uiCapabilities,
    fallbackContent,
    interactionRestrictions,
    canInteract
  } = usePartialDataState();

  // Enhanced loading state management with comprehensive indicators
  const { 
    isAnyLoading: hasActiveOperations, 
    hasTimedOutOperations
  } = useEnhancedLoading();
  
  const joinGameLoading = useOperationLoading('join-game');
  const startGameLoading = useOperationLoading('start-game');
  const refreshLoading = useOperationLoading('refresh-game');
  const initialLoading = useOperationLoading('initial-load');
  
  // Enhanced connection monitoring
  const connectionMonitor = useConnectionMonitor({
    pingInterval: 15000, // Test every 15 seconds
    maxFailures: 3,
  });
  
  const connectionAlerts = useConnectionAlerts();
  
  // Enhanced retry mechanism
  const retryMechanism = useRetryMechanism();

  // Safe values with fallbacks (needed for lobby timer)
  const safeCanStartGame = canStartGame || false;

  // Real-time player list updates with smooth animations
  const [lastPlayerCount, setLastPlayerCount] = useState(0);
  
  useEffect(() => {
    if (safePlayerCount !== lastPlayerCount) {
      setLastPlayerCount(safePlayerCount);
      
      // Play sound effect for player join/leave
      if (safePlayerCount > lastPlayerCount) {
        play('playerJoin');
      } else if (safePlayerCount < lastPlayerCount && lastPlayerCount > 0) {
        play('buttonClick'); // Use buttonClick as a substitute for player leave sound
      }
    }
  }, [safePlayerCount, lastPlayerCount, play]);

  // Lobby timer for automatic game start
  const {
    isTimerActive,
    handleTimerExpired,
    handleTimerReset,
  } = useLobbyTimerDisplay(safePlayerCount, safeCanStartGame, () => {
    console.log('Auto-starting game from lobby timer');
    handleStartGame();
  });

  // Timeout management for comprehensive fallback mechanisms
  const initialLoadingWithTimeout = useEnhancedLoadingWithTimeout('initial-load');
  const joinGameWithTimeout = useEnhancedLoadingWithTimeout('join-game');
  const startGameWithTimeout = useEnhancedLoadingWithTimeout('start-game');
  const refreshWithTimeout = useEnhancedLoadingWithTimeout('refresh-game');



  // Initialize loading for initial app startup with timeout fallback
  useEffect(() => {
    if (loading || componentLoading) {
      // Start regular loading indicator
      initialLoading.start({
        message: 'Loading game lobby...',
        timeout: 10000, // 10 seconds as per requirements
        progressSimulation: true,
      });

      // Start timeout-aware loading
      initialLoadingWithTimeout.startLoading({
        message: 'Loading game lobby...',
        timeout: 10000,
        enableProgress: true,
        progressSimulation: true,
        onTimeout: () => {
          console.warn('Initial loading timed out after 10 seconds');
        },
      });
    } else {
      initialLoading.stop();
      initialLoadingWithTimeout.stopLoading();
    }
  }, [loading, componentLoading, initialLoading, initialLoadingWithTimeout]);

  // Register retry operations
  useEffect(() => {
    // Register join game operation
    retryMechanism.registerOperation(
      'join-game',
      joinGame,
      {
        maxRetries: 3,
        baseDelay: 2000,
        backoffFactor: 1.5,
        retryCondition: (error) => {
          const message = error.message.toLowerCase();
          return (
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('fetch') ||
            message.includes('500') ||
            message.includes('502') ||
            message.includes('503')
          );
        },
      },
      {
        onSuccess: () => {
          console.log('Join game succeeded');
          play('playerJoin');
        },
        onFailure: (error) => {
          console.error('Join game failed after all retries:', error);
        },
        onRetryAttempt: (attempt, error) => {
          console.log(`Join game retry attempt ${attempt}:`, error.message);
        },
      }
    );

    // Register start game operation
    retryMechanism.registerOperation(
      'start-game',
      startGame,
      {
        maxRetries: 2,
        baseDelay: 3000,
        backoffFactor: 2,
      },
      {
        onSuccess: () => {
          console.log('Start game succeeded');
          playGameStart();
        },
        onFailure: (error) => {
          console.error('Start game failed after all retries:', error);
        },
      }
    );

    // Register refresh operation
    retryMechanism.registerOperation(
      'refresh-game',
      refreshGameState,
      {
        maxRetries: 5,
        baseDelay: 1000,
        backoffFactor: 1.2,
      },
      {
        onSuccess: () => {
          console.log('Refresh succeeded');
          play('success');
        },
        onFailure: (error) => {
          console.error('Refresh failed after all retries:', error);
        },
      }
    );
  }, [retryMechanism, joinGame, startGame, refreshGameState, play, playGameStart]);

  // Enhanced join game with comprehensive loading indicators, retry, and timeout fallback
  const handleJoinGame = async () => {
    console.log('Join game button clicked');
    
    try {
      // Start regular loading indicator
      joinGameLoading.start({
        message: 'Joining game...',
        timeout: 10000,
        progressSimulation: true,
      });

      // Start timeout-aware loading
      joinGameWithTimeout.startLoading({
        message: 'Joining game...',
        timeout: 8000, // 8 seconds for join operation
        enableProgress: true,
        progressSimulation: true,
        onTimeout: () => {
          console.warn('Join game operation timed out');
        },
      });
      
      setLoading(true, 'Joining game...');
      registerRetryableAction('join-game', joinGame);
      
      console.log('Executing join game with retry...');
      const result = await retryMechanism.executeWithRetry('join-game');
      
      if (result !== null) {
        console.log('Join game successful');
        joinGameLoading.updateMessage('Successfully joined!');
        joinGameWithTimeout.updateMessage('Successfully joined!');
        setTimeout(() => {
          joinGameLoading.stop();
          joinGameWithTimeout.stopLoading();
        }, 500);
      } else {
        console.log('Join game failed after retries');
        joinGameLoading.stop();
        joinGameWithTimeout.stopLoading('Join game failed after multiple attempts');
      }
    } catch (error) {
      console.error('Join game failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      joinGameLoading.stop();
      joinGameWithTimeout.stopLoading(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced start game with comprehensive loading indicators, retry, and timeout fallback
  const handleStartGame = async () => {
    try {
      // Start regular loading indicator
      startGameLoading.start({
        message: 'Starting game...',
        timeout: 10000,
        progressSimulation: true,
      });

      // Start timeout-aware loading
      startGameWithTimeout.startLoading({
        message: 'Starting game...',
        timeout: 10000, // 10 seconds for start operation
        enableProgress: true,
        progressSimulation: true,
        onTimeout: () => {
          console.warn('Start game operation timed out');
        },
      });
      
      setLoading(true, 'Starting game...');
      registerRetryableAction('start-game', startGame);
      
      startGameLoading.updateMessage('Preparing rounds...');
      startGameWithTimeout.updateMessage('Preparing rounds...');
      const result = await retryMechanism.executeWithRetry('start-game');
      
      if (result !== null) {
        console.log('Start game successful');
        startGameLoading.updateMessage('Game started!');
        startGameWithTimeout.updateMessage('Game started!');
        setTimeout(() => {
          startGameLoading.stop();
          startGameWithTimeout.stopLoading();
        }, 500);
      } else {
        console.log('Start game failed after retries');
        startGameLoading.stop();
        startGameWithTimeout.stopLoading('Start game failed after multiple attempts');
      }
    } catch (error) {
      console.error('Start game failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      startGameLoading.stop();
      startGameWithTimeout.stopLoading(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced refresh with comprehensive loading indicators, retry, and timeout fallback
  const handleRefresh = async () => {
    try {
      // Start regular loading indicator
      refreshLoading.start({
        message: 'Refreshing game state...',
        timeout: 10000,
        progressSimulation: true,
      });

      // Start timeout-aware loading
      refreshWithTimeout.startLoading({
        message: 'Refreshing game state...',
        timeout: 6000, // 6 seconds for refresh operation
        enableProgress: true,
        progressSimulation: true,
        onTimeout: () => {
          console.warn('Refresh operation timed out');
        },
      });
      
      setLoading(true, 'Refreshing...');
      registerRetryableAction('refresh-game', refreshGameState);
      
      const result = await retryMechanism.executeWithRetry('refresh-game');
      
      if (result !== null) {
        console.log('Refresh successful');
        refreshLoading.updateMessage('Refreshed successfully!');
        refreshWithTimeout.updateMessage('Refreshed successfully!');
        setTimeout(() => {
          refreshLoading.stop();
          refreshWithTimeout.stopLoading();
        }, 500);
      } else {
        console.log('Refresh failed after retries');
        refreshLoading.stop();
        refreshWithTimeout.stopLoading('Refresh failed after multiple attempts');
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      refreshLoading.stop();
      refreshWithTimeout.stopLoading(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show startup loading screen for initial load with timeout fallback
  if (initialLoading.isLoading && (!hasValidGameData || !hasValidPlayerData)) {
    return (
      <div>
        <StartupLoadingScreen
          progress={initialLoadingWithTimeout.progress || initialLoading.progress}
          message={initialLoadingWithTimeout.message || initialLoading.message}
          tips={[
            '🎭 Welcome to Emojirades!',
            '👥 Play with 2-8 players',
            '⏱️ Quick 2-minute rounds',
            '🏆 Guess emojis to win!',
          ]}
        />
        
        {/* Loading timeout fallback */}
        <LoadingFallback
          isLoading={initialLoadingWithTimeout.isLoading}
          hasTimedOut={initialLoadingWithTimeout.hasTimedOut}
          message="Initial loading is taking longer than expected. This might be due to network conditions."
          onRefresh={handleRefresh}
          onRetry={() => initialLoadingWithTimeout.retryLoading()}
          className="fixed bottom-4 left-4 right-4 z-50"
        />
      </div>
    );
  }

  // Use validated data with comprehensive fallbacks
  const safeGameReadyStatus = gameReadyStatus || {
    isReady: false,
    message: hasValidGameData ? 'Initializing game...' : 'Loading game data...',
    needsMorePlayers: 2,
    canAcceptMorePlayers: true,
    statusType: 'waiting' as const,
  };

  const safeIsCurrentUserModerator = isCurrentUserModerator || false;
  
  // Safe loading states with fallbacks
  const safeLoading = loading ?? false;
  const safeComponentLoading = componentLoading ?? false;
  const safeError = error || null;
  const safeConnected = connected ?? true; // Default to connected to avoid showing error states initially
  const safeHasNetworkError = hasNetworkError ?? false;

  // Always render essential UI structure with loading overlays using validated data
  const showLoadingOverlay = safeLoading || safeComponentLoading;
  const showEmptyPlayerState = safePlayerCount === 0 && !showLoadingOverlay;
  const safeIsUserInGame = safeCurrentUser && safePlayersArray.some(p => p.id === safeCurrentUser.id);
  const showJoinButton = !safeIsUserInGame && safePlayerCount < 8;
  
  // EMERGENCY FIX: Force UI capabilities to show buttons
  const emergencyUICapabilities = {
    ...uiCapabilities,
    canShowJoinButton: true,
    canShowStartButton: true,
    canEnableJoinAction: true,
    canEnableStartAction: true
  };
  
  // Debug: Log current state
  console.log('GameLobby Debug:', {
    rawGameState,
    rawPlayers,
    rawCurrentUser,
    safeGameState,
    safePlayersArray,
    safePlayerCount,
    hasValidGameData,
    hasValidPlayerData,
    hasValidUserData,
    uiCapabilities,
    showJoinButton,
    safeIsUserInGame
  });
  
  // Data validation status indicators
  const showDataValidationWarning = !validationStatus.allDataValid && validationStatus.partialDataAvailable;
  const showDataStaleWarning = dataFreshness.isStale && hasValidGameData;


  return (
    <ErrorBoundary>
      <FallbackManager
        enableTimeoutFallbacks={true}
        showMultipleTimeoutSummary={true}
        onRefreshAll={handleRefresh}
        onRetryAll={() => {
          // Retry all timed out operations
          if (joinGameWithTimeout.hasTimedOut) {
            joinGameWithTimeout.retryLoading();
          }
          if (startGameWithTimeout.hasTimedOut) {
            startGameWithTimeout.retryLoading();
          }
          if (refreshWithTimeout.hasTimedOut) {
            refreshWithTimeout.retryLoading();
          }
          if (initialLoadingWithTimeout.hasTimedOut) {
            initialLoadingWithTimeout.retryLoading();
          }
        }}
      >
        <PartialDataHandler
          showLoadingIndicators={true}
          allowInteraction={canInteract}
        >
        <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 safe-area-padding ${
          deviceInfo.isIOS ? 'ios-optimized ios-safe-area' : 
          deviceInfo.isAndroid ? 'android-optimized' : ''
        }`}>
          {/* EMERGENCY DEBUG PANEL */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-red-100 border-b-2 border-red-300 p-2 text-xs">
            <div className="max-w-4xl mx-auto">
              <div className="font-bold text-red-800 mb-1">🚨 EMERGENCY DEBUG (Temporary)</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-red-700">
                <div>Game ID: {rawGameState?.id || 'null'}</div>
                <div>Status: {rawGameState?.status || 'null'}</div>
                <div>Players: {Object.keys(rawPlayers || {}).length}</div>
                <div>User: {rawCurrentUser?.username || 'null'}</div>
                <div>Valid Game: {hasValidGameData ? '✅' : '❌'}</div>
                <div>Valid Players: {hasValidPlayerData ? '✅' : '❌'}</div>
                <div>Valid User: {hasValidUserData ? '✅' : '❌'}</div>
                <div>Show Join: {showJoinButton ? '✅' : '❌'}</div>
              </div>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={handleRefresh}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                >
                  🗑️ Reset All
                </button>
              </div>
            </div>
          </div>
          <div className={`container-mobile ${isMobile ? 'px-4' : 'px-6'} pt-20`}>
        {/* Header - Always rendered */}
        <div className={`text-center ${
          deviceInfo.orientation === 'landscape' && isMobile 
            ? 'landscape-mobile-header' 
            : isMobile 
            ? 'portrait-mobile-header' 
            : 'py-8'
        }`}>
          {/* Debug Panel - Temporary */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-left text-xs">
            <h3 className="font-bold text-yellow-800 mb-2">🐛 Debug Info (Temporary)</h3>
            <div className="space-y-1 text-yellow-700">
              <div><strong>Game ID:</strong> {rawGameState?.id || 'null'}</div>
              <div><strong>Game Status:</strong> {rawGameState?.status || 'null'}</div>
              <div><strong>Player Count:</strong> {Object.keys(rawPlayers || {}).length}</div>
              <div><strong>Current User:</strong> {rawCurrentUser?.username || 'null'}</div>
              <div><strong>Has Valid Game Data:</strong> {hasValidGameData ? '✅' : '❌'}</div>
              <div><strong>Has Valid Player Data:</strong> {hasValidPlayerData ? '✅' : '❌'}</div>
              <div><strong>Has Valid User Data:</strong> {hasValidUserData ? '✅' : '❌'}</div>
              <div><strong>Can Show Join Button:</strong> {uiCapabilities.canShowJoinButton ? '✅' : '❌'}</div>
              <div><strong>Show Join Button:</strong> {showJoinButton ? '✅' : '❌'}</div>
              <div><strong>Is User In Game:</strong> {safeIsUserInGame ? '✅' : '❌'}</div>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleRefresh}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                🔄 Refresh State
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
              >
                🗑️ Reset All
              </button>
            </div>
          </div>
          
          <h1 className={`font-bold text-gray-900 mb-2 ${
            isMobile ? 'text-3xl' : 'text-4xl'
          }`}>
            🎭 Emojirades
          </h1>
          <p className={`text-gray-600 px-2 ${
            isMobile ? 'text-base leading-relaxed' : 'text-lg'
          }`}>
            Guess the phrase from emojis! A fun multiplayer game for Reddit.
          </p>
          
          {/* Welcome message - shown for empty state */}
          {showEmptyPlayerState && (
            <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mx-4 border border-blue-200">
              <div className="text-2xl mb-2">🎉</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Welcome to Emojirades!
              </h2>
              <p className="text-sm text-gray-700 mb-3">
                You're the first one here! Start a new game and invite others to join the fun.
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
                <span className="flex items-center">
                  <span className="mr-1">👥</span>
                  2-8 players
                </span>
                <span className="flex items-center">
                  <span className="mr-1">⏱️</span>
                  2 min rounds
                </span>
                <span className="flex items-center">
                  <span className="mr-1">🎯</span>
                  Easy to learn
                </span>
              </div>
            </div>
          )}
        </div>
          
          {/* Connection & Game Status Indicators */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {/* Data Validation Status */}
            {showDataValidationWarning && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                <span className="mr-2">⚠️</span>
                Partial Data Available
              </div>
            )}
            
            {showDataStaleWarning && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                <span className="mr-2">🕐</span>
                Data May Be Outdated
              </div>
            )}
            
            {validationStatus.needsRefresh && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                <span className="mr-2">🔄</span>
                Refresh Needed
              </div>
            )}
            
            {/* Interaction restrictions indicator */}
            {interactionRestrictions.length > 0 && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                <span className="mr-2">🚫</span>
                Limited Functionality
              </div>
            )}
            
            {/* Enhanced Network Connection Status */}
            <EnhancedConnectionStatus 
              size="small" 
              inline={true}
              className="px-3 py-1 rounded-full text-sm"
            />
            
            {/* Network Quality Indicator */}
            <NetworkQualityIndicator 
              showLabel={true}
              className="px-2 py-1 bg-gray-50 rounded-full text-xs"
            />
            
            {/* Game Readiness Status */}
            {gameReadyStatus.statusType === 'ready' && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                <span className="mr-1">✅</span>
                Game Ready
              </div>
            )}
            {gameReadyStatus.statusType === 'waiting' && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                Waiting for Players
              </div>
            )}
            {gameReadyStatus.statusType === 'full' && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                <span className="mr-1">🎯</span>
                Lobby Full
              </div>
            )}
            {gameReadyStatus.statusType === 'error' && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                <span className="mr-1">⚠️</span>
                Game Error
              </div>
            )}
            
            {/* Comprehensive Loading Status Badge */}
            {hasActiveOperations && (
              <LoadingStatusBadge className="px-3 py-1" />
            )}

            {/* Timeout Warning Indicator */}
            {hasTimedOutOperations && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                <span className="mr-2">⚠️</span>
                Some operations taking longer than expected
              </div>
            )}
          </div>
          
          {/* Enhanced Manual Refresh Button */}
          {(!safeConnected || safeHasNetworkError || safeError || hasTimedOutOperations || showDataValidationWarning || showDataStaleWarning) && (
            <div className="mt-2 flex justify-center">
              <RefreshButton
                size="small"
                showText={true}
                showStatus={false}
                reason={
                  !safeConnected || safeHasNetworkError ? 'connection' :
                  showDataStaleWarning ? 'stale' :
                  showDataValidationWarning ? 'validation' :
                  'user'
                }
                className="rounded-full"
              />
            </div>
          )}
          
          {/* Comprehensive Loading Indicator */}
          {hasActiveOperations && (
            <div className="mt-2 flex justify-center">
              <ComprehensiveLoadingIndicator
                showOperationDetails={true}
                maxOperationsToShow={2}
                className="max-w-sm"
              />
            </div>
          )}
          
          {/* Connection Problem Alerts */}
          {connectionAlerts.hasActiveAlerts && (
            <div className="mt-2 flex justify-center">
              <ConnectionProblemAlert
                className="max-w-md"
                onRetry={() => {
                  connectionMonitor.performManualTest();
                  handleRefresh();
                }}
                onDismiss={() => {
                  if (connectionAlerts.alerts.offline) connectionAlerts.dismissAlert('offline');
                  if (connectionAlerts.alerts.disconnected) connectionAlerts.dismissAlert('disconnected');
                  if (connectionAlerts.alerts.slowConnection) connectionAlerts.dismissAlert('slow');
                  if (connectionAlerts.alerts.unstableConnection) connectionAlerts.dismissAlert('unstable');
                  if (connectionAlerts.alerts.poorConnection) connectionAlerts.dismissAlert('poor');
                  if (connectionAlerts.alerts.multipleFailures) connectionAlerts.dismissAlert('failures');
                }}
              />
            </div>
          )}

          {/* Network Fallback for Connection Issues */}
          <NetworkFallback
            isOffline={!safeConnected}
            hasConnectionIssues={safeHasNetworkError || connectionMonitor.hasProblems}
            onRefresh={handleRefresh}
            onRetry={() => {
              connectionMonitor.performManualTest();
              handleRefresh();
            }}
            className="mt-2 max-w-md mx-auto"
          />

          {/* Timeout Fallbacks for Individual Operations */}
          {joinGameWithTimeout.hasTimedOut && (
            <div className="mt-2 flex justify-center">
              <TimeoutFallbackUI
                operationId="join-game"
                variant="inline"
                onRefresh={handleRefresh}
                onRetry={() => joinGameWithTimeout.retryLoading()}
                remainingTime={joinGameWithTimeout.remainingTime}
                className="max-w-md"
              />
            </div>
          )}

          {startGameWithTimeout.hasTimedOut && (
            <div className="mt-2 flex justify-center">
              <TimeoutFallbackUI
                operationId="start-game"
                variant="inline"
                onRefresh={handleRefresh}
                onRetry={() => startGameWithTimeout.retryLoading()}
                remainingTime={startGameWithTimeout.remainingTime}
                className="max-w-md"
              />
            </div>
          )}

          {refreshWithTimeout.hasTimedOut && (
            <div className="mt-2 flex justify-center">
              <TimeoutFallbackUI
                operationId="refresh-game"
                variant="inline"
                onRefresh={handleRefresh}
                onRetry={() => refreshWithTimeout.retryLoading()}
                remainingTime={refreshWithTimeout.remainingTime}
                className="max-w-md"
              />
            </div>
          )}
          
          {/* Auto Retry Banner */}
          {retryMechanism.hasRetryingOperations && (
            <div className="mt-2 flex justify-center">
              <AutoRetryBanner className="max-w-md" />
            </div>
          )}
          
          {/* Retry Status Panel */}
          {retryMechanism.operationCount > 0 && (
            <div className="mt-2 flex justify-center">
              <RetryStatusPanel 
                className="max-w-md"
                maxOperationsToShow={3}
              />
            </div>
          )}
        </div>

        <div className={`grid ${
          deviceInfo.orientation === 'landscape' && isMobile 
            ? 'landscape-mobile-grid' 
            : isMobile 
            ? 'portrait-mobile-grid' 
            : 'grid-cols-1 lg:grid-cols-2'
        } ${
          isMobile ? 'gap-4' : 'gap-6 lg:gap-8'
        }`}>
          {/* Game Info & Actions */}
          <div className={`bg-white rounded-lg shadow-md ${
            isMobile ? 'mx-4 p-4' : 'mx-0 p-6 rounded-xl shadow-lg'
          }`}>
            <h2 className={`font-semibold text-gray-900 mb-4 ${
              isMobile ? 'text-xl' : 'text-2xl'
            }`}>
              Game Lobby
            </h2>
            
            <div className="section-spacing">
              {/* Game Readiness Message - Always show with safe values */}
              {safeGameReadyStatus.message && (
                <div className={`rounded-lg p-3 mb-4 text-sm ${
                  safeGameReadyStatus.statusType === 'ready' || safeGameReadyStatus.statusType === 'full'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : safeGameReadyStatus.statusType === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}>
                  <div className="flex items-center">
                    <span className="mr-2">
                      {safeGameReadyStatus.statusType === 'ready' || safeGameReadyStatus.statusType === 'full' ? '✅' :
                       safeGameReadyStatus.statusType === 'error' ? '⚠️' : 'ℹ️'}
                    </span>
                    {safeGameReadyStatus.message}
                  </div>
                </div>
              )}

              {/* Game Status - Conditionally rendered based on data availability */}
              <div className="bg-gray-50 rounded-lg p-4 relative">
                {!uiCapabilities.canShowGameInfo ? (
                  <div>
                    <GameInfoSkeleton />
                    {fallbackContent.gameInfo?.showRefresh && (
                      <div className="mt-3 text-center">
                        <RefreshButton size="small" reason="validation" />
                      </div>
                    )}
                  </div>
                ) : showEmptyPlayerState ? (
                  <div className="text-center py-4">
                    <div className="text-3xl mb-3">🎮</div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      New Game Lobby
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      This is a fresh game waiting for players to join. Be the first to start the fun!
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white rounded p-2">
                        <div className="font-medium text-gray-900">Min Players</div>
                        <div className="text-blue-600 font-bold">2</div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="font-medium text-gray-900">Max Players</div>
                        <div className="text-blue-600 font-bold">8</div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="font-medium text-gray-900">Round Time</div>
                        <div className="text-blue-600 font-bold">2 min</div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="font-medium text-gray-900">Max Rounds</div>
                        <div className="text-blue-600 font-bold">{safeGameState.maxRounds}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        safeGameReadyStatus.statusType === 'ready' || safeGameReadyStatus.statusType === 'full'
                          ? 'bg-green-100 text-green-800' 
                          : safeGameReadyStatus.statusType === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {safeGameReadyStatus.isReady ? 'Ready to Start' : 'Waiting for Players'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">Players:</span>
                      <div className="flex items-center space-x-2">
                        <span className={`text-gray-700 font-medium ${
                          safePlayerCount >= 2 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {safePlayerCount}
                        </span>
                        <span className="text-gray-500">/</span>
                        <span className="text-gray-700">8</span>
                        {safeGameReadyStatus.statusType === 'full' && (
                          <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">FULL</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">Min to Start:</span>
                      <span className="text-gray-700">2 players</span>
                    </div>
                    {safeGameReadyStatus.needsMorePlayers > 0 && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Still Need:</span>
                        <span className="text-orange-600 font-medium">
                          {safeGameReadyStatus.needsMorePlayers} more player{safeGameReadyStatus.needsMorePlayers !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">Game ID:</span>
                      <span className="text-xs text-gray-500 font-mono">
                        {hasValidGameData ? safeGameState.id.slice(-8) : 'Initializing...'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Game Rules */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">How to Play:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Players take turns as the presenter</li>
                  <li>• Presenter gets a phrase and represents it with emojis</li>
                  <li>• Other players guess the phrase</li>
                  <li>• First correct guess wins the round!</li>
                  <li>• Each round lasts 2 minutes</li>
                </ul>
              </div>

              {/* Interaction Restrictions Display */}
              {interactionRestrictions.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-600 mt-0.5">⚠️</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-800 mb-1">
                        Limited Functionality
                      </h4>
                      <ul className="text-xs text-amber-700 space-y-1">
                        {interactionRestrictions.map((restriction, index) => (
                          <li key={index}>• {restriction}</li>
                        ))}
                      </ul>
                      <div className="mt-2">
                        <RefreshButton
                          size="small"
                          showText={true}
                          reason="validation"
                          className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display - Show when error exists */}
              {safeError && (
                <div className="space-y-3">
                  <ErrorDisplay
                    message={safeError}
                    variant="inline"
                    onDismiss={() => {/* Error will be cleared by context */}}
                  />
                  
                  {/* Refresh button for error recovery */}
                  <div className="flex justify-center">
                    <RefreshButton
                      size="medium"
                      showText={true}
                      reason="connection"
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons - Always render action area with simplified logic */}
              <div className="touch-spacing-large">
                {/* Join Button - Conditionally visible based on data availability */}
                {emergencyUICapabilities.canShowJoinButton && showJoinButton && (
                  <div className="space-y-3">
                    <button
                      onClick={handleJoinGame}
                      disabled={joinGameLoading.isLoading || showLoadingOverlay || safePlayerCount >= 8 || !emergencyUICapabilities.canEnableJoinAction}
                      className={`cross-platform-button w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-no-select shadow-lg focus:ring-blue-500 ${
                        isMobile 
                          ? 'min-h-[56px] px-6 py-4 text-lg font-semibold rounded-xl' 
                          : 'min-h-[48px] px-5 py-3 text-base font-medium rounded-lg'
                      }`}
                    >
                      {joinGameLoading.isLoading ? (
                        <JoinGameLoading />
                      ) : safePlayerCount >= 8 ? (
                        <>
                          <span className="mr-2">🚫</span>
                          Game Full
                        </>
                      ) : safeHasNetworkError ? (
                        <>
                          <span className="mr-2">🔄</span>
                          Retry Join
                        </>
                      ) : (
                        <>
                          <span className="mr-2">🎮</span>
                          Join Game
                        </>
                      )}
                    </button>
                    
                    {/* Retry indicator for join game */}
                    <RetryIndicator 
                      operationId="join-game" 
                      showDetails={true}
                      className="mb-3"
                    />
                    
                    {/* Join button context with game requirements */}
                    <div className="text-center space-y-2">
                      <p className={`text-sm ${
                        safePlayerCount >= 8 ? 'text-red-600' :
                        safeHasNetworkError ? 'text-orange-600' :
                        showLoadingOverlay ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {safePlayerCount >= 8 ? '🚫 Game is full (8/8 players)' :
                         safeHasNetworkError ? '⚠️ Connection issues - tap to retry' :
                         showLoadingOverlay ? '⏳ Joining game, please wait...' :
                         '🎯 Join now to start playing!'}
                      </p>
                      
                      {/* Show game start requirements for non-players */}
                      {safePlayerCount < 8 && !showLoadingOverlay && !safeHasNetworkError && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-blue-700">Players needed to start:</span>
                            <span className={`font-medium ${
                              safePlayerCount >= 2 ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {Math.max(0, 2 - safePlayerCount)} more
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-blue-700">Current players:</span>
                            <span className="font-medium text-blue-800">{safePlayerCount} / 8</span>
                          </div>
                          {safePlayerCount >= 2 && (
                            <div className="mt-1 pt-1 border-t border-blue-200 text-center">
                              <span className="text-green-700 font-medium">✅ Ready to start!</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* User in game status */}
                {safeIsUserInGame && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-center text-green-800 mb-2">
                      <span className="mr-2">✅</span>
                      You're in the game!
                    </div>
                    <p className="text-sm text-green-700 text-center">
                      {safeIsCurrentUserModerator 
                        ? "You can start the game when ready" 
                        : "Waiting for the moderator to start"}
                    </p>
                  </div>
                )}

                {/* Lobby Timer - Auto-start countdown when conditions are met */}
                {safeIsUserInGame && (
                  <LobbyTimer
                    isActive={isTimerActive}
                    playerCount={safePlayerCount}
                    minPlayers={2}
                    onTimerExpired={handleTimerExpired}
                    onTimerReset={handleTimerReset}
                    canStart={safeCanStartGame}
                    variant={isMobile ? 'compact' : 'full'}
                    className="mb-4"
                  />
                )}

                {/* Start Button - Conditionally visible based on data availability */}
                {emergencyUICapabilities.canShowStartButton && safeIsCurrentUserModerator && safeIsUserInGame && (
                  <div className="space-y-2">
                    <button
                      onClick={handleStartGame}
                      disabled={startGameLoading.isLoading || !safeCanStartGame || showLoadingOverlay || !emergencyUICapabilities.canEnableStartAction}
                      className={`cross-platform-button w-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-no-select shadow-lg focus:ring-green-500 ${
                        isMobile 
                          ? 'min-h-[56px] px-6 py-4 text-lg font-semibold rounded-xl' 
                          : 'min-h-[48px] px-5 py-3 text-base font-medium rounded-lg'
                      }`}
                    >
                      {startGameLoading.isLoading ? (
                        <StartGameLoading />
                      ) : !safeCanStartGame ? (
                        <>
                          <span className="mr-2">⏳</span>
                          {safeGameReadyStatus.needsMorePlayers > 0 
                            ? `Need ${safeGameReadyStatus.needsMorePlayers} More Player${safeGameReadyStatus.needsMorePlayers !== 1 ? 's' : ''}`
                            : 'Waiting for Requirements'
                          }
                        </>
                      ) : (
                        <>
                          <span className="mr-2">🚀</span>
                          Start Game
                        </>
                      )}
                    </button>
                    
                    {/* Retry indicator for start game */}
                    <RetryIndicator 
                      operationId="start-game" 
                      showDetails={true}
                      className="mb-3"
                    />
                    
                    {/* Start button requirements and status */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-blue-900">Current Players:</span>
                        <span className={`font-bold ${safePlayerCount >= 2 ? 'text-green-600' : 'text-orange-600'}`}>
                          {safePlayerCount} / 8
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-blue-900">Minimum Required:</span>
                        <span className="font-bold text-blue-600">2 players</span>
                      </div>
                      {safeGameReadyStatus.needsMorePlayers > 0 && (
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-medium text-blue-900">Still Need:</span>
                          <span className="font-bold text-orange-600">
                            {safeGameReadyStatus.needsMorePlayers} more player{safeGameReadyStatus.needsMorePlayers !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-blue-900">Game Status:</span>
                        <span className={`font-bold ${
                          safeCanStartGame ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {safeCanStartGame ? 'Ready to Start!' : 'Waiting...'}
                        </span>
                      </div>
                      
                      {/* Additional requirements messaging */}
                      {!safeCanStartGame && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <p className="text-xs text-blue-700">
                            {safeGameReadyStatus.needsMorePlayers > 0 
                              ? `🔄 Invite ${safeGameReadyStatus.needsMorePlayers} more player${safeGameReadyStatus.needsMorePlayers !== 1 ? 's' : ''} to start the game`
                              : safeGameState.status !== 'lobby'
                              ? '⚠️ Game must be in lobby status to start'
                              : '⏳ Checking game requirements...'
                            }
                          </p>
                        </div>
                      )}
                      
                      {safeCanStartGame && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <p className="text-xs text-green-700">
                            ✅ All requirements met! You can start the game now.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Moderator status message */}
                {uiCapabilities.canShowModeratorControls && safeIsCurrentUserModerator && safeIsUserInGame && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      👑 You're the game moderator
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      You can start the game when ready
                    </p>
                  </div>
                )}
                
                {/* Non-moderator waiting message with game requirements */}
                {uiCapabilities.canShowUserStatus && !safeIsCurrentUserModerator && safeIsUserInGame && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700 text-center mb-2">
                      Waiting for moderator to start the game...
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Current Players:</span>
                        <span className={`font-medium ${safePlayerCount >= 2 ? 'text-green-600' : 'text-orange-600'}`}>
                          {safePlayerCount} / 8
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Minimum to Start:</span>
                        <span className="font-medium text-gray-700">2 players</span>
                      </div>
                      {safeGameReadyStatus.needsMorePlayers > 0 && (
                        <div className="flex items-center justify-between">
                          <span>Still Need:</span>
                          <span className="font-medium text-orange-600">
                            {safeGameReadyStatus.needsMorePlayers} more
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-center mt-2 pt-2 border-t border-gray-300">
                        <span className={`text-xs font-medium ${
                          safeCanStartGame ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {safeCanStartGame 
                            ? '✅ Ready to start!' 
                            : safeGameReadyStatus.needsMorePlayers > 0
                            ? `⏳ Need ${safeGameReadyStatus.needsMorePlayers} more player${safeGameReadyStatus.needsMorePlayers !== 1 ? 's' : ''}`
                            : '⏳ Waiting for requirements'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Players List - Always rendered regardless of data availability */}
          <div className={`bg-white rounded-lg shadow-md ${
            isMobile ? 'mx-4 p-4' : 'mx-0 p-6 rounded-xl shadow-lg'
          }`}>
            {/* Enhanced Player Capacity Indicator */}
            <div className="mb-4">
              <PlayerCapacityIndicator
                currentPlayers={safePlayerCount}
                maxPlayers={8}
                minPlayers={2}
                showProgressBar={true}
                showStatusBadge={true}
                showDetailedInfo={false}
                variant="full"
              />
            </div>

            {/* Refresh and retry controls */}
            <div className="flex items-center justify-end space-x-2 mb-4">
              {/* Mini refresh button for players list */}
              {(!safeConnected || safeHasNetworkError || showLoadingOverlay || !hasValidPlayerData) && (
                <CompactRefreshButton
                  reason={!safeConnected || safeHasNetworkError ? 'connection' : 'validation'}
                  className={`text-gray-400 hover:text-gray-600 bg-transparent border-none ${
                    isMobile ? 'min-h-[44px] min-w-[44px] p-2' : 'p-1'
                  }`}
                />
              )}
              
              {/* Retry indicator for refresh */}
              <RetryIndicator 
                operationId="refresh-game" 
                size="small"
              />
            </div>
            
            {/* Enhanced Player List Container */}
            <div className="min-h-[200px] relative">
              {/* Skeleton loading for player list */}
              {(showLoadingOverlay || initialLoading.isLoading) && safePlayersArray.length === 0 && (
                <PlayerListSkeleton count={3} />
              )}
              
              {/* Loading overlay for existing players during refresh */}
              {(refreshLoading.isLoading || (showLoadingOverlay && safePlayersArray.length > 0)) && (
                <LoadingOverlay
                  message="Updating player list..."
                  progress={refreshLoading.progress || undefined}
                  showProgress={refreshLoading.progress !== undefined}
                />
              )}

              {/* Enhanced Player List Component */}
              {showEmptyPlayerState ? (
                /* Enhanced empty state with clear call-to-action */
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎭</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Ready to Start Playing?
                  </h3>
                  <p className="text-gray-600 mb-4 max-w-sm mx-auto">
                    No players have joined yet. Be the first to join this exciting game of Emojirades!
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                      🎯 Guess phrases from emoji clues
                    </p>
                    <p className="text-sm text-gray-500">
                      👥 Play with 2-8 players
                    </p>
                    <p className="text-sm text-gray-500">
                      ⏱️ 2-minute rounds
                    </p>
                  </div>
                  {showJoinButton && (
                    <div className="mt-6">
                      <button
                        onClick={handleJoinGame}
                        disabled={joinGameLoading.isLoading || showLoadingOverlay || safePlayerCount >= 8}
                        className={`cross-platform-button bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-no-select mx-auto shadow-lg focus:ring-blue-500 ${
                          isMobile 
                            ? 'min-h-[56px] px-8 py-4 text-lg font-semibold rounded-xl' 
                            : 'min-h-[48px] px-6 py-3 text-base font-medium rounded-lg'
                        }`}
                      >
                        {joinGameLoading.isLoading ? (
                          <JoinGameLoading />
                        ) : (
                          <>
                            <span className="mr-2">🎮</span>
                            Join Game Now
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Enhanced Player List with smooth animations and optimizations */
                <EnhancedPlayerList
                  players={safePlayersArray}
                  currentUserId={safeCurrentUser?.id}
                  maxPlayers={8}
                  isLoading={showLoadingOverlay}
                  className="space-y-2"
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer - Always rendered with validated data */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-gray-500">
            Game ID: <span className="font-mono">{hasValidGameData ? safeGameState.id : 'Loading...'}</span>
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
            <span>Max Players: 8</span>
            <span>•</span>
            <span>Round Duration: 2 minutes</span>
            <span>•</span>
            <span>Max Rounds: {safeGameState.maxRounds}</span>
          </div>
          
          {/* Connection and data status for debugging */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400 mt-2 space-y-1">
              <div>
                Data Status: Game({hasValidGameData ? '✓' : '✗'}) 
                Players({hasValidPlayerData ? '✓' : '✗'}) 
                User({hasValidUserData ? '✓' : '✗'})
                {dataFreshness.isStale && ' (Stale)'}
              </div>
              <div>
                Connection: Quality({connectionMonitor.qualityScore}/100) 
                Latency({connectionMonitor.metrics.latency || 'N/A'}ms)
                Failures({connectionMonitor.metrics.consecutiveFailures})
                Stability({connectionMonitor.metrics.connectionStability})
              </div>
            </div>
          )}
          
          {/* Detailed Connection Status (expandable) */}
          {(!safeConnected || connectionMonitor.hasProblems) && (
            <div className="mt-4">
              <EnhancedConnectionStatus 
                showDetails={true}
                className="max-w-md mx-auto"
              />
            </div>
          )}
        </div>


        </div>
      </PartialDataHandler>
    </FallbackManager>
    </ErrorBoundary>
  );
};
