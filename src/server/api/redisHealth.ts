/**
 * Redis Compatibility Health Check API Endpoints
 * 
 * Provides REST endpoints for monitoring Redis operation performance,
 * compatibility status, and health metrics.
 */

import type { Request, Response } from 'express';
import { 
  getRedisMonitoringStats, 
  getRedisHealthStatus
} from '../core/redisMonitoring.js';
import { 
  generateRedisCompatibilityReport, 
  getValidationStats 
} from '../core/redisCompatibilityValidator.js';
import { getCompatibilityStats } from '../core/redisCompatibilityConfig.js';

/**
 * Get Redis health status endpoint
 * GET /api/redis/health
 */
export async function getRedisHealth(_req: Request, res: Response): Promise<void> {
  try {
    const healthStatus = getRedisHealthStatus();
    const monitoringStats = getRedisMonitoringStats();
    const validationStats = getValidationStats();
    const compatibilityStats = getCompatibilityStats();

    const healthResponse = {
      timestamp: new Date().toISOString(),
      status: healthStatus.isHealthy ? 'healthy' : 'unhealthy',
      summary: {
        isHealthy: healthStatus.isHealthy,
        errorRate: healthStatus.errorRate,
        averageResponseTime: healthStatus.averageResponseTime,
        compatibilityIssueCount: healthStatus.compatibilityIssueCount,
        totalOperations: monitoringStats.stats.totalOperations,
        alertsTriggered: monitoringStats.stats.alertsTriggered,
      },
      performance: {
        successfulOperations: monitoringStats.stats.successfulOperations,
        failedOperations: monitoringStats.stats.failedOperations,
        averageResponseTime: monitoringStats.stats.averageResponseTime,
        criticalFailures: monitoringStats.stats.criticalFailures,
        performanceAlerts: monitoringStats.stats.performanceAlerts,
      },
      compatibility: {
        supportedMethodsCount: compatibilityStats.supportedCount,
        unsupportedMethodsCount: compatibilityStats.unsupportedCount,
        substitutionCount: compatibilityStats.substitutionCount,
        validationRulesCount: validationStats.validationRulesCount,
        cacheSize: validationStats.cacheSize,
      },
      recommendations: healthStatus.recommendations,
      lastUpdated: monitoringStats.stats.lastUpdated,
    };

    // Set appropriate HTTP status based on health
    const httpStatus = healthStatus.isHealthy ? 200 : 503;
    res.status(httpStatus).json({
      success: true,
      data: healthResponse,
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
}

/**
 * Get detailed Redis performance metrics endpoint
 * GET /api/redis/metrics
 */
export async function getRedisMetrics(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const monitoringStats = getRedisMonitoringStats();

    const metricsResponse = {
      timestamp: new Date().toISOString(),
      summary: monitoringStats.stats,
      recentMetrics: monitoringStats.recentMetrics.slice(-limit),
      healthStatus: monitoringStats.healthStatus,
      operationBreakdown: {
        topOperations: Object.entries(monitoringStats.stats.operationCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([operation, count]) => ({ operation, count })),
        topErrors: Object.entries(monitoringStats.stats.errorCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([error, count]) => ({ error, count })),
        compatibilityIssues: Object.entries(monitoringStats.stats.compatibilityIssues)
          .sort(([,a], [,b]) => b - a)
          .map(([issue, count]) => ({ issue, count })),
      },
    };

    res.status(200).json({
      success: true,
      data: metricsResponse,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error getting Redis metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis metrics',
      timestamp: Date.now(),
    });
  }
}

/**
 * Get comprehensive Redis compatibility report endpoint
 * GET /api/redis/compatibility
 */
export async function getRedisCompatibilityReport(_req: Request, res: Response): Promise<void> {
  try {
    const compatibilityReport = generateRedisCompatibilityReport();

    res.status(200).json({
      success: true,
      data: compatibilityReport,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error generating Redis compatibility report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Redis compatibility report',
      timestamp: Date.now(),
    });
  }
}

/**
 * Get Redis operation alerts endpoint
 * GET /api/redis/alerts
 */
export async function getRedisAlerts(req: Request, res: Response): Promise<void> {
  try {
    const severity = req.query.severity as string;
    const status = req.query.status as string;
    
    const compatibilityReport = generateRedisCompatibilityReport();
    let alerts = compatibilityReport.alertsTriggered;

    // Filter by severity if specified
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Filter by status if specified
    if (status) {
      alerts = alerts.filter(alert => alert.status === status);
    }

    const alertsResponse = {
      timestamp: new Date().toISOString(),
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.status === 'active').length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      alerts: alerts.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()),
      summary: {
        byType: alerts.reduce((acc, alert) => {
          acc[alert.type] = (acc[alert.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        bySeverity: alerts.reduce((acc, alert) => {
          acc[alert.severity] = (acc[alert.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    };

    res.status(200).json({
      success: true,
      data: alertsResponse,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error getting Redis alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis alerts',
      timestamp: Date.now(),
    });
  }
}

/**
 * Get Redis method validation statistics endpoint
 * GET /api/redis/validation
 */
export async function getRedisValidation(_req: Request, res: Response): Promise<void> {
  try {
    const validationStats = getValidationStats();
    const compatibilityStats = getCompatibilityStats();
    const monitoringStats = getRedisMonitoringStats();

    const validationResponse = {
      timestamp: new Date().toISOString(),
      validation: validationStats,
      compatibility: compatibilityStats,
      methodValidation: {
        supportedMethodsUsed: monitoringStats.stats.operationCounts,
        validationWarnings: validationStats.validationRulesCount,
        cacheHitRate: validationStats.cacheHitRate,
        lastCacheUpdate: validationStats.lastCacheUpdate,
      },
      riskAssessment: {
        riskLevelDistribution: compatibilityStats.riskLevelCounts,
        categoryDistribution: compatibilityStats.categoryCounts,
        substitutionsAvailable: compatibilityStats.substitutionCount,
      },
    };

    res.status(200).json({
      success: true,
      data: validationResponse,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error getting Redis validation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis validation statistics',
      timestamp: Date.now(),
    });
  }
}

/**
 * Get Redis performance analysis endpoint
 * GET /api/redis/performance
 */
export async function getRedisPerformance(req: Request, res: Response): Promise<void> {
  try {
    const timeRange = req.query.timeRange as string || '1h';
    const compatibilityReport = generateRedisCompatibilityReport();
    const monitoringStats = getRedisMonitoringStats();

    const performanceResponse = {
      timestamp: new Date().toISOString(),
      timeRange,
      summary: {
        overallImpact: compatibilityReport.performanceImpact.overallImpact,
        responseTimeIncrease: compatibilityReport.performanceImpact.responseTimeIncrease,
        throughputDecrease: compatibilityReport.performanceImpact.throughputDecrease,
        fallbackOperationsPercentage: compatibilityReport.performanceImpact.fallbackOperationsPercentage,
      },
      operationAnalysis: compatibilityReport.methodAnalysis.map(method => ({
        method: method.method,
        usageCount: method.usageCount,
        successRate: method.successRate,
        averageResponseTime: method.averageResponseTime,
        riskAssessment: method.riskAssessment,
        fallbackUsageCount: method.fallbackUsageCount,
        compatibilityIssues: method.compatibilityIssues,
      })),
      mostImpactedOperations: compatibilityReport.performanceImpact.mostImpactedOperations,
      recommendations: compatibilityReport.performanceImpact.recommendations,
      trends: {
        errorRateTrend: monitoringStats.healthStatus.errorRate,
        responseTimeTrend: monitoringStats.healthStatus.averageResponseTime,
        alertsTrend: monitoringStats.stats.alertsTriggered,
      },
    };

    res.status(200).json({
      success: true,
      data: performanceResponse,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error getting Redis performance analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis performance analysis',
      timestamp: Date.now(),
    });
  }
}

/**
 * Clear Redis monitoring cache endpoint
 * POST /api/redis/cache/clear
 */
export async function clearRedisCache(_req: Request, res: Response): Promise<void> {
  try {
    // Import the clear cache function
    const { clearValidationCache } = await import('../core/redisCompatibilityValidator.js');
    clearValidationCache();

    res.status(200).json({
      success: true,
      message: 'Redis monitoring cache cleared successfully',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error clearing Redis cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear Redis cache',
      timestamp: Date.now(),
    });
  }
}

/**
 * Get Redis configuration endpoint
 * GET /api/redis/config
 */
export async function getRedisConfig(_req: Request, res: Response): Promise<void> {
  try {
    const { getRedisCompatibilityConfig } = await import('../core/redisCompatibilityConfig.js');
    const config = getRedisCompatibilityConfig();

    // Remove sensitive information and provide summary
    const configResponse = {
      timestamp: new Date().toISOString(),
      version: config.version,
      lastUpdated: config.lastUpdated,
      environment: config.environment,
      summary: {
        supportedMethodsCount: Object.keys(config.supportedMethods).length,
        unsupportedMethodsCount: Object.keys(config.unsupportedMethods).length,
        substitutionsCount: Object.keys(config.methodSubstitutions).length,
        validationRulesCount: config.validationRules.length,
      },
      alertThresholds: config.alertThresholds,
      supportedMethods: Object.keys(config.supportedMethods),
      unsupportedMethods: Object.keys(config.unsupportedMethods),
      availableSubstitutions: Object.keys(config.methodSubstitutions),
    };

    res.status(200).json({
      success: true,
      data: configResponse,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error getting Redis configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis configuration',
      timestamp: Date.now(),
    });
  }
}

/**
 * Get Redis alert statistics endpoint
 * GET /api/redis/alert-stats
 */
export async function getRedisAlertStats(_req: Request, res: Response): Promise<void> {
  try {
    const { getRedisAlertStats } = await import('../core/redisAlertSystem.js');
    const alertStats = getRedisAlertStats();

    res.status(200).json({
      success: true,
      data: alertStats,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error getting Redis alert stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis alert statistics',
      timestamp: Date.now(),
    });
  }
}

/**
 * Acknowledge Redis alert endpoint
 * POST /api/redis/alerts/:alertId/acknowledge
 */
export async function acknowledgeRedisAlert(req: Request, res: Response): Promise<void> {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy, notes } = req.body;

    if (!acknowledgedBy) {
      res.status(400).json({
        success: false,
        error: 'acknowledgedBy is required',
        timestamp: Date.now(),
      });
      return;
    }

    const { acknowledgeRedisAlert: acknowledgeAlert } = await import('../core/redisAlertSystem.js');
    const success = acknowledgeAlert(alertId as string, acknowledgedBy, notes);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Alert acknowledged successfully',
        timestamp: Date.now(),
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found',
        timestamp: Date.now(),
      });
    }

  } catch (error) {
    console.error('Error acknowledging Redis alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge Redis alert',
      timestamp: Date.now(),
    });
  }
}

/**
 * Resolve Redis alert endpoint
 * POST /api/redis/alerts/:alertId/resolve
 */
export async function resolveRedisAlert(req: Request, res: Response): Promise<void> {
  try {
    const { alertId } = req.params;
    const { resolvedBy, notes } = req.body;

    if (!resolvedBy) {
      res.status(400).json({
        success: false,
        error: 'resolvedBy is required',
        timestamp: Date.now(),
      });
      return;
    }

    const { resolveRedisAlert: resolveAlert } = await import('../core/redisAlertSystem.js');
    const success = resolveAlert(alertId as string, resolvedBy, notes);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Alert resolved successfully',
        timestamp: Date.now(),
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found',
        timestamp: Date.now(),
      });
    }

  } catch (error) {
    console.error('Error resolving Redis alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve Redis alert',
      timestamp: Date.now(),
    });
  }
}
