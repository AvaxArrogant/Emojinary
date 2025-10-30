import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGuesserActions, useGameTimer } from '../hooks/useGameActions';
import { useGame } from '../contexts/GameContext';
import { LoadingSpinner } from './LoadingScreen';
import { GameTimer } from './GameTimer';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorDisplay } from './ErrorDisplay';
import { useComponentLoading } from '../hooks/useLoadingState';
import { useGameError } from '../hooks/useGameError';
import { useSoundEffects } from '../utils/soundEffects';

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
  const { timeRemaining } = useGameTimer();
  const { isLoading: componentLoading, setLoading } = useComponentLoading('guesser-view');
  const { registerRetryableAction } = useGameError();
  const { play } = useSoundEffects();

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

  // Handle guess submission with enhanced error handling
  const handleSubmitGuess = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guessInput.trim() || !canGuess || isSubmitting || componentLoading) {
      return;
    }

    const guess = guessInput.trim();
    setIsSubmitting(true);
    setLoading(true, 'Submitting guess...');
    clearError();

    registerRetryableAction('submit-guess', () => submitGuess(guess));

    try {
      await submitGuess(guess);
      setGuessInput(''); // Clear input after successful submission

      // Play sound - neutral sound for submission
      await play('buttonClick');
    } catch (error) {
      // Error is handled by the error handling system
      console.error('Failed to submit guess:', error);
      await play('wrongGuess');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  }, [guessInput, canGuess, isSubmitting, componentLoading, submitGuess, clearError, setLoading, registerRetryableAction, play]);

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
    <ErrorBoundary>
      <div className="section-spacing container-mobile">
        <GameTimer />

        <div className="card-mobile p-mobile">
          {error && (
            <div className="mb-6">
              <ErrorDisplay
                message={error}
                variant="inline"
                onDismiss={clearError}
              />
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-mobile-xl sm:text-2xl font-bold text-gray-900">
                🤔 Guess the Phrase!
              </h2>
            </div>

            {presenter && (
              <p className="text-gray-600 text-mobile-base">
                Presenter: <span className="font-medium">{presenter.username}</span>
              </p>
            )}
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-mobile-lg font-semibold text-gray-900">
                Emoji Clues:
              </h3>
              {currentEmojis.length > 0 && (
                <button
                  onClick={() => navigator.clipboard?.writeText(currentEmojis.join(' '))}
                  className="btn-mobile text-mobile-sm px-3 py-2 bg-gray-100 text-gray-600 hover-mobile text-no-select"
                  title="Copy emojis to clipboard"
                >
                  📋 Copy
                </button>
              )}
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-mobile p-mobile shadow-mobile">
              {currentEmojis.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2 animate-pulse">⏳</div>
                  <p className="text-gray-500 font-medium text-mobile-base">Waiting for presenter to submit emojis...</p>
                  <p className="text-mobile-sm text-gray-400 mt-1">
                    {presenter?.username} is choosing their emoji sequence
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-4xl sm:text-6xl mb-4 leading-relaxed tracking-wider">
                    {currentEmojis.map((emoji, index) => (
                      <span
                        key={index}
                        className="inline-block mx-1 hover:scale-110 transition-transform cursor-default text-no-select"
                        title={`Emoji ${index + 1}`}
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-center space-x-4 text-mobile-sm text-gray-600">
                    <span>{currentEmojis.length} emoji{currentEmojis.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>From {presenter?.username}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {currentEmojis.length > 0 && (
            <div className="mb-8">
              <h3 className="text-mobile-lg font-semibold text-gray-900 mb-4">
                Your Guess:
              </h3>

              {hasGuessedCorrectly ? (
                <div className="bg-green-50 border border-green-200 rounded-mobile p-mobile">
                  <div className="text-center">
                    <div className="text-4xl mb-3">🎉</div>
                    <p className="text-mobile-lg font-semibold text-green-800 mb-2">
                      Congratulations!
                    </p>
                    <p className="text-green-700 text-mobile-base">
                      You guessed correctly: <span className="font-medium text-selectable">"{userLatestGuess?.text}"</span>
                    </p>
                    <p className="text-mobile-sm text-green-600 mt-2">
                      You earned 10 points! 🏆
                    </p>
                  </div>
                </div>
              ) : !canGuess ? (
                <div className="bg-gray-50 border border-gray-200 rounded-mobile p-mobile">
                  <div className="text-center">
                    <div className="text-2xl mb-2">
                      {timeRemaining <= 0 ? '⏰' : '⏸️'}
                    </div>
                    <p className="text-gray-600 text-mobile-base">
                      {timeRemaining <= 0 ? 'Time\'s up! Round has ended.' : 'You cannot guess at this time.'}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitGuess} className="touch-spacing-large">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={guessInput}
                      onChange={handleInputChange}
                      placeholder="Type your guess here..."
                      disabled={!canGuess || isSubmitting}
                      className="input-mobile-large w-full pr-20"
                      maxLength={100}
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      <span className={`text-mobile-sm ${guessInput.length > 80 ? 'text-red-500' : 'text-gray-400'}`}>
                        {guessInput.length}/100
                      </span>
                      {guessInput && (
                        <button
                          onClick={() => setGuessInput('')}
                          className="text-gray-400 hover:text-gray-600 p-1 text-lg"
                          type="button"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!guessInput.trim() || !canGuess || isSubmitting || componentLoading}
                    className="btn-mobile-large w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-no-select"
                  >
                    {(isSubmitting || componentLoading) ? (
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
                </form>
              )}
            </div>
          )}

          {sortedGuesses.length > 0 && (
            <div>
              <h3 className="text-mobile-lg font-semibold text-gray-900 mb-4">
                All Guesses ({sortedGuesses.length})
              </h3>

              <div
                ref={guessHistoryRef}
                className="max-h-64 overflow-y-auto border border-gray-200 rounded-mobile bg-gray-50"
              >
                <div className="p-mobile section-spacing-compact">
                  {sortedGuesses.map((guess) => {
                    const isUserGuess = guess.playerId === userLatestGuess?.playerId;
                    const isCorrect = guess.isCorrect;

                    return (
                      <div
                        key={guess.id}
                        className={`p-mobile rounded-mobile border transition-all ${isCorrect
                          ? 'bg-green-100 border-green-300 shadow-mobile'
                          : isUserGuess
                            ? 'bg-blue-100 border-blue-300'
                            : 'bg-white border-gray-200 hover-mobile'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 text-mobile-base">
                            {guess.username}
                            {isUserGuess && <span className="text-blue-600 ml-1 font-normal">(You)</span>}
                          </span>
                          {isCorrect && (
                            <span className="ml-2 px-2 py-1 bg-green-200 text-green-800 text-mobile-xs font-medium rounded-full">
                              ✅ Winner!
                            </span>
                          )}
                        </div>

                        <p className={`text-mobile-sm ${isCorrect ? 'font-semibold text-green-800' : 'text-gray-700'} text-selectable`}>
                          "{guess.text}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {sortedGuesses.length === 0 && currentEmojis.length > 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-mobile border-2 border-dashed border-gray-300">
              <div className="text-4xl mb-2">🤷‍♂️</div>
              <p className="text-gray-500 font-medium text-mobile-base">No guesses yet. Be the first to guess!</p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};
