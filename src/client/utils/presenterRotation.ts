import type { Player } from '../../shared/types/game';

/**
 * Calculates the next presenter using round-robin rotation
 * @param players - Array of active players
 * @param currentRound - Current round number (1-based)
 * @returns The player who should be the presenter for this round
 */
export const getPresenterForRound = (players: Player[], currentRound: number): Player | null => {
  if (players.length === 0) {
    return null;
  }

  // Filter only active players and sort by join time for consistent ordering
  const activePlayers = players
    .filter(player => player.isActive)
    .sort((a, b) => a.joinedAt - b.joinedAt);

  if (activePlayers.length === 0) {
    return null;
  }

  // Use modulo to cycle through players (round-robin)
  // Subtract 1 from currentRound since rounds are 1-based but array indices are 0-based
  const presenterIndex = (currentRound - 1) % activePlayers.length;
  
  return activePlayers[presenterIndex] || null;
};

/**
 * Gets the next presenter in the rotation
 * @param players - Array of active players
 * @param currentPresenterId - ID of the current presenter
 * @returns The next player in rotation, or null if no valid next presenter
 */
export const getNextPresenter = (players: Player[], currentPresenterId: string): Player | null => {
  const activePlayers = players
    .filter(player => player.isActive)
    .sort((a, b) => a.joinedAt - b.joinedAt);

  if (activePlayers.length === 0) {
    return null;
  }

  const currentIndex = activePlayers.findIndex(player => player.id === currentPresenterId);
  
  if (currentIndex === -1) {
    // Current presenter not found, return first active player
    return activePlayers[0] || null;
  }

  // Get next player in rotation
  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex] || null;
};

/**
 * Gets the presenter rotation order for display purposes
 * @param players - Array of active players
 * @param currentRound - Current round number
 * @param totalRounds - Total number of rounds in the game
 * @returns Array of presenter assignments for each round
 */
export const getPresenterRotationOrder = (
  players: Player[], 
  _currentRound: number, 
  totalRounds: number
): Array<{ round: number; presenter: Player | null }> => {
  const activePlayers = players
    .filter(player => player.isActive)
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const rotationOrder: Array<{ round: number; presenter: Player | null }> = [];

  for (let round = 1; round <= totalRounds; round++) {
    const presenter = getPresenterForRound(activePlayers, round);
    rotationOrder.push({ round, presenter });
  }

  return rotationOrder;
};

/**
 * Checks if a player will be a presenter in upcoming rounds
 * @param playerId - ID of the player to check
 * @param players - Array of active players
 * @param currentRound - Current round number
 * @param totalRounds - Total number of rounds in the game
 * @returns Array of round numbers where this player will be presenter
 */
export const getPlayerPresenterRounds = (
  playerId: string,
  players: Player[],
  currentRound: number,
  totalRounds: number
): number[] => {
  const rotationOrder = getPresenterRotationOrder(players, currentRound, totalRounds);
  
  return rotationOrder
    .filter(({ presenter }) => presenter && presenter.id === playerId)
    .map(({ round }) => round);
};

/**
 * Validates that presenter rotation is fair (each player gets roughly equal turns)
 * @param players - Array of active players
 * @param totalRounds - Total number of rounds in the game
 * @returns Validation result with fairness information
 */
export const validatePresenterRotationFairness = (
  players: Player[],
  totalRounds: number
): {
  isFair: boolean;
  presenterCounts: Record<string, number>;
  minTurns: number;
  maxTurns: number;
} => {
  const activePlayers = players.filter(player => player.isActive);
  
  if (activePlayers.length === 0) {
    return {
      isFair: true,
      presenterCounts: {},
      minTurns: 0,
      maxTurns: 0,
    };
  }

  const presenterCounts: Record<string, number> = {};
  
  // Initialize counts
  activePlayers.forEach(player => {
    presenterCounts[player.id] = 0;
  });

  // Count presenter turns for each player
  for (let round = 1; round <= totalRounds; round++) {
    const presenter = getPresenterForRound(activePlayers, round);
    if (presenter) {
      // presenter.id is guaranteed to exist based on Player type definition
      presenterCounts[presenter.id]!++;
    }
  }

  const counts = Object.values(presenterCounts);
  const minTurns = counts.length > 0 ? Math.min(...counts) : 0;
  const maxTurns = counts.length > 0 ? Math.max(...counts) : 0;
  
  // Fair if the difference between max and min turns is at most 1
  const isFair = (maxTurns - minTurns) <= 1;

  return {
    isFair,
    presenterCounts,
    minTurns,
    maxTurns,
  };
};
