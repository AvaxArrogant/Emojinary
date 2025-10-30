import { leaderboardCache } from './leaderboardCache';

/**
 * Cache invalidation strategies for leaderboard data
 * Implements cache invalidation strategy for score updates (Requirement 6.4)
 */

export type InvalidationEvent = 
  | 'score_update'
  | 'game_complete'
  | 'player_join'
  | 'player_leave'
  | 'manual_refresh';

export type InvalidationScope = 
  | 'current_user'
  | 'all_players'
  | 'subreddit'
  | 'global';

/**
 * Invalidate leaderboard cache based on game events
 */
export const invalidateLeaderboardOnEvent = (
  event: InvalidationEvent,
  subredditName: string,
  scope: InvalidationScope = 'subreddit',
  metadata?: {
    username?: string;
    scoreChange?: number;
    gameId?: string;
  }
) => {
  console.log(`Invalidating leaderboard cache: ${event} (${scope}) for ${subredditName}`, metadata);

  switch (event) {
    case 'score_update':
      // Score updates affect leaderboard rankings
      if (scope === 'subreddit' || scope === 'all_players') {
        leaderboardCache.invalidateSubreddit(subredditName);
      }
      break;

    case 'game_complete':
      // Game completion typically involves score updates
      leaderboardCache.invalidateSubreddit(subredditName);
      break;

    case 'player_join':
      // New players might affect leaderboard if they have existing scores
      if (scope === 'subreddit' || scope === 'all_players') {
        leaderboardCache.invalidateSubreddit(subredditName);
      }
      break;

    case 'player_leave':
      // Player leaving doesn't affect historical leaderboard data
      // Only invalidate if it's a real-time leaderboard
      break;

    case 'manual_refresh':
      // Manual refresh should clear all cache
      if (scope === 'global') {
        leaderboardCache.clear();
      } else {
        leaderboardCache.invalidateSubreddit(subredditName);
      }
      break;

    default:
      console.warn(`Unknown invalidation event: ${event}`);
  }
};

/**
 * Smart cache invalidation based on score changes
 */
export const invalidateOnScoreChange = (
  subredditName: string,
  username: string,
  oldScore: number,
  newScore: number
) => {
  const scoreChange = newScore - oldScore;
  
  // Only invalidate if score actually changed
  if (scoreChange === 0) {
    return;
  }

  // Significant score changes are more likely to affect rankings
  const isSignificantChange = Math.abs(scoreChange) >= 10;
  
  if (isSignificantChange) {
    console.log(`Significant score change for ${username}: ${oldScore} -> ${newScore} (${scoreChange > 0 ? '+' : ''}${scoreChange})`);
    invalidateLeaderboardOnEvent('score_update', subredditName, 'subreddit', {
      username,
      scoreChange,
    });
  } else {
    // For small changes, we might want to be less aggressive
    // But still invalidate to ensure accuracy
    invalidateLeaderboardOnEvent('score_update', subredditName, 'subreddit', {
      username,
      scoreChange,
    });
  }
};

/**
 * Batch invalidation for multiple score updates
 */
export const batchInvalidateScoreUpdates = (
  updates: Array<{
    subredditName: string;
    username: string;
    oldScore: number;
    newScore: number;
  }>
) => {
  // Group updates by subreddit to minimize invalidations
  const subredditGroups = new Map<string, typeof updates>();
  
  updates.forEach(update => {
    if (!subredditGroups.has(update.subredditName)) {
      subredditGroups.set(update.subredditName, []);
    }
    subredditGroups.get(update.subredditName)!.push(update);
  });

  // Invalidate once per subreddit
  subredditGroups.forEach((subredditUpdates, subredditName) => {
    const totalScoreChange = subredditUpdates.reduce(
      (sum, update) => sum + (update.newScore - update.oldScore),
      0
    );
    
    console.log(`Batch invalidating ${subredditName}: ${subredditUpdates.length} updates, total change: ${totalScoreChange}`);
    
    invalidateLeaderboardOnEvent('score_update', subredditName, 'subreddit', {
      scoreChange: totalScoreChange,
    });
  });
};

/**
 * Conditional invalidation based on cache age and data freshness
 */
export const conditionalInvalidate = (
  subredditName: string,
  limit: number,
  maxAge: number = 60000 // 1 minute
) => {
  const cachedData = leaderboardCache.get(subredditName, limit);
  
  if (!cachedData) {
    return false; // No cache to invalidate
  }
  
  const age = Date.now() - cachedData.timestamp;
  
  if (age > maxAge) {
    console.log(`Conditionally invalidating stale cache for ${subredditName} (age: ${age}ms)`);
    leaderboardCache.invalidate(subredditName, limit);
    return true;
  }
  
  return false;
};

/**
 * Preemptive cache warming for anticipated data needs
 */
export const warmLeaderboardCache = async (
  subredditName: string,
  limits: number[] = [5, 10, 20],
  currentUsername?: string
) => {
  console.log(`Warming leaderboard cache for ${subredditName}`, { limits, currentUsername });
  
  const warmingPromises = limits.map(async (limit) => {
    try {
      await leaderboardCache.refresh(subredditName, limit, currentUsername);
      console.log(`Cache warmed for ${subredditName}:${limit}`);
    } catch (error) {
      console.warn(`Failed to warm cache for ${subredditName}:${limit}:`, error);
    }
  });
  
  await Promise.allSettled(warmingPromises);
};

/**
 * Cache health monitoring and automatic cleanup
 */
export const monitorCacheHealth = () => {
  const stats = leaderboardCache.getStats();
  
  console.log('Leaderboard cache health:', {
    cacheSize: stats.cacheSize,
    activeRefreshTimers: stats.activeRefreshTimers,
    activeRetryTimers: stats.activeRetryTimers,
    staleEntries: stats.entries.filter(e => !e.isFresh).length,
    oldestEntry: Math.max(...stats.entries.map(e => e.age), 0),
  });
  
  // Clean up very old entries (older than 10 minutes)
  const maxAge = 10 * 60 * 1000; // 10 minutes
  const entriesToClean = stats.entries.filter(e => e.age > maxAge);
  
  if (entriesToClean.length > 0) {
    console.log(`Cleaning up ${entriesToClean.length} old cache entries`);
    entriesToClean.forEach(entry => {
      const [subredditName, limitStr] = entry.key.split(':');
      const limit = parseInt(limitStr, 10);
      leaderboardCache.invalidate(subredditName, limit);
    });
  }
  
  return stats;
};

// Set up periodic cache health monitoring
let healthMonitorInterval: NodeJS.Timeout | null = null;

export const startCacheHealthMonitoring = (intervalMs: number = 5 * 60 * 1000) => {
  if (healthMonitorInterval) {
    clearInterval(healthMonitorInterval);
  }
  
  healthMonitorInterval = setInterval(() => {
    monitorCacheHealth();
  }, intervalMs);
  
  console.log(`Started cache health monitoring (interval: ${intervalMs}ms)`);
};

export const stopCacheHealthMonitoring = () => {
  if (healthMonitorInterval) {
    clearInterval(healthMonitorInterval);
    healthMonitorInterval = null;
    console.log('Stopped cache health monitoring');
  }
};
