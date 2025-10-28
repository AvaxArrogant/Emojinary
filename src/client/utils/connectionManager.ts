// ============================================================================
// CONNECTION MANAGER UTILITY
// ============================================================================

export interface ConnectionState {
  isOnline: boolean;
  isConnected: boolean;
  lastConnected: number | null;
  reconnectAttempts: number;
}

export class ConnectionManager {
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private state: ConnectionState = {
    isOnline: navigator.onLine,
    isConnected: false,
    lastConnected: null,
    reconnectAttempts: 0,
  };

  constructor() {
    this.setupNetworkListeners();
    this.setupVisibilityListeners();
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  getState(): ConnectionState {
    return { ...this.state };
  }

  updateConnectionState(isConnected: boolean): void {
    const wasConnected = this.state.isConnected;
    
    this.state = {
      ...this.state,
      isConnected,
      lastConnected: isConnected ? Date.now() : this.state.lastConnected,
      reconnectAttempts: isConnected ? 0 : this.state.reconnectAttempts,
    };

    // Notify listeners if connection state changed
    if (wasConnected !== isConnected) {
      this.notifyListeners();
    }
  }

  incrementReconnectAttempts(): void {
    this.state = {
      ...this.state,
      reconnectAttempts: this.state.reconnectAttempts + 1,
    };
    this.notifyListeners();
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  addListener(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Error in connection state listener:', error);
      }
    });
  }

  // ============================================================================
  // NETWORK MONITORING
  // ============================================================================

  private setupNetworkListeners(): void {
    const updateOnlineStatus = () => {
      const wasOnline = this.state.isOnline;
      this.state = {
        ...this.state,
        isOnline: navigator.onLine,
      };

      if (wasOnline !== navigator.onLine) {
        console.log(`Network status changed: ${navigator.onLine ? 'online' : 'offline'}`);
        this.notifyListeners();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  private setupVisibilityListeners(): void {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, checking connection...');
        // Trigger connection check when page becomes visible
        this.notifyListeners();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // ============================================================================
  // CONNECTION QUALITY ASSESSMENT
  // ============================================================================

  getConnectionQuality(): 'good' | 'poor' | 'offline' {
    if (!this.state.isOnline) {
      return 'offline';
    }

    if (!this.state.isConnected) {
      return 'poor';
    }

    // Consider connection poor if we've had recent reconnection attempts
    if (this.state.reconnectAttempts > 2) {
      return 'poor';
    }

    return 'good';
  }

  shouldAttemptReconnect(): boolean {
    return (
      this.state.isOnline && 
      !this.state.isConnected && 
      this.state.reconnectAttempts < 10
    );
  }

  getReconnectDelay(): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, this.state.reconnectAttempts),
      maxDelay
    );
    
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    return Math.max(exponentialDelay + jitter, baseDelay);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let connectionManagerInstance: ConnectionManager | null = null;

export function getConnectionManager(): ConnectionManager {
  if (!connectionManagerInstance) {
    connectionManagerInstance = new ConnectionManager();
  }
  return connectionManagerInstance;
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect } from 'react';

export function useConnectionState() {
  const [state, setState] = useState<ConnectionState>(() => 
    getConnectionManager().getState()
  );

  useEffect(() => {
    const manager = getConnectionManager();
    const unsubscribe = manager.addListener(setState);
    
    return unsubscribe;
  }, []);

  return {
    ...state,
    connectionQuality: getConnectionManager().getConnectionQuality(),
    shouldReconnect: getConnectionManager().shouldAttemptReconnect(),
    reconnectDelay: getConnectionManager().getReconnectDelay(),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Checks if the current environment supports real-time features
 */
export function supportsRealtime(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof fetch !== 'undefined' &&
    typeof AbortSignal !== 'undefined'
  );
}

/**
 * Tests network connectivity by making a simple request
 */
export async function testConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Estimates network latency by measuring round-trip time
 */
export async function estimateLatency(): Promise<number> {
  const start = performance.now();
  
  try {
    await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000),
    });
    
    return performance.now() - start;
  } catch {
    return -1; // Indicates failure
  }
}
