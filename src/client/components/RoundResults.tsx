import React, { useState } from 'react';
import type { RoundResult, Player } from '../../shared/types/game';
import { useGame } from '../contexts/GameContext';

type RoundResultsProps = {
  roundResult: RoundResult;
  players: Record<string, Player>;
  onNextRound: () => void;
  onGameComplete: () => void;
  isGameComplete: boolean;
  nextRoundCountdown: number;
};

export const RoundResults: React.FC<RoundResultsProps> = ({
  roundResult,
  players,
  onNextRound,
  onGameComplete,
  isGameComplete,
  nextRoundCountdown,
}) => {
  const { currentUser } = useGame();
  const [showDetails, setShowDetails] = useState(false);

  // Get winner player info
  const winner = roundResult.winnerId ? players[roundResult.winnerId] : null;
  const isCurrentUserWinner = winner?.id === currentUser?.id;

  // Calculate round duration in a readable format
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  // Get top 3 players by score for podium display
  const topPlayers = Object.values(players)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">
          {winner ? '🎉' : '⏰'}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {winner ? 'Round Complete!' : 'Time\'s Up!'}
        </h2>
        {winner && (
          <p className="text-lg text-gray-700">
            <span className={`font-semibold ${isCurrentUserWinner ? 'text-green-600' : 'text-blue-600'}`}>
              {winner.username}
            </span>
            {isCurrentUserWinner ? ' (You)' : ''} got it right!
          </p>
        )}
      </div>

      {/* Correct Answer */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">The correct answer was:</p>
          <p className="text-2xl font-bold text-gray-900">
            "{roundResult.correctAnswer}"
          </p>
        </div>
      </div>

      {/* Winner Celebration */}
      {winner && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="text-2xl">🏆</div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">
                {isCurrentUserWinner ? 'Congratulations!' : `${winner.username} wins this round!`}
              </p>
              <p className="text-sm text-gray-600">
                +10 points for the correct guess
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Round Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-gray-900">{roundResult.totalGuesses}</div>
          <div className="text-sm text-gray-600">Total Guesses</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-gray-900">
            {formatDuration(roundResult.roundDuration)}
          </div>
          <div className="text-sm text-gray-600">Round Duration</div>
        </div>
      </div>

      {/* Top 3 Leaderboard */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
          Current Standings
        </h3>
        <div className="space-y-2">
          {topPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                index === 0
                  ? 'bg-yellow-50 border border-yellow-200'
                  : index === 1
                  ? 'bg-gray-50 border border-gray-200'
                  : 'bg-orange-50 border border-orange-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-lg">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </div>
                <div>
                  <span className={`font-semibold ${
                    player.id === currentUser?.id ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {player.username}
                    {player.id === currentUser?.id ? ' (You)' : ''}
                  </span>
                </div>
              </div>
              <div className="font-bold text-gray-900">
                {player.score} pts
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {showDetails ? '▼ Hide Details' : '▶ Show Round Details'}
        </button>
        
        {showDetails && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Round ID:</strong> {roundResult.roundId}</p>
              <p><strong>Duration:</strong> {formatDuration(roundResult.roundDuration)}</p>
              <p><strong>Total Guesses:</strong> {roundResult.totalGuesses}</p>
              {winner && (
                <p><strong>Winner:</strong> {winner.username} (+10 points)</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Next Round / Game Complete Actions */}
      <div className="text-center">
        {isGameComplete ? (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              🎊 Game Complete! 🎊
            </h3>
            <p className="text-gray-600 mb-4">
              Thanks for playing! Check out the final leaderboard.
            </p>
            <button
              onClick={onGameComplete}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              View Final Results
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Next round starts in:
            </p>
            <div className="text-3xl font-bold text-purple-600 mb-4">
              {nextRoundCountdown}s
            </div>
            <button
              onClick={onNextRound}
              disabled={nextRoundCountdown > 0}
              className={`font-semibold py-3 px-6 rounded-lg transition-colors ${
                nextRoundCountdown > 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {nextRoundCountdown > 0 ? 'Starting Soon...' : 'Start Next Round'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
