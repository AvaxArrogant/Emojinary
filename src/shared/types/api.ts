import type {
  GameState,
  Player,
  Phrase,
  Guess,
  Round,
  RoundResult,
  PlayerRole,
} from './game.js';

// Re-export core game types
export type {
  GameStatus,
  RoundStatus,
  PhraseDifficulty,
  PlayerRole,
  GameState,
  Player,
  Phrase,
  Guess,
  Round,
  RoundResult,
  GameConfig,
} from './game.js';

// Re-export event types
export type { GameEvent, GameEventHandler, GameEventSubscription } from './events.js';

// Re-export error types
export type { GameErrorType, GameError } from './errors.js';
export { GameException, createGameError, ERROR_MESSAGES } from './errors.js';

// Re-export validation types
export type { ValidationResult, GuessValidation, EmojiValidation } from './validation.js';
export { 
  validateGuess, 
  validateEmojiSequence, 
  validateUsername, 
  validateGameId, 
  validateSubredditName 
} from './validation.js';

// Re-export Redis types
export type { RedisGameData, RedisPlayerData, RedisLeaderboardEntry } from './redis.js';
export { REDIS_KEYS, REDIS_TTL } from './redis.js';

// ============================================================================
// LEGACY API TYPES (for existing counter functionality)
// ============================================================================

export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

// ============================================================================
// API REQUEST TYPES
// ============================================================================

export type CreateGameRequest = {
  subredditName: string;
  maxRounds?: number;
};

export type JoinGameRequest = {
  gameId: string;
  username: string;
};

export type StartGameRequest = {
  gameId: string;
};

export type SubmitEmojisRequest = {
  gameId: string;
  roundId: string;
  emojiSequence: string[];
};

export type SubmitGuessRequest = {
  gameId: string;
  roundId: string;
  guess: string;
};

export type EndRoundRequest = {
  gameId: string;
  roundId: string;
};

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
};

export type GameStateResponse = ApiResponse<{
  gameState: GameState;
  currentRound?: Round;
  players: Player[];
  userRole: PlayerRole;
}>;

export type CreateGameResponse = ApiResponse<{
  gameId: string;
  gameState: GameState;
}>;

export type JoinGameResponse = ApiResponse<{
  gameState: GameState;
  players: Player[];
  currentRound?: Round;
}>;

export type StartGameResponse = ApiResponse<{
  gameState: GameState;
  firstRound: Round;
}>;

export type SubmitEmojisResponse = ApiResponse<{
  round: Round;
  success: boolean;
}>;

export type SubmitGuessResponse = ApiResponse<{
  guess: Guess;
  isCorrect: boolean;
  roundEnded: boolean;
  roundResult?: RoundResult;
}>;

export type LeaderboardResponse = ApiResponse<{
  players: Player[];
  currentUserRank: number;
}>;

export type PhrasesResponse = ApiResponse<{
  categories: string[];
  phrases: Record<string, Phrase[]>;
}>;


