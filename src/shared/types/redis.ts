import type { GameState, Round, Player } from './game.js';

// ============================================================================
// REDIS DATA STRUCTURES
// ============================================================================

export type RedisGameData = {
  gameState: GameState;
  currentRound: Round | null;
  players: Record<string, Player>;
  scores: Record<string, number>;
  roundHistory: Round[];
};

export type RedisPlayerData = {
  player: Player;
  lastActivity: number;
  rateLimitCount: number;
  rateLimitResetTime: number;
};

export type RedisLeaderboardEntry = {
  username: string;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
  lastPlayed: number;
};

// ============================================================================
// REDIS KEY PATTERNS
// ============================================================================

export const REDIS_KEYS = {
  // Game data
  GAME: (gameId: string) => `game:${gameId}`,
  ROUND: (gameId: string, roundId: string) => `game:${gameId}:round:${roundId}`,
  PLAYERS: (gameId: string) => `game:${gameId}:players`,
  
  // Leaderboards and stats
  LEADERBOARD: (subreddit: string) => `leaderboard:${subreddit}`,
  PLAYER_STATS: (subreddit: string, username: string) => `stats:${subreddit}:${username}`,
  
  // Game management
  ACTIVE_GAMES: (subreddit: string) => `active_games:${subreddit}`,
  GAME_LOBBY: (gameId: string) => `lobby:${gameId}`,
  
  // Rate limiting
  RATE_LIMIT: (playerId: string) => `rate_limit:${playerId}`,
  
  // Phrases and content
  PHRASES: 'phrases:all',
  PHRASE_CATEGORIES: 'phrases:categories',
  
  // Session management
  PLAYER_SESSION: (playerId: string) => `session:${playerId}`,
  GAME_SESSION: (gameId: string) => `session:game:${gameId}`,
  
  // Temporary data
  ROUND_TIMER: (roundId: string) => `timer:${roundId}`,
  GUESS_HISTORY: (roundId: string) => `guesses:${roundId}`,
} as const;

// ============================================================================
// REDIS OPERATIONS TYPES
// ============================================================================

export type RedisOperation = 
  | { type: 'GET'; key: string }
  | { type: 'SET'; key: string; value: string; ttl?: number }
  | { type: 'HGET'; key: string; field: string }
  | { type: 'HSET'; key: string; field: string; value: string }
  | { type: 'HGETALL'; key: string }
  | { type: 'HMSET'; key: string; fields: Record<string, string> }
  | { type: 'INCR'; key: string }
  | { type: 'INCRBY'; key: string; increment: number }
  | { type: 'EXPIRE'; key: string; seconds: number }
  | { type: 'DEL'; key: string }
  | { type: 'EXISTS'; key: string }
  | { type: 'ZADD'; key: string; score: number; member: string }
  | { type: 'ZRANGE'; key: string; start: number; stop: number; withScores?: boolean }
  | { type: 'ZREVRANGE'; key: string; start: number; stop: number; withScores?: boolean };

// ============================================================================
// REDIS TTL CONSTANTS
// ============================================================================

export const REDIS_TTL = {
  GAME_SESSION: 60 * 60 * 4, // 4 hours
  PLAYER_SESSION: 60 * 60 * 2, // 2 hours
  RATE_LIMIT: 60, // 1 minute
  ROUND_TIMER: 60 * 5, // 5 minutes
  GUESS_HISTORY: 60 * 30, // 30 minutes
  LOBBY_DATA: 60 * 10, // 10 minutes
} as const;
