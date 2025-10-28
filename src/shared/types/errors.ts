// ============================================================================
// ERROR TYPES
// ============================================================================

export type GameErrorType = 
  | 'NETWORK_ERROR'
  | 'INVALID_GUESS'
  | 'RATE_LIMITED'
  | 'GAME_NOT_FOUND'
  | 'ROUND_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'TIMEOUT'
  | 'INVALID_INPUT'
  | 'GAME_FULL'
  | 'GAME_ALREADY_STARTED'
  | 'NOT_PRESENTER'
  | 'NOT_GUESSER'
  | 'ROUND_NOT_ACTIVE'
  | 'PRESENTER_CANNOT_GUESS'
  | 'DUPLICATE_GUESS'
  | 'SERVER_ERROR';

export type GameError = {
  type: GameErrorType;
  message: string;
  context?: string;
  timestamp: number;
};

// Error factory functions
export const createGameError = (
  type: GameErrorType,
  message: string,
  context?: string
): GameError => ({
  type,
  message,
  ...(context !== undefined && { context }),
  timestamp: Date.now(),
});

// Predefined error messages
export const ERROR_MESSAGES: Record<GameErrorType, string> = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  INVALID_GUESS: 'Your guess contains invalid characters or is too long.',
  RATE_LIMITED: 'You are submitting guesses too quickly. Please wait a moment.',
  GAME_NOT_FOUND: 'The game you are trying to join does not exist.',
  ROUND_NOT_FOUND: 'The current round could not be found.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  TIMEOUT: 'The request timed out. Please try again.',
  INVALID_INPUT: 'The provided input is invalid.',
  GAME_FULL: 'This game is full. Please try joining another game.',
  GAME_ALREADY_STARTED: 'This game has already started.',
  NOT_PRESENTER: 'Only the presenter can perform this action.',
  NOT_GUESSER: 'Only guessers can submit guesses.',
  ROUND_NOT_ACTIVE: 'No active round is currently in progress.',
  PRESENTER_CANNOT_GUESS: 'The presenter cannot guess their own phrase.',
  DUPLICATE_GUESS: 'You have already submitted this guess.',
  SERVER_ERROR: 'An internal server error occurred. Please try again.',
};

// Error type guards
export const isNetworkError = (error: GameError): boolean => 
  error.type === 'NETWORK_ERROR';

export const isValidationError = (error: GameError): boolean => 
  ['INVALID_GUESS', 'INVALID_INPUT'].includes(error.type);

export const isAuthorizationError = (error: GameError): boolean => 
  ['UNAUTHORIZED', 'NOT_PRESENTER', 'NOT_GUESSER', 'PRESENTER_CANNOT_GUESS'].includes(error.type);

export const isGameStateError = (error: GameError): boolean => 
  ['GAME_NOT_FOUND', 'ROUND_NOT_FOUND', 'GAME_FULL', 'GAME_ALREADY_STARTED', 'ROUND_NOT_ACTIVE'].includes(error.type);

// Custom error class for game-specific errors
export class GameException extends Error {
  public readonly gameError: GameError;

  constructor(gameError: GameError) {
    super(gameError.message);
    this.name = 'GameException';
    this.gameError = gameError;
  }

  static fromType(type: GameErrorType, context?: string): GameException {
    const message = ERROR_MESSAGES[type];
    const gameError = createGameError(type, message, context);
    return new GameException(gameError);
  }
}
