import { useState, useEffect, useCallback, useRef } from 'react';
import { Player } from '../../shared/types/api';

export interface PlayerListAnimationState {
  animatingPlayers: Set<string>;
  newPlayers: Set<string>;
  leavingPlayers: Set<string>;
  animationKey: number;
}

export interface UsePlayerListAnimationsOptions {
  animationDuration?: number;
  staggerDelay?: number;
}

export const usePlayerListAnimations = (
  players: Player[],
  options: UsePlayerListAnimationsOptions = {}
) => {
  const {
    animationDuration = 300,
    staggerDelay = 50
  } = options;

  const [animationState, setAnimationState] = useState<PlayerListAnimationState>({
    animatingPlayers: new Set(),
    newPlayers: new Set(),
    leavingPlayers: new Set(),
    animationKey: 0
  });

  const previousPlayersRef = useRef<Player[]>([]);
  const animationTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      animationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      animationTimeoutsRef.current.clear();
    };
  }, []);

  // Detect player changes and trigger animations
  useEffect(() => {
    const previousPlayers = previousPlayersRef.current;
    const currentPlayerIds = new Set(players.map(p => p.id));
    const previousPlayerIds = new Set(previousPlayers.map(p => p.id));

    // Find new players (joined)
    const newPlayerIds = new Set(
      [...currentPlayerIds].filter(id => !previousPlayerIds.has(id))
    );

    // Find leaving players (left)
    const leavingPlayerIds = new Set(
      [...previousPlayerIds].filter(id => !currentPlayerIds.has(id))
    );

    if (newPlayerIds.size > 0 || leavingPlayerIds.size > 0) {
      setAnimationState(prev => ({
        ...prev,
        newPlayers: newPlayerIds,
        leavingPlayers: leavingPlayerIds,
        animatingPlayers: new Set([...newPlayerIds, ...leavingPlayerIds]),
        animationKey: prev.animationKey + 1
      }));

      // Clear animations after duration
      const clearAnimations = () => {
        setAnimationState(prev => ({
          ...prev,
          animatingPlayers: new Set(),
          newPlayers: new Set(),
          leavingPlayers: new Set()
        }));
      };

      const timeoutId = setTimeout(clearAnimations, animationDuration + (staggerDelay * Math.max(newPlayerIds.size, leavingPlayerIds.size)));
      animationTimeoutsRef.current.set('clear-animations', timeoutId);
    }

    previousPlayersRef.current = players;
  }, [players, animationDuration, staggerDelay]);

  // Get animation classes for a specific player
  const getPlayerAnimationClasses = useCallback((playerId: string, index: number) => {
    const classes: string[] = [];
    
    if (animationState.newPlayers.has(playerId)) {
      classes.push('animate-slide-up', 'animate-fade-in');
    }
    
    if (animationState.leavingPlayers.has(playerId)) {
      classes.push('animate-slide-down', 'opacity-50');
    }

    // Add stagger delay for smooth sequential animations
    if (animationState.animatingPlayers.has(playerId)) {
      classes.push(`animation-delay-${index * staggerDelay}ms`);
    }

    return classes.join(' ');
  }, [animationState, staggerDelay]);

  // Get container animation classes
  const getContainerAnimationClasses = useCallback(() => {
    return 'transition-all duration-300 ease-in-out';
  }, []);

  return {
    animationState,
    getPlayerAnimationClasses,
    getContainerAnimationClasses,
    isAnimating: animationState.animatingPlayers.size > 0
  };
};
