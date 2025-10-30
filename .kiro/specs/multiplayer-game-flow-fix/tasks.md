# Implementation Plan

- [x] 1. Fix server API response consistency

  - Update `/api/game/init` endpoint to return consistent player data structure
  - Ensure moderator identification is included in game state
  - Add proper error handling for edge cases
  - _Requirements: 1.1, 1.4, 3.1, 4.2_

- [x] 2. Create dedicated game players hook

  - [x] 2.1 Implement `useGamePlayers` hook for clean player data access

    - Extract player array from GameContext players object
    - Calculate player count and moderator status
    - Provide formatted data for UI components
    - _Requirements: 1.1, 2.4, 3.1_

  - [x] 2.2 Add moderator detection logic

    - Identify first player as moderator based on join time
    - Add explicit moderator flag to player data
    - Handle moderator transfer when original leaves
    - _Requirements: 2.1, 2.4_

  - [x] 2.3 Implement game readiness calculations

    - Check minimum player requirements for start button
    - Calculate if current user can start the game
    - Provide clear status messages for UI
    - _Requirements: 2.1, 2.3, 3.4_

- [x] 3. Fix GameContext state management

  - [x] 3.1 Improve polling mechanism for lobby state

    - Implement more reliable polling with error handling
    - Add exponential backoff for failed requests
    - Compare timestamps to avoid unnecessary updates
    - _Requirements: 1.2, 1.3, 4.1, 4.4_

  - [x] 3.2 Fix player data synchronization

    - Ensure players object is properly updated from API responses
    - Handle player join/leave events correctly
    - Maintain consistent data structure across updates
    - _Requirements: 1.1, 1.2, 1.3, 4.2_

  - [x] 3.3 Add manual refresh capability

    - Implement `refreshGameState` action for user-triggered updates
    - Add refresh button to UI for connection issues
    - Handle refresh errors gracefully
    - _Requirements: 4.3, 5.5_

- [x] 4. Update GameLobby component

  - [x] 4.1 Replace useLeaderboard with useGamePlayers

    - Remove incorrect leaderboard hook usage
    - Use new `useGamePlayers` hook for player data
    - Update player list rendering logic
    - _Requirements: 1.1, 1.4, 1.5_

  - [x] 4.2 Fix start game button logic

    - Use correct moderator detection from new hook
    - Show/hide start button based on proper conditions
    - Add loading states for start game operation
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 4.3 Improve player count display

    - Show accurate current player count
    - Display maximum player limit
    - Update count in real-time as players join/leave
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.4 Add connection status indicators

    - Show network connectivity status
    - Display game readiness status
    - Add loading indicators for operations
    - _Requirements: 5.1, 5.2, 5.4_

- [x] 5. Enhance error handling and user feedback

  - [x] 5.1 Add comprehensive error handling

    - Handle network errors during game operations
    - Provide clear error messages with retry options
    - Implement fallback states for failed operations
    - _Requirements: 4.4, 5.5_

  - [x] 5.2 Implement loading states

    - Add loading indicators for join/start operations
    - Show progress feedback during state changes
    - Prevent multiple simultaneous operations
    - _Requirements: 5.4_

  - [x] 5.3 Add manual refresh functionality

    - Create refresh button for connection issues
    - Implement manual game state synchronization
    - Handle refresh errors with user feedback
    - _Requirements: 4.3, 5.5_

- [x] 6. Add comprehensive testing


  - [x] 6.1 Write unit tests for new hooks

    - Test `useGamePlayers` hook functionality
    - Test moderator detection logic
    - Test game readiness calculations
    - _Requirements: 1.1, 2.1, 2.4, 3.1_

  - [x] 6.2 Add integration tests for state management

    - Test GameContext polling mechanism
    - Test player data synchronization
    - Test error handling scenarios
    - _Requirements: 1.2, 1.3, 4.1, 4.4_

  - [x] 6.3 Create manual testing scenarios

    - Test multiple players joining simultaneously
    - Test network interruption scenarios
    - Test game start with various player counts
    - _Requirements: 1.2, 2.1, 4.1, 4.3_
