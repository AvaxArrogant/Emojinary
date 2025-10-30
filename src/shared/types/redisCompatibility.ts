/**
 * Redis Compatibility Configuration and Types
 * 
 * Defines configuration for Redis method compatibility checking,
 * method substitution mapping, and compatibility validation utilities.
 */

// ============================================================================
// REDIS METHOD COMPATIBILITY CONFIGURATION
// ============================================================================

export interface RedisMethodConfig {
  method: string;
  isSupported: boolean;
  category: 'string' | 'hash' | 'list' | 'set' | 'sorted_set' | 'generic' | 'stream' | 'geo';
  description: string;
  alternative?: string;
  substitution?: RedisMethodSubstitution;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  devvitStatus: 'supported' | 'unsupported' | 'unknown' | 'deprecated';
}

export interface RedisMethodSubstitution {
  alternativeMethod: string;
  implementationStrategy: 'direct_replacement' | 'algorithm_based' | 'multi_step' | 'cached_fallback';
  description: string;
  performanceImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  accuracyLevel: 'exact' | 'approximate' | 'best_effort';
  example?: string;
}

export interface RedisCompatibilityConfig {
  version: string;
  lastUpdated: string;
  environment: 'devvit' | 'standard_redis' | 'redis_cloud' | 'elasticache';
  supportedMethods: Record<string, RedisMethodConfig>;
  unsupportedMethods: Record<string, RedisMethodConfig>;
  methodSubstitutions: Record<string, RedisMethodSubstitution>;
  validationRules: RedisValidationRule[];
  alertThresholds: RedisAlertThresholds;
}

export interface RedisValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'compatibility' | 'performance' | 'security' | 'best_practice';
  severity: 'info' | 'warning' | 'error' | 'critical';
  condition: (method: string, parameters?: any) => boolean;
  message: string;
  recommendation: string;
}

export interface RedisAlertThresholds {
  errorRate: {
    warning: number; // percentage
    critical: number; // percentage
  };
  responseTime: {
    warning: number; // milliseconds
    critical: number; // milliseconds
  };
  compatibilityIssues: {
    warning: number; // count per hour
    critical: number; // count per hour
  };
  unsupportedMethodUsage: {
    warning: number; // count per hour
    critical: number; // count per hour
  };
}

// ============================================================================
// COMPATIBILITY CHECK RESULTS
// ============================================================================

export interface CompatibilityCheckResult {
  method: string;
  isSupported: boolean;
  isKnownUnsupported: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  devvitStatus: 'supported' | 'unsupported' | 'unknown' | 'deprecated';
  hasSubstitution: boolean;
  substitution?: RedisMethodSubstitution;
  validationWarnings: ValidationWarning[];
  recommendation: string;
  shouldProceed: boolean;
  requiresFallback: boolean;
}

export interface ValidationWarning {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  recommendation: string;
  category: 'compatibility' | 'performance' | 'security' | 'best_practice';
}

export interface MethodUsageAnalysis {
  method: string;
  usageCount: number;
  successRate: number;
  averageResponseTime: number;
  errorCount: number;
  lastUsed: number;
  compatibilityIssues: number;
  fallbackUsageCount: number;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

// ============================================================================
// REDIS COMPATIBILITY REPORT TYPES
// ============================================================================

export interface RedisCompatibilityReport {
  timestamp: string;
  environment: string;
  summary: {
    totalMethodsChecked: number;
    supportedMethodsUsed: number;
    unsupportedMethodsAttempted: number;
    unknownMethodsUsed: number;
    compatibilityScore: number; // 0-100
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  methodAnalysis: MethodUsageAnalysis[];
  compatibilityIssues: CompatibilityIssue[];
  recommendations: RecommendationItem[];
  alertsTriggered: AlertItem[];
  performanceImpact: PerformanceImpactAnalysis;
}

export interface CompatibilityIssue {
  id: string;
  method: string;
  issueType: 'unsupported_method' | 'performance_degradation' | 'accuracy_loss' | 'fallback_failure';
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  occurrenceCount: number;
  firstOccurrence: string;
  lastOccurrence: string;
  impact: string;
  resolution: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'ignored';
}

export interface RecommendationItem {
  id: string;
  category: 'compatibility' | 'performance' | 'security' | 'best_practice';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionRequired: string;
  estimatedEffort: 'minimal' | 'low' | 'medium' | 'high';
  expectedBenefit: string;
  implementationGuide?: string;
}

export interface AlertItem {
  id: string;
  type: 'compatibility' | 'performance' | 'error_rate' | 'method_usage';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  triggeredAt: string;
  threshold: number;
  actualValue: number;
  affectedMethods: string[];
  recommendedAction: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

export interface PerformanceImpactAnalysis {
  overallImpact: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
  responseTimeIncrease: number; // percentage
  throughputDecrease: number; // percentage
  fallbackOperationsPercentage: number;
  mostImpactedOperations: Array<{
    method: string;
    impact: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
    responseTimeIncrease: number;
    fallbackUsageRate: number;
  }>;
  recommendations: string[];
}

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

export const REDIS_COMPATIBILITY_VERSION = '1.0.0';

export const DEFAULT_ALERT_THRESHOLDS: RedisAlertThresholds = {
  errorRate: {
    warning: 5, // 5%
    critical: 15, // 15%
  },
  responseTime: {
    warning: 500, // 500ms
    critical: 2000, // 2000ms
  },
  compatibilityIssues: {
    warning: 10, // 10 per hour
    critical: 50, // 50 per hour
  },
  unsupportedMethodUsage: {
    warning: 5, // 5 per hour
    critical: 20, // 20 per hour
  },
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type RedisMethodCategory = 'string' | 'hash' | 'list' | 'set' | 'sorted_set' | 'generic' | 'stream' | 'geo';
export type DevvitStatus = 'supported' | 'unsupported' | 'unknown' | 'deprecated';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ImplementationStrategy = 'direct_replacement' | 'algorithm_based' | 'multi_step' | 'cached_fallback';
export type PerformanceImpact = 'none' | 'minimal' | 'moderate' | 'significant';
export type AccuracyLevel = 'exact' | 'approximate' | 'best_effort';
