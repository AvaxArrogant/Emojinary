import { GAME_CONSTANTS } from '../../shared/utils/constants';
import type { LobbyTimer } from '../../shared/types/game';

export type TimerSyncResult = {
  success: boolean;
  serverTimer?: LobbyTimer;
  error?: string;
  drift?: number; // Time difference between client and server
};

export type TimerSyncConfig = {
  gameId: string;
  maxRetries?: number;
  retryDelay?: number;
  driftThreshold?: number; // Max acceptable drift in ms
};

/**
 * Utility class for managing lobby timer synchronization with server
 * Addresses Requirements: 3.1, 3.2, 3.5
 */
export class LobbyTimerSyncManager {
  private gameId: string;
  private maxRetries: number;
  private retryDelay: number;
  private driftThreshold: number;
  private lastSyncTime: number = 0;
  private syncInProgress: boolean = false;

  constructor(config: TimerSyncConfig) {
    this.gameId = config.gameId;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.driftThreshold = config.driftThreshold ?? 2000; // 2 seconds
  }

  /**
   * Sync local timer state with server
   */
  async syncTimer(): Promise<TimerSyncResult> {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await this.performSync();
        this.syncInProgress = false;
        this.lastSyncTime = Date.now();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown sync error');
        
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * (attempt + 1)); // Exponential backoff
        }
      }
    }

    this.syncInProgress = false;
    return {
      success: false,
      error: `Sync failed after ${this.maxRetries} attempts: ${lastError?.message}`,
    };
  }

  /**
   * Perform actual sync with server
   */
  private async performSync(): Promise<TimerSyncResult> {
    const requestTime = Date.now();
    
    const response = await fetch(`/api/game/${this.gameId}/lobby-timer`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseTime = Date.now();
    const networkLatency = (responseTime - requestTime) / 2; // Estimate one-way latency

    const data = await response.json();
    
    if (!data.lobbyTimer) {
      return { success: true }; // No timer active on server
    }

    const serverTimer: LobbyTimer = data.lobbyTimer;
    
    // Calculate time drift accounting for network latency
    const serverTimeAdjusted = serverTimer.remainingTime - networkLatency;
    const drift = Math.abs(serverTimeAdjusted - serverTimer.remainingTime);

    return {
      success: true,
      serverTimer: {
        ...serverTimer,
        remainingTime: Math.max(0, serverTimeAdjusted), // Adjust for network latency
      },
      drift,
    };
  }

  /**
   * Start timer on server
   */
  async startServerTimer(duration: number = GAME_CONSTANTS.LOBBY_COUNTDOWN_DURATION): Promise<TimerSyncResult> {
    try {
      const response = await fetch(`/api/game/${this.gameId}/lobby-timer/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ duration }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        serverTimer: data.lobbyTimer,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start server timer',
      };
    }
  }

  /**
   * Stop timer on server
   */
  async stopServerTimer(): Promise<TimerSyncResult> {
    try {
      const response = await fetch(`/api/game/${this.gameId}/lobby-timer/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop server timer',
      };
    }
  }

  /**
   * Reset timer on server
   */
  async resetServerTimer(): Promise<TimerSyncResult> {
    try {
      const response = await fetch(`/api/game/${this.gameId}/lobby-timer/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        serverTimer: data.lobbyTimer,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset server timer',
      };
    }
  }

  /**
   * Check if sync is needed based on last sync time
   */
  needsSync(): boolean {
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    return timeSinceLastSync >= GAME_CONSTANTS.LOBBY_TIMER_SYNC_INTERVAL;
  }

  /**
   * Get time since last successful sync
   */
  getTimeSinceLastSync(): number {
    return Date.now() - this.lastSyncTime;
  }

  /**
   * Check if drift is acceptable
   */
  isDriftAcceptable(drift: number): boolean {
    return drift <= this.driftThreshold;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a timer sync manager instance
 */
export const createTimerSyncManager = (config: TimerSyncConfig): LobbyTimerSyncManager => {
  return new LobbyTimerSyncManager(config);
};

/**
 * Utility function to calculate timer drift
 */
export const calculateTimerDrift = (
  clientTime: number,
  serverTime: number,
  networkLatency: number = 0
): number => {
  const adjustedServerTime = serverTime - networkLatency;
  return Math.abs(clientTime - adjustedServerTime);
};

/**
 * Utility function to format timer remaining time
 */
export const formatTimerTime = (milliseconds: number): string => {
  if (milliseconds <= 0) return '0:00';
  
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Utility function to get timer progress percentage
 */
export const getTimerProgress = (
  remainingTime: number,
  totalDuration: number = GAME_CONSTANTS.LOBBY_COUNTDOWN_DURATION
): number => {
  if (totalDuration <= 0) return 0;
  const elapsed = totalDuration - remainingTime;
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
};

/**
 * Utility function to check if timer is in warning state
 */
export const isTimerInWarningState = (remainingTime: number): boolean => {
  return remainingTime <= GAME_CONSTANTS.LOBBY_TIMER_WARNING_THRESHOLDS[0] && remainingTime > 0;
};

/**
 * Utility function to check if timer is in critical state
 */
export const isTimerInCriticalState = (remainingTime: number): boolean => {
  return remainingTime <= GAME_CONSTANTS.LOBBY_TIMER_WARNING_THRESHOLDS[1] && remainingTime > 0;
};
