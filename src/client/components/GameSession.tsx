import React from 'react';
import { useGameStatus } from '../hooks/useGameActions';
import { useRealtimeLeaderboard } from '../hooks/useLeaderboard';
import { useGame } from '../contexts/GameContext';
import { PresenterView } from './PresenterView';
import { GuesserView } from './GuesserView';
import { CompactTimer } from './CompactTimer';
import { Leaderboard } from './Leaderboard';

export const GameSession: React.FC = () => {
  const { 
    isRoundActive, 
    isRoundWaiting, 
    isRoundEnded, 
    currentRound,
    gameState
  } = useGameStatus();
  
  const { isPresenter } = useGame();
  const { topPlayers, currentUser, currentUserRank } = useRealtimeLeaderboard();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🎭 Emojirades - Round {currentRound?.roundNumber || 1}
              </h1>
              <p className="text-sm text-gray-600">
                Game {gameState?.currentRound || 1} of {gameState?.maxRounds || 5}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <CompactTimer />
              <div className="text-right">
                <div className="text-sm text-gray-600">Your Role:</div>
                <div className={`font-semibold ${isPresenter ? 'text-purple-600' : 'text-blue-600'}`}>
                  {isPresenter ? '🎭 Presenter' : '🤔 Guesser'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-3">
            {/* Round Waiting State */}
            {isRoundWaiting && !isPresenter && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="text-center py-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Waiting for presenter to submit emojis...
                  </h2>
                  <div className="animate-pulse text-6xl mb-4">⏳</div>
                  <p className="text-gray-600">
                    The presenter is choosing their phrase and building their emoji sequence.
                  </p>
                </div>
              </div>
            )}

            {/* Presenter View */}
            {isPresenter && (isRoundWaiting || isRoundActive) && (
              <PresenterView />
            )}

            {/* Guesser View */}
            {!isPresenter && (isRoundActive || (isRoundWaiting && currentRound?.emojiSequence?.length)) && (
              <GuesserView />
            )}

            {/* Round Ended State */}
            {isRoundEnded && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="text-center py-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Round Complete!
                  </h2>
                  <div className="text-4xl mb-4">🎉</div>
                  <p className="text-gray-600 mb-4">
                    The correct answer was: <span className="font-semibold">"{currentRound?.phrase?.text}"</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Round results and next round transition will be implemented in task 10
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Player Status */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Your Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Score:</span>
                  <span className="font-semibold">{currentUser?.score || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rank:</span>
                  <span className="font-semibold">#{currentUserRank || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className={`font-semibold ${isPresenter ? 'text-purple-600' : 'text-blue-600'}`}>
                    {isPresenter ? 'Presenter' : 'Guesser'}
                  </span>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <Leaderboard
              subredditName={gameState?.subredditName || 'unknown'}
              currentUser={currentUser}
              limit={5}
              className="bg-white rounded-lg shadow-md p-4"
            />

            {/* Game Info */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Game Info</h3>
              <div className="space-y-2 text-sm">
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
