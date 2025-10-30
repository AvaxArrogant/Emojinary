import { redis } from '@devvit/web/server';

/**
 * Redis Operation Monitoring and Logging Service
 * 
 * Provides comprehensive logging, performance tracking, and error monitoring
 * for all Redis operations in the Devvit environment.
 */

export interface RedisOperationMetrics {
  operationName: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string | undefined;
  parameters?: any;
  result?: any;
  compatibility: {
    isSupported: boolean;
    fallbackUsed: boolean;
    compatibilityIssue?: string | undefined;
  };
}

export interface RedisPerformanceStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  operationCounts: Record<string, number>;
  errorCounts: Record<string, number>;
  compatibilityIssues: Record<string, number>;
  lastUpdated: number;
  alertsTriggered: number;
  criticalFailures: number;
  performanceAlerts: number;
}

export class RedisOperationLogger {
  private static instance: RedisOperationLogger;
  private metrics: RedisOperationMetrics[] = [];
  private performanceStats: RedisPerformanceStats;
  private readonly maxMetricsHistory = 1000; // Keep last 1000 operations
  private readonly statsUpdateInterval = 60000; // Update stats every minute
  
  // Redis method validation
  private readonly supportedMethods = new Set([
    'get', 'set', 'hGet', 'hSet', 'hGetAll', 'hDel',
    'zAdd', 'zRange', 'zRangeByScore', 'zScore', 'zCard', 'zRem',
    'incrBy', 'expire', 'del', 'exists'
  ]);

  private readonly unsupportedMethods = new Set([
    'zRevRank', 'zRank', 'zRevRange', 'zCount'
  ]);

  private constructor() {
    this.performanceStats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      operationCounts: {},
      errorCounts: {},
      compatibilityIssues: {},
      lastUpdated: Date.now(),
      alertsTriggered: 0,
      criticalFailures: 0,
      performanceAlerts: 0,
    };

    // Start periodic stats update
    this.startPeriodicStatsUpdate();
  }

  public static getInstance(): RedisOperationLogger {
    if (!RedisOperationLogger.instance) {
      RedisOperationLogger.instance = new RedisOperationLogger();
    }
    return RedisOperationLogger.instance;
  }

  /**
   * Log a Redis operation with comprehensive metrics
   */
  public logOperation(metrics: RedisOperationMetrics): void {
    // Add timestamp if not provided
    if (!metrics.endTime) {
      metrics.endTime = Date.now();
    }
    if (!metrics.duration) {
      metrics.duration = metrics.endTime - metrics.startTime;
    }

    // Store metrics
    this.metrics.push(metrics);

    // Maintain metrics history limit
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Update performance stats
    this.updatePerformanceStats(metrics);

    // Log to console with appropriate level
    this.logToConsole(metrics);

    // Log compatibility issues separately
    if (metrics.compatibility.compatibilityIssue) {
      this.logCompatibilityIssue(metrics);
    }

    // Check for alerts and critical issues
    this.checkForAlerts(metrics);

    // Log detailed operation information for debugging
    this.logDetailedOperation(metrics);
  }

  /**
   * Create a Redis operation wrapper that automatically logs metrics
   */
  public async wrapOperation<T>(
    operationName: string,
    method: string,
    operation: () => Promise<T>,
    parameters?: any,
    isSupported: boolean = true
  ): Promise<T> {
    const startTime = Date.now();
    let result: T;
    let error: string | undefined;
    let success = false;
    let fallbackUsed = false;

    try {
      result = await operation();
      success = true;
      return result;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      
      // Check if this is a compatibility error
      const isCompatibilityError = this.isCompatibilityError(err);
      if (isCompatibilityError) {
        fallbackUsed = true;
      }
      
      throw err;
    } finally {
      const endTime = Date.now();
      
      this.logOperation({
        operationName,
        method,
        startTime,
        endTime,
        duration: endTime - startTime,
        success,
        error,
        parameters: this.sanitizeParameters(parameters),
        result: success ? this.sanitizeResult(result!) : undefined,
        compatibility: {
          isSupported,
          fallbackUsed,
          ...(error && (this as RedisOperationLogger).isCompatibilityError({ message: error }) ? { compatibilityIssue: error } : {}),
        },
      });
    }
  }

  /**
   * Get current performance statistics
   */
  public getPerformanceStats(): RedisPerformanceStats {
    return { ...this.performanceStats };
  }

  /**
   * Get recent operation metrics
   */
  public getRecentMetrics(limit: number = 100): RedisOperationMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get metrics for a specific operation
   */
  public getOperationMetrics(operationName: string, limit: number = 50): RedisOperationMetrics[] {
    return this.metrics
      .filter(m => m.operationName === operationName)
      .slice(-limit);
  }

  /**
   * Get error rate for a specific operation
   */
  public getOperationErrorRate(operationName: string): number {
    const operationMetrics = this.metrics.filter(m => m.operationName === operationName);
    if (operationMetrics.length === 0) return 0;
    
    const errorCount = operationMetrics.filter(m => !m.success).length;
    return (errorCount / operationMetrics.length) * 100;
  }

  /**
   * Get compatibility issues summary
   */
  public getCompatibilityIssues(): Record<string, number> {
    return { ...this.performanceStats.compatibilityIssues };
  }

  /**
   * Check if Redis operations are healthy
   */
  public getHealthStatus(): {
    isHealthy: boolean;
    errorRate: number;
    averageResponseTime: number;
    compatibilityIssueCount: number;
    recommendations: string[];
  } {
    const errorRate = this.performanceStats.totalOperations > 0 
      ? (this.performanceStats.failedOperations / this.performanceStats.totalOperations) * 100 
      : 0;
    
    const compatibilityIssueCount = Object.values(this.performanceStats.compatibilityIssues)
      .reduce((sum, count) => sum + count, 0);
    
    const recommendations: string[] = [];
    
    // Health thresholds
    const isHealthy = errorRate < 10 && this.performanceStats.averageResponseTime < 1000;
    
    if (errorRate >= 10) {
      recommendations.push(`High error rate (${errorRate.toFixed(1)}%) - investigate Redis connectivity`);
    }
    
    if (this.performanceStats.averageResponseTime >= 1000) {
      recommendations.push(`Slow response times (${this.performanceStats.averageResponseTime}ms) - optimize queries`);
    }
    
    if (compatibilityIssueCount > 0) {
      recommendations.push(`${compatibilityIssueCount} compatibility issues detected - review unsupported methods`);
    }

    return {
      isHealthy,
      errorRate,
      averageResponseTime: this.performanceStats.averageResponseTime,
      compatibilityIssueCount,
      recommendations,
    };
  }

  /**
   * Export metrics for external monitoring
   */
  public exportMetrics(): {
    stats: RedisPerformanceStats;
    recentMetrics: RedisOperationMetrics[];
    healthStatus: {
      isHealthy: boolean;
      errorRate: number;
      averageResponseTime: number;
      compatibilityIssueCount: number;
      recommendations: string[];
    };
  } {
    return {
      stats: this.getPerformanceStats(),
      recentMetrics: this.getRecentMetrics(100),
      healthStatus: this.getHealthStatus(),
    };
  }

  /**
   * Validate Redis method compatibility (Requirement 4.3)
   */
  public validateMethod(method: string): {
    isSupported: boolean;
    isKnownUnsupported: boolean;
    recommendation?: string;
    shouldLog: boolean;
  } {
    const isSupported = this.supportedMethods.has(method);
    const isKnownUnsupported = this.unsupportedMethods.has(method);
    
    let recommendation: string | undefined;
    if (isKnownUnsupported) {
      const recommendations: Record<string, string> = {
        'zRevRank': 'Use zRange with sorting to calculate rank position',
        'zRank': 'Use zRange with sorting to calculate rank position',
        'zRevRange': 'Use zRange with REV option for reverse ordering',
        'zCount': 'Use zRangeByScore to count elements in score range',
      };
      recommendation = recommendations[method];
    }

    return {
      isSupported,
      isKnownUnsupported,
      ...(recommendation && { recommendation }),
      shouldLog: !isSupported || isKnownUnsupported,
    };
  }

  /**
   * Log method validation warning (Requirement 4.1, 4.3)
   */
  public logMethodValidation(method: string, operationName: string): void {
    const validation = this.validateMethod(method);
    
    if (validation.shouldLog) {
      const logData = {
        method,
        operationName,
        isSupported: validation.isSupported,
        isKnownUnsupported: validation.isKnownUnsupported,
        recommendation: validation.recommendation,
        timestamp: new Date().toISOString(),
      };

      if (validation.isKnownUnsupported) {
        console.error('Redis Method Validation - UNSUPPORTED METHOD:', logData);
      } else if (!validation.isSupported) {
        console.warn('Redis Method Validation - UNKNOWN METHOD:', logData);
      }
    }
  }

  /**
   * Get method validation statistics
   */
  public getMethodValidationStats(): {
    supportedMethodsUsed: string[];
    unsupportedMethodsAttempted: string[];
    unknownMethodsAttempted: string[];
    validationWarnings: number;
  } {
    const recentMetrics = this.getRecentMetrics(200);
    const methodsUsed = new Set(recentMetrics.map(m => m.method));
    
    const supportedMethodsUsed = Array.from(methodsUsed).filter(m => this.supportedMethods.has(m));
    const unsupportedMethodsAttempted = Array.from(methodsUsed).filter(m => this.unsupportedMethods.has(m));
    const unknownMethodsAttempted = Array.from(methodsUsed).filter(m => 
      !this.supportedMethods.has(m) && !this.unsupportedMethods.has(m)
    );

    const validationWarnings = recentMetrics.filter(m => 
      !this.supportedMethods.has(m.method) || this.unsupportedMethods.has(m.method)
    ).length;

    return {
      supportedMethodsUsed,
      unsupportedMethodsAttempted,
      unknownMethodsAttempted,
      validationWarnings,
    };
  }

  private updatePerformanceStats(metrics: RedisOperationMetrics): void {
    this.performanceStats.totalOperations++;
    
    if (metrics.success) {
      this.performanceStats.successfulOperations++;
    } else {
      this.performanceStats.failedOperations++;
    }

    // Update operation counts
    this.performanceStats.operationCounts[metrics.operationName] = 
      (this.performanceStats.operationCounts[metrics.operationName] || 0) + 1;

    // Update error counts
    if (metrics.error) {
      this.performanceStats.errorCounts[metrics.error] = 
        (this.performanceStats.errorCounts[metrics.error] || 0) + 1;
    }

    // Update compatibility issue counts
    if (metrics.compatibility.compatibilityIssue) {
      this.performanceStats.compatibilityIssues[metrics.compatibility.compatibilityIssue] = 
        (this.performanceStats.compatibilityIssues[metrics.compatibility.compatibilityIssue] || 0) + 1;
    }

    // Update average response time (rolling average)
    const totalTime = this.performanceStats.averageResponseTime * (this.performanceStats.totalOperations - 1) + metrics.duration;
    this.performanceStats.averageResponseTime = totalTime / this.performanceStats.totalOperations;

    this.performanceStats.lastUpdated = Date.now();
  }

  private logToConsole(metrics: RedisOperationMetrics): void {
    const logLevel = metrics.success ? 'log' : 'error';
    const compatibilityInfo = metrics.compatibility.fallbackUsed ? ' [FALLBACK]' : '';
    const performanceInfo = metrics.duration > 500 ? ' [SLOW]' : '';
    
    const logMessage = `Redis ${metrics.method}(${metrics.operationName}): ${metrics.success ? 'SUCCESS' : 'FAILED'} (${metrics.duration}ms)${compatibilityInfo}${performanceInfo}`;
    
    console[logLevel](logMessage, {
      operation: metrics.operationName,
      method: metrics.method,
      duration: metrics.duration,
      success: metrics.success,
      error: metrics.error,
      compatibility: metrics.compatibility,
      timestamp: new Date(metrics.endTime).toISOString(),
    });
  }

  private logCompatibilityIssue(metrics: RedisOperationMetrics): void {
    console.warn('Redis Compatibility Issue Detected:', {
      operation: metrics.operationName,
      method: metrics.method,
      issue: metrics.compatibility.compatibilityIssue,
      fallbackUsed: metrics.compatibility.fallbackUsed,
      parameters: metrics.parameters,
      timestamp: new Date(metrics.endTime).toISOString(),
      recommendation: this.getCompatibilityRecommendation(metrics.method),
    });
  }

  private getCompatibilityRecommendation(method: string): string {
    const recommendations: Record<string, string> = {
      'zRevRank': 'Use zRange with sorting to calculate rank position',
      'zRank': 'Use zRange with sorting to calculate rank position',
      'zRevRange': 'Use zRange with REV option for reverse ordering',
      'zCount': 'Use zRangeByScore to count elements in score range',
    };

    return recommendations[method] || 'Check Devvit Redis documentation for supported alternatives';
  }

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
      message.includes('zrank') ||
      message.includes('zrevrange') ||
      message.includes('zcount')
    );
  }

  private sanitizeParameters(params: any): any {
    if (!params) return undefined;
    
    // Limit parameter logging to prevent excessive log size
    const stringified = JSON.stringify(params);
    if (stringified.length > 200) {
      return `${stringified.substring(0, 200)}... [truncated]`;
    }
    return params;
  }

  private sanitizeResult(result: any): any {
    if (!result) return undefined;
    
    // For arrays, just log the length
    if (Array.isArray(result)) {
      return `Array(${result.length})`;
    }
    
    // For objects, log a summary
    if (typeof result === 'object') {
      return `Object(${Object.keys(result).length} keys)`;
    }
    
    // For strings, limit length
    if (typeof result === 'string' && result.length > 100) {
      return `${result.substring(0, 100)}... [truncated]`;
    }
    
    return result;
  }

  private startPeriodicStatsUpdate(): void {
    setInterval(() => {
      this.logPeriodicStats();
    }, this.statsUpdateInterval);
  }

  private logPeriodicStats(): void {
    const stats = this.getPerformanceStats();
    const healthStatus = this.getHealthStatus();
    
    console.log('Redis Performance Summary:', {
      totalOperations: stats.totalOperations,
      successRate: stats.totalOperations > 0 ? 
        ((stats.successfulOperations / stats.totalOperations) * 100).toFixed(1) + '%' : '0%',
      averageResponseTime: `${stats.averageResponseTime.toFixed(1)}ms`,
      isHealthy: healthStatus.isHealthy,
      compatibilityIssues: Object.keys(stats.compatibilityIssues).length,
      alertsTriggered: stats.alertsTriggered,
      criticalFailures: stats.criticalFailures,
      performanceAlerts: stats.performanceAlerts,
      topOperations: Object.entries(stats.operationCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([op, count]) => `${op}(${count})`),
      timestamp: new Date().toISOString(),
    });

    if (healthStatus.recommendations.length > 0) {
      console.warn('Redis Health Recommendations:', healthStatus.recommendations);
    }

    // Log critical alerts if any
    if (stats.criticalFailures > 0 || stats.performanceAlerts > 0) {
      console.error('Redis Critical Status Alert:', {
        criticalFailures: stats.criticalFailures,
        performanceAlerts: stats.performanceAlerts,
        errorRate: healthStatus.errorRate,
        averageResponseTime: healthStatus.averageResponseTime,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Check for alerts and critical issues
   */
  private checkForAlerts(metrics: RedisOperationMetrics): void {
    // Critical failure alert
    if (!metrics.success && metrics.compatibility.compatibilityIssue) {
      this.performanceStats.criticalFailures++;
      this.performanceStats.alertsTriggered++;
      
      console.error('CRITICAL REDIS ALERT: Compatibility failure detected', {
        operation: metrics.operationName,
        method: metrics.method,
        error: metrics.error,
        compatibilityIssue: metrics.compatibility.compatibilityIssue,
        timestamp: new Date(metrics.endTime).toISOString(),
      });
    }

    // Performance alert
    if (metrics.duration > 2000) { // Operations taking more than 2 seconds
      this.performanceStats.performanceAlerts++;
      this.performanceStats.alertsTriggered++;
      
      console.warn('PERFORMANCE ALERT: Slow Redis operation detected', {
        operation: metrics.operationName,
        method: metrics.method,
        duration: `${metrics.duration}ms`,
        parameters: metrics.parameters,
        timestamp: new Date(metrics.endTime).toISOString(),
      });
    }

    // High error rate alert (check every 10 operations)
    if (this.performanceStats.totalOperations % 10 === 0) {
      const errorRate = this.performanceStats.totalOperations > 0 ? 
        (this.performanceStats.failedOperations / this.performanceStats.totalOperations) * 100 : 0;
      
      if (errorRate > 25) { // More than 25% error rate
        this.performanceStats.alertsTriggered++;
        
        console.error('HIGH ERROR RATE ALERT: Redis operations failing frequently', {
          errorRate: `${errorRate.toFixed(1)}%`,
          totalOperations: this.performanceStats.totalOperations,
          failedOperations: this.performanceStats.failedOperations,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Log detailed operation information for debugging
   */
  private logDetailedOperation(metrics: RedisOperationMetrics): void {
    // Only log detailed info for failed operations or compatibility issues
    if (!metrics.success || metrics.compatibility.compatibilityIssue || metrics.duration > 1000) {
      const detailedLog = {
        timestamp: new Date(metrics.endTime).toISOString(),
        operation: {
          name: metrics.operationName,
          method: metrics.method,
          duration: `${metrics.duration}ms`,
          success: metrics.success,
        },
        compatibility: {
          isSupported: metrics.compatibility.isSupported,
          fallbackUsed: metrics.compatibility.fallbackUsed,
          issue: metrics.compatibility.compatibilityIssue,
        },
        parameters: metrics.parameters,
        error: metrics.error,
        context: {
          totalOperations: this.performanceStats.totalOperations,
          currentErrorRate: this.performanceStats.totalOperations > 0 ? 
            ((this.performanceStats.failedOperations / this.performanceStats.totalOperations) * 100).toFixed(1) + '%' : '0%',
          averageResponseTime: `${this.performanceStats.averageResponseTime.toFixed(1)}ms`,
        },
      };

      if (metrics.success) {
        console.log('Redis Operation Detail (Performance):', detailedLog);
      } else {
        console.error('Redis Operation Detail (Failure):', detailedLog);
      }
    }
  }
}

/**
 * Enhanced Redis Wrapper with Automatic Monitoring
 * 
 * Wraps Redis operations to provide automatic logging and monitoring
 */
export class MonitoredRedisClient {
  private logger: RedisOperationLogger;

  constructor() {
    this.logger = RedisOperationLogger.getInstance();
  }

  /**
   * Execute Redis operation with comprehensive monitoring and validation
   */
  private async executeWithValidation<T>(
    operationName: string,
    method: string,
    operation: () => Promise<T>,
    parameters?: any
  ): Promise<T> {
    // Validate method before execution (Requirement 4.3)
    this.logger.logMethodValidation(method, operationName);
    
    // Execute with monitoring
    return this.logger.wrapOperation(
      operationName,
      method,
      operation,
      parameters,
      this.logger.validateMethod(method).isSupported
    );
  }

  /**
   * Monitored Redis get operation
   */
  async get(key: string): Promise<string | null> {
    const result = await this.executeWithValidation(
      'get',
      'get',
      () => redis.get(key),
      { key }
    );
    return result ?? null;
  }

  /**
   * Monitored Redis set operation
   */
  async set(key: string, value: string): Promise<string> {
    return this.executeWithValidation(
      'set',
      'set',
      () => redis.set(key, value),
      { key, valueLength: value.length }
    );
  }

  /**
   * Monitored Redis hGet operation
   */
  async hGet(key: string, field: string): Promise<string | null> {
    const result = await this.executeWithValidation(
      'hGet',
      'hGet',
      () => redis.hGet(key, field),
      { key, field }
    );
    return result ?? null;
  }

  /**
   * Monitored Redis hSet operation
   */
  async hSet(key: string, fieldValues: Record<string, string>): Promise<number> {
    return this.executeWithValidation(
      'hSet',
      'hSet',
      () => redis.hSet(key, fieldValues),
      { key, fieldCount: Object.keys(fieldValues).length }
    );
  }

  /**
   * Monitored Redis hGetAll operation
   */
  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.executeWithValidation(
      'hGetAll',
      'hGetAll',
      () => redis.hGetAll(key),
      { key }
    );
  }

  /**
   * Monitored Redis zAdd operation
   */
  async zAdd(key: string, scoreMembers: { score: number; member: string }): Promise<number> {
    return this.executeWithValidation(
      'zAdd',
      'zAdd',
      () => redis.zAdd(key, scoreMembers),
      { key, member: scoreMembers.member, score: scoreMembers.score }
    );
  }

  /**
   * Monitored Redis zRange operation
   */
  async zRange(key: string, start: number, stop: number, options?: any): Promise<any[]> {
    return this.executeWithValidation(
      'zRange',
      'zRange',
      () => redis.zRange(key, start, stop, options),
      { key, start, stop, options }
    );
  }

  /**
   * Monitored Redis zScore operation
   */
  async zScore(key: string, member: string): Promise<number | null> {
    const result = await this.executeWithValidation(
      'zScore',
      'zScore',
      () => redis.zScore(key, member),
      { key, member }
    );
    return result ?? null;
  }

  /**
   * Monitored Redis zCard operation
   */
  async zCard(key: string): Promise<number> {
    return this.executeWithValidation(
      'zCard',
      'zCard',
      () => redis.zCard(key),
      { key }
    );
  }

  /**
   * Monitored Redis zRem operation
   */
  async zRem(key: string, members: string[]): Promise<number> {
    return this.executeWithValidation(
      'zRem',
      'zRem',
      () => redis.zRem(key, members),
      { key, memberCount: members.length }
    );
  }

  /**
   * Monitored Redis del operation
   */
  async del(key: string): Promise<number> {
    const result = await this.executeWithValidation(
      'del',
      'del',
      async () => {
        await redis.del(key);
        return 1; // Assume success
      },
      { key }
    );
    return result;
  }

  /**
   * Monitored Redis expire operation
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.executeWithValidation(
      'expire',
      'expire',
      async () => {
        await redis.expire(key, seconds);
        return true; // Assume success
      },
      { key, seconds }
    );
    return result;
  }

  /**
   * Monitored Redis incrBy operation
   */
  async incrBy(key: string, increment: number): Promise<number> {
    return this.executeWithValidation(
      'incrBy',
      'incrBy',
      () => redis.incrBy(key, increment),
      { key, increment }
    );
  }

  /**
   * Attempt unsupported operation with monitoring
   */
  async attemptUnsupportedOperation<T>(
    operationName: string,
    method: string,
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    parameters?: any
  ): Promise<T> {
    try {
      return await this.logger.wrapOperation(
        operationName,
        method,
        operation,
        parameters,
        false // Mark as unsupported
      );
    } catch (error) {
      console.warn(`Unsupported Redis operation ${method} failed, using fallback`);
      return await this.logger.wrapOperation(
        `${operationName}_fallback`,
        `${method}_fallback`,
        fallback,
        parameters,
        true // Fallback is supported
      );
    }
  }
}

/**
 * Global monitored Redis client instance
 */
export const monitoredRedis = new MonitoredRedisClient();

/**
 * Get Redis monitoring statistics
 */
export function getRedisMonitoringStats() {
  return RedisOperationLogger.getInstance().exportMetrics();
}

/**
 * Get Redis health status
 */
export function getRedisHealthStatus() {
  return RedisOperationLogger.getInstance().getHealthStatus();
}

/**
 * Get Redis method validation statistics (Requirement 4.3)
 */
export function getRedisMethodValidationStats() {
  return RedisOperationLogger.getInstance().getMethodValidationStats();
}

/**
 * Validate Redis method compatibility (Requirement 4.3)
 */
export function validateRedisMethod(method: string) {
  return RedisOperationLogger.getInstance().validateMethod(method);
}

/**
 * Get comprehensive Redis compatibility report (Requirements 4.4, 4.5, 6.3)
 */
export function getRedisCompatibilityReport() {
  const logger = RedisOperationLogger.getInstance();
  const stats = logger.getPerformanceStats();
  const healthStatus = logger.getHealthStatus();
  const validationStats = logger.getMethodValidationStats();
  const recentMetrics = logger.getRecentMetrics(50);

  return {
    timestamp: new Date().toISOString(),
    summary: {
      isHealthy: healthStatus.isHealthy,
      totalOperations: stats.totalOperations,
      errorRate: healthStatus.errorRate,
      averageResponseTime: healthStatus.averageResponseTime,
      alertsTriggered: stats.alertsTriggered,
      criticalFailures: stats.criticalFailures,
    },
    compatibility: {
      supportedMethodsUsed: validationStats.supportedMethodsUsed,
      unsupportedMethodsAttempted: validationStats.unsupportedMethodsAttempted,
      unknownMethodsAttempted: validationStats.unknownMethodsAttempted,
      validationWarnings: validationStats.validationWarnings,
      compatibilityIssues: stats.compatibilityIssues,
    },
    performance: {
      operationCounts: stats.operationCounts,
      errorCounts: stats.errorCounts,
      recentSlowOperations: recentMetrics.filter(m => m.duration > 500),
      recentFailures: recentMetrics.filter(m => !m.success),
    },
    recommendations: healthStatus.recommendations,
  };
}
