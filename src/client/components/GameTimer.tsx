import React, { useEffect, useState } from 'react';
import { useGameTimer } from '../hooks/useGameActions';
import { useGame } from '../contexts/GameContext';
import { useSoundEffects } from '../utils/soundEffects';

export const GameTimer: React.FC = () => {
  const { 
    timeRemaining, 
    formattedTime, 
    isActive, 
    isExpired, 
    isWarning, 
    isCritical 
  } = useGameTimer();
  
  const { currentRound } = useGame();
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [hasPlayedWarning, setHasPlayedWarning] = useState(false);
  const { playTimerWarning } = useSoundEffects();

  // Trigger pulse animation and sound when entering critical time
  useEffect(() => {
    if (isCritical) {
      setPulseAnimation(true);
      
      // Play warning sound only once when entering critical time
      if (!hasPlayedWarning) {
        playTimerWarning();
        setHasPlayedWarning(true);
      }
      
      const interval = setInterval(() => {
        setPulseAnimation(prev => !prev);
      }, 500); // Pulse every 500ms

      return () => clearInterval(interval);
    } else {
      setPulseAnimation(false);
      setHasPlayedWarning(false);
    }
  }, [isCritical, hasPlayedWarning, playTimerWarning]);

  // Don't render if no active round
  if (!currentRound || !isActive) {
    return null;
  }

  // Calculate progress percentage (0-100)
  const totalDuration = 120; // 2 minutes in seconds
  const progress = Math.max(0, (timeRemaining / totalDuration) * 100);

  // Determine color scheme based on time remaining
  const getColorScheme = () => {
    if (isCritical) {
      return {
        bg: 'bg-red-100',
        border: 'border-red-300',
        text: 'text-red-800',
        progressBg: 'bg-red-200',
        progressFill: 'bg-red-500',
        icon: '🚨'
      };
    } else if (isWarning) {
      return {
        bg: 'bg-yellow-100',
        border: 'border-yellow-300',
        text: 'text-yellow-800',
        progressBg: 'bg-yellow-200',
        progressFill: 'bg-yellow-500',
        icon: '⚠️'
      };
    } else {
      return {
        bg: 'bg-green-100',
        border: 'border-green-300',
        text: 'text-green-800',
        progressBg: 'bg-green-200',
        progressFill: 'bg-green-500',
        icon: '⏰'
      };
    }
  };

  const colors = getColorScheme();

  return (
    <div className={`rounded-mobile border-2 p-mobile shadow-mobile transition-all duration-300 ${
      colors.bg
    } ${
      colors.border
    } ${
      pulseAnimation ? 'scale-105 shadow-lg' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{colors.icon}</span>
          <h3 className={`font-semibold ${colors.text} text-mobile-base`}>
            Round Timer
          </h3>
        </div>
        <div className={`text-mobile-xl sm:text-2xl font-mono font-bold ${colors.text} ${
          isCritical ? 'animate-pulse' : ''
        }`}>
          {formattedTime}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className={`w-full h-3 rounded-full ${colors.progressBg} overflow-hidden`}>
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${colors.progressFill} ${
              isCritical ? 'animate-pulse' : ''
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Progress Labels */}
        <div className="flex justify-between text-mobile-xs font-medium">
          <span className={colors.text}>
            {Math.floor(timeRemaining)} seconds left
          </span>
          <span className={colors.text}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Status Messages */}
      {isExpired && (
        <div className="mt-3 text-center">
          <div className="text-red-600 font-semibold text-mobile-sm">
            ⏰ Time's Up!
          </div>
        </div>
      )}
      
      {isCritical && !isExpired && (
        <div className="mt-3 text-center">
          <div className="text-red-600 font-semibold text-mobile-sm animate-bounce">
            🚨 Final Countdown!
          </div>
        </div>
      )}
      
      {isWarning && !isCritical && (
        <div className="mt-3 text-center">
          <div className="text-yellow-600 font-medium text-mobile-sm">
            ⚠️ Time Running Out
          </div>
        </div>
      )}

      {/* Round Info */}
      <div className="mt-3 pt-3 border-t border-gray-300">
        <div className="flex justify-between text-mobile-xs text-gray-600">
          <span>Round {currentRound.roundNumber}</span>
          <span>2:00 total</span>
        </div>
      </div>
    </div>
  );
};
