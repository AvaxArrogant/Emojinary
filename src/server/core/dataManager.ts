import { redis } from '@devvit/web/server';
import type {
  GameState,
  Player,
  Round,
  LeaderboardResponse,
  ApiResponse,
} from '../../shared/types/api.js';
import type { RedisGameData, RedisPlayerData, RedisLeaderboardEntry } from '../../shared/types/redis.js';
import { REDIS_KEYS, REDIS_TTL } from '../../shared/types/redis.js';
import { GameException } from '../../shared/types/errors.js';
import { validateGameId, validateUsername, validateSubredditName } from '../../shared/types/validation.js';

// ============================================================================
// GAME STATE PERSISTENCE
// ============================================================================

export async function saveGameState(gameState: GameState): Promise<void> {
  try {
    await redis.set(
      REDIS_KEYS.GAME(gameState.id),
      JSON.stringify(gameState)
    );
    await redis.expire(REDIS_KEYS.GAME(gameState.id), REDIS_TTL.GAME_SESSION);
  } catch (error) {
    console.error('Error saving game state:', error);
    throw new GameException('INTERNAL_ERROR', 'Failed to save game state');
  }
}

export async function getGameStateById(gameId: string): Promise<GameState | null> {
  try {
    const gameStateValidation = validateGameId(gameId);
    if (!gameStateValidation.isValid) {
      throw new GameException('INVALID_INPUT', gameStateValidation.errors[0] || 'Invalid game ID');
    }

    const gameStateData = await redis.get(REDIS_KEYS.GAME(gameId));
    if (!gameStateData) {
      return null;
    }

    return JSON.parse(gameStateData) as GameState;
  } catch (error) {
    console.error('Error getting game state:', error);
    if (error instanceof GameException) {
      throw error;
    }
    throw new GameException('INTERNAL_ERROR', 'Failed to get game state');
  }
}

export async function deleteGameState(gameId: string): Promise<void> {
  try {
    await redis.del(REDIS_KEYS.GAME(gameId));
  } catch (error) {
    console.error('Error deleting game state:', error);
    throw new GameException('INTERNAL_ERROR', 'Failed to delete game state');
  }
}

// ============================================================================
// PLAYER DATA PERSISTENCE
// ============================================================================

export async function savePlayer(gameId: string, player: Player): Promise<void> {
  try {
    await redis.hSet(
      REDIS_KEYS.PLAYERS(gameId),
      player.id,
      JSON.stringify(player)
    );
    
    // Set expiration on the players hash
    await redis.expire(REDIS_KEYS.PLAYERS(gameId), REDIS_TTL.GAME_SESSION);
  } catch (error) {
    console.error('Error saving player:', error);
    throw new GameException('INTERNAL_ERROR', 'Failed to save player');
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
    throw new GameException('INTERNAL_ERROR', 'Failed to get player');
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
    throw new GameException('INTERNAL_ERROR', 'Failed to get players');
  }
}

export async function updatePlayerScore(gameId: string, playerId: string, scoreIncrement: number): Promise<Player> {
  try {
    const player = await getPlayer(gameId, playerId);
    if (!player) {
      throw new GameException('PLAYER_NOT_FOUND', 'Player not found');
    }

    player.score += scoreIncrement;
    await savePlayer(gameId, player);

    return player;
  } catch (error) {
    console.error('Error updating player score:', error);
    if (error instanceof GameException) {
      throw error;
    }
    throw new GameException('INTERNAL_ERROR', 'Failed to update player score');
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
    throw new GameException('INTERNAL_ERROR', 'Failed to save round');
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
    throw new GameException('INTERNAL_ERROR', 'Failed to get round');
  }
}

// ============================================================================
// LEADERBOARD MANAGEMENT
// ============================================================================

export async function updateLeaderboard(subredditName: string, username: string, scoreIncrement: number, gameWon: boolean = false): Promise<void> {
  try {
    const subredditValidation = validateSubredditName(subredditName);
    if (!subredditValidation.isValid) {
      throw new GameException('INVALID_INPUT', subredditValidation.errors[0] || 'Invalid subreddit name');
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      throw new GameException('INVALID_INPUT', usernameValidation.errors[0] || 'Invalid username');
    }

    const leaderboardKey = REDIS_KEYS.LEADERBOARD(subredditName);
    const playerStatsKey = REDIS_KEYS.PLAYER_STATS(subredditName, username);

    // Get current player stats
    const currentStatsData = await redis.get(playerStatsKey);
    let playerStats: RedisLeaderboardEntry;

    if (currentStatsData) {
      playerStats = JSON.parse(currentStatsData);
      playerStats.score += scoreIncrement;
      playerStats.gamesPlayed += 1;
      if (gameWon) {
        playerStats.gamesWon += 1;
      }
      playerStats.lastPlayed = Date.now();
    } else {
      playerStats = {
        username,
        score: scoreIncrement,
        gamesPlayed: 1,
        gamesWon: gameWon ? 1 : 0,
        lastPlayed: Date.now(),
      };
    }

    // Update player stats
    await redis.set(playerStatsKey, JSON.stringify(playerStats));

    // Update leaderboard (sorted set by score)
    await redis.zAdd(leaderboardKey, { score: playerStats.score, value: username });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    if (error instanceof GameException) {
      throw error;
    }
    throw new GameException('INTERNAL_ERROR', 'Failed to update leaderboard');
  }
}

export async function getLeaderboard(subredditName: string, limit: number = 10): Promise<LeaderboardResponse> {
  try {
    const subredditValidation = validateSubredditName(subredditName);
    if (!subredditValidation.isValid) {
      throw new GameException('INVALID_INPUT', subredditValidation.errors[0] || 'Invalid subreddit name');
    }

    const leaderboardKey = REDIS_KEYS.LEADERBOARD(subredditName);
    
    // Get top players (highest scores first)
    const topPlayersData = await redis.zRange(leaderboardKey, 0, limit - 1, { REV: true, BY: 'SCORE' });
    
    const players: Player[] = [];
    
    // Process the results (Redis returns [member, score, member, score, ...])
    for (let i = 0; i < topPlayersData.length; i += 2) {
      const username = topPlayersData[i];
      const score = parseInt(topPlayersData[i + 1]);
      
      // Get detailed player stats
      const playerStatsData = await redis.get(REDIS_KEYS.PLAYER_STATS(subredditName, username));
      let playerStats: RedisLeaderboardEntry;
      
      if (playerStatsData) {
        playerStats = JSON.parse(playerStatsData);
      } else {
        // Fallback if detailed stats don't exist
        playerStats = {
          username,
          score,
          gamesPlayed: 1,
          gamesWon: 0,
          lastPlayed: Date.now(),
        };
      }

      players.push({
        id: `leaderboard_${username}`,
        username,
        subredditName,
        score: playerStats.score,
        isActive: false,
        joinedAt: playerStats.lastPlayed,
      });
    }

    return {
      success: true,
      data: {
        players,
        currentUserRank: 0, // Will be calculated based on current user
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    if (error instanceof GameException) {
      throw error;
    }
    throw new GameException('INTERNAL_ERROR', 'Failed to get leaderboard');
  }
}

export async function getPlayerRank(subredditName: string, username: string): Promise<number> {
  try {
    const leaderboardKey = REDIS_KEYS.LEADERBOARD(subredditName);
    
    // Get player's rank (0-based, so add 1 for 1-based ranking)
    const rank = await redis.zRevRank(leaderboardKey, username);
    
    return rank !== null ? rank + 1 : 0;
  } catch (error) {
    console.error('Error getting player rank:', error);
    throw new GameException('INTERNAL_ERROR', 'Failed to get player rank');
  }
}

// ============================================================================
// ACTIVE GAMES MANAGEMENT
// ============================================================================

export async function addActiveGame(subredditName: string, gameId: string): Promise<void> {
  try {
    await redis.zAdd(
      REDIS_KEYS.ACTIVE_GAMES(subredditName),
      { score: Date.now(), value: gameId }
    );
  } catch (error) {
    console.error('Error adding active game:', error);
    throw new GameException('INTERNAL_ERROR', 'Failed to add active game');
  }
}

export async function removeActiveGame(subredditName: string, gameId: string): Promise<void> {
  try {
    await redis.zRem(REDIS_KEYS.ACTIVE_GAMES(subredditName), gameId);
  } catch (error) {
    console.error('Error removing active game:', error);
    throw new GameException('INTERNAL_ERROR', 'Failed to remove active game');
  }
}

export async function getActiveGames(subredditName: string): Promise<string[]> {
  try {
    const activeGames = await redis.zRange(REDIS_KEYS.ACTIVE_GAMES(subredditName), 0, -1);
    return activeGames;
  } catch (error) {
    console.error('Error getting active games:', error);
    throw new GameException('INTERNAL_ERROR', 'Failed to get active games');
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
