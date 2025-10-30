# Design Document

## Overview

This design addresses the multiplayer game flow issues in the Emojirades application by fixing the data synchronization between server and client, improving the player list display logic, and ensuring proper game state management. The solution focuses on three main areas: API response consistency, client state management, and UI data binding.

## Architecture

### Current Issues Analysis

1. **Player List Display Problem**: The `useLeaderboard` hook is being used in GameLobby but it's designed for leaderboard data, not lobby player lists
2. **State Synchronization Gap**: The GameContext receives player data but it's not properly flowing to the UI components
3. **Moderator Detection Logic**: The `isCurrentUserModerator` logic is not correctly identifying the first player as moderator
4. **Polling vs Real-time**: The current polling mechanism has timing issues and doesn't update consistently

### Solution Architecture

```mermaid
graph TD
    A[Server API] --> B[GameContext]
    B --> C[Game State Management]
    C --> D[UI Components]
    
    E[/api/game/init] --> F[Player Data]
    E --> G[Game State]
    E --> H[Current User]
    
    F --> I[Players Hook]
    G --> J[Game Status Hook]
    H --> K[User Context]
    
    I --> L[GameLobby Component]
    J --> L
    K --> L
    
    M[Polling Service] --> N[State Updates]
    N --> B
```

## Components and Interfaces

### 1. Enhanced Game Context

**Purpose**: Centralize game state management and ensure consistent data flow

**Key Changes**:
- Fix player data structure and access patterns
- Improve polling mechanism for lobby state
- Add proper moderator detection logic
- Ensure consistent state updates

**Interface**:
```typescript
interface GameContextState {
  gameState: GameState | null;
  players: Record<string, Player>; // Fix: Use this consistently
  currentUser: Player | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
}

interface GameContextActions {
  joinGame: () => Promise<void>;
  startGame: () => Promise<void>;
  refreshGameState: () => Promise<void>; // New: Manual refresh
}
```

### 2. Player Management Hook

**Purpose**: Provide clean access to player data for UI components

**New Hook**: `useGamePlayers`
```typescript
interface UseGamePlayersReturn {
  players: Player[];           // Array format for UI
  playerCount: number;
  currentUser: Player | null;
  isCurrentUserModerator: boolean;
  canStartGame: boolean;
}
```

### 3. Enhanced API Response Handling

**Purpose**: Ensure consistent data structure from server

**Server Response Format**:
```typescript
interface GameInitResponse {
  success: boolean;
  gameState: GameState;
  currentRound: Round | null;
  players: Record<string, Player>; // Consistent format
  currentUser: Player;
  timestamp: number;
}
```

### 4. Improved Polling Strategy

**Purpose**: Reliable state synchronization in lobby

**Strategy**:
- Poll every 2 seconds in lobby state
- Exponential backoff on errors
- Compare timestamps to avoid unnecessary updates
- Stop polling when game becomes active

## Data Models

### Player Data Structure
```typescript
interface Player {
  id: string;           // Username
  username: string;     // Display name
  subredditName: string;
  score: number;
  isActive: boolean;    // Online status
  joinedAt: number;     // Timestamp
  isModerator?: boolean; // New: Explicit moderator flag
}
```

### Game State Enhancement
```typescript
interface GameState {
  id: string;
  subredditName: string;
  status: 'lobby' | 'active' | 'ended';
  currentRound: number;
  maxRounds: number;
  createdAt: number;
  updatedAt: number;
  moderatorId?: string; // New: Track moderator explicitly
}
```

## Error Handling

### 1. Network Error Recovery
- Implement retry logic for failed API calls
- Show connection status indicators
- Graceful degradation when polling fails
- Manual refresh option for users

### 2. State Consistency Checks
- Validate player data structure on receive
- Handle missing or malformed data gracefully
- Provide fallback UI states
- Log inconsistencies for debugging

### 3. User Feedback
- Loading states during operations
- Clear error messages with retry options
- Connection quality indicators
- Progress feedback for game start

## Testing Strategy

### 1. Unit Tests
- GameContext state management
- Player data transformations
- Moderator detection logic
- Polling mechanism behavior

### 2. Integration Tests
- API response handling
- State synchronization flows
- UI component data binding
- Error recovery scenarios

### 3. Manual Testing Scenarios
- Multiple players joining simultaneously
- Network interruption during lobby
- Game start with minimum/maximum players
- Player leaving during lobby phase

## Implementation Phases

### Phase 1: Fix Core Data Flow
1. Update GameContext to properly handle player data
2. Fix the polling mechanism for consistent updates
3. Ensure API responses have consistent structure
4. Add proper error handling and logging

### Phase 2: Improve UI Components
1. Create dedicated `useGamePlayers` hook
2. Update GameLobby to use correct data sources
3. Fix moderator detection and start button logic
4. Add loading and error states

### Phase 3: Enhanced User Experience
1. Implement connection status indicators
2. Add manual refresh capabilities
3. Improve error messages and retry logic
4. Add visual feedback for state changes

### Phase 4: Testing and Validation
1. Test with multiple concurrent users
2. Validate network error scenarios
3. Ensure consistent behavior across browsers
4. Performance testing for polling mechanism

## Performance Considerations

### 1. Polling Optimization
- Use efficient comparison to detect changes
- Implement smart polling intervals based on activity
- Cache responses to avoid unnecessary re-renders
- Stop polling when not needed

### 2. State Management
- Minimize unnecessary state updates
- Use React.memo for expensive components
- Optimize re-render patterns
- Efficient player list updates

### 3. Network Efficiency
- Compress API responses where possible
- Use conditional requests when supported
- Implement request deduplication
- Optimize payload sizes

## Security Considerations

### 1. Data Validation
- Validate all incoming player data
- Sanitize user inputs
- Verify game state consistency
- Prevent unauthorized game operations

### 2. Rate Limiting
- Respect existing rate limits
- Implement client-side throttling
- Handle rate limit responses gracefully
- Prevent spam operations

## Monitoring and Debugging

### 1. Logging Strategy
- Log state transitions
- Track API response times
- Monitor polling effectiveness
- Record error patterns

### 2. Debug Tools
- State inspection utilities
- Network request monitoring
- Performance metrics collection
- User action tracking

This design provides a comprehensive solution to fix the multiplayer game flow issues while maintaining the existing architecture and improving the overall user experience.
