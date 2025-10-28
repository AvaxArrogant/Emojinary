import { redis } from '@devvit/web/server';
import type { GameEvent } from '../../shared/types/events.js';
import type { GameState, Player, Round, Guess, RoundResult } from '../../shared/types/game.js';
import { REDIS_KEYS } from '../../shared/types/redis.js';

// ============================================================================
// REAL-TIME EVENT BROADCASTING
// ============================================================================

/**
 * Broadcasts a game event to all players in a game session
 */
export async function broadcastGameEvent(gameId: string, event: GameEvent): Promise<void> {
  try {
    const channel = `game:${gameId}:events`;
    const eventData = JSON.stringify({
      ...event,
      timestamp: Date.now(),
      gameId,
    });

    // Store the event in a sorted set for players who might be reconnecting
    const eventHistoryKey = `${channel}:history`;
    const score = Date.now();
    await redis.zAdd(eventHistoryKey, { score, member: eventData });
    
    // Keep only the last 50 events
    const eventCount = await redis.zCard(eventHistoryKey);
    if (eventCount > 50) {
      await redis.zRemRangeByRank(eventHistoryKey, 0, eventCount - 51);
    }
    
    // Set expiration for event history
    await redis.expire(eventHistoryKey, 3600); // 1 hour
    
    console.log(`Broadcasted event ${event.type} to game ${gameId}`);
  } catch (error) {
    console.error(`Failed to broadcast event ${event.type} to game ${gameId}:`, error);
  }
}

/**
 * Broadcasts a player joined event
 */
export async function broadcastPlayerJoined(gameId: string, player: Player): Promise<void> {
  await broadcastGameEvent(gameId, {
    type: 'PLAYER_JOINED',
    player,
  });
}

/**
 * Broadcasts a player left event
 */
export async function broadcastPlayerLeft(gameId: string, playerId: string): Promise<void> {
  await broadcastGameEvent(gameId, {
    type: 'PLAYER_LEFT',
    playerId,
  });
}

/**
 * Broadcasts a game started event
 */
export async function broadcastGameStarted(gameId: string, gameState: GameState, firstRound: Round): Promise<void> {
  await broadcastGameEvent(gameId, {
    type: 'GAME_STARTED',
    gameState,
    firstRound,
  });
}

/**
 * Broadcasts a round started event
 */
export async function broadcastRoundStarted(gameId: string, round: Round): Promise<void> {
  await broadcastGameEvent(gameId, {
    type: 'ROUND_STARTED',
    round,
  });
}

/**
 * Broadcasts an emojis submitted event
 */
export async function broadcastEmojisSubmitted(gameId: string, roundId: string, emojis: string[]): Promise<void> {
  await broadcastGameEvent(gameId, {
    type: 'EMOJIS_SUBMITTED',
    roundId,
    emojis,
  });
}

/**
 * Broadcasts a guess submitted event
 */
export async function broadcastGuessSubmitted(gameId: string, guess: Guess): Promise<void> {
  await broadcastGameEvent(gameId, {
    type: 'GUESS_SUBMITTED',
    guess,
  });
}

/**
 * Broadcasts a round ended event
 */
export async function broadcastRoundEnded(gameId: string, result: RoundResult, nextRound?: Round): Promise<void> {
  const event: Extract<GameEvent, { type: 'ROUND_ENDED' }> = {
    type: 'ROUND_ENDED',
    result,
    ...(nextRound && { nextRound }),
  };
  await broadcastGameEvent(gameId, event);
}

/**
 * Broadcasts a game ended event
 */
export async function broadcastGameEnded(gameId: string, finalResults: RoundResult): Promise<void> {
  await broadcastGameEvent(gameId, {
    type: 'GAME_ENDED',
    finalResults,
  });
}

/**
 * Broadcasts a timer update event
 */
export async function broadcastTimerUpdate(gameId: string, roundId: string, remaining: number): Promise<void> {
  await broadcastGameEvent(gameId, {
    type: 'TIMER_UPDATE',
    roundId,
    remaining,
  });
}

/**
 * Broadcasts a score update event
 */
export async function broadcastScoreUpdate(gameId: string, scores: Record<string, number>): Promise<void> {
  await broadcastGameEvent(gameId, {
    type: 'SCORE_UPDATE',
    scores,
  });
}

// ============================================================================
// EVENT HISTORY AND RECONNECTION
// ============================================================================

/**
 * Gets recent event history for a game (used for reconnection)
 */
export async function getGameEventHistory(gameId: string, limit: number = 20): Promise<GameEvent[]> {
  try {
    const channel = `game:${gameId}:events`;
    const eventHistoryKey = `${channel}:history`;
    
    const eventStrings = await redis.zRange(eventHistoryKey, -limit, -1);
    
    return eventStrings.map((item: { member: string; score: number }) => {
      try {
        return JSON.parse(item.member) as GameEvent;
      } catch (error) {
        console.error('Failed to parse event from history:', error);
        return null;
      }
    }).filter((event: GameEvent | null): event is GameEvent => event !== null);
  } catch (error) {
    console.error(`Failed to get event history for game ${gameId}:`, error);
    return [];
  }
}

/**
 * Cleans up event history for a game (called when game ends)
 */
export async function cleanupGameEvents(gameId: string): Promise<void> {
  try {
    const channel = `game:${gameId}:events`;
    const eventHistoryKey = `${channel}:history`;
    
    await redis.del(eventHistoryKey);
    
    console.log(`Cleaned up event history for game ${gameId}`);
  } catch (error) {
    console.error(`Failed to cleanup events for game ${gameId}:`, error);
  }
}

// ============================================================================
// TIMER MANAGEMENT
// ============================================================================

/**
 * Starts a round timer that broadcasts updates
 */
export async function startRoundTimer(gameId: string, roundId: string, durationMs: number): Promise<void> {
  try {
    const timerKey = REDIS_KEYS.ROUND_TIMER(roundId);
    const startTime = Date.now();
    const endTime = startTime + durationMs;
    
    // Store timer info
    await redis.set(timerKey, JSON.stringify({
      gameId,
      roundId,
      startTime,
      endTime,
      durationMs,
    }));
    
    // Set expiration slightly longer than the timer duration
    await redis.expire(timerKey, Math.ceil(durationMs / 1000) + 10);
    
    // Start broadcasting timer updates
    broadcastTimerUpdates(gameId, roundId, durationMs);
    
    console.log(`Started timer for round ${roundId} in game ${gameId}`);
  } catch (error) {
    console.error(`Failed to start timer for round ${roundId}:`, error);
  }
}

/**
 * Stops a round timer
 */
export async function stopRoundTimer(roundId: string): Promise<void> {
  try {
    const timerKey = REDIS_KEYS.ROUND_TIMER(roundId);
    await redis.del(timerKey);
    
    console.log(`Stopped timer for round ${roundId}`);
  } catch (error) {
    console.error(`Failed to stop timer for round ${roundId}:`, error);
  }
}

/**
 * Broadcasts timer updates at regular intervals
 */
async function broadcastTimerUpdates(gameId: string, roundId: string, durationMs: number): Promise<void> {
  const startTime = Date.now();
  const endTime = startTime + durationMs;
  const updateInterval = 1000; // Update every second
  
  const updateTimer = async () => {
    try {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      
      // Check if timer still exists (might be cancelled)
      const timerExists = await redis.exists(REDIS_KEYS.ROUND_TIMER(roundId));
      if (!timerExists) {
        return; // Timer was cancelled
      }
      
      // Broadcast timer update
      await broadcastTimerUpdate(gameId, roundId, remaining);
      
      // If time has expired, automatically end the round
      if (remaining <= 0) {
        try {
          // Import endRound function dynamically to avoid circular dependency
          const { endRound } = await import('./roundManager.js');
          
          console.log(`Timer expired for round ${roundId}, automatically ending round`);
          
          // End the round due to timeout
          await endRound({
            gameId,
            roundId
          });
        } catch (error) {
          console.error(`Failed to auto-end round ${roundId} on timeout:`, error);
        }
        return; // Stop timer updates
      }
      
      // Continue if time remaining
      setTimeout(updateTimer, updateInterval);
    } catch (error) {
      console.error(`Error in timer update for round ${roundId}:`, error);
    }
  };
  
  // Start the timer updates
  setTimeout(updateTimer, updateInterval);
}

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

/**
 * Registers a player connection for a game
 */
export async function registerPlayerConnection(gameId: string, playerId: string): Promise<void> {
  try {
    const connectionKey = `game:${gameId}:connections`;
    const now = Date.now();
    
    // Add player to active connections with timestamp
    await redis.hSet(connectionKey, { [playerId]: now.toString() });
    
    console.log(`Registered connection for player ${playerId} in game ${gameId}`);
  } catch (error) {
    console.error(`Failed to register connection for player ${playerId}:`, error);
  }
}

/**
 * Updates player's last activity timestamp
 */
export async function updatePlayerActivity(gameId: string, playerId: string): Promise<void> {
  try {
    const connectionKey = `game:${gameId}:connections`;
    const now = Date.now();
    
    await redis.hSet(connectionKey, { [playerId]: now.toString() });
  } catch (error) {
    console.error(`Failed to update activity for player ${playerId}:`, error);
  }
}

/**
 * Removes a player connection
 */
export async function removePlayerConnection(gameId: string, playerId: string): Promise<void> {
  try {
    const connectionKey = `game:${gameId}:connections`;
    
    await redis.hDel(connectionKey, [playerId]);
    
    console.log(`Removed connection for player ${playerId} in game ${gameId}`);
  } catch (error) {
    console.error(`Failed to remove connection for player ${playerId}:`, error);
  }
}

/**
 * Gets active player connections for a game
 */
export async function getActiveConnections(gameId: string): Promise<Record<string, number>> {
  try {
    const connectionKey = `game:${gameId}:connections`;
    const connections = await redis.hGetAll(connectionKey);
    
    const activeConnections: Record<string, number> = {};
    const now = Date.now();
    const timeoutMs = 30000; // 30 seconds timeout
    
    for (const [playerId, timestampStr] of Object.entries(connections)) {
      const timestamp = parseInt(timestampStr as string);
      if (now - timestamp < timeoutMs) {
        activeConnections[playerId] = timestamp;
      }
    }
    
    return activeConnections;
  } catch (error) {
    console.error(`Failed to get active connections for game ${gameId}:`, error);
    return {};
  }
}
