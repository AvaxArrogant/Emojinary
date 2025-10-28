import { redis, reddit } from '@devvit/web/server';
import type {
  Round,
  Guess,
  RoundResult,
  Player,
  GameState,
  SubmitEmojisRequest,
  SubmitEmojisResponse,
  SubmitGuessRequest,
  SubmitGuessResponse,
  EndRoundRequest,
  ApiResponse,
} from '../../shared/types/api.js';
import { REDIS_KEYS, REDIS_TTL } from '../../shared/types/redis.js';
import { DEFAULT_GAME_CONFIG } from '../../shared/types/game.js';
import { GameException } from '../../shared/types/errors.js';
import { validateGameId, validateEmojiSequence, validateGuess } from '../../shared/types/validation.js';
import { generateId } from '../../shared/utils/helpers.js';
import { validateGuessAgainstPhrase, isDuplicateGuess } from '../../shared/utils/guessValidation.js';
import { selectRandomPhrase, type SessionPhraseTracker } from '../../shared/utils/phrases.js';
import { 
  broadcastRoundStarted,
  broadcastEmojisSubmitted,
  broadcastGuessSubmitted,
  broadcastRoundEnded,
  startRoundTimer,
  stopRoundTimer 
} from './realtimeManager.js';
import { updatePlayerScore, updateLeaderboard, getAllPlayers } from './dataManager.js';

// ============================================================================
// ROUND STARTING
// ============================================================================

export async function startRound(gameId: string, roundNumber: number): Promise<Round> {
  try {
    // Validate input
    const gameIdValidation = validateGameId(gameId);
    if (!gameIdValidation.isValid) {
      throw GameException.fromType('INVALID_INPUT', gameIdValidation.errors.join(', ') || 'Invalid game ID');
    }

    // Get game state
    const gameStateData = await redis.get(REDIS_KEYS.GAME(gameId));
    if (!gameStateData) {
      throw GameException.fromType('GAME_NOT_FOUND', 'Game not found');
    }

    const gameState: GameState = JSON.parse(gameStateData);
    
    if (gameState.status !== 'active') {
      throw GameException.fromType('GAME_NOT_FOUND', 'Game is not active');
    }

    // Get players
    const playersData = await redis.hGetAll(REDIS_KEYS.PLAYERS(gameId));
    const players: Player[] = Object.values(playersData)
      .filter(data => data !== 'true')
      .map(data => JSON.parse(data))
      .filter(player => player.isActive);

    if (players.length === 0) {
      throw GameException.fromType('GAME_NOT_FOUND', 'No active players found');
    }

    // Select presenter (round-robin based on round number)
    const presenterIndex = (roundNumber - 1) % players.length;
    const presenter = players[presenterIndex];
    
    if (!presenter) {
      throw GameException.fromType('GAME_NOT_FOUND', 'Could not select presenter');
    }

    // Create new round
    const roundId = generateId('round');
    const round: Round = {
      id: roundId,
      gameId,
      roundNumber,
      presenterId: presenter.id,
      phrase: { id: '', text: '', category: '', difficulty: 'easy' }, // Will be set when presenter selects phrase
      emojiSequence: [],
      guesses: [],
      status: 'waiting',
      startTime: Date.now(),
    };

    // Save round
    await redis.set(
      REDIS_KEYS.ROUND(gameId, roundId),
      JSON.stringify(round)
    );
    await redis.expire(REDIS_KEYS.ROUND(gameId, roundId), REDIS_TTL.GAME_SESSION);

    // Broadcast round started event
    await broadcastRoundStarted(gameId, round);

    return round;
  } catch (error) {
    console.error('Error starting round:', error);
    
    if (error instanceof GameException) {
      throw error;
    }
    
    throw GameException.fromType('SERVER_ERROR', 'Failed to start round');
  }
}

// ============================================================================
// EMOJI SUBMISSION
// ============================================================================

export async function submitEmojis(request: SubmitEmojisRequest): Promise<SubmitEmojisResponse> {
  try {
    // Validate input
    const gameIdValidation = validateGameId(request.gameId);
    if (!gameIdValidation.isValid) {
      throw GameException.fromType('INVALID_INPUT', gameIdValidation.errors.join(', ') || 'Invalid game ID');
    }

    const emojiValidation = validateEmojiSequence(request.emojiSequence);
    if (!emojiValidation.isValid) {
      throw GameException.fromType('INVALID_INPUT', emojiValidation.errors.join(', ') || 'Invalid emoji sequence');
    }

    // Get round
    const roundData = await redis.get(REDIS_KEYS.ROUND(request.gameId, request.roundId));
    if (!roundData) {
      throw GameException.fromType('ROUND_NOT_FOUND', 'Round not found');
    }

    const round: Round = JSON.parse(roundData);
    
    if (round.status !== 'waiting') {
      throw GameException.fromType('ROUND_NOT_ACTIVE', 'Round is not waiting for emoji submission');
    }

    // Get a random phrase for the presenter
    // Create a simple tracker for this selection
    const tracker: SessionPhraseTracker = {
      gameId: request.gameId,
      usedPhraseIds: new Set<string>(),
      categoryUsageCount: {
        movies: 0,
        books: 0,
        songs: 0,
        animals: 0,
        food: 0,
        places: 0,
        activities: 0,
      },
      difficultyUsageCount: { easy: 0, medium: 0, hard: 0 },
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
    const phraseData = selectRandomPhrase(tracker);
    
    if (!phraseData) {
      throw GameException.fromType('SERVER_ERROR', 'Could not select a phrase');
    }
    
    const phrase = {
      id: phraseData.id,
      text: phraseData.text,
      category: 'general', // Default category
      difficulty: phraseData.difficulty,
      hints: phraseData.hints || [],
    };
    
    // Update round with emojis and phrase
    round.phrase = phrase;
    round.emojiSequence = request.emojiSequence;
    round.status = 'active';
    round.startTime = Date.now();

    // Save updated round
    await redis.set(
      REDIS_KEYS.ROUND(request.gameId, request.roundId),
      JSON.stringify(round)
    );
    await redis.expire(REDIS_KEYS.ROUND(request.gameId, request.roundId), REDIS_TTL.GAME_SESSION);

    // Start round timer with real-time updates
    await startRoundTimer(request.gameId, request.roundId, DEFAULT_GAME_CONFIG.roundDurationMs);

    // Broadcast emojis submitted event
    await broadcastEmojisSubmitted(request.gameId, request.roundId, request.emojiSequence);

    return {
      success: true,
      data: {
        round,
        success: true,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error submitting emojis:', error);
    
    if (error instanceof GameException) {
      throw error;
    }
    
    throw GameException.fromType('SERVER_ERROR', 'Failed to submit emojis');
  }
}

// ============================================================================
// GUESS SUBMISSION
// ============================================================================

export async function submitGuess(request: SubmitGuessRequest, username?: string): Promise<SubmitGuessResponse> {
  try {
    // Validate input
    const gameIdValidation = validateGameId(request.gameId);
    if (!gameIdValidation.isValid) {
      throw GameException.fromType('INVALID_INPUT', gameIdValidation.errors.join(', ') || 'Invalid game ID');
    }

    const guessValidation = validateGuess(request.guess);
    if (!guessValidation.isValid) {
      throw GameException.fromType('INVALID_INPUT', guessValidation.errors.join(', ') || 'Invalid guess');
    }

    // Get round
    const roundData = await redis.get(REDIS_KEYS.ROUND(request.gameId, request.roundId));
    if (!roundData) {
      throw GameException.fromType('ROUND_NOT_FOUND', 'Round not found');
    }

    const round: Round = JSON.parse(roundData);
    
    if (round.status !== 'active') {
      throw GameException.fromType('ROUND_NOT_ACTIVE', 'Round is not active');
    }

    // Check if round has timed out
    const timerExists = await redis.exists(REDIS_KEYS.ROUND_TIMER(request.roundId));
    if (!timerExists) {
      throw GameException.fromType('TIMEOUT', 'Round has expired');
    }

    // Get current user information
    let currentUsername = username;
    if (!currentUsername) {
      currentUsername = await reddit.getCurrentUsername();
      if (!currentUsername) {
        throw GameException.fromType('UNAUTHORIZED', 'User not authenticated');
      }
    }
    
    // Generate player ID based on username for consistency
    const playerId = `player_${currentUsername}`;

    // Check for duplicate guesses from this player
    const playerPreviousGuesses = round.guesses
      .filter(g => g.playerId === playerId)
      .map(g => g.text);
    
    if (isDuplicateGuess(request.guess, playerPreviousGuesses)) {
      throw GameException.fromType('DUPLICATE_GUESS', `Player ${username} already submitted a similar guess`);
    }

    // Validate guess against phrase using fuzzy matching
    const guessResult = validateGuessAgainstPhrase(request.guess, round.phrase.text);
    
    if (!guessResult.isValid) {
      throw GameException.fromType('INVALID_GUESS', guessResult.errors.join(', '));
    }
    
    // Create guess object
    const guess: Guess = {
      id: generateId('guess'),
      playerId,
      username: currentUsername,
      text: request.guess,
      similarity: guessResult.fuzzyMatchResult?.similarity || 0,
      isCorrect: guessResult.fuzzyMatchResult?.isMatch || false,
      timestamp: Date.now(),
    };

    // Add guess to round
    round.guesses.push(guess);
    
    let roundEnded = false;
    let roundResult: RoundResult | undefined;

    // Check if guess is correct
    if (guess.isCorrect) {
      // End the round
      round.status = 'ended';
      round.endTime = Date.now();
      round.winnerId = playerId;
      roundEnded = true;

      // Award points for correct guess (10 points) and presenter (5 points)
      const CORRECT_GUESS_POINTS = 10;
      const PRESENTER_POINTS = 5;

      try {
        // Get game state to access subreddit name
        const gameStateData = await redis.get(REDIS_KEYS.GAME(request.gameId));
        const gameState: GameState = gameStateData ? JSON.parse(gameStateData) : null;
        
        if (gameState) {
          // Award points to guesser
          await updatePlayerScore(request.gameId, playerId, CORRECT_GUESS_POINTS);
          await updateLeaderboard(gameState.subredditName, currentUsername, CORRECT_GUESS_POINTS, false);

          // Award points to presenter
          await updatePlayerScore(request.gameId, round.presenterId, PRESENTER_POINTS);
          const presenterPlayer = await redis.hGet(REDIS_KEYS.PLAYERS(request.gameId), round.presenterId);
          if (presenterPlayer && presenterPlayer !== 'true') {
            const presenter = JSON.parse(presenterPlayer);
            await updateLeaderboard(gameState.subredditName, presenter.username, PRESENTER_POINTS, false);
          }

          // Get all updated player scores for round result
          const allPlayers = await getAllPlayers(request.gameId);
          const scores: Record<string, number> = {};
          allPlayers.forEach(player => {
            scores[player.id] = player.score;
          });

          // Create round result with updated scores
          roundResult = {
            roundId: request.roundId,
            winnerId: playerId,
            winnerUsername: currentUsername,
            correctAnswer: round.phrase.text,
            totalGuesses: round.guesses.length,
            roundDuration: round.endTime - round.startTime,
            scores,
          };
        } else {
          // Fallback if game state not found
          roundResult = {
            roundId: request.roundId,
            winnerId: playerId,
            winnerUsername: currentUsername,
            correctAnswer: round.phrase.text,
            totalGuesses: round.guesses.length,
            roundDuration: round.endTime - round.startTime,
            scores: {},
          };
        }
      } catch (scoreError) {
        console.error('Error updating scores:', scoreError);
        // Continue with round ending even if scoring fails
        roundResult = {
          roundId: request.roundId,
          winnerId: playerId,
          winnerUsername: currentUsername,
          correctAnswer: round.phrase.text,
          totalGuesses: round.guesses.length,
          roundDuration: round.endTime - round.startTime,
          scores: {},
        };
      }

      // Clear round timer
      await redis.del(REDIS_KEYS.ROUND_TIMER(request.roundId));
    }

    // Save updated round
    await redis.set(
      REDIS_KEYS.ROUND(request.gameId, request.roundId),
      JSON.stringify(round)
    );
    await redis.expire(REDIS_KEYS.ROUND(request.gameId, request.roundId), REDIS_TTL.GAME_SESSION);

    // Store guess in history for real-time updates
    await redis.zAdd(
      REDIS_KEYS.GUESS_HISTORY(request.roundId),
      { score: Date.now(), member: JSON.stringify(guess) }
    );
    await redis.expire(REDIS_KEYS.GUESS_HISTORY(request.roundId), REDIS_TTL.GUESS_HISTORY);

    // Broadcast guess submitted event
    await broadcastGuessSubmitted(request.gameId, guess);

    // If round ended, broadcast round ended event
    if (roundEnded && roundResult) {
      await broadcastRoundEnded(request.gameId, roundResult);
      await stopRoundTimer(request.roundId);
    }

    return {
      success: true,
      data: {
        guess,
        isCorrect: guess.isCorrect,
        roundEnded,
        ...(roundResult && { roundResult }),
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error submitting guess:', error);
    
    if (error instanceof GameException) {
      throw error;
    }
    
    throw GameException.fromType('SERVER_ERROR', 'Failed to submit guess');
  }
}

// ============================================================================
// ROUND ENDING
// ============================================================================

export async function endRound(request: EndRoundRequest): Promise<ApiResponse<RoundResult>> {
  try {
    // Validate input
    const gameIdValidation = validateGameId(request.gameId);
    if (!gameIdValidation.isValid) {
      throw GameException.fromType('INVALID_INPUT', gameIdValidation.errors.join(', ') || 'Invalid game ID');
    }

    // Get round
    const roundData = await redis.get(REDIS_KEYS.ROUND(request.gameId, request.roundId));
    if (!roundData) {
      throw GameException.fromType('ROUND_NOT_FOUND', 'Round not found');
    }

    const round: Round = JSON.parse(roundData);
    
    if (round.status === 'ended') {
      throw GameException.fromType('ROUND_NOT_ACTIVE', 'Round has already ended');
    }

    // End the round
    round.status = 'ended';
    round.endTime = Date.now();

    // Get current player scores for round result
    let scores: Record<string, number> = {};
    let winnerUsername = '';
    
    try {
      const allPlayers = await getAllPlayers(request.gameId);
      allPlayers.forEach(player => {
        scores[player.id] = player.score;
      });

      // Get winner username if there was a winner
      if (round.winnerId) {
        const winnerPlayer = allPlayers.find(p => p.id === round.winnerId);
        winnerUsername = winnerPlayer?.username || 'Unknown';
      }
    } catch (scoreError) {
      console.error('Error getting player scores:', scoreError);
    }

    // Create round result
    const roundResult: RoundResult = {
      roundId: request.roundId,
      winnerId: round.winnerId || '',
      winnerUsername,
      correctAnswer: round.phrase.text,
      totalGuesses: round.guesses.length,
      roundDuration: round.endTime - round.startTime,
      scores,
    };

    // Save updated round
    await redis.set(
      REDIS_KEYS.ROUND(request.gameId, request.roundId),
      JSON.stringify(round)
    );
    await redis.expire(REDIS_KEYS.ROUND(request.gameId, request.roundId), REDIS_TTL.GAME_SESSION);

    // Stop round timer
    await stopRoundTimer(request.roundId);

    // Broadcast round ended event
    await broadcastRoundEnded(request.gameId, roundResult);

    return {
      success: true,
      data: roundResult,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error ending round:', error);
    
    if (error instanceof GameException) {
      throw error;
    }
    
    throw GameException.fromType('SERVER_ERROR', 'Failed to end round');
  }
}
