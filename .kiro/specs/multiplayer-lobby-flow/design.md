# Design Document

## Overview

This design document outlines the implementation of a multiplayer lobby system for the Emojirades game. The system will enhance the existing GameLobby component with automatic game start functionality, improved player management, and a countdown timer mechanism. The design leverages the existing React/TypeScript architecture, game context system, and server-side Redis storage.

## Architecture

### High-Level Flow
1. **Player Entry**: Users load the game and see the lobby with a prominent join button
2. **Player Management**: Players join/leave, with real-time updates to all participants
3. **Timer Management**: Automatic countdown starts when minimum players (2) are present
4. **Game Transition**: Either manual start by moderator or automatic start when timer expires

### Component Hierarchy
```
GameApp
├── GameLobby (enhanced)
│   ├── LobbyHeader
│   ├── GameStatus
│   ├── PlayerList (enhanced)
│   ├── LobbyTimer (new)
│   └── ActionButtons (enhanced)
```

## Components and Interfaces

### 1. Enhanced GameLobby Component

**Current State**: The GameLobby component exists but lacks automatic timer functionality and streamlined join flow.

**Enhancements**:
- Add lobby timer state management
- Simplify join button visibility logic
- Integrate countdown display
- Add automatic game start capability

### 2. New LobbyTimer Component

**Purpose**: Manages and displays the countdown timer for automatic game start.

**Props**:
```typescript
interface LobbyTimerProps {
  isActive: boolean;
  timeRemaining: number;
  onTimerExpired: () => void;
  onTimerReset: () => void;
  canStart: boolean;
}
```

**Features**:
- Visual countdown display
- Progress bar or circular timer
- Sound effects for warnings (10s, 5s remaining)
- Auto-reset when new players join

### 3. Enhanced PlayerList Component

**Current State**: Displays players with complex loading states and validation.

**Enhancements**:
- Simplified display logic
- Clear moderator indication
- Real-time player count updates
- Join status indicators

### 4. New useLobbyTimer Hook

**Purpose**: Manages lobby countdown timer state and logic.

**Interface**:
```typescript
interface LobbyTimerState {
  isActive: boolean;
  timeRemaining: number;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
}
```

**Logic**:
- 30-second countdown when ≥2 players
- Reset when new players join
- Auto-start game when timer expires
- Integration with sound effects

## Data Models

### Enhanced Game State
```typescript
interface GameState {
  id: string;
  status: 'lobby' | 'active' | 'ended';
  subredditName: string;
  currentRound: number;
  maxRounds: number;
  moderatorId?: string;
  lobbyTimer?: {
    isActive: boolean;
    startTime: number;
    duration: number; // 30000ms
  };
  createdAt: number;
  updatedAt: number;
}
```

### Lobby Timer Configuration
```typescript
interface LobbyTimerConfig {
  LOBBY_COUNTDOWN_DURATION: 30000; // 30 seconds
  MIN_PLAYERS_FOR_TIMER: 2;
  TIMER_WARNING_THRESHOLDS: [10000, 5000]; // 10s, 5s warnings
  TIMER_RESET_ON_JOIN: true;
}
```

## Error Handling

### Timer-Related Errors
- **Timer Sync Issues**: If client timer gets out of sync with server, refresh game state
- **Network Interruption**: Pause timer during connection issues, resume when reconnected
- **Race Conditions**: Handle simultaneous manual start and timer expiration

### Player Management Errors
- **Join Failures**: Retry mechanism with exponential backoff
- **Player Limit Exceeded**: Clear error messaging when lobby is full
- **Moderator Disconnection**: Automatic moderator transfer to next player

### Fallback Mechanisms
- **Timer Failure**: Allow manual start by any player after 60 seconds
- **Server Unavailable**: Local timer with periodic sync attempts
- **Data Inconsistency**: Force refresh and re-sync game state

## Testing Strategy

### Unit Tests
1. **useLobbyTimer Hook**
   - Timer start/stop/reset functionality
   - Automatic game start trigger
   - Timer reset on player join
   - Warning threshold notifications

2. **LobbyTimer Component**
   - Countdown display accuracy
   - Progress visualization
   - Sound effect triggers
   - Timer expiration handling

3. **Enhanced GameLobby**
   - Join button state management
   - Player list updates
   - Moderator privilege handling
   - Game state transitions

### Integration Tests
1. **Lobby Flow**
   - Complete join → wait → start sequence
   - Multiple players joining during countdown
   - Manual start interrupting timer
   - Network disconnection scenarios

2. **Real-time Updates**
   - Player list synchronization
   - Timer synchronization across clients
   - Game state consistency
   - Error recovery mechanisms

### End-to-End Tests
1. **Multi-Player Scenarios**
   - 2-player minimum start
   - 8-player maximum capacity
   - Moderator transfer on disconnect
   - Automatic vs manual game start

2. **Edge Cases**
   - Rapid join/leave cycles
   - Network interruption during countdown
   - Browser refresh during timer
   - Simultaneous game start attempts

## Implementation Notes

### Server-Side Changes
- Add lobby timer state to Redis game objects
- Implement timer synchronization endpoints
- Add automatic game start trigger
- Enhance player join/leave event handling

### Client-Side Changes
- Create useLobbyTimer hook with useEffect-based countdown
- Add LobbyTimer component with visual countdown
- Enhance GameLobby with simplified join flow
- Integrate sound effects for timer warnings

### Performance Considerations
- Use requestAnimationFrame for smooth timer updates
- Debounce player list updates to prevent excessive re-renders
- Implement efficient timer synchronization (every 5 seconds)
- Cache player data to reduce API calls

### Accessibility
- Screen reader announcements for timer updates
- Keyboard navigation for all interactive elements
- High contrast mode support for timer display
- Clear focus indicators on buttons

### Mobile Optimization
- Touch-friendly button sizes (minimum 44px)
- Responsive timer display
- Optimized for portrait and landscape modes
- Reduced animation on low-power devices
