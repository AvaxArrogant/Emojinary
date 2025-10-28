import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGuesserActions, useGameTimer } from '../hooks/useGameActions';
import { useGame } from '../contexts/GameContext';
import { LoadingSpinner } from './LoadingScreen';
import { GameTimer } from './GameTimer';

export const GuesserView: React.FC = () => {
  const { 
    submitGuess, 
    canGuess, 
    currentEmojis, 
    userGuesses, 
    hasGuessedCorrectly, 
    error, 
    clearError 
  } = useGuesserActions();
  
  const { currentRound, players } = useGame();
  const { timeRemaining, formattedTime, isWarning, isCritical } = useGameTimer();
  
  const [guessInput, setGuessInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const guessHistoryRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when component mounts or when user can guess again
  useEffect(() => {
    if (canGuess && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canGuess]);

  // Auto-scroll to bottom of guess history when new guesses are added
  useEffect(() => {
    if (guessHistoryRef.current) {
      guessHistoryRef.current.scrollTop = guessHistoryRef.current.scrollHeight;
    }
  }, [currentRound?.guesses]);

  // Handle guess submission
  const handleSubmitGuess = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guessInput.trim() || !canGuess || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      await submitGuess(guessInput.trim());
      setGuessInput(''); // Clear input after successful submission
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to submit guess:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [guessInput, canGuess, isSubmitting, submitGuess, clearError]);

  // Handle input change with validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Basic validation - only allow reasonable characters
    if (value.length <= 100 && /^[a-zA-Z0-9\s\-'.,!?]*$/.test(value)) {
      setGuessInput(value);
      clearError();
    }
  }, [clearError]);

  // Get presenter info
  const presenter = currentRound?.presenterId ? players[currentRound.presenterId] : null;
  
  // Sort guesses by timestamp (newest first for display)
  const sortedGuesses = [...(currentRound?.guesses || [])].sort((a, b) => b.timestamp - a.timestamp);
  
  // Get user's latest guess
  const userLatestGuess = userGuesses[0]; // userGuesses are already sorted by timestamp desc
  
  return (
    <div className="space-y-6">
      {/* Timer Component */}
      <GameTimer />
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">
              🤔 Guess the Phrase!
            </h2>
          </div>
          
          {presenter && (
            <p className="text-gray-600">
              Presenter: <span className="font-medium">{presenter.username}</span>
            </p>
          )}
        </div>

      {/* Emoji Display */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Emoji Clues:
          </h3>
          {currentEmojis.length > 0 && (
            <button
              onClick={() => navigator.clipboard?.writeText(currentEmojis.join(' '))}
              className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
              title="Copy emojis to clipboard"
            >
              📋 Copy
            </button>
          )}
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6 shadow-sm">
          {currentEmojis.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2 animate-pulse">⏳</div>
              <p className="text-gray-500 font-medium">Waiting for presenter to submit emojis...</p>
              <p className="text-sm text-gray-400 mt-1">
                {presenter?.username} is choosing their emoji sequence
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4 leading-relaxed tracking-wider">
                {currentEmojis.map((emoji, index) => (
                  <span 
                    key={index}
                    className="inline-block mx-1 hover:scale-110 transition-transform cursor-default"
                    title={`Emoji ${index + 1}`}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                <span>{currentEmojis.length} emoji{currentEmojis.length !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>From {presenter?.username}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guess Input */}
      {currentEmojis.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Guess:
          </h3>
          
          {hasGuessedCorrectly ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-lg font-semibold text-green-800 mb-2">
                  Congratulations!
                </p>
                <p className="text-green-700">
                  You guessed correctly: <span className="font-medium">"{userLatestGuess?.text}"</span>
                </p>
                <p className="text-sm text-green-600 mt-2">
                  You earned 10 points! 🏆
                </p>
              </div>
            </div>
          ) : !canGuess ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl mb-2">
                  {timeRemaining <= 0 ? '⏰' : '⏸️'}
                </div>
                <p className="text-gray-600">
                  {timeRemaining <= 0 ? 'Time\'s up! Round has ended.' : 'You cannot guess at this time.'}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitGuess} className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={guessInput}
                  onChange={handleInputChange}
                  placeholder="Type your guess here... (e.g., movie title, book name, etc.)"
                  disabled={!canGuess || isSubmitting}
                  className="w-full px-4 py-3 pr-16 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  maxLength={100}
                />
                <div className="absolute right-3 top-3 flex items-center space-x-2">
                  <span className={`text-sm ${
                    guessInput.length > 80 ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {guessInput.length}/100
                  </span>
                  {guessInput && (
                    <button
                      onClick={() => setGuessInput('')}
                      className="text-gray-400 hover:text-gray-600"
                      type="button"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="text-red-600 mr-2">⚠️</span>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}
              
              <button
                type="submit"
                disabled={!guessInput.trim() || !canGuess || isSubmitting}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="small" color="gray" />
                    <span className="ml-2">Submitting...</span>
                  </>
                ) : (
                  <>
                    <span className="mr-2">💭</span>
                    Submit Guess
                  </>
                )}
              </button>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Press Enter to submit</span>
                <span>Rate limited: 1 guess per 3 seconds</span>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Guess History */}
      {sortedGuesses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              All Guesses ({sortedGuesses.length})
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-1"></div>
                <span>Correct</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-1"></div>
                <span>Your guess</span>
              </div>
            </div>
          </div>
          
          <div 
            ref={guessHistoryRef}
            className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50"
          >
            <div className="p-4 space-y-3">
              {sortedGuesses.map((guess) => {
                const isUserGuess = guess.playerId === userLatestGuess?.playerId;
                const isCorrect = guess.isCorrect;
                
                return (
                  <div
                    key={guess.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isCorrect 
                        ? 'bg-green-100 border-green-300 shadow-sm' 
                        : isUserGuess
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">
                          {guess.username}
                          {isUserGuess && <span className="text-blue-600 ml-1 font-normal">(You)</span>}
                        </span>
                        {isCorrect && (
                          <span className="ml-2 px-2 py-1 bg-green-200 text-green-800 text-xs font-medium rounded-full">
                            ✅ Winner!
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(guess.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div>
                      <p className={`text-sm ${isCorrect ? 'font-semibold text-green-800' : 'text-gray-700'}`}>
                        "{guess.text}"
                      </p>
                      {!isCorrect && guess.similarity > 0 && (
                        <div className="flex items-center mt-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 mr-2">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.round(guess.similarity * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            {Math.round(guess.similarity * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-lg font-bold text-gray-900">
                {sortedGuesses.length}
              </div>
              <div className="text-xs text-gray-600">Total Guesses</div>
            </div>
            
            <div className="bg-blue-100 rounded-lg p-3">
              <div className="text-lg font-bold text-blue-800">
                {userGuesses.length}
              </div>
              <div className="text-xs text-blue-600">Your Guesses</div>
            </div>
            
            <div className="bg-green-100 rounded-lg p-3">
              <div className="text-lg font-bold text-green-800">
                {sortedGuesses.filter(g => g.isCorrect).length}
              </div>
              <div className="text-xs text-green-600">Correct Guesses</div>
            </div>
            
            <div className="bg-purple-100 rounded-lg p-3">
              <div className="text-lg font-bold text-purple-800">
                {new Set(sortedGuesses.map(g => g.playerId)).size}
              </div>
              <div className="text-xs text-purple-600">Players Guessing</div>
            </div>
          </div>
        </div>
      )}

      {/* No guesses yet */}
      {sortedGuesses.length === 0 && currentEmojis.length > 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-4xl mb-2">🤷‍♂️</div>
          <p className="text-gray-500 font-medium">No guesses yet. Be the first to guess!</p>
          <p className="text-sm text-gray-400 mt-1">
            Look at the emojis above and type your guess
          </p>
        </div>
      )}
      </div>
    </div>
  );
};
