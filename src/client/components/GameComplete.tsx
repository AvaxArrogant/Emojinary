import React, { useState } from 'react';
import type { Player, GameState } from '../../shared/types/game';
import { useGame } from '../contexts/GameContext';

type GameCompleteProps = {
  gameState: GameState;
  players: Record<string, Player>;
  onNewGame: () => void;
  onReturnToLobby: () => void;
};

export const GameComplete: React.FC<GameCompleteProps> = ({
  gameState,
  players,
  onNewGame,
  onReturnToLobby,
}) => {
  const { currentUser } = useGame();
  const [showStats, setShowStats] = useState(false);

  // Sort players by score for final leaderboard
  const finalLeaderboard = Object.values(players)
    .filter(player => player.isActive)
    .sort((a, b) => b.score - a.score);

  // Get current user's final position
  const currentUserRank = finalLeaderboard.findIndex(player => player.id === currentUser?.id) + 1;
  const currentUserPlayer = finalLeaderboard.find(player => player.id === currentUser?.id);

  // Calculate game statistics
  const totalPlayers = finalLeaderboard.length;
  const winner = finalLeaderboard[0];
  const isCurrentUserWinner = winner?.id === currentUser?.id;
  const averageScore = totalPlayers > 0 
    ? Math.round(finalLeaderboard.reduce((sum, player) => sum + player.score, 0) / totalPlayers)
    : 0;

  // Get medal emoji based on rank
  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  };

  // Get rank suffix
  const getRankSuffix = (rank: number): string => {
    if (rank >= 11 && rank <= 13) return 'th';
    switch (rank % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎊</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Game Complete!
          </h1>
          <p className="text-lg text-gray-600">
            {gameState.maxRounds} rounds of Emojirades in r/{gameState.subredditName}
          </p>
        </div>

        {/* Winner Celebration */}
        {winner && (
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-8">
            <div className="text-center">
              <div className="text-4xl mb-2">👑</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isCurrentUserWinner ? 'Congratulations, Champion!' : `${winner.username} Wins!`}
              </h2>
              <p className="text-lg text-gray-700">
                Final Score: <span className="font-bold text-yellow-600">{winner.score} points</span>
              </p>
              {isCurrentUserWinner && (
                <p className="text-sm text-gray-600 mt-2">
                  You dominated this game! 🎉
                </p>
              )}
            </div>
          </div>
        )}

        {/* Current User's Performance */}
        {currentUserPlayer && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
              Your Performance
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl mb-1">{getMedalEmoji(currentUserRank)}</div>
                <div className="text-lg font-bold text-gray-900">
                  {currentUserRank}{getRankSuffix(currentUserRank)} Place
                </div>
                <div className="text-sm text-gray-600">Final Rank</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {currentUserPlayer.score}
                </div>
                <div className="text-sm text-gray-600">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {Math.round((currentUserPlayer.score / (winner?.score || 1)) * 100)}%
                </div>
                <div className="text-sm text-gray-600">of Winner's Score</div>
              </div>
            </div>
          </div>
        )}

        {/* Final Leaderboard */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            Final Leaderboard
          </h3>
          <div className="space-y-3">
            {finalLeaderboard.map((player, index) => {
              const rank = index + 1;
              const isCurrentUser = player.id === currentUser?.id;
              
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    isCurrentUser
                      ? 'bg-blue-50 border-blue-200 shadow-md'
                      : rank === 1
                      ? 'bg-yellow-50 border-yellow-200'
                      : rank === 2
                      ? 'bg-gray-50 border-gray-200'
                      : rank === 3
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {getMedalEmoji(rank)}
                    </div>
                    <div>
                      <div className={`font-semibold ${
                        isCurrentUser ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {player.username}
                        {isCurrentUser ? ' (You)' : ''}
                      </div>
                      <div className="text-sm text-gray-600">
                        {rank}{getRankSuffix(rank)} place
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">
                      {player.score}
                    </div>
                    <div className="text-sm text-gray-600">points</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Game Statistics */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Game Statistics
            </h3>
            <button
              onClick={() => setShowStats(!showStats)}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              {showStats ? '▼ Hide' : '▶ Show'}
            </button>
          </div>
          
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{gameState.maxRounds}</div>
                <div className="text-sm text-gray-600">Rounds Played</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{totalPlayers}</div>
                <div className="text-sm text-gray-600">Total Players</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{averageScore}</div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{winner?.score || 0}</div>
                <div className="text-sm text-gray-600">Highest Score</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onNewGame}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            🎮 Play Again
          </button>
          <button
            onClick={onReturnToLobby}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            🏠 Return to Lobby
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Thanks for playing Emojirades! 🎭</p>
          <p>Share your results with r/{gameState.subredditName}!</p>
        </div>
      </div>
    </div>
  );
};
