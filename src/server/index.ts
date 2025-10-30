import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, Player } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { getGameState } from './core/gameManager';
import { startRound, submitEmojis, submitGuess, endRound } from './core/roundManager';
import { getLeaderboard, getPlayerRank } from './core/dataManager';
import realtimeEndpoints from './api/realtimeEndpoints.js';
import { GameException } from '../shared/types/errors';
import { REDIS_KEYS } from '../shared/types/redis.js';
import { getRedisMonitoringStats, getRedisHealthStatus } from './core/redisMonitoring.js';
import { getRedisDebugInfo, getRedisPerformanceReport } from './core/redisDebugger.js';
import {
  getRedisHealth,
  getRedisMetrics,
  getRedisCompatibilityReport as getCompatibilityReportEndpoint,
  getRedisAlerts,
  getRedisValidation,
  getRedisPerformance,
  clearRedisCache,
  getRedisConfig,
  getRedisAlertStats,
  acknowledgeRedisAlert,
  resolveRedisAlert,
} from './api/redisHealth.js';
import {
  generalRateLimit,
  guessRateLimit,
  gameCreationRateLimit,
  emojiSubmissionRateLimit,
  preventPresenterGuessing,

  validateGuessRequest,
  validateEmojiRequest,
  validateUsernameRequest,
  securityHeaders,
  validateContentLength,
  validateRoundTiming,
  validateGameAccess,
} from './middleware/rateLimiting';

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(validateContentLength(1024 * 1024)); // 1MB limit

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

// Input sanitization disabled for Devvit compatibility

const router = express.Router();

// Health check endpoint
router.get('/api/health', async (_req, res): Promise<void> => {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now(),
  });
});

// Redis monitoring endpoints
router.get('/api/monitoring/redis/stats', async (_, res): Promise<void> => {
  try {
    const monitoringData = getRedisMonitoringStats();
    res.json({
      success: true,
      data: monitoringData,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting Redis monitoring stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis monitoring stats',
      timestamp: Date.now(),
    });
  }
});

router.get('/api/monitoring/redis/health', async (_, res): Promise<void> => {
  try {
    const healthStatus = getRedisHealthStatus();
    res.json({
      success: true,
      data: healthStatus,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting Redis health status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis health status',
      timestamp: Date.now(),
    });
  }
});

router.get('/api/monitoring/redis/compatibility', async (_, res): Promise<void> => {
  try {
    const monitoringData = getRedisMonitoringStats();
    const compatibilityIssues = monitoringData.stats.compatibilityIssues;
    const recentCompatibilityMetrics = monitoringData.recentMetrics
      .filter(m => m.compatibility.compatibilityIssue)
      .slice(-20); // Last 20 compatibility issues

    res.json({
      success: true,
      data: {
        compatibilityIssues,
        recentIssues: recentCompatibilityMetrics,
        totalIssueCount: Object.values(compatibilityIssues).reduce((sum, count) => sum + count, 0),
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting Redis compatibility info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis compatibility info',
      timestamp: Date.now(),
    });
  }
});

router.get('/api/monitoring/redis/debug', async (_, res): Promise<void> => {
  try {
    const debugInfo = getRedisDebugInfo();
    res.json({
      success: true,
      data: debugInfo,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting Redis debug info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis debug info',
      timestamp: Date.now(),
    });
  }
});

router.get('/api/monitoring/redis/performance', async (_req, res): Promise<void> => {
  try {
    const performanceReport = getRedisPerformanceReport();
    res.json({
      success: true,
      data: performanceReport,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting Redis performance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis performance report',
      timestamp: Date.now(),
    });
  }
});

// New enhanced monitoring endpoints for task 3.2
router.get('/api/monitoring/redis/validation', async (_req, res): Promise<void> => {
  try {
    const { getRedisMethodValidationStats } = await import('./core/redisMonitoring.js');
    const validationStats = getRedisMethodValidationStats();
    res.json({
      success: true,
      data: validationStats,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting Redis method validation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis method validation stats',
      timestamp: Date.now(),
    });
  }
});

router.get('/api/monitoring/redis/compatibility-report', async (_req, res): Promise<void> => {
  try {
    const { getRedisCompatibilityReport } = await import('./core/redisMonitoring.js');
    const compatibilityReport = getRedisCompatibilityReport();
    res.json({
      success: true,
      data: compatibilityReport,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting Redis compatibility report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis compatibility report',
      timestamp: Date.now(),
    });
  }
});

router.post('/api/monitoring/redis/validate-method', async (req, res): Promise<void> => {
  try {
    const { method } = req.body;
    if (!method || typeof method !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Method name is required',
        timestamp: Date.now(),
      });
      return;
    }

    const { validateRedisMethod } = await import('./core/redisMonitoring.js');
    const validation = validateRedisMethod(method);
    res.json({
      success: true,
      data: validation,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error validating Redis method:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate Redis method',
      timestamp: Date.now(),
    });
  }
});

// Enhanced Redis Health Check Endpoints (Task 6.2)
// Comprehensive Redis health status
router.get('/api/redis/health', getRedisHealth);

// Detailed performance metrics
router.get('/api/redis/metrics', getRedisMetrics);

// Comprehensive compatibility report
router.get('/api/redis/compatibility', getCompatibilityReportEndpoint);

// Redis operation alerts
router.get('/api/redis/alerts', getRedisAlerts);

// Method validation statistics
router.get('/api/redis/validation', getRedisValidation);

// Performance analysis
router.get('/api/redis/performance', getRedisPerformance);

// Cache management
router.post('/api/redis/cache/clear', clearRedisCache);

// Configuration information
router.get('/api/redis/config', getRedisConfig);

// Alert management endpoints
router.get('/api/redis/alert-stats', getRedisAlertStats);
router.post('/api/redis/alerts/:alertId/acknowledge', acknowledgeRedisAlert);
router.post('/api/redis/alerts/:alertId/resolve', resolveRedisAlert);

// Emergency reset endpoint
router.post('/api/emergency/reset-game', async (req, res): Promise<void> => {
  try {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        success: false,
        error: 'No post context available',
        timestamp: Date.now(),
      });
      return;
    }

    // Clear all game-related Redis keys
    const keysToDelete = [
      `game:${postId}`,
      `game:${postId}:players`,
      `game:${postId}:round:*`,
      `active_games:*`,
      `lobby:${postId}`,
      `lobby_timer:${postId}`,
      `lobby_timer_sync:${postId}`,
    ];

    for (const keyPattern of keysToDelete) {
      try {
        if (keyPattern.includes('*')) {
          // For wildcard patterns, we'd need to scan and delete
          // For now, just delete the specific keys we know about
          continue;
        }
        await redis.del(keyPattern);
      } catch (error) {
        console.warn(`Failed to delete key ${keyPattern}:`, error);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Game state reset successfully',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error resetting game state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset game state',
      timestamp: Date.now(),
    });
  }
});

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// ============================================================================
// GAME MANAGEMENT ENDPOINTS
// ============================================================================

router.get('/api/game/init', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const subredditName = context.subredditName;
    
    if (!username || !subredditName) {
      res.status(400).json({
        success: false,
        error: 'Unable to get user context',
        timestamp: Date.now(),
      });
      return;
    }

    // Try to find an existing active game for this subreddit
    let activeGame = null;
    let currentRound = null;
    let players: Record<string, Player> = {};
    
    try {
      // Get active game for this subreddit (if exists)
      const activeGameId = await redis.get(`active_game:${subredditName}`);
      if (activeGameId) {
        const gameData = await redis.get(REDIS_KEYS.GAME(activeGameId));
        if (gameData) {
          const game = JSON.parse(gameData);
          if (game.status !== 'ended') {
            activeGame = game;
            
            // Get current round if exists
            if (game.currentRoundId) {
              try {
                const roundData = await redis.get(REDIS_KEYS.ROUND(game.id, game.currentRoundId));
                if (roundData) {
                  currentRound = JSON.parse(roundData);
                }
              } catch (roundError) {
                console.warn(`Failed to get round data for ${game.currentRoundId}:`, roundError);
                // Continue without round data
              }
            }
            
            // Get players using hGetAll with error handling
            try {
              const playersData = await redis.hGetAll(REDIS_KEYS.PLAYERS(game.id));
              for (const [playerId, playerDataStr] of Object.entries(playersData)) {
                if (playerDataStr && playerDataStr !== 'true') {
                  try {
                    const playerData = JSON.parse(playerDataStr);
                    // Ensure player data has all required fields
                    players[playerId] = {
                      id: playerData.id || playerId,
                      username: playerData.username || playerId,
                      subredditName: playerData.subredditName || subredditName,
                      score: playerData.score || 0,
                      isActive: playerData.isActive !== undefined ? playerData.isActive : true,
                      joinedAt: playerData.joinedAt || Date.now(),
                    };
                  } catch (parseError) {
                    console.warn(`Failed to parse player data for ${playerId}:`, parseError);
                    // Skip invalid player data
                  }
                }
              }
            } catch (playersError) {
              console.warn(`Failed to get players data for game ${game.id}:`, playersError);
              // Continue with empty players object
            }
          }
        }
      }
    } catch (gameError) {
      console.warn(`Failed to get active game for subreddit ${subredditName}:`, gameError);
      // Continue to create new game
    }

    // If no active game exists, create one in lobby state
    if (!activeGame) {
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      activeGame = {
        id: gameId,
        subredditName: subredditName,
        status: 'lobby' as const,
        currentRound: 0,
        maxRounds: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      try {
        await redis.set(REDIS_KEYS.GAME(gameId), JSON.stringify(activeGame));
        await redis.set(`active_game:${subredditName}`, gameId);
      } catch (createError) {
        console.error(`Failed to create new game:`, createError);
        res.status(500).json({
          success: false,
          error: 'Failed to create game session',
          timestamp: Date.now(),
        });
        return;
      }
      
      // Initialize empty players object for new game
      players = {};
    }

    // Create current user object with proper typing
    const currentUser: Player = {
      id: username,
      username: username,
      subredditName: subredditName,
      score: 0,
      isActive: true,
      joinedAt: Date.now(),
    };

    // Add current user to players if not already there
    if (activeGame && !players[username]) {
      players[username] = currentUser;
      try {
        await redis.hSet(REDIS_KEYS.PLAYERS(activeGame.id), { [username]: JSON.stringify(currentUser) });
      } catch (playerError) {
        console.warn(`Failed to add player ${username} to game ${activeGame.id}:`, playerError);
        // Continue without persisting player data
      }
    }

    // Get lobby timer state if game is in lobby
    let lobbyTimer = null;
    if (activeGame && activeGame.status === 'lobby') {
      try {
        const { getLobbyTimer } = await import('./core/lobbyTimerManager.js');
        lobbyTimer = await getLobbyTimer(activeGame.id);
        
        // Update game state with current timer
        if (lobbyTimer) {
          activeGame.lobbyTimer = lobbyTimer;
        }
      } catch (timerError) {
        console.warn(`Failed to get lobby timer for game ${activeGame.id}:`, timerError);
      }
    }

    // Determine moderator (first player to join based on joinedAt timestamp)
    let moderatorId: string | null = null;
    if (activeGame && Object.keys(players).length > 0) {
      const sortedPlayers = Object.values(players).sort((a, b) => a.joinedAt - b.joinedAt);
      if (sortedPlayers.length > 0 && sortedPlayers[0]) {
        moderatorId = sortedPlayers[0].id;
        
        // Add moderator flag to game state
        activeGame.moderatorId = moderatorId;
        try {
          await redis.set(REDIS_KEYS.GAME(activeGame.id), JSON.stringify(activeGame));
        } catch (moderatorError) {
          console.warn(`Failed to update moderator for game ${activeGame.id}:`, moderatorError);
          // Continue without persisting moderator data
        }
      }
    }

    // Add explicit moderator identification to player data
    const playersWithModerator: Record<string, Player & { isModerator?: boolean }> = {};
    for (const [playerId, player] of Object.entries(players)) {
      playersWithModerator[playerId] = {
        ...player,
        isModerator: playerId === moderatorId,
      };
    }

    // Final safety check - this should never happen due to our logic above
    if (!activeGame) {
      res.status(500).json({
        success: false,
        error: 'Failed to initialize game state',
        timestamp: Date.now(),
      });
      return;
    }

    res.json({
      success: true,
      gameState: activeGame,
      currentRound: currentRound,
      players: playersWithModerator,
      currentUser: {
        ...currentUser,
        isModerator: currentUser.id === moderatorId,
      },
      lobbyTimer: lobbyTimer,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/game/init:', error);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      if (error.message.includes('Redis')) {
        errorMessage = 'Database connection error';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Data format error';
      } else {
        errorMessage = `Initialization failed: ${error.message}`;
      }
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      timestamp: Date.now(),
    });
  }
});

router.post('/api/game/create', gameCreationRateLimit, async (req, res): Promise<void> => {
  try {
    const { subredditName, maxRounds } = req.body;
    const gameSubreddit = subredditName || context.subredditName;
    
    if (!gameSubreddit) {
      res.status(400).json({
        success: false,
        error: 'Subreddit name is required',
        timestamp: Date.now(),
      });
      return;
    }
    
    // Create new game
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const gameState = {
      id: gameId,
      subredditName: gameSubreddit,
      status: 'lobby',
      currentRound: 0,
      maxRounds: maxRounds || 5,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await redis.set(REDIS_KEYS.GAME(gameId), JSON.stringify(gameState));
    await redis.set(`active_game:${gameSubreddit}`, gameId);
    
    res.json({
      success: true,
      data: {
        gameId,
        gameState,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/game/create:', error);
    
    if (error instanceof GameException) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
      });
    }
  }
});

router.post('/api/game/join', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const subredditName = context.subredditName;
    
    if (!username || !subredditName) {
      res.status(400).json({
        success: false,
        error: 'Unable to get user context',
        timestamp: Date.now(),
      });
      return;
    }

    // Try to find an existing active game for this subreddit
    let activeGame = null;
    
    try {
      // Check if there's an active game for this subreddit
      const activeGameId = await redis.get(`active_game:${subredditName}`);
      if (activeGameId) {
        const gameData = await redis.get(REDIS_KEYS.GAME(activeGameId));
        if (gameData) {
          const game = JSON.parse(gameData);
          if (game.status === 'lobby') {
            activeGame = game;
          }
        }
      }
    } catch (gameError) {
      console.warn(`Failed to get active game for subreddit ${subredditName}:`, gameError);
      // Continue to create new game
    }

    // If no active game exists, create one
    if (!activeGame) {
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      activeGame = {
        id: gameId,
        subredditName: subredditName,
        status: 'lobby' as const,
        currentRound: 0,
        maxRounds: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      try {
        await redis.set(REDIS_KEYS.GAME(gameId), JSON.stringify(activeGame));
        await redis.set(`active_game:${subredditName}`, gameId);
      } catch (createError) {
        console.error(`Failed to create new game:`, createError);
        res.status(500).json({
          success: false,
          error: 'Failed to create game session',
          timestamp: Date.now(),
        });
        return;
      }
    }

    // Get existing players to determine if this user will be the moderator
    let existingPlayers: Record<string, Player> = {};
    try {
      const playersData = await redis.hGetAll(REDIS_KEYS.PLAYERS(activeGame.id));
      for (const [playerId, playerDataStr] of Object.entries(playersData)) {
        if (playerDataStr && playerDataStr !== 'true') {
          try {
            const playerData = JSON.parse(playerDataStr);
            existingPlayers[playerId] = {
              id: playerData.id || playerId,
              username: playerData.username || playerId,
              subredditName: playerData.subredditName || subredditName,
              score: playerData.score || 0,
              isActive: playerData.isActive !== undefined ? playerData.isActive : true,
              joinedAt: playerData.joinedAt || Date.now(),
            };
          } catch (parseError) {
            console.warn(`Failed to parse player data for ${playerId}:`, parseError);
          }
        }
      }
    } catch (playersError) {
      console.warn(`Failed to get existing players for game ${activeGame.id}:`, playersError);
    }

    // Create or update player
    const player: Player = {
      id: username,
      username: username,
      subredditName: subredditName,
      score: 0,
      isActive: true,
      joinedAt: existingPlayers[username]?.joinedAt || Date.now(),
    };

    // Determine if this player should be the moderator (first player to join)
    const isFirstPlayer = Object.keys(existingPlayers).length === 0;
    if (isFirstPlayer) {
      activeGame.moderatorId = username;
      try {
        await redis.set(REDIS_KEYS.GAME(activeGame.id), JSON.stringify(activeGame));
      } catch (moderatorError) {
        console.warn(`Failed to set moderator for game ${activeGame.id}:`, moderatorError);
      }
    }

    // Add moderator flag to player
    player.isModerator = activeGame.moderatorId === username;

    // Store player in the game's player hash
    try {
      await redis.hSet(REDIS_KEYS.PLAYERS(activeGame.id), { [username]: JSON.stringify(player) });
    } catch (playerError) {
      console.warn(`Failed to store player ${username} in game ${activeGame.id}:`, playerError);
      // Continue without persisting player data
    }

    // Handle lobby timer logic for new player join
    let lobbyTimer = null;
    if (activeGame.status === 'lobby') {
      try {
        // Get current player count after adding this player
        const playersData = await redis.hGetAll(REDIS_KEYS.PLAYERS(activeGame.id));
        const playerCount = Object.keys(playersData).filter(key => playersData[key] !== 'true').length;

        const { createLobbyTimer, resetLobbyTimer, getLobbyTimer } = await import('./core/lobbyTimerManager.js');
        
        // Check if timer already exists
        const existingTimer = await getLobbyTimer(activeGame.id);
        
        if (existingTimer) {
          // Reset timer if new player joins during countdown
          lobbyTimer = await resetLobbyTimer(activeGame.id, playerCount);
        } else {
          // Create new timer if minimum players reached
          lobbyTimer = await createLobbyTimer(activeGame.id, playerCount);
        }

        // Update game state with timer
        if (lobbyTimer) {
          activeGame.lobbyTimer = lobbyTimer;
          await redis.set(REDIS_KEYS.GAME(activeGame.id), JSON.stringify(activeGame));
        }
      } catch (timerError) {
        console.warn(`Failed to handle lobby timer for game ${activeGame.id}:`, timerError);
        // Continue without timer functionality
      }
    }

    res.json({
      success: true,
      gameState: activeGame,
      player: player,
      lobbyTimer: lobbyTimer,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/game/join:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      if (error.message.includes('Redis')) {
        errorMessage = 'Database connection error';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Data format error';
      } else {
        errorMessage = `Join game failed: ${error.message}`;
      }
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      timestamp: Date.now(),
    });
  }
});

router.post('/api/game/start', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const subredditName = context.subredditName;
    
    if (!username || !subredditName) {
      res.status(400).json({
        success: false,
        error: 'Unable to get user context',
        timestamp: Date.now(),
      });
      return;
    }

    // Find the active game for this subreddit
    let activeGame = null;
    
    try {
      // Check if there's an active game for this subreddit
      const activeGameId = await redis.get(`active_game:${subredditName}`);
      if (activeGameId) {
        const gameData = await redis.get(REDIS_KEYS.GAME(activeGameId));
        if (gameData) {
          const game = JSON.parse(gameData);
          if (game.status === 'lobby') {
            activeGame = game;
          }
        }
      }
    } catch (gameError) {
      console.warn(`Failed to get active game for subreddit ${subredditName}:`, gameError);
    }

    if (!activeGame) {
      res.status(404).json({
        success: false,
        error: 'No active game found to start',
        timestamp: Date.now(),
      });
      return;
    }

    // Check if user is the moderator
    if (activeGame.moderatorId !== username) {
      res.status(403).json({
        success: false,
        error: 'Only the game moderator can start the game',
        timestamp: Date.now(),
      });
      return;
    }

    // Check if user is in the game
    let playerData = null;
    try {
      const playerDataStr = await redis.hGet(REDIS_KEYS.PLAYERS(activeGame.id), username);
      if (playerDataStr) {
        playerData = JSON.parse(playerDataStr);
      }
    } catch (playerError) {
      console.warn(`Failed to get player data for ${username}:`, playerError);
    }

    if (!playerData) {
      res.status(403).json({
        success: false,
        error: 'You must join the game before starting it',
        timestamp: Date.now(),
      });
      return;
    }

    // Check minimum player count
    try {
      const playersData = await redis.hGetAll(REDIS_KEYS.PLAYERS(activeGame.id));
      const playerCount = Object.keys(playersData).filter(key => playersData[key] !== 'true').length;
      
      if (playerCount < 2) {
        res.status(400).json({
          success: false,
          error: 'At least 2 players are required to start the game',
          timestamp: Date.now(),
        });
        return;
      }
    } catch (countError) {
      console.warn(`Failed to check player count for game ${activeGame.id}:`, countError);
      // Continue without player count validation
    }

    // Update game status to active
    activeGame.status = 'active';
    activeGame.currentRound = 1;
    activeGame.updatedAt = Date.now();

    // Stop lobby timer when manually started
    try {
      const { stopLobbyTimer } = await import('./core/lobbyTimerManager.js');
      await stopLobbyTimer(activeGame.id);
      activeGame.lobbyTimer = undefined;
    } catch (timerError) {
      console.warn(`Failed to stop lobby timer for manually started game ${activeGame.id}:`, timerError);
    }

    // Start the first round
    const round = await startRound(activeGame.id, 1);
    
    // Store the current round ID in the game state
    activeGame.currentRoundId = round.id;
    
    await redis.set(REDIS_KEYS.GAME(activeGame.id), JSON.stringify(activeGame));

    res.json({
      success: true,
      gameState: activeGame,
      round: round,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/game/start:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    });
  }
});

router.get('/api/game/state/:gameId', validateUsernameRequest, async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { username } = req.query;
    
    if (!gameId || !username) {
      res.status(400).json({
        success: false,
        error: 'gameId and username are required',
        timestamp: Date.now(),
      });
      return;
    }
    
    const response = await getGameState(gameId, username as string);
    res.json(response);
  } catch (error) {
    console.error('Error in /api/game/state:', error);
    
    if (error instanceof GameException) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
      });
    }
  }
});

router.post('/api/game/leave', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const subredditName = context.subredditName;
    
    if (!username || !subredditName) {
      res.status(400).json({
        success: false,
        error: 'Unable to get user context',
        timestamp: Date.now(),
      });
      return;
    }

    // Find the user's active game using the subreddit's active game
    let userGame = null;
    
    // Get active game for this subreddit
    const activeGameId = await redis.get(`active_game:${subredditName}`);
    if (activeGameId) {
      const gameData = await redis.get(REDIS_KEYS.GAME(activeGameId));
      if (gameData) {
        const game = JSON.parse(gameData);
        if (game.status !== 'ended') {
          // Check if user is in this game
          const playerData = await redis.hGet(REDIS_KEYS.PLAYERS(game.id), username);
          if (playerData) {
            userGame = game;
          }
        }
      }
    }

    if (userGame) {
      // Check if leaving player is the moderator
      const isLeavingPlayerModerator = userGame.moderatorId === username;
      
      // Remove player from game
      await redis.hDel(REDIS_KEYS.PLAYERS(userGame.id), [username]);
      
      // Get remaining players
      const playersData = await redis.hGetAll(REDIS_KEYS.PLAYERS(userGame.id));
      const remainingPlayers = Object.keys(playersData).filter(key => playersData[key] !== 'true');
      
      // Handle moderator transfer if the leaving player was the moderator
      if (isLeavingPlayerModerator && remainingPlayers.length > 0) {
        try {
          // Parse remaining player data to find the next moderator (earliest join time)
          const remainingPlayerObjects = [];
          for (const playerId of remainingPlayers) {
            const playerDataStr = playersData[playerId];
            if (playerDataStr && playerDataStr !== 'true') {
              try {
                const playerData = JSON.parse(playerDataStr);
                remainingPlayerObjects.push({
                  id: playerData.id || playerId,
                  username: playerData.username || playerId,
                  joinedAt: playerData.joinedAt || Date.now(),
                  ...playerData
                });
              } catch (parseError) {
                console.warn(`Failed to parse player data for ${playerId} during moderator transfer:`, parseError);
              }
            }
          }
          
          if (remainingPlayerObjects.length > 0) {
            // Sort by join time to find the earliest player
            remainingPlayerObjects.sort((a, b) => a.joinedAt - b.joinedAt);
            const newModerator = remainingPlayerObjects[0];
            
            // Update game state with new moderator
            userGame.moderatorId = newModerator.id;
            
            // Update the new moderator's player data with moderator flag
            
            // Remove moderator flag from all other players and update the new moderator
            for (const player of remainingPlayerObjects) {
              const updatedPlayerData = {
                ...player,
                isModerator: player.id === newModerator.id
              };
              await redis.hSet(REDIS_KEYS.PLAYERS(userGame.id), { 
                [player.id]: JSON.stringify(updatedPlayerData) 
              });
            }
            
            console.log(`Moderator transferred from ${username} to ${newModerator.id} in game ${userGame.id}`);
          }
        } catch (moderatorTransferError) {
          console.error(`Failed to transfer moderator in game ${userGame.id}:`, moderatorTransferError);
          // Continue without moderator transfer - game will still function
        }
      }
      
      // Handle lobby timer logic when player leaves
      if (userGame.status === 'lobby') {
        try {
          const { LOBBY_TIMER_CONFIG } = await import('../shared/types/game.js');
          const { stopLobbyTimer, createLobbyTimer } = await import('./core/lobbyTimerManager.js');
          
          if (remainingPlayers.length < LOBBY_TIMER_CONFIG.MIN_PLAYERS_FOR_TIMER) {
            // Stop timer if below minimum players
            await stopLobbyTimer(userGame.id);
            userGame.lobbyTimer = undefined;
          } else {
            // Keep timer running with remaining players
            const timer = await createLobbyTimer(userGame.id, remainingPlayers.length);
            userGame.lobbyTimer = timer;
          }
          
          await redis.set(REDIS_KEYS.GAME(userGame.id), JSON.stringify(userGame));
        } catch (timerError) {
          console.warn(`Failed to handle lobby timer after player leave for game ${userGame.id}:`, timerError);
        }
      }
      
      // If no players left, end the game
      if (remainingPlayers.length === 0) {
        userGame.status = 'ended';
        userGame.updatedAt = Date.now();
        await redis.set(REDIS_KEYS.GAME(userGame.id), JSON.stringify(userGame));
        
        // Clear the active game reference
        await redis.del(`active_game:${subredditName}`);
        
        // Clean up lobby timer
        try {
          const { stopLobbyTimer } = await import('./core/lobbyTimerManager.js');
          await stopLobbyTimer(userGame.id);
        } catch (timerError) {
          console.warn(`Failed to clean up lobby timer for ended game ${userGame.id}:`, timerError);
        }
      }
    }

    res.json({
      success: true,
      message: 'Successfully left the game',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/game/leave:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// ROUND MANAGEMENT ENDPOINTS
// ============================================================================

router.post('/api/round/start', async (req, res): Promise<void> => {
  try {
    const { gameId, roundNumber } = req.body;
    
    if (!gameId || !roundNumber) {
      res.status(400).json({
        success: false,
        error: 'gameId and roundNumber are required',
        timestamp: Date.now(),
      });
      return;
    }
    
    const round = await startRound(gameId, roundNumber);
    res.json({
      success: true,
      data: { round },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/round/start:', error);
    
    if (error instanceof GameException) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
      });
    }
  }
});

router.post('/api/round/end', async (req, res): Promise<void> => {
  try {
    const { gameId, roundId } = req.body;
    
    if (!gameId || !roundId) {
      res.status(400).json({
        success: false,
        error: 'gameId and roundId are required',
        timestamp: Date.now(),
      });
      return;
    }
    
    const response = await endRound({ gameId, roundId });
    res.json(response);
  } catch (error) {
    console.error('Error in /api/round/end:', error);
    
    if (error instanceof GameException) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
      });
    }
  }
});

router.post('/api/game/next-round', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.body;
    
    if (!gameId) {
      res.status(400).json({
        success: false,
        error: 'gameId is required',
        timestamp: Date.now(),
      });
      return;
    }
    
    // Get current game state to determine next round number
    const gameStateData = await redis.get(REDIS_KEYS.GAME(gameId));
    if (!gameStateData) {
      res.status(404).json({
        success: false,
        error: 'Game not found',
        timestamp: Date.now(),
      });
      return;
    }
    
    const gameState = JSON.parse(gameStateData);
    const nextRoundNumber = gameState.currentRound + 1;
    
    // Check if game is complete
    if (nextRoundNumber > gameState.maxRounds) {
      res.status(400).json({
        success: false,
        error: 'Game is already complete',
        timestamp: Date.now(),
      });
      return;
    }
    
    // Update game state with new round number
    gameState.currentRound = nextRoundNumber;
    gameState.updatedAt = Date.now();
    
    await redis.set(REDIS_KEYS.GAME(gameId), JSON.stringify(gameState));
    
    // Start the next round
    const round = await startRound(gameId, nextRoundNumber);
    
    res.json({
      success: true,
      data: { 
        gameState,
        round 
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/game/next-round:', error);
    
    if (error instanceof GameException) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
      });
    }
  }
});

router.post('/api/emojis/submit', emojiSubmissionRateLimit, validateEmojiRequest, validateGameAccess, validateRoundTiming, async (req, res): Promise<void> => {
  try {
    const { gameId, roundId, emojiSequence } = req.body;
    
    const response = await submitEmojis({ gameId, roundId, emojiSequence });
    res.json(response);
  } catch (error) {
    console.error('Error in /api/emojis/submit:', error);
    
    if (error instanceof GameException) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
      });
    }
  }
});

router.post('/api/guess/submit', guessRateLimit, async (req, res, next) => { await validateGuessRequest(req, res, next); }, preventPresenterGuessing, validateGameAccess, validateRoundTiming, async (req, res): Promise<void> => {
  try {
    const { gameId, roundId, guess } = req.body;
    
    // Get current username for scoring
    const username = await reddit.getCurrentUsername();
    
    const response = await submitGuess({ gameId, roundId, guess }, username || undefined);
    res.json(response);
  } catch (error) {
    console.error('Error in /api/guess/submit:', error);
    
    if (error instanceof GameException) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
      });
    }
  }
});

// ============================================================================
// DATA PERSISTENCE ENDPOINTS
// ============================================================================

router.get('/api/leaderboard/:subredditName', async (req, res): Promise<void> => {
  try {
    const { subredditName } = req.params;
    const { username } = req.query;
    
    console.log('Leaderboard request:', { subredditName, username });
    
    if (!subredditName) {
      console.log('Missing subredditName in leaderboard request');
      res.status(400).json({
        success: false,
        error: 'subredditName is required',
        timestamp: Date.now(),
      });
      return;
    }
    
    const leaderboardLimit = 10;
    
    // Get leaderboard with enhanced error handling
    const response = await getLeaderboard(subredditName, leaderboardLimit);
    
    // If username is provided, get their rank with error handling
    if (username && response.success && response.data) {
      try {
        const userRank = await getPlayerRank(subredditName, username as string);
        response.data.currentUserRank = userRank;
      } catch (rankError) {
        console.warn('Failed to get user rank, continuing with leaderboard data:', rankError);
        // Don't fail the entire request if rank calculation fails
        response.data.currentUserRank = 0;
        // Add compatibility issue indicator
        (response as any).compatibilityIssue = {
          unsupportedMethod: 'getPlayerRank',
          alternativeUsed: 'fallback_rank'
        };
      }
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error in /api/leaderboard:', error);
    
    if (error instanceof GameException) {
      res.status(400).json({
        success: false,
        error: error.gameError.message,
        timestamp: Date.now(),
      });
    } else {
      // For Redis compatibility errors, return graceful fallback
      console.warn('Returning fallback leaderboard due to Redis compatibility issue');
      const { subredditName } = req.params;
      res.status(200).json({
        success: true,
        data: {
          players: [],
          currentUserRank: 0,
          totalPlayers: 0,
          subredditName: subredditName || 'unknown',
        },
        fallbackUsed: true,
        compatibilityIssue: {
          unsupportedMethod: 'redis_operations',
          alternativeUsed: 'empty_leaderboard'
        },
        timestamp: Date.now(),
      });
    }
  }
});

router.get('/api/player/rank/:subredditName/:username', async (req, res): Promise<void> => {
  try {
    const { subredditName, username } = req.params;
    
    if (!subredditName || !username) {
      res.status(400).json({
        success: false,
        error: 'subredditName and username are required',
        timestamp: Date.now(),
      });
      return;
    }
    
    const rank = await getPlayerRank(subredditName, username);
    res.json({
      success: true,
      data: { rank },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/player/rank:', error);
    
    if (error instanceof GameException) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
      });
    }
  }
});

// Apply general rate limiting to all API routes
app.use('/api', generalRateLimit);

// Use router middleware
app.use(router);

// ============================================================================
// LOBBY TIMER ENDPOINTS
// ============================================================================

router.get('/api/lobby/timer/:gameId', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      res.status(400).json({
        success: false,
        error: 'gameId is required',
        timestamp: Date.now(),
      });
      return;
    }

    const { getLobbyTimerSyncData } = await import('./core/lobbyTimerManager.js');
    const timerState = await getLobbyTimerSyncData(gameId);

    res.json({
      success: true,
      data: {
        timer: timerState,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/lobby/timer:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    });
  }
});

router.post('/api/lobby/timer/:gameId/sync', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { clientTime } = req.body;
    
    if (!gameId) {
      res.status(400).json({
        success: false,
        error: 'gameId is required',
        timestamp: Date.now(),
      });
      return;
    }

    const { getLobbyTimerSyncData } = await import('./core/lobbyTimerManager.js');
    const timerState = await getLobbyTimerSyncData(gameId);

    const serverTime = Date.now();
    const timeDrift = clientTime ? serverTime - clientTime : 0;

    res.json({
      success: true,
      data: {
        timer: timerState,
        serverTime,
        timeDrift,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/lobby/timer/sync:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    });
  }
});

router.post('/api/lobby/timer/:gameId/reset', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      res.status(400).json({
        success: false,
        error: 'gameId is required',
        timestamp: Date.now(),
      });
      return;
    }

    // Get current player count
    const playersData = await redis.hGetAll(REDIS_KEYS.PLAYERS(gameId));
    const playerCount = Object.keys(playersData).filter(key => playersData[key] !== 'true').length;

    const { resetLobbyTimer } = await import('./core/lobbyTimerManager.js');
    const timer = await resetLobbyTimer(gameId, playerCount);

    res.json({
      success: true,
      data: {
        timer,
        playerCount,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/lobby/timer/reset:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    });
  }
});

router.post('/api/lobby/timer/:gameId/check-auto-start', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      res.status(400).json({
        success: false,
        error: 'gameId is required',
        timestamp: Date.now(),
      });
      return;
    }

    const { triggerAutoGameStart } = await import('./core/lobbyTimerManager.js');
    const gameStarted = await triggerAutoGameStart(gameId);

    if (gameStarted) {
      // Get updated game state
      const gameData = await redis.get(REDIS_KEYS.GAME(gameId));
      const game = gameData ? JSON.parse(gameData) : null;

      res.json({
        success: true,
        data: {
          gameStarted: true,
          gameState: game,
        },
        timestamp: Date.now(),
      });
    } else {
      res.json({
        success: true,
        data: {
          gameStarted: false,
        },
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error('Error in /api/lobby/timer/check-auto-start:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// REAL-TIME EVENT ENDPOINTS
// ============================================================================

router.get('/api/events/:gameId', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { username, lastEventId } = req.query;
    
    if (!gameId || !username) {
      res.status(400).json({
        success: false,
        error: 'gameId and username are required',
        timestamp: Date.now(),
      });
      return;
    }

    // For now, return empty events array since we don't have real-time events implemented
    res.json({
      success: true,
      data: {
        events: [],
        lastEventId: lastEventId || Date.now().toString(),
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/events:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    });
  }
});

router.get('/api/events/:gameId/history', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { username, limit } = req.query;
    
    if (!gameId || !username) {
      res.status(400).json({
        success: false,
        error: 'gameId and username are required',
        timestamp: Date.now(),
      });
      return;
    }

    // For now, return empty events array since we don't have event history implemented
    res.json({
      success: true,
      data: {
        events: [],
        lastEventId: Date.now().toString(),
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/events/history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    });
  }
});

router.post('/api/heartbeat/:gameId', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { username } = req.body;
    
    if (!gameId || !username) {
      res.status(400).json({
        success: false,
        error: 'gameId and username are required',
        timestamp: Date.now(),
      });
      return;
    }

    // Simple heartbeat response
    res.json({
      success: true,
      data: {
        gameId,
        username,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error in /api/heartbeat:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    });
  }
});

// Use real-time endpoints
app.use(realtimeEndpoints);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
