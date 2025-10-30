import { useState, useEffect, useCallback, useRef } from 'react';
import type { Player } from '../../shared/types/game';
import { useGame } from '../contexts/GameContext';
import { leaderboardCache, type CachedLeaderboardData } from '../utils/leaderboardCache';

type CachedLeaderboardHookData = {
  players: Player[];
  currentUserRank: number;
  loading: boolean;
  error: string | null;
  fallbackMode: boolean;
  retryCount: number;
  isCached: boolean;
  cacheAge: number;
  refresh: () => Promise<void>;
  retryManually: () => Promise<void>;
  invalidateCache: () => void;
};

/**
 * Enhanced leaderboard hook with client-side caching and background refresh
 * Implements Requirements 2.1, 2.2, 6.4 from redis-compatibility-fix
 */
export const useCachedLeaderboard = (subredditName: string, limit: number = 10): CachedLeaderboardHookData => {
  const { currentUser, connected } = useGame();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isCached, setIsCached] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);
  
  // Use ref to track retry timeouts for cleanup
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCallbackRef = useRef<(() => void) | null>(null);
  const maxRetries = 3;

  // Update state from cached data
  const updateFromCache = useCallback((cachedData: CachedLeaderboardData) => {
    setPlayers(cachedData.players);
    setCurrentUserRank(cachedData.currentUserRank);
    setFallbackMode(cachedData.fallbackUsed || false);
    setIsCached(true);
    setCacheAge(Date.now() - cachedData.timestamp);
    
    if (cachedData.compatibilityIssue) {
      console.warn('Redis compatibility issue in cached data:', cachedData.compatibilityIssue);
    }
  }, []);

  // Fetch leaderboard data with caching
  const fetchLeaderboard = useCallback(async (isRetry: boolean = false, forceRefresh: boolean = false) => {
    if (!subredditName) return;

    try {
      setLoading(true);
      if (!isRetry) {
        setError(null);
      }

      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedData = leaderboardCache.get(subredditName, limit);
        if (cachedData) {
          updateFromCache(cachedData);
          setLoading(false);
          
          // If cache is fresh, we're done
          if (leaderboardCache.isFresh(subredditName, limit)) {
            setRetryCount(0);
            setError(null);
            return;
          }
          
          // Cache is stale, continue to fetch fresh data but don't show loading
          setLoading(false);
        }
      }

      // Fetch fresh data from server
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
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (!response.ok) {
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
        if (data.compatibilityIssue) {
          console.warn('Redis compatibility issue detected:', data.compatibilityIssue);
          setFallbackMode(true);
        }
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }

      // Update cache with fresh data
      leaderboardCache.set(subredditName, limit, {
        players: data.data.players || [],
        currentUserRank: data.data.currentUserRank || 0,
        fallbackUsed: data.fallbackUsed,
        compatibilityIssue: data.compatibilityIssue,
      });

      // Update state with fresh data
      setPlayers(data.data.players || []);
      setCurrentUserRank(data.data.currentUserRank || 0);
      setRetryCount(0);
      setError(null);
      setIsCached(false);
      setCacheAge(0);
      
      if (data.fallbackUsed) {
        setFallbackMode(true);
        console.info('Leaderboard loaded using fallback mode');
      } else {
        setFallbackMode(false);
      }
      
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leaderboard';
      
      // Check if we have cached data to fall back to
      const cachedData = leaderboardCache.get(subredditName, limit);
      if (cachedData && !forceRefresh) {
        console.log('Using cached data due to fetch error');
        updateFromCache(cachedData);
        setError(`${errorMessage} (showing cached data)`);
        setLoading(false);
        return;
      }
      
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
          fetchLeaderboard(true, forceRefresh);
        }, delay);
        
        setError(`${errorMessage} (retrying...)`);
      } else {
        // Max retries reached or not connected
        setError(errorMessage);
        setFallbackMode(true);
        setRetryCount(0);
        
        // If no cached data available, provide empty fallback
        if (!cachedData) {
          setPlayers([]);
          setCurrentUserRank(0);
          setIsCached(false);
          setCacheAge(0);
        }
        
        console.warn(`Leaderboard fetch failed after ${maxRetries} retries, entering fallback mode`);
      }
    } finally {
      if (!retryTimeoutRef.current) {
        setLoading(false);
      }
    }
  }, [subredditName, limit, currentUser?.username, retryCount, connected, maxRetries, updateFromCache]);

  // Manual retry function for user-triggered retries
  const retryManually = useCallback(async () => {
    console.log('Manual leaderboard retry triggered');
    setRetryCount(0);
    setError(null);
    await fetchLeaderboard(false, true); // Force refresh on manual retry
  }, [fetchLeaderboard]);

  // Invalidate cache function
  const invalidateCache = useCallback(() => {
    leaderboardCache.invalidate(subredditName, limit);
    setIsCached(false);
    setCacheAge(0);
  }, [subredditName, limit]);

  // Subscribe to cache refresh events
  useEffect(() => {
    if (!subredditName) return;

    const unsubscribe = leaderboardCache.onRefresh(subredditName, limit, () => {
      console.log('Cache refreshed in background, updating UI');
      const cachedData = leaderboardCache.get(subredditName, limit);
      if (cachedData) {
        updateFromCache(cachedData);
        setError(null); // Clear any previous errors
      }
    });

    refreshCallbackRef.current = unsubscribe;

    return () => {
      if (refreshCallbackRef.current) {
        refreshCallbackRef.current();
        refreshCallbackRef.current = null;
      }
    };
  }, [subredditName, limit, updateFromCache]);

  // Initial load
  useEffect(() => {
    fetchLeaderboard(false);
  }, [fetchLeaderboard]);

  // Refresh when connection is restored
  useEffect(() => {
    if (connected && subredditName && error && !error.includes('cached data')) {
      console.log('Connection restored, retrying leaderboard fetch');
      retryManually();
    }
  }, [connected, subredditName, error, retryManually]);

  // Update cache age periodically for cached data
  useEffect(() => {
    if (!isCached) return;

    const interval = setInterval(() => {
      const cachedData = leaderboardCache.get(subredditName, limit);
      if (cachedData) {
        setCacheAge(Date.now() - cachedData.timestamp);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isCached, subredditName, limit]);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (refreshCallbackRef.current) {
        refreshCallbackRef.current();
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
    isCached,
    cacheAge,
    refresh: () => fetchLeaderboard(false, true),
    retryManually,
    invalidateCache,
  };
};

export default useCachedLeaderboard;
