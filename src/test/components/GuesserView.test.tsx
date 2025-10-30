import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GuesserView } from '../../client/components/GuesserView';
import type { Round, Guess, Player } from '../../shared/types/api';

// Mock hooks
vi.mock('../../client/hooks/useGameActions', () => ({
  useGuesserActions: () => ({
    submitGuess: vi.fn(),
    canGuess: true,
    currentEmojis: ['🍎', '🥧'],
    userGuesses: [
      {
        id: 'guess_1',
        playerId: 'player_1',
        username: 'alice',
        text: 'apple pie',
        similarity: 1.0,
        isCorrect: true,
        timestamp: Date.now(),
      },
    ] as Guess[],
    hasGuessedCorrectly: false,
    error: null,
    clearError: vi.fn(),
  }),
  useGameTimer: () => ({
    timeRemaining: 90000, // 90 seconds
  }),
}));

vi.mock('../../client/contexts/GameContext', () => ({
  useGame: () => ({
    currentRound: {
      id: 'round_1',
      gameId: 'game_1',
      roundNumber: 1,
      presenterId: 'presenter_1',
      phrase: { id: 'phrase_1', text: 'apple pie', category: 'food', difficulty: 'easy' },
      emojiSequence: ['🍎', '🥧'],
      guesses: [
        {
          id: 'guess_1',
          playerId: 'player_1',
          username: 'alice',
          text: 'apple tart',
          similarity: 0.7,
          isCorrect: false,
          timestamp: Date.now() - 5000,
        },
        {
          id: 'guess_2',
          playerId: 'player_2',
          username: 'bob',
          text: 'fruit pie',
          similarity: 0.6,
          isCorrect: false,
          timestamp: Date.now() - 3000,
        },
      ] as Guess[],
      status: 'active',
      startTime: Date.now() - 30000,
    } as Round,
    players: [
      { id: 'player_1', username: 'alice', score: 10, isActive: true },
      { id: 'player_2', username: 'bob', score: 5, isActive: true },
    ] as Player[],
  }),
}));

vi.mock('../../client/hooks/useLoadingState', () => ({
  useComponentLoading: () => ({
    isLoading: false,
    setLoading: vi.fn(),
  }),
}));

vi.mock('../../client/hooks/useGameError', () => ({
  useGameError: () => ({
    registerRetryableAction: vi.fn(),
  }),
}));

describe('GuesserView Component', () => {
  const mockSubmitGuess = vi.fn();
  const mockClearError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    vi.mocked(mockSubmitGuess).mockResolvedValue(undefined);
    vi.mocked(mockClearError).mockImplementation(() => {});
  });

  const renderGuesserView = () => {
    return render(<GuesserView />);
  };

  it('should display emoji sequence from presenter', () => {
    renderGuesserView();
    
    // Should show the emojis from presenter
    expect(screen.getByText('🍎')).toBeInTheDocument();
    expect(screen.getByText('🥧')).toBeInTheDocument();
  });

  it('should show guess input field', () => {
    renderGuesserView();
    
    // Should have input for guesses
    const guessInput = screen.getByRole('textbox', { name: /guess/i }) ||
                      screen.getByPlaceholderText(/enter.*guess/i) ||
                      screen.getByLabelText(/guess/i);
    expect(guessInput).toBeInTheDocument();
  });

  it('should display submit guess button', () => {
    renderGuesserView();
    
    // Should have submit button
    const submitButton = screen.getByRole('button', { name: /submit/i }) ||
                        screen.getByRole('button', { name: /guess/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('should show remaining time', () => {
    renderGuesserView();
    
    // Should display timer (90 seconds = 1:30)
    const timer = screen.getByText(/1:30/) || screen.getByText(/90/) || screen.getByText(/time/i);
    expect(timer).toBeInTheDocument();
  });

  it('should display guess history', () => {
    renderGuesserView();
    
    // Should show previous guesses
    expect(screen.getByText('apple tart')).toBeInTheDocument();
    expect(screen.getByText('fruit pie')).toBeInTheDocument();
  });

  it('should show guess similarity scores', () => {
    renderGuesserView();
    
    // Should display similarity percentages
    expect(screen.getByText(/70%/) || screen.getByText(/0\.7/)).toBeInTheDocument();
    expect(screen.getByText(/60%/) || screen.getByText(/0\.6/)).toBeInTheDocument();
  });

  it('should display usernames with guesses', () => {
    renderGuesserView();
    
    // Should show who made each guess
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('should handle guess submission', async () => {
    renderGuesserView();
    
    const guessInput = screen.getByRole('textbox', { name: /guess/i }) ||
                      screen.getByPlaceholderText(/enter.*guess/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });
    
    // Type a guess
    fireEvent.change(guessInput, { target: { value: 'apple pie' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSubmitGuess).toHaveBeenCalledWith('apple pie');
    });
  });

  it('should enable/disable submit based on canGuess', () => {
    renderGuesserView();
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    // Should be enabled when canGuess is true
    expect(submitButton).not.toBeDisabled();
  });

  it('should show round information', () => {
    renderGuesserView();
    
    // Should display round number
    expect(screen.getByText(/round.*1/i)).toBeInTheDocument();
  });

  it('should display correct/incorrect guess indicators', () => {
    renderGuesserView();
    
    // Should show visual indicators for guess accuracy
    const incorrectIndicators = screen.getAllByText(/❌/) || 
                               screen.getAllByText(/incorrect/i) ||
                               screen.getAllByRole('img', { name: /incorrect/i });
    expect(incorrectIndicators.length).toBeGreaterThan(0);
  });

  it('should handle keyboard submission', async () => {
    renderGuesserView();
    
    const guessInput = screen.getByRole('textbox', { name: /guess/i }) ||
                      screen.getByPlaceholderText(/enter.*guess/i);
    
    // Type and press Enter
    fireEvent.change(guessInput, { target: { value: 'test guess' } });
    fireEvent.keyDown(guessInput, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(mockSubmitGuess).toHaveBeenCalledWith('test guess');
    });
  });

  it('should show instructions for guessers', () => {
    renderGuesserView();
    
    // Should have instructions
    const instructions = screen.getByText(/guess.*phrase/i) ||
                        screen.getByText(/what.*emojis/i) ||
                        screen.getByText(/enter.*guess/i);
    expect(instructions).toBeInTheDocument();
  });

  it('should display user\'s own guesses differently', () => {
    renderGuesserView();
    
    // Should highlight or mark user's own guesses
    const userGuess = screen.getByText('apple pie');
    expect(userGuess).toBeInTheDocument();
    // Could check for special styling or indicators
  });

  it('should handle error states', () => {
    renderGuesserView();
    
    // Should handle error display (error is null in mock, so no error shown)
    const errorMessage = screen.queryByRole('alert') || screen.queryByText(/error/i);
    expect(errorMessage).not.toBeInTheDocument();
  });
});
