import React from 'react';
import { usePlayerCapacityIndicator } from '../hooks/usePlayerCapacityIndicator';
import { useResponsiveBreakpoint } from '../utils/mobileResponsiveness';

export interface PlayerCapacityIndicatorProps {
  currentPlayers: number;
  maxPlayers?: number;
  minPlayers?: number;
  showProgressBar?: boolean;
  showStatusBadge?: boolean;
  showDetailedInfo?: boolean;
  variant?: 'compact' | 'full' | 'minimal';
  className?: string;
}

export const PlayerCapacityIndicator: React.FC<PlayerCapacityIndicatorProps> = ({
  currentPlayers,
  maxPlayers = 8,
  minPlayers = 2,
  showProgressBar = true,
  showStatusBadge = true,
  showDetailedInfo = false,
  variant = 'full',
  className = ''
}) => {
  const { isMobile } = useResponsiveBreakpoint();
  const capacity = usePlayerCapacityIndicator(currentPlayers, maxPlayers, minPlayers);

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className={`
          text-lg font-bold transition-colors duration-200
          ${capacity.current >= minPlayers ? 'text-green-600' : 'text-orange-600'}
          ${capacity.getCapacityClasses()}
        `}>
          {capacity.current}
        </span>
        <span className="text-gray-500">/</span>
        <span className="text-lg font-bold text-gray-700">{capacity.maximum}</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="flex items-center space-x-1">
          <span className={`
            text-lg font-bold transition-colors duration-200
            ${capacity.current >= minPlayers ? 'text-green-600' : 'text-orange-600'}
            ${capacity.getCapacityClasses()}
          `}>
            {capacity.current}
          </span>
          <span className="text-gray-500">/</span>
          <span className="text-lg font-bold text-gray-700">{capacity.maximum}</span>
        </div>
        
        {showStatusBadge && (
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium transition-all duration-200
            ${capacity.status.level === 'empty' ? 'bg-gray-100 text-gray-600' :
              capacity.status.level === 'low' ? 'bg-orange-100 text-orange-700' :
              capacity.status.level === 'good' ? 'bg-green-100 text-green-700' :
              capacity.status.level === 'high' ? 'bg-blue-100 text-blue-700' :
              'bg-red-100 text-red-700'
            }
            ${capacity.isAnimating ? 'animate-pulse' : ''}
          `}>
            <span className="mr-1">{capacity.status.icon}</span>
            {capacity.status.level === 'empty' ? 'Empty' :
             capacity.status.level === 'low' ? 'Need More' :
             capacity.status.level === 'good' ? 'Ready' :
             capacity.status.level === 'high' ? 'Almost Full' :
             'Full'
            }
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with count and status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className={`font-semibold text-gray-900 ${isMobile ? 'text-lg' : 'text-base'}`}>
            Players
          </h3>
          {capacity.isAnimating && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs text-blue-600">Updating...</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Player count display */}
          <div className="flex items-center space-x-1">
            <span className={`
              text-xl font-bold transition-colors duration-200
              ${capacity.current >= minPlayers ? 'text-green-600' : 'text-orange-600'}
              ${capacity.getCapacityClasses()}
            `}>
              {capacity.current}
            </span>
            <span className="text-gray-500 text-lg">/</span>
            <span className="text-xl font-bold text-gray-700">{capacity.maximum}</span>
          </div>
          
          {/* Status badge */}
          {showStatusBadge && (
            <div className={`
              px-3 py-1 rounded-full text-sm font-medium transition-all duration-200
              ${capacity.status.level === 'empty' ? 'bg-gray-100 text-gray-600' :
                capacity.status.level === 'low' ? 'bg-orange-100 text-orange-700' :
                capacity.status.level === 'good' ? 'bg-green-100 text-green-700' :
                capacity.status.level === 'high' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }
              ${capacity.isAnimating ? 'animate-pulse' : ''}
              ${capacity.status.isWarning ? 'animate-capacity-warning' : ''}
            `}>
              <span className="mr-1">{capacity.status.icon}</span>
              {capacity.status.message}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {showProgressBar && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className={capacity.getProgressBarClasses()}
              style={{ width: capacity.getCapacityBarWidth() }}
            />
          </div>
          
          {/* Progress labels */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>Min: {capacity.minimum}</span>
            <span>{capacity.percentage}% full</span>
            <span>Max: {capacity.maximum}</span>
          </div>
        </div>
      )}

      {/* Detailed information */}
      {showDetailedInfo && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="font-medium text-gray-900">Current</div>
            <div className={`text-lg font-bold ${
              capacity.current >= minPlayers ? 'text-green-600' : 'text-orange-600'
            }`}>
              {capacity.current}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="font-medium text-gray-900">Capacity</div>
            <div className="text-lg font-bold text-gray-700">{capacity.maximum}</div>
          </div>
          
          {capacity.needsMore > 0 && (
            <div className="bg-orange-50 rounded-lg p-2">
              <div className="font-medium text-orange-900">Still Need</div>
              <div className="text-lg font-bold text-orange-600">
                {capacity.needsMore} more
              </div>
            </div>
          )}
          
          {capacity.spotsRemaining > 0 && capacity.needsMore === 0 && (
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="font-medium text-blue-900">Spots Left</div>
              <div className="text-lg font-bold text-blue-600">
                {capacity.spotsRemaining}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerCapacityIndicator;
