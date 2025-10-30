import React, { useState } from 'react';
import { useGameStatus } from '../hooks/useGameActions';
import { useRealtimeLeaderboard } from '../hooks/useLeaderboard';
import { useGame } from '../contexts/GameContext';
import { useRoundProgression } from '../hooks/useRoundProgression';
import { PresenterView } from './PresenterView';
import { GuesserView } from './GuesserView';
import { CompactTimer } from './CompactTimer';
import { Leaderboard } from './Leaderboard';
import { LeaderboardErrorBoundary } from './LeaderboardErrorBoundary';
import { RoundResults } from './RoundResults';
import { GameComplete } from './GameComplete';

export const GameSession: React.FC = () => {
  const { 
    isRoundActive, 
    isRoundWaiting, 
    isRoundEnded, 
    currentRound,
    gameState
  } = useGameStatus();
  
  const { isPresenter, players } = useGame();
  const { topPlayers, currentUser, currentUserRank } = useRealtimeLeaderboard();
  
  // State for leaderboard availability (Requirement 3.1, 3.2)
  const [leaderboardAvailable, setLeaderboardAvailable] = useState(true);
  
  const {
    showResults,
    nextRoundCountdown,
    isGameComplete,
    currentRoundResult,
    startNextRound,
    completeGame,
  } = useRoundProgression();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 safe-area-padding">
      <div className="container-mobile-full">
        {/* Header */}
        <div className="card-mobile p-mobile mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex-1">
              <h1 className="text-mobile-xl sm:text-2xl font-bold text-gray-900">
                🎭 Emojirades - Round {currentRound?.roundNumber || 1}
              </h1>
              <p className="text-mobile-sm text-gray-600">
                Game {gameState?.currentRound || 1} of {gameState?.maxRounds || 5}
              </p>
              
              {/* Emergency Reset Button */}
              <button
                onClick={async () => {
                  if (confirm('Reset game and return to lobby? This will clear all progress.')) {
                    try {
                      // Try to reset via API first
                      const response = await fetch('/api/emergency/reset-game', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      
                      if (response.ok) {
                        console.log('Game reset via API');
                      } else {
                        console.warn('API reset failed, using local reset');
                      }
                    } catch (error) {
                      console.warn('API reset failed, using local reset:', error);
                    }
                    
                    // Clear local storage and reload
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }
                }}
                className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
              >
                🔄 Reset to Lobby
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <CompactTimer />
              <div className="text-center sm:text-right">
                <div className="text-mobile-sm text-gray-600">Your Role:</div>
                <div className={`font-semibold text-mobile-base ${isPresenter ? 'text-purple-600' : 'text-blue-600'}`}>
                  {isPresenter ? '🎭 Presenter' : '🤔 Guesser'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            {/* Game Complete - takes priority over everything */}
            {isGameComplete && gameState ? (
              <GameComplete
                gameState={gameState}
                players={players}
                onNewGame={() => {
                  // TODO: Implement new game creation
                  window.location.reload();
                }}
                onReturnToLobby={() => {
                  // TODO: Implement return to lobby
                  window.location.reload();
                }}
              />
            ) : showResults && currentRoundResult ? (
              /* Round Results */
              <RoundResults
                roundResult={currentRoundResult}
                players={players}
                onNextRound={startNextRound}
                onGameComplete={completeGame}
                isGameComplete={isGameComplete}
                nextRoundCountdown={nextRoundCountdown}
              />
            ) : isRoundWaiting && !isPresenter ? (
              /* Round Waiting State */
              <div className="card-mobile p-mobile">
                <div className="text-center py-8">
                  <h2 className="text-mobile-xl font-semibold text-gray-900 mb-4">
                    Waiting for presenter to submit emojis...
                  </h2>
                  <div className="animate-pulse text-4xl sm:text-6xl mb-4">⏳</div>
                  <p className="text-gray-600 text-mobile-base">
                    The presenter is choosing their phrase and building their emoji sequence.
                  </p>
                </div>
              </div>
            ) : isPresenter && (isRoundWaiting || isRoundActive) ? (
              /* Presenter View */
              <PresenterView />
            ) : !isPresenter && (isRoundActive || (isRoundWaiting && currentRound?.emojiSequence?.length)) ? (
              /* Guesser View */
              <GuesserView />
            ) : isRoundEnded ? (
              /* Round Ended State (fallback if round progression not working) */
              <div className="card-mobile p-mobile">
                <div className="text-center py-8">
                  <h2 className="text-mobile-xl font-semibold text-gray-900 mb-4">
                    Round Complete!
                  </h2>
                  <div className="text-4xl mb-4">🎉</div>
                  <p className="text-gray-600 mb-4 text-mobile-base">
                    The correct answer was: <span className="font-semibold text-selectable">"{currentRound?.phrase?.text}"</span>
                  </p>
                  <p className="text-mobile-sm text-gray-500">
                    Preparing next round...
                  </p>
                </div>
              </div>
            ) : (
              /* Default loading state */
              <div className="card-mobile p-mobile">
                <div className="text-center py-8">
                  <div className="animate-pulse text-4xl sm:text-6xl mb-4">⏳</div>
                  <p className="text-gray-600 text-mobile-base">
                    Loading game state...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="section-spacing-compact order-1 lg:order-2">
            {/* Current Player Status */}
            <div className="card-mobile p-mobile">
              <h3 className="font-semibold text-gray-900 mb-3 text-mobile-base">Your Status</h3>
              <div className="section-spacing-compact">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-mobile-sm">Score:</span>
                  <span className="font-semibold text-mobile-sm">{currentUser?.score || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-mobile-sm">Rank:</span>
                  <span className="font-semibold text-mobile-sm">#{currentUserRank || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-mobile-sm">Role:</span>
                  <span className={`font-semibold text-mobile-sm ${isPresenter ? 'text-purple-600' : 'text-blue-600'}`}>
                    {isPresenter ? 'Presenter' : 'Guesser'}
                  </span>
                </div>
              </div>
            </div>

            {/* Leaderboard with Error Boundary (Requirement 3.1, 3.2, 3.5) */}
            {leaderboardAvailable && (
              <LeaderboardErrorBoundary
                onError={(error) => {
                  console.warn('Leaderboard error caught by boundary:', error.message);
                  // Don't disable leaderboard permanently, just log the error
                  // The error boundary will handle the UI fallback
                }}
                fallback={
                  <div className="card-mobile p-mobile">
                    <div className="text-center">
                      <div className="text-yellow-600 mb-2">⚠️ Leaderboard Unavailable</div>
                      <p className="text-gray-600 mb-4 text-sm">
                        Leaderboard is temporarily unavailable, but your game continues normally.
                      </p>
                      <button
                        onClick={() => {
                          // Force re-render of leaderboard
                          setLeaderboardAvailable(false);
                          setTimeout(() => setLeaderboardAvailable(true), 100);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        Retry Leaderboard
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Game progress is still being saved
                      </p>
                    </div>
                  </div>
                }
              >
                <Leaderboard
                  subredditName={(() => {
                    const subreddit = gameState?.subredditName || currentUser?.subredditName || 'emojirades_dev';
                    return subreddit;
                  })()}
                  currentUser={currentUser}
                  limit={5}
                  className="card-mobile p-mobile"
                />
              </LeaderboardErrorBoundary>
            )}

            {/* Leaderboard disabled state */}
            {!leaderboardAvailable && (
              <div className="card-mobile p-mobile">
                <div className="text-center">
                  <div className="text-gray-500 mb-2">📊 Leaderboard Disabled</div>
                  <p className="text-gray-600 text-sm mb-3">
                    Leaderboard has been temporarily disabled due to errors.
                  </p>
                  <button
                    onClick={() => setLeaderboardAvailable(true)}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    Enable Leaderboard
                  </button>
                </div>
              </div>
            )}

            {/* Game Info */}
            <div className="card-mobile p-mobile">
              <h3 className="font-semibold text-gray-900 mb-3 text-mobile-base">Game Info</h3>
              <div className="section-spacing-compact text-mobile-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Round:</span>
                  <span>{currentRound?.roundNumber || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Rounds:</span>
                  <span>{gameState?.maxRounds || 5}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Players:</span>
                  <span>{topPlayers.length}</span>
                </div>
                {currentRound?.phrase && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="text-gray-600 mb-1">Category:</div>
                    <div className="capitalize font-medium">{currentRound.phrase.category}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
