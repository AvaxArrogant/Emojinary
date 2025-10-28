import { Router } from 'express';
import type { GameEvent } from '../../shared/types/events.js';
import { GameException } from '../../shared/types/errors.js';
import { validateGameId, validateUsername } from '../../shared/types/validation.js';
import { 
  getGameEventHistory, 
  registerPlayerConnection, 
  updatePlayerActivity,
  removePlayerConnection,
  getActiveConnections 
} from '../core/realtimeManager.js';

const router = Router();

// ============================================================================
// REAL-TIME EVENT ENDPOINTS
// ============================================================================

/**
 * Subscribe to game events (long-polling endpoint)
 */
router.get('/api/events/:gameId', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { username, lastEventId } = req.query;
    
    // Validate input
    const gameIdValidation = validateGameId(gameId);
    if (!gameIdValidation.isValid) {
      res.status(400).json({
        success: false,
        error: gameIdValidation.errors.join(', '),
        timestamp: Date.now(),
      });
      return;
    }
    
    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required',
        timestamp: Date.now(),
      });
      return;
    }
    
    const usernameValidation = validateUsername(username as string);
    if (!usernameValidation.isValid) {
      res.status(400).json({
        success: false,
        error: usernameValidation.errors.join(', '),
        timestamp: Date.now(),
      });
      return;
    }
    
    // Register player connection
    const playerId = `player_${username}`;
    await registerPlayerConnection(gameId, playerId);
    
    // Set up long-polling
    const timeout = 25000; // 25 seconds (less than typical 30s server timeout)
    const startTime = Date.now();
    
    // Set response headers for long-polling
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Function to check for new events
    const checkForEvents = async (): Promise<GameEvent[]> => {
      try {
        // Get recent events
        const events = await getGameEventHistory(gameId, 10);
        
        // Filter events newer than lastEventId if provided
        if (lastEventId) {
          const lastEventTime = parseInt(lastEventId as string);
          return events.filter(event => 
            (event as any).timestamp > lastEventTime
          );
        }
        
        return events;
      } catch (error) {
        console.error('Error checking for events:', error);
        return [];
      }
    };
    
    // Poll for events
    const pollEvents = async () => {
      const events = await checkForEvents();
      
      if (events.length > 0) {
        // Update player activity
        await updatePlayerActivity(gameId, playerId);
        
        res.json({
          success: true,
          data: {
            events,
            lastEventId: Date.now().toString(),
          },
          timestamp: Date.now(),
        });
        return;
      }
      
      // Check timeout
      if (Date.now() - startTime >= timeout) {
        res.json({
          success: true,
          data: {
            events: [],
            lastEventId: (lastEventId as string) || Date.now().toString(),
          },
          timestamp: Date.now(),
        });
        return;
      }
      
      // Wait and poll again
      setTimeout(pollEvents, 1000);
    };
    
    // Handle client disconnect
    req.on('close', async () => {
      await removePlayerConnection(gameId, playerId);
    });
    
    // Start polling
    pollEvents();
    
  } catch (error) {
    console.error('Error in /api/events:', error);
    
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

/**
 * Get event history for reconnection
 */
router.get('/api/events/:gameId/history', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { username, limit } = req.query;
    
    // Validate input
    const gameIdValidation = validateGameId(gameId);
    if (!gameIdValidation.isValid) {
      res.status(400).json({
        success: false,
        error: gameIdValidation.errors.join(', '),
        timestamp: Date.now(),
      });
      return;
    }
    
    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required',
        timestamp: Date.now(),
      });
      return;
    }
    
    const eventLimit = limit ? Math.min(parseInt(limit as string), 50) : 20;
    const events = await getGameEventHistory(gameId, eventLimit);
    
    res.json({
      success: true,
      data: {
        events,
        lastEventId: Date.now().toString(),
      },
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error('Error in /api/events/history:', error);
    
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

/**
 * Heartbeat endpoint to maintain connection
 */
router.post('/api/heartbeat/:gameId', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { username } = req.body;
    
    // Validate input
    const gameIdValidation = validateGameId(gameId);
    if (!gameIdValidation.isValid) {
      res.status(400).json({
        success: false,
        error: gameIdValidation.errors.join(', '),
        timestamp: Date.now(),
      });
      return;
    }
    
    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required',
        timestamp: Date.now(),
      });
      return;
    }
    
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      res.status(400).json({
        success: false,
        error: usernameValidation.errors.join(', '),
        timestamp: Date.now(),
      });
      return;
    }
    
    // Update player activity
    const playerId = `player_${username}`;
    await updatePlayerActivity(gameId, playerId);
    
    // Get active connections count
    const activeConnections = await getActiveConnections(gameId);
    
    res.json({
      success: true,
      data: {
        activeConnections: Object.keys(activeConnections).length,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error('Error in /api/heartbeat:', error);
    
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

/**
 * Get active connections for a game
 */
router.get('/api/connections/:gameId', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    
    // Validate input
    const gameIdValidation = validateGameId(gameId);
    if (!gameIdValidation.isValid) {
      res.status(400).json({
        success: false,
        error: gameIdValidation.errors.join(', '),
        timestamp: Date.now(),
      });
      return;
    }
    
    const activeConnections = await getActiveConnections(gameId);
    
    res.json({
      success: true,
      data: {
        connections: activeConnections,
        count: Object.keys(activeConnections).length,
      },
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error('Error in /api/connections:', error);
    
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

export default router;
