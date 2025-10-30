import React from 'react';
import { useGameActions } from '../hooks/useGameActions';
import { LoadingSpinner } from './LoadingScreen';

export const WelcomeScreen: React.FC = () => {
  const { joinGame, loading } = useGameActions();

  const handleJoinGame = async () => {
    try {
      await joinGame();
    } catch (error) {
      console.error('Failed to join game:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md mx-auto animate-scale-in">
        <div className="mb-8 animate-bounce-gentle">
          <span className="text-8xl">🎭</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to Emojirades!
        </h1>
        <p className="text-gray-600 mb-8 text-lg sm:text-xl leading-relaxed">
          Express yourself with emojis and guess what others are thinking in this fun multiplayer game!
        </p>
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <span>🎯</span>
            <span>Guess phrases from emoji clues</span>
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <span>⏱️</span>
            <span>2-minute rounds with live scoring</span>
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <span>👥</span>
            <span>Play with friends in real-time</span>
          </div>
        </div>
        
        <button
          onClick={handleJoinGame}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
        >
          {loading ? (
            <>
              <LoadingSpinner size="small" color="gray" />
              <span className="ml-2">Joining Game...</span>
            </>
          ) : (
            <>
              <span className="mr-2">🎮</span>
              Join Game
            </>
          )}
        </button>
        
        <p className="text-xs text-gray-400 mt-4">
          Click to join or create a new game
        </p>
      </div>
    </div>
  );
};
