import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGamePlayers } from '../../client/hooks/useGamePlayers';
import type { Player, GameState } from '../../shared/types/game';

// Mock the GameContext
const mockGameContext = {
  players: {} as Record<string, Player>,
  currentUser: null as Player | null,
  gameState: null as GameState | null,
  currentRound: null,
  loading: false,
  loadingOperations: {
    joining: false,
    starting: false,
    leaving: false,
    refreshing: false,
    submittingEmojis: false,
    submittingGuess: false,
    initializing: false,
  },
  loadingMessage: null,
  error: null,
  connected: true,
  isPresenter: false,
  canGuess: false,
  timeRemaining: 0,
  joinGame: vi.fn(),
  startGame: vi.fn(),
  leaveGame: vi.fn(),
  submitEmojis: vi.fn(),
  submitGuess: vi.fn(),
  clearError: vi.fn(),
  setLoading: vi.fn(),
  refreshGameState: vi.fn(),
};

vi.mock('../../client/contexts/GameContext', () => ({
  useGame: () => mockGameContext,
}));

describe('useGamePlayers Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock context to default state
    mockGameContext.players = {};
    mockGameContext.currentUser = null;
    mockGameContext.gameState = null;
  });

  describe('Player Array Conversion', () => {
    it('should convert players object to sorted array', () => {
      const player1: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 1000,
        isModerator: false,
      };
      
      const player2: Player = {
        id: 'player2',
        username: 'bob',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 500, // Earlier join time
        isModerator: false,
      };

      mockGameContext.players = {
        player1,
        player2,
      };

      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.players).toHaveLength(2);
      // Should be sorted by join time (bob first, then alice)
      expect(result.current.players[0].username).toBe('bob');
      expect(result.current.players[1].username).toBe('alice');
    });

    it('should handle empty players object', () => {
      mockGameContext.players = {};

      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.players).toHaveLength(0);
      expect(result.current.playerCount).toBe(0);
    });
  });

  describe('Player Count Calculation', () => {
    it('should calculate correct player count', () => {
      const players = {
        player1: {
          id: 'player1',
          username: 'alice',
          subredditName: 'test',
          score: 0,
          isActive: true,
          joinedAt: 1000,
          isModerator: false,
        } as Player,
        player2: {
          id: 'player2',
          username: 'bob',
          subredditName: 'test',
          score: 0,
          isActive: true,
          joinedAt: 2000,
          isModerator: false,
        } as Player,
      };

      mockGameContext.players = players;

      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.playerCount).toBe(2);
    });
  });

  describe('Moderator Detection Logic', () => {
    it('should identify player with explicit moderator flag', () => {
      const player1: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 2000, // Later join time
        isModerator: true, // Explicit moderator
      };
      
      const player2: Player = {
        id: 'player2',
        username: 'bob',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 1000, // Earlier join time
        isModerator: false,
      };

      mockGameContext.players = { player1, player2 };

      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.moderator?.id).toBe('player1');
      expect(result.current.moderator?.username).toBe('alice');
    });

    it('should fallback to first player by join time when no explicit moderator', () => {
      const player1: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 2000,
        isModerator: false,
      };
      
      const player2: Player = {
        id: 'player2',
        username: 'bob',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 1000, // Earlier join time - should be moderator
        isModerator: false,
      };

      mockGameContext.players = { player1, player2 };

      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.moderator?.id).toBe('player2');
      expect(result.current.moderator?.username).toBe('bob');
    });

    it('should return null moderator when no players', () => {
      mockGameContext.players = {};

      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.moderator).toBeNull();
    });

    it('should correctly identify if current user is moderator', () => {
      const currentUser: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 1000,
        isModerator: true,
      };

      const otherPlayer: Player = {
        id: 'player2',
        username: 'bob',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 2000,
        isModerator: false,
      };

      mockGameContext.players = { player1: currentUser, player2: otherPlayer };
      mockGameContext.currentUser = currentUser;

      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.isCurrentUserModerator).toBe(true);
    });

    it('should return false for moderator check when current user is not moderator', () => {
      const moderator: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 1000,
        isModerator: true,
      };

      const currentUser: Player = {
        id: 'player2',
        username: 'bob',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 2000,
        isModerator: false,
      };

      mockGameContext.players = { player1: moderator, player2: currentUser };
      mockGameContext.currentUser = currentUser;

      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.isCurrentUserModerator).toBe(false);
    });
  });

  describe('Game Readiness Calculations', () => {
    beforeEach(() => {
      // Set up a basic lobby game state
      mockGameContext.gameState = {
        id: 'test-game',
        subredditName: 'test',
        status: 'lobby',
        currentRound: 0,
        maxRounds: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    });

    it('should calculate canStartGame correctly for moderator with enough players', () => {
      const moderator: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 1000,
        isModerator: true,
      };

      const player2: Player = {
        id: 'player2',
        username: 'bob',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 2000,
        isModerator: false,
      };

      mockGameContext.players = { player1: moderator, player2 };
      mockGameContext.currentUser = moderator;

      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.canStartGame).toBe(true);
    });

    it('should return false for canStartGame when not enough players', () => {
      const moderator: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 1000,
        isModerator: true,
      };

      mockGameContext.players = { player1: moderator };
      mockGameContext.currentUser = moderator;

      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.canStartGame).toBe(false);
    });

    it('should return false for canStartGame when user is not moderator', () => {
      const moderator: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 1000,
        isModerator: true,
      };

      const currentUser: Player = {
        id: 'player2',
        username: 'bob',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 2000,
        isModerator: false,
      };

      mockGameContext.players = { player1: moderator, player2: currentUser };
      mockGameContext.currentUser = currentUser;

      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.canStartGame).toBe(false);
    });

    it('should return false for canStartGame when game is not in lobby status', () => {
      const moderator: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 1000,
        isModerator: true,
      };

      const player2: Player = {
        id: 'player2',
        username: 'bob',
        subredditName: 'test',
        score: 0,
        isActive: true,
        joinedAt: 2000,
        isModerator: false,
      };

      mockGameContext.players = { player1: moderator, player2 };
      mockGameContext.currentUser = moderator;
      mockGameContext.gameState = {
        ...mockGameContext.gameState!,
        status: 'active', // Game already started
      };

      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.canStartGame).toBe(false);
    });

    describe('Game Ready Status Messages', () => {
      it('should show waiting message when no players', () => {
        mockGameContext.players = {};

        const { result } = renderHook(() => useGamePlayers());

        expect(result.current.gameReadyStatus.isReady).toBe(false);
        expect(result.current.gameReadyStatus.statusType).toBe('waiting');
        expect(result.current.gameReadyStatus.message).toContain('Waiting for players');
        expect(result.current.gameReadyStatus.needsMorePlayers).toBe(2);
      });

      it('should show need more players message when below minimum', () => {
        const player1: Player = {
          id: 'player1',
          username: 'alice',
          subredditName: 'test',
          score: 0,
          isActive: true,
          joinedAt: 1000,
          isModerator: true,
        };

        mockGameContext.players = { player1 };

        const { result } = renderHook(() => useGamePlayers());

        expect(result.current.gameReadyStatus.isReady).toBe(false);
        expect(result.current.gameReadyStatus.statusType).toBe('waiting');
        expect(result.current.gameReadyStatus.message).toContain('Need 1 more player');
        expect(result.current.gameReadyStatus.needsMorePlayers).toBe(1);
      });

      it('should show ready message when minimum players met', () => {
        const player1: Player = {
          id: 'player1',
          username: 'alice',
          subredditName: 'test',
          score: 0,
          isActive: true,
          joinedAt: 1000,
          isModerator: true,
        };

        const player2: Player = {
          id: 'player2',
          username: 'bob',
          subredditName: 'test',
          score: 0,
          isActive: true,
          joinedAt: 2000,
          isModerator: false,
        };

        mockGameContext.players = { player1, player2 };

        const { result } = renderHook(() => useGamePlayers());

        expect(result.current.gameReadyStatus.isReady).toBe(true);
        expect(result.current.gameReadyStatus.statusType).toBe('ready');
        expect(result.current.gameReadyStatus.message).toContain('Ready to start with 2 players');
        expect(result.current.gameReadyStatus.needsMorePlayers).toBe(0);
      });

      it('should show full message when at maximum players', () => {
        const players: Record<string, Player> = {};
        for (let i = 1; i <= 8; i++) {
          players[`player${i}`] = {
            id: `player${i}`,
            username: `player${i}`,
            subredditName: 'test',
            score: 0,
            isActive: true,
            joinedAt: i * 1000,
            isModerator: i === 1,
          };
        }

        mockGameContext.players = players;

        const { result } = renderHook(() => useGamePlayers());

        expect(result.current.gameReadyStatus.isReady).toBe(true);
        expect(result.current.gameReadyStatus.statusType).toBe('full');
        expect(result.current.gameReadyStatus.message).toContain('Game is full');
        expect(result.current.gameReadyStatus.canAcceptMorePlayers).toBe(false);
      });

      it('should show error message when game is not in lobby', () => {
        mockGameContext.gameState = {
          ...mockGameContext.gameState!,
          status: 'active',
        };

        const { result } = renderHook(() => useGamePlayers());

        expect(result.current.gameReadyStatus.isReady).toBe(false);
        expect(result.current.gameReadyStatus.statusType).toBe('error');
        expect(result.current.gameReadyStatus.message).toContain('already in progress');
      });

      it('should show error message when no game state', () => {
        mockGameContext.gameState = null;

        const { result } = renderHook(() => useGamePlayers());

        expect(result.current.gameReadyStatus.isReady).toBe(false);
        expect(result.current.gameReadyStatus.statusType).toBe('error');
        expect(result.current.gameReadyStatus.message).toContain('No game state');
      });
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      const player1: Player = {
        id: 'player1',
        username: 'alice',
        subredditName: 'test',
        score: 10,
        isActive: true,
        joinedAt: 1000,
        isModerator: true,
      };

      const player2: Player = {
        id: 'player2',
        username: 'bob',
        subredditName: 'test',
        score: 5,
        isActive: true,
        joinedAt: 2000,
        isModerator: false,
      };

      mockGameContext.players = { player1, player2 };
    });

    it('should get player by ID correctly', () => {
      const { result } = renderHook(() => useGamePlayers());

      const player = result.current.getPlayerById('player1');
      expect(player?.username).toBe('alice');

      const nonExistentPlayer = result.current.getPlayerById('nonexistent');
      expect(nonExistentPlayer).toBeUndefined();
    });

    it('should check if player is moderator correctly', () => {
      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.isPlayerModerator('player1')).toBe(true);
      expect(result.current.isPlayerModerator('player2')).toBe(false);
      expect(result.current.isPlayerModerator('nonexistent')).toBe(false);
    });

    it('should calculate player rank correctly', () => {
      const { result } = renderHook(() => useGamePlayers());

      // player1 has score 10, player2 has score 5
      // So player1 should be rank 1, player2 should be rank 2
      expect(result.current.getPlayerRank('player1')).toBe(1);
      expect(result.current.getPlayerRank('player2')).toBe(2);
    });

    it('should handle rank calculation for tied scores', () => {
      // Set both players to same score
      mockGameContext.players.player1.score = 10;
      mockGameContext.players.player2.score = 10;

      const { result } = renderHook(() => useGamePlayers());

      // With tied scores, earlier join time should win
      // player1 joined at 1000, player2 at 2000
      expect(result.current.getPlayerRank('player1')).toBe(1);
      expect(result.current.getPlayerRank('player2')).toBe(2);
    });

    it('should return last rank for non-existent player', () => {
      const { result } = renderHook(() => useGamePlayers());

      expect(result.current.getPlayerRank('nonexistent')).toBe(2); // Total player count
    });
  });
});
