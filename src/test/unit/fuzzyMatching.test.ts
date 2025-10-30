import { describe, it, expect } from 'vitest';
import {
  normalizeString,
  preprocessForMatching,
  validateGuessWithFuzzyMatching,
  calculateLevenshteinSimilarity,
  fuzzyMatchGuess,
  getBestMatch,
} from '../../shared/utils/fuzzyMatching';

describe('Fuzzy Matching System', () => {
  describe('normalizeString', () => {
    it('should convert to lowercase and trim whitespace', () => {
      expect(normalizeString('  HELLO WORLD  ')).toBe('hello world');
    });

    it('should remove common punctuation', () => {
      expect(normalizeString('Hello, World!')).toBe('hello world');
    });

    it('should handle contractions', () => {
      expect(normalizeString("don't")).toBe('do not');
      expect(normalizeString("can't")).toBe('cannot');
      expect(normalizeString("I'm")).toBe('i am');
    });

    it('should handle synonyms', () => {
      expect(normalizeString('automobile')).toBe('car');
      expect(normalizeString('cellphone')).toBe('phone');
      expect(normalizeString('television')).toBe('tv');
    });

    it('should handle empty or invalid input', () => {
      expect(normalizeString('')).toBe('');
      expect(normalizeString('   ')).toBe('');
    });
  });

  describe('preprocessForMatching', () => {
    it('should handle plural forms', () => {
      expect(preprocessForMatching('cats')).toBe('cat');
      expect(preprocessForMatching('dogs')).toBe('dog');
    });

    it('should handle past tense forms', () => {
      expect(preprocessForMatching('walked')).toBe('walk');
      expect(preprocessForMatching('jumped')).toBe('jump');
    });

    it('should handle -ing forms', () => {
      expect(preprocessForMatching('running')).toBe('runn');
      expect(preprocessForMatching('walking')).toBe('walk');
    });
  });

  describe('validateGuessWithFuzzyMatching', () => {
    it('should match exact phrases', () => {
      const result = validateGuessWithFuzzyMatching('apple pie', 'apple pie');
      expect(result.isMatch).toBe(true);
      expect(result.similarity).toBe(1.0);
    });

    it('should match case-insensitive phrases', () => {
      const result = validateGuessWithFuzzyMatching('Apple Pie', 'apple pie');
      expect(result.isMatch).toBe(true);
    });

    it('should match with minor typos', () => {
      const result = validateGuessWithFuzzyMatching('aple pie', 'apple pie');
      expect(result.isMatch).toBe(true);
      expect(result.similarity).toBeGreaterThan(0.8);
    });

    it('should not match completely different phrases', () => {
      const result = validateGuessWithFuzzyMatching('banana bread', 'apple pie');
      expect(result.isMatch).toBe(false);
      expect(result.similarity).toBeLessThan(0.8);
    });

    it('should handle empty strings', () => {
      const result = validateGuessWithFuzzyMatching('', 'apple pie');
      expect(result.isMatch).toBe(false);
      expect(result.similarity).toBe(0);
    });
  });

  describe('calculateLevenshteinSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      const similarity = calculateLevenshteinSimilarity('hello', 'hello');
      expect(similarity).toBe(1.0);
    });

    it('should return 0 for completely different strings', () => {
      const similarity = calculateLevenshteinSimilarity('hello', 'xyz');
      expect(similarity).toBeLessThan(0.5);
    });

    it('should handle single character differences', () => {
      const similarity = calculateLevenshteinSimilarity('hello', 'hallo');
      expect(similarity).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('fuzzyMatchGuess', () => {
    it('should use default threshold of 0.8', () => {
      const result = fuzzyMatchGuess('apple pie', 'apple pie');
      expect(result.isMatch).toBe(true);
    });

    it('should respect custom threshold', () => {
      const result = fuzzyMatchGuess('aple', 'apple pie', 0.9);
      expect(result.isMatch).toBe(false);
    });
  });

  describe('getBestMatch', () => {
    it('should return the best matching guess', () => {
      const guesses = ['banana bread', 'apple pie', 'cherry tart'];
      const result = getBestMatch('apple pie', guesses);
      
      expect(result).not.toBeNull();
      expect(result?.guess).toBe('apple pie');
      expect(result?.result.isMatch).toBe(true);
    });

    it('should return null when no guess meets threshold', () => {
      const guesses = ['banana bread', 'cherry tart', 'lemon cake'];
      const result = getBestMatch('apple pie', guesses);
      
      expect(result).toBeNull();
    });
  });
});
