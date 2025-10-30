import { redis } from '@devvit/web/server';
import { REDIS_KEYS, REDIS_TTL } from '../../shared/types/redis.js';
import { LobbyTimer, LOBBY_TIMER_CONFIG } from '../../shared/types/game.js';

// ============================================================================
// LOBBY TIMER MANAGEMENT
// ============================================================================

export type LobbyTimerState = {
  isActive: boolean;
  startTime: number;
  duration: number;
  remainingTime: number;
  lastSyncTime: number;
  playerCount: number;
};

/**
 * Creates a new lobby timer for a game
 */
export async function createLobbyTimer(gameId: string, playerCount: number): Promise<LobbyTimer> {
  const now = Date.now();
  const timer: LobbyTimer = {
    isActive: playerCount >= LOBBY_TIMER_CONFIG.MIN_PLAYERS_FOR_TIMER,
    startTime: now,
    duration: LOBBY_TIMER_CONFIG.COUNTDOWN_DURATION,
    remainingTime: LOBBY_TIMER_CONFIG.COUNTDOWN_DURATION,
    lastSyncTime: now,
  };

  // Store timer state in Redis
  await redis.set(REDIS_KEYS.LOBBY_TIMER(gameId), JSON.stringify(timer));
  await redis.expire(REDIS_KEYS.LOBBY_TIMER(gameId), REDIS_TTL.LOBBY_TIMER);

  // Store sync data
  const syncData: LobbyTimerState = {
    ...timer,
    playerCount,
  };
  await redis.set(REDIS_KEYS.LOBBY_TIMER_SYNC(gameId), JSON.stringify(syncData));
  await redis.expire(REDIS_KEYS.LOBBY_TIMER_SYNC(gameId), REDIS_TTL.LOBBY_TIMER_SYNC);

  return timer;
}

/**
 * Gets the current lobby timer state
 */
export async function getLobbyTimer(gameId: string): Promise<LobbyTimer | null> {
  try {
    const timerData = await redis.get(REDIS_KEYS.LOBBY_TIMER(gameId));
    if (!timerData) {
      return null;
    }

    const timer: LobbyTimer = JSON.parse(timerData);
    
    // Update remaining time based on current time
    if (timer.isActive) {
      const now = Date.now();
      const elapsed = now - timer.startTime;
      timer.remainingTime = Math.max(0, timer.duration - elapsed);
      timer.lastSyncTime = now;

      // If timer expired, mark as inactive
      if (timer.remainingTime <= 0) {
        timer.isActive = false;
      }
    }

    return timer;
  } catch (error) {
    console.error(`Failed to get lobby timer for game ${gameId}:`, error);
    return null;
  }
}

/**
 * Updates lobby timer state
 */
export async function updateLobbyTimer(gameId: string, timer: LobbyTimer): Promise<void> {
  try {
    await redis.set(REDIS_KEYS.LOBBY_TIMER(gameId), JSON.stringify(timer));
    await redis.expire(REDIS_KEYS.LOBBY_TIMER(gameId), REDIS_TTL.LOBBY_TIMER);
  } catch (error) {
    console.error(`Failed to update lobby timer for game ${gameId}:`, error);
  }
}

/**
 * Resets the lobby timer when new players join
 */
export async function resetLobbyTimer(gameId: string, playerCount: number): Promise<LobbyTimer | null> {
  try {
    if (!LOBBY_TIMER_CONFIG.RESET_ON_JOIN) {
      return await getLobbyTimer(gameId);
    }

    const now = Date.now();
    const timer: LobbyTimer = {
      isActive: playerCount >= LOBBY_TIMER_CONFIG.MIN_PLAYERS_FOR_TIMER,
      startTime: now,
      duration: LOBBY_TIMER_CONFIG.COUNTDOWN_DURATION,
      remainingTime: LOBBY_TIMER_CONFIG.COUNTDOWN_DURATION,
      lastSyncTime: now,
    };

    await updateLobbyTimer(gameId, timer);

    // Update sync data
    const syncData: LobbyTimerState = {
      ...timer,
      playerCount,
    };
    await redis.set(REDIS_KEYS.LOBBY_TIMER_SYNC(gameId), JSON.stringify(syncData));
    await redis.expire(REDIS_KEYS.LOBBY_TIMER_SYNC(gameId), REDIS_TTL.LOBBY_TIMER_SYNC);

    return timer;
  } catch (error) {
    console.error(`Failed to reset lobby timer for game ${gameId}:`, error);
    return null;
  }
}

/**
 * Stops the lobby timer
 */
export async function stopLobbyTimer(gameId: string): Promise<void> {
  try {
    const timer = await getLobbyTimer(gameId);
    if (timer) {
      timer.isActive = false;
      timer.remainingTime = 0;
      timer.lastSyncTime = Date.now();
      await updateLobbyTimer(gameId, timer);
    }

    // Clean up timer data
    await redis.del(REDIS_KEYS.LOBBY_TIMER(gameId));
    await redis.del(REDIS_KEYS.LOBBY_TIMER_SYNC(gameId));
  } catch (error) {
    console.error(`Failed to stop lobby timer for game ${gameId}:`, error);
  }
}

/**
 * Checks if the lobby timer has expired
 */
export async function isLobbyTimerExpired(gameId: string): Promise<boolean> {
  const timer = await getLobbyTimer(gameId);
  if (!timer || !timer.isActive) {
    return false;
  }

  const now = Date.now();
  const elapsed = now - timer.startTime;
  return elapsed >= timer.duration;
}

/**
 * Gets lobby timer sync data for client synchronization
 */
export async function getLobbyTimerSyncData(gameId: string): Promise<LobbyTimerState | null> {
  try {
    const syncData = await redis.get(REDIS_KEYS.LOBBY_TIMER_SYNC(gameId));
    if (!syncData) {
      return null;
    }

    const state: LobbyTimerState = JSON.parse(syncData);
    
    // Update remaining time
    if (state.isActive) {
      const now = Date.now();
      const elapsed = now - state.startTime;
      state.remainingTime = Math.max(0, state.duration - elapsed);
      state.lastSyncTime = now;
    }

    return state;
  } catch (error) {
    console.error(`Failed to get lobby timer sync data for game ${gameId}:`, error);
    return null;
  }
}

/**
 * Triggers automatic game start when timer expires
 */
export async function triggerAutoGameStart(gameId: string): Promise<boolean> {
  try {
    // Check if timer has expired
    const isExpired = await isLobbyTimerExpired(gameId);
    if (!isExpired) {
      return false;
    }

    // Get game state
    const gameData = await redis.get(REDIS_KEYS.GAME(gameId));
    if (!gameData) {
      console.warn(`Game ${gameId} not found for auto start`);
      return false;
    }

    const game = JSON.parse(gameData);
    if (game.status !== 'lobby') {
      console.warn(`Game ${gameId} is not in lobby state for auto start`);
      return false;
    }

    // Check minimum player count
    const playersData = await redis.hGetAll(REDIS_KEYS.PLAYERS(gameId));
    const playerCount = Object.keys(playersData).filter(key => playersData[key] !== 'true').length;
    
    if (playerCount < LOBBY_TIMER_CONFIG.MIN_PLAYERS_FOR_TIMER) {
      console.warn(`Game ${gameId} has insufficient players (${playerCount}) for auto start`);
      return false;
    }

    // Update game status to active
    game.status = 'active';
    game.currentRound = 1;
    game.updatedAt = Date.now();

    // Import startRound function dynamically to avoid circular dependencies
    const { startRound } = await import('./roundManager.js');
    const round = await startRound(gameId, 1);
    
    // Store the current round ID in the game state
    game.currentRoundId = round.id;
    
    await redis.set(REDIS_KEYS.GAME(gameId), JSON.stringify(game));

    // Stop the lobby timer
    await stopLobbyTimer(gameId);

    console.log(`Auto-started game ${gameId} with ${playerCount} players`);
    return true;
  } catch (error) {
    console.error(`Failed to auto-start game ${gameId}:`, error);
    return false;
  }
}
