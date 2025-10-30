import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import type { GameState, Player, Round, Guess, RoundResult } from '../../shared/types/game';
import { getConnectionManager } from '../utils/connectionManager';

// Game Context Types
type LoadingOperations = {
  joining: boolean;
  starting: boolean;
  leaving: boolean;
  refreshing: boolean;
  submittingEmojis: boolean;
  submittingGuess: boolean;
  initializing: boolean;
};

type GameContextState = {
  // Core game state
  gameState: GameState | null;
  currentRound: Round | null;
  players: Record<string, Player>;
  currentUser: Player | null;
  
  // UI state
  loading: boolean;
  loadingOperations: LoadingOperations;
  loadingMessage: string | null;
  error: string | null;
  connected: boolean;
  
  // Game flow state
  isPresenter: boolean;
  canGuess: boolean;
  timeRemaining: number;
};

type GameContextActions = {
  // Game lifecycle
  joinGame: () => Promise<void>;
  startGame: () => Promise<void>;
  leaveGame: () => Promise<void>;
  
  // Round actions
  submitEmojis: (emojis: string[]) => Promise<void>;
  submitGuess: (guess: string) => Promise<void>;
  
  // Utility actions
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  refreshGameState: () => Promise<void>;
};

type GameContextType = GameContextState & GameContextActions;

// Action types for reducer
type GameAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_OPERATION_LOADING'; payload: { operation: keyof LoadingOperations; loading: boolean } }
  | { type: 'SET_LOADING_MESSAGE'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_GAME_STATE'; payload: GameState | null }
  | { type: 'SET_CURRENT_ROUND'; payload: Round | null }
  | { type: 'SET_PLAYERS'; payload: Record<string, Player> }
  | { type: 'SET_CURRENT_USER'; payload: Player | null }
  | { type: 'SET_TIME_REMAINING'; payload: number }
  | { type: 'PLAYER_JOINED'; payload: Player }
  | { type: 'PLAYER_LEFT'; payload: string }
  | { type: 'MODERATOR_TRANSFERRED'; payload: { oldModeratorId: string; newModeratorId: string } }
  | { type: 'ROUND_STARTED'; payload: Round }
  | { type: 'ROUND_ENDED'; payload: RoundResult }
  | { type: 'GUESS_SUBMITTED'; payload: Guess }
  | { type: 'EMOJIS_SUBMITTED'; payload: string[] }
  | { type: 'SCORES_UPDATED'; payload: Record<string, number> };

// Initial state
const initialState: GameContextState = {
  gameState: null,
  currentRound: null,
  players: {},
  currentUser: null,
  loading: true,
  loadingOperations: {
    joining: false,
    starting: false,
    leaving: false,
    refreshing: false,
    submittingEmojis: false,
    submittingGuess: false,
    initializing: true,
  },
  loadingMessage: null,
  error: null,
  connected: false,
  isPresenter: false,
  canGuess: false,
  timeRemaining: 0,
};

// Reducer function
const gameReducer = (state: GameContextState, action: GameAction): GameContextState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_OPERATION_LOADING':
      const newLoadingOperations = {
        ...state.loadingOperations,
        [action.payload.operation]: action.payload.loading,
      };
      
      // Update general loading state based on any operation being active
      const anyOperationLoading = Object.values(newLoadingOperations).some(loading => loading);
      
      return { 
        ...state, 
        loadingOperations: newLoadingOperations,
        loading: anyOperationLoading
      };
    
    case 'SET_LOADING_MESSAGE':
      return { ...state, loadingMessage: action.payload };
    
    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload, 
        loading: action.payload ? state.loading : false,
        loadingMessage: action.payload ? null : state.loadingMessage
      };
    
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.payload };
    
    case 'SET_CURRENT_ROUND':
      const isPresenter = action.payload?.presenterId === state.currentUser?.id;
      const canGuess = action.payload?.status === 'active' && !isPresenter;
      return { 
        ...state, 
        currentRound: action.payload,
        isPresenter,
        canGuess
      };
    
    case 'SET_PLAYERS': {
      // Validate and normalize player data structure
      const playersPayload = action.payload;
      if (!playersPayload || typeof playersPayload !== 'object') {
        console.warn('Invalid player data received:', playersPayload);
        return state;
      }
      
      // Ensure all players have required fields with defaults
      const normalizedPlayers: Record<string, Player> = {};
      Object.entries(playersPayload).forEach(([playerId, player]) => {
        if (player && typeof player === 'object' && player.id && player.username) {
          normalizedPlayers[playerId] = {
            id: player.id,
            username: player.username,
            subredditName: player.subredditName || '',
            score: typeof player.score === 'number' ? player.score : 0,
            isActive: typeof player.isActive === 'boolean' ? player.isActive : true,
            joinedAt: typeof player.joinedAt === 'number' ? player.joinedAt : Date.now(),
            isModerator: false // Will be set correctly below
          };
        }
      });
      
      // Sort players by join time to determine moderator
      const playersList = Object.values(normalizedPlayers).sort((a, b) => a.joinedAt - b.joinedAt);
      
      if (playersList.length > 0) {
        // Set the first player (by join time) as moderator
        const moderator = playersList[0];
        if (moderator) {
          normalizedPlayers[moderator.id] = { ...moderator, isModerator: true };
          
          // Update game state with moderator ID if needed
          let updatedGameState = state.gameState;
          if (state.gameState && state.gameState.moderatorId !== moderator.id) {
            updatedGameState = { ...state.gameState, moderatorId: moderator.id };
          }
          
          // Update current user if they are in the players list
          let updatedCurrentUser: Player | null = state.currentUser;
          if (updatedCurrentUser && normalizedPlayers[updatedCurrentUser.id]) {
            updatedCurrentUser = normalizedPlayers[updatedCurrentUser.id] || null;
          }
          
          return { 
            ...state, 
            players: normalizedPlayers,
            gameState: updatedGameState,
            currentUser: updatedCurrentUser
          };
        }
      }
      
      return { ...state, players: normalizedPlayers };
    }
    
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    
    case 'SET_TIME_REMAINING':
      return { ...state, timeRemaining: action.payload };
    
    case 'PLAYER_JOINED':
      // Validate player data
      if (!action.payload || !action.payload.id || !action.payload.username) {
        console.warn('Invalid player data for join event:', action.payload);
        return state;
      }
      
      // Normalize the new player data
      const normalizedNewPlayer: Player = {
        id: action.payload.id,
        username: action.payload.username,
        subredditName: action.payload.subredditName || '',
        score: typeof action.payload.score === 'number' ? action.payload.score : 0,
        isActive: typeof action.payload.isActive === 'boolean' ? action.payload.isActive : true,
        joinedAt: typeof action.payload.joinedAt === 'number' ? action.payload.joinedAt : Date.now(),
        isModerator: false
      };
      
      // Don't add if player already exists
      if (state.players[normalizedNewPlayer.id]) {
        console.warn('Player already exists, ignoring join event:', normalizedNewPlayer.id);
        return state;
      }
      
      const newPlayers = { ...state.players, [normalizedNewPlayer.id]: normalizedNewPlayer };
      
      // Recalculate moderator status for all players
      const allPlayersList = Object.values(newPlayers).sort((a, b) => a.joinedAt - b.joinedAt);
      if (allPlayersList.length > 0) {
        // Clear all moderator flags first
        Object.values(newPlayers).forEach(player => {
          newPlayers[player.id] = { ...player, isModerator: false };
        });
        
        // Set the first player (by join time) as moderator
        const moderator = allPlayersList[0];
        if (moderator) {
          newPlayers[moderator.id] = { ...moderator, isModerator: true };
          
          // Update game state with moderator ID
          const updatedGameState = state.gameState 
            ? { ...state.gameState, moderatorId: moderator.id }
            : null;
            
          return {
            ...state,
            players: newPlayers,
            gameState: updatedGameState
          };
        }
      }
      
      return {
        ...state,
        players: newPlayers
      };
    
    case 'PLAYER_LEFT':
      // Validate player ID
      if (!action.payload || typeof action.payload !== 'string') {
        console.warn('Invalid player ID for leave event:', action.payload);
        return state;
      }
      
      // Check if player exists
      if (!state.players[action.payload]) {
        console.warn('Player not found for leave event:', action.payload);
        return state;
      }
      
      const { [action.payload]: removed, ...remainingPlayers } = state.players;
      
      // If no players remain, reset game state
      if (Object.keys(remainingPlayers).length === 0) {
        return {
          ...state,
          players: {},
          gameState: null
        };
      }
      
      // Recalculate moderator for remaining players
      let updatedGameState = state.gameState;
      const remainingPlayersList = Object.values(remainingPlayers).sort((a, b) => a.joinedAt - b.joinedAt);
      
      if (remainingPlayersList.length > 0) {
        // Clear all moderator flags first
        Object.values(remainingPlayers).forEach(player => {
          remainingPlayers[player.id] = { ...player, isModerator: false };
        });
        
        // Set the first remaining player (by join time) as moderator
        const newModerator = remainingPlayersList[0];
        if (newModerator) {
          remainingPlayers[newModerator.id] = { ...newModerator, isModerator: true };
          
          // Update game state with new moderator
          if (state.gameState) {
            updatedGameState = { ...state.gameState, moderatorId: newModerator.id };
          }
        }
      }
      
      return { 
        ...state, 
        players: remainingPlayers,
        gameState: updatedGameState
      };
    
    case 'ROUND_STARTED':
      const isNewPresenter = action.payload.presenterId === state.currentUser?.id;
      const canNewGuess = action.payload.status === 'active' && !isNewPresenter;
      return {
        ...state,
        currentRound: action.payload,
        isPresenter: isNewPresenter,
        canGuess: canNewGuess,
        timeRemaining: 120 // 2 minutes in seconds
      };
    
    case 'ROUND_ENDED':
      const updatedRound = state.currentRound ? { 
        ...state.currentRound, 
        status: 'ended' as const,
        endTime: Date.now(),
        ...(action.payload.winnerId && { winnerId: action.payload.winnerId })
      } : null;
      
      return {
        ...state,
        currentRound: updatedRound,
        isPresenter: false,
        canGuess: false,
        timeRemaining: 0
      };
    
    case 'GUESS_SUBMITTED':
      if (!state.currentRound) return state;
      return {
        ...state,
        currentRound: {
          ...state.currentRound,
          guesses: [...state.currentRound.guesses, action.payload]
        }
      };
    
    case 'EMOJIS_SUBMITTED':
      if (!state.currentRound) return state;
      return {
        ...state,
        currentRound: {
          ...state.currentRound,
          emojiSequence: action.payload
        }
      };
    
    case 'SCORES_UPDATED':
      // Update player scores in the players record
      const updatedPlayers = { ...state.players };
      Object.entries(action.payload).forEach(([playerId, score]) => {
        if (updatedPlayers[playerId]) {
          updatedPlayers[playerId] = { ...updatedPlayers[playerId], score };
        }
      });
      
      // Update current user score if applicable
      let updatedCurrentUser = state.currentUser;
      if (updatedCurrentUser && action.payload[updatedCurrentUser.id] !== undefined) {
        const newScore = action.payload[updatedCurrentUser.id];
        if (typeof newScore === 'number') {
          updatedCurrentUser = { ...updatedCurrentUser, score: newScore };
        }
      }
      
      return {
        ...state,
        players: updatedPlayers,
        currentUser: updatedCurrentUser,
      };
    
    case 'MODERATOR_TRANSFERRED':
      const playersAfterTransfer = { ...state.players };
      
      // Remove moderator flag from old moderator
      const oldModerator = playersAfterTransfer[action.payload.oldModeratorId];
      if (oldModerator) {
        playersAfterTransfer[action.payload.oldModeratorId] = {
          ...oldModerator,
          isModerator: false
        } as Player;
      }
      
      // Add moderator flag to new moderator
      const newModerator = playersAfterTransfer[action.payload.newModeratorId];
      if (newModerator) {
        playersAfterTransfer[action.payload.newModeratorId] = {
          ...newModerator,
          isModerator: true
        } as Player;
      }
      
      // Update game state with new moderator ID
      const gameStateAfterTransfer = state.gameState 
        ? { ...state.gameState, moderatorId: action.payload.newModeratorId }
        : null;
      
      return {
        ...state,
        players: playersAfterTransfer,
        gameState: gameStateAfterTransfer
      };
    
    default:
      return state;
  }
};

// Create context
const GameContext = createContext<GameContextType | null>(null);

// Provider component
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [gameId, setGameId] = useState<string>('');
  
  // Real-time connection - temporarily disabled for initial testing
  const realtimeEvents = null;
  
  // Update connection status - set to true for now since real-time is disabled
  useEffect(() => {
    dispatch({ type: 'SET_CONNECTED', payload: true });
  }, []);

  // Enhanced polling mechanism with comprehensive error handling and exponential backoff
  useEffect(() => {
    if (!gameId || !state.gameState || state.gameState.status !== 'lobby') {
      return;
    }

    let pollTimeout: NodeJS.Timeout;
    let retryCount = 0;
    let lastUpdateTimestamp = 0;
    let consecutiveFailures = 0;
    const maxRetries = 5;
    const baseInterval = 2000; // 2 seconds base interval
    const maxInterval = 30000; // 30 seconds max interval
    const maxConsecutiveFailures = 3;

    const poll = async () => {
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch('/api/game/init', {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Handle different HTTP error codes appropriately
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          
          if (response.status === 429) {
            errorMessage = 'Rate limited. Slowing down requests.';
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Retrying...';
          } else if (response.status === 404) {
            errorMessage = 'Game not found. Please rejoin.';
          } else if (response.status === 401 || response.status === 403) {
            errorMessage = 'Authentication error. Please refresh the page.';
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // Validate response data structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format from server');
        }
        
        // Compare timestamps to avoid unnecessary updates
        const serverTimestamp = data.timestamp || Date.now();
        if (serverTimestamp <= lastUpdateTimestamp) {
          // No new updates, schedule next poll
          scheduleNextPoll(baseInterval);
          return;
        }
        
        lastUpdateTimestamp = serverTimestamp;
        
        // Check for player changes (more comprehensive comparison)
        const currentPlayerIds = Object.keys(state.players).sort();
        const serverPlayerIds = Object.keys(data.players || {}).sort();
        const playersChanged = 
          currentPlayerIds.length !== serverPlayerIds.length ||
          currentPlayerIds.some((id, index) => id !== serverPlayerIds[index]);
        
        if (playersChanged && data.players) {
          dispatch({ type: 'SET_PLAYERS', payload: data.players });
        }
        
        // Check for game state changes
        if (data.gameState && (
          data.gameState.status !== state.gameState?.status ||
          data.gameState.updatedAt !== state.gameState?.updatedAt
        )) {
          dispatch({ type: 'SET_GAME_STATE', payload: data.gameState });
        }
        
        // Check for round changes
        if (data.currentRound && !state.currentRound) {
          dispatch({ type: 'SET_CURRENT_ROUND', payload: data.currentRound });
        }
        
        // Reset failure counters on successful poll
        retryCount = 0;
        consecutiveFailures = 0;
        
        // Clear any existing errors
        if (state.error) {
          dispatch({ type: 'SET_ERROR', payload: null });
        }
        
        // Update connection status
        dispatch({ type: 'SET_CONNECTED', payload: true });
        
        // Schedule next poll with base interval
        scheduleNextPoll(baseInterval);
        
      } catch (error) {
        console.warn('Polling failed:', error);
        retryCount++;
        consecutiveFailures++;
        
        // Update connection status
        dispatch({ type: 'SET_CONNECTED', payload: false });
        
        // Handle different types of errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown polling error';
        
        if (retryCount >= maxRetries) {
          console.error('Max polling retries reached, stopping polling');
          dispatch({ 
            type: 'SET_ERROR', 
            payload: 'Connection lost. Please use the refresh button or reload the page to reconnect.' 
          });
          return;
        }
        
        // For consecutive failures, show intermediate error messages
        if (consecutiveFailures >= maxConsecutiveFailures) {
          dispatch({ 
            type: 'SET_ERROR', 
            payload: `Connection issues detected. Retrying... (${retryCount}/${maxRetries})` 
          });
        }
        
        // Exponential backoff with jitter and rate limit handling
        let backoffDelay = baseInterval * Math.pow(2, retryCount - 1) + Math.random() * 1000;
        
        // Special handling for rate limits
        if (errorMessage.includes('429') || errorMessage.includes('Rate limited')) {
          backoffDelay = Math.max(backoffDelay, 5000); // Minimum 5 seconds for rate limits
        }
        
        backoffDelay = Math.min(backoffDelay, maxInterval);
        
        scheduleNextPoll(backoffDelay);
      }
    };

    const scheduleNextPoll = (delay: number) => {
      pollTimeout = setTimeout(poll, delay);
    };

    // Start polling immediately
    poll();

    return () => {
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [gameId, state.gameState?.status, state.gameState?.updatedAt, state.error]);


  // Subscribe to game events (currently disabled)
  useEffect(() => {
    if (!realtimeEvents) return;

    // TODO: Re-enable when realtime events are implemented
    /*
    const unsubscribers = [
      realtimeEvents.onPlayerJoined((player: Player) => {
        dispatch({ type: 'PLAYER_JOINED', payload: player });
      }),
      realtimeEvents.onPlayerLeft((playerId: string) => {
        dispatch({ type: 'PLAYER_LEFT', payload: playerId });
      }),
      realtimeEvents.onGameStarted((gameState: GameState) => {
        dispatch({ type: 'SET_GAME_STATE', payload: gameState });
      }),
      realtimeEvents.onRoundStarted((round: Round) => {
        dispatch({ type: 'ROUND_STARTED', payload: round });
      }),
      realtimeEvents.onRoundEnded((result: RoundResult) => {
        dispatch({ type: 'ROUND_ENDED', payload: result });
        // Update scores if provided in round result
        if (result.scores && Object.keys(result.scores).length > 0) {
          dispatch({ type: 'SCORES_UPDATED', payload: result.scores });
        }
      }),
      realtimeEvents.onEmojisSubmitted((_: string, emojis: string[]) => {
        dispatch({ type: 'EMOJIS_SUBMITTED', payload: emojis });
      }),
      realtimeEvents.onGuessSubmitted((guess: Guess) => {
        dispatch({ type: 'GUESS_SUBMITTED', payload: guess });
      }),
      realtimeEvents.onTimerUpdate((_: string, remaining: number) => {
        dispatch({ type: 'SET_TIME_REMAINING', payload: remaining });
      }),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
    */
  }, [realtimeEvents]);

  // Initialize game state
  useEffect(() => {
    const initializeGame = async () => {
      try {
        dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'initializing', loading: true } });
        dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Initializing game...' });
        
        const response = await fetch('/api/game/init');
        if (!response.ok) {
          throw new Error(`Failed to initialize game: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.currentUser) {
          dispatch({ type: 'SET_CURRENT_USER', payload: data.currentUser });
        }

        // If there's an active game, load it
        if (data.gameState) {
          dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Loading game state...' });
          dispatch({ type: 'SET_GAME_STATE', payload: data.gameState });
          setGameId(data.gameState.id);
          
          if (data.currentRound) {
            dispatch({ type: 'SET_CURRENT_ROUND', payload: data.currentRound });
          }
          
          if (data.players) {
            dispatch({ type: 'SET_PLAYERS', payload: data.players });
          }
          
          dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'initializing', loading: false } });
          dispatch({ type: 'SET_LOADING_MESSAGE', payload: null });
        } else {
          // No active game found, automatically join/create one
          console.log('No active game found, joining game...');
          dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Creating new game...' });
          try {
            await joinGameInternal();
            dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'initializing', loading: false } });
            dispatch({ type: 'SET_LOADING_MESSAGE', payload: null });
          } catch (joinError) {
            console.error('Failed to auto-join game:', joinError);
            // If auto-join fails, just set loading to false and let user manually join
            dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'initializing', loading: false } });
            dispatch({ type: 'SET_LOADING_MESSAGE', payload: null });
          }
        }
        
        // Notify connection manager that we're connected
        getConnectionManager().updateConnectionState(true);
      } catch (error) {
        console.error('Failed to initialize game:', error);
        
        // Notify connection manager that we're disconnected
        getConnectionManager().updateConnectionState(false);
        
        dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'initializing', loading: false } });
        dispatch({ type: 'SET_LOADING_MESSAGE', payload: null });
        dispatch({ 
          type: 'SET_ERROR', 
          payload: error instanceof Error ? error.message : 'Failed to initialize game' 
        });
      }
    };

    const joinGameInternal = async () => {
      try {
        const response = await fetch('/api/game/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to join game: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.gameState) {
          dispatch({ type: 'SET_GAME_STATE', payload: data.gameState });
          setGameId(data.gameState.id);
        }
        
        if (data.player) {
          dispatch({ type: 'SET_CURRENT_USER', payload: data.player });
        }
        
        // Notify connection manager that we're connected
        getConnectionManager().updateConnectionState(true);
      } catch (error) {
        console.error('Failed to join game:', error);
        throw error;
      }
    };

    initializeGame();
  }, []);

  // Game action implementations
  const joinGame = useCallback(async () => {
    // Prevent multiple simultaneous join operations
    if (state.loadingOperations.joining) {
      console.warn('Join operation already in progress');
      return;
    }
    
    try {
      dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'joining', loading: true } });
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Joining game...' });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = `Failed to join game: ${response.status}`;
        
        // Provide specific error messages based on status code
        switch (response.status) {
          case 400:
            errorMessage = 'Invalid request. Please try again.';
            break;
          case 401:
            errorMessage = 'Authentication required. Please refresh the page.';
            break;
          case 403:
            errorMessage = 'You do not have permission to join this game.';
            break;
          case 404:
            errorMessage = 'Game not found. It may have ended or been removed.';
            break;
          case 409:
            errorMessage = 'You are already in a game or the game is full.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please wait a moment and try again.';
            break;
          case 500:
          case 502:
          case 503:
            errorMessage = 'Server error. Please try again in a moment.';
            break;
          default:
            errorMessage = `Network error (${response.status}). Please check your connection and try again.`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Validate response data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from server. Please try again.');
      }
      
      if (data.gameState) {
        dispatch({ type: 'SET_GAME_STATE', payload: data.gameState });
        setGameId(data.gameState.id);
      }
      
      if (data.player) {
        dispatch({ type: 'SET_CURRENT_USER', payload: data.player });
      }
      
      // Load initial players if provided
      if (data.players) {
        dispatch({ type: 'SET_PLAYERS', payload: data.players });
      }
      
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Successfully joined!' });
      
      // Brief success message before clearing
      setTimeout(() => {
        dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'joining', loading: false } });
        dispatch({ type: 'SET_LOADING_MESSAGE', payload: null });
      }, 500);
      
      // Notify connection manager that we're connected
      getConnectionManager().updateConnectionState(true);
    } catch (error) {
      console.error('Failed to join game:', error);
      
      // Notify connection manager that we're disconnected
      getConnectionManager().updateConnectionState(false);
      
      let errorMessage = 'Failed to join game';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'joining', loading: false } });
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: null });
      dispatch({ 
        type: 'SET_ERROR', 
        payload: errorMessage
      });
    }
  }, [state.loadingOperations.joining]);

  const startGame = useCallback(async () => {
    // Prevent multiple simultaneous start operations
    if (state.loadingOperations.starting) {
      console.warn('Start operation already in progress');
      return;
    }
    
    try {
      dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'starting', loading: true } });
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Starting game...' });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Validate preconditions
      if (!state.gameState || state.gameState.status !== 'lobby') {
        throw new Error('Game is not in a state that can be started');
      }
      
      const playerCount = Object.keys(state.players).length;
      if (playerCount < 2) {
        throw new Error('Need at least 2 players to start the game');
      }
      
      // Add timeout for start game operation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = `Failed to start game: ${response.status}`;
        
        // Provide specific error messages based on status code
        switch (response.status) {
          case 400:
            errorMessage = 'Cannot start game. Check that you have enough players and are the moderator.';
            break;
          case 401:
            errorMessage = 'Authentication required. Please refresh the page.';
            break;
          case 403:
            errorMessage = 'Only the game moderator can start the game.';
            break;
          case 404:
            errorMessage = 'Game not found. It may have been removed.';
            break;
          case 409:
            errorMessage = 'Game has already been started or is no longer available.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please wait a moment and try again.';
            break;
          case 500:
          case 502:
          case 503:
            errorMessage = 'Server error. Please try again in a moment.';
            break;
          default:
            errorMessage = `Network error (${response.status}). Please check your connection and try again.`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Validate response data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from server. Please try again.');
      }
      
      if (data.gameState) {
        dispatch({ type: 'SET_GAME_STATE', payload: data.gameState });
      }
      
      if (data.round) {
        dispatch({ type: 'SET_CURRENT_ROUND', payload: data.round });
      }
      
      // Update players if provided
      if (data.players) {
        dispatch({ type: 'SET_PLAYERS', payload: data.players });
      }
      
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Game started successfully!' });
      
      // Brief success message before clearing
      setTimeout(() => {
        dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'starting', loading: false } });
        dispatch({ type: 'SET_LOADING_MESSAGE', payload: null });
      }, 1000);
    } catch (error) {
      console.error('Failed to start game:', error);
      
      let errorMessage = 'Failed to start game';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'starting', loading: false } });
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: null });
      dispatch({ 
        type: 'SET_ERROR', 
        payload: errorMessage
      });
    }
  }, [state.gameState, state.players, state.loadingOperations.starting]);

  const leaveGame = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch('/api/game/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to leave game: ${response.status}`);
      }
      
      // Reset state
      setGameId('');
      dispatch({ type: 'SET_CURRENT_ROUND', payload: null });
      dispatch({ type: 'SET_PLAYERS', payload: {} });
      dispatch({ type: 'SET_CURRENT_USER', payload: null });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Failed to leave game:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to leave game' 
      });
    }
  }, []);

  const submitEmojis = useCallback(async (emojis: string[]) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Get current game and round info
      if (!state.gameState?.id || !state.currentRound?.id) {
        throw new Error('No active game or round found');
      }
      
      const response = await fetch('/api/emojis/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: state.gameState.id,
          roundId: state.currentRound.id,
          emojiSequence: emojis 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit emojis: ${response.status}`);
      }
      
      // Update the local state immediately
      dispatch({ type: 'EMOJIS_SUBMITTED', payload: emojis });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Failed to submit emojis:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to submit emojis' 
      });
    }
  }, [state.gameState?.id, state.currentRound?.id]);

  const submitGuess = useCallback(async (guess: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Get current game and round info
      if (!state.gameState?.id || !state.currentRound?.id) {
        throw new Error('No active game or round found');
      }
      
      const response = await fetch('/api/guess/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: state.gameState.id,
          roundId: state.currentRound.id,
          guess 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to submit guess: ${response.status}`);
      }
      
      // The response should contain the guess result
      const result = await response.json();
      if (result.data?.guess) {
        dispatch({ type: 'GUESS_SUBMITTED', payload: result.data.guess });
      }
    } catch (error) {
      console.error('Failed to submit guess:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to submit guess' 
      });
    }
  }, [state.gameState?.id, state.currentRound?.id]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const refreshGameState = useCallback(async () => {
    // Prevent multiple simultaneous refresh operations
    if (state.loadingOperations.refreshing) {
      console.warn('Refresh operation already in progress');
      return;
    }
    
    try {
      dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'refreshing', loading: true } });
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Refreshing game state...' });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Add timeout for refresh operation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/game/init', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = `Failed to refresh game state: ${response.status}`;
        
        // Provide specific error messages based on status code
        switch (response.status) {
          case 401:
            errorMessage = 'Authentication expired. Please refresh the page.';
            break;
          case 404:
            errorMessage = 'Game session not found. You may need to rejoin.';
            break;
          case 429:
            errorMessage = 'Too many refresh requests. Please wait a moment.';
            break;
          case 500:
          case 502:
          case 503:
            errorMessage = 'Server error. Please try again in a moment.';
            break;
          default:
            errorMessage = `Network error (${response.status}). Please check your connection.`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Validate response data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from server. Please try refreshing the page.');
      }
      
      // Update all relevant state from the fresh data
      if (data.gameState) {
        dispatch({ type: 'SET_GAME_STATE', payload: data.gameState });
        setGameId(data.gameState.id);
      } else {
        // No game state means we need to rejoin
        console.log('No game state in refresh response, may need to rejoin');
      }
      
      if (data.players) {
        dispatch({ type: 'SET_PLAYERS', payload: data.players });
      }
      
      if (data.currentUser) {
        dispatch({ type: 'SET_CURRENT_USER', payload: data.currentUser });
      }
      
      if (data.currentRound) {
        dispatch({ type: 'SET_CURRENT_ROUND', payload: data.currentRound });
      }
      
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Refreshed successfully!' });
      dispatch({ type: 'SET_CONNECTED', payload: true });
      
      // Brief success message before clearing
      setTimeout(() => {
        dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'refreshing', loading: false } });
        dispatch({ type: 'SET_LOADING_MESSAGE', payload: null });
      }, 500);
      
      // Notify connection manager that we're connected
      getConnectionManager().updateConnectionState(true);
      
    } catch (error) {
      console.error('Failed to refresh game state:', error);
      
      // Notify connection manager that we're disconnected
      getConnectionManager().updateConnectionState(false);
      dispatch({ type: 'SET_CONNECTED', payload: false });
      
      let errorMessage = 'Failed to refresh game state';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Refresh timed out. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      dispatch({ type: 'SET_OPERATION_LOADING', payload: { operation: 'refreshing', loading: false } });
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: null });
      dispatch({ 
        type: 'SET_ERROR', 
        payload: errorMessage
      });
    }
  }, [state.loadingOperations.refreshing]);

  // Context value
  const contextValue: GameContextType = {
    // State
    ...state,
    
    // Actions
    joinGame,
    startGame,
    leaveGame,
    submitEmojis,
    submitGuess,
    clearError,
    setLoading,
    refreshGameState,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

// Custom hook to use game context
export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

// Export context for testing
export { GameContext };
