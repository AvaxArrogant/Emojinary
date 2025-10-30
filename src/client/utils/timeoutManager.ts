/**
 * Timeout Manager for handling loading timeouts and fallback mechanisms
 * Addresses Requirements: 5.1, 5.3, 5.4
 */

export interface TimeoutConfig {
  /** Timeout duration in milliseconds */
  timeout: number;
  /** Message to show when timeout occurs */
  timeoutMessage?: string;
  /** Whether to show fallback UI on timeout */
  showFallbackUI?: boolean;
  /** Whether to enable manual refresh on timeout */
  enableManualRefresh?: boolean;
  /** Custom fallback action */
  onTimeout?: () => void;
}

export interface TimeoutState {
  isActive: boolean;
  hasTimedOut: boolean;
  remainingTime: number;
  startTime: number;
  timeoutId: number | null;
}

export class TimeoutManager {
  private timeouts = new Map<string, TimeoutState>();
  private callbacks = new Map<string, (operationId: string) => void>();

  /**
   * Start a timeout for an operation
   */
  startTimeout(operationId: string, config: TimeoutConfig): void {
    // Clear existing timeout if any
    this.clearTimeout(operationId);

    const startTime = Date.now();
    const timeoutId = window.setTimeout(() => {
      this.handleTimeout(operationId, config);
    }, config.timeout);

    this.timeouts.set(operationId, {
      isActive: true,
      hasTimedOut: false,
      remainingTime: config.timeout,
      startTime,
      timeoutId,
    });

    console.log(`Timeout started for ${operationId}: ${config.timeout}ms`);
  }

  /**
   * Clear a timeout for an operation
   */
  clearTimeout(operationId: string): void {
    const timeoutState = this.timeouts.get(operationId);
    if (timeoutState?.timeoutId) {
      window.clearTimeout(timeoutState.timeoutId);
      this.timeouts.delete(operationId);
      console.log(`Timeout cleared for ${operationId}`);
    }
  }

  /**
   * Handle timeout occurrence
   */
  private handleTimeout(operationId: string, config: TimeoutConfig): void {
    const timeoutState = this.timeouts.get(operationId);
    if (timeoutState) {
      timeoutState.hasTimedOut = true;
      timeoutState.isActive = false;
      
      console.warn(`Operation ${operationId} timed out after ${config.timeout}ms`);
      
      // Execute custom timeout handler
      if (config.onTimeout) {
        config.onTimeout();
      }

      // Notify subscribers
      const callback = this.callbacks.get(operationId);
      if (callback) {
        callback(operationId);
      }
    }
  }

  /**
   * Check if an operation has timed out
   */
  hasTimedOut(operationId: string): boolean {
    return this.timeouts.get(operationId)?.hasTimedOut ?? false;
  }

  /**
   * Check if an operation timeout is active
   */
  isTimeoutActive(operationId: string): boolean {
    return this.timeouts.get(operationId)?.isActive ?? false;
  }

  /**
   * Get remaining time for an operation
   */
  getRemainingTime(operationId: string): number {
    const timeoutState = this.timeouts.get(operationId);
    if (!timeoutState || !timeoutState.isActive) {
      return 0;
    }

    const elapsed = Date.now() - timeoutState.startTime;
    return Math.max(0, timeoutState.remainingTime - elapsed);
  }

  /**
   * Subscribe to timeout events
   */
  onTimeout(operationId: string, callback: (operationId: string) => void): void {
    this.callbacks.set(operationId, callback);
  }

  /**
   * Unsubscribe from timeout events
   */
  offTimeout(operationId: string): void {
    this.callbacks.delete(operationId);
  }

  /**
   * Get all active timeouts
   */
  getActiveTimeouts(): string[] {
    return Array.from(this.timeouts.entries())
      .filter(([, state]) => state.isActive)
      .map(([operationId]) => operationId);
  }

  /**
   * Get all timed out operations
   */
  getTimedOutOperations(): string[] {
    return Array.from(this.timeouts.entries())
      .filter(([, state]) => state.hasTimedOut)
      .map(([operationId]) => operationId);
  }

  /**
   * Reset timeout state for an operation
   */
  resetTimeout(operationId: string): void {
    this.clearTimeout(operationId);
  }

  /**
   * Clear all timeouts
   */
  clearAllTimeouts(): void {
    for (const [operationId] of this.timeouts) {
      this.clearTimeout(operationId);
    }
  }
}

// Global timeout manager instance
export const globalTimeoutManager = new TimeoutManager();

/**
 * Default timeout configurations for common operations
 */
export const DEFAULT_TIMEOUTS = {
  INITIAL_LOAD: {
    timeout: 10000, // 10 seconds as per requirements
    timeoutMessage: 'Initial loading is taking longer than expected',
    showFallbackUI: true,
    enableManualRefresh: true,
  },
  JOIN_GAME: {
    timeout: 8000, // 8 seconds
    timeoutMessage: 'Joining game is taking longer than expected',
    showFallbackUI: true,
    enableManualRefresh: true,
  },
  START_GAME: {
    timeout: 10000, // 10 seconds
    timeoutMessage: 'Starting game is taking longer than expected',
    showFallbackUI: true,
    enableManualRefresh: true,
  },
  REFRESH_DATA: {
    timeout: 6000, // 6 seconds
    timeoutMessage: 'Refreshing data is taking longer than expected',
    showFallbackUI: true,
    enableManualRefresh: true,
  },
  NETWORK_REQUEST: {
    timeout: 5000, // 5 seconds
    timeoutMessage: 'Network request is taking longer than expected',
    showFallbackUI: false,
    enableManualRefresh: true,
  },
} as const;
