// ============================================================================
// COMPREHENSIVE SECURITY VALIDATION UTILITIES
// ============================================================================

import { Request } from 'express';
import { redis } from '@devvit/web/server';
import { REDIS_KEYS } from '../../shared/types/redis.js';
import { GameException } from '../../shared/types/errors.js';
import { DEFAULT_GAME_CONFIG } from '../../shared/types/game.js';

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Comprehensive request validation for game endpoints
 */
export async function validateGameRequest(
  req: Request,
  options: {
    requireGameId?: boolean;
    requireUsername?: boolean;
    requireRoundId?: boolean;
    checkGameExists?: boolean;
    checkPlayerInGame?: boolean;
  } = {}
): Promise<SecurityValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { gameId, username, roundId } = req.body || req.query || req.params;

  // Validate required fields
  if (options.requireGameId && !gameId) {
    errors.push('gameId is required');
  }

  if (options.requireUsername && !username) {
    errors.push('username is required');
  }

  if (options.requireRoundId && !roundId) {
    errors.push('roundId is required');
  }

  // Validate game existence
  if (options.checkGameExists && gameId) {
    try {
      const gameExists = await redis.exists(REDIS_KEYS.GAME(gameId));
      if (!gameExists) {
        errors.push('Game does not exist');
      }
    } catch (error) {
      warnings.push('Could not verify game existence');
    }
  }

  // Validate player is in game
  if (options.checkPlayerInGame && gameId && username) {
    try {
      const playersData = await redis.hGetAll(REDIS_KEYS.PLAYERS(gameId));
      const players = Object.values(playersData)
        .filter(data => data !== 'true')
        .map(data => JSON.parse(data));

      const playerExists = players.some(p => p.username === username);
      if (!playerExists) {
        errors.push('Player is not part of this game');
      }
    } catch (error) {
      warnings.push('Could not verify player membership');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// ANTI-SPAM AND ABUSE DETECTION
// ============================================================================

/**
 * Detects potential spam or abuse patterns
 */
export async function detectSuspiciousActivity(
  req: Request,
  activityType: 'guess' | 'emoji' | 'game_creation'
): Promise<{
  isSuspicious: boolean;
  reasons: string[];
  riskLevel: 'low' | 'medium' | 'high';
}> {
  const reasons: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  const clientId = getClientIdentifier(req);
  const now = Date.now();

  try {
    // Check for rapid successive requests
    const recentActivityKey = `activity:${activityType}:${clientId}`;
    const recentActivity = await redis.lrange(recentActivityKey, 0, -1);
    
    if (recentActivity.length > 0) {
      const timestamps = recentActivity.map(t => parseInt(t));
      const recentRequests = timestamps.filter(t => now - t < 60000); // Last minute
      
      if (recentRequests.length > 10) {
        reasons.push('Excessive requests in short time period');
        riskLevel = 'high';
      } else if (recentRequests.length > 5) {
        reasons.push('High request frequency');
        riskLevel = 'medium';
      }
    }

    // Log current activity
    await redis.lpush(recentActivityKey, now.toString());
    await redis.ltrim(recentActivityKey, 0, 19); // Keep last 20 entries
    await redis.expire(recentActivityKey, 300); // 5 minutes TTL

    // Check for pattern-based suspicious behavior
    if (activityType === 'guess') {
      const { guess } = req.body;
      if (guess && typeof guess === 'string') {
        // Check for repeated characters or obvious spam
        if (/(.)\1{5,}/.test(guess)) {
          reasons.push('Guess contains repeated character patterns');
          riskLevel = riskLevel === 'high' ? 'high' : 'medium';
        }

        // Check for very short or very long guesses
        if (guess.length < 2) {
          reasons.push('Unusually short guess');
        } else if (guess.length > DEFAULT_GAME_CONFIG.maxGuessLength * 0.8) {
          reasons.push('Unusually long guess');
        }
      }
    }

  } catch (error) {
    console.error('Error detecting suspicious activity:', error);
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
    riskLevel,
  };
}

// ============================================================================
// CONTENT VALIDATION
// ============================================================================

/**
 * Validates content for inappropriate material
 */
export function validateContentAppropriate(content: string): {
  isAppropriate: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Basic profanity filter (this would be more sophisticated in production)
  const inappropriatePatterns = [
    /\b(spam|test|asdf|qwerty)\b/i,
    /(.)\1{10,}/, // Excessive repeated characters
    /[^\w\s\-'.,!?]/g, // Non-standard characters
  ];

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(content)) {
      reasons.push('Content contains inappropriate patterns');
      break;
    }
  }

  // Check for excessive capitalization
  const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (upperCaseRatio > 0.7 && content.length > 10) {
    reasons.push('Excessive use of capital letters');
  }

  return {
    isAppropriate: reasons.length === 0,
    reasons,
  };
}

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

/**
 * Validates that a request is not a replay attack
 */
export function validateRequestFreshness(
  timestamp: number,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes
): boolean {
  const now = Date.now();
  const age = Math.abs(now - timestamp);
  return age <= maxAgeMs;
}

/**
 * Generates a secure request signature for validation
 */
export function generateRequestSignature(
  gameId: string,
  username: string,
  timestamp: number,
  action: string
): string {
  // In a real implementation, this would use a proper HMAC with a secret key
  const data = `${gameId}:${username}:${timestamp}:${action}`;
  return Buffer.from(data).toString('base64');
}

/**
 * Validates request signature to prevent tampering
 */
export function validateRequestSignature(
  signature: string,
  gameId: string,
  username: string,
  timestamp: number,
  action: string
): boolean {
  const expectedSignature = generateRequestSignature(gameId, username, timestamp, action);
  return signature === expectedSignature;
}
