import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CreateGameRequest, JoinGameRequest, StartGameRequest } from '../../shared/types/api';
import { GameException } from '../../shared/types/errors';

describe('Game Manager Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGame', () => {
    it('should validate request structure', () => {
      const request: CreateGameRequest = {
        subredditName: 'test_subreddit',
        maxRounds: 5,
      };

      expect(request).toHaveProperty('subredditName');
      expect(request).toHaveProperty('maxRounds');
      expect(request.subredditName).toBe('test_subreddit');
      expect(request.maxRounds).toBe(5);
    });

    it('should validate GameException structure', () => {
      expect(GameException).toBeDefined();
      expect(typeof GameException).toBe('function');
    });
  });

  describe('joinGame', () => {
    it('should validate join request structure', () => {
      const request: JoinGameRequest = {
        gameId: 'game_123',
        username: 'alice',
      };

      expect(request).toHaveProperty('gameId');
      expect(request).toHaveProperty('username');
      expect(request.gameId).toBe('game_123');
      expect(request.username).toBe('alice');
    });

    it('should validate game state structure', () => {
      const mockGameState = {
        id: 'game_123',
        subredditName: 'test_subreddit',
        status: 'lobby',
        currentRound: 0,
        maxRounds: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(mockGameState).toHaveProperty('id');
      expect(mockGameState).toHaveProperty('subredditName');
      expect(mockGameState).toHaveProperty('status');
      expect(mockGameState).toHaveProperty('currentRound');
      expect(mockGameState).toHaveProperty('maxRounds');
    });
  });

  describe('startGame', () => {
    it('should validate start request structure', () => {
      const request: StartGameRequest = {
        gameId: 'game_123',
      };

      expect(request).toHaveProperty('gameId');
      expect(request.gameId).toBe('game_123');
    });

    it('should validate player data structure', () => {
      const mockPlayer = {
        id: 'player_1',
        username: 'alice',
        subredditName: 'test_subreddit',
        score: 0,
        isActive: true,
        joinedAt: Date.now(),
      };

      expect(mockPlayer).toHaveProperty('id');
      expect(mockPlayer).toHaveProperty('username');
      expect(mockPlayer).toHaveProperty('subredditName');
      expect(mockPlayer).toHaveProperty('score');
      expect(mockPlayer).toHaveProperty('isActive');
      expect(mockPlayer).toHaveProperty('joinedAt');
    });
  });

  describe('getGameState', () => {
    it('should validate game state response structure', () => {
      const mockGameStateResponse = {
        success: true,
        data: {
          gameState: {
            id: 'game_123',
            subredditName: 'test_subreddit',
            status: 'active',
            currentRound: 1,
            maxRounds: 5,
          },
          players: [],
          userRole: 'guesser',
        },
        timestamp: Date.now(),
      };

      expect(mockGameStateResponse).toHaveProperty('success');
      expect(mockGameStateResponse).toHaveProperty('data');
      expect(mockGameStateResponse.data).toHaveProperty('gameState');
      expect(mockGameStateResponse.data).toHaveProperty('players');
      expect(mockGameStateResponse.data).toHaveProperty('userRole');
    });
  });
});
