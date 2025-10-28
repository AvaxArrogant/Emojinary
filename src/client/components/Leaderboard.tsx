import React from 'react';
import type { Player } from '../../shared/types/game';
import { useLeaderboardData } from '../hooks/useLeaderboard';
import { ScoreDisplay } from './ScoreDisplay';

type LeaderboardProps = {
  subredditName: string;
  currentUser?: Player | null;
  showCurrentUserRank?: boolean;
  limit?: number;
  className?: string;
};

type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
  isCurrentUser: boolean;
};

export const Leaderboard: React.FC<LeaderboardProps> = ({
  subredditName,
  currentUser,
  showCurrentUserRank = true,
  limit = 10,
  className = '',
}) => {
  const { players, currentUserRank, loading, error, refresh } = useLeaderboardData(subredditName, limit);

  // Transform players to leaderboard entries
  const leaderboard: LeaderboardEntry[] = players.map((player, index) => ({
    rank: index + 1,
    username: player.username,
    score: player.score,
    isCurrentUser: player.username === currentUser?.username,
  }));

  // Render loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (leaderboard.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 Leaderboard</h3>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🎯</div>
          <p>No scores yet!</p>
          <p className="text-sm">Be the first to play and earn points.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🏆 Leaderboard</h3>
        <button
          onClick={refresh}
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          title="Refresh leaderboard"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Current user rank (if not in top list) */}
      {showCurrentUserRank && currentUser && currentUserRank > limit && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700">
            Your rank: <span className="font-semibold">#{currentUserRank}</span>
          </div>
        </div>
      )}

      {/* Leaderboard entries */}
      <div className="space-y-2">
        {leaderboard.map((entry) => {
          const player: Player = {
            id: `leaderboard_${entry.username}`,
            username: entry.username,
            subredditName,
            score: entry.score,
            isActive: false,
            joinedAt: Date.now(),
          };

          return (
            <div
              key={entry.username}
              className={`p-3 rounded-lg transition-colors ${
                entry.isCurrentUser
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <ScoreDisplay
                player={player}
                showRank={true}
                rank={entry.rank}
                isCurrentUser={entry.isCurrentUser}
                size="medium"
              />
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Showing top {Math.min(limit, leaderboard.length)} players
          {loading && (
            <span className="ml-2 text-blue-600">• Updating...</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
