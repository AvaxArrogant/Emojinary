import { useMemo, useCallback, useRef, useEffect } from 'react';
import { Player } from '../../shared/types/api';

export interface PlayerListOptimization {
  shouldUpdate: boolean;
  optimizedPlayers: Player[];
  playerMap: Map<string, Player>;
  hasChanges: boolean;
}

export interface UseOptimizedPlayerListOptions {
  enableVirtualization?: boolean;
  maxVisiblePlayers?: number;
  updateThrottleMs?: number;
}

export const useOptimizedPlayerList = (
  players: Player[],
  options: UseOptimizedPlayerListOptions = {}
) => {
  const {
    enableVirtualization = false,
    maxVisiblePlayers = 20,
    updateThrottleMs = 100
  } = options;

  const previousPlayersRef = useRef<Player[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);
  const playerMapRef = useRef<Map<string, Player>>(new Map());

  // Memoized player map for fast lookups
  const playerMap = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach(player => {
      map.set(player.id, player);
    });
    return map;
  }, [players]);

  // Check if players have actually changed (deep comparison of relevant fields)
  const hasChanges = useMemo(() => {
    const previous = previousPlayersRef.current;
    
    if (previous.length !== players.length) {
      return true;
    }

    // Check if any player data has changed
    for (let i = 0; i < players.length; i++) {
      const current = players[i];
      const prev = previous[i];
      
      if (!prev || !current ||
          current.id !== prev.id ||
          current.username !== prev.username ||
          current.score !== prev.score ||
          current.isActive !== prev.isActive ||
          current.isModerator !== prev.isModerator) {
        return true;
      }
    }

    return false;
  }, [players]);

  // Throttled update check
  const shouldUpdate = useMemo(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    if (!hasChanges) {
      return false;
    }

    if (timeSinceLastUpdate >= updateThrottleMs) {
      lastUpdateTimeRef.current = now;
      return true;
    }

    return false;
  }, [hasChanges, updateThrottleMs]);

  // Optimized player list with virtualization if enabled
  const optimizedPlayers = useMemo(() => {
    if (!enableVirtualization || players.length <= maxVisiblePlayers) {
      return players;
    }

    // Simple virtualization - show first N players
    // In a more complex implementation, this would handle scrolling
    return players.slice(0, maxVisiblePlayers);
  }, [players, enableVirtualization, maxVisiblePlayers]);

  // Update refs when changes are detected
  useEffect(() => {
    if (shouldUpdate) {
      previousPlayersRef.current = [...players];
      playerMapRef.current = new Map(playerMap);
    }
  }, [shouldUpdate, players, playerMap]);

  // Memoized comparison functions
  const getPlayerById = useCallback((id: string): Player | undefined => {
    return playerMap.get(id);
  }, [playerMap]);

  const isPlayerNew = useCallback((playerId: string): boolean => {
    return !playerMapRef.current.has(playerId) && playerMap.has(playerId);
  }, [playerMap]);

  const isPlayerRemoved = useCallback((playerId: string): boolean => {
    return playerMapRef.current.has(playerId) && !playerMap.has(playerId);
  }, [playerMap]);

  const hasPlayerChanged = useCallback((playerId: string): boolean => {
    const current = playerMap.get(playerId);
    const previous = playerMapRef.current.get(playerId);
    
    if (!current || !previous) {
      return true;
    }

    return (
      current.username !== previous.username ||
      current.score !== previous.score ||
      current.isActive !== previous.isActive ||
      current.isModerator !== previous.isModerator
    );
  }, [playerMap]);

  // Performance metrics
  const metrics = useMemo(() => ({
    totalPlayers: players.length,
    visiblePlayers: optimizedPlayers.length,
    isVirtualized: enableVirtualization && players.length > maxVisiblePlayers,
    hasChanges,
    shouldUpdate,
    lastUpdateTime: lastUpdateTimeRef.current
  }), [players.length, optimizedPlayers.length, enableVirtualization, maxVisiblePlayers, hasChanges, shouldUpdate]);

  return {
    optimizedPlayers,
    playerMap,
    shouldUpdate,
    hasChanges,
    getPlayerById,
    isPlayerNew,
    isPlayerRemoved,
    hasPlayerChanged,
    metrics
  };
};
