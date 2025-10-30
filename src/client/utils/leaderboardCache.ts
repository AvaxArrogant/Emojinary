import type { Player } from '../../shared/types/game';

export type CachedLeaderboardData = {
  players: Player[];
  currentUserRank: number;
  timestamp: number;
  subredditName: string;
  fallbackUsed?: boolean;
  compatibilityIssue?: {
    unsupportedMethod: string;
    alternativeUsed: string;
  };
};

export type CacheConfig = {
  maxAge: number; // Cache expiry time in milliseconds
  backgroundRefreshInterval: number; // Background refresh interval in milliseconds
  maxRetries: number; // Maximum retry attempts for background refresh
  retryDelay: number; // Base delay for retry attempts
};

/**
 * Client-side leaderboard cache with background refresh capabilities
 * Implements Requirements 2.1, 2.2, 6.4 from redis-compatibility-fix
 */
export class LeaderboardCache {
  private cache = new Map<string, CachedLeaderboardData>();
  private backgroundRefreshTimers = new Map<string, NodeJS.Timeout>();
  private retryTimers = new Map<string, NodeJS.Timeout>();
  private refreshCallbacks = new Map<string, Set<() => void>>();
  
  private config: CacheConfig = {
    maxAge: 30000, // 30 seconds
    backgroundRefreshInterval: 60000, // 1 minute
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds base delay
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Get cached leaderboard data if available and not expired
   */
  get(subredditName: string, limit: number): CachedLeaderboardData | null {
    const cacheKey = this.getCacheKey(subredditName, limit);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    // Return cached data even if expired (stale-while-revalidate pattern)
    // Background refresh will update it
    return cached;
  }

  /**
   * Check if cached data is fresh (not expired)
   */
  isFresh(subredditName: string, limit: number): boolean {
    const cacheKey = this.getCacheKey(subredditName, limit);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return false;
    }
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    return age < this.config.maxAge;
  }

  /**
   * Set cached leaderboard data and start background refresh
   */
  set(
    subredditName: string, 
    limit: number, 
    data: Omit<CachedLeaderboardData, 'timestamp' | 'subredditName'>
  ): void {
    const cacheKey = this.getCacheKey(subredditName, limit);
    const cachedData: CachedLeaderboardData = {
      ...data,
      timestamp: Date.now(),
      subredditName,
    };
    
    this.cache.set(cacheKey, cachedData);
    this.startBackgroundRefresh(subredditName, limit);
  }

  /**
   * Invalidate cache for specific subreddit and limit
   */
  invalidate(subredditName: string, limit: number): void {
    const cacheKey = this.getCacheKey(subredditName, limit);
    this.cache.delete(cacheKey);
    this.stopBackgroundRefresh(cacheKey);
  }

  /**
   * Invalidate all cache entries for a subreddit (useful for score updates)
   */
  invalidateSubreddit(subredditName: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, data] of this.cache.entries()) {
      if (data.subredditName === subredditName) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.stopBackgroundRefresh(key);
    });
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    
    // Clear all timers
    this.backgroundRefreshTimers.forEach(timer => clearTimeout(timer));
    this.backgroundRefreshTimers.clear();
    
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
    
    this.refreshCallbacks.clear();
  }

  /**
   * Subscribe to cache refresh events
   */
  onRefresh(subredditName: string, limit: number, callback: () => void): () => void {
    const cacheKey = this.getCacheKey(subredditName, limit);
    
    if (!this.refreshCallbacks.has(cacheKey)) {
      this.refreshCallbacks.set(cacheKey, new Set());
    }
    
    this.refreshCallbacks.get(cacheKey)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.refreshCallbacks.get(cacheKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.refreshCallbacks.delete(cacheKey);
        }
      }
    };
  }

  /**
   * Force refresh cache data from server
   */
  async refresh(subredditName: string, limit: number, currentUsername?: string): Promise<CachedLeaderboardData | null> {
    try {
      const url = new URL(`/api/leaderboard/${encodeURIComponent(subredditName)}`, window.location.origin);
      url.searchParams.set('limit', limit.toString());
      
      if (currentUsername) {
        url.searchParams.set('username', currentUsername);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }

      // Update cache with fresh data
      const cachedData: CachedLeaderboardData = {
        players: data.data.players || [],
        currentUserRank: data.data.currentUserRank || 0,
        timestamp: Date.now(),
        subredditName,
        fallbackUsed: data.fallbackUsed,
        compatibilityIssue: data.compatibilityIssue,
      };
      
      const cacheKey = this.getCacheKey(subredditName, limit);
      this.cache.set(cacheKey, cachedData);
      
      // Notify subscribers
      this.notifyRefreshCallbacks(cacheKey);
      
      return cachedData;
      
    } catch (error) {
      console.error('Cache refresh failed:', error);
      return null;
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): {
    cacheSize: number;
    activeRefreshTimers: number;
    activeRetryTimers: number;
    entries: Array<{
      key: string;
      subredditName: string;
      age: number;
      isFresh: boolean;
      playersCount: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, data]) => ({
      key,
      subredditName: data.subredditName,
      age: now - data.timestamp,
      isFresh: (now - data.timestamp) < this.config.maxAge,
      playersCount: data.players.length,
    }));

    return {
      cacheSize: this.cache.size,
      activeRefreshTimers: this.backgroundRefreshTimers.size,
      activeRetryTimers: this.retryTimers.size,
      entries,
    };
  }

  private getCacheKey(subredditName: string, limit: number): string {
    return `${subredditName}:${limit}`;
  }

  private startBackgroundRefresh(subredditName: string, limit: number): void {
    const cacheKey = this.getCacheKey(subredditName, limit);
    
    // Clear existing timer if any
    this.stopBackgroundRefresh(cacheKey);
    
    // Start new background refresh timer
    const timer = setTimeout(() => {
      this.performBackgroundRefresh(subredditName, limit, 0);
    }, this.config.backgroundRefreshInterval);
    
    this.backgroundRefreshTimers.set(cacheKey, timer);
  }

  private stopBackgroundRefresh(cacheKey: string): void {
    const timer = this.backgroundRefreshTimers.get(cacheKey);
    if (timer) {
      clearTimeout(timer);
      this.backgroundRefreshTimers.delete(cacheKey);
    }
    
    const retryTimer = this.retryTimers.get(cacheKey);
    if (retryTimer) {
      clearTimeout(retryTimer);
      this.retryTimers.delete(cacheKey);
    }
  }

  private async performBackgroundRefresh(
    subredditName: string, 
    limit: number, 
    retryCount: number
  ): Promise<void> {
    const cacheKey = this.getCacheKey(subredditName, limit);
    
    try {
      // Get current cached data to extract username if available
      const cached = this.cache.get(cacheKey);
      const currentUsername = cached?.players.find(p => p.username)?.username;
      
      const refreshedData = await this.refresh(subredditName, limit, currentUsername);
      
      if (refreshedData) {
        console.log(`Background refresh successful for ${cacheKey}`);
        // Schedule next refresh
        this.startBackgroundRefresh(subredditName, limit);
      } else {
        throw new Error('Background refresh returned null');
      }
      
    } catch (error) {
      console.warn(`Background refresh failed for ${cacheKey}:`, error);
      
      // Implement retry with exponential backoff
      if (retryCount < this.config.maxRetries) {
        const delay = this.config.retryDelay * Math.pow(2, retryCount);
        console.log(`Retrying background refresh for ${cacheKey} in ${delay}ms (attempt ${retryCount + 1}/${this.config.maxRetries})`);
        
        const retryTimer = setTimeout(() => {
          this.performBackgroundRefresh(subredditName, limit, retryCount + 1);
        }, delay);
        
        this.retryTimers.set(cacheKey, retryTimer);
      } else {
        console.error(`Background refresh failed after ${this.config.maxRetries} retries for ${cacheKey}`);
        // Schedule next regular refresh attempt
        this.startBackgroundRefresh(subredditName, limit);
      }
    }
  }

  private notifyRefreshCallbacks(cacheKey: string): void {
    const callbacks = this.refreshCallbacks.get(cacheKey);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in refresh callback:', error);
        }
      });
    }
  }
}

// Global cache instance
export const leaderboardCache = new LeaderboardCache();

// Cache invalidation helpers
export const invalidateLeaderboardCache = (subredditName: string, limit?: number) => {
  if (limit !== undefined) {
    leaderboardCache.invalidate(subredditName, limit);
  } else {
    leaderboardCache.invalidateSubreddit(subredditName);
  }
};

export const clearLeaderboardCache = () => {
  leaderboardCache.clear();
};
