import { useState, useEffect, useCallback } from 'react';
import type { Player } from '../../shared/types/game';
import { useGame } from '../contexts/GameContext';

type LeaderboardData = {
  players: Player[];
  currentUserRank: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Hook for fetching and managing leaderboard data from the server
 */
export const useLeaderboardData = (subredditName: string, limit: number = 10): LeaderboardData => {
  const { currentUser, connected } = useGame();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!subredditName) return;

    try {
      setLoading(true);
      setError(null);

      const url = new URL(`/api/leaderboard/${encodeURIComponent(subredditName)}`, window.location.origin);
      url.searchParams.set('limit', limit.toString());
      
      if (currentUser?.username) {
        url.searchParams.set('username', currentUser.username);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }

      setPlayers(data.data.players || []);
      setCurrentUserRank(data.data.currentUserRank || 0);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [subredditName, limit, currentUser?.username]);

  // Initial load
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Refresh when connection is restored
  useEffect(() => {
    if (connected && subredditName) {
      fetchLeaderboard();
    }
  }, [connected, fetchLeaderboard]);

  return {
    players,
    currentUserRank,
    loading,
    error,
    refresh: fetchLeaderboard,
  };
};

/**
 * Hook for real-time leaderboard updates using game context
 */
export const useRealtimeLeaderboard = () => {
  const { players, currentUser } = useGame();

  // Sort players by score (descending)
  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
  
  // Find current user's rank
  const currentUserRank = sortedPlayers.findIndex(p => p.id === currentUser?.id) + 1;
  
  // Get top players
  const topPlayers = sortedPlayers.slice(0, 10);

  return {
    players: sortedPlayers,
    topPlayers,
    currentUser,
    currentUserRank,
    totalPlayers: sortedPlayers.length,
  };
};

export default useLeaderboardData;
