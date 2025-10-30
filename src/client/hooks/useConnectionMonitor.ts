import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnectionState } from '../utils/connectionManager';

export interface ConnectionMetrics {
  latency: number | null;
  lastSuccessfulPing: number | null;
  consecutiveFailures: number;
  averageLatency: number | null;
  connectionStability: 'stable' | 'unstable' | 'poor';
}

export interface ConnectionMonitorState {
  isMonitoring: boolean;
  metrics: ConnectionMetrics;
  hasRecentProblems: boolean;
  problemsSince: number | null;
  qualityScore: number; // 0-100
}

/**
 * Enhanced connection monitoring hook with detailed metrics
 */
export const useConnectionMonitor = (options: {
  pingInterval?: number;
  maxFailures?: number;
  stabilityThreshold?: number;
} = {}) => {
  const {
    pingInterval = 15000, // 15 seconds
    maxFailures = 3,
  } = options;

  const { isOnline, isConnected, connectionQuality } = useConnectionState();
  
  const [state, setState] = useState<ConnectionMonitorState>({
    isMonitoring: false,
    metrics: {
      latency: null,
      lastSuccessfulPing: null,
      consecutiveFailures: 0,
      averageLatency: null,
      connectionStability: 'stable',
    },
    hasRecentProblems: false,
    problemsSince: null,
    qualityScore: 100,
  });

  const latencyHistory = useRef<number[]>([]);
  const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTestingRef = useRef(false);

  // Calculate average latency from history
  const calculateAverageLatency = useCallback(() => {
    if (latencyHistory.current.length === 0) return null;
    const sum = latencyHistory.current.reduce((a, b) => a + b, 0);
    return Math.round(sum / latencyHistory.current.length);
  }, []);

  // Calculate connection stability
  const calculateStability = useCallback((consecutiveFailures: number, latency: number | null) => {
    if (consecutiveFailures >= maxFailures) return 'poor';
    if (consecutiveFailures > 1 || (latency && latency > 1000)) return 'unstable';
    return 'stable';
  }, [maxFailures]);

  // Calculate quality score (0-100)
  const calculateQualityScore = useCallback((metrics: ConnectionMetrics) => {
    if (!isOnline) return 0;
    if (!isConnected) return 10;
    
    let score = 100;
    
    // Deduct points for latency
    if (metrics.latency) {
      if (metrics.latency > 1000) score -= 50;
      else if (metrics.latency > 500) score -= 30;
      else if (metrics.latency > 200) score -= 15;
      else if (metrics.latency > 100) score -= 5;
    }
    
    // Deduct points for failures
    score -= metrics.consecutiveFailures * 15;
    
    // Deduct points for instability
    if (metrics.connectionStability === 'poor') score -= 30;
    else if (metrics.connectionStability === 'unstable') score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }, [isOnline, isConnected]);

  // Perform connection test
  const testConnection = useCallback(async (): Promise<number | null> => {
    if (isTestingRef.current || !isConnected) return null;
    
    isTestingRef.current = true;
    const start = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const latency = Math.round(performance.now() - start);
        
        // Update latency history (keep last 10 measurements)
        latencyHistory.current = [...latencyHistory.current.slice(-9), latency];
        
        return latency;
      }
      
      return null;
    } catch (error) {
      console.warn('Connection test failed:', error);
      return null;
    } finally {
      isTestingRef.current = false;
    }
  }, [isConnected]);

  // Update connection metrics
  const updateMetrics = useCallback(async () => {
    if (!isOnline || !isConnected) {
      setState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          consecutiveFailures: prev.metrics.consecutiveFailures + 1,
          connectionStability: calculateStability(prev.metrics.consecutiveFailures + 1, null),
        },
        hasRecentProblems: true,
        problemsSince: prev.problemsSince || Date.now(),
        qualityScore: calculateQualityScore({
          ...prev.metrics,
          consecutiveFailures: prev.metrics.consecutiveFailures + 1,
        }),
      }));
      return;
    }

    const latency = await testConnection();
    
    setState(prev => {
      const newMetrics: ConnectionMetrics = {
        latency,
        lastSuccessfulPing: latency ? Date.now() : prev.metrics.lastSuccessfulPing,
        consecutiveFailures: latency ? 0 : prev.metrics.consecutiveFailures + 1,
        averageLatency: calculateAverageLatency(),
        connectionStability: calculateStability(
          latency ? 0 : prev.metrics.consecutiveFailures + 1,
          latency
        ),
      };

      const hasRecentProblems = newMetrics.consecutiveFailures > 0 || 
                               newMetrics.connectionStability !== 'stable';
      
      return {
        ...prev,
        metrics: newMetrics,
        hasRecentProblems,
        problemsSince: hasRecentProblems ? (prev.problemsSince || Date.now()) : null,
        qualityScore: calculateQualityScore(newMetrics),
      };
    });
  }, [isOnline, isConnected, testConnection, calculateAverageLatency, calculateStability, calculateQualityScore]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (state.isMonitoring) return;
    
    setState(prev => ({ ...prev, isMonitoring: true }));
    
    // Initial test
    updateMetrics();
    
    // Set up periodic testing
    const scheduleNextTest = () => {
      pingTimeoutRef.current = setTimeout(() => {
        updateMetrics().then(scheduleNextTest);
      }, pingInterval);
    };
    
    scheduleNextTest();
  }, [state.isMonitoring, updateMetrics, pingInterval]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }
    
    setState(prev => ({ ...prev, isMonitoring: false }));
  }, []);

  // Manual connection test
  const performManualTest = useCallback(async () => {
    await updateMetrics();
  }, [updateMetrics]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    latencyHistory.current = [];
    setState(prev => ({
      ...prev,
      metrics: {
        latency: null,
        lastSuccessfulPing: null,
        consecutiveFailures: 0,
        averageLatency: null,
        connectionStability: 'stable',
      },
      hasRecentProblems: false,
      problemsSince: null,
      qualityScore: 100,
    }));
  }, []);

  // Auto-start monitoring when connected
  useEffect(() => {
    if (isConnected && !state.isMonitoring) {
      startMonitoring();
    } else if (!isConnected && state.isMonitoring) {
      // Don't stop monitoring when disconnected, just update metrics
      updateMetrics();
    }
  }, [isConnected, state.isMonitoring, startMonitoring, updateMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    isOnline,
    isConnected,
    connectionQuality,
    startMonitoring,
    stopMonitoring,
    performManualTest,
    resetMetrics,
    // Convenience getters
    isHealthy: state.qualityScore >= 80,
    hasProblems: state.hasRecentProblems || state.qualityScore < 60,
    needsAttention: state.metrics.consecutiveFailures >= 2 || state.qualityScore < 40,
  };
};

/**
 * Hook for connection problem detection and alerts
 */
export const useConnectionAlerts = () => {
  const monitor = useConnectionMonitor();
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const shouldShowAlert = useCallback((alertType: string) => {
    return alertsEnabled && !dismissedAlerts.has(alertType);
  }, [alertsEnabled, dismissedAlerts]);

  const dismissAlert = useCallback((alertType: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertType));
  }, []);

  const resetAlerts = useCallback(() => {
    setDismissedAlerts(new Set());
  }, []);

  // Determine which alerts to show
  const alerts = {
    offline: !monitor.isOnline && shouldShowAlert('offline'),
    disconnected: monitor.isOnline && !monitor.isConnected && shouldShowAlert('disconnected'),
    slowConnection: monitor.metrics.latency && monitor.metrics.latency > 1000 && shouldShowAlert('slow'),
    unstableConnection: monitor.metrics.connectionStability === 'unstable' && shouldShowAlert('unstable'),
    poorConnection: monitor.metrics.connectionStability === 'poor' && shouldShowAlert('poor'),
    multipleFailures: monitor.metrics.consecutiveFailures >= 3 && shouldShowAlert('failures'),
  };

  return {
    ...monitor,
    alertsEnabled,
    setAlertsEnabled,
    alerts,
    shouldShowAlert,
    dismissAlert,
    resetAlerts,
    hasActiveAlerts: Object.values(alerts).some(Boolean),
  };
};
