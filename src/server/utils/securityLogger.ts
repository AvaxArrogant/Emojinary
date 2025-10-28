// ============================================================================
// SECURITY EVENT LOGGING UTILITY
// ============================================================================

import { Request } from 'express';
import { redis } from '@devvit/web/server';

// ============================================================================
// SECURITY EVENT TYPES
// ============================================================================

export type SecurityEventType = 
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED_ACCESS'
  | 'SUSPICIOUS_ACTIVITY'
  | 'DUPLICATE_GUESS'
  | 'PRESENTER_CHEAT_ATTEMPT'
  | 'MALFORMED_REQUEST'
  | 'CONTENT_VIOLATION'
  | 'REPLAY_ATTACK'
  | 'GAME_ACCESS_VIOLATION';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  clientId: string;
  gameId?: string;
  username?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userAgent?: string;
  ip?: string;
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Logs a security event to Redis for monitoring
 */
export async function logSecurityEvent(
  type: SecurityEventType,
  req: Request,
  details: Record<string, any> = {},
  severity: SecurityEvent['severity'] = 'medium'
): Promise<void> {
  try {
    const event: SecurityEvent = {
      type,
      timestamp: Date.now(),
      clientId: getClientIdentifier(req),
      gameId: req.body?.gameId || req.query?.gameId || req.params?.gameId,
      username: req.body?.username || req.query?.username || req.params?.username,
      details,
      severity,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    };

    // Store in Redis with TTL
    const eventKey = `security_event:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    await redis.set(eventKey, JSON.stringify(event), 24 * 60 * 60); // 24 hours TTL

    // Add to security log index
    const logIndexKey = 'security_events_index';
    await redis.lpush(logIndexKey, eventKey);
    await redis.ltrim(logIndexKey, 0, 999); // Keep last 1000 events
    await redis.expire(logIndexKey, 7 * 24 * 60 * 60); // 7 days TTL

    // Log to console for immediate visibility
    console.warn(`[SECURITY] ${type}: ${JSON.stringify({
      clientId: event.clientId,
      gameId: event.gameId,
      username: event.username,
      severity: event.severity,
      details: event.details,
    })}`);

    // For critical events, also log to a separate high-priority queue
    if (severity === 'critical') {
      const criticalKey = 'critical_security_events';
      await redis.lpush(criticalKey, eventKey);
      await redis.ltrim(criticalKey, 0, 99); // Keep last 100 critical events
      await redis.expire(criticalKey, 30 * 24 * 60 * 60); // 30 days TTL
    }

  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Logs rate limiting events
 */
export async function logRateLimitEvent(
  req: Request,
  limitType: string,
  currentCount: number,
  maxAllowed: number
): Promise<void> {
  await logSecurityEvent('RATE_LIMIT_EXCEEDED', req, {
    limitType,
    currentCount,
    maxAllowed,
    endpoint: req.path,
    method: req.method,
  }, 'medium');
}

/**
 * Logs invalid input attempts
 */
export async function logInvalidInputEvent(
  req: Request,
  validationErrors: string[],
  inputData: Record<string, any>
): Promise<void> {
  await logSecurityEvent('INVALID_INPUT', req, {
    validationErrors,
    inputData: sanitizeForLogging(inputData),
    endpoint: req.path,
    method: req.method,
  }, 'low');
}

/**
 * Logs unauthorized access attempts
 */
export async function logUnauthorizedAccessEvent(
  req: Request,
  attemptedAction: string,
  reason: string
): Promise<void> {
  await logSecurityEvent('UNAUTHORIZED_ACCESS', req, {
    attemptedAction,
    reason,
    endpoint: req.path,
    method: req.method,
  }, 'high');
}

/**
 * Logs suspicious activity patterns
 */
export async function logSuspiciousActivityEvent(
  req: Request,
  activityType: string,
  suspiciousPatterns: string[],
  riskLevel: 'low' | 'medium' | 'high'
): Promise<void> {
  const severity = riskLevel === 'high' ? 'critical' : riskLevel === 'medium' ? 'high' : 'medium';
  
  await logSecurityEvent('SUSPICIOUS_ACTIVITY', req, {
    activityType,
    suspiciousPatterns,
    riskLevel,
    endpoint: req.path,
    method: req.method,
  }, severity);
}

/**
 * Logs cheating attempts
 */
export async function logCheatAttemptEvent(
  req: Request,
  cheatType: 'presenter_guessing' | 'duplicate_guess' | 'invalid_role',
  gameContext: Record<string, any>
): Promise<void> {
  await logSecurityEvent('PRESENTER_CHEAT_ATTEMPT', req, {
    cheatType,
    gameContext: sanitizeForLogging(gameContext),
    endpoint: req.path,
    method: req.method,
  }, 'high');
}

// ============================================================================
// MONITORING AND ALERTING
// ============================================================================

/**
 * Gets recent security events for monitoring
 */
export async function getRecentSecurityEvents(
  limit: number = 50,
  severity?: SecurityEvent['severity']
): Promise<SecurityEvent[]> {
  try {
    const indexKey = 'security_events_index';
    const eventKeys = await redis.lrange(indexKey, 0, limit - 1);
    
    const events: SecurityEvent[] = [];
    
    for (const eventKey of eventKeys) {
      const eventData = await redis.get(eventKey);
      if (eventData) {
        const event: SecurityEvent = JSON.parse(eventData);
        if (!severity || event.severity === severity) {
          events.push(event);
        }
      }
    }
    
    return events;
  } catch (error) {
    console.error('Failed to retrieve security events:', error);
    return [];
  }
}

/**
 * Gets security event statistics
 */
export async function getSecurityEventStats(
  timeRangeMs: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<{
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecurityEvent['severity'], number>;
  topOffenders: Array<{ clientId: string; eventCount: number }>;
}> {
  try {
    const events = await getRecentSecurityEvents(1000);
    const cutoffTime = Date.now() - timeRangeMs;
    const recentEvents = events.filter(e => e.timestamp >= cutoffTime);
    
    const eventsByType: Record<SecurityEventType, number> = {} as any;
    const eventsBySeverity: Record<SecurityEvent['severity'], number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    const clientEventCounts: Record<string, number> = {};
    
    for (const event of recentEvents) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity]++;
      clientEventCounts[event.clientId] = (clientEventCounts[event.clientId] || 0) + 1;
    }
    
    const topOffenders = Object.entries(clientEventCounts)
      .map(([clientId, eventCount]) => ({ clientId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);
    
    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      topOffenders,
    };
  } catch (error) {
    console.error('Failed to get security event stats:', error);
    return {
      totalEvents: 0,
      eventsByType: {} as any,
      eventsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      topOffenders: [],
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getClientIdentifier(req: Request): string {
  const username = req.body?.username || req.query?.username;
  if (username) {
    return `user_${username}`;
  }

  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return `ip_${ip}`;
}

function sanitizeForLogging(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Don't log sensitive information
    if (['password', 'token', 'secret', 'key'].some(sensitive => 
      key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 200) {
      sanitized[key] = value.substring(0, 200) + '...[TRUNCATED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
