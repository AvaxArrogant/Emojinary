/**
 * Redis Method Compatibility Validator
 * 
 * Provides comprehensive validation utilities for Redis method compatibility,
 * method substitution validation, and compatibility checking functions.
 */

import type {
  CompatibilityCheckResult,
  ValidationWarning,
  MethodUsageAnalysis,
  RedisCompatibilityReport,
  CompatibilityIssue,
  RecommendationItem,
  AlertItem,
  PerformanceImpactAnalysis,
} from '../../shared/types/redisCompatibility.js';

import {
  REDIS_COMPATIBILITY_CONFIG,
  getMethodConfig,
  isMethodSupported,
  isMethodUnsupported,
  getMethodSubstitution,
  getValidationRules,
} from './redisCompatibilityConfig.js';

import { RedisOperationLogger } from './redisMonitoring.js';

/**
 * Redis Compatibility Validator Class
 * 
 * Provides comprehensive validation and analysis of Redis method compatibility
 */
export class RedisCompatibilityValidator {
  private static instance: RedisCompatibilityValidator;
  private logger: RedisOperationLogger;
  private validationCache: Map<string, CompatibilityCheckResult> = new Map();
  private usageAnalysisCache: Map<string, MethodUsageAnalysis> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly cacheValidityPeriod = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.logger = RedisOperationLogger.getInstance();
  }

  public static getInstance(): RedisCompatibilityValidator {
    if (!RedisCompatibilityValidator.instance) {
      RedisCompatibilityValidator.instance = new RedisCompatibilityValidator();
    }
    return RedisCompatibilityValidator.instance;
  }

  /**
   * Validate Redis method availability and compatibility (Requirement 1.3)
   */
  public validateMethod(method: string, parameters?: any): CompatibilityCheckResult {
    // Check cache first
    const cacheKey = `${method}_${JSON.stringify(parameters) || ''}`;
    if (this.validationCache.has(cacheKey) && this.isCacheValid()) {
      return this.validationCache.get(cacheKey)!;
    }

    const methodConfig = getMethodConfig(method);
    const substitution = getMethodSubstitution(method);
    const validationWarnings = this.runValidationRules(method, parameters);

    const result: CompatibilityCheckResult = {
      method,
      isSupported: isMethodSupported(method),
      isKnownUnsupported: isMethodUnsupported(method),
      riskLevel: methodConfig?.riskLevel || 'medium',
      devvitStatus: methodConfig?.devvitStatus || 'unknown',
      hasSubstitution: substitution !== null,
      ...(substitution && { substitution }),
      validationWarnings,
      recommendation: this.generateRecommendation(method, methodConfig, substitution, validationWarnings),
      shouldProceed: this.shouldProceedWithMethod(method, validationWarnings),
      requiresFallback: isMethodUnsupported(method) || validationWarnings.some(w => w.severity === 'critical'),
    };

    // Cache the result
    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Run validation rules against a method (Requirement 1.4)
   */
  private runValidationRules(method: string, parameters?: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const rules = getValidationRules();

    for (const rule of rules) {
      try {
        if (rule.condition(method, parameters)) {
          warnings.push({
            id: rule.id,
            severity: rule.severity,
            message: rule.message,
            recommendation: rule.recommendation,
            category: rule.category,
          });
        }
      } catch (error) {
        console.error(`Error running validation rule ${rule.id}:`, error);
        warnings.push({
          id: 'validation_error',
          severity: 'warning',
          message: `Validation rule ${rule.id} failed to execute`,
          recommendation: 'Check validation rule implementation',
          category: 'compatibility',
        });
      }
    }

    return warnings;
  }

  /**
   * Generate recommendation based on validation results
   */
  private generateRecommendation(
    method: string,
    methodConfig: any,
    substitution: any,
    warnings: ValidationWarning[]
  ): string {
    if (isMethodSupported(method)) {
      if (warnings.length === 0) {
        return `Method '${method}' is fully supported in Devvit and can be used safely.`;
      } else {
        const criticalWarnings = warnings.filter(w => w.severity === 'critical' || w.severity === 'error');
        if (criticalWarnings.length > 0) {
          return `Method '${method}' is supported but has critical issues. ${criticalWarnings[0]?.recommendation || ''}`;
        } else {
          return `Method '${method}' is supported but consider the warnings. ${warnings[0]?.recommendation || ''}`;
        }
      }
    }

    if (isMethodUnsupported(method)) {
      if (substitution) {
        return `Method '${method}' is not supported in Devvit. Use ${substitution.alternativeMethod} with ${substitution.implementationStrategy} strategy. ${methodConfig?.alternative || ''}`;
      } else {
        return `Method '${method}' is not supported in Devvit and has no direct alternative. ${methodConfig?.alternative || 'Consider redesigning the feature.'}`;
      }
    }

    return `Method '${method}' support is unknown in Devvit. Proceed with caution and implement error handling.`;
  }

  /**
   * Determine if method execution should proceed
   */
  private shouldProceedWithMethod(method: string, warnings: ValidationWarning[]): boolean {
    // Don't proceed if there are critical warnings
    if (warnings.some(w => w.severity === 'critical')) {
      return false;
    }

    // Don't proceed with unsupported methods unless they have substitutions
    if (isMethodUnsupported(method)) {
      return getMethodSubstitution(method) !== null;
    }

    // Proceed with supported methods even if there are warnings
    return isMethodSupported(method);
  }

  /**
   * Analyze method usage patterns (Requirement 6.1)
   */
  public analyzeMethodUsage(method: string): MethodUsageAnalysis {
    // Check cache first
    if (this.usageAnalysisCache.has(method) && this.isCacheValid()) {
      return this.usageAnalysisCache.get(method)!;
    }

    const recentMetrics = this.logger.getOperationMetrics(method, 100);
    const totalUsage = recentMetrics.length;
    const successfulOperations = recentMetrics.filter(m => m.success).length;
    const failedOperations = recentMetrics.filter(m => !m.success).length;
    const compatibilityIssues = recentMetrics.filter(m => m.compatibility.compatibilityIssue).length;
    const fallbackUsage = recentMetrics.filter(m => m.compatibility.fallbackUsed).length;

    const successRate = totalUsage > 0 ? (successfulOperations / totalUsage) * 100 : 0;
    const averageResponseTime = totalUsage > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalUsage 
      : 0;

    const lastUsed = recentMetrics.length > 0 
      ? Math.max(...recentMetrics.map(m => m.endTime))
      : 0;

    const riskAssessment = this.assessMethodRisk(method, successRate, compatibilityIssues, fallbackUsage);
    const recommendations = this.generateUsageRecommendations(method, successRate, averageResponseTime, compatibilityIssues);

    const analysis: MethodUsageAnalysis = {
      method,
      usageCount: totalUsage,
      successRate,
      averageResponseTime,
      errorCount: failedOperations,
      lastUsed,
      compatibilityIssues,
      fallbackUsageCount: fallbackUsage,
      riskAssessment,
      recommendations,
    };

    // Cache the analysis
    this.usageAnalysisCache.set(method, analysis);
    return analysis;
  }

  /**
   * Assess risk level for method usage
   */
  private assessMethodRisk(
    method: string,
    successRate: number,
    compatibilityIssues: number,
    fallbackUsage: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const methodConfig = getMethodConfig(method);
    const baseRisk = methodConfig?.riskLevel || 'medium';

    // Escalate risk based on runtime behavior
    if (successRate < 50 || compatibilityIssues > 10) {
      return 'critical';
    }
    if (successRate < 80 || compatibilityIssues > 5 || fallbackUsage > 5) {
      return 'high';
    }
    if (successRate < 95 || compatibilityIssues > 0 || fallbackUsage > 0) {
      return 'medium';
    }

    return baseRisk as 'low' | 'medium' | 'high' | 'critical';
  }

  /**
   * Generate usage-based recommendations
   */
  private generateUsageRecommendations(
    method: string,
    successRate: number,
    averageResponseTime: number,
    compatibilityIssues: number
  ): string[] {
    const recommendations: string[] = [];

    if (successRate < 80) {
      recommendations.push(`Low success rate (${successRate.toFixed(1)}%) - investigate error causes and implement better error handling`);
    }

    if (averageResponseTime > 1000) {
      recommendations.push(`Slow response times (${averageResponseTime.toFixed(0)}ms) - consider caching or query optimization`);
    }

    if (compatibilityIssues > 0) {
      recommendations.push(`${compatibilityIssues} compatibility issues detected - review method usage and implement alternatives`);
    }

    if (isMethodUnsupported(method)) {
      const substitution = getMethodSubstitution(method);
      if (substitution) {
        recommendations.push(`Replace with ${substitution.alternativeMethod} using ${substitution.implementationStrategy} strategy`);
      } else {
        recommendations.push('Method is unsupported - consider redesigning feature to avoid this operation');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Method usage appears healthy - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Generate comprehensive compatibility report (Requirement 6.2)
   */
  public generateCompatibilityReport(): RedisCompatibilityReport {
    const stats = this.logger.getPerformanceStats();
    const healthStatus = this.logger.getHealthStatus();
    const validationStats = this.logger.getMethodValidationStats();

    // Analyze all methods that have been used
    const recentMetrics = this.logger.getRecentMetrics(200);
    const usedMethods = [...new Set(recentMetrics.map(m => m.method))];
    const methodAnalyses = usedMethods.map(method => this.analyzeMethodUsage(method));

    // Calculate compatibility score (0-100)
    const compatibilityScore = this.calculateCompatibilityScore(methodAnalyses, stats);

    // Determine overall risk level
    const overallRiskLevel = this.determineOverallRiskLevel(methodAnalyses);

    // Generate compatibility issues
    const compatibilityIssues = this.generateCompatibilityIssues(recentMetrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(methodAnalyses, healthStatus);

    // Generate alerts
    const alerts = this.generateAlerts(stats, healthStatus, methodAnalyses);

    // Analyze performance impact
    const performanceImpact = this.analyzePerformanceImpact(methodAnalyses, stats);

    return {
      timestamp: new Date().toISOString(),
      environment: REDIS_COMPATIBILITY_CONFIG.environment,
      summary: {
        totalMethodsChecked: usedMethods.length,
        supportedMethodsUsed: validationStats.supportedMethodsUsed.length,
        unsupportedMethodsAttempted: validationStats.unsupportedMethodsAttempted.length,
        unknownMethodsUsed: validationStats.unknownMethodsAttempted.length,
        compatibilityScore,
        overallRiskLevel,
      },
      methodAnalysis: methodAnalyses,
      compatibilityIssues,
      recommendations,
      alertsTriggered: alerts,
      performanceImpact,
    };
  }

  /**
   * Calculate overall compatibility score (0-100)
   */
  private calculateCompatibilityScore(analyses: MethodUsageAnalysis[], stats: any): number {
    if (analyses.length === 0) return 100;

    let totalScore = 0;
    let weightedCount = 0;

    for (const analysis of analyses) {
      const weight = analysis.usageCount; // Weight by usage frequency
      let methodScore = 100;

      // Deduct points for issues
      if (analysis.riskAssessment === 'critical') methodScore -= 50;
      else if (analysis.riskAssessment === 'high') methodScore -= 30;
      else if (analysis.riskAssessment === 'medium') methodScore -= 15;

      methodScore -= Math.min(analysis.compatibilityIssues * 5, 25); // Max 25 points for compatibility issues
      methodScore -= Math.min((100 - analysis.successRate), 20); // Max 20 points for low success rate

      totalScore += methodScore * weight;
      weightedCount += weight;
    }

    return weightedCount > 0 ? Math.max(0, Math.min(100, totalScore / weightedCount)) : 100;
  }

  /**
   * Determine overall risk level
   */
  private determineOverallRiskLevel(analyses: MethodUsageAnalysis[]): 'low' | 'medium' | 'high' | 'critical' {
    if (analyses.some(a => a.riskAssessment === 'critical')) return 'critical';
    if (analyses.some(a => a.riskAssessment === 'high')) return 'high';
    if (analyses.some(a => a.riskAssessment === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Generate compatibility issues from metrics
   */
  private generateCompatibilityIssues(metrics: any[]): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];
    const issueMap = new Map<string, any>();

    // Group issues by method and type
    for (const metric of metrics) {
      if (metric.compatibility.compatibilityIssue) {
        const key = `${metric.method}_${metric.compatibility.compatibilityIssue}`;
        if (!issueMap.has(key)) {
          issueMap.set(key, {
            method: metric.method,
            issue: metric.compatibility.compatibilityIssue,
            count: 0,
            firstOccurrence: metric.endTime,
            lastOccurrence: metric.endTime,
          });
        }
        const issue = issueMap.get(key);
        issue.count++;
        issue.lastOccurrence = Math.max(issue.lastOccurrence, metric.endTime);
        issue.firstOccurrence = Math.min(issue.firstOccurrence, metric.endTime);
      }
    }

    // Convert to compatibility issues
    let issueId = 1;
    for (const [, data] of issueMap) {
      issues.push({
        id: `issue_${issueId++}`,
        method: data.method,
        issueType: 'unsupported_method',
        severity: isMethodUnsupported(data.method) ? 'error' : 'warning',
        description: `Redis method '${data.method}' compatibility issue: ${data.issue}`,
        occurrenceCount: data.count,
        firstOccurrence: new Date(data.firstOccurrence).toISOString(),
        lastOccurrence: new Date(data.lastOccurrence).toISOString(),
        impact: `Method failed ${data.count} times, potentially affecting application functionality`,
        resolution: getMethodSubstitution(data.method) 
          ? `Implement ${getMethodSubstitution(data.method)?.alternativeMethod} alternative`
          : 'Redesign feature to avoid this method',
        status: 'open',
      });
    }

    return issues;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(analyses: MethodUsageAnalysis[], healthStatus: any): RecommendationItem[] {
    const recommendations: RecommendationItem[] = [];
    let recId = 1;

    // Method-specific recommendations
    for (const analysis of analyses) {
      if (analysis.riskAssessment === 'critical' || analysis.riskAssessment === 'high') {
        const recommendation: RecommendationItem = {
          id: `rec_${recId++}`,
          category: 'compatibility',
          priority: analysis.riskAssessment === 'critical' ? 'critical' : 'high',
          title: `Address ${analysis.method} compatibility issues`,
          description: `Method '${analysis.method}' has ${analysis.compatibilityIssues} compatibility issues and ${analysis.successRate.toFixed(1)}% success rate`,
          actionRequired: analysis.recommendations.join('; '),
          estimatedEffort: isMethodUnsupported(analysis.method) ? 'medium' : 'low',
          expectedBenefit: 'Improved reliability and reduced error rates',
        };
        
        const implementationGuide = getMethodSubstitution(analysis.method)?.example;
        if (implementationGuide) {
          recommendation.implementationGuide = implementationGuide;
        }
        
        recommendations.push(recommendation);
      }
    }

    // Performance recommendations
    if (healthStatus.averageResponseTime > 500) {
      recommendations.push({
        id: `rec_${recId++}`,
        category: 'performance',
        priority: healthStatus.averageResponseTime > 1000 ? 'high' : 'medium',
        title: 'Optimize Redis operation performance',
        description: `Average response time is ${healthStatus.averageResponseTime}ms, which may impact user experience`,
        actionRequired: 'Implement caching, optimize queries, or reduce operation frequency',
        estimatedEffort: 'medium',
        expectedBenefit: 'Faster response times and better user experience',
      });
    }

    // Error rate recommendations
    if (healthStatus.errorRate > 5) {
      recommendations.push({
        id: `rec_${recId++}`,
        category: 'compatibility',
        priority: healthStatus.errorRate > 15 ? 'critical' : 'high',
        title: 'Reduce Redis operation error rate',
        description: `Current error rate is ${healthStatus.errorRate.toFixed(1)}%, indicating reliability issues`,
        actionRequired: 'Implement better error handling, fallback mechanisms, and method alternatives',
        estimatedEffort: 'high',
        expectedBenefit: 'Improved application stability and reliability',
      });
    }

    return recommendations;
  }

  /**
   * Generate alerts based on current status
   */
  private generateAlerts(_stats: any, healthStatus: any, analyses: MethodUsageAnalysis[]): AlertItem[] {
    const alerts: AlertItem[] = [];
    let alertId = 1;

    // Critical method usage alerts
    const criticalMethods = analyses.filter(a => a.riskAssessment === 'critical');
    if (criticalMethods.length > 0) {
      alerts.push({
        id: `alert_${alertId++}`,
        type: 'compatibility',
        severity: 'critical',
        title: 'Critical Redis compatibility issues detected',
        description: `${criticalMethods.length} methods have critical compatibility issues`,
        triggeredAt: new Date().toISOString(),
        threshold: 0,
        actualValue: criticalMethods.length,
        affectedMethods: criticalMethods.map(m => m.method),
        recommendedAction: 'Immediately implement alternatives for critical methods',
        status: 'active',
      });
    }

    // High error rate alert
    if (healthStatus.errorRate > REDIS_COMPATIBILITY_CONFIG.alertThresholds.errorRate.critical) {
      alerts.push({
        id: `alert_${alertId++}`,
        type: 'error_rate',
        severity: 'critical',
        title: 'High Redis error rate detected',
        description: `Error rate (${healthStatus.errorRate.toFixed(1)}%) exceeds critical threshold`,
        triggeredAt: new Date().toISOString(),
        threshold: REDIS_COMPATIBILITY_CONFIG.alertThresholds.errorRate.critical,
        actualValue: healthStatus.errorRate,
        affectedMethods: [],
        recommendedAction: 'Investigate error causes and implement fallback mechanisms',
        status: 'active',
      });
    }

    // Performance alert
    if (healthStatus.averageResponseTime > REDIS_COMPATIBILITY_CONFIG.alertThresholds.responseTime.critical) {
      alerts.push({
        id: `alert_${alertId++}`,
        type: 'performance',
        severity: 'critical',
        title: 'Slow Redis response times detected',
        description: `Average response time (${healthStatus.averageResponseTime}ms) exceeds critical threshold`,
        triggeredAt: new Date().toISOString(),
        threshold: REDIS_COMPATIBILITY_CONFIG.alertThresholds.responseTime.critical,
        actualValue: healthStatus.averageResponseTime,
        affectedMethods: analyses.filter(a => a.averageResponseTime > 1000).map(a => a.method),
        recommendedAction: 'Optimize queries and implement caching strategies',
        status: 'active',
      });
    }

    return alerts;
  }

  /**
   * Analyze performance impact of compatibility issues
   */
  private analyzePerformanceImpact(analyses: MethodUsageAnalysis[], stats: any): PerformanceImpactAnalysis {
    const fallbackOperations = analyses.reduce((sum, a) => sum + a.fallbackUsageCount, 0);
    const totalOperations = stats.totalOperations || 1;
    const fallbackPercentage = (fallbackOperations / totalOperations) * 100;

    // Calculate response time increase due to fallbacks
    const normalOperations = analyses.filter(a => a.fallbackUsageCount === 0);
    const fallbackAffectedOperations = analyses.filter(a => a.fallbackUsageCount > 0);
    
    const normalAvgTime = normalOperations.length > 0 
      ? normalOperations.reduce((sum, a) => sum + a.averageResponseTime, 0) / normalOperations.length 
      : 0;
    const fallbackAvgTime = fallbackAffectedOperations.length > 0 
      ? fallbackAffectedOperations.reduce((sum, a) => sum + a.averageResponseTime, 0) / fallbackAffectedOperations.length 
      : 0;

    const responseTimeIncrease = normalAvgTime > 0 ? ((fallbackAvgTime - normalAvgTime) / normalAvgTime) * 100 : 0;

    // Determine overall impact
    let overallImpact: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe' = 'none';
    if (fallbackPercentage > 50 || responseTimeIncrease > 100) overallImpact = 'severe';
    else if (fallbackPercentage > 25 || responseTimeIncrease > 50) overallImpact = 'significant';
    else if (fallbackPercentage > 10 || responseTimeIncrease > 25) overallImpact = 'moderate';
    else if (fallbackPercentage > 0 || responseTimeIncrease > 0) overallImpact = 'minimal';

    return {
      overallImpact,
      responseTimeIncrease: Math.max(0, responseTimeIncrease),
      throughputDecrease: Math.min(fallbackPercentage, 100), // Approximate throughput impact
      fallbackOperationsPercentage: fallbackPercentage,
      mostImpactedOperations: analyses
        .filter(a => a.fallbackUsageCount > 0)
        .map(a => ({
          method: a.method,
          impact: a.averageResponseTime > 2000 ? 'severe' as const :
                  a.averageResponseTime > 1000 ? 'significant' as const :
                  a.averageResponseTime > 500 ? 'moderate' as const :
                  'minimal' as const,
          responseTimeIncrease: Math.max(0, ((a.averageResponseTime - normalAvgTime) / normalAvgTime) * 100),
          fallbackUsageRate: (a.fallbackUsageCount / a.usageCount) * 100,
        }))
        .sort((a, b) => b.responseTimeIncrease - a.responseTimeIncrease)
        .slice(0, 5),
      recommendations: this.generatePerformanceRecommendations(overallImpact, fallbackPercentage, responseTimeIncrease),
    };
  }

  /**
   * Generate performance-specific recommendations
   */
  private generatePerformanceRecommendations(
    impact: string,
    fallbackPercentage: number,
    responseTimeIncrease: number
  ): string[] {
    const recommendations: string[] = [];

    if (impact === 'severe' || impact === 'significant') {
      recommendations.push('Critical: Implement caching layer to reduce Redis operation frequency');
      recommendations.push('Replace unsupported methods with optimized alternatives');
    }

    if (fallbackPercentage > 25) {
      recommendations.push('High fallback usage detected - optimize method implementations');
    }

    if (responseTimeIncrease > 50) {
      recommendations.push('Significant response time degradation - review query patterns and implement batching');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance impact is acceptable - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheValidityPeriod;
  }

  /**
   * Clear validation cache
   */
  public clearCache(): void {
    this.validationCache.clear();
    this.usageAnalysisCache.clear();
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Get validation statistics
   */
  public getValidationStats(): {
    cacheSize: number;
    cacheHitRate: number;
    lastCacheUpdate: string;
    validationRulesCount: number;
    supportedMethodsCount: number;
    unsupportedMethodsCount: number;
  } {
    return {
      cacheSize: this.validationCache.size,
      cacheHitRate: 0, // Would need to track hits/misses to calculate
      lastCacheUpdate: new Date(this.lastCacheUpdate).toISOString(),
      validationRulesCount: getValidationRules().length,
      supportedMethodsCount: Object.keys(REDIS_COMPATIBILITY_CONFIG.supportedMethods).length,
      unsupportedMethodsCount: Object.keys(REDIS_COMPATIBILITY_CONFIG.unsupportedMethods).length,
    };
  }
}

/**
 * Utility functions for external use
 */

/**
 * Validate a Redis method and get compatibility information (Requirement 1.3, 1.4)
 */
export function validateRedisMethod(method: string, parameters?: any): CompatibilityCheckResult {
  return RedisCompatibilityValidator.getInstance().validateMethod(method, parameters);
}

/**
 * Analyze usage patterns for a specific method (Requirement 6.1)
 */
export function analyzeRedisMethodUsage(method: string): MethodUsageAnalysis {
  return RedisCompatibilityValidator.getInstance().analyzeMethodUsage(method);
}

/**
 * Generate comprehensive compatibility report (Requirement 6.2)
 */
export function generateRedisCompatibilityReport(): RedisCompatibilityReport {
  return RedisCompatibilityValidator.getInstance().generateCompatibilityReport();
}

/**
 * Get validation statistics
 */
export function getValidationStats() {
  return RedisCompatibilityValidator.getInstance().getValidationStats();
}

/**
 * Clear validation cache
 */
export function clearValidationCache(): void {
  RedisCompatibilityValidator.getInstance().clearCache();
}
