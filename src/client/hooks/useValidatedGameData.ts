import { useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import {
  validateGameState,
  validatePlayers,
  validateRound,
  createSafeGameStateDefaults,
  createSafePlayersDefaults,
  logValidationResult,
  type SafeGameState,
  type SafePlayer,
  type SafeRound
} from '../utils/dataValidation';

/**
 * Hook that provides validated game data with safe defaults
 * Implements requirements 4.3 and 5.4 for data validation and error handling
 */
export const useValidatedGameData = () => {
  const { gameState, players, currentRound, currentUser } = useGame();

  // Validate and provide safe game state
  const safeGameState = useMemo((): SafeGameState => {
    const validation = validateGameState(gameState);
    
    if (!validation.isValid) {
      logValidationResult(validation, 'game state');
      return createSafeGameStateDefaults();
    }

    if (validation.warnings.length > 0) {
      logValidationResult(validation, 'game state');
    }

    return validation.data!;
  }, [gameState]);

  // Validate and provide safe players data
  const safePlayers = useMemo((): Record<string, SafePlayer> => {
    const validation = validatePlayers(players);
    
    if (!validation.isValid) {
      logValidationResult(validation, 'players');
      return createSafePlayersDefaults();
    }

    if (validation.warnings.length > 0) {
      logValidationResult(validation, 'players');
    }

    return validation.data!;
  }, [players]);

  // Validate and provide safe current round
  const safeCurrentRound = useMemo((): SafeRound | null => {
    if (!currentRound) {
      return null;
    }

    const validation = validateRound(currentRound);
    
    if (!validation.isValid) {
      logValidationResult(validation, 'current round');
      return null;
    }

    if (validation.warnings.length > 0) {
      logValidationResult(validation, 'current round');
    }

    return validation.data!;
  }, [currentRound]);

  // Validate current user (if exists in players)
  const safeCurrentUser = useMemo((): SafePlayer | null => {
    if (!currentUser) {
      return null;
    }

    // Check if current user exists in validated players
    const userInPlayers = safePlayers[currentUser.id];
    if (userInPlayers) {
      return userInPlayers;
    }

    // If not in players, validate the current user directly
    const validation = validatePlayers({ [currentUser.id]: currentUser });
    
    if (!validation.isValid) {
      logValidationResult(validation, 'current user');
      return null;
    }

    if (validation.warnings.length > 0) {
      logValidationResult(validation, 'current user');
    }

    return validation.data![currentUser.id] || null;
  }, [currentUser, safePlayers]);

  // Derived safe data
  const safePlayersArray = useMemo(() => {
    return Object.values(safePlayers).sort((a, b) => a.joinedAt - b.joinedAt);
  }, [safePlayers]);

  const safePlayerCount = safePlayersArray.length;

  // Data availability flags
  const hasValidGameData = safeGameState.id !== 'loading';
  const hasValidPlayerData = safePlayerCount > 0;
  const hasValidUserData = safeCurrentUser !== null;
  const hasValidRoundData = safeCurrentRound !== null;

  // Data freshness indicators
  const dataFreshness = useMemo(() => {
    const now = Date.now();
    const gameAge = hasValidGameData ? now - safeGameState.updatedAt : 0;
    const isStale = gameAge > 30000; // 30 seconds
    const isVeryStale = gameAge > 120000; // 2 minutes

    return {
      gameAge,
      isStale,
      isVeryStale,
      lastUpdate: hasValidGameData ? safeGameState.updatedAt : 0
    };
  }, [safeGameState, hasValidGameData]);

  // Validation status summary
  const validationStatus = useMemo(() => {
    return {
      hasValidGameData,
      hasValidPlayerData,
      hasValidUserData,
      hasValidRoundData,
      allDataValid: hasValidGameData && hasValidPlayerData && hasValidUserData,
      partialDataAvailable: hasValidGameData || hasValidPlayerData,
      needsRefresh: dataFreshness.isVeryStale
    };
  }, [
    hasValidGameData,
    hasValidPlayerData,
    hasValidUserData,
    hasValidRoundData,
    dataFreshness.isVeryStale
  ]);

  return {
    // Safe validated data
    safeGameState,
    safePlayers,
    safePlayersArray,
    safePlayerCount,
    safeCurrentRound,
    safeCurrentUser,
    
    // Data availability flags
    hasValidGameData,
    hasValidPlayerData,
    hasValidUserData,
    hasValidRoundData,
    
    // Data freshness
    dataFreshness,
    
    // Overall validation status
    validationStatus
  };
};
