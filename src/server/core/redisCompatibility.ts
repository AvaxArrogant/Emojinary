import { RedisOperationLogger, monitoredRedis } from './redisMonitoring.js';
import { 
  isMethodSupported, 
  isMethodUnsupported, 
  getMethodConfig, 
  getMethodSubstitution,
  REDIS_COMPATIBILITY_CONFIG 
} from './redisCompatibilityConfig.js';
import { validateRedisMethod } from './redisCompatibilityValidator.js';

/**
 * Redis Compatibility Layer for Devvit Environment
 * 
 * Handles differences between standard Redis and Devvit's Redis implementation.
 * Provides fallback mechanisms for unsupported Redis methods.
 * Enhanced with comprehensive configuration and validation system.
 */
export class RedisCompatibilityManager {
  private static instance: RedisCompatibilityManager;
  private logger: RedisOperationLogger;

  private constructor() {
    this.logger = RedisOperationLogger.getInstance();
  }

  public static getInstance(): RedisCompatibilityManager {
    if (!RedisCompatibilityManager.instance) {
      RedisCompatibilityManager.instance = new RedisCompatibilityManager();
    }
    return RedisCompatibilityManager.instance;
  }

  /**
   * Check if a Redis method is supported in Devvit (using configuration)
   */
  public isMethodSupported(method: string): boolean {
    return isMethodSupported(method);
  }

  /**
   * Check if a Redis method is known to be unsupported (using configuration)
   */
  public isMethodUnsupported(method: string): boolean {
    return isMethodUnsupported(method);
  }

  /**
   * Validate Redis method with comprehensive compatibility checking
   */
  public validateMethod(method: string, parameters?: any) {
    return validateRedisMethod(method, parameters);
  }

  /**
   * Execute a Redis operation with fallback handling and comprehensive monitoring
   */
  public async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    operationName: string,
    parameters?: any
  ): Promise<T> {
    try {
      const result = await this.logger.wrapOperation(
        operationName,
        'primary_operation',
        operation,
        parameters,
        true
      );
      return result;
    } catch (error) {
      if (this.isCompatibilityError(error)) {
        console.warn(`Redis compatibility issue with ${operationName}, using fallback`);
        this.logCompatibilityIssue(operationName, error);
        
        // Execute fallback with monitoring
        return await this.logger.wrapOperation(
          `${operationName}_fallback`,
          'fallback_operation',
          fallback,
          parameters,
          true
        );
      }
      throw error;
    }
  }

  /**
   * Determine if an error is due to Redis compatibility issues
   */
  private isCompatibilityError(error: any): boolean {
    if (!error || typeof error.message !== 'string') {
      return false;
    }

    const message = error.message.toLowerCase();
    return (
      message.includes('is not a function') ||
      message.includes('not supported') ||
      message.includes('unknown command') ||
      message.includes('zrevrank') ||
      message.includes('zrank')
    );
  }

  /**
   * Log Redis compatibility issues for monitoring with enhanced details
   */
  public logCompatibilityIssue(method: string, error: any): void {
    const compatibilityDetails = {
      method,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: 'devvit',
      isSupported: this.isMethodSupported(method),
      isKnownUnsupported: this.isMethodUnsupported(method),
      recommendation: this.getMethodRecommendation(method),
      errorType: this.categorizeError(error),
    };

    console.error(`Redis Compatibility Issue:`, compatibilityDetails);
    
    // Also log to monitoring system
    this.logger.logOperation({
      operationName: method,
      method: method,
      startTime: Date.now() - 1,
      endTime: Date.now(),
      duration: 1,
      success: false,
      error: error?.message || 'Unknown error',
      compatibility: {
        isSupported: this.isMethodSupported(method),
        fallbackUsed: false,
        compatibilityIssue: error?.message || 'Unknown error',
      },
    });
  }

  /**
   * Get recommendation for unsupported method (using configuration)
   */
  private getMethodRecommendation(method: string): string {
    const methodConfig = getMethodConfig(method);
    const substitution = getMethodSubstitution(method);
    
    if (substitution) {
      return `Use ${substitution.alternativeMethod} with ${substitution.implementationStrategy} strategy. ${substitution.description}`;
    }
    
    if (methodConfig?.alternative) {
      return methodConfig.alternative;
    }
    
    return 'Check Devvit Redis documentation for supported alternatives';
  }

  /**
   * Categorize error type for better monitoring
   */
  private categorizeError(error: any): string {
    if (!error || typeof error.message !== 'string') {
      return 'unknown';
    }

    const message = error.message.toLowerCase();
    if (message.includes('is not a function')) {
      return 'method_not_available';
    }
    if (message.includes('not supported')) {
      return 'method_not_supported';
    }
    if (message.includes('unknown command')) {
      return 'unknown_command';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('connection')) {
      return 'connection_error';
    }
    return 'other';
  }

  /**
   * Validate Redis operation before execution (enhanced with configuration)
   */
  public validateOperation(method: string, parameters?: any): { isValid: boolean; warning?: string; recommendation?: string } {
    const validationResult = this.validateMethod(method, parameters);
    
    if (!validationResult.shouldProceed) {
      return {
        isValid: false,
        warning: `Redis method '${method}' should not be used: ${validationResult.recommendation}`,
        recommendation: validationResult.recommendation,
      };
    }

    if (validationResult.requiresFallback) {
      return {
        isValid: true,
        warning: `Redis method '${method}' requires fallback implementation`,
        recommendation: validationResult.recommendation,
      };
    }

    if (validationResult.validationWarnings.length > 0) {
      const criticalWarnings = validationResult.validationWarnings.filter(w => w.severity === 'critical' || w.severity === 'error');
      if (criticalWarnings.length > 0) {
        return {
          isValid: false,
          warning: criticalWarnings[0].message,
          recommendation: criticalWarnings[0].recommendation,
        };
      }
      
      return {
        isValid: true,
        warning: validationResult.validationWarnings[0].message,
        recommendation: validationResult.validationWarnings[0].recommendation,
      };
    }

    return { isValid: true };
  }
}

/**
 * Alternative Ranking Service using Devvit-compatible Redis methods
 * 
 * Provides ranking functionality without using unsupported methods like zRevRank.
 */
export class AlternativeRankingService {
  private compatibilityManager: RedisCompatibilityManager;
  private logger: RedisOperationLogger;

  constructor() {
    this.compatibilityManager = RedisCompatibilityManager.getInstance();
    this.logger = RedisOperationLogger.getInstance();
  }

  /**
   * Calculate player rank using zRange instead of zRevRank
   */
  public async getPlayerRank(leaderboardKey: string, username: string): Promise<number> {
    try {
      // Log the operation for debugging
      console.log(`AlternativeRankingService: Calculating rank for ${username} using zRange-based algorithm`);
      
      // Validate operation and log compatibility warning
      const validation = this.compatibilityManager.validateOperation('zRevRank');
      if (!validation.isValid) {
        console.warn(`Redis Compatibility: ${validation.warning}`);
        console.log('Using zRange-based alternative ranking calculation');
      }

      // Use zRange-based calculation directly (skip the failing zRevRank attempt)
      const rank = await this.calculateRankWithZRange(leaderboardKey, username);
      
      if (rank > 0) {
        console.log(`Successfully calculated rank ${rank} for ${username} using zRange algorithm`);
      } else {
        console.log(`Player ${username} not found in leaderboard ${leaderboardKey}`);
      }
      
      return rank;
      
    } catch (error) {
      console.error('Error in AlternativeRankingService.getPlayerRank:', error);
      this.compatibilityManager.logCompatibilityIssue('getPlayerRank', error);
      
      // Enhanced fallback with additional logging
      console.warn(`Fallback: Returning rank 0 for ${username} due to error`);
      return 0; // Fallback rank
    }
  }

  /**
   * Calculate rank using zRange (supported method) with comprehensive monitoring
   */
  private async calculateRankWithZRange(leaderboardKey: string, username: string): Promise<number> {
    return await this.logger.wrapOperation(
      'calculateRankWithZRange',
      'zRange',
      async () => {
        console.log(`Fetching leaderboard data from ${leaderboardKey} using zRange`);
        
        // Get all players sorted by score (highest first) using monitored client
        const allPlayers = await monitoredRedis.zRange(leaderboardKey, 0, -1);
        
        console.log(`Retrieved ${allPlayers.length} entries from leaderboard`);
        
        // Find player's position in the sorted list
        for (let i = 0; i < allPlayers.length; i++) {
          const playerData = allPlayers[i];
          
          // Handle both object format {member, score} and string format
          let playerName: string;
          if (typeof playerData === 'object' && playerData.member) {
            playerName = playerData.member;
          } else if (typeof playerData === 'string') {
            playerName = playerData;
          } else {
            console.warn(`Unexpected player data format at index ${i}:`, playerData);
            continue;
          }
          
          if (playerName === username) {
            const rank = i + 1;
            console.log(`Found ${username} at position ${i}, rank ${rank}`);
            return rank; // Convert index to rank (1-based)
          }
        }
        
        console.log(`Player ${username} not found in leaderboard of ${allPlayers.length} players`);
        return 0; // Player not found in leaderboard
      },
      { leaderboardKey, username },
      true
    );
  }

  /**
   * Get leaderboard with ranks calculated using supported methods with comprehensive monitoring
   */
  public async getLeaderboardWithRanks(
    leaderboardKey: string, 
    limit: number
  ): Promise<Array<{ username: string; score: number; rank: number }>> {
    return await this.logger.wrapOperation(
      'getLeaderboardWithRanks',
      'zRange',
      async () => {
        console.log(`Getting leaderboard with ranks from ${leaderboardKey}, limit: ${limit}`);
        
        // Get top players using monitored zRange method (highest scores first)
        const topPlayers = await monitoredRedis.zRange(leaderboardKey, 0, limit - 1);
        
        console.log(`Retrieved ${topPlayers.length} players for ranking calculation`);

        const entries: Array<{ username: string; score: number; rank: number }> = [];
        
        // Process results with enhanced error handling
        for (let i = 0; i < topPlayers.length; i++) {
          const playerData = topPlayers[i];
          
          try {
            let username: string;
            let score: number;
            
            // Handle different data formats
            if (typeof playerData === 'object' && playerData.member && typeof playerData.score === 'number') {
              username = playerData.member;
              score = playerData.score;
            } else if (typeof playerData === 'string') {
              // Handle string format - get score separately using monitored client
              username = playerData;
              const playerScore = await this.getPlayerScore(leaderboardKey, username);
              score = playerScore;
            } else {
              console.warn(`Unexpected player data format at index ${i}:`, playerData);
              continue;
            }
            
            const rank = i + 1;
            entries.push({ username, score, rank });
            
          } catch (playerError) {
            console.error(`Error processing player at index ${i}:`, playerError);
            // Continue processing other players
          }
        }

        console.log(`Successfully processed ${entries.length} leaderboard entries with ranks`);
        return entries;
      },
      { leaderboardKey, limit },
      true
    ).catch(async (error) => {
      console.error('Error getting leaderboard with ranks:', error);
      console.error('Redis operation details:', {
        leaderboardKey,
        limit,
        error: (error as Error)?.message || 'Unknown error'
      });
      
      this.compatibilityManager.logCompatibilityIssue('getLeaderboardWithRanks', error);
      
      // Enhanced fallback with monitoring
      try {
        console.warn('Attempting fallback leaderboard retrieval...');
        const fallbackPlayers = await monitoredRedis.zRange(leaderboardKey, 0, Math.min(limit, 5) - 1);
        
        if (fallbackPlayers.length > 0) {
          console.log(`Fallback retrieved ${fallbackPlayers.length} players`);
          return fallbackPlayers.map((player, index) => ({
            username: typeof player === 'object' ? player.member : player,
            score: typeof player === 'object' ? player.score : 0,
            rank: index + 1
          }));
        }
      } catch (fallbackError) {
        console.error('Fallback leaderboard retrieval also failed:', fallbackError);
      }
      
      return []; // Return empty array as final fallback
    });
  }

  /**
   * Check if a player exists in the leaderboard with monitoring
   */
  public async playerExistsInLeaderboard(leaderboardKey: string, username: string): Promise<boolean> {
    return await this.logger.wrapOperation(
      'playerExistsInLeaderboard',
      'zScore',
      async () => {
        const score = await monitoredRedis.zScore(leaderboardKey, username);
        return score !== null;
      },
      { leaderboardKey, username },
      true
    ).catch((error) => {
      console.error('Error checking player existence:', error);
      return false;
    });
  }

  /**
   * Get player's score from leaderboard with monitoring
   */
  public async getPlayerScore(leaderboardKey: string, username: string): Promise<number> {
    return await this.logger.wrapOperation(
      'getPlayerScore',
      'zScore',
      async () => {
        const score = await monitoredRedis.zScore(leaderboardKey, username);
        return score !== null && score !== undefined ? score : 0;
      },
      { leaderboardKey, username },
      true
    ).catch((error) => {
      console.error('Error getting player score:', error);
      return 0;
    });
  }

  /**
   * Get total number of players in leaderboard with monitoring
   */
  public async getLeaderboardSize(leaderboardKey: string): Promise<number> {
    return await this.logger.wrapOperation(
      'getLeaderboardSize',
      'zCard',
      async () => {
        return await monitoredRedis.zCard(leaderboardKey);
      },
      { leaderboardKey },
      true
    ).catch((error) => {
      console.error('Error getting leaderboard size:', error);
      return 0;
    });
  }
}

/**
 * Error handling service for Redis compatibility issues
 */
export class RedisErrorHandler {
  private compatibilityManager: RedisCompatibilityManager;

  constructor() {
    this.compatibilityManager = RedisCompatibilityManager.getInstance();
  }

  /**
   * Handle Redis errors with appropriate fallback strategies
   */
  public async handleRedisError<T>(
    error: any,
    operation: string,
    fallbackData?: T
  ): Promise<T | null> {
    this.compatibilityManager.logCompatibilityIssue(operation, error);

    // If fallback data is provided, return it
    if (fallbackData !== undefined) {
      console.warn(`Using fallback data for ${operation}`);
      return fallbackData;
    }

    // For ranking operations, return safe defaults
    if (operation.includes('rank') || operation.includes('Rank')) {
      return 0 as T;
    }

    // For leaderboard operations, return empty array
    if (operation.includes('leaderboard') || operation.includes('Leaderboard')) {
      return [] as T;
    }

    return null;
  }

  /**
   * Determine if an operation should be retried
   */
  public shouldRetry(error: any, attemptCount: number, maxAttempts: number = 3): boolean {
    // Don't retry compatibility errors
    if (this.compatibilityManager['isCompatibilityError'](error)) {
      return false;
    }

    // Retry network/temporary errors up to max attempts
    return attemptCount < maxAttempts;
  }
}
