import React from 'react';
import type { Player } from '../../shared/types/game';

type ScoreDisplayProps = {
  player: Player;
  showRank?: boolean;
  rank?: number;
  isCurrentUser?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
};

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  player,
  showRank = false,
  rank,
  isCurrentUser = false,
  size = 'medium',
  className = '',
}) => {
  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  const scoreClasses = {
    small: 'text-xs font-medium',
    medium: 'text-sm font-semibold',
    large: 'text-base font-bold',
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center space-x-2">
        {showRank && rank && (
          <div className="flex-shrink-0 w-6 text-center">
            {rank === 1 && <span className="text-lg">🥇</span>}
            {rank === 2 && <span className="text-lg">🥈</span>}
            {rank === 3 && <span className="text-lg">🥉</span>}
            {rank > 3 && (
              <span className={`${sizeClasses[size]} font-medium text-gray-600`}>
                #{rank}
              </span>
            )}
          </div>
        )}
        
        <div className="flex-1">
          <div className={`${sizeClasses[size]} ${isCurrentUser ? 'font-semibold text-blue-700' : 'text-gray-800'}`}>
            {player.username}
            {isCurrentUser && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                You
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0">
        <div className={`${scoreClasses[size]} ${isCurrentUser ? 'text-blue-700' : 'text-gray-800'}`}>
          {player.score} pts
        </div>
      </div>
    </div>
  );
};

export default ScoreDisplay;
