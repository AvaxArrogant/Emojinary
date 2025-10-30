import React, { useMemo } from 'react';
import { Player } from '../../shared/types/api';
import { usePlayerListAnimations } from '../hooks/usePlayerListAnimations';
import { useResponsiveBreakpoint } from '../utils/mobileResponsiveness';

export interface EnhancedPlayerListProps {
  players: Player[];
  currentUserId?: string | undefined;
  maxPlayers?: number;
  isLoading?: boolean;
  className?: string;
  onPlayerClick?: (player: Player) => void;
}

export const EnhancedPlayerList: React.FC<EnhancedPlayerListProps> = ({
  players,
  currentUserId,
  maxPlayers = 8,
  isLoading = false,
  className = '',
  onPlayerClick
}) => {
  const { isMobile } = useResponsiveBreakpoint();
  
  const {
    getPlayerAnimationClasses,
    getContainerAnimationClasses,
    isAnimating
  } = usePlayerListAnimations(players, {
    animationDuration: 300,
    staggerDelay: 50
  });

  // Memoize player list to prevent unnecessary re-renders
  const playerListItems = useMemo(() => {
    return players.map((player, index) => {
      const isModerator = player.isModerator || (players.length > 0 && players[0]?.id === player.id);
      const isCurrentUser = player.id === currentUserId;
      const animationClasses = getPlayerAnimationClasses(player.id, index);

      return (
        <div
          key={player.id}
          className={`
            flex items-center justify-between rounded-lg border transition-all duration-200 ease-in-out
            ${isMobile ? 'p-4 min-h-[60px]' : 'p-3 min-h-[52px]'}
            ${isCurrentUser
              ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300 shadow-sm'
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:shadow-sm'
            }
            ${animationClasses}
            ${onPlayerClick ? 'cursor-pointer' : ''}
          `}
          onClick={() => onPlayerClick?.(player)}
          role={onPlayerClick ? 'button' : undefined}
          tabIndex={onPlayerClick ? 0 : undefined}
        >
          <div className="flex items-center flex-1 min-w-0">
            {/* Player Status and Moderator Indicators */}
            <div className="flex items-center mr-3 flex-shrink-0">
              {isModerator && (
                <span 
                  className="text-yellow-500 mr-2 animate-pulse-slow" 
                  title="Moderator"
                  role="img"
                  aria-label="Moderator"
                >
                  👑
                </span>
              )}
              <div 
                className={`
                  w-3 h-3 rounded-full border-2 border-white shadow-sm transition-colors duration-200
                  ${player.isActive ? 'bg-green-500' : 'bg-gray-400'}
                `}
                title={player.isActive ? 'Online' : 'Offline'}
                aria-label={player.isActive ? 'Online' : 'Offline'}
              />
            </div>

            {/* Player Information */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className={`
                  font-medium text-gray-900 truncate
                  ${isMobile ? 'text-base' : 'text-sm'}
                  ${isCurrentUser ? 'text-blue-900' : ''}
                `}>
                  {player.username}
                  {isCurrentUser && (
                    <span className="text-blue-600 ml-1 font-normal whitespace-nowrap">
                      (You)
                    </span>
                  )}
                </p>
                
                {/* Player badges */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {isModerator && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Mod
                    </span>
                  )}
                  {isCurrentUser && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      You
                    </span>
                  )}
                </div>
              </div>
              
              <div className={`
                flex items-center space-x-3 text-gray-500 mt-0.5
                ${isMobile ? 'text-sm' : 'text-xs'}
              `}>
                <span className="flex items-center space-x-1">
                  <span>Score:</span>
                  <span className="font-medium text-gray-700">{player.score}</span>
                </span>
                {isModerator && (
                  <span className="text-yellow-600 font-medium">• Moderator</span>
                )}
              </div>
            </div>
          </div>

          {/* Player Status and Join Time */}
          <div className="text-right flex-shrink-0 ml-3">
            <div className={`
              font-medium transition-colors duration-200
              ${isMobile ? 'text-sm' : 'text-xs'}
              ${player.isActive ? 'text-green-600' : 'text-gray-400'}
            `}>
              <div className="flex items-center space-x-1">
                <div className={`
                  w-2 h-2 rounded-full transition-colors duration-200
                  ${player.isActive ? 'bg-green-500' : 'bg-gray-400'}
                `} />
                <span>{player.isActive ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            <div className={`
              text-gray-400 mt-0.5
              ${isMobile ? 'text-xs' : 'text-xs'}
            `}>
              {new Date(player.joinedAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>
      );
    });
  }, [players, currentUserId, isMobile, getPlayerAnimationClasses, onPlayerClick]);

  return (
    <div className={`space-y-2 ${getContainerAnimationClasses()} ${className}`}>
      {/* Player count header with capacity indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className={`font-semibold text-gray-900 ${isMobile ? 'text-lg' : 'text-base'}`}>
            Players
          </h3>
          {isAnimating && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs text-blue-600">Updating...</span>
            </div>
          )}
        </div>
        
        {/* Enhanced capacity indicator */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <span className={`
              text-lg font-bold transition-colors duration-200
              ${players.length >= 2 ? 'text-green-600' : 'text-orange-600'}
            `}>
              {players.length}
            </span>
            <span className="text-gray-500">/</span>
            <span className="text-lg font-bold text-gray-700">{maxPlayers}</span>
          </div>
          
          {/* Capacity status indicator */}
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium transition-colors duration-200
            ${players.length === 0 ? 'bg-gray-100 text-gray-600' :
              players.length < 2 ? 'bg-orange-100 text-orange-700' :
              players.length >= maxPlayers ? 'bg-red-100 text-red-700' :
              'bg-green-100 text-green-700'
            }
          `}>
            {players.length === 0 ? 'Empty' :
             players.length < 2 ? 'Need More' :
             players.length >= maxPlayers ? 'Full' :
             'Ready'
            }
          </div>
        </div>
      </div>

      {/* Player list */}
      <div className="space-y-2 min-h-[120px]">
        {isLoading && players.length === 0 ? (
          // Loading skeleton
          <div className="space-y-2">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className={`
                  animate-pulse rounded-lg border border-gray-200
                  ${isMobile ? 'p-4 min-h-[60px]' : 'p-3 min-h-[52px]'}
                `}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-300 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-1/3" />
                    <div className="h-3 bg-gray-300 rounded w-1/4" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-300 rounded w-12" />
                    <div className="h-2 bg-gray-300 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : players.length === 0 ? (
          // Empty state
          <div className="text-center py-8">
            <div className="text-4xl mb-3">👥</div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              No Players Yet
            </h4>
            <p className="text-gray-600 text-sm">
              Be the first to join this game!
            </p>
          </div>
        ) : (
          // Player list items
          playerListItems
        )}

        {/* Waiting for more players indicator */}
        {players.length > 0 && players.length < maxPlayers && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center transition-all duration-200 hover:border-gray-400">
            <div className="text-2xl mb-1">➕</div>
            <p className="text-sm text-gray-500 font-medium">
              Waiting for more players...
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {maxPlayers - players.length} spot{maxPlayers - players.length !== 1 ? 's' : ''} remaining
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedPlayerList;
