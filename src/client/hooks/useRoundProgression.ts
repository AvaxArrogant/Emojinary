import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import type { RoundResult } from '../../shared/types/game';

type RoundProgressionState = {
  showResults: boolean;
  nextRoundCountdown: number;
  isGameComplete: boolean;
  currentRoundResult: RoundResult | null;
};

type RoundProgressionActions = {
  handleRoundEnd: (result: RoundResult) => void;
  startNextRound: () => Promise<void>;
  completeGame: () => void;
  resetProgression: () => void;
};

type UseRoundProgressionReturn = RoundProgressionState & RoundProgressionActions;

const NEXT_ROUND_DELAY = 10; // 10 seconds countdown

export const useRoundProgression = (): UseRoundProgressionReturn => {
  const { gameState, currentRound, players } = useGame();
  
  const [showResults, setShowResults] = useState(false);
  const [nextRoundCountdown, setNextRoundCountdown] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [currentRoundResult, setCurrentRoundResult] = useState<RoundResult | null>(null);
  const lastProcessedRoundId = useRef<string | null>(null);

  // Check if game is complete
  const checkGameComplete = useCallback(() => {
    if (!gameState || !currentRound) return false;
    return currentRound.roundNumber >= gameState.maxRounds;
  }, [gameState, currentRound]);

  // Handle round end - triggered when a round ends
  const handleRoundEnd = useCallback((result: RoundResult) => {
    setCurrentRoundResult(result);
    setShowResults(true);
    setIsGameComplete(checkGameComplete());
    
    // Start countdown for next round if game isn't complete
    if (!checkGameComplete()) {
      setNextRoundCountdown(NEXT_ROUND_DELAY);
    }
  }, [checkGameComplete]);

  // Countdown timer effect
  useEffect(() => {
    if (nextRoundCountdown > 0 && !isGameComplete) {
      const timer = setTimeout(() => {
        setNextRoundCountdown(prev => {
          const newCount = prev - 1;
          if (newCount === 0) {
            // Auto-start next round when countdown reaches 0
            startNextRound();
          }
          return newCount;
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [nextRoundCountdown, isGameComplete]);

  // Start next round
  const startNextRound = useCallback(async () => {
    if (!gameState) {
      console.error('Cannot start next round: missing game state');
      return;
    }

    try {
      // Call API to start next round (handles round number increment automatically)
      const response = await fetch('/api/game/next-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameState.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to start next round: ${response.status}`);
      }

      // Reset progression state
      setShowResults(false);
      setNextRoundCountdown(0);
      setCurrentRoundResult(null);
      
    } catch (error) {
      console.error('Error starting next round:', error);
      // TODO: Show error to user
    }
  }, [gameState]);

  // Complete game - show final results
  const completeGame = useCallback(() => {
    setShowResults(false);
    setIsGameComplete(true);
    // TODO: Navigate to final results view or show final leaderboard
  }, []);

  // Reset progression state
  const resetProgression = useCallback(() => {
    setShowResults(false);
    setNextRoundCountdown(0);
    setIsGameComplete(false);
    setCurrentRoundResult(null);
  }, []);

  // Listen for round end events from game context
  useEffect(() => {
    // This will be triggered by the game context when a ROUND_ENDED event is received
    // The game context already handles the ROUND_ENDED event, so we need to detect
    // when the current round status changes to 'ended'
    if (currentRound?.status === 'ended' && 
        currentRound.id !== lastProcessedRoundId.current && 
        !showResults) {
      
      // Mark this round as processed to avoid duplicate handling
      lastProcessedRoundId.current = currentRound.id;
      
      // Get winner username from players
      const winner = currentRound.winnerId ? players[currentRound.winnerId] : null;
      
      // Create a round result from the current round data
      const result: RoundResult = {
        roundId: currentRound.id,
        winnerId: currentRound.winnerId || '',
        winnerUsername: winner?.username || '',
        correctAnswer: currentRound.phrase.text,
        totalGuesses: currentRound.guesses.length,
        roundDuration: currentRound.endTime ? currentRound.endTime - currentRound.startTime : 0,
        scores: Object.fromEntries(
          Object.values(players).map(player => [player.id, player.score])
        ),
      };
      
      handleRoundEnd(result);
    }
  }, [currentRound?.status, currentRound?.id, currentRound?.winnerId, showResults, handleRoundEnd, players]);

  return {
    showResults,
    nextRoundCountdown,
    isGameComplete,
    currentRoundResult,
    handleRoundEnd,
    startNextRound,
    completeGame,
    resetProgression,
  };
};
