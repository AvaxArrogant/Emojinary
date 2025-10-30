import React, { useEffect, useState, useCallback } from 'react';
import { useLobbyTimer } from '../hooks/useLobbyTimer';
import { useSoundEffects } from '../utils/soundEffects';
import { GAME_CONSTANTS } from '../../shared/utils/constants';

interface LobbyTimerProps {
  /** Whether the timer should be active */
  isActive: boolean;
  /** Current player count */
  playerCount: number;
  /** Minimum players needed to start timer */
  minPlayers?: number;
  /** Callback when timer expires */
  onTimerExpired: () => void;
  /** Callback when timer is reset */
  onTimerReset?: () => void;
  /** Whether the game can start */
  canStart: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Timer display variant */
  variant?: 'full' | 'compact' | 'minimal';
}

/**
 * LobbyTimer component with visual countdown display and automatic game start
 * Addresses Requirements: 3.1, 3.2, 3.5
 */
export const LobbyTimer: React.FC<LobbyTimerProps> = ({
  isActive,
  playerCount,
  minPlayers = GAME_CONSTANTS.MIN_PLAYERS_TO_START,
  onTimerExpired,
  onTimerReset,
  canStart,
  className = '',
  variant = 'full',
}) => {
  const {
    timeRemaining,
    isActive: isRunning,
    startTimer,
    stopTimer,
    resetTimer,
  } = useLobbyTimer({
    duration: GAME_CONSTANTS.LOBBY_COUNTDOWN_DURATION,
    onTimerExpired,
    ...(onTimerReset && { onTimerReset }),
  });

  // Calculate progress from time remaining
  const progress = GAME_CONSTANTS.LOBBY_COUNTDOWN_DURATION > 0 
    ? Math.max(0, Math.min(1, (GAME_CONSTANTS.LOBBY_COUNTDOWN_DURATION - timeRemaining) / GAME_CONSTANTS.LOBBY_COUNTDOWN_DURATION))
    : 0;

  const { play } = useSoundEffects();
  const [hasPlayedWarnings, setHasPlayedWarnings] = useState<Set<number>>(new Set());

  // Start/stop timer based on conditions
  useEffect(() => {
    const shouldStart = isActive && playerCount >= minPlayers && canStart;
    
    if (shouldStart && !isRunning) {
      console.log('Starting lobby timer:', { playerCount, minPlayers, canStart });
      startTimer();
      setHasPlayedWarnings(new Set()); // Reset warning sounds
    } else if (!shouldStart && isRunning) {
      console.log('Stopping lobby timer:', { playerCount, minPlayers, canStart });
      stopTimer();
    }
  }, [isActive, playerCount, minPlayers, canStart, isRunning, startTimer, stopTimer]);

  // Reset timer when new players join during countdown
  useEffect(() => {
    if (isRunning && playerCount >= minPlayers) {
      console.log('Resetting timer due to player join');
      resetTimer();
      setHasPlayedWarnings(new Set()); // Reset warning sounds
    }
  }, [playerCount, minPlayers, isRunning, resetTimer]);

  // Play warning sounds at specific thresholds
  useEffect(() => {
    if (!isRunning || !timeRemaining) return;

    GAME_CONSTANTS.LOBBY_TIMER_WARNING_THRESHOLDS.forEach((threshold: number) => {
      if (timeRemaining <= threshold && !hasPlayedWarnings.has(threshold)) {
        console.log(`Playing warning sound for ${threshold}ms remaining`);
        play('timerWarning');
        setHasPlayedWarnings(prev => new Set(prev).add(threshold));
      }
    });
  }, [timeRemaining, isRunning, hasPlayedWarnings, play]);

  // Format time display
  const formatTime = useCallback((ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    return seconds.toString();
  }, []);

  // Get urgency level for styling
  const getUrgencyLevel = useCallback((): 'normal' | 'warning' | 'critical' => {
    if (!timeRemaining) return 'normal';
    
    if (timeRemaining <= 5000) return 'critical'; // Last 5 seconds
    if (timeRemaining <= 10000) return 'warning'; // Last 10 seconds
    return 'normal';
  }, [timeRemaining]);

  // Don't render if conditions aren't met
  if (!isActive || playerCount < minPlayers || !canStart) {
    return null;
  }

  const urgency = getUrgencyLevel();
  const formattedTime = formatTime(timeRemaining);

  // Minimal variant - just the countdown number
  if (variant === 'minimal') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className={`text-lg font-bold ${
          urgency === 'critical' ? 'text-red-600 animate-pulse' :
          urgency === 'warning' ? 'text-yellow-600' :
          'text-blue-600'
        }`}>
          {formattedTime}s
        </div>
      </div>
    );
  }

  // Compact variant - small timer with progress
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-3 p-3 rounded-lg ${
        urgency === 'critical' ? 'bg-red-50 border border-red-200' :
        urgency === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
        'bg-blue-50 border border-blue-200'
      } ${className}`}>
        {/* Circular progress indicator */}
        <div className="relative w-8 h-8">
          <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
            {/* Background circle */}
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 14}`}
              strokeDashoffset={`${2 * Math.PI * 14 * (1 - progress)}`}
              className={`transition-all duration-300 ${
                urgency === 'critical' ? 'text-red-500' :
                urgency === 'warning' ? 'text-yellow-500' :
                'text-blue-500'
              }`}
            />
          </svg>
          {/* Time display */}
          <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
            urgency === 'critical' ? 'text-red-600' :
            urgency === 'warning' ? 'text-yellow-600' :
            'text-blue-600'
          }`}>
            {formattedTime}
          </div>
        </div>
        
        <div className="flex-1">
          <div className={`text-sm font-medium ${
            urgency === 'critical' ? 'text-red-800' :
            urgency === 'warning' ? 'text-yellow-800' :
            'text-blue-800'
          }`}>
            {urgency === 'critical' ? 'Starting now!' :
             urgency === 'warning' ? 'Starting soon...' :
             'Auto-starting game'}
          </div>
        </div>
      </div>
    );
  }

  // Full variant - complete timer display
  return (
    <div className={`text-center p-6 rounded-xl ${
      urgency === 'critical' ? 'bg-red-50 border-2 border-red-200' :
      urgency === 'warning' ? 'bg-yellow-50 border-2 border-yellow-200' :
      'bg-blue-50 border-2 border-blue-200'
    } ${className}`}>
      {/* Timer icon and title */}
      <div className="mb-4">
        <div className={`text-3xl mb-2 ${
          urgency === 'critical' ? 'animate-bounce' : ''
        }`}>
          ⏰
        </div>
        <h3 className={`text-lg font-semibold ${
          urgency === 'critical' ? 'text-red-800' :
          urgency === 'warning' ? 'text-yellow-800' :
          'text-blue-800'
        }`}>
          {urgency === 'critical' ? 'Game Starting!' :
           urgency === 'warning' ? 'Get Ready!' :
           'Auto-Start Timer'}
        </h3>
      </div>

      {/* Large countdown display */}
      <div className="mb-4">
        <div className={`text-6xl font-bold mb-2 ${
          urgency === 'critical' ? 'text-red-600 animate-pulse' :
          urgency === 'warning' ? 'text-yellow-600' :
          'text-blue-600'
        }`}>
          {formattedTime}
        </div>
        <div className={`text-sm ${
          urgency === 'critical' ? 'text-red-700' :
          urgency === 'warning' ? 'text-yellow-700' :
          'text-blue-700'
        }`}>
          second{formattedTime !== '1' ? 's' : ''} remaining
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              urgency === 'critical' ? 'bg-red-500' :
              urgency === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Status message */}
      <div className={`text-sm ${
        urgency === 'critical' ? 'text-red-700' :
        urgency === 'warning' ? 'text-yellow-700' :
        'text-blue-700'
      }`}>
        {urgency === 'critical' ? 'The game will start automatically!' :
         urgency === 'warning' ? 'Game starting soon...' :
         `Game will start automatically with ${playerCount} player${playerCount !== 1 ? 's' : ''}`}
      </div>

      {/* Additional info for new players */}
      {urgency === 'normal' && (
        <div className="mt-3 text-xs text-gray-600">
          Timer resets when new players join
        </div>
      )}
    </div>
  );
};

/**
 * Hook for using lobby timer in other components
 */
export const useLobbyTimerDisplay = (
  playerCount: number,
  canStart: boolean,
  onGameStart: () => void
) => {
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Activate timer when conditions are met
  useEffect(() => {
    const shouldActivate = playerCount >= GAME_CONSTANTS.MIN_PLAYERS_TO_START && canStart;
    setIsTimerActive(shouldActivate);
  }, [playerCount, canStart]);

  const handleTimerExpired = useCallback(() => {
    console.log('Lobby timer expired, starting game automatically');
    onGameStart();
  }, [onGameStart]);

  const handleTimerReset = useCallback(() => {
    console.log('Lobby timer reset due to new player join');
  }, []);

  return {
    isTimerActive,
    handleTimerExpired,
    handleTimerReset,
  };
};

export default LobbyTimer;
