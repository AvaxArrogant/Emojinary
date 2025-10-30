// ============================================================================
// GAME CORE TYPES
// ============================================================================

export type GameStatus = 'lobby' | 'active' | 'paused' | 'ended';
export type RoundStatus = 'waiting' | 'active' | 'ended';
export type PhraseDifficulty = 'easy' | 'medium' | 'hard';
export type PlayerRole = 'presenter' | 'guesser';

export type LobbyTimer = {
  isActive: boolean;
  startTime: number;
  duration: number;
  remainingTime: number;
  lastSyncTime: number;
};

export type GameState = {
  id: string;
  subredditName: string;
  status: GameStatus;
  currentRound: number;
  maxRounds: number;
  createdAt: number;
  updatedAt: number;
  moderatorId?: string;
  lobbyTimer?: LobbyTimer;
};

export type Player = {
  id: string;
  username: string;
  subredditName: string;
  score: number;
  isActive: boolean;
  joinedAt: number;
  isModerator?: boolean;
};

export type Phrase = {
  id: string;
  text: string;
  category: string;
  difficulty: PhraseDifficulty;
  hints?: string[];
};

export type Guess = {
  id: string;
  playerId: string;
  username: string;
  text: string;
  similarity: number;
  isCorrect: boolean;
  timestamp: number;
};

export type Round = {
  id: string;
  gameId: string;
  roundNumber: number;
  presenterId: string;
  phrase: Phrase;
  emojiSequence: string[];
  guesses: Guess[];
  status: RoundStatus;
  startTime: number;
  endTime?: number;
  winnerId?: string;
};

export type RoundResult = {
  roundId: string;
  winnerId?: string;
  winnerUsername?: string;
  correctAnswer: string;
  totalGuesses: number;
  roundDuration: number;
  scores: Record<string, number>;
};

// ============================================================================
// GAME CONFIGURATION
// ============================================================================

export type GameConfig = {
  maxPlayersPerGame: number;
  roundDurationMs: number;
  maxRounds: number;
  minPlayers: number;
  fuzzyMatchThreshold: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  maxGuessLength: number;
  maxEmojiSequenceLength: number;
};

// Default game configuration
export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxPlayersPerGame: 8,
  roundDurationMs: 120000, // 2 minutes
  maxRounds: 5,
  minPlayers: 2,
  fuzzyMatchThreshold: 0.8, // 80% similarity
  rateLimitWindowMs: 3000, // 3 seconds
  rateLimitMaxRequests: 1,
  maxGuessLength: 100,
  maxEmojiSequenceLength: 20,
};

// ============================================================================
// LOBBY TIMER CONFIGURATION
// ============================================================================

export const LOBBY_TIMER_CONFIG = {
  COUNTDOWN_DURATION: 30000, // 30 seconds
  MIN_PLAYERS_FOR_TIMER: 2,
  SYNC_INTERVAL: 5000, // 5 seconds
  WARNING_THRESHOLDS: [10000, 5000], // 10s, 5s warnings
  RESET_ON_JOIN: true,
  MAX_PLAYERS: 8,
} as const;
