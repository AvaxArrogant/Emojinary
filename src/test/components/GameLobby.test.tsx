import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameLobby } from '../../client/components/GameLobby';
import { GameProvider } from '../../client/contexts/GameContext';
import type { GameState, Player } from '../../shared/types/api';

// Mock hooks
vi.mock('../../client/hooks/useGameActions', () => ({
  useGameActions: () => ({
    joinGame: vi.fn(),
    startGame: vi.fn(),
    loading: false,
    error: null,
  }),
  useGameStatus: () => ({
    playerCount: 2,
    canStartGame: true,
    isCurrentUserModerator: true,
    gameState: {
      id: 'test-game',
      status: 'lobby',
      currentRound: 0,
      maxRounds: 5,
    } as GameState,
  }),
  useLeaderboard: () => ({
    players: [
      { id: '1', username: 'alice', score: 0, isActive: true },
      { id: '2', username: 'bob', score: 0, isActive: true },
    ] as Player[],
  }),
}));

vi.mock('../../client/utils/connectionManager', () => ({
  useConnectionState: () => ({
    isConnected: true,
    connectionQuality: 'good',
  }),
}));

vi.mock('../../client/hooks/useLoadingState', () => ({
  useComponentLoading: () => ({
    isLoading: false,
    setLoading: vi.fn(),
  }),
}));

vi.mock('../../client/hooks/useGameError', () => ({
  useGameError: () => ({
    registerRetryableAction: vi.fn(),
    hasNetworkError: false,
  }),
}));

// Mock GameContext
const mockGameContext = {
  currentUser: { id: '1', username: 'alice', score: 0, isActive: true } as Player,
  gameState: {
    id: 'test-game',
    status: 'lobby',
    currentRound: 0,
    maxRounds: 5,
  } as GameState,
  currentRound: null,
  players: [
    { id: '1', username: 'alice', score: 0, isActive: true },
    { id: '2', username: 'bob', score: 0, isActive: true },
  ] as Player[],
  userRole: 'guesser' as const,
};

vi.mock('../../client/contexts/GameContext', () => ({
  useGame: () => mockGameContext,
  GameProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('GameLobby Component', () => {
  const mockJoinGame = vi.fn();
  const mockStartGame = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    vi.mocked(mockJoinGame).mockResolvedValue(undefined);
    vi.mocked(mockStartGame).mockResolvedValue(undefined);
  });

  const renderGameLobby = () => {
    return render(
      <GameProvider>
        <GameLobby />
      </GameProvider>
    );
  };

  it('should render player list correctly', () => {
    renderGameLobby();
    
    // Check that player usernames are displayed
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('should show player count', () => {
    renderGameLobby();
    
    // Should show current player count
    expect(screen.getByText(/2.*players/i)).toBeInTheDocument();
  });

  it('should display start game button for moderator', () => {
    renderGameLobby();
    
    // Should show start button since isCurrentUserModerator is true
    const startButton = screen.getByRole('button', { name: /start game/i });
    expect(startButton).toBeInTheDocument();
    expect(startButton).not.toBeDisabled();
  });

  it('should handle start game button click', async () => {
    renderGameLobby();
    
    const startButton = screen.getByRole('button', { name: /start game/i });
    fireEvent.click(startButton);
    
    // Should call startGame function
    await waitFor(() => {
      expect(mockStartGame).toHaveBeenCalledTimes(1);
    });
  });

  it('should show connection status', () => {
    renderGameLobby();
    
    // Should indicate good connection
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('should display game configuration', () => {
    renderGameLobby();
    
    // Should show max rounds
    expect(screen.getByText(/5.*rounds/i)).toBeInTheDocument();
  });

  it('should show active player indicators', () => {
    renderGameLobby();
    
    // Should show active status for players
    const activeIndicators = screen.getAllByText(/active/i);
    expect(activeIndicators).toHaveLength(2); // Both players are active
  });

  it('should handle join game functionality', async () => {
    renderGameLobby();
    
    // Look for join button (might be for spectators)
    const joinButton = screen.queryByRole('button', { name: /join/i });
    if (joinButton) {
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockJoinGame).toHaveBeenCalledTimes(1);
      });
    }
  });

  it('should display waiting message when appropriate', () => {
    renderGameLobby();
    
    // Should show waiting for more players or ready status
    const waitingText = screen.queryByText(/waiting/i) || screen.queryByText(/ready/i);
    expect(waitingText).toBeInTheDocument();
  });

  it('should show game ID for sharing', () => {
    renderGameLobby();
    
    // Should display the game ID
    expect(screen.getByText(/test-game/)).toBeInTheDocument();
  });
});
