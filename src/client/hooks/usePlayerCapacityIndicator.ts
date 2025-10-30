import { useMemo, useEffect, useState } from 'react';

export interface CapacityStatus {
  level: 'empty' | 'low' | 'good' | 'high' | 'full';
  color: string;
  bgColor: string;
  textColor: string;
  message: string;
  icon: string;
  isWarning: boolean;
  canAcceptMore: boolean;
}

export interface CapacityIndicatorState {
  current: number;
  maximum: number;
  minimum: number;
  percentage: number;
  status: CapacityStatus;
  needsMore: number;
  spotsRemaining: number;
  isAnimating: boolean;
}

export const usePlayerCapacityIndicator = (
  currentPlayers: number,
  maxPlayers: number = 8,
  minPlayers: number = 2
) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [previousCount, setPreviousCount] = useState(currentPlayers);

  // Trigger animation when count changes
  useEffect(() => {
    if (currentPlayers !== previousCount) {
      setIsAnimating(true);
      setPreviousCount(currentPlayers);
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [currentPlayers, previousCount]);

  const capacityState = useMemo((): CapacityIndicatorState => {
    const percentage = Math.round((currentPlayers / maxPlayers) * 100);
    const needsMore = Math.max(0, minPlayers - currentPlayers);
    const spotsRemaining = Math.max(0, maxPlayers - currentPlayers);

    let status: CapacityStatus;

    if (currentPlayers === 0) {
      status = {
        level: 'empty',
        color: '#6b7280',
        bgColor: '#f3f4f6',
        textColor: '#374151',
        message: 'No players yet',
        icon: '👥',
        isWarning: false,
        canAcceptMore: true
      };
    } else if (currentPlayers < minPlayers) {
      status = {
        level: 'low',
        color: '#f59e0b',
        bgColor: '#fef3c7',
        textColor: '#92400e',
        message: `Need ${needsMore} more to start`,
        icon: '⏳',
        isWarning: true,
        canAcceptMore: true
      };
    } else if (currentPlayers >= minPlayers && currentPlayers < maxPlayers * 0.75) {
      status = {
        level: 'good',
        color: '#10b981',
        bgColor: '#d1fae5',
        textColor: '#065f46',
        message: 'Ready to start',
        icon: '✅',
        isWarning: false,
        canAcceptMore: true
      };
    } else if (currentPlayers < maxPlayers) {
      status = {
        level: 'high',
        color: '#3b82f6',
        bgColor: '#dbeafe',
        textColor: '#1e40af',
        message: `${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} left`,
        icon: '🎯',
        isWarning: false,
        canAcceptMore: true
      };
    } else {
      status = {
        level: 'full',
        color: '#ef4444',
        bgColor: '#fee2e2',
        textColor: '#991b1b',
        message: 'Lobby full',
        icon: '🚫',
        isWarning: true,
        canAcceptMore: false
      };
    }

    return {
      current: currentPlayers,
      maximum: maxPlayers,
      minimum: minPlayers,
      percentage,
      status,
      needsMore,
      spotsRemaining,
      isAnimating
    };
  }, [currentPlayers, maxPlayers, minPlayers, isAnimating]);

  // Helper functions for UI components
  const getCapacityBarWidth = () => `${capacityState.percentage}%`;
  
  const getCapacityClasses = () => {
    const baseClasses = 'transition-all duration-300 ease-in-out';
    const animationClasses = isAnimating ? 'animate-count-update' : '';
    const statusClasses = capacityState.status.isWarning ? 'animate-capacity-warning' : '';
    
    return `${baseClasses} ${animationClasses} ${statusClasses}`.trim();
  };

  const getProgressBarClasses = () => {
    const baseClasses = 'h-2 rounded-full transition-all duration-500 ease-out';
    let colorClasses = '';

    switch (capacityState.status.level) {
      case 'empty':
        colorClasses = 'bg-gray-300';
        break;
      case 'low':
        colorClasses = 'bg-orange-400';
        break;
      case 'good':
        colorClasses = 'bg-green-400';
        break;
      case 'high':
        colorClasses = 'bg-blue-400';
        break;
      case 'full':
        colorClasses = 'bg-red-400';
        break;
    }

    return `${baseClasses} ${colorClasses}`;
  };

  const getStatusBadgeClasses = () => {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-200';
    const colorClasses = `bg-[${capacityState.status.bgColor}] text-[${capacityState.status.textColor}]`;
    const animationClasses = isAnimating ? 'animate-pulse' : '';
    
    return `${baseClasses} ${colorClasses} ${animationClasses}`.trim();
  };

  return {
    ...capacityState,
    getCapacityBarWidth,
    getCapacityClasses,
    getProgressBarClasses,
    getStatusBadgeClasses
  };
};
