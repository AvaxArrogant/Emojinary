import { useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import type { Player } from '../../shared/types/game';

export type GameReadyStatus = {
  isReady: boolean;
  message: string;
  needsMorePlayers: number;
  canAcceptMorePlayers: boolean;
  statusType: 'waiting' | 'ready' | 'full' | 'error';
};

export type UseGamePlayersReturn = {
  players: Player[];
  playerCount: number;
  currentUser: Player | null;
  isCurrentUserModerator: boolean;
  canStartGame: boolean;
  moderator: Player | null;
  gameReadyStatus: GameReadyStatus;
  // Additional utility functions
  getPlayerById: (id: string) => Player | undefined;
  isPlayerModerator: (playerId: string) => boolean;
  getPlayerRank: (playerId: string) => number;
};

/**
 * Hook for clean access to player data from GameContext
 * Extracts player array from players object and provides formatted data for UI components
 */
export const useGamePlayers = (): UseGamePlayersReturn => {
  const { players: playersObject, currentUser, gameState } = useGame();

  // Convert players object to array and sort by join time with safe fallbacks
  const players = useMemo(() => {
    const safePlayersObject = playersObject || {};
    return Object.values(safePlayersObject)
      .filter(player => player && player.id) // Filter out invalid players
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  }, [playersObject]);

  // Calculate player count
  const playerCount = players.length;

  // Identify moderator (player with isModerator flag or first player by join time)
  const moderator = useMemo((): Player | null => {
    if (players.length === 0) return null;
    
    // Look for player with explicit moderator flag
    const explicitModerator = players.find(player => player.isModerator);
    if (explicitModerator) return explicitModerator;
    
    // Fallback to first player by join time
    return players[0] || null;
  }, [players]);

  // Check if current user is moderator
  const isCurrentUserModerator = useMemo(() => {
    if (!currentUser || !moderator) return false;
    return currentUser.id === moderator.id;
  }, [currentUser, moderator]);

  // Calculate if game can be started with safe fallbacks
  const canStartGame = useMemo(() => {
    const safeGameState = gameState || { status: 'lobby' as const };
    // Must be moderator, have minimum players, and be in lobby status
    return (
      isCurrentUserModerator &&
      playerCount >= 2 && // Minimum players requirement
      safeGameState.status === 'lobby'
    );
  }, [isCurrentUserModerator, playerCount, gameState]);

  // Calculate comprehensive game readiness status with clear messages
  const gameReadyStatus = useMemo((): GameReadyStatus => {
    const minPlayers = 2;
    const maxPlayers = 8;

    // Check if game is in correct state
    if (!gameState) {
      return {
        isReady: false,
        message: 'No game state available',
        needsMorePlayers: minPlayers,
        canAcceptMorePlayers: true,
        statusType: 'error',
      };
    }

    const safeGameState = gameState;

    if (safeGameState.status !== 'lobby') {
      return {
        isReady: false,
        message: safeGameState.status === 'active' 
          ? 'Game is already in progress' 
          : safeGameState.status === 'ended'
          ? 'Game has ended'
          : 'Game is not available for joining',
        needsMorePlayers: 0,
        canAcceptMorePlayers: false,
        statusType: 'error',
      };
    }

    // Check player count requirements
    if (playerCount === 0) {
      return {
        isReady: false,
        message: 'Waiting for players to join',
        needsMorePlayers: minPlayers,
        canAcceptMorePlayers: true,
        statusType: 'waiting',
      };
    }

    if (playerCount < minPlayers) {
      const needed = minPlayers - playerCount;
      return {
        isReady: false,
        message: `Need ${needed} more player${needed === 1 ? '' : 's'} to start (${playerCount}/${minPlayers} minimum)`,
        needsMorePlayers: needed,
        canAcceptMorePlayers: true,
        statusType: 'waiting',
      };
    }

    if (playerCount >= maxPlayers) {
      return {
        isReady: true,
        message: `Game is full and ready to start (${playerCount}/${maxPlayers} players)`,
        needsMorePlayers: 0,
        canAcceptMorePlayers: false,
        statusType: 'full',
      };
    }

    // Game is ready but can accept more players
    const canAcceptMore = playerCount < maxPlayers;
    return {
      isReady: true,
      message: `Ready to start with ${playerCount} player${playerCount === 1 ? '' : 's'}${canAcceptMore ? ` (can add ${maxPlayers - playerCount} more)` : ''}`,
      needsMorePlayers: 0,
      canAcceptMorePlayers: canAcceptMore,
      statusType: 'ready',
    };
  }, [playerCount, gameState]);

  // Utility functions
  const getPlayerById = useMemo(() => {
    return (id: string): Player | undefined => {
      return playersObject[id];
    };
  }, [playersObject]);

  const isPlayerModerator = useMemo(() => {
    return (playerId: string): boolean => {
      const player = playersObject[playerId];
      return player?.isModerator === true || (moderator?.id === playerId);
    };
  }, [playersObject, moderator]);

  const getPlayerRank = useMemo(() => {
    return (playerId: string): number => {
      // Sort players by score (descending) then by join time (ascending)
      const sortedPlayers = players
        .slice()
        .sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score; // Higher score first
          }
          return a.joinedAt - b.joinedAt; // Earlier join time first for ties
        });
      
      const rank = sortedPlayers.findIndex(player => player.id === playerId);
      return rank === -1 ? players.length : rank + 1; // 1-based ranking
    };
  }, [players]);

  return {
    players,
    playerCount,
    currentUser,
    isCurrentUserModerator,
    canStartGame,
    moderator,
    gameReadyStatus,
    getPlayerById,
    isPlayerModerator,
    getPlayerRank,
  };
};
