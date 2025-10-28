import { redis, context } from '@devvit/web/server';
import type {
  GameState,
  Player,
  Round,
  CreateGameRequest,
  CreateGameResponse,
  JoinGameRequest,
  JoinGameResponse,
  StartGameRequest,
  StartGameResponse,
  GameStateResponse,
  ApiResponse,
} from '../../shared/types/api.js';
import { REDIS_KEYS, REDIS_TTL } from '../../shared/types/redis.js';
import { DEFAULT_GAME_CONFIG } from '../../shared/types/game.js';
import { GameException, createGameError } from '../../shared/types/errors.js';
import { validateGameId, validateUsername, validateSubredditName } from '../../shared/types/validation.js';
import { generateId } from '../../shared/utils/helpers.js';
import { 
  broadcastPlayerJoined, 
  broadcastGameStarted,
  registerPlayerConnection 
} from './realtimeManager.js';

// ============================================================================
// GAME CREATION
// ============================================================================

export async function createGame(request: CreateGameRequest): Promise<CreateGameResponse> {
  try {
    // Validate input
    const subredditValidation = validateSubredditName(request.subredditName);
    if (!subredditValidation.isValid) {
      throw new GameException('INVALID_INPUT', subredditValidation.errors[0] || 'Invalid subreddit name');
    }

    // Generate game ID and create initial game state
    const gameId = generateId('game');
    const now = Date.now();
    
    const gameState: GameState = {
      id: gameId,
      subredditName: request.subredditName,
      status: 'lobby',
      currentRound: 0,
      maxRounds: request.maxRounds || DEFAULT_GAME_CONFIG.maxRounds,
      createdAt: now,
      updatedAt: now,
    };

    // Store game state in Redis
    await redis.set(
      REDIS_KEYS.GAME(gameId),
      JSON.stringify(gameState)
    );
    await redis.expire(REDIS_KEYS.GAME(gameId), REDIS_TTL.GAME_SESSION);

    // Initialize empty players hash
    await redis.hSet(REDIS_KEYS.PLAYERS(gameId), 'initialized', 'true');
    await redis.expire(REDIS_KEYS.PLAYERS(gameId), REDIS_TTL.GAME_SESSION);

    // Add to active games list for the subreddit
    await redis.zAdd(
      REDIS_KEYS.ACTIVE_GAMES(request.subredditName),
      { score: now, value: gameId }
    );

    return {
      success: true,
      data: {
        gameId,
        gameState,
      },
      timestamp: now,
    };
  } catch (error) {
    console.error('Error creating game:', error);
    
    if (error instanceof GameException) {
      throw error;
    }
    
    throw new GameException('INTERNAL_ERROR', 'Failed to create game');
  }
}

// ============================================================================
// GAME JOINING
// ============================================================================

export async function joinGame(request: JoinGameRequest): Promise<JoinGameResponse> {
  try {
    // Validate input
    const gameIdValidation = validateGameId(request.gameId);
    if (!gameIdValidation.isValid) {
      throw new GameException('INVALID_INPUT', gameIdValidation.errors[0] || 'Invalid game ID');
    }

    const usernameValidation = validateUsername(request.username);
    if (!usernameValidation.isValid) {
      throw new GameException('INVALID_INPUT', usernameValidation.errors[0] || 'Invalid username');
    }

    // Get game state
    const gameStateData = await redis.get(REDIS_KEYS.GAME(request.gameId));
    if (!gameStateData) {
      throw new GameException('GAME_NOT_FOUND', 'Game not found');
    }

    const gameState: GameState = JSON.parse(gameStateData);
    
    // Check if game is in lobby state
    if (gameState.status !== 'lobby') {
      throw new GameException('GAME_ALREADY_STARTED', 'Cannot join game that has already started');
    }

    // Get current players
    const playersData = await redis.hgetall(REDIS_KEYS.PLAYERS(request.gameId));
    const players: Player[] = Object.values(playersData)
      .filter(data => data !== 'true') // Filter out the 'initialized' marker
      .map(data => JSON.parse(data));

    // Check if player already exists
    const existingPlayer = players.find(p => p.username === request.username);
    if (existingPlayer) {
      // Update existing player as active
      existingPlayer.isActive = true;
      existingPlayer.joinedAt = Date.now();
      
      await redis.hset(
        REDIS_KEYS.PLAYERS(request.gameId),
        existingPlayer.id,
        JSON.stringify(existingPlayer)
      );
    } else {
      // Check player limit
      if (players.length >= DEFAULT_GAME_CONFIG.maxPlayersPerGame) {
        throw new GameException('GAME_FULL', 'Game is full');
      }

      // Create new player
      const playerId = generateId('player');
      const newPlayer: Player = {
        id: playerId,
        username: request.username,
        subredditName: gameState.subredditName,
        score: 0,
        isActive: true,
        joinedAt: Date.now(),
      };

      // Add player to game
      await redis.hSet(
        REDIS_KEYS.PLAYERS(request.gameId),
        playerId,
        JSON.stringify(newPlayer)
      );
      
      players.push(newPlayer);
      
      // Broadcast player joined event
      await broadcastPlayerJoined(request.gameId, newPlayer);
    }

    // Update game state timestamp
    gameState.updatedAt = Date.now();
    await redis.set(
      REDIS_KEYS.GAME(request.gameId),
      JSON.stringify(gameState),
      REDIS_TTL.GAME_SESSION
    );

    // Get current round if exists
    let currentRound: Round | undefined;
    if (gameState.currentRound > 0) {
      const roundData = await redis.get(REDIS_KEYS.ROUND(request.gameId, `round_${gameState.currentRound}`));
      if (roundData) {
        currentRound = JSON.parse(roundData);
      }
    }

    return {
      success: true,
      data: {
        gameState,
        players,
        currentRound,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error joining game:', error);
    
    if (error instanceof GameException) {
      throw error;
    }
    
    throw new GameException('INTERNAL_ERROR', 'Failed to join game');
  }
}

// ============================================================================
// GAME STARTING
// ============================================================================

export async function startGame(request: StartGameRequest): Promise<StartGameResponse> {
  try {
    // Validate input
    const gameIdValidation = validateGameId(request.gameId);
    if (!gameIdValidation.isValid) {
      throw new GameException('INVALID_INPUT', gameIdValidation.error || 'Invalid game ID');
    }

    // Get game state
    const gameStateData = await redis.get(REDIS_KEYS.GAME(request.gameId));
    if (!gameStateData) {
      throw new GameException('GAME_NOT_FOUND', 'Game not found');
    }

    const gameState: GameState = JSON.parse(gameStateData);
    
    // Check if game is in lobby state
    if (gameState.status !== 'lobby') {
      throw new GameException('GAME_ALREADY_STARTED', 'Game has already started');
    }

    // Get current players
    const playersData = await redis.hgetall(REDIS_KEYS.PLAYERS(request.gameId));
    const players: Player[] = Object.values(playersData)
      .filter(data => data !== 'true') // Filter out the 'initialized' marker
      .map(data => JSON.parse(data))
      .filter(player => player.isActive);

    // Check minimum players
    if (players.length < DEFAULT_GAME_CONFIG.minPlayers) {
      throw new GameException('INSUFFICIENT_PLAYERS', `Need at least ${DEFAULT_GAME_CONFIG.minPlayers} players to start`);
    }

    // Update game state to active
    gameState.status = 'active';
    gameState.currentRound = 1;
    gameState.updatedAt = Date.now();

    // Select first presenter (random)
    const firstPresenter = players[Math.floor(Math.random() * players.length)];
    
    // Create first round
    const roundId = generateId('round');
    const firstRound: Round = {
      id: roundId,
      gameId: request.gameId,
      roundNumber: 1,
      presenterId: firstPresenter.id,
      phrase: { id: '', text: '', category: '', difficulty: 'easy' }, // Will be set when presenter selects phrase
      emojiSequence: [],
      guesses: [],
      status: 'waiting',
      startTime: Date.now(),
    };

    // Save updated game state and first round
    await Promise.all([
      redis.set(
        REDIS_KEYS.GAME(request.gameId),
        JSON.stringify(gameState)
      ),
      redis.expire(REDIS_KEYS.GAME(request.gameId), REDIS_TTL.GAME_SESSION),
      redis.set(
        REDIS_KEYS.ROUND(request.gameId, roundId),
        JSON.stringify(firstRound)
      ),
      redis.expire(REDIS_KEYS.ROUND(request.gameId, roundId), REDIS_TTL.GAME_SESSION),
    ]);

    // Broadcast game started event
    await broadcastGameStarted(request.gameId, gameState, firstRound);

    return {
      success: true,
      data: {
        gameState,
        firstRound,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error starting game:', error);
    
    if (error instanceof GameException) {
      throw error;
    }
    
    throw new GameException('INTERNAL_ERROR', 'Failed to start game');
  }
}

// ============================================================================
// GAME STATE RETRIEVAL
// ============================================================================

export async function getGameState(gameId: string, username: string): Promise<GameStateResponse> {
  try {
    // Validate input
    const gameIdValidation = validateGameId(gameId);
    if (!gameIdValidation.isValid) {
      throw new GameException('INVALID_INPUT', gameIdValidation.error || 'Invalid game ID');
    }

    // Get game state
    const gameStateData = await redis.get(REDIS_KEYS.GAME(gameId));
    if (!gameStateData) {
      throw new GameException('GAME_NOT_FOUND', 'Game not found');
    }

    const gameState: GameState = JSON.parse(gameStateData);

    // Get players
    const playersData = await redis.hgetall(REDIS_KEYS.PLAYERS(gameId));
    const players: Player[] = Object.values(playersData)
      .filter(data => data !== 'true') // Filter out the 'initialized' marker
      .map(data => JSON.parse(data));

    // Find current user
    const currentUser = players.find(p => p.username === username);
    if (!currentUser) {
      throw new GameException('PLAYER_NOT_FOUND', 'Player not found in game');
    }

    // Get current round if exists
    let currentRound: Round | undefined;
    if (gameState.currentRound > 0) {
      const roundData = await redis.get(REDIS_KEYS.ROUND(gameId, `round_${gameState.currentRound}`));
      if (roundData) {
        currentRound = JSON.parse(roundData);
      }
    }

    // Determine user role
    const userRole = currentRound && currentRound.presenterId === currentUser.id ? 'presenter' : 'guesser';

    return {
      success: true,
      data: {
        gameState,
        currentRound,
        players,
        userRole,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error getting game state:', error);
    
    if (error instanceof GameException) {
      throw error;
    }
    
    throw new GameException('INTERNAL_ERROR', 'Failed to get game state');
  }
}
