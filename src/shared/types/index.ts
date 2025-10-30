// ============================================================================
// SHARED TYPES INDEX
// ============================================================================

// Re-export all types from individual modules
export * from './api.js';
export * from './game.js';
export * from './events.js';
export * from './errors.js';
export * from './validation.js';
export * from './redis.js';

// Default exports for commonly used items
export { DEFAULT_GAME_CONFIG } from './game.js';
export type { LobbyTimer } from './game.js';
export { REDIS_KEYS, REDIS_TTL } from './redis.js';
export { ERROR_MESSAGES, GameException, createGameError } from './errors.js';
export { 
  validateGuess, 
  validateEmojiSequence, 
  validateUsername, 
  validateGameId, 
  validateSubredditName 
} from './validation.js';
