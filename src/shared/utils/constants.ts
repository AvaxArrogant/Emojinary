// ============================================================================
// GAME CONSTANTS
// ============================================================================

export const GAME_CONSTANTS = {
  // Timing
  ROUND_DURATION_MS: 120000, // 2 minutes
  COUNTDOWN_INTERVAL_MS: 1000, // 1 second
  ROUND_TRANSITION_DELAY_MS: 5000, // 5 seconds between rounds
  
  // Limits
  MAX_PLAYERS_PER_GAME: 8,
  MIN_PLAYERS_TO_START: 2,
  MAX_ROUNDS: 10,
  DEFAULT_ROUNDS: 5,
  
  // Input validation
  MAX_GUESS_LENGTH: 100,
  MAX_EMOJI_SEQUENCE_LENGTH: 20,
  MAX_USERNAME_LENGTH: 20,
  MIN_USERNAME_LENGTH: 3,
  
  // Scoring
  CORRECT_GUESS_POINTS: 10,
  PRESENTER_POINTS: 5,
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 3000, // 3 seconds
  RATE_LIMIT_MAX_REQUESTS: 1,
  
  // Fuzzy matching
  FUZZY_MATCH_THRESHOLD: 0.8, // 80% similarity
  
  // Phrase categories
  PHRASE_CATEGORIES: [
    'movies',
    'books',
    'songs',
    'animals',
    'food',
    'places',
    'activities',
  ] as const,
} as const;

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {
  // Game management
  CREATE_GAME: '/api/game/create',
  JOIN_GAME: '/api/game/join',
  START_GAME: '/api/game/start',
  END_GAME: '/api/game/end',
  GET_GAME_STATE: '/api/game/state',
  
  // Round management
  START_ROUND: '/api/round/start',
  END_ROUND: '/api/round/end',
  SUBMIT_EMOJIS: '/api/emojis/submit',
  SUBMIT_GUESS: '/api/guess/submit',
  
  // Data endpoints
  GET_PHRASES: '/api/phrases',
  GET_LEADERBOARD: '/api/leaderboard',
  GET_PLAYERS: '/api/players',
} as const;

// ============================================================================
// ERROR CODES
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// ============================================================================
// REGEX PATTERNS
// ============================================================================

export const VALIDATION_PATTERNS = {
  USERNAME: /^[a-zA-Z0-9_-]+$/,
  SUBREDDIT: /^[a-zA-Z0-9_]+$/,
  GAME_ID: /^[a-zA-Z0-9-_]+$/,
  GUESS_CHARS: /^[a-zA-Z0-9\s\-'.,!?]+$/,
  EMOJI_BASIC: /^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]$/u,
} as const;
