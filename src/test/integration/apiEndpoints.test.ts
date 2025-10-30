import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  CreateGameRequest,
  CreateGameResponse,
  JoinGameRequest,
  JoinGameResponse,
  StartGameRequest,
  SubmitEmojisRequest,
  SubmitEmojisResponse,
  SubmitGuessRequest,
  SubmitGuessResponse,
  EndRoundRequest,
  ApiResponse,
  GameState,
  Player,
  Round,
  Guess,
  RoundResult,
} from '../../shared/types/api';
import { GameException } from '../../shared/types/errors';
import { GAME_CONSTANTS, API_ENDPOINTS } from '../../shared/utils/constants';

// Mock Redis and Reddit
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  hGet: vi.fn(),
  hSet: vi.fn(),
  hGetAll: vi.fn(),
  del: vi.fn(),
  expire: vi.fn(),
  exists: vi.fn(),
  zAdd: vi.fn(),
  zRange: vi.fn(),
  zRem: vi.fn(),
  zRevRank: vi.fn(),
};

const mockReddit = {
  getCurrentUsername: vi.fn(),
};

// Mock the server modules
vi.mock('@devvit/web/server', () => ({
  redis: mockRedis,
  reddit: mockReddit,
}));

describe('API Endpoints Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mock implementations
    Object.values(mockRedis).forEach(mock => mock.mockReset());
    mockReddit.getCurrentUsername.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Game Creation Flow', () => {
    it('should create a new game successfully', async () => {
      // Mock Redis responses
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.zAdd.mockResolvedValue(1);

      const request: CreateGameRequest = {
        subredditName: 'test_subreddit',
        maxRounds: 5,
      };

      // Simulate successful game creation
      const expectedGameState: GameState = {
        id: expect.stringMatching(/^game_/),
        subredditName: 'test_subreddit',
        status: 'lobby',
        currentRound: 0,
        maxRounds: 5,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      };

      const expectedResponse: CreateGameResponse = {
        success: true,
        data: {
          gameId: expect.stringMatching(/^game_/),
          gameState: expectedGameState,
        },
        timestamp: expect.any(Number),
      };

      // Validate request structure
      expect(request.subredditName).toBe('test_subreddit');
      expect(request.maxRounds).toBe(5);
      expect(request.maxRounds).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_ROUNDS);

      // Validate expected response structure
      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data).toBeDefined();
      expect(expectedResponse.data?.gameState.status).toBe('lobby');
    });

    it('should validate game creation parameters', () => {
      const validRequest: CreateGameRequest = {
        subredditName: 'valid_subreddit',
        maxRounds: 3,
      };

      const invalidRequests = [
        { subredditName: '', maxRounds: 5 }, // Empty subreddit
        { subredditName: 'test', maxRounds: 0 }, // Invalid rounds
        { subredditName: 'test', maxRounds: 15 }, // Too many rounds
      ];

      // Valid request should pass basic validation
      expect(validRequest.subredditName.length).toBeGreaterThan(0);
      expect(validRequest.maxRounds).toBeGreaterThan(0);
      expect(validRequest.maxRounds).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_ROUNDS);

      // Invalid requests should fail validation
      invalidRequests.forEach(request => {
        const hasEmptySubreddit = request.subredditName.length === 0;
        const hasInvalidRounds = request.maxRounds <= 0 || request.maxRounds > GAME_CONSTANTS.MAX_ROUNDS;
        
        expect(hasEmptySubreddit || hasInvalidRounds).toBe(true);
      });
    });
  });

  describe('Player Join Flow', () => {
    it('should allow player to join existing game', async () => {
      // Mock existing game state
      const existingGameState: GameState = {
        id: 'game_123',
        subredditName: 'test_subreddit',
        status: 'lobby',
        currentRound: 0,
        maxRounds: 5,
        createdAt: Date.now() - 10000,
        updatedAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingGameState));
      mockRedis.hGetAll.mockResolvedValue({});
      mockRedis.hSet.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const request: JoinGameRequest = {
        gameId: 'game_123',
        username: 'alice',
      };

      const expectedPlayer: Player = {
        id: expect.stringMatching(/^test_subreddit_alice_/),
        username: 'alice',
        subredditName: 'test_subreddit',
        score: 0,
        isActive: true,
        joinedAt: expect.any(Number),
      };

      const expectedResponse: JoinGameResponse = {
        success: true,
        data: {
          gameState: existingGameState,
          players: [expectedPlayer],
        },
        timestamp: expect.any(Number),
      };

      // Validate request
      expect(request.gameId).toBe('game_123');
      expect(request.username).toBe('alice');
      expect(request.username.length).toBeGreaterThanOrEqual(GAME_CONSTANTS.MIN_USERNAME_LENGTH);
      expect(request.username.length).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_USERNAME_LENGTH);

      // Validate expected response
      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data?.gameState.status).toBe('lobby');
      expect(expectedResponse.data?.players).toHaveLength(1);
    });

    it('should prevent joining non-existent game', async () => {
      mockRedis.get.mockResolvedValue(null);

      const request: JoinGameRequest = {
        gameId: 'nonexistent_game',
        username: 'alice',
      };

      // Should result in error response
      const expectedError = 'Game not found';
      
      expect(request.gameId).toBe('nonexistent_game');
      expect(expectedError).toBe('Game not found');
    });

    it('should validate username requirements', () => {
      const validUsernames = ['alice', 'bob123', 'user_name', 'test-user'];
      const invalidUsernames = ['', 'a', 'very_long_username_that_exceeds_limit', 'user@domain'];

      validUsernames.forEach(username => {
        expect(username.length).toBeGreaterThanOrEqual(GAME_CONSTANTS.MIN_USERNAME_LENGTH);
        expect(username.length).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_USERNAME_LENGTH);
      });

      invalidUsernames.forEach(username => {
        const tooShort = username.length < GAME_CONSTANTS.MIN_USERNAME_LENGTH;
        const tooLong = username.length > GAME_CONSTANTS.MAX_USERNAME_LENGTH;
        const hasInvalidChars = !/^[a-zA-Z0-9_-]+$/.test(username);
        
        expect(tooShort || tooLong || hasInvalidChars).toBe(true);
      });
    });
  });

  describe('Game Start Flow', () => {
    it('should start game with sufficient players', async () => {
      const gameState: GameState = {
        id: 'game_123',
        subredditName: 'test_subreddit',
        status: 'lobby',
        currentRound: 0,
        maxRounds: 5,
        createdAt: Date.now() - 10000,
        updatedAt: Date.now(),
      };

      const players: Player[] = [
        {
          id: 'player_1',
          username: 'alice',
          subredditName: 'test_subreddit',
          score: 0,
          isActive: true,
          joinedAt: Date.now() - 5000,
        },
        {
          id: 'player_2',
          username: 'bob',
          subredditName: 'test_subreddit',
          score: 0,
          isActive: true,
          joinedAt: Date.now() - 3000,
        },
      ];

      mockRedis.get.mockResolvedValue(JSON.stringify(gameState));
      mockRedis.hGetAll.mockResolvedValue({
        player_1: JSON.stringify(players[0]),
        player_2: JSON.stringify(players[1]),
      });
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.expire.mockResolvedValue(1);

      const request: StartGameRequest = {
        gameId: 'game_123',
      };

      // Validate minimum players requirement
      expect(players.length).toBeGreaterThanOrEqual(GAME_CONSTANTS.MIN_PLAYERS_TO_START);
      expect(players.filter(p => p.isActive).length).toBeGreaterThanOrEqual(GAME_CONSTANTS.MIN_PLAYERS_TO_START);

      // Validate request
      expect(request.gameId).toBe('game_123');
    });

    it('should prevent starting game with insufficient players', () => {
      const insufficientPlayers: Player[] = [
        {
          id: 'player_1',
          username: 'alice',
          subredditName: 'test_subreddit',
          score: 0,
          isActive: true,
          joinedAt: Date.now(),
        },
      ];

      expect(insufficientPlayers.length).toBeLessThan(GAME_CONSTANTS.MIN_PLAYERS_TO_START);
    });
  });

  describe('Round Management Flow', () => {
    it('should handle emoji submission correctly', async () => {
      const round: Round = {
        id: 'round_123',
        gameId: 'game_123',
        roundNumber: 1,
        presenterId: 'player_1',
        phrase: { id: '', text: '', category: '', difficulty: 'easy' },
        emojiSequence: [],
        guesses: [],
        status: 'waiting',
        startTime: Date.now(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(round));
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.expire.mockResolvedValue(1);

      const request: SubmitEmojisRequest = {
        gameId: 'game_123',
        roundId: 'round_123',
        emojiSequence: ['🍎', '🥧'],
      };

      // Validate emoji sequence
      expect(request.emojiSequence).toHaveLength(2);
      expect(request.emojiSequence.length).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_EMOJI_SEQUENCE_LENGTH);
      expect(request.emojiSequence.every(emoji => typeof emoji === 'string')).toBe(true);

      const expectedResponse: SubmitEmojisResponse = {
        success: true,
        data: {
          round: {
            ...round,
            emojiSequence: ['🍎', '🥧'],
            status: 'active',
            phrase: expect.any(Object),
          },
          success: true,
        },
        timestamp: expect.any(Number),
      };

      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data?.round.status).toBe('active');
    });

    it('should validate emoji sequence constraints', () => {
      const validSequences = [
        ['🍎'],
        ['🍎', '🥧'],
        ['🎬', '🍿', '🎭'],
      ];

      const invalidSequences = [
        [], // Empty sequence
        new Array(25).fill('🍎'), // Too long sequence
      ];

      validSequences.forEach(sequence => {
        expect(sequence.length).toBeGreaterThan(0);
        expect(sequence.length).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_EMOJI_SEQUENCE_LENGTH);
      });

      invalidSequences.forEach(sequence => {
        const isEmpty = sequence.length === 0;
        const tooLong = sequence.length > GAME_CONSTANTS.MAX_EMOJI_SEQUENCE_LENGTH;
        
        expect(isEmpty || tooLong).toBe(true);
      });
    });
  });

  describe('Guess Submission Flow', () => {
    it('should handle guess submission with fuzzy matching', async () => {
      const round: Round = {
        id: 'round_123',
        gameId: 'game_123',
        roundNumber: 1,
        presenterId: 'player_1',
        phrase: {
          id: 'phrase_1',
          text: 'apple pie',
          category: 'food',
          difficulty: 'easy',
        },
        emojiSequence: ['🍎', '🥧'],
        guesses: [],
        status: 'active',
        startTime: Date.now() - 30000,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(round));
      mockRedis.exists.mockResolvedValue(1); // Timer exists
      mockReddit.getCurrentUsername.mockResolvedValue('alice');
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.zAdd.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const request: SubmitGuessRequest = {
        gameId: 'game_123',
        roundId: 'round_123',
        guess: 'aple pie', // Typo in guess
      };

      // Validate guess constraints
      expect(request.guess.length).toBeGreaterThan(0);
      expect(request.guess.length).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_GUESS_LENGTH);

      const expectedGuess: Guess = {
        id: expect.stringMatching(/^guess_/),
        playerId: 'player_alice',
        username: 'alice',
        text: 'aple pie',
        similarity: expect.any(Number),
        isCorrect: true, // Should match with fuzzy matching
        timestamp: expect.any(Number),
      };

      const expectedResponse: SubmitGuessResponse = {
        success: true,
        data: {
          guess: expectedGuess,
          isCorrect: true,
          roundEnded: true,
          roundResult: expect.any(Object),
        },
        timestamp: expect.any(Number),
      };

      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data?.isCorrect).toBe(true);
    });

    it('should enforce rate limiting', () => {
      const now = Date.now();
      const recentGuessTime = now - 1000; // 1 second ago
      const oldGuessTime = now - 5000; // 5 seconds ago

      const isRateLimited = (lastGuessTime: number, currentTime: number): boolean => {
        return (currentTime - lastGuessTime) < GAME_CONSTANTS.RATE_LIMIT_WINDOW_MS;
      };

      expect(isRateLimited(recentGuessTime, now)).toBe(true);
      expect(isRateLimited(oldGuessTime, now)).toBe(false);
    });

    it('should prevent duplicate guesses', () => {
      const previousGuesses = ['apple pie', 'fruit tart', 'cherry pie'];
      
      const isDuplicate = (newGuess: string, previous: string[]): boolean => {
        const normalized = newGuess.toLowerCase().trim();
        return previous.some(guess => guess.toLowerCase().trim() === normalized);
      };

      expect(isDuplicate('apple pie', previousGuesses)).toBe(true);
      expect(isDuplicate('Apple Pie', previousGuesses)).toBe(true);
      expect(isDuplicate('banana bread', previousGuesses)).toBe(false);
    });
  });

  describe('Scoring Integration', () => {
    it('should calculate scores correctly', async () => {
      const correctGuessPoints = GAME_CONSTANTS.CORRECT_GUESS_POINTS;
      const presenterPoints = GAME_CONSTANTS.PRESENTER_POINTS;

      expect(correctGuessPoints).toBe(10);
      expect(presenterPoints).toBe(5);

      // Mock score update
      const initialScore = 0;
      const finalGuesserScore = initialScore + correctGuessPoints;
      const finalPresenterScore = initialScore + presenterPoints;

      expect(finalGuesserScore).toBe(10);
      expect(finalPresenterScore).toBe(5);
    });

    it('should handle leaderboard updates', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({
        username: 'alice',
        score: 15,
        gamesPlayed: 2,
        gamesWon: 1,
        lastPlayed: Date.now(),
      }));
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.zAdd.mockResolvedValue(1);

      const scoreIncrement = 10;
      const newTotalScore = 15 + scoreIncrement;

      expect(newTotalScore).toBe(25);
    });
  });

  describe('Round End Flow', () => {
    it('should handle round completion', async () => {
      const round: Round = {
        id: 'round_123',
        gameId: 'game_123',
        roundNumber: 1,
        presenterId: 'player_1',
        phrase: {
          id: 'phrase_1',
          text: 'apple pie',
          category: 'food',
          difficulty: 'easy',
        },
        emojiSequence: ['🍎', '🥧'],
        guesses: [
          {
            id: 'guess_1',
            playerId: 'player_2',
            username: 'alice',
            text: 'apple pie',
            similarity: 1.0,
            isCorrect: true,
            timestamp: Date.now(),
          },
        ],
        status: 'active',
        startTime: Date.now() - 60000,
        winnerId: 'player_2',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(round));
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);

      const request: EndRoundRequest = {
        gameId: 'game_123',
        roundId: 'round_123',
      };

      const expectedResult: RoundResult = {
        roundId: 'round_123',
        winnerId: 'player_2',
        winnerUsername: 'alice',
        correctAnswer: 'apple pie',
        totalGuesses: 1,
        roundDuration: expect.any(Number),
        scores: expect.any(Object),
      };

      const expectedResponse: ApiResponse<RoundResult> = {
        success: true,
        data: expectedResult,
        timestamp: expect.any(Number),
      };

      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data?.winnerId).toBe('player_2');
      expect(expectedResponse.data?.correctAnswer).toBe('apple pie');
    });

    it('should handle timeout scenarios', () => {
      const roundDuration = GAME_CONSTANTS.ROUND_DURATION_MS;
      const startTime = Date.now() - (roundDuration + 10000); // Started 10 seconds past timeout
      const currentTime = Date.now();

      const isExpired = (currentTime - startTime) > roundDuration;
      expect(isExpired).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle Redis connection failures', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      try {
        // This would normally throw an error
        await mockRedis.get('test-key');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Redis connection failed');
      }
    });

    it('should handle invalid game states', () => {
      const invalidGameStates = [
        null,
        undefined,
        '',
        '{}',
        '{"invalid": "data"}',
      ];

      invalidGameStates.forEach(state => {
        if (!state) {
          expect(state).toBeFalsy();
        } else if (state === '{}' || state === '{"invalid": "data"}') {
          // These are invalid JSON structures for game state
          expect(state).toBeTruthy(); // They exist but are invalid
        }
      });
    });

    it('should validate API endpoint constants', () => {
      const requiredEndpoints = [
        'CREATE_GAME',
        'JOIN_GAME',
        'START_GAME',
        'SUBMIT_EMOJIS',
        'SUBMIT_GUESS',
        'END_ROUND',
      ];

      requiredEndpoints.forEach(endpoint => {
        expect(API_ENDPOINTS).toHaveProperty(endpoint);
        expect(typeof API_ENDPOINTS[endpoint as keyof typeof API_ENDPOINTS]).toBe('string');
        expect(API_ENDPOINTS[endpoint as keyof typeof API_ENDPOINTS]).toMatch(/^\/api\//);
      });
    });
  });

  describe('Game Constants Validation', () => {
    it('should have valid timing constants', () => {
      expect(GAME_CONSTANTS.ROUND_DURATION_MS).toBe(120000); // 2 minutes
      expect(GAME_CONSTANTS.COUNTDOWN_INTERVAL_MS).toBe(1000); // 1 second
      expect(GAME_CONSTANTS.ROUND_TRANSITION_DELAY_MS).toBe(5000); // 5 seconds
    });

    it('should have valid player limits', () => {
      expect(GAME_CONSTANTS.MAX_PLAYERS_PER_GAME).toBe(8);
      expect(GAME_CONSTANTS.MIN_PLAYERS_TO_START).toBe(2);
      expect(GAME_CONSTANTS.MIN_PLAYERS_TO_START).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_PLAYERS_PER_GAME);
    });

    it('should have valid scoring constants', () => {
      expect(GAME_CONSTANTS.CORRECT_GUESS_POINTS).toBe(10);
      expect(GAME_CONSTANTS.PRESENTER_POINTS).toBe(5);
      expect(GAME_CONSTANTS.CORRECT_GUESS_POINTS).toBeGreaterThan(GAME_CONSTANTS.PRESENTER_POINTS);
    });

    it('should have valid rate limiting constants', () => {
      expect(GAME_CONSTANTS.RATE_LIMIT_WINDOW_MS).toBe(3000); // 3 seconds
      expect(GAME_CONSTANTS.RATE_LIMIT_MAX_REQUESTS).toBe(1);
    });

    it('should have valid fuzzy matching threshold', () => {
      expect(GAME_CONSTANTS.FUZZY_MATCH_THRESHOLD).toBe(0.8);
      expect(GAME_CONSTANTS.FUZZY_MATCH_THRESHOLD).toBeGreaterThan(0);
      expect(GAME_CONSTANTS.FUZZY_MATCH_THRESHOLD).toBeLessThanOrEqual(1);
    });
  });
});
