/**
 * Redis Compatibility Alert System
 * 
 * Provides real-time alerting for Redis compatibility issues,
 * performance degradation, and high failure rates.
 */

import type { 
  AlertItem, 
  RedisAlertThresholds 
} from '../../shared/types/redisCompatibility.js';
import { REDIS_COMPATIBILITY_CONFIG } from './redisCompatibilityConfig.js';
import { RedisOperationLogger } from './redisMonitoring.js';

export interface AlertSubscriber {
  id: string;
  name: string;
  onAlert: (alert: AlertItem) => Promise<void>;
  severityFilter?: ('info' | 'warning' | 'error' | 'critical')[];
  typeFilter?: ('compatibility' | 'performance' | 'error_rate' | 'method_usage')[];
}

export interface AlertHistory {
  alert: AlertItem;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

/**
 * Redis Alert System Class
 * 
 * Manages real-time alerting for Redis compatibility and performance issues
 */
export class RedisAlertSystem {
  private static instance: RedisAlertSystem;
  private logger: RedisOperationLogger;
  private subscribers: Map<string, AlertSubscriber> = new Map();
  private activeAlerts: Map<string, AlertItem> = new Map();
  private alertHistory: AlertHistory[] = [];
  private alertCounters: Map<string, number> = new Map();
  private readonly alertCheckInterval = 30000; // 30 seconds
  private alertTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.logger = RedisOperationLogger.getInstance();
    this.startAlertMonitoring();
  }

  public static getInstance(): RedisAlertSystem {
    if (!RedisAlertSystem.instance) {
      RedisAlertSystem.instance = new RedisAlertSystem();
    }
    return RedisAlertSystem.instance;
  }

  /**
   * Subscribe to Redis alerts
   */
  public subscribe(subscriber: AlertSubscriber): void {
    this.subscribers.set(subscriber.id, subscriber);
    console.log(`Alert subscriber '${subscriber.name}' registered`);
  }

  /**
   * Unsubscribe from Redis alerts
   */
  public unsubscribe(subscriberId: string): void {
    const subscriber = this.subscribers.get(subscriberId);
    if (subscriber) {
      this.subscribers.delete(subscriberId);
      console.log(`Alert subscriber '${subscriber.name}' unregistered`);
    }
  }

  /**
   * Trigger an alert
   */
  public async triggerAlert(alert: AlertItem): Promise<void> {
    // Check if this alert is already active
    const existingAlert = this.activeAlerts.get(alert.id);
    if (existingAlert && existingAlert.status === 'active') {
      // Update the existing alert
      existingAlert.actualValue = alert.actualValue;
      existingAlert.affectedMethods = alert.affectedMethods;
      return;
    }

    // Add to active alerts
    this.activeAlerts.set(alert.id, alert);

    // Add to history
    this.alertHistory.push({
      alert: { ...alert },
    });

    // Increment counter
    const counterKey = `${alert.type}_${alert.severity}`;
    this.alertCounters.set(counterKey, (this.alertCounters.get(counterKey) || 0) + 1);

    // Notify subscribers
    await this.notifySubscribers(alert);

    // Log the alert
    this.logAlert(alert);
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string, acknowledgedBy: string, notes?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.status = 'acknowledged';
    
    // Update history
    const historyEntry = this.alertHistory.find(h => h.alert.id === alertId);
    if (historyEntry) {
      historyEntry.acknowledgedAt = new Date().toISOString();
      historyEntry.acknowledgedBy = acknowledgedBy;
      if (notes) {
        historyEntry.notes = notes;
      }
    }

    console.log(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
    return true;
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string, resolvedBy: string, notes?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.status = 'resolved';
    
    // Update history
    const historyEntry = this.alertHistory.find(h => h.alert.id === alertId);
    if (historyEntry) {
      historyEntry.resolvedAt = new Date().toISOString();
      historyEntry.resolvedBy = resolvedBy;
      if (notes) {
        historyEntry.notes = (historyEntry.notes || '') + '\n' + notes;
      }
    }

    // Remove from active alerts after a delay
    setTimeout(() => {
      this.activeAlerts.delete(alertId);
    }, 60000); // Keep resolved alerts for 1 minute

    console.log(`Alert ${alertId} resolved by ${resolvedBy}`);
    return true;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(severityFilter?: string[], typeFilter?: string[]): AlertItem[] {
    let alerts = Array.from(this.activeAlerts.values()).filter(a => a.status === 'active');

    if (severityFilter && severityFilter.length > 0) {
      alerts = alerts.filter(a => severityFilter.includes(a.severity));
    }

    if (typeFilter && typeFilter.length > 0) {
      alerts = alerts.filter(a => typeFilter.includes(a.type));
    }

    return alerts.sort((a, b) => {
      // Sort by severity (critical first) then by triggered time
      const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
    });
  }

  /**
   * Get alert history
   */
  public getAlertHistory(limit: number = 100): AlertHistory[] {
    return this.alertHistory
      .sort((a, b) => new Date(b.alert.triggeredAt).getTime() - new Date(a.alert.triggeredAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get alert statistics
   */
  public getAlertStats(): {
    activeAlertsCount: number;
    totalAlertsToday: number;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    topAffectedMethods: Array<{ method: string; count: number }>;
    averageResolutionTime: number;
  } {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayAlerts = this.alertHistory.filter(h => 
      new Date(h.alert.triggeredAt) >= todayStart
    );

    const alertsByType: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = {};
    const methodCounts: Record<string, number> = {};

    for (const history of todayAlerts) {
      const alert = history.alert;
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      
      for (const method of alert.affectedMethods) {
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      }
    }

    const topAffectedMethods = Object.entries(methodCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([method, count]) => ({ method, count }));

    // Calculate average resolution time
    const resolvedAlerts = this.alertHistory.filter(h => h.resolvedAt);
    const averageResolutionTime = resolvedAlerts.length > 0 
      ? resolvedAlerts.reduce((sum, h) => {
          const triggered = new Date(h.alert.triggeredAt).getTime();
          const resolved = new Date(h.resolvedAt!).getTime();
          return sum + (resolved - triggered);
        }, 0) / resolvedAlerts.length
      : 0;

    return {
      activeAlertsCount: this.activeAlerts.size,
      totalAlertsToday: todayAlerts.length,
      alertsByType,
      alertsBySeverity,
      topAffectedMethods,
      averageResolutionTime: Math.round(averageResolutionTime / 1000 / 60), // minutes
    };
  }

  /**
   * Start automatic alert monitoring
   */
  private startAlertMonitoring(): void {
    this.alertTimer = setInterval(() => {
      this.checkForAlerts();
    }, this.alertCheckInterval);

    console.log('Redis alert monitoring started');
  }

  /**
   * Stop automatic alert monitoring
   */
  public stopAlertMonitoring(): void {
    if (this.alertTimer) {
      clearInterval(this.alertTimer);
      this.alertTimer = null;
      console.log('Redis alert monitoring stopped');
    }
  }

  /**
   * Check for alert conditions
   */
  private async checkForAlerts(): Promise<void> {
    try {
      const healthStatus = this.logger.getHealthStatus();
      const stats = this.logger.getPerformanceStats();
      const thresholds = REDIS_COMPATIBILITY_CONFIG.alertThresholds;

      await this.checkErrorRateAlerts(healthStatus.errorRate, thresholds);
      await this.checkPerformanceAlerts(healthStatus.averageResponseTime, thresholds);
      await this.checkCompatibilityAlerts(stats.compatibilityIssues, thresholds);
      await this.checkMethodUsageAlerts(stats.operationCounts, thresholds);
    } catch (error) {
      console.error('Error checking for alerts:', error);
    }
  }

  /**
   * Check error rate alerts
   */
  private async checkErrorRateAlerts(errorRate: number, thresholds: RedisAlertThresholds): Promise<void> {
    if (errorRate >= thresholds.errorRate.critical) {
      await this.triggerAlert({
        id: `error_rate_critical_${Date.now()}`,
        type: 'error_rate',
        severity: 'critical',
        title: 'Critical Redis Error Rate',
        description: `Redis error rate (${errorRate.toFixed(1)}%) has exceeded critical threshold`,
        triggeredAt: new Date().toISOString(),
        threshold: thresholds.errorRate.critical,
        actualValue: errorRate,
        affectedMethods: [],
        recommendedAction: 'Immediate investigation required - implement fallback mechanisms',
        status: 'active',
      });
    } else if (errorRate >= thresholds.errorRate.warning) {
      await this.triggerAlert({
        id: `error_rate_warning_${Date.now()}`,
        type: 'error_rate',
        severity: 'warning',
        title: 'High Redis Error Rate',
        description: `Redis error rate (${errorRate.toFixed(1)}%) has exceeded warning threshold`,
        triggeredAt: new Date().toISOString(),
        threshold: thresholds.errorRate.warning,
        actualValue: errorRate,
        affectedMethods: [],
        recommendedAction: 'Monitor closely and investigate error causes',
        status: 'active',
      });
    }
  }

  /**
   * Check performance alerts
   */
  private async checkPerformanceAlerts(responseTime: number, thresholds: RedisAlertThresholds): Promise<void> {
    if (responseTime >= thresholds.responseTime.critical) {
      await this.triggerAlert({
        id: `performance_critical_${Date.now()}`,
        type: 'performance',
        severity: 'critical',
        title: 'Critical Redis Performance Degradation',
        description: `Redis response time (${responseTime}ms) has exceeded critical threshold`,
        triggeredAt: new Date().toISOString(),
        threshold: thresholds.responseTime.critical,
        actualValue: responseTime,
        affectedMethods: [],
        recommendedAction: 'Immediate optimization required - implement caching',
        status: 'active',
      });
    } else if (responseTime >= thresholds.responseTime.warning) {
      await this.triggerAlert({
        id: `performance_warning_${Date.now()}`,
        type: 'performance',
        severity: 'warning',
        title: 'Redis Performance Degradation',
        description: `Redis response time (${responseTime}ms) has exceeded warning threshold`,
        triggeredAt: new Date().toISOString(),
        threshold: thresholds.responseTime.warning,
        actualValue: responseTime,
        affectedMethods: [],
        recommendedAction: 'Consider query optimization and caching strategies',
        status: 'active',
      });
    }
  }

  /**
   * Check compatibility alerts
   */
  private async checkCompatibilityAlerts(
    compatibilityIssues: Record<string, number>, 
    thresholds: RedisAlertThresholds
  ): Promise<void> {
    const totalIssues = Object.values(compatibilityIssues).reduce((sum, count) => sum + count, 0);
    const hourlyRate = totalIssues; // Simplified - would need time-based calculation

    if (hourlyRate >= thresholds.compatibilityIssues.critical) {
      await this.triggerAlert({
        id: `compatibility_critical_${Date.now()}`,
        type: 'compatibility',
        severity: 'critical',
        title: 'Critical Redis Compatibility Issues',
        description: `High rate of compatibility issues detected (${totalIssues} issues)`,
        triggeredAt: new Date().toISOString(),
        threshold: thresholds.compatibilityIssues.critical,
        actualValue: hourlyRate,
        affectedMethods: Object.keys(compatibilityIssues),
        recommendedAction: 'Implement method alternatives immediately',
        status: 'active',
      });
    } else if (hourlyRate >= thresholds.compatibilityIssues.warning) {
      await this.triggerAlert({
        id: `compatibility_warning_${Date.now()}`,
        type: 'compatibility',
        severity: 'warning',
        title: 'Redis Compatibility Issues Detected',
        description: `Compatibility issues detected (${totalIssues} issues)`,
        triggeredAt: new Date().toISOString(),
        threshold: thresholds.compatibilityIssues.warning,
        actualValue: hourlyRate,
        affectedMethods: Object.keys(compatibilityIssues),
        recommendedAction: 'Review unsupported method usage and plan alternatives',
        status: 'active',
      });
    }
  }

  /**
   * Check method usage alerts
   */
  private async checkMethodUsageAlerts(
    operationCounts: Record<string, number>, 
    thresholds: RedisAlertThresholds
  ): Promise<void> {
    // Check for unsupported method usage
    const unsupportedMethods = Object.keys(operationCounts).filter(method => 
      REDIS_COMPATIBILITY_CONFIG.unsupportedMethods[method]
    );

    if (unsupportedMethods.length > 0) {
      const totalUnsupportedUsage = unsupportedMethods.reduce((sum, method) => 
        sum + (operationCounts[method] || 0), 0
      );

      if (totalUnsupportedUsage >= thresholds.unsupportedMethodUsage.critical) {
        await this.triggerAlert({
          id: `method_usage_critical_${Date.now()}`,
          type: 'method_usage',
          severity: 'critical',
          title: 'Critical Unsupported Method Usage',
          description: `High usage of unsupported Redis methods (${totalUnsupportedUsage} operations)`,
          triggeredAt: new Date().toISOString(),
          threshold: thresholds.unsupportedMethodUsage.critical,
          actualValue: totalUnsupportedUsage,
          affectedMethods: unsupportedMethods,
          recommendedAction: 'Replace unsupported methods with alternatives immediately',
          status: 'active',
        });
      } else if (totalUnsupportedUsage >= thresholds.unsupportedMethodUsage.warning) {
        await this.triggerAlert({
          id: `method_usage_warning_${Date.now()}`,
          type: 'method_usage',
          severity: 'warning',
          title: 'Unsupported Method Usage Detected',
          description: `Usage of unsupported Redis methods detected (${totalUnsupportedUsage} operations)`,
          triggeredAt: new Date().toISOString(),
          threshold: thresholds.unsupportedMethodUsage.warning,
          actualValue: totalUnsupportedUsage,
          affectedMethods: unsupportedMethods,
          recommendedAction: 'Plan migration to supported alternatives',
          status: 'active',
        });
      }
    }
  }

  /**
   * Notify subscribers about an alert
   */
  private async notifySubscribers(alert: AlertItem): Promise<void> {
    for (const subscriber of this.subscribers.values()) {
      try {
        // Check severity filter
        if (subscriber.severityFilter && !subscriber.severityFilter.includes(alert.severity)) {
          continue;
        }

        // Check type filter
        if (subscriber.typeFilter && !subscriber.typeFilter.includes(alert.type)) {
          continue;
        }

        await subscriber.onAlert(alert);
      } catch (error) {
        console.error(`Error notifying subscriber ${subscriber.name}:`, error);
      }
    }
  }

  /**
   * Log alert to console
   */
  private logAlert(alert: AlertItem): void {
    const logLevel = alert.severity === 'critical' || alert.severity === 'error' ? 'error' : 'warn';
    
    console[logLevel](`REDIS ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`, {
      id: alert.id,
      type: alert.type,
      description: alert.description,
      threshold: alert.threshold,
      actualValue: alert.actualValue,
      affectedMethods: alert.affectedMethods,
      recommendedAction: alert.recommendedAction,
      triggeredAt: alert.triggeredAt,
    });
  }
}

/**
 * Utility functions for external use
 */

/**
 * Get the global alert system instance
 */
export function getRedisAlertSystem(): RedisAlertSystem {
  return RedisAlertSystem.getInstance();
}

/**
 * Subscribe to Redis alerts
 */
export function subscribeToRedisAlerts(subscriber: AlertSubscriber): void {
  RedisAlertSystem.getInstance().subscribe(subscriber);
}

/**
 * Get active Redis alerts
 */
export function getActiveRedisAlerts(severityFilter?: string[], typeFilter?: string[]): AlertItem[] {
  return RedisAlertSystem.getInstance().getActiveAlerts(severityFilter, typeFilter);
}

/**
 * Get Redis alert statistics
 */
export function getRedisAlertStats() {
  return RedisAlertSystem.getInstance().getAlertStats();
}

/**
 * Acknowledge a Redis alert
 */
export function acknowledgeRedisAlert(alertId: string, acknowledgedBy: string, notes?: string): boolean {
  return RedisAlertSystem.getInstance().acknowledgeAlert(alertId, acknowledgedBy, notes);
}

/**
 * Resolve a Redis alert
 */
export function resolveRedisAlert(alertId: string, resolvedBy: string, notes?: string): boolean {
  return RedisAlertSystem.getInstance().resolveAlert(alertId, resolvedBy, notes);
}
