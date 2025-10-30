import type { GameState, Player, Round } from '../../shared/types/game';

/**
 * Data validation utilities for ensuring UI components receive valid data
 * Implements requirements 4.3 and 5.4 for data integrity and error handling
 */

export type ValidationResult<T> = {
  isValid: boolean;
  data: T | null;
  errors: string[];
  warnings: string[];
};

export type SafeGameState = GameState & {
  _validated: true;
};

export type SafePlayer = Player & {
  _validated: true;
};

export type SafeRound = Round & {
  _validated: true;
};

/**
 * Validates game state data before using in components
 */
export const validateGameState = (gameState: unknown): ValidationResult<SafeGameState> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if gameState exists and is an object
  if (!gameState || typeof gameState !== 'object') {
    return {
      isValid: false,
      data: null,
      errors: ['Game state is null or not an object'],
      warnings: []
    };
  }

  const state = gameState as Partial<GameState>;

  // Validate required fields
  if (!state.id || typeof state.id !== 'string') {
    errors.push('Game state missing valid ID');
  }

  if (!state.status || !['lobby', 'active', 'paused', 'ended'].includes(state.status)) {
    errors.push('Game state has invalid status');
  }

  if (typeof state.currentRound !== 'number' || state.currentRound < 0) {
    errors.push('Game state has invalid current round number');
  }

  if (typeof state.maxRounds !== 'number' || state.maxRounds < 1) {
    errors.push('Game state has invalid max rounds');
  }

  if (typeof state.createdAt !== 'number' || state.createdAt <= 0) {
    errors.push('Game state has invalid creation timestamp');
  }

  if (typeof state.updatedAt !== 'number' || state.updatedAt <= 0) {
    errors.push('Game state has invalid update timestamp');
  }

  // Validate optional fields
  if (state.subredditName && typeof state.subredditName !== 'string') {
    warnings.push('Game state has invalid subreddit name');
  }

  if (state.moderatorId && typeof state.moderatorId !== 'string') {
    warnings.push('Game state has invalid moderator ID');
  }

  // Check for logical consistency
  if (state.currentRound && state.maxRounds && state.currentRound > state.maxRounds) {
    warnings.push('Current round exceeds max rounds');
  }

  if (state.createdAt && state.updatedAt && state.updatedAt < state.createdAt) {
    warnings.push('Update timestamp is before creation timestamp');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      data: null,
      errors,
      warnings
    };
  }

  // Create safe game state with defaults for missing optional fields
  const safeGameState: SafeGameState = {
    id: state.id!,
    subredditName: state.subredditName || '',
    status: state.status!,
    currentRound: state.currentRound!,
    maxRounds: state.maxRounds!,
    createdAt: state.createdAt!,
    updatedAt: state.updatedAt!,
    moderatorId: state.moderatorId || undefined,
    _validated: true
  };

  return {
    isValid: true,
    data: safeGameState,
    errors: [],
    warnings
  };
};

/**
 * Validates player data before displaying
 */
export const validatePlayer = (player: unknown): ValidationResult<SafePlayer> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if player exists and is an object
  if (!player || typeof player !== 'object') {
    return {
      isValid: false,
      data: null,
      errors: ['Player data is null or not an object'],
      warnings: []
    };
  }

  const p = player as Partial<Player>;

  // Validate required fields
  if (!p.id || typeof p.id !== 'string') {
    errors.push('Player missing valid ID');
  }

  if (!p.username || typeof p.username !== 'string' || p.username.trim().length === 0) {
    errors.push('Player missing valid username');
  }

  if (typeof p.score !== 'number' || p.score < 0) {
    errors.push('Player has invalid score');
  }

  if (typeof p.isActive !== 'boolean') {
    warnings.push('Player missing active status, defaulting to true');
  }

  if (typeof p.joinedAt !== 'number' || p.joinedAt <= 0) {
    warnings.push('Player has invalid join timestamp, using current time');
  }

  // Validate optional fields
  if (p.subredditName && typeof p.subredditName !== 'string') {
    warnings.push('Player has invalid subreddit name');
  }

  if (p.isModerator !== undefined && typeof p.isModerator !== 'boolean') {
    warnings.push('Player has invalid moderator flag');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      data: null,
      errors,
      warnings
    };
  }

  // Create safe player with defaults for missing optional fields
  const safePlayer: SafePlayer = {
    id: p.id!,
    username: p.username!.trim(),
    subredditName: p.subredditName || '',
    score: p.score!,
    isActive: p.isActive !== undefined ? p.isActive : true,
    joinedAt: p.joinedAt || Date.now(),
    isModerator: p.isModerator || false,
    _validated: true
  };

  return {
    isValid: true,
    data: safePlayer,
    errors: [],
    warnings
  };
};

/**
 * Validates round data before displaying
 */
export const validateRound = (round: unknown): ValidationResult<SafeRound> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if round exists and is an object
  if (!round || typeof round !== 'object') {
    return {
      isValid: false,
      data: null,
      errors: ['Round data is null or not an object'],
      warnings: []
    };
  }

  const r = round as Partial<Round>;

  // Validate required fields
  if (!r.id || typeof r.id !== 'string') {
    errors.push('Round missing valid ID');
  }

  if (!r.gameId || typeof r.gameId !== 'string') {
    errors.push('Round missing valid game ID');
  }

  if (typeof r.roundNumber !== 'number' || r.roundNumber < 1) {
    errors.push('Round has invalid round number');
  }

  if (!r.presenterId || typeof r.presenterId !== 'string') {
    errors.push('Round missing valid presenter ID');
  }

  if (!r.status || !['waiting', 'active', 'ended'].includes(r.status)) {
    errors.push('Round has invalid status');
  }

  if (typeof r.startTime !== 'number' || r.startTime <= 0) {
    errors.push('Round has invalid start time');
  }

  // Validate optional fields
  if (r.endTime !== undefined && (typeof r.endTime !== 'number' || r.endTime <= 0)) {
    warnings.push('Round has invalid end time');
  }

  if (r.winnerId !== undefined && typeof r.winnerId !== 'string') {
    warnings.push('Round has invalid winner ID');
  }

  // Validate arrays
  if (!Array.isArray(r.emojiSequence)) {
    warnings.push('Round missing emoji sequence, defaulting to empty array');
  }

  if (!Array.isArray(r.guesses)) {
    warnings.push('Round missing guesses, defaulting to empty array');
  }

  // Validate phrase object
  if (!r.phrase || typeof r.phrase !== 'object') {
    errors.push('Round missing valid phrase object');
  } else {
    const phrase = r.phrase;
    if (!phrase.id || typeof phrase.id !== 'string') {
      errors.push('Round phrase missing valid ID');
    }
    if (!phrase.text || typeof phrase.text !== 'string') {
      errors.push('Round phrase missing valid text');
    }
    if (!phrase.category || typeof phrase.category !== 'string') {
      warnings.push('Round phrase missing category');
    }
    if (!phrase.difficulty || !['easy', 'medium', 'hard'].includes(phrase.difficulty)) {
      warnings.push('Round phrase has invalid difficulty');
    }
  }

  // Check logical consistency
  if (r.endTime && r.startTime && r.endTime < r.startTime) {
    warnings.push('Round end time is before start time');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      data: null,
      errors,
      warnings
    };
  }

  // Create safe round with defaults for missing optional fields
  const safeRound: SafeRound = {
    id: r.id!,
    gameId: r.gameId!,
    roundNumber: r.roundNumber!,
    presenterId: r.presenterId!,
    phrase: {
      id: r.phrase!.id,
      text: r.phrase!.text,
      category: r.phrase!.category || 'general',
      difficulty: r.phrase!.difficulty || 'medium',
      hints: r.phrase!.hints || []
    },
    emojiSequence: Array.isArray(r.emojiSequence) ? r.emojiSequence : [],
    guesses: Array.isArray(r.guesses) ? r.guesses : [],
    status: r.status!,
    startTime: r.startTime!,
    endTime: r.endTime || undefined,
    winnerId: r.winnerId || undefined,
    _validated: true
  };

  return {
    isValid: true,
    data: safeRound,
    errors: [],
    warnings
  };
};

/**
 * Validates a collection of players
 */
export const validatePlayers = (players: unknown): ValidationResult<Record<string, SafePlayer>> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validatedPlayers: Record<string, SafePlayer> = {};

  // Check if players exists and is an object
  if (!players || typeof players !== 'object') {
    return {
      isValid: false,
      data: null,
      errors: ['Players data is null or not an object'],
      warnings: []
    };
  }

  const playersObj = players as Record<string, unknown>;

  // Validate each player
  Object.entries(playersObj).forEach(([playerId, playerData]) => {
    const validation = validatePlayer(playerData);
    
    if (validation.isValid && validation.data) {
      // Check if player ID matches the key
      if (validation.data.id !== playerId) {
        warnings.push(`Player ID mismatch for key ${playerId}`);
      }
      validatedPlayers[playerId] = validation.data;
    } else {
      errors.push(`Invalid player data for ID ${playerId}: ${validation.errors.join(', ')}`);
    }
    
    // Collect warnings
    warnings.push(...validation.warnings);
  });

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? validatedPlayers : null,
    errors,
    warnings
  };
};

/**
 * Handles malformed or incomplete server responses
 */
export const validateServerResponse = (response: unknown): ValidationResult<any> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if response exists
  if (response === null || response === undefined) {
    return {
      isValid: false,
      data: null,
      errors: ['Server response is null or undefined'],
      warnings: []
    };
  }

  // Check if response is an object
  if (typeof response !== 'object') {
    return {
      isValid: false,
      data: null,
      errors: ['Server response is not an object'],
      warnings: []
    };
  }

  const resp = response as Record<string, unknown>;

  // Check for common error indicators
  if (resp.error) {
    errors.push(`Server error: ${resp.error}`);
  }

  if (resp.success === false) {
    warnings.push('Server response indicates failure');
  }

  // Check for expected structure
  if (!resp.data && !resp.gameState && !resp.players && !resp.currentUser) {
    warnings.push('Server response missing expected data fields');
  }

  return {
    isValid: errors.length === 0,
    data: response,
    errors,
    warnings
  };
};

/**
 * Creates safe defaults for game state when validation fails
 */
export const createSafeGameStateDefaults = (): SafeGameState => ({
  id: 'loading',
  subredditName: '',
  status: 'lobby',
  currentRound: 0,
  maxRounds: 5,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  _validated: true
});

/**
 * Creates safe defaults for players when validation fails
 */
export const createSafePlayersDefaults = (): Record<string, SafePlayer> => ({});

/**
 * Utility to log validation results for debugging
 */
export const logValidationResult = <T>(
  result: ValidationResult<T>, 
  context: string
): void => {
  if (!result.isValid) {
    console.error(`Validation failed for ${context}:`, result.errors);
  }
  
  if (result.warnings.length > 0) {
    console.warn(`Validation warnings for ${context}:`, result.warnings);
  }
};
