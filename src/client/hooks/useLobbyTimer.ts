import { useState, useEffect, useCallback, useRef } from 'react';
import { GAME_CONSTANTS } from '../../shared/utils/constants';
import { useSoundEffects } from '../utils/soundEffects';

export type LobbyTimerState = {
  isActive: boolean;
  timeRemaining: number;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  hasWarningTriggered: boolean;
  hasCriticalTriggered: boolean;
};

export type LobbyTimerConfig = {
  duration?: number;
  onTimerExpired?: () => void;
  onTimerReset?: () => void;
  onWarning?: (timeRemaining: number) => void;
  onCritical?: (timeRemaining: number) => void;
  enableSounds?: boolean;
  syncWithServer?: boolean;
};

/**
 * Custom hook for managing lobby countdown timer
 * Addresses Requirements: 3.1, 3.2, 3.5
 */
export const useLobbyTimer = (config: LobbyTimerConfig = {}): LobbyTimerState => {
  const {
    duration = GAME_CONSTANTS.LOBBY_COUNTDOWN_DURATION,
    onTimerExpired,
    onTimerReset,
    onWarning,
    onCritical,
    enableSounds = true,
    syncWithServer = true,
  } = config;

  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [hasWarningTriggered, setHasWarningTriggered] = useState(false);
  const [hasCriticalTriggered, setHasCriticalTriggered] = useState(false);
  
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastSyncRef = useRef<number>(0);
  
  const { play } = useSoundEffects();

  // Clear interval helper
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start timer
  const startTimer = useCallback(() => {
    if (isActive) return; // Already active
    
    setIsActive(true);
    setTimeRemaining(duration);
    setHasWarningTriggered(false);
    setHasCriticalTriggered(false);
    
    startTimeRef.current = Date.now();
    lastSyncRef.current = Date.now();
    
    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      
      setTimeRemaining(remaining);
      
      // Check for warning thresholds
      const warningThreshold = GAME_CONSTANTS.LOBBY_TIMER_WARNING_THRESHOLDS[0]; // 10s
      const criticalThreshold = GAME_CONSTANTS.LOBBY_TIMER_WARNING_THRESHOLDS[1]; // 5s
      
      if (remaining <= criticalThreshold && !hasCriticalTriggered) {
        setHasCriticalTriggered(true);
        onCritical?.(remaining);
        if (enableSounds) {
          play('timerWarning'); // Use existing timerWarning sound for critical
        }
      } else if (remaining <= warningThreshold && !hasWarningTriggered) {
        setHasWarningTriggered(true);
        onWarning?.(remaining);
        if (enableSounds) {
          play('timerWarning');
        }
      }
      
      // Timer expired
      if (remaining <= 0) {
        setIsActive(false);
        clearTimerInterval();
        onTimerExpired?.();
        if (enableSounds) {
          play('gameStart'); // Use gameStart sound for timer expiration (game starting)
        }
      }
      
      // Sync with server periodically
      if (syncWithServer && now - lastSyncRef.current >= GAME_CONSTANTS.LOBBY_TIMER_SYNC_INTERVAL) {
        lastSyncRef.current = now;
        // Note: Server sync would be implemented in the component using this hook
      }
    }, GAME_CONSTANTS.LOBBY_TIMER_UPDATE_INTERVAL);
  }, [
    isActive,
    duration,
    onTimerExpired,
    onWarning,
    onCritical,
    enableSounds,
    syncWithServer,
    hasWarningTriggered,
    hasCriticalTriggered,
    play,
    clearTimerInterval,
  ]);

  // Stop timer
  const stopTimer = useCallback(() => {
    setIsActive(false);
    clearTimerInterval();
  }, [clearTimerInterval]);

  // Reset timer
  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimeRemaining(duration);
    setHasWarningTriggered(false);
    setHasCriticalTriggered(false);
    clearTimerInterval();
    onTimerReset?.();
  }, [duration, onTimerReset, clearTimerInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimerInterval();
    };
  }, [clearTimerInterval]);

  return {
    isActive,
    timeRemaining,
    startTimer,
    stopTimer,
    resetTimer,
    hasWarningTriggered,
    hasCriticalTriggered,
  };
};

/**
 * Hook for managing lobby timer with server synchronization
 * Addresses Requirements: 3.1, 3.2, 3.5
 */
export const useLobbyTimerWithSync = (
  gameId: string,
  config: LobbyTimerConfig = {}
) => {
  const lobbyTimer = useLobbyTimer(config);
  const [serverTime, setServerTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  // Sync with server
  const syncWithServer = useCallback(async () => {
    try {
      setSyncError(null);
      const response = await fetch(`/api/game/${gameId}/lobby-timer`);
      
      if (!response.ok) {
        throw new Error(`Failed to sync timer: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.lobbyTimer) {
        const { isActive, remainingTime } = data.lobbyTimer;
        
        if (isActive && remainingTime > 0) {
          // Update local timer to match server
          setServerTime(remainingTime);
          setLastSyncTime(Date.now());
          
          // If local timer is not active but server timer is, start it
          if (!lobbyTimer.isActive) {
            lobbyTimer.startTimer();
          }
        } else if (!isActive && lobbyTimer.isActive) {
          // Server timer is not active, stop local timer
          lobbyTimer.stopTimer();
        }
      }
    } catch (error) {
      console.error('Failed to sync lobby timer with server:', error);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    }
  }, [gameId, lobbyTimer]);

  // Auto-sync periodically when timer is active
  useEffect(() => {
    if (!lobbyTimer.isActive) return;
    
    const syncInterval = setInterval(() => {
      syncWithServer();
    }, GAME_CONSTANTS.LOBBY_TIMER_SYNC_INTERVAL);
    
    return () => clearInterval(syncInterval);
  }, [lobbyTimer.isActive, syncWithServer]);

  // Initial sync when component mounts
  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  return {
    ...lobbyTimer,
    syncWithServer,
    serverTime,
    syncError,
    lastSyncTime,
    isSynced: Date.now() - lastSyncTime < GAME_CONSTANTS.LOBBY_TIMER_SYNC_INTERVAL * 2,
  };
};
