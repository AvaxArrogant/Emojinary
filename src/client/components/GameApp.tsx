import React from 'react';
import { useGameStatus } from '../hooks/useGameActions';
import { useGameError, useConnectionStatus } from '../hooks/useGameError';
import { LoadingScreen } from './LoadingScreen.js';
import { ErrorDisplay } from './ErrorDisplay.js';
import { ConnectionStatus } from './ConnectionStatus.js';
import { GameLobby } from './GameLobby.js';
import { GameSession } from './GameSession.js';

export const GameApp: React.FC = () => {
  const { 
    isInLobby, 
    isGameActive, 
    isGameEnded, 
    loading, 
    error 
  } = useGameStatus();
  
  const { connected, isReconnecting } = useConnectionStatus();
  const { showError, userFriendlyMessage, dismissError } = useGameError();

  // Show loading screen during initial load
  if (loading && !error) {
    return <LoadingScreen message="Loading Emojirades..." />;
  }

  // Show error screen for critical errors
  if (error && !connected && !isReconnecting) {
    return (
      <ErrorDisplay 
        message="Unable to connect to the game server"
        onRetry={() => window.location.reload()}
        showRetry
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Connection Status */}
      <ConnectionStatus gameId="" username="" />
      
      {/* Error Toast */}
      {showError && userFriendlyMessage && (
        <div className="fixed top-4 right-4 z-50">
          <ErrorDisplay 
            message={userFriendlyMessage}
            onDismiss={dismissError}
            variant="toast"
          />
        </div>
      )}

      {/* Main Game Content */}
      {isInLobby && <GameLobby />}
      {(isGameActive || isGameEnded) && <GameSession />}
      
      {/* Fallback for unknown state */}
      {!isInLobby && !isGameActive && !isGameEnded && !loading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Emojirades! 🎭
            </h1>
            <p className="text-gray-600 mb-8">
              A fun multiplayer guessing game using emojis
            </p>
            <LoadingScreen message="Initializing game..." />
          </div>
        </div>
      )}
    </div>
  );
};
