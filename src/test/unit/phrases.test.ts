import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPhraseCategories,
  getPhrasesByCategory,
  getPhrasesByDifficulty,
  getPhraseById,
  searchPhrases,
  createSessionTracker,
  markPhraseAsUsed,
  isPhraseUsed,
  selectRandomPhrase,
  validatePhraseData,
  getTotalPhraseCount,
  type SessionPhraseTracker,
} from '../../shared/utils/phrases';

describe('Phrase Management System', () => {
  let tracker: SessionPhraseTracker;

  beforeEach(() => {
    tracker = createSessionTracker('test-game-1');
  });

  describe('getPhraseCategories', () => {
    it('should return all available categories', () => {
      const categories = getPhraseCategories();
      expect(categories).toContain('movies');
      expect(categories).toContain('books');
      expect(categories).toContain('songs');
      expect(categories).toContain('animals');
      expect(categories).toContain('food');
      expect(categories).toContain('places');
      expect(categories).toContain('activities');
    });
  });

  describe('getPhrasesByCategory', () => {
    it('should return phrases from specified categories', () => {
      const phrases = getPhrasesByCategory(['movies', 'books']);
      expect(phrases.length).toBeGreaterThan(0);
      
      // Check that all phrases are from the requested categories
      phrases.forEach(phrase => {
        const categoryPrefix = phrase.id.split('_')[0];
        expect(['mov', 'book']).toContain(categoryPrefix);
      });
    });

    it('should return empty array for non-existent categories', () => {
      const phrases = getPhrasesByCategory(['nonexistent'] as any);
      expect(phrases).toEqual([]);
    });
  });

  describe('getPhrasesByDifficulty', () => {
    it('should return phrases of specified difficulty', () => {
      const easyPhrases = getPhrasesByDifficulty(['easy']);
      expect(easyPhrases.length).toBeGreaterThan(0);
      
      easyPhrases.forEach(phrase => {
        expect(phrase.difficulty).toBe('easy');
      });
    });

    it('should return phrases of multiple difficulties', () => {
      const phrases = getPhrasesByDifficulty(['easy', 'medium']);
      expect(phrases.length).toBeGreaterThan(0);
      
      phrases.forEach(phrase => {
        expect(['easy', 'medium']).toContain(phrase.difficulty);
      });
    });
  });

  describe('searchPhrases', () => {
    it('should find phrases by text content', () => {
      const results = searchPhrases('the');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const lowerResults = searchPhrases('the');
      const upperResults = searchPhrases('THE');
      expect(lowerResults.length).toBe(upperResults.length);
    });

    it('should return empty array for non-matching query', () => {
      const results = searchPhrases('xyznomatch123');
      expect(results).toEqual([]);
    });
  });

  describe('Session Tracking', () => {
    describe('createSessionTracker', () => {
      it('should create a new tracker with correct initial state', () => {
        const newTracker = createSessionTracker('game-123');
        
        expect(newTracker.gameId).toBe('game-123');
        expect(newTracker.usedPhraseIds.size).toBe(0);
        expect(newTracker.categoryUsageCount.movies).toBe(0);
        expect(newTracker.difficultyUsageCount.easy).toBe(0);
      });
    });

    describe('markPhraseAsUsed', () => {
      it('should mark phrase as used and update counters', () => {
        const updatedTracker = markPhraseAsUsed(tracker, 'mov_001', 'movies', 'easy');
        
        expect(updatedTracker.usedPhraseIds.has('mov_001')).toBe(true);
        expect(updatedTracker.categoryUsageCount.movies).toBe(1);
        expect(updatedTracker.difficultyUsageCount.easy).toBe(1);
      });
    });

    describe('isPhraseUsed', () => {
      it('should return false for unused phrases', () => {
        expect(isPhraseUsed(tracker, 'mov_001')).toBe(false);
      });

      it('should return true for used phrases', () => {
        const updatedTracker = markPhraseAsUsed(tracker, 'mov_001', 'movies', 'easy');
        expect(isPhraseUsed(updatedTracker, 'mov_001')).toBe(true);
      });
    });
  });

  describe('selectRandomPhrase', () => {
    it('should return a phrase when available', () => {
      const phrase = selectRandomPhrase(tracker);
      expect(phrase).not.toBeNull();
      expect(phrase?.id).toBeDefined();
      expect(phrase?.text).toBeDefined();
      expect(phrase?.difficulty).toBeDefined();
    });

    it('should respect category filters', () => {
      const phrase = selectRandomPhrase(tracker, { categories: ['movies'] });
      if (phrase) {
        const categoryPrefix = phrase.id.split('_')[0];
        expect(categoryPrefix).toBe('mov');
      }
    });

    it('should respect difficulty filters', () => {
      const phrase = selectRandomPhrase(tracker, { difficulties: ['easy'] });
      if (phrase) {
        expect(phrase.difficulty).toBe('easy');
      }
    });
  });

  describe('validatePhraseData', () => {
    it('should validate correct phrase data', () => {
      const validPhrase = {
        id: 'mov_001',
        text: 'The Matrix',
        difficulty: 'medium' as const,
        hints: ['sci-fi', 'Keanu Reeves'],
      };
      
      expect(validatePhraseData(validPhrase)).toBe(true);
    });

    it('should reject invalid phrase data', () => {
      const invalidPhrase = {
        id: 'mov_001',
        // missing text
        difficulty: 'invalid',
      };
      
      expect(validatePhraseData(invalidPhrase)).toBe(false);
    });
  });

  describe('getTotalPhraseCount', () => {
    it('should return a positive number', () => {
      const count = getTotalPhraseCount();
      expect(count).toBeGreaterThan(0);
    });
  });
});
