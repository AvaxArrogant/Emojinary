import { redis } from '@devvit/web/server';
import type {
  GameState,
  Player,
  Round,
  LeaderboardResponse,
} from '../../shared/types/api.js';
import type { RedisLeaderboardEntry } from '../../shared/types/redis.js';
import { REDIS_KEYS, REDIS_TTL } from '../../shared/types/redis.js';
import { GameException, createGameError } from '../../shared/types/errors.js';
import { validateGameId, validateUsername, validateSubredditName } from '../../shared/types/validation.js';
import { RedisCompatibilityManager, AlternativeRankingService, RedisErrorHandler } from './redisCompatibility.js';
import { monitoredRedis, RedisOperationLogger } from './redisMonitoring.js';

// ============================================================================
// GAME STATE PERSISTENCE
// ============================================================================

export async function saveGameState(gameState: GameState): Promise<void> {
  const logger = RedisOperationLogger.getInstance();
  
  try {
    await logger.wrapOperation(
      'saveGameState',
      'set',
      async () => {
        await monitoredRedis.set(
          REDIS_KEYS.GAME(gameState.id),
          JSON.stringify(gameState)
        );
        await monitoredRedis.expire(REDIS_KEYS.GAME(gameState.id), REDIS_TTL.GAME_SESSION);
        return 'success';
      },
      { gameId: gameState.id, gameStateSize: JSON.stringify(gameState).length },
      true
    );
  } catch (error) {
    console.error('Error saving game state:', error);
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to save game state'));
  }
}

export async function getGameStateById(gameId: string): Promise<GameState | null> {
  try {
    const gameStateValidation = validateGameId(gameId);
    if (!gameStateValidation.isValid) {
      throw new GameException(createGameError('INVALID_INPUT', gameStateValidation.errors[0] || 'Invalid game ID'));
    }

    const gameStateData = await monitoredRedis.get(REDIS_KEYS.GAME(gameId));
    
    if (!gameStateData) {
      return null;
    }

    return JSON.parse(gameStateData) as GameState;
  } catch (error) {
    console.error('Error getting game state:', error);
    if (error instanceof GameException) {
      throw error;
    }
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to get game state'));
  }
}

export async function deleteGameState(gameId: string): Promise<void> {
  try {
    await redis.del(REDIS_KEYS.GAME(gameId));
  } catch (error) {
    console.error('Error deleting game state:', error);
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to delete game state'));
  }
}

// ============================================================================
// PLAYER DATA PERSISTENCE
// ============================================================================

export async function savePlayer(gameId: string, player: Player): Promise<void> {
  try {
    await redis.hSet(
      REDIS_KEYS.PLAYERS(gameId),
      { [player.id]: JSON.stringify(player) }
    );
    
    // Set expiration on the players hash
    await redis.expire(REDIS_KEYS.PLAYERS(gameId), REDIS_TTL.GAME_SESSION);
  } catch (error) {
    console.error('Error saving player:', error);
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to save player'));
  }
}

export async function getPlayer(gameId: string, playerId: string): Promise<Player | null> {
  try {
    const playerData = await redis.hGet(REDIS_KEYS.PLAYERS(gameId), playerId);
    if (!playerData || playerData === 'true') {
      return null;
    }

    return JSON.parse(playerData) as Player;
  } catch (error) {
    console.error('Error getting player:', error);
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to get player'));
  }
}

export async function getAllPlayers(gameId: string): Promise<Player[]> {
  try {
    const playersData = await redis.hGetAll(REDIS_KEYS.PLAYERS(gameId));
    
    return Object.values(playersData)
      .filter((data): data is string => typeof data === 'string' && data !== 'true') // Filter out the 'initialized' marker
      .map(data => JSON.parse(data) as Player);
  } catch (error) {
    console.error('Error getting all players:', error);
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to get players'));
  }
}

export async function updatePlayerScore(gameId: string, playerId: string, scoreIncrement: number): Promise<Player> {
  try {
    const player = await getPlayer(gameId, playerId);
    if (!player) {
      throw new GameException(createGameError('GAME_NOT_FOUND', 'Player not found'));
    }

    player.score += scoreIncrement;
    await savePlayer(gameId, player);

    return player;
  } catch (error) {
    console.error('Error updating player score:', error);
    if (error instanceof GameException) {
      throw error;
    }
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to update player score'));
  }
}

// ============================================================================
// ROUND DATA PERSISTENCE
// ============================================================================

export async function saveRound(round: Round): Promise<void> {
  try {
    await redis.set(
      REDIS_KEYS.ROUND(round.gameId, round.id),
      JSON.stringify(round)
    );
    await redis.expire(REDIS_KEYS.ROUND(round.gameId, round.id), REDIS_TTL.GAME_SESSION);
  } catch (error) {
    console.error('Error saving round:', error);
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to save round'));
  }
}

export async function getRound(gameId: string, roundId: string): Promise<Round | null> {
  try {
    const roundData = await redis.get(REDIS_KEYS.ROUND(gameId, roundId));
    if (!roundData) {
      return null;
    }

    return JSON.parse(roundData) as Round;
  } catch (error) {
    console.error('Error getting round:', error);
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to get round'));
  }
}

// ============================================================================
// LEADERBOARD MANAGEMENT
// ============================================================================

export async function updateLeaderboard(subredditName: string, username: string, scoreIncrement: number, gameWon: boolean = false): Promise<void> {
  try {
    const subredditValidation = validateSubredditName(subredditName);
    if (!subredditValidation.isValid) {
      throw new GameException(createGameError('INVALID_INPUT', subredditValidation.errors[0] || 'Invalid subreddit name'));
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      throw new GameException(createGameError('INVALID_INPUT', usernameValidation.errors[0] || 'Invalid username'));
    }

    const leaderboardKey = REDIS_KEYS.LEADERBOARD(subredditName);
    const playerStatsKey = REDIS_KEYS.PLAYER_STATS(subredditName, username);
    const compatibilityManager = RedisCompatibilityManager.getInstance();

    // Get current player stats with enhanced monitoring and error handling
    const currentStatsData = await compatibilityManager.executeWithFallback(
      async () => await monitoredRedis.get(playerStatsKey),
      async () => {
        console.warn(`Fallback: Unable to get player stats for ${username}`);
        return null;
      },
      'get player stats',
      { playerStatsKey, username }
    );

    let playerStats: RedisLeaderboardEntry;

    if (currentStatsData) {
      try {
        playerStats = JSON.parse(currentStatsData);
        playerStats.score += scoreIncrement;
        playerStats.gamesPlayed += 1;
        if (gameWon) {
          playerStats.gamesWon += 1;
        }
        playerStats.lastPlayed = Date.now();
      } catch (parseError) {
        console.error('Error parsing player stats, creating new:', parseError);
        playerStats = {
          username,
          score: scoreIncrement,
          gamesPlayed: 1,
          gamesWon: gameWon ? 1 : 0,
          lastPlayed: Date.now(),
        };
      }
    } else {
      playerStats = {
        username,
        score: scoreIncrement,
        gamesPlayed: 1,
        gamesWon: gameWon ? 1 : 0,
        lastPlayed: Date.now(),
      };
    }

    // Update player stats with enhanced monitoring and error handling
    await compatibilityManager.executeWithFallback(
      async () => {
        await monitoredRedis.set(playerStatsKey, JSON.stringify(playerStats));
        return 'success';
      },
      async () => {
        console.warn(`Fallback: Unable to save player stats for ${username}`);
        // Continue without throwing error - leaderboard update is more important
        return 'fallback';
      },
      'set player stats',
      { playerStatsKey, username, statsSize: JSON.stringify(playerStats).length }
    );

    // Update leaderboard (sorted set by score) with enhanced monitoring and error handling
    await compatibilityManager.executeWithFallback(
      async () => {
        await monitoredRedis.zAdd(leaderboardKey, { score: playerStats.score, member: username });
        return 'success';
      },
      async () => {
        console.error(`Fallback: Unable to update leaderboard for ${username}`);
        throw new GameException(createGameError('SERVER_ERROR', 'Critical: Failed to update leaderboard'));
      },
      'zAdd leaderboard',
      { leaderboardKey, username, score: playerStats.score }
    );

  } catch (error) {
    console.error('Error updating leaderboard:', error);
    
    if (error instanceof GameException) {
      throw error;
    }
    
    // Use error handler for Redis compatibility issues
    const errorHandler = new RedisErrorHandler();
    await errorHandler.handleRedisError(error, 'updateLeaderboard');
    
    // For leaderboard updates, we should still throw an error since this is critical
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to update leaderboard due to Redis compatibility issue'));
  }
}

export async function getLeaderboard(subredditName: string, limit: number = 10): Promise<LeaderboardResponse> {
  const startTime = Date.now();
  let fallbackUsed = false;
  let compatibilityIssues: string[] = [];
  
  try {
    const subredditValidation = validateSubredditName(subredditName);
    if (!subredditValidation.isValid) {
      throw new GameException(createGameError('INVALID_INPUT', subredditValidation.errors[0] || 'Invalid subreddit name'));
    }

    console.log(`Getting leaderboard for ${subredditName} with limit ${limit}`);
    
    const leaderboardKey = REDIS_KEYS.LEADERBOARD(subredditName);
    const compatibilityManager = RedisCompatibilityManager.getInstance();
    const rankingService = new AlternativeRankingService();
    
    // Enhanced leaderboard retrieval with compatibility tracking
    const leaderboardData = await compatibilityManager.executeWithFallback(
      // Primary operation using enhanced ranking service
      async () => {
        console.log(`Fetching leaderboard data using zRange`);
        const topPlayersData = await redis.zRange(leaderboardKey, 0, limit - 1);
        console.log(`Successfully retrieved ${topPlayersData.length} leaderboard entries`);
        return topPlayersData;
      },
      // Enhanced fallback operation
      async () => {
        console.warn(`Redis compatibility issue detected for getLeaderboard(${subredditName})`);
        compatibilityIssues.push('zRange operation failed');
        fallbackUsed = true;
        
        // Try alternative approach using ranking service
        try {
          console.log('Attempting fallback leaderboard retrieval...');
          const fallbackEntries = await rankingService.getLeaderboardWithRanks(leaderboardKey, limit);
          console.log(`Fallback retrieved ${fallbackEntries.length} entries`);
          
          // Convert to expected format
          return fallbackEntries.map(entry => ({
            member: entry.username,
            score: entry.score
          }));
        } catch (fallbackError) {
          console.error('Fallback leaderboard retrieval also failed:', fallbackError);
          compatibilityIssues.push('fallback leaderboard retrieval failed');
          return []; // Return empty array as final fallback
        }
      },
      'getLeaderboard'
    );
    
    const players: Player[] = [];
    let processedCount = 0;
    let errorCount = 0;
    
    // Enhanced player data processing with detailed error handling
    for (let i = 0; i < leaderboardData.length; i++) {
      const playerData = leaderboardData[i];
      
      try {
        let username: string;
        let score: number;
        
        // Handle different data formats
        if (typeof playerData === 'object' && playerData.member && typeof playerData.score === 'number') {
          username = playerData.member;
          score = playerData.score;
        } else if (typeof playerData === 'object' && 'username' in playerData && 'score' in playerData && typeof playerData.score === 'number') {
          // Handle fallback format
          username = (playerData as any).username;
          score = playerData.score;
        } else {
          console.warn(`Unexpected player data format at index ${i}:`, playerData);
          errorCount++;
          continue;
        }
        
        // Get detailed player stats with enhanced error handling
        const playerStats = await compatibilityManager.executeWithFallback(
          async () => {
            const playerStatsData = await redis.get(REDIS_KEYS.PLAYER_STATS(subredditName, username));
            if (playerStatsData) {
              return JSON.parse(playerStatsData) as RedisLeaderboardEntry;
            }
            return null;
          },
          async () => {
            console.warn(`Failed to get detailed stats for ${username}, using basic data`);
            compatibilityIssues.push(`player stats retrieval failed for ${username}`);
            return null;
          },
          `getPlayerStats_${username}`
        );
        
        // Create player object with available data
        const finalPlayerStats: RedisLeaderboardEntry = playerStats || {
          username,
          score,
          gamesPlayed: 1,
          gamesWon: 0,
          lastPlayed: Date.now(),
        };

        players.push({
          id: `leaderboard_${username}`,
          username,
          subredditName,
          score: finalPlayerStats.score,
          isActive: false,
          joinedAt: finalPlayerStats.lastPlayed,
        });
        
        processedCount++;
        
      } catch (playerError) {
        errorCount++;
        console.error(`Error processing player at index ${i}:`, playerError);
        
        // Try to extract minimal data for fallback
        try {
          const username = typeof playerData === 'object' ? 
            (playerData.member || (playerData as any).username || `unknown_${i}`) : 
            `unknown_${i}`;
          const score = typeof playerData === 'object' ? 
            (playerData.score || 0) : 0;
          
          players.push({
            id: `leaderboard_${username}`,
            username,
            subredditName,
            score,
            isActive: false,
            joinedAt: Date.now(),
          });
          
          compatibilityIssues.push(`partial data recovery for player ${username}`);
        } catch (fallbackError) {
          console.error(`Complete failure processing player at index ${i}:`, fallbackError);
          compatibilityIssues.push(`complete failure for player at index ${i}`);
        }
      }
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`Leaderboard processing completed: ${processedCount} players processed, ${errorCount} errors, ${processingTime}ms`);
    
    if (compatibilityIssues.length > 0) {
      console.warn(`Redis compatibility issues detected:`, compatibilityIssues);
    }

    const response: LeaderboardResponse = {
      success: true,
      data: {
        players,
        currentUserRank: 0, // Will be calculated based on current user
        totalPlayers: players.length,
        subredditName,
      },
      timestamp: Date.now(),
    };
    
    // Add compatibility information if issues were detected
    if (fallbackUsed || compatibilityIssues.length > 0) {
      response.fallbackUsed = fallbackUsed;
      (response as any).compatibilityIssue = {
        issuesDetected: compatibilityIssues,
        fallbackUsed,
        processingTime
      };
    }
    
    return response;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Critical error in getLeaderboard:', error);
    
    if (error instanceof GameException) {
      throw error;
    }
    
    // Enhanced error handling with detailed logging
    const errorHandler = new RedisErrorHandler();
    console.error(`Redis compatibility error in getLeaderboard:`, {
      error: (error as Error)?.message || 'Unknown error',
      subredditName,
      limit,
      processingTime,
      timestamp: new Date().toISOString()
    });
    
    await errorHandler.handleRedisError(error, 'getLeaderboard');
    
    // Return comprehensive fallback leaderboard
    return {
      success: true,
      data: {
        players: [],
        currentUserRank: 0,
        totalPlayers: 0,
        subredditName,
      },
      fallbackUsed: true,
      compatibilityIssue: {
        unsupportedMethod: 'multiple Redis operations',
        alternativeUsed: 'empty leaderboard fallback',
        error: (error as Error)?.message || 'Unknown error'
      },
      timestamp: Date.now(),
    };
  }
}

export async function getPlayerRank(subredditName: string, username: string): Promise<number> {
  try {
    const subredditValidation = validateSubredditName(subredditName);
    if (!subredditValidation.isValid) {
      throw new GameException(createGameError('INVALID_INPUT', subredditValidation.errors[0] || 'Invalid subreddit name'));
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      throw new GameException(createGameError('INVALID_INPUT', usernameValidation.errors[0] || 'Invalid username'));
    }

    const leaderboardKey = REDIS_KEYS.LEADERBOARD(subredditName);
    const compatibilityManager = RedisCompatibilityManager.getInstance();
    const rankingService = new AlternativeRankingService();
    
    // Log Redis compatibility check
    console.log(`Getting player rank for ${username} in ${subredditName} using zRange-based calculation`);
    
    // Use compatibility manager with enhanced error handling
    const playerRank = await compatibilityManager.executeWithFallback(
      // Primary operation using alternative ranking algorithm
      async () => {
        const rank = await rankingService.getPlayerRank(leaderboardKey, username);
        console.log(`Successfully calculated rank ${rank} for ${username} using alternative algorithm`);
        return rank;
      },
      // Enhanced fallback with detailed logging
      async () => {
        console.warn(`Redis compatibility issue detected for getPlayerRank(${username})`);
        console.warn('Attempting fallback ranking calculation...');
        
        try {
          // Try to get player score to determine if they exist
          const playerScore = await rankingService.getPlayerScore(leaderboardKey, username);
          if (playerScore > 0) {
            // Player exists but ranking failed - return middle rank as fallback
            const leaderboardSize = await rankingService.getLeaderboardSize(leaderboardKey);
            const fallbackRank = Math.max(1, Math.ceil(leaderboardSize / 2));
            console.warn(`Using estimated fallback rank ${fallbackRank} for ${username} (score: ${playerScore})`);
            return fallbackRank;
          } else {
            console.warn(`Player ${username} not found in leaderboard, returning rank 0`);
            return 0;
          }
        } catch (fallbackError) {
          console.error('Fallback ranking calculation also failed:', fallbackError);
          return 0;
        }
      },
      'getPlayerRank'
    );
    
    return playerRank;
    
  } catch (error) {
    console.error('Error getting player rank:', error);
    
    // Don't throw exception for ranking errors - return fallback rank
    if (error instanceof GameException) {
      throw error; // Re-throw validation errors
    }
    
    // Enhanced error handling with detailed logging
    const errorHandler = new RedisErrorHandler();
    console.error(`Redis compatibility error in getPlayerRank for ${username}:`, {
      error: (error as Error)?.message || 'Unknown error',
      subredditName,
      timestamp: new Date().toISOString()
    });
    
    const fallbackRank = await errorHandler.handleRedisError(error, 'getPlayerRank', 0);
    console.warn(`Using final fallback rank ${fallbackRank} for ${username} due to Redis compatibility issue`);
    return fallbackRank as number;
  }
}

// ============================================================================
// ACTIVE GAMES MANAGEMENT
// ============================================================================

export async function addActiveGame(subredditName: string, gameId: string): Promise<void> {
  try {
    await redis.zAdd(
      REDIS_KEYS.ACTIVE_GAMES(subredditName),
      { score: Date.now(), member: gameId }
    );
  } catch (error) {
    console.error('Error adding active game:', error);
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to add active game'));
  }
}

export async function removeActiveGame(subredditName: string, gameId: string): Promise<void> {
  try {
    await redis.zRem(REDIS_KEYS.ACTIVE_GAMES(subredditName), [gameId]);
  } catch (error) {
    console.error('Error removing active game:', error);
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to remove active game'));
  }
}

export async function getActiveGames(subredditName: string): Promise<string[]> {
  try {
    const activeGames = await redis.zRange(REDIS_KEYS.ACTIVE_GAMES(subredditName), 0, -1);
    return activeGames.map(item => typeof item === 'object' ? item.member : item);
  } catch (error) {
    console.error('Error getting active games:', error);
    throw new GameException(createGameError('SERVER_ERROR', 'Failed to get active games'));
  }
}

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

export async function cleanupExpiredGames(subredditName: string): Promise<void> {
  try {
    const activeGames = await getActiveGames(subredditName);
    const now = Date.now();
    const expiredThreshold = now - (REDIS_TTL.GAME_SESSION * 1000);

    for (const gameId of activeGames) {
      const gameState = await getGameStateById(gameId);
      
      if (!gameState || gameState.updatedAt < expiredThreshold) {
        // Remove expired game
        await removeActiveGame(subredditName, gameId);
        
        if (gameState) {
          await deleteGameState(gameId);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired games:', error);
    // Don't throw error for cleanup operations
  }
}
