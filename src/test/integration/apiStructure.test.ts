import { describe, it, expect } from 'vitest';
import type {
  CreateGameRequest,
  CreateGameResponse,
  JoinGameRequest,
  JoinGameResponse,
  StartGameRequest,
  SubmitEmojisRequest,
  SubmitGuessRequest,
  ApiResponse,
  GameState,
  Player,
  Round,
  Guess,
  RoundResult,
} from '../../shared/types/api';

describe('API Structure Integration Tests', () => {
  describe('Request Types', () => {
    it('should validate CreateGameRequest structure', () => {
      const request: CreateGameRequest = {
        subredditName: 'test_subreddit',
        maxRounds: 5,
      };

      expect(request).toHaveProperty('subredditName');
      expect(request).toHaveProperty('maxRounds');
      expect(typeof request.subredditName).toBe('string');
      expect(typeof request.maxRounds).toBe('number');
    });

    it('should validate JoinGameRequest structure', () => {
      const request: JoinGameRequest = {
        gameId: 'game_123',
        username: 'alice',
      };

      expect(request).toHaveProperty('gameId');
      expect(request).toHaveProperty('username');
      expect(typeof request.gameId).toBe('string');
      expect(typeof request.username).toBe('string');
    });

    it('should validate SubmitEmojisRequest structure', () => {
      const request: SubmitEmojisRequest = {
        gameId: 'game_123',
        roundId: 'round_123',
        emojiSequence: ['🍎', '🥧'],
      };

      expect(request).toHaveProperty('gameId');
      expect(request).toHaveProperty('roundId');
      expect(request).toHaveProperty('emojiSequence');
      expect(Array.isArray(request.emojiSequence)).toBe(true);
      expect(request.emojiSequence).toHaveLength(2);
    });

    it('should validate SubmitGuessRequest structure', () => {
      const request: SubmitGuessRequest = {
        gameId: 'game_123',
        roundId: 'round_123',
        guess: 'apple pie',
      };

      expect(request).toHaveProperty('gameId');
      expect(request).toHaveProperty('roundId');
      expect(request).toHaveProperty('guess');
      expect(typeof request.guess).toBe('string');
    });
  });

  describe('Response Types', () => {
    it('should validate ApiResponse structure', () => {
      const response: ApiResponse<string> = {
        success: true,
        data: 'test data',
        timestamp: Date.now(),
      };

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('timestamp');
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.timestamp).toBe('number');
    });

    it('should validate CreateGameResponse structure', () => {
      const gameState: GameState = {
        id: 'game_123',
        subredditName: 'test_subreddit',
        status: 'lobby',
        currentRound: 0,
        maxRounds: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const response: CreateGameResponse = {
        success: true,
        data: {
          gameId: 'game_123',
          gameState,
        },
        timestamp: Date.now(),
      };

      expect(response.data).toBeDefined();
      expect(response.data).toHaveProperty('gameId');
      expect(response.data).toHaveProperty('gameState');
      expect(response.data!.gameState).toHaveProperty('id');
      expect(response.data!.gameState).toHaveProperty('status');
    });

    it('should validate JoinGameResponse structure', () => {
      const gameState: GameState = {
        id: 'game_123',
        subredditName: 'test_subreddit',
        status: 'lobby',
        currentRound: 0,
        maxRounds: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const players: Player[] = [
        {
          id: 'player_1',
          username: 'alice',
          subredditName: 'test_subreddit',
          score: 0,
          isActive: true,
          joinedAt: Date.now(),
        },
      ];

      const response: JoinGameResponse = {
        success: true,
        data: {
          gameState,
          players,
        },
        timestamp: Date.now(),
      };

      expect(response.data).toBeDefined();
      expect(response.data).toHaveProperty('gameState');
      expect(response.data).toHaveProperty('players');
      expect(Array.isArray(response.data!.players)).toBe(true);
      expect(response.data!.players[0]).toHaveProperty('username');
    });
  });

  describe('Game Data Types', () => {
    it('should validate GameState structure', () => {
      const gameState: GameState = {
        id: 'game_123',
        subredditName: 'test_subreddit',
        status: 'active',
        currentRound: 1,
        maxRounds: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(gameState).toHaveProperty('id');
      expect(gameState).toHaveProperty('subredditName');
      expect(gameState).toHaveProperty('status');
      expect(gameState).toHaveProperty('currentRound');
      expect(gameState).toHaveProperty('maxRounds');
      expect(gameState).toHaveProperty('createdAt');
      expect(gameState).toHaveProperty('updatedAt');

      expect(['lobby', 'active', 'paused', 'ended']).toContain(gameState.status);
    });

    it('should validate Player structure', () => {
      const player: Player = {
        id: 'player_1',
        username: 'alice',
        subredditName: 'test_subreddit',
        score: 15,
        isActive: true,
        joinedAt: Date.now(),
      };

      expect(player).toHaveProperty('id');
      expect(player).toHaveProperty('username');
      expect(player).toHaveProperty('subredditName');
      expect(player).toHaveProperty('score');
      expect(player).toHaveProperty('isActive');
      expect(player).toHaveProperty('joinedAt');

      expect(typeof player.score).toBe('number');
      expect(typeof player.isActive).toBe('boolean');
    });

    it('should validate Round structure', () => {
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
        startTime: Date.now(),
      };

      expect(round).toHaveProperty('id');
      expect(round).toHaveProperty('gameId');
      expect(round).toHaveProperty('roundNumber');
      expect(round).toHaveProperty('presenterId');
      expect(round).toHaveProperty('phrase');
      expect(round).toHaveProperty('emojiSequence');
      expect(round).toHaveProperty('guesses');
      expect(round).toHaveProperty('status');
      expect(round).toHaveProperty('startTime');

      expect(['waiting', 'active', 'ended']).toContain(round.status);
      expect(Array.isArray(round.emojiSequence)).toBe(true);
      expect(Array.isArray(round.guesses)).toBe(true);
    });

    it('should validate Guess structure', () => {
      const guess: Guess = {
        id: 'guess_1',
        playerId: 'player_1',
        username: 'alice',
        text: 'apple pie',
        similarity: 1.0,
        isCorrect: true,
        timestamp: Date.now(),
      };

      expect(guess).toHaveProperty('id');
      expect(guess).toHaveProperty('playerId');
      expect(guess).toHaveProperty('username');
      expect(guess).toHaveProperty('text');
      expect(guess).toHaveProperty('similarity');
      expect(guess).toHaveProperty('isCorrect');
      expect(guess).toHaveProperty('timestamp');

      expect(typeof guess.similarity).toBe('number');
      expect(typeof guess.isCorrect).toBe('boolean');
      expect(guess.similarity).toBeGreaterThanOrEqual(0);
      expect(guess.similarity).toBeLessThanOrEqual(1);
    });

    it('should validate RoundResult structure', () => {
      const roundResult: RoundResult = {
        roundId: 'round_123',
        winnerId: 'player_1',
        winnerUsername: 'alice',
        correctAnswer: 'apple pie',
        totalGuesses: 5,
        roundDuration: 90000,
        scores: {
          player_1: 15,
          player_2: 10,
        },
      };

      expect(roundResult).toHaveProperty('roundId');
      expect(roundResult).toHaveProperty('winnerId');
      expect(roundResult).toHaveProperty('winnerUsername');
      expect(roundResult).toHaveProperty('correctAnswer');
      expect(roundResult).toHaveProperty('totalGuesses');
      expect(roundResult).toHaveProperty('roundDuration');
      expect(roundResult).toHaveProperty('scores');

      expect(typeof roundResult.totalGuesses).toBe('number');
      expect(typeof roundResult.roundDuration).toBe('number');
      expect(typeof roundResult.scores).toBe('object');
    });
  });

  describe('Error Handling', () => {
    it('should validate error response structure', () => {
      const errorResponse: ApiResponse<null> = {
        success: false,
        data: null,
        error: 'Game not found',
        timestamp: Date.now(),
      };

      expect(errorResponse).toHaveProperty('success');
      expect(errorResponse).toHaveProperty('data');
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse).toHaveProperty('timestamp');
      expect(errorResponse.success).toBe(false);
      expect(typeof errorResponse.error).toBe('string');
    });
  });

  describe('Game Flow Validation', () => {
    it('should validate complete game flow data structures', () => {
      // Game creation
      const createRequest: CreateGameRequest = {
        subredditName: 'test_subreddit',
        maxRounds: 3,
      };

      // Player joining
      const joinRequest: JoinGameRequest = {
        gameId: 'game_123',
        username: 'alice',
      };

      // Game starting
      const startRequest: StartGameRequest = {
        gameId: 'game_123',
      };

      // Emoji submission
      const emojiRequest: SubmitEmojisRequest = {
        gameId: 'game_123',
        roundId: 'round_123',
        emojiSequence: ['🍎', '🥧'],
      };

      // Guess submission
      const guessRequest: SubmitGuessRequest = {
        gameId: 'game_123',
        roundId: 'round_123',
        guess: 'apple pie',
      };

      // Validate all requests have required properties
      expect(createRequest.subredditName).toBeDefined();
      expect(joinRequest.gameId).toBeDefined();
      expect(startRequest.gameId).toBeDefined();
      expect(emojiRequest.emojiSequence).toBeDefined();
      expect(guessRequest.guess).toBeDefined();

      // Validate data types
      expect(typeof createRequest.maxRounds).toBe('number');
      expect(typeof joinRequest.username).toBe('string');
      expect(Array.isArray(emojiRequest.emojiSequence)).toBe(true);
      expect(typeof guessRequest.guess).toBe('string');
    });
  });
});
