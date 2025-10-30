import React, { useEffect, useState } from 'react';
import { useGameStatus } from '../hooks/useGameActions';
import { useGameError, useConnectionStatus } from '../hooks/useGameError';
import { useLoadingState } from '../hooks/useLoadingState';
import { useOnlineStatus } from '../utils/networkErrorHandler';
import { useSoundEffects } from '../utils/soundEffects';
import { usePerformanceMonitor } from '../utils/performanceMonitor';
import { LoadingScreen } from './LoadingScreen';
import { ErrorDisplay } from './ErrorDisplay';
import { GameLobby } from './GameLobby';
import { GameSession } from './GameSession';
import { GameSettings } from './GameSettings';
import { ErrorBoundary } from './ErrorBoundary';
import { WelcomeScreen } from './WelcomeScreen';

export const GameApp: React.FC = () => {
  const {
    isInLobby,
    isGameActive,
    isGameEnded,
    loading,
    error,
    currentRound
  } = useGameStatus();
  
  // EMERGENCY FIX: If we have a current round but game state says lobby, force active state
  const hasActiveRound = currentRound && (currentRound.status === 'active' || currentRound.status === 'waiting');
  const forceGameActive = hasActiveRound && isInLobby; // Inconsistent state detected
  const actuallyInLobby = isInLobby && !hasActiveRound;
  const actuallyGameActive = isGameActive || forceGameActive;

  const {
    connected,
    isReconnecting,
    connectionQuality,
    forceReconnect,
    timeSinceLastConnection
  } = useConnectionStatus();

  const {
    hasNetworkError,
    hasServerError
  } = useGameError();

  const { isAnyLoading, getAllLoadingStates } = useLoadingState();
  const isOnline = useOnlineStatus();
  const { initialize, isEnabled, playSound } = useSoundEffects();
  const { startMonitoring, stopMonitoring } = usePerformanceMonitor();

  const [showSettings, setShowSettings] = useState(false);
  const [hasInitializedAudio, setHasInitializedAudio] = useState(false);
  const [gameState, setGameState] = useState<'initializing' | 'ready' | 'error'>('initializing');

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initializeAudio = async () => {
      if (!hasInitializedAudio) {
        try {
          await initialize();
          setHasInitializedAudio(true);
          playSound('gameStart');
        } catch (error) {
          console.warn('Audio initialization failed:', error);
          setHasInitializedAudio(true); // Still mark as initialized to prevent retries
        }
      }
    };

    const handleUserInteraction = () => {
      initializeAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [initialize, hasInitializedAudio, playSound]);

  // Initialize game state and performance monitoring
  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Start performance monitoring
        startMonitoring();

        // Simulate initialization delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        setGameState('ready');
      } catch (error) {
        console.error('Game initialization failed:', error);
        setGameState('error');
      }
    };

    if (gameState === 'initializing') {
      initializeGame();
    }

    // Cleanup performance monitoring on unmount
    return () => {
      stopMonitoring();
    };
  }, [gameState, startMonitoring, stopMonitoring]);

  // Show connection quality warnings
  useEffect(() => {
    if (!isOnline) {
      // Online status hook will handle this
      return;
    }

    if (connectionQuality === 'poor' && timeSinceLastConnection > 10000) {
      // Connection has been poor for more than 10 seconds
      console.warn('Poor connection detected');
    }
  }, [connectionQuality, timeSinceLastConnection, isOnline]);

  // Show loading screen during initial load or when any critical operation is loading
  if (gameState === 'initializing' || ((loading || isAnyLoading) && !error)) {
    const loadingStates = getAllLoadingStates();
    const primaryLoading = loadingStates[0];

    const loadingMessage = gameState === 'initializing'
      ? "Initializing Emojirades..."
      : primaryLoading?.loadingMessage || "Loading game...";

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="mb-8 animate-bounce-gentle">
            <span className="text-8xl">🎭</span>
          </div>
          <LoadingScreen
            message={loadingMessage}
            size="large"
          />
          <div className="mt-6 text-sm text-gray-500">
            {gameState === 'initializing' ? 'Setting up your game experience...' : 'Please wait...'}
          </div>
        </div>
      </div>
    );
  }

  // Show error screen for critical errors that prevent the app from functioning
  if (error && (hasNetworkError || hasServerError) && !connected && !isReconnecting) {
    return (
      <ErrorDisplay
        title="Connection Problem"
        message="Unable to connect to the game server. Please check your internet connection and try again."
        onRetry={forceReconnect}
        showRetry
        variant="full"
      />
    );
  }

  // Show offline error if completely offline
  if (!isOnline) {
    return (
      <ErrorDisplay
        title="You're Offline"
        message="Please check your internet connection to play Emojirades."
        onRetry={() => window.location.reload()}
        showRetry
        variant="full"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 safe-area-padding">
      {/* Settings Button */}
      <div className="fixed top-4 right-4 z-30">
        <button
          onClick={() => {
            setShowSettings(true);
            playSound('buttonClick');
          }}
          className={`p-3 bg-white rounded-full shadow-lg hover-lift focus-ring-animated button-press-feedback transition-all duration-200 ${isEnabled() ? 'sound-enabled' : 'sound-disabled'
            }`}
          aria-label="Game settings"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Connection Status - Only show if there are connection issues */}
      {(!connected || connectionQuality !== 'good') && (
        <div className="fixed top-2 left-2 right-16 z-40">
          <div className="flex justify-center">
            <div className={`px-3 py-1 rounded-full text-sm font-medium animate-slide-down ${!connected
              ? 'bg-red-100 text-red-800'
              : connectionQuality === 'poor'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
              }`}>
              {!connected && isReconnecting && (
                <>
                  <div className="inline-block w-2 h-2 bg-current rounded-full mr-2 animate-pulse"></div>
                  Reconnecting...
                </>
              )}
              {!connected && !isReconnecting && (
                <>
                  <div className="inline-block w-2 h-2 bg-current rounded-full mr-2"></div>
                  Disconnected
                </>
              )}
              {connected && connectionQuality === 'poor' && (
                <>
                  <div className="inline-block w-2 h-2 bg-current rounded-full mr-2"></div>
                  Poor Connection
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Game Content wrapped in error boundaries */}
      <ErrorBoundary fallback={
        <ErrorDisplay
          title="Game Error"
          message="The game encountered an unexpected error. Please refresh the page to continue."
          onRetry={() => window.location.reload()}
          showRetry
        />
      }>
        <main className="animate-fade-in" role="main">
          {/* Game State Routing - Fixed for inconsistent states */}
          {actuallyInLobby && (
            <div className="game-transition-enter game-transition-enter-active">
              <GameLobby />
            </div>
          )}

          {(actuallyGameActive || isGameEnded) && (
            <div className="game-transition-enter game-transition-enter-active">
              <GameSession />
            </div>
          )}
          
          {/* Debug info for inconsistent state */}
          {forceGameActive && (
            <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-100 border-b border-yellow-300 p-1 text-xs text-center">
              🔧 Fixed inconsistent game state: Round {currentRound?.roundNumber || '?'} detected
            </div>
          )}

          {/* Welcome/Fallback State */}
          {!actuallyInLobby && !actuallyGameActive && !isGameEnded && !loading && !isAnyLoading && gameState === 'ready' && (
            <WelcomeScreen />
          )}

          {/* Error State */}
          {gameState === 'error' && (
            <div className="flex items-center justify-center min-h-screen px-4">
              <ErrorDisplay
                title="Initialization Failed"
                message="We couldn't start the game. Please refresh the page and try again."
                onRetry={() => {
                  setGameState('initializing');
                  window.location.reload();
                }}
                showRetry
                variant="full"
              />
            </div>
          )}
        </main>
      </ErrorBoundary>

      {/* Settings Modal */}
      <GameSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};
