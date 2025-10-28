import type { Player, GameState, Round, Guess, RoundResult } from './game.js';

// ============================================================================
// REAL-TIME EVENT TYPES
// ============================================================================

export type GameEvent = 
  | { type: 'PLAYER_JOINED'; player: Player }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'GAME_STARTED'; gameState: GameState; firstRound: Round }
  | { type: 'ROUND_STARTED'; round: Round }
  | { type: 'EMOJIS_SUBMITTED'; roundId: string; emojis: string[] }
  | { type: 'GUESS_SUBMITTED'; guess: Guess }
  | { type: 'ROUND_ENDED'; result: RoundResult; nextRound?: Round }
  | { type: 'GAME_ENDED'; finalResults: RoundResult }
  | { type: 'TIMER_UPDATE'; roundId: string; remaining: number }
  | { type: 'SCORE_UPDATE'; scores: Record<string, number> };

export type GameEventHandler<T extends GameEvent = GameEvent> = (event: T) => void;

export type GameEventSubscription = {
  unsubscribe: () => void;
};

// Event type guards for type-safe event handling
export const isPlayerJoinedEvent = (event: GameEvent): event is Extract<GameEvent, { type: 'PLAYER_JOINED' }> =>
  event.type === 'PLAYER_JOINED';

export const isPlayerLeftEvent = (event: GameEvent): event is Extract<GameEvent, { type: 'PLAYER_LEFT' }> =>
  event.type === 'PLAYER_LEFT';

export const isGameStartedEvent = (event: GameEvent): event is Extract<GameEvent, { type: 'GAME_STARTED' }> =>
  event.type === 'GAME_STARTED';

export const isRoundStartedEvent = (event: GameEvent): event is Extract<GameEvent, { type: 'ROUND_STARTED' }> =>
  event.type === 'ROUND_STARTED';

export const isEmojisSubmittedEvent = (event: GameEvent): event is Extract<GameEvent, { type: 'EMOJIS_SUBMITTED' }> =>
  event.type === 'EMOJIS_SUBMITTED';

export const isGuessSubmittedEvent = (event: GameEvent): event is Extract<GameEvent, { type: 'GUESS_SUBMITTED' }> =>
  event.type === 'GUESS_SUBMITTED';

export const isRoundEndedEvent = (event: GameEvent): event is Extract<GameEvent, { type: 'ROUND_ENDED' }> =>
  event.type === 'ROUND_ENDED';

export const isGameEndedEvent = (event: GameEvent): event is Extract<GameEvent, { type: 'GAME_ENDED' }> =>
  event.type === 'GAME_ENDED';

export const isTimerUpdateEvent = (event: GameEvent): event is Extract<GameEvent, { type: 'TIMER_UPDATE' }> =>
  event.type === 'TIMER_UPDATE';

export const isScoreUpdateEvent = (event: GameEvent): event is Extract<GameEvent, { type: 'SCORE_UPDATE' }> =>
  event.type === 'SCORE_UPDATE';
