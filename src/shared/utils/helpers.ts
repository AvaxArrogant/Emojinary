import type { Player, GameState, Round } from '../types/game.js';
import type { PlayerRole } from '../types/game.js';

// ============================================================================
// GAME UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID with prefix
 */
export const generateId = (prefix: string): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${randomStr}`;
};

/**
 * Generate a unique game ID
 */
export const generateGameId = (): string => {
  return generateId('game');
};

/**
 * Generate a unique round ID
 */
export const generateRoundId = (gameId: string, roundNumber: number): string => {
  const timestamp = Date.now().toString(36);
  return `${gameId}_round_${roundNumber}_${timestamp}`;
};

/**
 * Generate a unique player ID
 */
export const generatePlayerId = (username: string, subreddit: string): string => {
  const timestamp = Date.now().toString(36);
  return `${subreddit}_${username}_${timestamp}`;
};

/**
 * Determine player role in a round
 */
export const getPlayerRole = (playerId: string, round: Round): PlayerRole => {
  return round.presenterId === playerId ? 'presenter' : 'guesser';
};

/**
 * Check if a player is the presenter for a round
 */
export const isPresenter = (playerId: string, round: Round): boolean => {
  return round.presenterId === playerId;
};

/**
 * Get the next presenter in round-robin fashion
 */
export const getNextPresenter = (players: Player[], currentPresenterId: string): Player | null => {
  const activePlayers = players.filter(p => p.isActive);
  if (activePlayers.length === 0) return null;
  
  const currentIndex = activePlayers.findIndex(p => p.id === currentPresenterId);
  const nextIndex = (currentIndex + 1) % activePlayers.length;
  
  return activePlayers[nextIndex] || null;
};

/**
 * Calculate round duration in seconds
 */
export const calculateRoundDuration = (round: Round): number => {
  if (!round.endTime) return 0;
  return Math.floor((round.endTime - round.startTime) / 1000);
};

/**
 * Check if a game can be started
 */
export const canStartGame = (gameState: GameState, players: Player[]): boolean => {
  const activePlayers = players.filter(p => p.isActive);
  return gameState.status === 'lobby' && activePlayers.length >= 2;
};

/**
 * Check if a round is active and within time limit
 */
export const isRoundActive = (round: Round, roundDurationMs: number = 120000): boolean => {
  if (round.status !== 'active') return false;
  
  const elapsed = Date.now() - round.startTime;
  return elapsed < roundDurationMs;
};

/**
 * Get remaining time for a round in milliseconds
 */
export const getRemainingTime = (round: Round, roundDurationMs: number = 120000): number => {
  if (round.status !== 'active') return 0;
  
  const elapsed = Date.now() - round.startTime;
  const remaining = roundDurationMs - elapsed;
  
  return Math.max(0, remaining);
};

/**
 * Format time in MM:SS format
 */
export const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Sanitize text input
 */
export const sanitizeText = (text: string): string => {
  return text.trim().replace(/\s+/g, ' ');
};

/**
 * Normalize text for comparison (lowercase, remove punctuation, etc.)
 */
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

/**
 * Check if two texts are similar enough (basic implementation)
 */
export const calculateSimilarity = (text1: string, text2: string): number => {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);
  
  // Exact match
  if (normalized1 === normalized2) return 1.0;
  
  // Simple Levenshtein distance ratio (simplified)
  const maxLength = Math.max(normalized1.length, normalized2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(normalized1, normalized2);
  return 1 - (distance / maxLength);
};

/**
 * Calculate Levenshtein distance between two strings
 */
export const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));
  
  for (let i = 0; i <= str1.length; i++) matrix[0]![i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j]![0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j]![i] = Math.min(
        matrix[j]![i - 1]! + 1, // deletion
        matrix[j - 1]![i]! + 1, // insertion
        matrix[j - 1]![i - 1]! + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length]![str1.length]!;
};

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i]!, shuffled[j]!] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
};

/**
 * Get a random item from an array
 */
export const getRandomItem = <T>(array: T[]): T | null => {
  if (array.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex] || null;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
