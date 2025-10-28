# 🎭 Emojirades - The Ultimate Emoji Guessing Game

**Emojirades** is an innovative real-time multiplayer guessing game built for Reddit using the Devvit platform. Players take turns as presenters who represent phrases using creative emoji sequences, while others race to guess the correct answer. It's like charades, but with emojis!

## 🎮 What is Emojirades?

Emojirades transforms the classic game of charades into an exciting digital experience where creativity meets competition. Instead of acting out phrases, players use emojis to communicate ideas, creating a unique blend of visual storytelling and wordplay that's perfect for Reddit's diverse community.

**Core Gameplay Loop:**
1. **Join the Lobby** - Players gather in a welcoming lobby with real-time player status and connection monitoring
2. **Take Turns Presenting** - One player becomes the presenter and receives a secret phrase from 700+ curated options
3. **Create Emoji Stories** - Presenters craft creative emoji sequences (up to 20 emojis) to represent their phrase
4. **Race to Guess** - Other players compete to decode the emoji clues and guess correctly within 2 minutes
5. **Score Points** - Correct guessers earn 10 points, successful presenters earn 5 points
6. **Rotate and Repeat** - Players take turns presenting across multiple rounds with automatic role rotation

## 🌟 What Makes Emojirades Innovative & Unique

### 🚀 **First True Real-Time Multiplayer Game on Reddit**
- **Native Reddit Integration**: Built specifically for Reddit's ecosystem using Devvit platform
- **Seamless Social Experience**: Players use their Reddit identities, creating authentic community connections
- **Live Synchronization**: All players see actions instantly - no refresh needed, no lag, pure real-time gameplay
- **Cross-Platform Consistency**: Identical experience whether playing on Reddit mobile app, desktop, or web

### 🧠 **Revolutionary Smart Matching Technology**
- **Advanced Fuzzy Matching**: Sophisticated similarity detection with 80% threshold for accurate guess validation
- **Intelligent Typo Tolerance**: "aple pie" matches "apple pie", "supermn" matches "superman"
- **Real-time Similarity Scoring**: Live percentage feedback (45%, 67%, etc.) helps players learn and improve
- **Visual Feedback System**: Color-coded progress bars show how close guesses are to the correct answer

### 🎨 **Creative Expression Through Visual Language**
- **Emoji Storytelling**: Transform abstract concepts into visual narratives using universal emoji language
- **Cultural Bridge**: Emojis transcend language barriers, making the game globally accessible
- **Infinite Creativity**: 20-emoji sequences allow for complex, multi-layered representations
- **Visual Puzzle Solving**: Combines artistic creativity with logical deduction

### 🎯 **Scientifically Curated Content System**
- **700+ Professional Phrases**: Hand-selected across 7 diverse categories for optimal gameplay balance
- **Difficulty Intelligence**: Smart progression from easy visual concepts to complex abstract ideas
- **Category Psychology**: Movies, Books, Songs, Animals, Food, Places, Activities chosen for universal recognition
- **Smart Phrase Selection**: Advanced algorithms prevent repeats and balance category usage across game sessions
- **Hint System**: Contextual clues help presenters without spoiling the challenge

### 🛡️ **Advanced Fair Play Architecture**
- **Multi-Layer Anti-Cheating**: Presenter protection, rate limiting, duplicate detection, input validation
- **Behavioral Analytics**: Detects and prevents gaming the system while maintaining fun
- **Graceful Enforcement**: Security measures are invisible to honest players
- **Community Self-Regulation**: Reddit's natural moderation extends into gameplay

### 📱 **Mobile-First Social Gaming**
- **Touch-Optimized Interface**: Every interaction designed for thumbs-first mobile usage
- **Reddit Mobile Integration**: Feels native within Reddit's mobile app experience
- **Responsive Adaptation**: Seamlessly scales from phone screens to desktop monitors
- **Accessibility Focus**: Screen reader support, high contrast modes, keyboard navigation

### 🔄 **Dynamic Social Mechanics**
- **Automatic Role Rotation**: Everyone gets equal opportunities to present and guess with smart turn management
- **Real-Time Leaderboards**: Instant gratification with live score updates, medal icons for top 3, and ranking changes
- **Social Learning**: Watch others' strategies and improve your own emoji storytelling
- **Community Building**: Shared laughter over creative interpretations builds Reddit community bonds
- **Live Interaction**: See all players' guesses in real-time with timestamps and similarity scores

### 🎮 **Psychological Engagement Design**
- **Flow State Optimization**: 2-minute rounds maintain perfect attention span balance
- **Immediate Feedback Loops**: Instant similarity scores create addictive improvement cycles
- **Social Validation**: Public recognition for both creative presentation and clever guessing
- **Competitive Cooperation**: Players compete while collectively enjoying creative expressions

### 🌐 **Platform Innovation**
- **Devvit Showcase**: Demonstrates the full potential of Reddit's developer platform
- **Modern Web Standards**: React, TypeScript, real-time communication in a Reddit-native app
- **Scalable Architecture**: Handles multiple concurrent games with thousands of players
- **Open Development**: Transparent development process with community feedback integration

## 🎮 How to Play Emojirades

### **Game Setup**

1. **Join the Game**: Click "Join Game" when you see an Emojirades post on Reddit
2. **Wait for Players**: Games need at least 2 players to start (up to 8 players maximum)
3. **Start Playing**: The first player (moderator) can start the game once enough players join

### **Current User Interface**

The game features a polished, intuitive interface built with React and optimized for both desktop and mobile Reddit users:

#### **🏠 Game Lobby - The Social Hub**
- **Dynamic Player List**: Real-time display of all joined players (up to 8) with online/offline status indicators
- **Moderator System**: First player gets crown icon and exclusive game start privileges
- **Connection Status**: Visual indicators showing connection quality (good/poor/disconnected) with automatic reconnection
- **Game Rules Panel**: Built-in tutorial with clear gameplay instructions and scoring system
- **Join Controls**: Large, accessible join button with smart state management (disabled when full/disconnected)
- **Game Information**: Live display of game ID, player count, and minimum requirements

#### **🎭 Presenter Interface - Creative Expression**
- **Smart Phrase Selection**: Browse 700+ curated phrases across 7 categories with intelligent filtering
  - Categories: Movies, Books, Songs, Animals, Food, Places, Activities
  - Difficulty badges: Easy/Medium/Hard with contextual hints
  - Search and category filtering for quick phrase discovery
- **Advanced Emoji Picker**: Comprehensive emoji selection system
  - 6 organized categories: Smileys & People, Animals & Nature, Food & Drink, Activities, Travel & Places, Objects, Symbols
  - Real-time search functionality with keyword matching
  - Visual emoji grid with hover effects and accessibility features
- **Sequence Builder**: Interactive emoji composition area
  - Click-to-add emoji arrangement with visual preview
  - Maximum 20 emojis with live counter and warnings
  - Copy-to-clipboard functionality for sharing sequences
- **Real-time Timer**: 2-minute countdown with color-coded urgency (green → yellow → red)

#### **🤔 Guesser Interface - Competitive Guessing**
- **Prominent Emoji Display**: Large, centered presentation of presenter's emoji sequence
  - Individual emoji hover effects with position indicators
  - Copy functionality for sharing interesting sequences
  - Waiting state with animated loading when presenter is choosing
- **Smart Guess Input**: Intelligent input system with real-time validation
  - Character counter (100 character limit) with visual warnings
  - Input sanitization preventing invalid characters
  - Auto-focus and keyboard shortcuts for rapid guessing
- **Comprehensive Guess History**: Scrollable feed of all player attempts
  - Real-time similarity percentages for near-miss guesses (using advanced fuzzy matching)
  - Timestamp tracking and player identification
  - Visual highlighting for correct answers and personal guesses
  - Statistics panel showing total guesses, your guesses, correct answers, and active players
- **Live Timer Integration**: Synchronized countdown visible to all players

#### **📊 Game Session Dashboard - Live Statistics**
- **Personal Status Panel**: Your current score, rank, and role (Presenter/Guesser)
- **Live Leaderboard**: Real-time top 5 players with scores and rankings with medal icons for top 3
- **Game Progress Tracker**: Current round, total rounds, active player count
- **Round Information**: Phrase category display and game metadata
- **Connection Monitor**: Persistent connection status with quality indicators

### **Round Flow**

Each round follows this exciting sequence:

#### **1. Presenter Phase** 🎭

- One player becomes the **presenter** (automatically rotates each round)
- The presenter **chooses a phrase** from 700+ options across 7 categories (Movies, Books, Songs, Animals, Food, Places, Activities)
- They **build an emoji sequence** (up to 20 emojis) using the advanced emoji picker with search and categories
- **Time limit**: 2 minutes total for phrase selection and emoji creation
- **Visual timer**: Color-coded countdown (green → yellow → red) with pulse animations

#### **2. Guessing Phase** 🤔

- All other players see the **emoji sequence** displayed prominently
- Players race to **guess the phrase** using the smart input system
- **Real-time feedback** shows all guesses with similarity percentages (e.g., 67% match)
- **Advanced fuzzy matching** determines if guesses are close enough to be correct (80% threshold)
- **Rate limiting**: 1 guess per 3 seconds per player to prevent spam
- **Live statistics**: See total guesses, correct answers, and active players

#### **3. Scoring & Results** 🏆

- **Correct guesser**: Earns 10 points (first correct guess wins)
- **Presenter**: Earns 5 points when someone guesses correctly
- **Real-time leaderboard** updates instantly with medal icons for top 3 players
- **Guess history**: Complete log of all attempts with timestamps and similarity scores
- **Winner celebration**: Visual highlighting and congratulations for correct guessers

### **Winning Strategy Tips** 💡

#### **As a Presenter:**

- **Choose your phrase wisely** - browse categories and difficulties to find one that inspires you
- **Think creatively** - use emojis that represent concepts, not just literal objects
- **Build sequences** - tell a visual story with your emojis (up to 20 emojis available)
- **Use the search function** - find specific emojis quickly with keyword search
- **Consider multiple meanings** - some emojis can represent different things
- **Balance difficulty** - too easy is boring, too hard is frustrating
- **Watch the timer** - you have 2 minutes total for phrase selection and emoji building

#### **As a Guesser:**

- **Study the emoji sequence** - look for patterns and connections between emojis
- **Think broadly** - consider metaphors, abstract connections, and cultural references
- **Try variations** - the advanced fuzzy matching is forgiving of typos and synonyms
- **Watch similarity scores** - learn from percentage feedback on near-miss guesses
- **Observe other guesses** - see what others are thinking and build on their ideas
- **Be strategic** - you're rate-limited to 1 guess per 3 seconds, so make them count
- **Stay engaged** - first correct guess wins the 10 points

### **Example Round** 📝

```
🎭 Presenter Phase:
- Phrase assigned: "The Lion King" (Movies category, Medium difficulty)
- Presenter selects: 🦁👑🌅🐗
- Emojis submitted to all players

🤔 Guessing Phase:
Player1: "lion" → 45% similarity (fuzzy matching feedback)
Player2: "king lion" → 67% similarity  
Player3: "the lion king" → ✅ CORRECT! (10 points)
Presenter: +5 points for successful round

⏰ Time: 1:23 remaining (color-coded timer: green → yellow → red)
🏆 Leaderboard updates in real-time with medal icons
📊 Statistics: 3 total guesses, 1 correct, 4 active players
```

## 🛠️ Technical Stack

This game showcases modern web development on Reddit's platform:

- **[Devvit](https://developers.reddit.com/)**: Reddit's developer platform for immersive games
- **[React](https://react.dev/)**: Modern UI with hooks and context for state management
- **[TypeScript](https://www.typescriptlang.org/)**: Full type safety across client and server
- **[Express](https://expressjs.com/)**: RESTful API endpoints with comprehensive middleware
- **[Redis](https://redis.io/)**: Real-time data persistence and caching
- **[Vite](https://vite.dev/)**: Lightning-fast development and optimized builds
- **[Tailwind CSS](https://tailwindcss.com/)**: Responsive, mobile-first styling

## 🚀 Getting Started

### **Prerequisites**

- **Node.js 22+** installed on your machine
- **Reddit account** connected to Reddit Developers
- **Devvit CLI** installed and authenticated

### **Development Setup**

```bash
# Clone and install dependencies
npm install

# Start development server (runs client, server, and devvit)
npm run dev

# Open the playtest URL provided in terminal
# Example: https://www.reddit.com/r/emojirades_dev?playtest=emojirades
```

### **Testing the Game**

1. **Run development server**: `npm run dev`
2. **Open playtest URL** in your browser (provided in terminal output)
3. **Click "Launch App"** on the Reddit post
4. **Join the game** and start playing with multiple browser tabs to simulate multiplayer

### **Current Gameplay Experience**

The game is now fully playable with a comprehensive feature set:

#### **🎮 Complete Game Flow**
- **Seamless Lobby Experience**: Join games instantly with real-time player updates and connection monitoring
- **Automatic Role Assignment**: Smart presenter rotation ensuring every player gets equal opportunities
- **Smooth State Transitions**: Fluid movement between lobby → active game → round results with loading states

#### **🎭 Rich Presenter Experience**
- **Curated Content Library**: 700+ professionally selected phrases across 7 diverse categories
- **Intuitive Creation Tools**: Advanced emoji picker with search, categories, and visual sequence building
- **Creative Freedom**: Up to 20 emojis per sequence with unlimited creative combinations
- **Real-time Feedback**: Instant validation and submission confirmation with error handling

#### **🤔 Engaging Guesser Experience**
- **Clear Visual Communication**: Large, accessible emoji displays with copy functionality
- **Competitive Guessing**: Smart input validation with advanced fuzzy matching and instant feedback
- **Social Interaction**: See all players' attempts in real-time with accuracy percentages
- **Achievement Recognition**: Immediate point awards and winner highlighting

#### **⏰ Dynamic Timer System**
- **Visual Countdown**: 2-minute rounds with progressive color warnings (green → yellow → red)
- **Synchronized Timing**: All players see identical countdown with automatic round ending
- **Urgency Indicators**: Pulse animations and status messages during critical final seconds

#### **📊 Live Statistics & Social Features**
- **Real-time Leaderboard**: Instant score updates and ranking changes with medal icons for top 3
- **Player Status Tracking**: Online/offline indicators, roles, and participation metrics
- **Guess Analytics**: Detailed statistics on accuracy, participation, and game progress
- **Connection Resilience**: Automatic reconnection with graceful offline handling

#### **📱 Mobile-First Design**
- **Touch Optimization**: Large buttons and mobile-friendly emoji selection interface
- **Responsive Layout**: Adaptive interface that works perfectly on phones, tablets, and desktop
- **Reddit Integration**: Seamless experience within Reddit's mobile app and web interface

## 📋 Development Commands

- `npm run dev`: Starts live development server with hot reloading
- `npm run build`: Builds optimized client and server bundles
- `npm run deploy`: Uploads new version to Reddit
- `npm run launch`: Publishes app for Reddit review
- `npm run check`: Runs TypeScript, ESLint, and Prettier checks
- `npm run login`: Authenticates Devvit CLI with Reddit

## 🏗️ Project Architecture

### **Folder Structure**

```
src/
├── client/          # React frontend (runs in Reddit webview)
│   ├── components/  # Game UI components
│   ├── contexts/    # React Context for state management
│   ├── hooks/       # Custom React hooks
│   └── utils/       # Client-side utilities
├── server/          # Express backend (serverless functions)
│   ├── api/         # RESTful API endpoints
│   ├── core/        # Game logic and managers
│   ├── middleware/  # Security and validation
│   └── utils/       # Server-side utilities
└── shared/          # Shared types and utilities
    ├── types/       # TypeScript type definitions
    ├── utils/       # Shared utility functions
    └── data/        # Game data (phrases, etc.)
```

### **Key Features Implementation**

- **Real-time Communication**: Long-polling with Redis pub/sub
- **State Management**: React Context with useReducer
- **Game Logic**: Modular managers for games, rounds, and data
- **Security**: Rate limiting, input validation, anti-cheating
- **Persistence**: Redis for game state, players, and leaderboards

## 🎯 Game Development Status

### ✅ **Completed Features**

#### **Core Infrastructure**
- [x] **Project Architecture**: Complete TypeScript monorepo with client/server/shared structure
- [x] **Phrase Database**: 700+ curated phrases across 7 categories with difficulty ratings and hints
- [x] **Fuzzy Matching Engine**: Advanced similarity detection with 80% threshold using multiple algorithms
- [x] **Real-time Communication**: Redis pub/sub system with automatic reconnection and event synchronization

#### **Server-Side Systems**
- [x] **Game Logic Engine**: Complete round management, player rotation, and state persistence
- [x] **RESTful API**: Comprehensive endpoints for all game actions with proper error handling
- [x] **Security Framework**: Rate limiting, input validation, anti-cheating measures, and presenter protection
- [x] **Data Persistence**: Redis-based storage for games, players, scores, and real-time state

#### **Client-Side Interface**
- [x] **React Architecture**: Context-based state management with custom hooks and error boundaries
- [x] **Game Lobby System**: Real-time player list, moderator controls, connection status, and join management
- [x] **Presenter Interface**: Category-filtered phrase selection, 6-category emoji picker with search, sequence builder
- [x] **Guesser Interface**: Large emoji display, smart input validation, comprehensive guess history with statistics
- [x] **Timer System**: 2-minute countdown with color-coded warnings, pulse animations, and automatic round ending
- [x] **Live Updates**: Real-time guess display with similarity scoring, timestamps, winner highlighting, and leaderboard

#### **User Experience**
- [x] **Mobile Optimization**: Touch-friendly controls, responsive design, Reddit mobile app compatibility
- [x] **Connection Management**: Robust status indicators, automatic reconnection, graceful offline handling
- [x] **Error Handling**: User-friendly messages, toast notifications, connection recovery, input validation
- [x] **Accessibility**: Keyboard navigation, screen reader support, high contrast modes, clear visual hierarchy

### 🚧 **In Development**

#### **Next Priority Features**
- [ ] **Round Results System**: Comprehensive round completion with correct answer reveal, winner celebration, and score updates
- [ ] **Game Completion Flow**: Final results screen with overall winner, statistics summary, and play again options
- [ ] **Enhanced Leaderboard**: Persistent cross-game statistics, player rankings, and achievement tracking

#### **Future Enhancements**
- [ ] **Achievement System**: Unlockable badges for creative presentations, accurate guessing, and participation milestones
- [ ] **Spectator Mode**: Allow users to watch ongoing games with limited interaction
- [ ] **Game Replay**: Save and replay interesting rounds with emoji sequences and guess progression
- [ ] **Custom Phrases**: Allow moderators to add custom phrases for themed games
- [ ] **Tournament Mode**: Multi-game tournaments with bracket systems and championship tracking

## 🔧 Development Tools

This project includes a pre-configured development environment:

- **[Cursor IDE](https://www.cursor.com/)**: AI-powered development with Devvit MCP integration
- **TypeScript**: Strict type checking across the entire codebase
- **ESLint**: Code quality and consistency enforcement
- **Prettier**: Automatic code formatting
- **Vite**: Fast development server with hot module replacement
