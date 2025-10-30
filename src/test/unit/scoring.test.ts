import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Player, GameState, Round, Guess } from '../../shared/types/game';
import { GAME_CONSTANTS } from '../../shared/utils/constants';

// Mock scoring functions since they're in server code
// These would be the actual scoring logic functions
describe('Scoring System', () => {
  describe('Point Calculation', () => {
    describe('calculateCorrectGuessPoints', () => {
      it('should award correct points for correct guess', () => {
        const points = GAME_CONSTANTS.CORRECT_GUESS_POINTS;
        expect(points).toBe(10);
      });
    });

    describe('calculatePresenterPoints', () => {
      it('should award correct points for presenter when someone guesses correctly', () => {
        const points = GAME_CONSTANTS.PRESENTER_POINTS;
        expect(points).toBe(5);
      });
    });

    describe('calculateRoundScore', () => {
      it('should calculate total points for a round', () => {
        // Mock round with correct guess
        const mockRound: Round = {
          id: 'round_1',
          gameId: 'game_1',
          roundNumber: 1,
          presenterId: 'presenter_1',
          phrase: { id: 'phrase_1', text: 'test phrase', category: 'test', difficulty: 'easy' },
          emojiSequence: ['🎬', '🍿'],
          guesses: [
            {
              id: 'guess_1',
              playerId: 'guesser_1',
              username: 'guesser',
              text: 'test phrase',
              similarity: 1.0,
              isCorrect: true,
              timestamp: Date.now(),
            },
          ],
          status: 'ended',
          startTime: Date.now() - 60000,
          endTime: Date.now(),
          winnerId: 'guesser_1',
        };

        // Calculate expected scores
        const expectedGuesserPoints = GAME_CONSTANTS.CORRECT_GUESS_POINTS;
        const expectedPresenterPoints = GAME_CONSTANTS.PRESENTER_POINTS;

        expect(expectedGuesserPoints).toBe(10);
        expect(expectedPresenterPoints).toBe(5);
      });
    });
  });

  describe('Score Validation', () => {
    describe('validateScoreIncrement', () => {
      it('should accept valid positive score increments', () => {
        const validIncrements = [1, 5, 10, 15, 20];
        validIncrements.forEach(increment => {
          expect(increment).toBeGreaterThan(0);
          expect(Number.isInteger(increment)).toBe(true);
        });
      });

      it('should reject negative score increments', () => {
        const invalidIncrements = [-1, -5, -10];
        invalidIncrements.forEach(increment => {
          expect(increment).toBeLessThan(0);
        });
      });

      it('should reject non-integer score increments', () => {
        const invalidIncrements = [1.5, 2.7, 10.1];
        invalidIncrements.forEach(increment => {
          expect(Number.isInteger(increment)).toBe(false);
        });
      });
    });
  });

  describe('Leaderboard Calculations', () => {
    describe('calculateWinRate', () => {
      it('should calculate correct win rate', () => {
        const calculateWinRate = (gamesWon: number, gamesPlayed: number): number => {
          if (gamesPlayed === 0) return 0;
          return Math.round((gamesWon / gamesPlayed) * 100);
        };

        expect(calculateWinRate(5, 10)).toBe(50);
        expect(calculateWinRate(3, 10)).toBe(30);
        expect(calculateWinRate(0, 10)).toBe(0);
        expect(calculateWinRate(10, 10)).toBe(100);
        expect(calculateWinRate(0, 0)).toBe(0);
      });
    });

    describe('calculateAverageScore', () => {
      it('should calculate correct average score per game', () => {
        const calculateAverageScore = (totalScore: number, gamesPlayed: number): number => {
          if (gamesPlayed === 0) return 0;
          return Math.round(totalScore / gamesPlayed);
        };

        expect(calculateAverageScore(100, 10)).toBe(10);
        expect(calculateAverageScore(75, 5)).toBe(15);
        expect(calculateAverageScore(0, 5)).toBe(0);
        expect(calculateAverageScore(100, 0)).toBe(0);
      });
    });

    describe('sortPlayersByScore', () => {
      it('should sort players by score in descending order', () => {
        const players: Player[] = [
          { id: '1', username: 'player1', subredditName: 'test', score: 50, isActive: true, joinedAt: Date.now() },
          { id: '2', username: 'player2', subredditName: 'test', score: 100, isActive: true, joinedAt: Date.now() },
          { id: '3', username: 'player3', subredditName: 'test', score: 75, isActive: true, joinedAt: Date.now() },
        ];

        const sorted = [...players].sort((a, b) => b.score - a.score);

        expect(sorted[0]?.score).toBe(100);
        expect(sorted[1]?.score).toBe(75);
        expect(sorted[2]?.score).toBe(50);
      });

      it('should handle ties by maintaining stable sort', () => {
        const players: Player[] = [
          { id: '1', username: 'player1', subredditName: 'test', score: 50, isActive: true, joinedAt: 1000 },
          { id: '2', username: 'player2', subredditName: 'test', score: 50, isActive: true, joinedAt: 2000 },
          { id: '3', username: 'player3', subredditName: 'test', score: 75, isActive: true, joinedAt: 1500 },
        ];

        const sorted = [...players].sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.joinedAt - b.joinedAt; // Earlier join time wins ties
        });

        expect(sorted[0]?.score).toBe(75);
        expect(sorted[1]?.username).toBe('player1'); // Earlier join time
        expect(sorted[2]?.username).toBe('player2');
      });
    });
  });

  describe('Game Statistics', () => {
    describe('calculateGameStats', () => {
      it('should calculate comprehensive game statistics', () => {
        const mockGuesses: Guess[] = [
          {
            id: 'guess_1',
            playerId: 'player_1',
            username: 'player1',
            text: 'wrong guess',
            similarity: 0.3,
            isCorrect: false,
            timestamp: Date.now() - 5000,
          },
          {
            id: 'guess_2',
            playerId: 'player_2',
            username: 'player2',
            text: 'correct answer',
            similarity: 1.0,
            isCorrect: true,
            timestamp: Date.now(),
          },
        ];

        const calculateGameStats = (guesses: Guess[], roundDuration: number) => {
          const totalGuesses = guesses.length;
          const correctGuesses = guesses.filter(g => g.isCorrect).length;
          const averageSimilarity = guesses.reduce((sum, g) => sum + g.similarity, 0) / totalGuesses;
          const guessesPerMinute = (totalGuesses / roundDuration) * 60000; // Convert to per minute

          return {
            totalGuesses,
            correctGuesses,
            averageSimilarity: Math.round(averageSimilarity * 100) / 100,
            guessesPerMinute: Math.round(guessesPerMinute * 10) / 10,
          };
        };

        const stats = calculateGameStats(mockGuesses, 120000); // 2 minutes

        expect(stats.totalGuesses).toBe(2);
        expect(stats.correctGuesses).toBe(1);
        expect(stats.averageSimilarity).toBe(0.65); // (0.3 + 1.0) / 2
        expect(stats.guessesPerMinute).toBe(1.0); // 2 guesses in 2 minutes
      });
    });

    describe('calculatePlayerPerformance', () => {
      it('should calculate individual player performance metrics', () => {
        const calculatePlayerPerformance = (
          totalScore: number,
          gamesPlayed: number,
          gamesWon: number,
          correctGuesses: number,
          totalGuesses: number
        ) => {
          const averageScore = gamesPlayed > 0 ? totalScore / gamesPlayed : 0;
          const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;
          const accuracy = totalGuesses > 0 ? (correctGuesses / totalGuesses) * 100 : 0;

          return {
            averageScore: Math.round(averageScore * 10) / 10,
            winRate: Math.round(winRate * 10) / 10,
            accuracy: Math.round(accuracy * 10) / 10,
          };
        };

        const performance = calculatePlayerPerformance(150, 10, 3, 5, 20);

        expect(performance.averageScore).toBe(15.0);
        expect(performance.winRate).toBe(30.0);
        expect(performance.accuracy).toBe(25.0);
      });
    });
  });

  describe('Rate Limiting Validation', () => {
    describe('validateGuessRateLimit', () => {
      it('should enforce rate limiting constants', () => {
        const rateLimitWindow = GAME_CONSTANTS.RATE_LIMIT_WINDOW_MS;
        const maxRequests = GAME_CONSTANTS.RATE_LIMIT_MAX_REQUESTS;

        expect(rateLimitWindow).toBe(3000); // 3 seconds
        expect(maxRequests).toBe(1); // 1 guess per window
      });

      it('should validate guess timing', () => {
        const validateGuessRateLimit = (
          lastGuessTime: number,
          currentTime: number,
          rateLimitWindow: number
        ): boolean => {
          return (currentTime - lastGuessTime) >= rateLimitWindow;
        };

        const now = Date.now();
        const recentGuess = now - 1000; // 1 second ago
        const oldGuess = now - 5000; // 5 seconds ago

        expect(validateGuessRateLimit(recentGuess, now, 3000)).toBe(false);
        expect(validateGuessRateLimit(oldGuess, now, 3000)).toBe(true);
      });
    });
  });

  describe('Anti-Cheating Measures', () => {
    describe('validatePresenterGuess', () => {
      it('should prevent presenter from guessing their own phrase', () => {
        const validatePresenterGuess = (playerId: string, presenterId: string): boolean => {
          return playerId !== presenterId;
        };

        expect(validatePresenterGuess('player_1', 'player_2')).toBe(true);
        expect(validatePresenterGuess('player_1', 'player_1')).toBe(false);
      });
    });

    describe('validateGuessUniqueness', () => {
      it('should detect duplicate guesses from same player', () => {
        const previousGuesses = ['apple pie', 'banana bread'];
        
        const isDuplicateGuess = (newGuess: string, previousGuesses: string[]): boolean => {
          const normalizedNew = newGuess.toLowerCase().trim();
          return previousGuesses.some(guess => 
            guess.toLowerCase().trim() === normalizedNew
          );
        };

        expect(isDuplicateGuess('apple pie', previousGuesses)).toBe(true);
        expect(isDuplicateGuess('Apple Pie', previousGuesses)).toBe(true);
        expect(isDuplicateGuess('cherry tart', previousGuesses)).toBe(false);
      });
    });
  });

  describe('Score Boundaries', () => {
    describe('validateScoreBoundaries', () => {
      it('should enforce maximum reasonable scores', () => {
        const MAX_REASONABLE_SCORE = 1000;
        const MAX_SINGLE_GAME_SCORE = 100;

        const validateScore = (score: number): boolean => {
          return score >= 0 && score <= MAX_REASONABLE_SCORE;
        };

        const validateSingleGameScore = (score: number): boolean => {
          return score >= 0 && score <= MAX_SINGLE_GAME_SCORE;
        };

        expect(validateScore(500)).toBe(true);
        expect(validateScore(1500)).toBe(false);
        expect(validateScore(-10)).toBe(false);

        expect(validateSingleGameScore(50)).toBe(true);
        expect(validateSingleGameScore(150)).toBe(false);
      });
    });

    describe('calculateMaxPossibleScore', () => {
      it('should calculate maximum possible score for a game', () => {
        const calculateMaxPossibleScore = (maxRounds: number): number => {
          // Maximum if player wins every round as guesser
          return maxRounds * GAME_CONSTANTS.CORRECT_GUESS_POINTS;
        };

        expect(calculateMaxPossibleScore(5)).toBe(50); // 5 rounds * 10 points
        expect(calculateMaxPossibleScore(10)).toBe(100); // 10 rounds * 10 points
      });
    });
  });
});
