import { RedisOperationLogger, getRedisMonitoringStats, getRedisHealthStatus } from './redisMonitoring.js';
import { RedisCompatibilityManager } from './redisCompatibility.js';

/**
 * Redis Debugging and Diagnostic Utilities
 * 
 * Provides comprehensive debugging information for Redis compatibility issues
 * and performance problems in the Devvit environment.
 */

export interface RedisDebugInfo {
  timestamp: string;
  environment: 'devvit';
  compatibility: {
    supportedMethods: string[];
    unsupportedMethods: string[];
    recentCompatibilityIssues: any[];
    validationWarnings: number;
    unknownMethodsAttempted: string[];
    compatibilityReport: any;
  };
  performance: {
    healthStatus: any;
    recentSlowOperations: any[];
    errorRateByOperation: Record<string, number>;
    alertsTriggered: number;
    criticalFailures: number;
    performanceAlerts: number;
  };
  operations: {
    totalOperations: number;
    recentOperations: any[];
    operationFrequency: Record<string, number>;
    methodValidationStats: any;
  };
  recommendations: string[];
}

export class RedisDebugger {
  private static instance: RedisDebugger;
  private logger: RedisOperationLogger;
  private compatibilityManager: RedisCompatibilityManager;

  private constructor() {
    this.logger = RedisOperationLogger.getInstance();
    this.compatibilityManager = RedisCompatibilityManager.getInstance();
  }

  public static getInstance(): RedisDebugger {
    if (!RedisDebugger.instance) {
      RedisDebugger.instance = new RedisDebugger();
    }
    return RedisDebugger.instance;
  }

  /**
   * Generate comprehensive Redis debug information
   */
  public generateDebugInfo(): RedisDebugInfo {
    const monitoringStats = getRedisMonitoringStats();
    const healthStatus = getRedisHealthStatus();
    
    // Import validation stats
    const { getRedisMethodValidationStats, getRedisCompatibilityReport } = require('./redisMonitoring.js');
    const validationStats = getRedisMethodValidationStats();
    const compatibilityReport = getRedisCompatibilityReport();
    
    const recentMetrics = monitoringStats.recentMetrics || [];
    const compatibilityIssues = recentMetrics.filter(m => m.compatibility?.compatibilityIssue);
    const slowOperations = recentMetrics.filter(m => m.duration > 500);

    // Calculate error rates by operation
    const errorRateByOperation: Record<string, number> = {};
    const operationCounts: Record<string, { total: number; errors: number }> = {};

    recentMetrics.forEach(metric => {
      if (!operationCounts[metric.operationName]) {
        operationCounts[metric.operationName] = { total: 0, errors: 0 };
      }
      operationCounts[metric.operationName]!.total++;
      if (!metric.success) {
        operationCounts[metric.operationName]!.errors++;
      }
    });

    Object.entries(operationCounts).forEach(([operation, counts]) => {
      errorRateByOperation[operation] = counts.total > 0 ? 
        (counts.errors / counts.total) * 100 : 0;
    });

    const recommendations = this.generateRecommendations(
      healthStatus,
      compatibilityIssues,
      slowOperations,
      errorRateByOperation
    );

    return {
      timestamp: new Date().toISOString(),
      environment: 'devvit',
      compatibility: {
        supportedMethods: validationStats.supportedMethodsUsed,
        unsupportedMethods: validationStats.unsupportedMethodsAttempted,
        recentCompatibilityIssues: compatibilityIssues.slice(-10),
        validationWarnings: validationStats.validationWarnings,
        unknownMethodsAttempted: validationStats.unknownMethodsAttempted,
        compatibilityReport: compatibilityReport.compatibility,
      },
      performance: {
        healthStatus,
        recentSlowOperations: slowOperations.slice(-10),
        errorRateByOperation,
        alertsTriggered: monitoringStats.stats.alertsTriggered || 0,
        criticalFailures: monitoringStats.stats.criticalFailures || 0,
        performanceAlerts: monitoringStats.stats.performanceAlerts || 0,
      },
      operations: {
        totalOperations: monitoringStats.stats.totalOperations,
        recentOperations: recentMetrics.slice(-20),
        operationFrequency: monitoringStats.stats.operationCounts,
        methodValidationStats: validationStats,
      },
      recommendations,
    };
  }

  /**
   * Log debug information to console
   */
  public logDebugInfo(): void {
    const debugInfo = this.generateDebugInfo();
    
    console.log('=== Redis Debug Information ===');
    console.log(`Timestamp: ${debugInfo.timestamp}`);
    console.log(`Environment: ${debugInfo.environment}`);
    
    console.log('\n--- Compatibility Status ---');
    console.log(`Supported Methods Used: ${debugInfo.compatibility.supportedMethods.join(', ')}`);
    console.log(`Unsupported Methods Attempted: ${debugInfo.compatibility.unsupportedMethods.join(', ')}`);
    console.log(`Unknown Methods Attempted: ${debugInfo.compatibility.unknownMethodsAttempted.join(', ')}`);
    console.log(`Validation Warnings: ${debugInfo.compatibility.validationWarnings}`);
    console.log(`Recent Compatibility Issues: ${debugInfo.compatibility.recentCompatibilityIssues.length}`);
    
    console.log('\n--- Performance Status ---');
    console.log(`Health Status: ${debugInfo.performance.healthStatus.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    console.log(`Error Rate: ${debugInfo.performance.healthStatus.errorRate.toFixed(2)}%`);
    console.log(`Average Response Time: ${debugInfo.performance.healthStatus.averageResponseTime.toFixed(1)}ms`);
    console.log(`Recent Slow Operations: ${debugInfo.performance.recentSlowOperations.length}`);
    console.log(`Alerts Triggered: ${debugInfo.performance.alertsTriggered}`);
    console.log(`Critical Failures: ${debugInfo.performance.criticalFailures}`);
    console.log(`Performance Alerts: ${debugInfo.performance.performanceAlerts}`);
    
    console.log('\n--- Operation Statistics ---');
    console.log(`Total Operations: ${debugInfo.operations.totalOperations}`);
    console.log('Operation Frequency:', debugInfo.operations.operationFrequency);
    console.log('Error Rates by Operation:', debugInfo.performance.errorRateByOperation);
    
    if (debugInfo.recommendations.length > 0) {
      console.log('\n--- Recommendations ---');
      debugInfo.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log('=== End Redis Debug Information ===\n');
  }

  /**
   * Check for specific compatibility issues
   */
  public checkCompatibilityIssue(method: string): {
    isSupported: boolean;
    hasRecentIssues: boolean;
    recommendation: string;
    recentErrors: any[];
  } {
    const isSupported = this.compatibilityManager.isMethodSupported(method);
    const recentMetrics = this.logger.getRecentMetrics(100);
    const methodErrors = recentMetrics.filter(m => 
      m.method === method && m.compatibility.compatibilityIssue
    );

    return {
      isSupported,
      hasRecentIssues: methodErrors.length > 0,
      recommendation: this.getMethodRecommendation(method),
      recentErrors: methodErrors.slice(-5),
    };
  }

  /**
   * Analyze performance for specific operation
   */
  public analyzeOperationPerformance(operationName: string): {
    totalCalls: number;
    successRate: number;
    averageResponseTime: number;
    recentMetrics: any[];
    issues: string[];
  } {
    const operationMetrics = this.logger.getOperationMetrics(operationName, 100);
    const successfulOps = operationMetrics.filter(m => m.success);
    const issues: string[] = [];

    const successRate = operationMetrics.length > 0 ? 
      (successfulOps.length / operationMetrics.length) * 100 : 0;

    const averageResponseTime = operationMetrics.length > 0 ?
      operationMetrics.reduce((sum, m) => sum + m.duration, 0) / operationMetrics.length : 0;

    // Identify issues
    if (successRate < 90) {
      issues.push(`Low success rate: ${successRate.toFixed(1)}%`);
    }
    if (averageResponseTime > 500) {
      issues.push(`Slow response time: ${averageResponseTime.toFixed(1)}ms`);
    }

    const compatibilityIssues = operationMetrics.filter(m => m.compatibility.compatibilityIssue);
    if (compatibilityIssues.length > 0) {
      issues.push(`${compatibilityIssues.length} compatibility issues detected`);
    }

    return {
      totalCalls: operationMetrics.length,
      successRate,
      averageResponseTime,
      recentMetrics: operationMetrics.slice(-10),
      issues,
    };
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): {
    summary: string;
    criticalIssues: string[];
    operationAnalysis: Record<string, any>;
    recommendations: string[];
  } {
    const healthStatus = getRedisHealthStatus();
    const monitoringStats = getRedisMonitoringStats();
    
    const criticalIssues: string[] = [];
    const operationAnalysis: Record<string, any> = {};

    // Analyze each operation type
    Object.keys(monitoringStats.stats.operationCounts).forEach(operation => {
      operationAnalysis[operation] = this.analyzeOperationPerformance(operation);
      
      // Check for critical issues
      if (operationAnalysis[operation].successRate < 50) {
        criticalIssues.push(`${operation}: Critical failure rate (${operationAnalysis[operation].successRate.toFixed(1)}%)`);
      }
      if (operationAnalysis[operation].averageResponseTime > 2000) {
        criticalIssues.push(`${operation}: Very slow response time (${operationAnalysis[operation].averageResponseTime.toFixed(1)}ms)`);
      }
    });

    const summary = `Redis Performance: ${healthStatus.isHealthy ? 'HEALTHY' : 'NEEDS ATTENTION'} | ` +
      `${monitoringStats.stats.totalOperations} total operations | ` +
      `${healthStatus.errorRate.toFixed(1)}% error rate | ` +
      `${healthStatus.averageResponseTime.toFixed(1)}ms avg response time`;

    return {
      summary,
      criticalIssues,
      operationAnalysis,
      recommendations: healthStatus.recommendations,
    };
  }

  private generateRecommendations(
    healthStatus: any,
    compatibilityIssues: any[],
    slowOperations: any[],
    errorRates: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    // Health-based recommendations
    recommendations.push(...healthStatus.recommendations);

    // Compatibility-based recommendations
    if (compatibilityIssues.length > 0) {
      const uniqueIssues = [...new Set(compatibilityIssues.map(i => i.method))];
      recommendations.push(`Replace unsupported Redis methods: ${uniqueIssues.join(', ')}`);
    }

    // Performance-based recommendations
    if (slowOperations.length > 5) {
      recommendations.push('Consider optimizing slow Redis operations or implementing caching');
    }

    // Error rate recommendations
    Object.entries(errorRates).forEach(([operation, rate]) => {
      if (rate > 20) {
        recommendations.push(`High error rate for ${operation} (${rate.toFixed(1)}%) - investigate implementation`);
      }
    });

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Redis operations are performing well - continue monitoring');
    }

    return recommendations;
  }

  private getMethodRecommendation(method: string): string {
    const recommendations: Record<string, string> = {
      'zRevRank': 'Use zRange with sorting to calculate rank position',
      'zRank': 'Use zRange with sorting to calculate rank position',
      'zRevRange': 'Use zRange with REV option for reverse ordering',
      'zCount': 'Use zRangeByScore to count elements in score range',
    };
    return recommendations[method] || 'Check Devvit Redis documentation for supported alternatives';
  }
}

/**
 * Global Redis debugger instance
 */
export const redisDebugger = RedisDebugger.getInstance();

/**
 * Utility function to log Redis debug information
 */
export function logRedisDebugInfo(): void {
  redisDebugger.logDebugInfo();
}

/**
 * Utility function to get Redis debug information
 */
export function getRedisDebugInfo(): RedisDebugInfo {
  return redisDebugger.generateDebugInfo();
}

/**
 * Utility function to generate performance report
 */
export function getRedisPerformanceReport() {
  return redisDebugger.generatePerformanceReport();
}
