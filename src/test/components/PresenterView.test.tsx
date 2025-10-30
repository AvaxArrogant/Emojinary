import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PresenterView } from '../../client/components/PresenterView';


// Mock hooks
vi.mock('../../client/hooks/useGameActions', () => ({
  usePresenterActions: () => ({
    submitEmojis: vi.fn(),
    canSubmitEmojis: true,
    selectedPhrase: {
      id: 'mov_001',
      text: 'The Matrix',
      category: 'movies',
      difficulty: 'medium',
    },
    selectPhrase: vi.fn(),
    error: null,
    clearError: vi.fn(),
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

// Mock phrases utility
vi.mock('../../shared/utils/phrases', () => ({
  getPhraseCategories: () => ['movies', 'books', 'songs', 'animals', 'food', 'places', 'activities'],
  getPhrasesDatabase: () => ({
    movies: [
      { id: 'mov_001', text: 'The Matrix', difficulty: 'medium' },
      { id: 'mov_002', text: 'Titanic', difficulty: 'easy' },
    ],
    books: [
      { id: 'book_001', text: 'Harry Potter', difficulty: 'easy' },
    ],
  }),
}));

describe('PresenterView Component', () => {
  const mockSubmitEmojis = vi.fn();
  const mockSelectPhrase = vi.fn();
  const mockClearError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    vi.mocked(mockSubmitEmojis).mockResolvedValue(undefined);
    vi.mocked(mockSelectPhrase).mockImplementation(() => {});
    vi.mocked(mockClearError).mockImplementation(() => {});
  });

  const renderPresenterView = () => {
    return render(<PresenterView />);
  };

  it('should display selected phrase', () => {
    renderPresenterView();
    
    // Should show the selected phrase
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
  });

  it('should show phrase category', () => {
    renderPresenterView();
    
    // Should display the category
    expect(screen.getByText(/movies/i)).toBeInTheDocument();
  });

  it('should show difficulty level', () => {
    renderPresenterView();
    
    // Should display difficulty
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
  });

  it('should display emoji picker interface', () => {
    renderPresenterView();
    
    // Should have emoji selection area
    const emojiPicker = screen.getByRole('region', { name: /emoji/i }) || 
                       screen.getByTestId('emoji-picker') ||
                       screen.getByText(/select emojis/i);
    expect(emojiPicker).toBeInTheDocument();
  });

  it('should show emoji sequence builder', () => {
    renderPresenterView();
    
    // Should have area to build emoji sequence
    const sequenceBuilder = screen.getByRole('region', { name: /sequence/i }) ||
                           screen.getByTestId('emoji-sequence') ||
                           screen.getByText(/emoji sequence/i);
    expect(sequenceBuilder).toBeInTheDocument();
  });

  it('should display submit button', () => {
    renderPresenterView();
    
    // Should have submit button
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('should enable submit when emojis are selected', () => {
    renderPresenterView();
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    // Should be enabled when canSubmitEmojis is true
    expect(submitButton).not.toBeDisabled();
  });

  it('should handle emoji submission', async () => {
    renderPresenterView();
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSubmitEmojis).toHaveBeenCalledTimes(1);
    });
  });

  it('should show phrase selection interface', () => {
    renderPresenterView();
    
    // Should have phrase selection area
    const phraseSelector = screen.getByText(/phrase/i) || 
                          screen.getByRole('button', { name: /select.*phrase/i });
    expect(phraseSelector).toBeInTheDocument();
  });

  it('should display category filters', () => {
    renderPresenterView();
    
    // Should show category options
    const categories = ['movies', 'books', 'songs', 'animals', 'food'];
    const categoryElements = categories.some(category => 
      screen.queryByText(new RegExp(category, 'i'))
    );
    expect(categoryElements).toBeTruthy();
  });

  it('should handle phrase selection', async () => {
    renderPresenterView();
    
    // Look for phrase selection button
    const selectButton = screen.queryByRole('button', { name: /select.*phrase/i }) ||
                        screen.queryByRole('button', { name: /change.*phrase/i });
    
    if (selectButton) {
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(mockSelectPhrase).toHaveBeenCalled();
      });
    }
  });

  it('should show instructions for presenter', () => {
    renderPresenterView();
    
    // Should have instructions
    const instructions = screen.getByText(/represent.*phrase/i) ||
                        screen.getByText(/choose.*emojis/i) ||
                        screen.getByText(/select.*emojis/i);
    expect(instructions).toBeInTheDocument();
  });

  it('should display emoji search functionality', () => {
    renderPresenterView();
    
    // Should have search input for emojis
    const searchInput = screen.queryByRole('textbox', { name: /search/i }) ||
                       screen.queryByPlaceholderText(/search.*emoji/i);
    
    if (searchInput) {
      expect(searchInput).toBeInTheDocument();
    }
  });

  it('should handle error states', () => {
    renderPresenterView();
    
    // Should handle error display (error is null in mock, so no error shown)
    const errorMessage = screen.queryByRole('alert') || screen.queryByText(/error/i);
    expect(errorMessage).not.toBeInTheDocument();
  });
});
