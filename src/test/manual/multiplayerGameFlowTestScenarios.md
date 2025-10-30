# Manual Testing Scenarios for Multiplayer Game Flow

This document outlines manual testing scenarios to validate the multiplayer game flow fixes. These tests should be performed by developers or QA testers to ensure the system works correctly in real-world conditions.

## Prerequisites

- Development environment running (`npm run dev`)
- Access to the Devvit playtest URL
- Ability to open multiple browser tabs/windows
- Network throttling tools (optional, for network interruption tests)

## Test Scenario 1: Multiple Players Joining Simultaneously

**Objective**: Verify that the system correctly handles multiple players joining a game at the same time without data corruption or race conditions.

**Requirements Tested**: 1.2, 2.1, 4.1, 4.3

### Setup
1. Start the development server
2. Open the playtest URL in 4 different browser tabs/windows
3. Use different Reddit accounts or incognito windows to simulate different users

### Test Steps
1. **Rapid Join Test**:
   - In all 4 tabs, click "Join Game" within 2-3 seconds of each other
   - Observe the player list in each tab
   - Verify all 4 players appear in the lobby
   - Check that player count shows "4" in all tabs

2. **Moderator Assignment Verification**:
   - Identify which player joined first (check join timestamps if visible)
   - Verify that the first player has moderator privileges (can see "Start Game" button)
   - Verify other players cannot see the "Start Game" button
   - Check that moderator status is consistent across all tabs

3. **Player List Consistency**:
   - Compare player lists across all tabs
   - Verify all tabs show the same players in the same order
   - Check that usernames and online status are displayed correctly
   - Verify player count is accurate in all tabs

### Expected Results
- All 4 players successfully join the game
- Player lists are identical across all tabs
- Moderator is correctly assigned to the first player
- No duplicate players or missing players
- Player count is accurate (4/8 players)

### Failure Indicators
- Players missing from some tabs but not others
- Duplicate player entries
- Incorrect moderator assignment
- Player count discrepancies
- Error messages about failed joins

---

## Test Scenario 2: Network Interruption Scenarios

**Objective**: Test the system's resilience to network issues and its ability to recover gracefully.

**Requirements Tested**: 1.2, 2.1, 4.1, 4.3

### Setup
1. Join a game with 2-3 players
2. Have network throttling tools ready (Chrome DevTools Network tab)
3. Ensure you can simulate network disconnections

### Test Steps

#### 2A: Temporary Network Disconnection
1. **Simulate Network Loss**:
   - In Chrome DevTools, set Network to "Offline"
   - Wait 10-15 seconds
   - Re-enable network connection
   - Observe the game's behavior

2. **Verify Recovery**:
   - Check if the game automatically reconnects
   - Verify player list is still accurate
   - Confirm game state is synchronized
   - Test that you can still interact with the game

#### 2B: Slow Network Conditions
1. **Simulate Slow Connection**:
   - Set Network throttling to "Slow 3G" or "Fast 3G"
   - Try joining the game
   - Observe loading states and error handling

2. **Test Polling Behavior**:
   - Have another player join while you're on slow connection
   - Verify you eventually see the new player
   - Check that the system doesn't spam requests

#### 2C: Intermittent Connection Issues
1. **Toggle Network On/Off**:
   - Rapidly toggle network connection on and off several times
   - Observe error messages and recovery behavior
   - Check if the system implements exponential backoff

### Expected Results
- Game shows appropriate loading/connection status indicators
- Automatic reconnection after network recovery
- No data loss or corruption during network issues
- Graceful error messages with retry options
- Exponential backoff prevents request spam

### Failure Indicators
- Game becomes permanently stuck after network issues
- Data corruption or duplicate players after reconnection
- Excessive API requests during network problems
- No user feedback about connection status
- Inability to recover without page refresh

---

## Test Scenario 3: Game Start with Various Player Counts

**Objective**: Verify that game start functionality works correctly with different numbers of players and handles edge cases properly.

**Requirements Tested**: 1.2, 2.1, 4.1, 4.3

### Setup
1. Prepare multiple browser tabs for different player counts
2. Ensure you can control which player is the moderator

### Test Steps

#### 3A: Minimum Players (2 players)
1. **Setup Game**:
   - Join game with exactly 2 players
   - Verify moderator can see "Start Game" button
   - Verify non-moderator cannot see the button

2. **Start Game**:
   - Click "Start Game" as moderator
   - Verify game transitions to active state
   - Check that both players see the game start
   - Confirm first round begins properly

#### 3B: Optimal Players (4-6 players)
1. **Setup Game**:
   - Join game with 4-6 players
   - Verify player count display is accurate
   - Check that all players see consistent game state

2. **Start Game**:
   - Start game as moderator
   - Verify all players transition to active game
   - Check that round assignment works correctly
   - Confirm all players can participate

#### 3C: Maximum Players (8 players)
1. **Setup Game**:
   - Fill game to maximum capacity (8 players)
   - Verify no additional players can join
   - Check that "Game Full" status is displayed

2. **Start Game**:
   - Start game with full lobby
   - Verify all 8 players transition correctly
   - Check that round rotation works with maximum players

#### 3D: Edge Cases
1. **Single Player Attempt**:
   - Try to start game with only 1 player
   - Verify appropriate error message
   - Check that start button is disabled/hidden

2. **Non-Moderator Start Attempt**:
   - As non-moderator, try to start game (if button is somehow visible)
   - Verify appropriate error handling
   - Check that game doesn't start inappropriately

### Expected Results
- Game starts successfully with 2+ players
- Appropriate error messages for invalid start attempts
- All players transition to active game simultaneously
- Player limits are enforced correctly
- Start button visibility follows moderator rules

### Failure Indicators
- Game starts with insufficient players
- Non-moderators can start games
- Players get stuck in lobby after game start
- Inconsistent game state across players
- Missing error messages for invalid operations

---

## Test Scenario 4: Moderator Transfer and Player Management

**Objective**: Test moderator transfer when the current moderator leaves and verify proper player management.

**Requirements Tested**: 1.2, 1.3, 2.1, 2.4

### Setup
1. Join game with 3-4 players
2. Identify the current moderator
3. Prepare to have moderator leave the game

### Test Steps

#### 4A: Moderator Leaves Game
1. **Initial State**:
   - Verify current moderator has start button
   - Note the join order of all players
   - Confirm other players cannot start game

2. **Moderator Departure**:
   - Have the moderator leave the game (close tab or navigate away)
   - Wait for system to detect the departure
   - Observe moderator transfer process

3. **New Moderator Assignment**:
   - Verify new moderator is assigned (earliest remaining player)
   - Check that new moderator can see start button
   - Confirm other players still cannot start game
   - Verify player count decreases appropriately

#### 4B: Multiple Players Leaving
1. **Sequential Departures**:
   - Have players leave one by one
   - Verify moderator transfers correctly each time
   - Check that player list updates in real-time
   - Confirm game state remains consistent

2. **Rapid Departures**:
   - Have multiple players leave simultaneously
   - Verify system handles concurrent departures
   - Check that final moderator assignment is correct

#### 4C: Last Player Scenarios
1. **Game Dissolution**:
   - Have all players except one leave
   - Verify game handles single-player state
   - Check if game dissolves or waits for new players

### Expected Results
- Moderator transfers to earliest remaining player
- Player list updates in real-time across all clients
- Game state remains consistent during player changes
- Appropriate handling of edge cases (single player, empty game)
- No orphaned games or stuck states

### Failure Indicators
- No moderator assigned after current moderator leaves
- Multiple moderators assigned simultaneously
- Player list inconsistencies across clients
- Game becomes unresponsive after player departures
- Incorrect moderator assignment (not earliest player)

---

## Test Scenario 5: UI Responsiveness and User Experience

**Objective**: Verify that the user interface provides appropriate feedback and remains responsive during all operations.

**Requirements Tested**: 5.1, 5.2, 5.4, 5.5

### Setup
1. Join game with 2-3 other players
2. Prepare to test various UI interactions
3. Monitor loading states and error messages

### Test Steps

#### 5A: Loading States
1. **Join Game Loading**:
   - Click "Join Game" and observe loading indicators
   - Verify loading message is displayed
   - Check that UI is disabled during loading
   - Confirm loading clears after completion

2. **Start Game Loading**:
   - As moderator, click "Start Game"
   - Verify loading state is shown
   - Check that button is disabled during operation
   - Confirm smooth transition to active game

#### 5B: Connection Status Indicators
1. **Connection Quality Display**:
   - Verify connection status is visible
   - Check that status updates during network changes
   - Confirm different states are clearly indicated

2. **Offline/Online States**:
   - Simulate network disconnection
   - Verify offline status is displayed
   - Check that reconnection is indicated
   - Confirm status accuracy

#### 5C: Error Handling and Recovery
1. **Network Error Recovery**:
   - Cause a network error (disconnect during operation)
   - Verify error message is user-friendly
   - Check that retry options are provided
   - Test manual refresh functionality

2. **Operation Failures**:
   - Simulate various operation failures
   - Verify appropriate error messages
   - Check that UI recovers gracefully
   - Test error dismissal and retry

#### 5D: Real-time Updates
1. **Player List Updates**:
   - Have players join/leave
   - Verify updates appear within 3 seconds
   - Check that animations/transitions are smooth
   - Confirm no UI flickering or jumping

2. **Game State Changes**:
   - Test various game state transitions
   - Verify UI updates appropriately
   - Check that all relevant information is displayed
   - Confirm consistent state across all players

### Expected Results
- Clear loading indicators for all operations
- Accurate connection status display
- User-friendly error messages with recovery options
- Smooth real-time updates without UI glitches
- Responsive interface that doesn't freeze or hang

### Failure Indicators
- Missing or unclear loading states
- Inaccurate connection status
- Cryptic or missing error messages
- UI freezing or becoming unresponsive
- Delayed or missing real-time updates

---

## Test Execution Guidelines

### Before Testing
1. Ensure development environment is running
2. Clear browser cache and cookies
3. Disable browser extensions that might interfere
4. Have multiple devices/browsers available for multi-player tests

### During Testing
1. Document any unexpected behavior
2. Take screenshots of error states
3. Note timing of operations (especially for real-time features)
4. Test on different browsers (Chrome, Firefox, Safari)
5. Test on different devices (desktop, mobile)

### After Testing
1. Document all findings
2. Categorize issues by severity
3. Verify fixes don't break other functionality
4. Re-test critical paths after fixes

### Success Criteria
- All test scenarios pass without critical failures
- Error handling is graceful and user-friendly
- Real-time features work within acceptable time limits (3-5 seconds)
- UI remains responsive under all conditions
- No data corruption or inconsistent states

### Common Issues to Watch For
- Race conditions during simultaneous operations
- Memory leaks during long testing sessions
- Inconsistent state between different browser tabs
- Network request failures not handled properly
- UI elements not updating after state changes

---

## Automated Test Integration

These manual tests complement the automated unit and integration tests. Key areas where manual testing is essential:

1. **Multi-browser/Multi-user scenarios** - Cannot be easily automated
2. **Network condition variations** - Requires real network simulation
3. **User experience validation** - Needs human judgment
4. **Edge case discovery** - Manual exploration often finds unexpected issues
5. **Performance under load** - Real user behavior patterns

### Reporting Template

For each test scenario, document:
- **Test Date**: When the test was performed
- **Environment**: Browser, device, network conditions
- **Test Result**: Pass/Fail with details
- **Issues Found**: Description of any problems
- **Screenshots**: Visual evidence of issues
- **Reproduction Steps**: How to recreate any problems
- **Severity**: Critical/High/Medium/Low
- **Recommendations**: Suggested fixes or improvements

This comprehensive manual testing approach ensures that the multiplayer game flow fixes work correctly in real-world conditions and provide a good user experience.
