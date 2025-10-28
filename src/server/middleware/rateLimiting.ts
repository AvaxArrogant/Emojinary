import { Request, Response, NextFunction } from 'express';
import { redis } from '@devvit/web/server';
import { REDIS_KEYS } from '../../shared/types/redis.js';
import { DEFAULT_GAME_CONFIG } from '../../shared/types/game.js';
import { logRateLimitEvent, logInvalidInputEvent, logCheatAttemptEvent } from '../utils/securityLogger.js';

// ============================================================================
// RATE LIMITING MIDDLEWARE
// ============================================================================

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function createRateLimiter(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Generate rate limit key
      const key = options.keyGenerator ? options.keyGenerator(req) : getDefaultRateLimitKey(req);
      const rateLimitKey = REDIS_KEYS.RATE_LIMIT(key);

      // Get current request count
      const currentCount = await redis.get(rateLimitKey);
      const requestCount = currentCount ? parseInt(currentCount) : 0;

      // Check if limit exceeded
      if (requestCount >= options.maxRequests) {
        // Log rate limit event
        await logRateLimitEvent(req, key, requestCount, options.maxRequests);
        
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Please wait before making another request.',
          timestamp: Date.now(),
          retryAfter: Math.ceil(options.windowMs / 1000),
        });
        return;
      }

      // Increment request count
      if (requestCount === 0) {
        // First request in window - set with expiration
        await redis.set(rateLimitKey, '1');
        await redis.expire(rateLimitKey, Math.ceil(options.windowMs / 1000));
      } else {
        // Increment existing counter
        await redis.incrBy(rateLimitKey, 1);
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': options.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, options.maxRequests - requestCount - 1).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + options.windowMs).toISOString(),
      });

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Don't block requests if rate limiting fails
      next();
    }
  };
}

// ============================================================================
// SPECIFIC RATE LIMITERS
// ============================================================================

// General API rate limiter
export const generalRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  keyGenerator: (req) => `general_${getClientIdentifier(req)}`,
});

// Guess submission rate limiter (1 guess per 3 seconds per player)
export const guessRateLimit = createRateLimiter({
  windowMs: DEFAULT_GAME_CONFIG.rateLimitWindowMs, // 3 seconds
  maxRequests: DEFAULT_GAME_CONFIG.rateLimitMaxRequests, // 1 request
  keyGenerator: (req) => {
    const { gameId, roundId } = req.body;
    const clientId = getClientIdentifier(req);
    return `guess_${gameId}_${roundId}_${clientId}`;
  },
});

// Game creation rate limiter
export const gameCreationRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 3, // 3 games per 5 minutes
  keyGenerator: (req) => `game_creation_${getClientIdentifier(req)}`,
});

// Emoji submission rate limiter
export const emojiSubmissionRateLimit = createRateLimiter({
  windowMs: 30 * 1000, // 30 seconds
  maxRequests: 5, // 5 submissions per 30 seconds (for retries)
  keyGenerator: (req) => {
    const { gameId, roundId } = req.body;
    const clientId = getClientIdentifier(req);
    return `emoji_${gameId}_${roundId}_${clientId}`;
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getClientIdentifier(req: Request): string {
  // Try to get user identifier from various sources
  const username = req.body?.username || req.query?.username;
  if (username) {
    return `user_${username}`;
  }

  // Fallback to IP address (though this might not be available in Devvit)
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return `ip_${ip}`;
}

function getDefaultRateLimitKey(req: Request): string {
  return `${req.method}_${req.path}_${getClientIdentifier(req)}`;
}

// ============================================================================
// ANTI-CHEATING MIDDLEWARE
// ============================================================================

export async function preventPresenterGuessing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Only apply to guess submission endpoints
    if (!req.path.includes('/api/guess/submit')) {
      next();
      return;
    }

    const { gameId, roundId, username } = req.body;
    
    if (!gameId || !roundId) {
      next();
      return;
    }

    // Get round data to check presenter
    const roundData = await redis.get(REDIS_KEYS.ROUND(gameId, roundId));
    if (!roundData) {
      next();
      return;
    }

    const round = JSON.parse(roundData);
    
    // Get player data to check if this user is the presenter
    const playersData = await redis.hGetAll(REDIS_KEYS.PLAYERS(gameId));
    const players = Object.values(playersData)
      .filter(data => data !== 'true')
      .map(data => JSON.parse(data));

    const presenter = players.find(p => p.id === round.presenterId);
    
    if (presenter && presenter.username === username) {
      // Log cheating attempt
      await logCheatAttemptEvent(req, 'presenter_guessing', {
        gameId,
        roundId,
        presenterId: round.presenterId,
        presenterUsername: presenter.username,
      });
      
      res.status(403).json({
        success: false,
        error: 'Presenters cannot submit guesses for their own phrases',
        timestamp: Date.now(),
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Anti-cheating middleware error:', error);
    // Don't block requests if anti-cheating check fails
    next();
  }
}

// ============================================================================
// INPUT SANITIZATION MIDDLEWARE
// ============================================================================

export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid input format',
      timestamp: Date.now(),
    });
  }
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key names to prevent prototype pollution
      const sanitizedKey = sanitizeString(key);
      if (sanitizedKey && !['__proto__', 'constructor', 'prototype'].includes(sanitizedKey)) {
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
}

function sanitizeString(str: string): string {
  if (typeof str !== 'string') {
    return str;
  }

  // Remove null bytes and control characters (except newlines and tabs)
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

// ============================================================================
// COMPREHENSIVE SECURITY MIDDLEWARE
// ============================================================================

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });

  next();
}

export function validateContentLength(maxSize: number = 1024 * 1024) { // 1MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      res.status(413).json({
        success: false,
        error: 'Request payload too large',
        timestamp: Date.now(),
      });
      return;
    }

    next();
  };
}

// ============================================================================
// INPUT VALIDATION MIDDLEWARE
// ============================================================================

export async function validateGameRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { gameId } = req.body || req.params;
  const errors: string[] = [];
  
  if (!gameId) {
    errors.push('gameId is required');
  } else if (typeof gameId !== 'string' || gameId.length < 5 || gameId.length > 50) {
    errors.push('Invalid gameId format');
  }

  if (errors.length > 0) {
    await logInvalidInputEvent(req, errors, { gameId });
    
    res.status(400).json({
      success: false,
      error: errors[0],
      timestamp: Date.now(),
    });
    return;
  }

  next();
}

export async function validateGuessRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { gameId, roundId, guess } = req.body;
  const errors: string[] = [];
  
  if (!gameId || !roundId || !guess) {
    errors.push('gameId, roundId, and guess are required');
  }

  if (guess !== undefined) {
    if (typeof guess !== 'string') {
      errors.push('Guess must be a string');
    } else {
      if (guess.length === 0 || guess.length > DEFAULT_GAME_CONFIG.maxGuessLength) {
        errors.push(`Guess must be between 1 and ${DEFAULT_GAME_CONFIG.maxGuessLength} characters`);
      }

      // Basic content validation (alphanumeric, spaces, and common punctuation)
      const validGuessPattern = /^[a-zA-Z0-9\s\-'.,!?]+$/;
      if (!validGuessPattern.test(guess)) {
        errors.push('Guess contains invalid characters');
      }
    }
  }

  if (errors.length > 0) {
    await logInvalidInputEvent(req, errors, { gameId, roundId, guess: guess?.substring(0, 50) });
    
    res.status(400).json({
      success: false,
      error: errors[0],
      timestamp: Date.now(),
    });
    return;
  }

  next();
}

export function validateEmojiRequest(req: Request, res: Response, next: NextFunction): void {
  const { gameId, roundId, emojiSequence } = req.body;
  
  if (!gameId || !roundId || !emojiSequence) {
    res.status(400).json({
      success: false,
      error: 'gameId, roundId, and emojiSequence are required',
      timestamp: Date.now(),
    });
    return;
  }

  if (!Array.isArray(emojiSequence)) {
    res.status(400).json({
      success: false,
      error: 'emojiSequence must be an array',
      timestamp: Date.now(),
    });
    return;
  }

  if (emojiSequence.length === 0 || emojiSequence.length > DEFAULT_GAME_CONFIG.maxEmojiSequenceLength) {
    res.status(400).json({
      success: false,
      error: `Emoji sequence must contain between 1 and ${DEFAULT_GAME_CONFIG.maxEmojiSequenceLength} emojis`,
      timestamp: Date.now(),
    });
    return;
  }

  // Validate each emoji in the sequence
  for (const emoji of emojiSequence) {
    if (typeof emoji !== 'string' || emoji.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Each emoji must be a non-empty string',
        timestamp: Date.now(),
      });
      return;
    }
  }

  next();
}

export function validateUsernameRequest(req: Request, res: Response, next: NextFunction): void {
  const { username } = req.body || req.query || req.params;
  
  if (!username) {
    res.status(400).json({
      success: false,
      error: 'username is required',
      timestamp: Date.now(),
    });
    return;
  }

  if (typeof username !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Username must be a string',
      timestamp: Date.now(),
    });
    return;
  }

  if (username.length < 3 || username.length > 20) {
    res.status(400).json({
      success: false,
      error: 'Username must be between 3 and 20 characters',
      timestamp: Date.now(),
    });
    return;
  }

  // Reddit username pattern (alphanumeric, underscores, hyphens)
  const validUsernamePattern = /^[a-zA-Z0-9_-]+$/;
  if (!validUsernamePattern.test(username)) {
    res.status(400).json({
      success: false,
      error: 'Username contains invalid characters',
      timestamp: Date.now(),
    });
    return;
  }

  next();
}

// ============================================================================
// ADVANCED ANTI-CHEATING MIDDLEWARE
// ============================================================================

export function validateRoundTiming(req: Request, res: Response, next: NextFunction): void {
  // Add timestamp validation to prevent replay attacks
  const { timestamp } = req.body;
  
  if (timestamp) {
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const timeDiff = Math.abs(now - requestTime);
    
    // Allow requests within 5 minutes of current time
    if (timeDiff > 5 * 60 * 1000) {
      res.status(400).json({
        success: false,
        error: 'Request timestamp is too old or too far in the future',
        timestamp: Date.now(),
      });
      return;
    }
  }

  next();
}

export async function validateGameAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { gameId, username } = req.body || req.query;
    
    if (!gameId || !username) {
      next();
      return;
    }

    // Check if player is actually in the game
    const playersData = await redis.hGetAll(REDIS_KEYS.PLAYERS(gameId));
    const players = Object.values(playersData)
      .filter(data => data !== 'true')
      .map(data => JSON.parse(data));

    const playerExists = players.some(p => p.username === username);
    
    if (!playerExists) {
      res.status(403).json({
        success: false,
        error: 'Player is not part of this game',
        timestamp: Date.now(),
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Game access validation error:', error);
    // Don't block requests if validation fails
    next();
  }
}

export function logSuspiciousActivity(_req: Request, _res: Response, next: NextFunction): void {
  // Log potentially suspicious patterns
  // This is a placeholder for more sophisticated monitoring
  // In a real implementation, you might integrate with monitoring services
  
  next();
}
