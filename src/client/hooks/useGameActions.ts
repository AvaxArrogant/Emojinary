import { useCallback } from 'react';
import { useGame } from '../contexts/GameContext';

/**
 * Custom hook for game lifecycle actions
 */
export const useGameActions = () => {
  const { joinGame, startGame, leaveGame, loading, error, clearError } = useGame();

  const handleJoinGame = useCallback(async () => {
    clearError();
    await joinGame();
  }, [joinGame, clearError]);

  const handleStartGame = useCallback(async () => {
    clearError();
    await startGame();
  }, [startGame, clearError]);

  const handleLeaveGame = useCallback(async () => {
    clearError();
    await leaveGame();
  }, [leaveGame, clearError]);

  return {
    joinGame: handleJoinGame,
    startGame: handleStartGame,
    leaveGame: handleLeaveGame,
    loading,
    error,
    clearError,
  };
};

/**
 * Custom hook for presenter actions
 */
export const usePresenterActions = () => {
  const { 
    submitEmojis, 
    isPresenter, 
    currentRound, 
    loading, 
    error, 
    clearError 
  } = useGame();

  const handleSubmitEmojis = useCallback(async (emojis: string[]) => {
    if (!isPresenter) {
      throw new Error('Only the presenter can submit emojis');
    }
    
    if (emojis.length === 0) {
      throw new Error('Please select at least one emoji');
    }

    clearError();
    await submitEmojis(emojis);
  }, [submitEmojis, isPresenter, clearError]);

  const canSubmitEmojis = isPresenter && 
    currentRound?.status === 'waiting' && 
    !currentRound.emojiSequence.length;

  return {
    submitEmojis: handleSubmitEmojis,
    canSubmitEmojis,
    isPresenter,
    currentPhrase: currentRound?.phrase,
    loading,
    error,
    clearError,
  };
};

/**
 * Custom hook for guesser actions
 */
export const useGuesserActions = () => {
  const { 
    submitGuess, 
    canGuess, 
    currentRound, 
    currentUser,
    loading, 
    error, 
    clearError 
  } = useGame();

  const handleSubmitGuess = useCallback(async (guess: string) => {
    if (!canGuess) {
      throw new Error('Cannot submit guess at this time');
    }
    
    if (!guess.trim()) {
      throw new Error('Please enter a guess');
    }

    // Check if user already guessed correctly
    const userGuesses = currentRound?.guesses.filter(g => g.playerId === currentUser?.id) || [];
    const hasCorrectGuess = userGuesses.some(g => g.isCorrect);
    
    if (hasCorrectGuess) {
      throw new Error('You have already guessed correctly');
    }

    clearError();
    await submitGuess(guess.trim());
  }, [submitGuess, canGuess, currentRound, currentUser, clearError]);

  const userGuesses = currentRound?.guesses.filter(g => g.playerId === currentUser?.id) || [];
  const hasGuessedCorrectly = userGuesses.some(g => g.isCorrect);

  return {
    submitGuess: handleSubmitGuess,
    canGuess: canGuess && !hasGuessedCorrectly,
    currentEmojis: currentRound?.emojiSequence || [],
    userGuesses,
    hasGuessedCorrectly,
    loading,
    error,
    clearError,
  };
};

/**
 * Custom hook for game timer
 */
export const useGameTimer = () => {
  const { timeRemaining, currentRound } = useGame();

  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const isActive = currentRound?.status === 'active';
  const isExpired = timeRemaining <= 0 && isActive;
  const isWarning = timeRemaining <= 30 && isActive; // Last 30 seconds
  const isCritical = timeRemaining <= 10 && isActive; // Last 10 seconds

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isActive,
    isExpired,
    isWarning,
    isCritical,
  };
};

/**
 * Custom hook for leaderboard and scoring
 */
export const useLeaderboard = () => {
  const { players, currentUser } = useGame();

  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
  
  const currentUserRank = sortedPlayers.findIndex(p => p.id === currentUser?.id) + 1;
  
  const topPlayers = sortedPlayers.slice(0, 10); // Top 10 players

  return {
    players: sortedPlayers,
    topPlayers,
    currentUser,
    currentUserRank,
    totalPlayers: sortedPlayers.length,
  };
};

/**
 * Custom hook for game status and flow
 */
export const useGameStatus = () => {
  const { 
    gameState, 
    currentRound, 
    players, 
    currentUser, 
    connected, 
    loading, 
    error 
  } = useGame();

  const isInLobby = gameState?.status === 'lobby';
  const isGameActive = gameState?.status === 'active';
  const isGameEnded = gameState?.status === 'ended';
  const isRoundActive = currentRound?.status === 'active';
  const isRoundWaiting = currentRound?.status === 'waiting';
  const isRoundEnded = currentRound?.status === 'ended';

  const playerCount = Object.keys(players).length;
  const canStartGame = isInLobby && playerCount >= 2; // Minimum 2 players
  
  const isCurrentUserModerator = currentUser?.id === Object.values(players)[0]?.id; // First player is moderator

  return {
    gameState,
    currentRound,
    isInLobby,
    isGameActive,
    isGameEnded,
    isRoundActive,
    isRoundWaiting,
    isRoundEnded,
    playerCount,
    canStartGame,
    isCurrentUserModerator,
    connected,
    loading,
    error,
  };
};
