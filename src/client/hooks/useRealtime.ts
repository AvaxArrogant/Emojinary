import { useEffect, useCallback, useRef } from 'react';
import type { GameEvent, GameEventHandler } from '../../shared/types/events.js';
import { getRealtimeClient, destroyRealtimeClient } from '../utils/realtimeClient.js';

// ============================================================================
// REALTIME HOOKS
// ============================================================================

/**
 * Hook for managing real-time connection to a game
 */
export function useRealtimeConnection(gameId: string, username: string) {
  const clientRef = useRef(getRealtimeClient(gameId, username));
  const isConnectedRef = useRef(false);

  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;

    // Connect to real-time events
    const connect = async () => {
      try {
        await client.connect();
        isConnectedRef.current = true;
      } catch (error) {
        console.error('Failed to connect to real-time events:', error);
        isConnectedRef.current = false;
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (client) {
        client.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, [gameId, username]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      destroyRealtimeClient();
    };
  }, []);

  return {
    isConnected: isConnectedRef.current,
    client: clientRef.current,
  };
}

/**
 * Hook for subscribing to specific game events
 */
export function useGameEvent<T extends GameEvent>(
  eventType: T['type'],
  handler: GameEventHandler<T>,
  gameId?: string,
  username?: string
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const client = getRealtimeClient(gameId, username);
    if (!client) return;

    const wrappedHandler: GameEventHandler<T> = (event) => {
      handlerRef.current(event);
    };

    client.on(eventType, wrappedHandler);

    return () => {
      client.off(eventType, wrappedHandler);
    };
  }, [eventType, gameId, username]);
}

/**
 * Hook for handling player joined events
 */
export function usePlayerJoined(
  onPlayerJoined: (player: any) => void,
  gameId?: string,
  username?: string
) {
  useGameEvent('PLAYER_JOINED', (event) => {
    if (event.type === 'PLAYER_JOINED') {
      onPlayerJoined(event.player);
    }
  }, gameId, username);
}

/**
 * Hook for handling player left events
 */
export function usePlayerLeft(
  onPlayerLeft: (playerId: string) => void,
  gameId?: string,
  username?: string
) {
  useGameEvent('PLAYER_LEFT', (event) => {
    if (event.type === 'PLAYER_LEFT') {
      onPlayerLeft(event.playerId);
    }
  }, gameId, username);
}

/**
 * Hook for handling game started events
 */
export function useGameStarted(
  onGameStarted: (gameState: any, firstRound: any) => void,
  gameId?: string,
  username?: string
) {
  useGameEvent('GAME_STARTED', (event) => {
    if (event.type === 'GAME_STARTED') {
      onGameStarted(event.gameState, event.firstRound);
    }
  }, gameId, username);
}

/**
 * Hook for handling round started events
 */
export function useRoundStarted(
  onRoundStarted: (round: any) => void,
  gameId?: string,
  username?: string
) {
  useGameEvent('ROUND_STARTED', (event) => {
    if (event.type === 'ROUND_STARTED') {
      onRoundStarted(event.round);
    }
  }, gameId, username);
}

/**
 * Hook for handling emojis submitted events
 */
export function useEmojisSubmitted(
  onEmojisSubmitted: (roundId: string, emojis: string[]) => void,
  gameId?: string,
  username?: string
) {
  useGameEvent('EMOJIS_SUBMITTED', (event) => {
    if (event.type === 'EMOJIS_SUBMITTED') {
      onEmojisSubmitted(event.roundId, event.emojis);
    }
  }, gameId, username);
}

/**
 * Hook for handling guess submitted events
 */
export function useGuessSubmitted(
  onGuessSubmitted: (guess: any) => void,
  gameId?: string,
  username?: string
) {
  useGameEvent('GUESS_SUBMITTED', (event) => {
    if (event.type === 'GUESS_SUBMITTED') {
      onGuessSubmitted(event.guess);
    }
  }, gameId, username);
}

/**
 * Hook for handling round ended events
 */
export function useRoundEnded(
  onRoundEnded: (result: any, nextRound?: any) => void,
  gameId?: string,
  username?: string
) {
  useGameEvent('ROUND_ENDED', (event) => {
    if (event.type === 'ROUND_ENDED') {
      onRoundEnded(event.result, event.nextRound);
    }
  }, gameId, username);
}

/**
 * Hook for handling game ended events
 */
export function useGameEnded(
  onGameEnded: (finalResults: any) => void,
  gameId?: string,
  username?: string
) {
  useGameEvent('GAME_ENDED', (event) => {
    if (event.type === 'GAME_ENDED') {
      onGameEnded(event.finalResults);
    }
  }, gameId, username);
}

/**
 * Hook for handling timer update events
 */
export function useTimerUpdate(
  onTimerUpdate: (roundId: string, remaining: number) => void,
  gameId?: string,
  username?: string
) {
  useGameEvent('TIMER_UPDATE', (event) => {
    if (event.type === 'TIMER_UPDATE') {
      onTimerUpdate(event.roundId, event.remaining);
    }
  }, gameId, username);
}

/**
 * Hook for handling score update events
 */
export function useScoreUpdate(
  onScoreUpdate: (scores: Record<string, number>) => void,
  gameId?: string,
  username?: string
) {
  useGameEvent('SCORE_UPDATE', (event) => {
    if (event.type === 'SCORE_UPDATE') {
      onScoreUpdate(event.scores);
    }
  }, gameId, username);
}

/**
 * Comprehensive hook that provides all real-time event handlers
 */
export function useRealtimeEvents(gameId: string, username: string) {
  const { isConnected, client } = useRealtimeConnection(gameId, username);

  const subscribe = useCallback(<T extends GameEvent>(
    eventType: T['type'],
    handler: GameEventHandler<T>
  ) => {
    if (client) {
      client.on(eventType, handler);
      return () => client.off(eventType, handler);
    }
    return () => {};
  }, [client]);

  return {
    isConnected,
    client,
    subscribe,
    // Convenience methods for common events
    onPlayerJoined: (handler: (player: any) => void) => 
      subscribe('PLAYER_JOINED', (event) => {
        if (event.type === 'PLAYER_JOINED') handler(event.player);
      }),
    onPlayerLeft: (handler: (playerId: string) => void) => 
      subscribe('PLAYER_LEFT', (event) => {
        if (event.type === 'PLAYER_LEFT') handler(event.playerId);
      }),
    onGameStarted: (handler: (gameState: any, firstRound: any) => void) => 
      subscribe('GAME_STARTED', (event) => {
        if (event.type === 'GAME_STARTED') handler(event.gameState, event.firstRound);
      }),
    onRoundStarted: (handler: (round: any) => void) => 
      subscribe('ROUND_STARTED', (event) => {
        if (event.type === 'ROUND_STARTED') handler(event.round);
      }),
    onEmojisSubmitted: (handler: (roundId: string, emojis: string[]) => void) => 
      subscribe('EMOJIS_SUBMITTED', (event) => {
        if (event.type === 'EMOJIS_SUBMITTED') handler(event.roundId, event.emojis);
      }),
    onGuessSubmitted: (handler: (guess: any) => void) => 
      subscribe('GUESS_SUBMITTED', (event) => {
        if (event.type === 'GUESS_SUBMITTED') handler(event.guess);
      }),
    onRoundEnded: (handler: (result: any, nextRound?: any) => void) => 
      subscribe('ROUND_ENDED', (event) => {
        if (event.type === 'ROUND_ENDED') handler(event.result, event.nextRound);
      }),
    onGameEnded: (handler: (finalResults: any) => void) => 
      subscribe('GAME_ENDED', (event) => {
        if (event.type === 'GAME_ENDED') handler(event.finalResults);
      }),
    onTimerUpdate: (handler: (roundId: string, remaining: number) => void) => 
      subscribe('TIMER_UPDATE', (event) => {
        if (event.type === 'TIMER_UPDATE') handler(event.roundId, event.remaining);
      }),
    onScoreUpdate: (handler: (scores: Record<string, number>) => void) => 
      subscribe('SCORE_UPDATE', (event) => {
        if (event.type === 'SCORE_UPDATE') handler(event.scores);
      }),
  };
}
