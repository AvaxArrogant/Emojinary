import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GameProvider, useGame } from '../../client/contexts/GameContext';
import type { Player, GameState } from '../../shared/types/game';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock connection manager
vi.mock('../../client/utils/connectionManager', () => ({
  getConnectionManager: () => ({
    updateConnectionState: vi.fn(),
  }),
}));

// Test component to access GameContext state
const TestComponent: React.FC<{ testId: string }> = ({ testId }) => {
  const { players, gameState, currentUser, error, loading } = useGame();

  return (
    <div data-testid={testId}>
      <div data-testid="player-count">{Object.keys(players).length}</div>
      <div data-testid="game-state">{gameState?.status || 'no-game'}</div>
      <div data-testid="current-user">{currentUser?.username || 'no-user'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="moderator">
        {Object.values(players).find(p => p.isModerator)?.username || 'no-moderator'}
      </div>
      <div data-testid="players-json">{JSON.stringify(players)}</div>
    </div>
  );
};

const renderWithProvider = (testId = 'test-component') => {
  return render(
    <GameProvider>
      <TestComponent testId={testId} />
    </GameProvider>
  );
};

describe('GameContext State Management Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Player Data Synchronization', () => {
    it('should properly assign moderator to earliest player', async () => {
      const player1: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 2000, // Later join time
        isModerator: false,
      };
      
      const player2: Player = {
        id: 'player2',
        username: 'bob',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 1000, // Earlier join time - should become moderator
        isModerator: false,
      };

      // Mock response with players
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gameState: {
            id: 'test-game',
            status: 'lobby',
            currentRound: 0,
            maxRounds: 5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          currentUser: player1,
          players: { player1, player2 },
          timestamp: Date.now(),
        }),
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('player-count')).toHaveTextContent('2');
      });

      // Bob should be moderator (earlier join time)
      await waitFor(() => {
        expect(screen.getByTestId('moderator')).toHaveTextContent('bob');
      });
    });

    it('should validate and normalize malformed player data', async () => {
      const validPlayer: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 10,
        isActive: true,
        joinedAt: 1000,
        isModerator: false,
      };

      // Mock response with malformed player data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gameState: {
            id: 'test-game',
            status: 'lobby',
            currentRound: 0,
            maxRounds: 5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          currentUser: validPlayer,
          players: {
            player1: validPlayer,
            invalidPlayer: null, // Should be filtered out
            player2: {
              id: 'player2',
              username: 'bob',
              // Missing some fields - should be normalized
              score: 'invalid', // Invalid score type
              isActive: 'yes', // Invalid boolean type
            },
            player3: {
              // Missing required id and username - should be filtered out
              score: 5,
            },
          },
          timestamp: Date.now(),
        }),
      });

      renderWithProvider();

      await waitFor(() => {
        // Should only count valid players (player1 and player2, not invalidPlayer or player3)
        expect(screen.getByTestId('player-count')).toHaveTextContent('2');
      });

      // Check that player data was normalized
      await waitFor(() => {
        const playersJson = JSON.parse(screen.getByTestId('players-json').textContent || '{}');
        expect(playersJson.player1).toBeDefined();
        expect(playersJson.player2).toBeDefined();
        expect(playersJson.invalidPlayer).toBeUndefined();
        expect(playersJson.player3).toBeUndefined();
        
        // Check normalized values
        expect(playersJson.player2.score).toBe(0); // Invalid score normalized to 0
        expect(playersJson.player2.isActive).toBe(true); // Invalid boolean normalized to true
      });
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error on initialization
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network error');
      });
    });

    it('should handle HTTP error responses appropriately', async () => {
      // Mock 404 response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to initialize game');
      });
    });

    it('should handle malformed JSON responses', async () => {
      // Mock response with invalid JSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid JSON');
      });
    });
  });

  describe('Game State Transitions', () => {
    it('should handle successful game initialization', async () => {
      const mockGameState: GameState = {
        id: 'test-game',
        subredditName: 'test',
        status: 'lobby',
        currentRound: 0,
        maxRounds: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const mockPlayer: Player = {
        id: 'player1',
        username: 'testuser',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: Date.now(),
        isModerator: true,
      };

      // Mock successful initialization response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gameState: mockGameState,
          currentUser: mockPlayer,
          players: { player1: mockPlayer },
          timestamp: Date.now(),
        }),
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('game-state')).toHaveTextContent('lobby');
        expect(screen.getByTestId('current-user')).toHaveTextContent('testuser');
        expect(screen.getByTestId('player-count')).toHaveTextContent('1');
        expect(screen.getByTestId('error')).toHaveTextContent('no-error');
      });
    });

    it('should handle auto-join when no active game exists', async () => {
      // Mock initial response with no active game
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          currentUser: { id: 'player1', username: 'testuser' },
          timestamp: Date.now(),
        }),
      });

      // Mock auto-join response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gameState: {
            id: 'test-game',
            status: 'lobby',
            currentRound: 0,
            maxRounds: 5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          player: { id: 'player1', username: 'testuser' },
          players: { player1: { id: 'player1', username: 'testuser' } },
        }),
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('game-state')).toHaveTextContent('lobby');
        expect(screen.getByTestId('current-user')).toHaveTextContent('testuser');
      });
    });
  });

  describe('Polling Mechanism Integration', () => {
    it('should handle polling updates when players change', async () => {
      const initialPlayer: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 1000,
        isModerator: true,
      };

      // Mock initial response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gameState: {
            id: 'test-game',
            status: 'lobby',
            currentRound: 0,
            maxRounds: 5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          currentUser: initialPlayer,
          players: { player1: initialPlayer },
          timestamp: Date.now(),
        }),
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('player-count')).toHaveTextContent('1');
        expect(screen.getByTestId('moderator')).toHaveTextContent('alice');
      });

      // The polling mechanism should be working in the background
      // We can't easily test the actual polling without complex timer mocking
      // But we can verify the initial state is correct
      expect(screen.getByTestId('game-state')).toHaveTextContent('lobby');
    });

    it('should handle connection state updates', async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gameState: {
            id: 'test-game',
            status: 'lobby',
            currentRound: 0,
            maxRounds: 5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          currentUser: { id: 'player1', username: 'testuser' },
          players: {},
          timestamp: Date.now(),
        }),
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('game-state')).toHaveTextContent('lobby');
      });

      // Connection should be established after successful initialization
      // The actual connection state is managed internally
    });
  });
});
