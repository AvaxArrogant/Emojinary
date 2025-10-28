// ============================================================================
// VALIDATION TYPES AND SCHEMAS
// ============================================================================

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export type GuessValidation = {
  isValid: boolean;
  sanitizedGuess: string;
  errors: string[];
  fuzzyMatchResult?: {
    isMatch: boolean;
    similarity: number;
    normalizedGuess: string;
    normalizedTarget: string;
  };
};

export type EmojiValidation = {
  isValid: boolean;
  sanitizedEmojis: string[];
  errors: string[];
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

// Guess validation
export const validateGuess = (guess: string): GuessValidation => {
  const errors: string[] = [];
  let sanitizedGuess = guess.trim();

  // Check if guess is empty
  if (!sanitizedGuess) {
    errors.push('Guess cannot be empty');
    return { isValid: false, sanitizedGuess: '', errors };
  }

  // Check length
  if (sanitizedGuess.length > 100) {
    errors.push('Guess cannot be longer than 100 characters');
  }

  // Check for valid characters (letters, numbers, spaces, basic punctuation)
  const validCharPattern = /^[a-zA-Z0-9\s\-'.,!?]+$/;
  if (!validCharPattern.test(sanitizedGuess)) {
    errors.push('Guess contains invalid characters');
  }

  // Normalize whitespace
  sanitizedGuess = sanitizedGuess.replace(/\s+/g, ' ');

  return {
    isValid: errors.length === 0,
    sanitizedGuess,
    errors,
  };
};

// Guess validation with fuzzy matching against a target phrase
export const validateGuessWithTarget = (guess: string, _targetPhrase: string): GuessValidation => {
  // First do basic validation
  const basicValidation = validateGuess(guess);
  
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // Import fuzzy matching function (dynamic import to avoid circular dependencies)
  // This will be handled by the calling code that has access to the fuzzy matching utility
  return {
    ...basicValidation,
    // fuzzyMatchResult will be added by the calling function
  };
};

// Emoji sequence validation
export const validateEmojiSequence = (emojis: string[]): EmojiValidation => {
  const errors: string[] = [];
  const sanitizedEmojis: string[] = [];

  // Check if emoji sequence is empty
  if (!emojis || emojis.length === 0) {
    errors.push('Emoji sequence cannot be empty');
    return { isValid: false, sanitizedEmojis: [], errors };
  }

  // Check length
  if (emojis.length > 20) {
    errors.push('Emoji sequence cannot be longer than 20 emojis');
  }

  // Validate each emoji
  for (const emoji of emojis) {
    if (!emoji || typeof emoji !== 'string') {
      errors.push('Invalid emoji in sequence');
      continue;
    }

    const trimmedEmoji = emoji.trim();
    if (!trimmedEmoji) {
      errors.push('Empty emoji in sequence');
      continue;
    }

    // Basic emoji validation (this is simplified - real emoji validation is complex)
    if (trimmedEmoji.length > 10) {
      errors.push('Invalid emoji format');
      continue;
    }

    sanitizedEmojis.push(trimmedEmoji);
  }

  return {
    isValid: errors.length === 0,
    sanitizedEmojis,
    errors,
  };
};

// Username validation
export const validateUsername = (username: string): ValidationResult => {
  const errors: string[] = [];

  if (!username || typeof username !== 'string') {
    errors.push('Username is required');
    return { isValid: false, errors };
  }

  const trimmedUsername = username.trim();
  
  if (!trimmedUsername) {
    errors.push('Username cannot be empty');
  }

  if (trimmedUsername.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (trimmedUsername.length > 20) {
    errors.push('Username cannot be longer than 20 characters');
  }

  // Reddit username pattern (letters, numbers, underscores, hyphens)
  const usernamePattern = /^[a-zA-Z0-9_-]+$/;
  if (!usernamePattern.test(trimmedUsername)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Game ID validation
export const validateGameId = (gameId: string): ValidationResult => {
  const errors: string[] = [];

  if (!gameId || typeof gameId !== 'string') {
    errors.push('Game ID is required');
    return { isValid: false, errors };
  }

  const trimmedGameId = gameId.trim();
  
  if (!trimmedGameId) {
    errors.push('Game ID cannot be empty');
  }

  // UUID-like pattern validation
  const gameIdPattern = /^[a-zA-Z0-9-_]+$/;
  if (!gameIdPattern.test(trimmedGameId)) {
    errors.push('Invalid game ID format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Subreddit name validation
export const validateSubredditName = (subredditName: string): ValidationResult => {
  const errors: string[] = [];

  if (!subredditName || typeof subredditName !== 'string') {
    errors.push('Subreddit name is required');
    return { isValid: false, errors };
  }

  const trimmedName = subredditName.trim();
  
  if (!trimmedName) {
    errors.push('Subreddit name cannot be empty');
  }

  if (trimmedName.length < 3) {
    errors.push('Subreddit name must be at least 3 characters long');
  }

  if (trimmedName.length > 21) {
    errors.push('Subreddit name cannot be longer than 21 characters');
  }

  // Reddit subreddit name pattern
  const subredditPattern = /^[a-zA-Z0-9_]+$/;
  if (!subredditPattern.test(trimmedName)) {
    errors.push('Subreddit name can only contain letters, numbers, and underscores');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
