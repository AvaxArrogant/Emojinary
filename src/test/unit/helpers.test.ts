import { describe, it, expect } from 'vitest';
import {
  generateId,
  generateGameId,
  generateRoundId,
  generatePlayerId,
  getPlayerRole,
  isPresenter,
  getNextPresenter,
  calculateRoundDuration,
  canStartGame,
  isRoundActive,
  getRemainingTime,
  formatTime,
  sanitizeText,
  normalizeText,
  calculateSimilarity,
  levenshteinDistance,
  shuffleArray,
  getRandomItem,
  debounce,
  throttle,
} from '../../shared/utils/helpers';
import type { Player, GameState, Round } from '../../shared/types/game';

describe('Helper Functions', () => {
  describe('ID Generation', () => {
    describe('generateId', () => {
      it('should generate unique IDs with prefix', () => {
        const id1 = generateId('test');
        const id2 = generateId('test');
        
        expect(id1).toMatch(/^test_/);
        expect(id2).toMatch(/^test_/);
        expect(id1).not.toBe(id2);
      });

      it('should handle different prefixes', () => {
        const gameId = generateId('game');
        const roundId = generateId('round');
        
        expect(gameId).toMatch(/^game_/);
        expect(roundId).toMatch(/^round_/);
      });
    });

    describe('generateGameId', () => {
      it('should generate game IDs with correct prefix', () => {
        const gameId = generateGameId();
        expect(gameId).toMatch(/^game_/);
      });
    });

    describe('generateRoundId', () => {
      it('should generate round IDs with game ID and round number', () => {
        const roundId = generateRoundId('game_123', 1);
        expect(roundId).toMatch(/^game_123_round_1_/);
      });
    });

    describe('generatePlayerId', () => {
      it('should generate player IDs with username and subreddit', () => {
        const playerId = generatePlayerId('testuser', 'testsubreddit');
        expect(playerId).toMatch(/^testsubreddit_testuser_/);
      });
    });
  });

  describe('Player Role Functions', () => {
    const mockRound: Round = {
      id: 'round_1',
      gameId: 'game_1',
      roundNumber: 1,
      presenterId: 'player_1',
      phrase: { id: 'phrase_1', text: 'test phrase', category: 'test', difficulty: 'easy' },
      emojiSequence: ['🎬', '🍿'],
      guesses: [],
      status: 'active',
      startTime: Date.now(),
    };

    describe('getPlayerRole', () => {
      it('should return presenter for presenter player', () => {
        const role = getPlayerRole('player_1', mockRound);
        expect(role).toBe('presenter');
      });

      it('should return guesser for non-presenter player', () => {
        const role = getPlayerRole('player_2', mockRound);
        expect(role).toBe('guesser');
      });
    });

    describe('isPresenter', () => {
      it('should return true for presenter', () => {
        expect(isPresenter('player_1', mockRound)).toBe(true);
      });

      it('should return false for non-presenter', () => {
        expect(isPresenter('player_2', mockRound)).toBe(false);
      });
    });

    describe('getNextPresenter', () => {
      const mockPlayers: Player[] = [
        { id: 'player_1', username: 'user1', subredditName: 'test', score: 0, isActive: true, joinedAt: Date.now() },
        { id: 'player_2', username: 'user2', subredditName: 'test', score: 0, isActive: true, joinedAt: Date.now() },
        { id: 'player_3', username: 'user3', subredditName: 'test', score: 0, isActive: false, joinedAt: Date.now() },
      ];

      it('should return next active player in round-robin', () => {
        const nextPresenter = getNextPresenter(mockPlayers, 'player_1');
        expect(nextPresenter?.id).toBe('player_2');
      });

      it('should wrap around to first player', () => {
        const nextPresenter = getNextPresenter(mockPlayers, 'player_2');
        expect(nextPresenter?.id).toBe('player_1');
      });

      it('should return null for empty player list', () => {
        const nextPresenter = getNextPresenter([], 'player_1');
        expect(nextPresenter).toBeNull();
      });

      it('should skip inactive players', () => {
        const allPlayers = [
          { id: 'player_1', username: 'user1', subredditName: 'test', score: 0, isActive: true, joinedAt: Date.now() },
          { id: 'player_2', username: 'user2', subredditName: 'test', score: 0, isActive: false, joinedAt: Date.now() },
          { id: 'player_3', username: 'user3', subredditName: 'test', score: 0, isActive: true, joinedAt: Date.now() },
        ];
        
        const nextPresenter = getNextPresenter(allPlayers, 'player_1');
        expect(nextPresenter?.id).toBe('player_3');
      });
    });
  });

  describe('Round Timing Functions', () => {
    describe('calculateRoundDuration', () => {
      it('should calculate duration for completed round', () => {
        const round: Round = {
          id: 'round_1',
          gameId: 'game_1',
          roundNumber: 1,
          presenterId: 'player_1',
          phrase: { id: 'phrase_1', text: 'test', category: 'test', difficulty: 'easy' },
          emojiSequence: [],
          guesses: [],
          status: 'ended',
          startTime: 1000,
          endTime: 6000,
        };

        const duration = calculateRoundDuration(round);
        expect(duration).toBe(5); // 5 seconds
      });

      it('should return 0 for round without end time', () => {
        const round: Round = {
          id: 'round_1',
          gameId: 'game_1',
          roundNumber: 1,
          presenterId: 'player_1',
          phrase: { id: 'phrase_1', text: 'test', category: 'test', difficulty: 'easy' },
          emojiSequence: [],
          guesses: [],
          status: 'active',
          startTime: Date.now(),
        };

        const duration = calculateRoundDuration(round);
        expect(duration).toBe(0);
      });
    });

    describe('isRoundActive', () => {
      it('should return true for active round within time limit', () => {
        const round: Round = {
          id: 'round_1',
          gameId: 'game_1',
          roundNumber: 1,
          presenterId: 'player_1',
          phrase: { id: 'phrase_1', text: 'test', category: 'test', difficulty: 'easy' },
          emojiSequence: [],
          guesses: [],
          status: 'active',
          startTime: Date.now() - 60000, // 1 minute ago
        };

        const isActive = isRoundActive(round, 120000); // 2 minute limit
        expect(isActive).toBe(true);
      });

      it('should return false for round that exceeded time limit', () => {
        const round: Round = {
          id: 'round_1',
          gameId: 'game_1',
          roundNumber: 1,
          presenterId: 'player_1',
          phrase: { id: 'phrase_1', text: 'test', category: 'test', difficulty: 'easy' },
          emojiSequence: [],
          guesses: [],
          status: 'active',
          startTime: Date.now() - 180000, // 3 minutes ago
        };

        const isActive = isRoundActive(round, 120000); // 2 minute limit
        expect(isActive).toBe(false);
      });

      it('should return false for non-active round', () => {
        const round: Round = {
          id: 'round_1',
          gameId: 'game_1',
          roundNumber: 1,
          presenterId: 'player_1',
          phrase: { id: 'phrase_1', text: 'test', category: 'test', difficulty: 'easy' },
          emojiSequence: [],
          guesses: [],
          status: 'ended',
          startTime: Date.now() - 60000,
        };

        const isActive = isRoundActive(round, 120000);
        expect(isActive).toBe(false);
      });
    });

    describe('getRemainingTime', () => {
      it('should return remaining time for active round', () => {
        const round: Round = {
          id: 'round_1',
          gameId: 'game_1',
          roundNumber: 1,
          presenterId: 'player_1',
          phrase: { id: 'phrase_1', text: 'test', category: 'test', difficulty: 'easy' },
          emojiSequence: [],
          guesses: [],
          status: 'active',
          startTime: Date.now() - 60000, // 1 minute ago
        };

        const remaining = getRemainingTime(round, 120000); // 2 minute limit
        expect(remaining).toBeGreaterThan(50000); // Should be around 60 seconds left
        expect(remaining).toBeLessThanOrEqual(60000);
      });

      it('should return 0 for expired round', () => {
        const round: Round = {
          id: 'round_1',
          gameId: 'game_1',
          roundNumber: 1,
          presenterId: 'player_1',
          phrase: { id: 'phrase_1', text: 'test', category: 'test', difficulty: 'easy' },
          emojiSequence: [],
          guesses: [],
          status: 'active',
          startTime: Date.now() - 180000, // 3 minutes ago
        };

        const remaining = getRemainingTime(round, 120000); // 2 minute limit
        expect(remaining).toBe(0);
      });

      it('should return 0 for non-active round', () => {
        const round: Round = {
          id: 'round_1',
          gameId: 'game_1',
          roundNumber: 1,
          presenterId: 'player_1',
          phrase: { id: 'phrase_1', text: 'test', category: 'test', difficulty: 'easy' },
          emojiSequence: [],
          guesses: [],
          status: 'ended',
          startTime: Date.now() - 60000,
        };

        const remaining = getRemainingTime(round, 120000);
        expect(remaining).toBe(0);
      });
    });

    describe('formatTime', () => {
      it('should format time in MM:SS format', () => {
        expect(formatTime(120000)).toBe('2:00'); // 2 minutes
        expect(formatTime(90000)).toBe('1:30'); // 1 minute 30 seconds
        expect(formatTime(5000)).toBe('0:05'); // 5 seconds
        expect(formatTime(0)).toBe('0:00'); // 0 seconds
      });

      it('should handle fractional seconds by rounding up', () => {
        expect(formatTime(1500)).toBe('0:02'); // 1.5 seconds rounds to 2
        expect(formatTime(500)).toBe('0:01'); // 0.5 seconds rounds to 1
      });
    });
  });

  describe('Game State Functions', () => {
    describe('canStartGame', () => {
      const mockGameState: GameState = {
        id: 'game_1',
        subredditName: 'test',
        status: 'lobby',
        currentRound: 0,
        maxRounds: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const mockPlayers: Player[] = [
        { id: 'player_1', username: 'user1', subredditName: 'test', score: 0, isActive: true, joinedAt: Date.now() },
        { id: 'player_2', username: 'user2', subredditName: 'test', score: 0, isActive: true, joinedAt: Date.now() },
      ];

      it('should return true for lobby game with enough players', () => {
        const canStart = canStartGame(mockGameState, mockPlayers);
        expect(canStart).toBe(true);
      });

      it('should return false for non-lobby game', () => {
        const activeGameState = { ...mockGameState, status: 'active' as const };
        const canStart = canStartGame(activeGameState, mockPlayers);
        expect(canStart).toBe(false);
      });

      it('should return false with insufficient players', () => {
        const singlePlayer = [mockPlayers[0]!];
        const canStart = canStartGame(mockGameState, singlePlayer);
        expect(canStart).toBe(false);
      });

      it('should only count active players', () => {
        const playersWithInactive = [
          ...mockPlayers,
          { id: 'player_3', username: 'user3', subredditName: 'test', score: 0, isActive: false, joinedAt: Date.now() },
        ];
        const canStart = canStartGame(mockGameState, playersWithInactive);
        expect(canStart).toBe(true);
      });
    });
  });

  describe('Text Processing Functions', () => {
    describe('sanitizeText', () => {
      it('should trim whitespace and normalize spaces', () => {
        expect(sanitizeText('  hello   world  ')).toBe('hello world');
        expect(sanitizeText('hello\t\tworld')).toBe('hello world');
        expect(sanitizeText('hello\n\nworld')).toBe('hello world');
      });

      it('should handle empty strings', () => {
        expect(sanitizeText('')).toBe('');
        expect(sanitizeText('   ')).toBe('');
      });
    });

    describe('normalizeText', () => {
      it('should convert to lowercase and remove punctuation', () => {
        expect(normalizeText('Hello, World!')).toBe('hello world');
        expect(normalizeText('Test-Case_123')).toBe('testcase_123'); // \w includes underscores
      });

      it('should normalize whitespace', () => {
        expect(normalizeText('hello   world')).toBe('hello world');
      });
    });

    describe('calculateSimilarity', () => {
      it('should return 1.0 for identical texts', () => {
        const similarity = calculateSimilarity('hello world', 'hello world');
        expect(similarity).toBe(1.0);
      });

      it('should return 1.0 for case-insensitive matches', () => {
        const similarity = calculateSimilarity('Hello World', 'hello world');
        expect(similarity).toBe(1.0);
      });

      it('should return high similarity for close matches', () => {
        const similarity = calculateSimilarity('hello world', 'helo world');
        expect(similarity).toBeGreaterThan(0.8);
      });

      it('should return low similarity for different texts', () => {
        const similarity = calculateSimilarity('hello world', 'goodbye universe');
        expect(similarity).toBeLessThan(0.5);
      });

      it('should handle empty strings', () => {
        expect(calculateSimilarity('', '')).toBe(1.0);
        expect(calculateSimilarity('hello', '')).toBeLessThan(1.0);
      });
    });

    describe('levenshteinDistance', () => {
      it('should return 0 for identical strings', () => {
        const distance = levenshteinDistance('hello', 'hello');
        expect(distance).toBe(0);
      });

      it('should calculate correct distance for different strings', () => {
        expect(levenshteinDistance('cat', 'bat')).toBe(1); // 1 substitution
        expect(levenshteinDistance('cat', 'cats')).toBe(1); // 1 insertion
        expect(levenshteinDistance('cats', 'cat')).toBe(1); // 1 deletion
      });

      it('should handle empty strings', () => {
        expect(levenshteinDistance('', '')).toBe(0);
        expect(levenshteinDistance('hello', '')).toBe(5);
        expect(levenshteinDistance('', 'world')).toBe(5);
      });
    });
  });

  describe('Array Utility Functions', () => {
    describe('shuffleArray', () => {
      it('should return array with same elements', () => {
        const original = [1, 2, 3, 4, 5];
        const shuffled = shuffleArray(original);
        
        expect(shuffled).toHaveLength(original.length);
        expect(shuffled.sort()).toEqual(original.sort());
      });

      it('should not modify original array', () => {
        const original = [1, 2, 3, 4, 5];
        const originalCopy = [...original];
        shuffleArray(original);
        
        expect(original).toEqual(originalCopy);
      });

      it('should handle empty arrays', () => {
        const shuffled = shuffleArray([]);
        expect(shuffled).toEqual([]);
      });
    });

    describe('getRandomItem', () => {
      it('should return item from array', () => {
        const items = ['a', 'b', 'c'];
        const randomItem = getRandomItem(items);
        
        expect(items).toContain(randomItem);
      });

      it('should return null for empty array', () => {
        const randomItem = getRandomItem([]);
        expect(randomItem).toBeNull();
      });

      it('should return the only item from single-item array', () => {
        const randomItem = getRandomItem(['only']);
        expect(randomItem).toBe('only');
      });
    });
  });

  describe('Function Utilities', () => {
    describe('debounce', () => {
      it('should delay function execution', async () => {
        let callCount = 0;
        const debouncedFn = debounce(() => {
          callCount++;
        }, 50);

        debouncedFn();
        debouncedFn();
        debouncedFn();

        // Should not have been called yet
        expect(callCount).toBe(0);

        await new Promise(resolve => setTimeout(resolve, 60));
        // Should have been called once after delay
        expect(callCount).toBe(1);
      });

      it('should pass arguments correctly', async () => {
        let receivedArgs: any[] = [];
        const debouncedFn = debounce((...args: any[]) => {
          receivedArgs = args;
        }, 50);

        debouncedFn('test', 123);

        await new Promise(resolve => setTimeout(resolve, 60));
        expect(receivedArgs).toEqual(['test', 123]);
      });
    });

    describe('throttle', () => {
      it('should limit function calls', async () => {
        let callCount = 0;
        const throttledFn = throttle(() => {
          callCount++;
        }, 50);

        throttledFn();
        throttledFn();
        throttledFn();

        // Should have been called once immediately
        expect(callCount).toBe(1);

        await new Promise(resolve => setTimeout(resolve, 25));
        throttledFn();
        // Should still be 1 (throttled)
        expect(callCount).toBe(1);

        await new Promise(resolve => setTimeout(resolve, 35));
        throttledFn();
        // Should now be 2 (throttle period passed)
        expect(callCount).toBe(2);
      });
    });
  });
});
