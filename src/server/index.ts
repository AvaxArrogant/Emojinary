import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { createGame, joinGame, startGame, getGameState } from './core/gameManager';
import { startRound, submitEmojis, submitGuess, endRound } from './core/roundManager';
import { getLeaderboard, getPlayerRank } from './core/dataManager';
import realtimeEndpoints from './api/realtimeEndpoints.js';
import { GameException } from '../shared/types/errors';
import {
  generalRateLimit,
  guessRateLimit,
  gameCreationRateLimit,
  emojiSubmissionRateLimit,
  preventPresenterGuessing,
  validateGameRequest,
  validateGuessRequest,
  validateEmojiRequest,
  validateUsernameRequest,
  sanitizeInput,
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

// Input sanitization
app.use(sanitizeInput);

const router = express.Router();

// Health check endpoint
router.get('/api/health', async (_req, res): Promise<void> => {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now(),
  });
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

router.post('/api/game/create', gameCreationRateLimit, async (req, res): Promise<void> => {
  try {
    const { subredditName, maxRounds } = req.body;
    
    const response = await createGame({
      subredditName: subredditName || context.subredditName,
      maxRounds,
    });
    
    res.json(response);
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

router.post('/api/game/join', async (req, res, next) => { await validateGameRequest(req, res, next); }, validateUsernameRequest, async (req, res): Promise<void> => {
  try {
    const { gameId, username } = req.body;
    
    const response = await joinGame({ gameId, username });
    res.json(response);
  } catch (error) {
    console.error('Error in /api/game/join:', error);
    
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

router.post('/api/game/start', async (req, res, next) => { await validateGameRequest(req, res, next); }, async (req, res): Promise<void> => {
  try {
    const { gameId } = req.body;
    
    const response = await startGame({ gameId });
    res.json(response);
  } catch (error) {
    console.error('Error in /api/game/start:', error);
    
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
    const { limit, username } = req.query;
    
    if (!subredditName) {
      res.status(400).json({
        success: false,
        error: 'subredditName is required',
        timestamp: Date.now(),
      });
      return;
    }
    
    const leaderboardLimit = limit ? parseInt(limit as string) : 10;
    const response = await getLeaderboard(subredditName, leaderboardLimit);
    
    // If username is provided, get their rank
    if (username && response.success && response.data) {
      const userRank = await getPlayerRank(subredditName, username as string);
      response.data.currentUserRank = userRank;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error in /api/leaderboard:', error);
    
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

// Use real-time endpoints
app.use(realtimeEndpoints);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
