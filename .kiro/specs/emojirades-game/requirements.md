# Requirements Document

## Introduction

The Emojirades Game is a multiplayer guessing game built for Reddit using the Devvit platform. Players take turns as presenters who represent words or phrases using only emojis, while other players submit text guesses to identify the phrase. The game features real-time multiplayer interaction, scoring systems, and persistent leaderboards within Reddit subreddits.

## Glossary

- **Emojirades_Game_System**: The complete multiplayer guessing game application running on Reddit via Devvit
- **Presenter**: The player who selects a phrase and represents it using emojis for others to guess
- **Guesser**: Players who submit text guesses to identify the presenter's phrase
- **Game_Session**: A complete game instance containing multiple rounds with rotating presenters
- **Round**: A single gameplay cycle where one presenter shows emojis and others guess (2-minute duration)
- **Phrase_Database**: JSON collection of categorized words and phrases for gameplay
- **Fuzzy_Matching**: Algorithm that accepts guesses with 80% similarity to the correct answer
- **Redis_Store**: Persistent data storage for game state, scores, and leaderboards
- **Real_Time_Sync**: Reddit's pub/sub messaging system for multiplayer state synchronization

## Requirements

### Requirement 1

**User Story:** As a Reddit user, I want to start a new Emojirades game in my subreddit, so that community members can participate in an interactive guessing game.

#### Acceptance Criteria

1. WHEN a Reddit user accesses the Emojirades app, THE Emojirades_Game_System SHALL display a game lobby with active players list and start button
2. WHEN the start button is clicked, THE Emojirades_Game_System SHALL initialize a new Game_Session with the first presenter selected
3. THE Emojirades_Game_System SHALL store the Game_Session state in Redis_Store for persistence
4. THE Emojirades_Game_System SHALL support multiple concurrent Game_Sessions across different subreddits
5. WHEN a Game_Session starts, THE Emojirades_Game_System SHALL notify all players via Real_Time_Sync

### Requirement 2

**User Story:** As a presenter, I want to select a phrase from different categories and represent it with emojis, so that other players can guess what I'm trying to convey.

#### Acceptance Criteria

1. WHEN selected as presenter, THE Emojirades_Game_System SHALL display a phrase selection interface with categories
2. THE Emojirades_Game_System SHALL provide access to Phrase_Database containing 100+ phrases across 5-7 categories
3. WHEN a phrase is selected, THE Emojirades_Game_System SHALL display an emoji picker interface with search functionality
4. THE Emojirades_Game_System SHALL allow presenters to build emoji sequences representing their selected phrase
5. WHEN emoji sequence is submitted, THE Emojirades_Game_System SHALL broadcast the emojis to all Guesser players via Real_Time_Sync

### Requirement 3

**User Story:** As a guesser, I want to see the presenter's emojis and submit my guesses, so that I can try to identify the phrase and earn points.

#### Acceptance Criteria

1. WHEN in guesser role, THE Emojirades_Game_System SHALL display the presenter's emoji sequence
2. THE Emojirades_Game_System SHALL provide a text input field for guess submission
3. WHEN a guess is submitted, THE Emojirades_Game_System SHALL validate the guess using Fuzzy_Matching with 80% similarity threshold
4. THE Emojirades_Game_System SHALL display all submitted guesses in real-time to all players
5. WHEN the first correct guess is identified, THE Emojirades_Game_System SHALL immediately end the round and award points

### Requirement 4

**User Story:** As a player, I want to see a countdown timer during each round, so that I know how much time remains for guessing.

#### Acceptance Criteria

1. WHEN a round begins, THE Emojirades_Game_System SHALL start a 2-minute countdown timer
2. THE Emojirades_Game_System SHALL display the remaining time with visual countdown interface
3. THE Emojirades_Game_System SHALL synchronize timer state across all players via Real_Time_Sync
4. WHEN the timer reaches zero, THE Emojirades_Game_System SHALL automatically end the round
5. IF no correct guess is submitted before timeout, THE Emojirades_Game_System SHALL reveal the correct answer

### Requirement 5

**User Story:** As a player, I want to see my score and ranking compared to other players, so that I can track my performance in the game.

#### Acceptance Criteria

1. WHEN a correct guess is made, THE Emojirades_Game_System SHALL award 10 points to the guesser and 5 points to the presenter
2. THE Emojirades_Game_System SHALL maintain persistent player scores in Redis_Store
3. THE Emojirades_Game_System SHALL display a leaderboard showing all player scores and rankings
4. THE Emojirades_Game_System SHALL update scores in real-time across all player interfaces
5. THE Emojirades_Game_System SHALL persist leaderboard data across multiple Game_Sessions

### Requirement 6

**User Story:** As a player, I want to see round results and the correct answer after each round, so that I can learn and prepare for the next round.

#### Acceptance Criteria

1. WHEN a round ends, THE Emojirades_Game_System SHALL display the correct answer and winning player
2. THE Emojirades_Game_System SHALL show updated scores and leaderboard positions
3. THE Emojirades_Game_System SHALL display a countdown to the next round
4. THE Emojirades_Game_System SHALL rotate the presenter role to the next player in round-robin fashion
5. WHEN the next round countdown completes, THE Emojirades_Game_System SHALL automatically start the new round

### Requirement 7

**User Story:** As a mobile Reddit user, I want the game interface to work smoothly on my device, so that I can participate regardless of my platform.

#### Acceptance Criteria

1. THE Emojirades_Game_System SHALL provide a responsive interface compatible with mobile browsers
2. THE Emojirades_Game_System SHALL optimize touch interactions for emoji selection and guess input
3. THE Emojirades_Game_System SHALL maintain readable text and button sizes on mobile screens
4. THE Emojirades_Game_System SHALL handle device orientation changes gracefully
5. THE Emojirades_Game_System SHALL provide consistent functionality across desktop and mobile platforms

### Requirement 8

**User Story:** As a game administrator, I want the system to handle player disconnections and prevent cheating, so that the game remains fair and stable.

#### Acceptance Criteria

1. THE Emojirades_Game_System SHALL implement rate limiting allowing maximum 1 guess per 3 seconds per player
2. THE Emojirades_Game_System SHALL validate all user inputs on the server side
3. WHEN a player disconnects, THE Emojirades_Game_System SHALL handle reconnection gracefully without disrupting the game
4. THE Emojirades_Game_System SHALL prevent presenters from submitting guesses for their own phrases
5. THE Emojirades_Game_System SHALL log all game events for debugging and monitoring purposes
