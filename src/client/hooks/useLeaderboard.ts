import { useState, useEffect, useCallback, useRef } from 'react';
import type { Player } from '../../shared/types/game';
import { useGame } from '../contexts/GameContext';

type LeaderboardData = {
  players: Player[];
  currentUserRank: number;
  loading: boolean;
  error: string | null;
  fallbackMode: boolean;
  retryCount: number;
  refresh: () => Promise<void>;
  retryManually: () => Promise<void>;
};

/**
 * Hook for fetching and managing leaderboard data from the server with retry logic
 * Implements Requirements 2.3, 3.3, 3.4, 3.5 from multiplayer-game-flow-fix
 */
export const useLeaderboardData = (subredditName: string, limit: number = 10): LeaderboardData => {
  const { currentUser, connected } = useGame();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Use ref to track retry timeouts for cleanup
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  const fetchLeaderboard = useCallback(async (isRetry: boolean = false) => {
    if (!subredditName) return;

    try {
      setLoading(true);
      if (!isRetry) {
        setError(null);
        setFallbackMode(false);
      }

      const url = new URL(`/api/leaderboard/${encodeURIComponent(subredditName)}`, window.location.origin);
      url.searchParams.set('limit', limit.toString());
      
      if (currentUser?.username) {
        url.searchParams.set('username', currentUser.username);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (!response.ok) {
        // Handle different HTTP error codes
        if (response.status === 404) {
          throw new Error('Leaderboard not found for this subreddit');
        } else if (response.status === 500) {
          throw new Error('Server error - leaderboard temporarily unavailable');
        } else if (response.status >= 400 && response.status < 500) {
          throw new Error(`Client error: ${response.status}`);
        } else {
          throw new Error(`Network error: ${response.status}`);
        }
      }

      const data = await response.json();
      
      if (!data.success) {
        // Handle Redis compatibility issues specifically
        if (data.compatibilityIssue) {
          console.warn('Redis compatibility issue detected:', data.compatibilityIssue);
          setFallbackMode(true);
        }
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }

      // Success - reset retry count and fallback mode
      setPlayers(data.data.players || []);
      setCurrentUserRank(data.data.currentUserRank || 0);
      setRetryCount(0);
      setError(null);
      
      // Check if fallback was used by server
      if (data.fallbackUsed) {
        setFallbackMode(true);
        console.info('Leaderboard loaded using fallback mode');
      }
      
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leaderboard';
      
      // Implement exponential backoff retry logic
      if (retryCount < maxRetries && connected) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Retrying leaderboard fetch in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        setRetryCount(prev => prev + 1);
        
        // Clear any existing timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        // Schedule retry with exponential backoff
        retryTimeoutRef.current = setTimeout(() => {
          fetchLeaderboard(true);
        }, delay);
        
        // Don't set error state during retries, keep loading
        setError(`${errorMessage} (retrying...)`);
      } else {
        // Max retries reached or not connected
        setError(errorMessage);
        setFallbackMode(true);
        setRetryCount(0);
        
        // Provide empty fallback data
        setPlayers([]);
        setCurrentUserRank(0);
        
        console.warn(`Leaderboard fetch failed after ${maxRetries} retries, entering fallback mode`);
      }
    } finally {
      setLoading(false);
    }
  }, [subredditName, limit, currentUser?.username, retryCount, connected, maxRetries]);

  // Manual retry function for user-triggered retries
  const retryManually = useCallback(async () => {
    console.log('Manual leaderboard retry triggered');
    setRetryCount(0);
    setError(null);
    setFallbackMode(false);
    await fetchLeaderboard(false);
  }, [fetchLeaderboard]);

  // Initial load
  useEffect(() => {
    fetchLeaderboard(false);
  }, [fetchLeaderboard]);

  // Refresh when connection is restored
  useEffect(() => {
    if (connected && subredditName && error) {
      console.log('Connection restored, retrying leaderboard fetch');
      retryManually();
    }
  }, [connected, subredditName, error, retryManually]);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    players,
    currentUserRank,
    loading,
    error,
    fallbackMode,
    retryCount,
    refresh: () => fetchLeaderboard(false),
    retryManually,
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
