import React from 'react';
import { useGameTimer } from '../hooks/useGameActions';

type CompactTimerProps = {
  className?: string;
  showIcon?: boolean;
};

export const CompactTimer: React.FC<CompactTimerProps> = ({ 
  className = '', 
  showIcon = true 
}) => {
  const { 
    timeRemaining, 
    formattedTime, 
    isActive, 
    isWarning, 
    isCritical 
  } = useGameTimer();

  // Don't render if no active timer
  if (!isActive || timeRemaining <= 0) {
    return null;
  }

  // Determine styling based on time remaining
  const getTimerStyle = () => {
    if (isCritical) {
      return 'bg-red-100 text-red-800 border-red-300 animate-pulse';
    } else if (isWarning) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else {
      return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-lg border font-mono font-semibold text-sm transition-all ${getTimerStyle()} ${className}`}>
      {showIcon && (
        <span className="mr-2">
          {isCritical ? '🚨' : isWarning ? '⚠️' : '⏰'}
        </span>
      )}
      {formattedTime}
    </div>
  );
};
