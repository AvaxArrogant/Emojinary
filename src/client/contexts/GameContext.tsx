import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import type { GameState, Player, Round, Guess, RoundResult } from '../../shared/types/game';
import { useRealtimeEvents } from '../hooks/useRealtime';

// Game Context Types
type GameContextState = {
  // Core game state
  gameState: GameState | null;
  currentRound: Round | null;
  players: Record<string, Player>;
  currentUser: Player | null;
  
  // UI state
  loading: boolean;
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
};

type GameContextType = GameContextState & GameContextActions;

// Action types for reducer
type GameAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_GAME_STATE'; payload: GameState | null }
  | { type: 'SET_CURRENT_ROUND'; payload: Round | null }
  | { type: 'SET_PLAYERS'; payload: Record<string, Player> }
  | { type: 'SET_CURRENT_USER'; payload: Player | null }
  | { type: 'SET_TIME_REMAINING'; payload: number }
  | { type: 'PLAYER_JOINED'; payload: Player }
  | { type: 'PLAYER_LEFT'; payload: string }
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
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
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
    
    case 'SET_PLAYERS':
      return { ...state, players: action.payload };
    
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    
    case 'SET_TIME_REMAINING':
      return { ...state, timeRemaining: action.payload };
    
    case 'PLAYER_JOINED':
      return {
        ...state,
        players: { ...state.players, [action.payload.id]: action.payload }
      };
    
    case 'PLAYER_LEFT':
      const { [action.payload]: removed, ...remainingPlayers } = state.players;
      return { ...state, players: remainingPlayers };
    
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
      return {
        ...state,
        currentRound: state.currentRound ? { ...state.currentRound, status: 'ended' } : null,
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
        updatedCurrentUser = { ...updatedCurrentUser, score: action.payload[updatedCurrentUser.id] };
      }
      
      return {
        ...state,
        players: updatedPlayers,
        currentUser: updatedCurrentUser,
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
  const [username, setUsername] = useState<string>('');
  
  // Real-time connection - only connect if we have gameId and username
  const realtimeEvents = gameId && username ? useRealtimeEvents(gameId, username) : null;
  
  // Update connection status
  useEffect(() => {
    dispatch({ type: 'SET_CONNECTED', payload: realtimeEvents?.isConnected || false });
  }, [realtimeEvents?.isConnected]);


  // Subscribe to game events
  useEffect(() => {
    if (!realtimeEvents) return;

    const unsubscribers = [
      realtimeEvents.onPlayerJoined((player) => {
        dispatch({ type: 'PLAYER_JOINED', payload: player });
      }),
      realtimeEvents.onPlayerLeft((playerId) => {
        dispatch({ type: 'PLAYER_LEFT', payload: playerId });
      }),
      realtimeEvents.onGameStarted((gameState) => {
        dispatch({ type: 'SET_GAME_STATE', payload: gameState });
      }),
      realtimeEvents.onRoundStarted((round) => {
        dispatch({ type: 'ROUND_STARTED', payload: round });
      }),
      realtimeEvents.onRoundEnded((result) => {
        dispatch({ type: 'ROUND_ENDED', payload: result });
        // Update scores if provided in round result
        if (result.scores && Object.keys(result.scores).length > 0) {
          dispatch({ type: 'SCORES_UPDATED', payload: result.scores });
        }
      }),
      realtimeEvents.onEmojisSubmitted((_, emojis) => {
        dispatch({ type: 'EMOJIS_SUBMITTED', payload: emojis });
      }),
      realtimeEvents.onGuessSubmitted((guess) => {
        dispatch({ type: 'GUESS_SUBMITTED', payload: guess });
      }),
      realtimeEvents.onTimerUpdate((_, remaining) => {
        dispatch({ type: 'SET_TIME_REMAINING', payload: remaining });
      }),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [realtimeEvents]);

  // Initialize game state
  useEffect(() => {
    const initializeGame = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const response = await fetch('/api/game/init');
        if (!response.ok) {
          throw new Error(`Failed to initialize game: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.gameState) {
          dispatch({ type: 'SET_GAME_STATE', payload: data.gameState });
        }
        
        if (data.currentRound) {
          dispatch({ type: 'SET_CURRENT_ROUND', payload: data.currentRound });
        }
        
        if (data.players) {
          dispatch({ type: 'SET_PLAYERS', payload: data.players });
        }
        
        if (data.currentUser) {
          dispatch({ type: 'SET_CURRENT_USER', payload: data.currentUser });
          setUsername(data.currentUser.username);
        }

        if (data.gameState?.id) {
          setGameId(data.gameState.id);
        }
        
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Failed to initialize game:', error);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: error instanceof Error ? error.message : 'Failed to initialize game' 
        });
      }
    };

    initializeGame();
  }, []);

  // Game action implementations
  const joinGame = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
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
        setUsername(data.player.username);
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Failed to join game:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to join game' 
      });
    }
  }, []);

  const startGame = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start game: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.gameState) {
        dispatch({ type: 'SET_GAME_STATE', payload: data.gameState });
      }
      
      if (data.round) {
        dispatch({ type: 'SET_CURRENT_ROUND', payload: data.round });
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Failed to start game:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to start game' 
      });
    }
  }, []);

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
      setUsername('');
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
      
      const response = await fetch('/api/emojis/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emojis }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit emojis: ${response.status}`);
      }
      
      // The real-time event will update the state
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Failed to submit emojis:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to submit emojis' 
      });
    }
  }, []);

  const submitGuess = useCallback(async (guess: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await fetch('/api/guess/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to submit guess: ${response.status}`);
      }
      
      // The real-time event will update the state
    } catch (error) {
      console.error('Failed to submit guess:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to submit guess' 
      });
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

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
