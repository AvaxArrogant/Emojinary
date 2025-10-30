/**
 * Redis Compatibility Configuration for Devvit Environment
 * 
 * Comprehensive configuration defining supported vs unsupported Redis methods,
 * method substitution mappings, and validation rules for Devvit compatibility.
 */

import type {
  RedisCompatibilityConfig,
  RedisMethodConfig,
  RedisMethodSubstitution,
  RedisValidationRule,
} from '../../shared/types/redisCompatibility.js';
import { DEFAULT_ALERT_THRESHOLDS } from '../../shared/types/redisCompatibility.js';

// ============================================================================
// DEVVIT SUPPORTED REDIS METHODS CONFIGURATION
// ============================================================================

const SUPPORTED_METHODS: Record<string, RedisMethodConfig> = {
  // String operations
  'get': {
    method: 'get',
    isSupported: true,
    category: 'string',
    description: 'Get the value of a key',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
  'set': {
    method: 'set',
    isSupported: true,
    category: 'string',
    description: 'Set the string value of a key',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
  'incrBy': {
    method: 'incrBy',
    isSupported: true,
    category: 'string',
    description: 'Increment the integer value of a key by the given amount',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },

  // Hash operations
  'hGet': {
    method: 'hGet',
    isSupported: true,
    category: 'hash',
    description: 'Get the value of a hash field',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
  'hSet': {
    method: 'hSet',
    isSupported: true,
    category: 'hash',
    description: 'Set the string value of a hash field',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
  'hGetAll': {
    method: 'hGetAll',
    isSupported: true,
    category: 'hash',
    description: 'Get all the fields and values in a hash',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
  'hDel': {
    method: 'hDel',
    isSupported: true,
    category: 'hash',
    description: 'Delete one or more hash fields',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },

  // Sorted set operations
  'zAdd': {
    method: 'zAdd',
    isSupported: true,
    category: 'sorted_set',
    description: 'Add one or more members to a sorted set, or update its score if it already exists',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
  'zRange': {
    method: 'zRange',
    isSupported: true,
    category: 'sorted_set',
    description: 'Return a range of members in a sorted set, by index',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
  'zRangeByScore': {
    method: 'zRangeByScore',
    isSupported: true,
    category: 'sorted_set',
    description: 'Return a range of members in a sorted set, by score',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
  'zScore': {
    method: 'zScore',
    isSupported: true,
    category: 'sorted_set',
    description: 'Get the score associated with the given member in a sorted set',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
  'zCard': {
    method: 'zCard',
    isSupported: true,
    category: 'sorted_set',
    description: 'Get the number of members in a sorted set',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
  'zRem': {
    method: 'zRem',
    isSupported: true,
    category: 'sorted_set',
    description: 'Remove one or more members from a sorted set',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },

  // Generic operations
  'del': {
    method: 'del',
    isSupported: true,
    category: 'generic',
    description: 'Delete a key',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
  'exists': {
    method: 'exists',
    isSupported: true,
    category: 'generic',
    description: 'Determine if a key exists',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
  'expire': {
    method: 'expire',
    isSupported: true,
    category: 'generic',
    description: 'Set a key\'s time to live in seconds',
    riskLevel: 'low',
    devvitStatus: 'supported',
  },
};

// ============================================================================
// DEVVIT UNSUPPORTED REDIS METHODS CONFIGURATION
// ============================================================================

const UNSUPPORTED_METHODS: Record<string, RedisMethodConfig> = {
  // Sorted set operations that are not supported
  'zRevRank': {
    method: 'zRevRank',
    isSupported: false,
    category: 'sorted_set',
    description: 'Determine the index of a member in a sorted set, with scores ordered from high to low',
    alternative: 'Use zRange with sorting to calculate rank position',
    riskLevel: 'high',
    devvitStatus: 'unsupported',
    substitution: {
      alternativeMethod: 'zRange',
      implementationStrategy: 'algorithm_based',
      description: 'Calculate rank by retrieving all members and finding position',
      performanceImpact: 'moderate',
      accuracyLevel: 'exact',
      example: 'const allMembers = await redis.zRange(key, 0, -1); const rank = allMembers.findIndex(m => m.member === username) + 1;',
    },
  },
  'zRank': {
    method: 'zRank',
    isSupported: false,
    category: 'sorted_set',
    description: 'Determine the index of a member in a sorted set',
    alternative: 'Use zRange with sorting to calculate rank position',
    riskLevel: 'high',
    devvitStatus: 'unsupported',
    substitution: {
      alternativeMethod: 'zRange',
      implementationStrategy: 'algorithm_based',
      description: 'Calculate rank by retrieving all members and finding position',
      performanceImpact: 'moderate',
      accuracyLevel: 'exact',
      example: 'const allMembers = await redis.zRange(key, 0, -1, {REV: false}); const rank = allMembers.findIndex(m => m.member === username) + 1;',
    },
  },
  'zRevRange': {
    method: 'zRevRange',
    isSupported: false,
    category: 'sorted_set',
    description: 'Return a range of members in a sorted set, by index, with scores ordered from high to low',
    alternative: 'Use zRange with REV option for reverse ordering',
    riskLevel: 'medium',
    devvitStatus: 'unsupported',
    substitution: {
      alternativeMethod: 'zRange',
      implementationStrategy: 'direct_replacement',
      description: 'Use zRange with REV: true option',
      performanceImpact: 'none',
      accuracyLevel: 'exact',
      example: 'await redis.zRange(key, start, stop, {REV: true})',
    },
  },
  'zCount': {
    method: 'zCount',
    isSupported: false,
    category: 'sorted_set',
    description: 'Count the members in a sorted set with scores within the given values',
    alternative: 'Use zRangeByScore to count elements in score range',
    riskLevel: 'medium',
    devvitStatus: 'unsupported',
    substitution: {
      alternativeMethod: 'zRangeByScore',
      implementationStrategy: 'algorithm_based',
      description: 'Retrieve members in score range and count them',
      performanceImpact: 'minimal',
      accuracyLevel: 'exact',
      example: 'const members = await redis.zRangeByScore(key, min, max); return members.length;',
    },
  },

  // List operations (commonly unsupported in Devvit)
  'lPush': {
    method: 'lPush',
    isSupported: false,
    category: 'list',
    description: 'Prepend one or multiple values to a list',
    alternative: 'Use hash or sorted set for ordered data storage',
    riskLevel: 'high',
    devvitStatus: 'unsupported',
  },
  'lPop': {
    method: 'lPop',
    isSupported: false,
    category: 'list',
    description: 'Remove and get the first element in a list',
    alternative: 'Use hash with index tracking for list-like behavior',
    riskLevel: 'high',
    devvitStatus: 'unsupported',
  },
  'lRange': {
    method: 'lRange',
    isSupported: false,
    category: 'list',
    description: 'Get a range of elements from a list',
    alternative: 'Use sorted set with index-based scores',
    riskLevel: 'high',
    devvitStatus: 'unsupported',
  },

  // Set operations (commonly unsupported in Devvit)
  'sAdd': {
    method: 'sAdd',
    isSupported: false,
    category: 'set',
    description: 'Add one or more members to a set',
    alternative: 'Use hash with boolean values or sorted set with same scores',
    riskLevel: 'medium',
    devvitStatus: 'unsupported',
  },
  'sMembers': {
    method: 'sMembers',
    isSupported: false,
    category: 'set',
    description: 'Get all the members in a set',
    alternative: 'Use hash keys or sorted set members',
    riskLevel: 'medium',
    devvitStatus: 'unsupported',
  },

  // Stream operations (not supported in Devvit)
  'xAdd': {
    method: 'xAdd',
    isSupported: false,
    category: 'stream',
    description: 'Appends a new entry to a stream',
    alternative: 'Use sorted set with timestamp scores for time-ordered data',
    riskLevel: 'critical',
    devvitStatus: 'unsupported',
  },
  'xRead': {
    method: 'xRead',
    isSupported: false,
    category: 'stream',
    description: 'Read data from one or multiple streams',
    alternative: 'Use sorted set with timestamp-based queries',
    riskLevel: 'critical',
    devvitStatus: 'unsupported',
  },

  // Pub/Sub operations (not supported in Devvit)
  'publish': {
    method: 'publish',
    isSupported: false,
    category: 'generic',
    description: 'Post a message to a channel',
    alternative: 'Use polling with Redis keys for message passing',
    riskLevel: 'critical',
    devvitStatus: 'unsupported',
  },
  'subscribe': {
    method: 'subscribe',
    isSupported: false,
    category: 'generic',
    description: 'Listen for messages published to channels',
    alternative: 'Use polling with Redis keys for message passing',
    riskLevel: 'critical',
    devvitStatus: 'unsupported',
  },
};

// ============================================================================
// METHOD SUBSTITUTION MAPPINGS
// ============================================================================

const METHOD_SUBSTITUTIONS: Record<string, RedisMethodSubstitution> = {
  'zRevRank': {
    alternativeMethod: 'zRange',
    implementationStrategy: 'algorithm_based',
    description: 'Calculate reverse rank by retrieving sorted members and finding position',
    performanceImpact: 'moderate',
    accuracyLevel: 'exact',
    example: `
// Original: const rank = await redis.zRevRank('leaderboard', 'username');
// Alternative:
const allMembers = await redis.zRange('leaderboard', 0, -1, {REV: true});
const rank = allMembers.findIndex(m => m.member === 'username') + 1;
    `,
  },
  'zRank': {
    alternativeMethod: 'zRange',
    implementationStrategy: 'algorithm_based',
    description: 'Calculate rank by retrieving sorted members and finding position',
    performanceImpact: 'moderate',
    accuracyLevel: 'exact',
    example: `
// Original: const rank = await redis.zRank('leaderboard', 'username');
// Alternative:
const allMembers = await redis.zRange('leaderboard', 0, -1);
const rank = allMembers.findIndex(m => m.member === 'username') + 1;
    `,
  },
  'zRevRange': {
    alternativeMethod: 'zRange',
    implementationStrategy: 'direct_replacement',
    description: 'Use zRange with REV option for reverse ordering',
    performanceImpact: 'none',
    accuracyLevel: 'exact',
    example: `
// Original: const members = await redis.zRevRange('leaderboard', 0, 9);
// Alternative:
const members = await redis.zRange('leaderboard', 0, 9, {REV: true});
    `,
  },
  'zCount': {
    alternativeMethod: 'zRangeByScore',
    implementationStrategy: 'algorithm_based',
    description: 'Count members by retrieving them in score range',
    performanceImpact: 'minimal',
    accuracyLevel: 'exact',
    example: `
// Original: const count = await redis.zCount('leaderboard', 100, 200);
// Alternative:
const members = await redis.zRangeByScore('leaderboard', 100, 200);
const count = members.length;
    `,
  },
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

const VALIDATION_RULES: RedisValidationRule[] = [
  {
    id: 'unsupported_method_check',
    name: 'Unsupported Method Detection',
    description: 'Detect usage of Redis methods not supported in Devvit',
    category: 'compatibility',
    severity: 'error',
    condition: (method: string) => Object.keys(UNSUPPORTED_METHODS).includes(method),
    message: 'This Redis method is not supported in Devvit environment',
    recommendation: 'Use the suggested alternative method or implement a compatible workaround',
  },
  {
    id: 'performance_impact_warning',
    name: 'Performance Impact Warning',
    description: 'Warn about methods that may have significant performance impact',
    category: 'performance',
    severity: 'warning',
    condition: (method: string) => {
      const substitution = METHOD_SUBSTITUTIONS[method];
      return substitution?.performanceImpact === 'significant' || substitution?.performanceImpact === 'moderate';
    },
    message: 'This method substitution may have performance implications',
    recommendation: 'Consider caching results or optimizing query patterns',
  },
  {
    id: 'accuracy_degradation_warning',
    name: 'Accuracy Degradation Warning',
    description: 'Warn about methods that may not provide exact results',
    category: 'compatibility',
    severity: 'warning',
    condition: (method: string) => {
      const substitution = METHOD_SUBSTITUTIONS[method];
      return substitution?.accuracyLevel === 'approximate' || substitution?.accuracyLevel === 'best_effort';
    },
    message: 'This method substitution may not provide exact results',
    recommendation: 'Verify that approximate results are acceptable for your use case',
  },
  {
    id: 'critical_operation_check',
    name: 'Critical Operation Check',
    description: 'Flag operations that are critical and have no good alternatives',
    category: 'compatibility',
    severity: 'critical',
    condition: (method: string) => {
      const methodConfig = UNSUPPORTED_METHODS[method];
      return methodConfig?.riskLevel === 'critical';
    },
    message: 'This operation is critical and has no direct alternative in Devvit',
    recommendation: 'Consider redesigning the feature to avoid this operation or use a different approach',
  },
  {
    id: 'deprecated_method_warning',
    name: 'Deprecated Method Warning',
    description: 'Warn about deprecated Redis methods',
    category: 'best_practice',
    severity: 'warning',
    condition: (method: string) => {
      const methodConfig = SUPPORTED_METHODS[method] || UNSUPPORTED_METHODS[method];
      return methodConfig?.devvitStatus === 'deprecated';
    },
    message: 'This Redis method is deprecated',
    recommendation: 'Migrate to the recommended alternative method',
  },
];

// ============================================================================
// MAIN CONFIGURATION OBJECT
// ============================================================================

export const REDIS_COMPATIBILITY_CONFIG: RedisCompatibilityConfig = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  environment: 'devvit',
  supportedMethods: SUPPORTED_METHODS,
  unsupportedMethods: UNSUPPORTED_METHODS,
  methodSubstitutions: METHOD_SUBSTITUTIONS,
  validationRules: VALIDATION_RULES,
  alertThresholds: DEFAULT_ALERT_THRESHOLDS,
};

// ============================================================================
// CONFIGURATION ACCESS FUNCTIONS
// ============================================================================

/**
 * Get configuration for a specific Redis method
 */
export function getMethodConfig(method: string): RedisMethodConfig | null {
  return SUPPORTED_METHODS[method] || UNSUPPORTED_METHODS[method] || null;
}

/**
 * Check if a method is supported in Devvit
 */
export function isMethodSupported(method: string): boolean {
  return SUPPORTED_METHODS.hasOwnProperty(method);
}

/**
 * Check if a method is known to be unsupported
 */
export function isMethodUnsupported(method: string): boolean {
  return UNSUPPORTED_METHODS.hasOwnProperty(method);
}

/**
 * Get substitution mapping for an unsupported method
 */
export function getMethodSubstitution(method: string): RedisMethodSubstitution | null {
  return METHOD_SUBSTITUTIONS[method] || null;
}

/**
 * Get all validation rules
 */
export function getValidationRules(): RedisValidationRule[] {
  return [...VALIDATION_RULES];
}

/**
 * Get validation rules for a specific category
 */
export function getValidationRulesByCategory(category: string): RedisValidationRule[] {
  return VALIDATION_RULES.filter(rule => rule.category === category);
}

/**
 * Get all supported methods by category
 */
export function getSupportedMethodsByCategory(category: string): RedisMethodConfig[] {
  return Object.values(SUPPORTED_METHODS).filter(method => method.category === category);
}

/**
 * Get all unsupported methods by risk level
 */
export function getUnsupportedMethodsByRiskLevel(riskLevel: string): RedisMethodConfig[] {
  return Object.values(UNSUPPORTED_METHODS).filter(method => method.riskLevel === riskLevel);
}

/**
 * Get compatibility statistics
 */
export function getCompatibilityStats(): {
  totalMethods: number;
  supportedCount: number;
  unsupportedCount: number;
  substitutionCount: number;
  riskLevelCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
} {
  const allMethods = { ...SUPPORTED_METHODS, ...UNSUPPORTED_METHODS };
  const totalMethods = Object.keys(allMethods).length;
  const supportedCount = Object.keys(SUPPORTED_METHODS).length;
  const unsupportedCount = Object.keys(UNSUPPORTED_METHODS).length;
  const substitutionCount = Object.keys(METHOD_SUBSTITUTIONS).length;

  const riskLevelCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  Object.values(allMethods).forEach(method => {
    riskLevelCounts[method.riskLevel] = (riskLevelCounts[method.riskLevel] || 0) + 1;
    categoryCounts[method.category] = (categoryCounts[method.category] || 0) + 1;
  });

  return {
    totalMethods,
    supportedCount,
    unsupportedCount,
    substitutionCount,
    riskLevelCounts,
    categoryCounts,
  };
}

/**
 * Export the complete configuration for external use
 */
export function getRedisCompatibilityConfig(): RedisCompatibilityConfig {
  return { ...REDIS_COMPATIBILITY_CONFIG };
}
