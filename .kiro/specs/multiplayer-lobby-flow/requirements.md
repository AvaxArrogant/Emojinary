# Requirements Document

## Introduction

This specification defines the requirements for a multiplayer lobby system for the Emojirades game. The system should provide a seamless experience for players to join games, view other players, and automatically start games after a predetermined waiting period. The lobby should handle player management, game state transitions, and provide clear feedback to users about the game status.

## Glossary

- **Game_Lobby**: The waiting area where players join before a game starts
- **Player_List**: Visual display showing all players who have joined the current game
- **Join_Button**: Interactive element that allows users to join the current game session
- **Game_Timer**: Countdown mechanism that automatically starts the game after a predetermined wait time
- **Moderator**: The first player to join a game who has privileges to manually start the game
- **Game_Session**: Active game state where rounds are played
- **Lobby_State**: Game status indicating players can join and the game hasn't started yet

## Requirements

### Requirement 1

**User Story:** As a player visiting the game, I want to see a clear join game button, so that I can easily participate in the multiplayer experience.

#### Acceptance Criteria

1. WHEN a player loads the game page, THE Game_Lobby SHALL display a prominent join game button
2. WHEN the Game_Lobby has fewer than 8 players, THE Join_Button SHALL be enabled and clickable
3. WHEN a player clicks the Join_Button, THE Game_Lobby SHALL add the player to the current game session
4. WHEN the Game_Lobby reaches 8 players, THE Join_Button SHALL be disabled and display "Game Full"
5. WHEN a player successfully joins, THE Game_Lobby SHALL update the Player_List immediately

### Requirement 2

**User Story:** As a player in the lobby, I want to see all other players who have joined, so that I know who I'll be playing with and how many players are ready.

#### Acceptance Criteria

1. THE Game_Lobby SHALL display a Player_List showing all joined players
2. WHEN a new player joins, THE Player_List SHALL update in real-time for all existing players
3. THE Player_List SHALL show each player's username and join status
4. THE Player_List SHALL display the current player count and maximum capacity (X/8 players)
5. THE Player_List SHALL visually distinguish the current user from other players

### Requirement 3

**User Story:** As a player in the lobby, I want the game to start automatically after waiting for other players, so that I don't have to wait indefinitely for someone to manually start the game.

#### Acceptance Criteria

1. WHEN the Game_Lobby has at least 2 players, THE Game_Timer SHALL begin a countdown to automatic game start
2. THE Game_Timer SHALL display the remaining wait time to all players in the lobby
3. WHEN the Game_Timer reaches zero, THE Game_Lobby SHALL automatically transition to Game_Session
4. WHEN additional players join during the countdown, THE Game_Timer SHALL reset to provide time for new players to prepare
5. THE Game_Timer SHALL use a predetermined wait time of 30 seconds

### Requirement 4

**User Story:** As the first player to join (moderator), I want the ability to start the game early, so that we don't have to wait for the full timer if everyone is ready.

#### Acceptance Criteria

1. WHEN a player is the first to join a game, THE Game_Lobby SHALL designate them as the Moderator
2. WHEN the Moderator is in the lobby with at least 2 total players, THE Game_Lobby SHALL display a "Start Game" button to the Moderator
3. WHEN the Moderator clicks "Start Game", THE Game_Lobby SHALL immediately transition to Game_Session
4. WHEN the Moderator starts the game early, THE Game_Timer SHALL be cancelled
5. THE Player_List SHALL visually indicate which player is the Moderator

### Requirement 5

**User Story:** As a player in the lobby, I want to see clear status information about the game readiness, so that I understand what's happening and what to expect next.

#### Acceptance Criteria

1. THE Game_Lobby SHALL display the current Lobby_State status (waiting for players, ready to start, starting soon)
2. WHEN fewer than 2 players are present, THE Game_Lobby SHALL show "Waiting for more players" message
3. WHEN 2 or more players are present, THE Game_Lobby SHALL show "Ready to start" or countdown status
4. WHEN the Game_Timer is active, THE Game_Lobby SHALL show "Starting in X seconds" message
5. THE Game_Lobby SHALL provide feedback for all state transitions (joining, leaving, starting)
