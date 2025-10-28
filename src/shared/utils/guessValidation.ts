// ============================================================================
// GUESS VALIDATION WITH FUZZY MATCHING
// ============================================================================

import { validateGuess, type GuessValidation } from '../types/validation.js';
import { fuzzyMatchGuess, type FuzzyMatchResult } from './fuzzyMatching.js';
import { DEFAULT_GAME_CONFIG } from '../types/game.js';

// ============================================================================
// ENHANCED VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a guess against a target phrase using both input validation and fuzzy matching
 */
export const validateGuessAgainstPhrase = (
  guess: string,
  targetPhrase: string,
  threshold: number = DEFAULT_GAME_CONFIG.fuzzyMatchThreshold
): GuessValidation => {
  // First perform basic input validation
  const basicValidation = validateGuess(guess);
  
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // Perform fuzzy matching
  const fuzzyMatchResult = fuzzyMatchGuess(guess, targetPhrase, threshold);

  return {
    ...basicValidation,
    fuzzyMatchResult: {
      isMatch: fuzzyMatchResult.isMatch,
      similarity: fuzzyMatchResult.similarity,
      normalizedGuess: fuzzyMatchResult.normalizedGuess,
      normalizedTarget: fuzzyMatchResult.normalizedTarget,
    },
  };
};

/**
 * Checks if a guess is correct based on fuzzy matching
 */
export const isGuessCorrect = (
  guess: string,
  targetPhrase: string,
  threshold: number = DEFAULT_GAME_CONFIG.fuzzyMatchThreshold
): boolean => {
  const validation = validateGuessAgainstPhrase(guess, targetPhrase, threshold);
  return validation.isValid && (validation.fuzzyMatchResult?.isMatch ?? false);
};

/**
 * Gets the similarity score between a guess and target phrase
 */
export const getGuessSimilarity = (
  guess: string,
  targetPhrase: string
): number => {
  const fuzzyResult = fuzzyMatchGuess(guess, targetPhrase);
  return fuzzyResult.similarity;
};

/**
 * Validates multiple guesses against a target phrase
 * Returns the first correct guess found, or null if none are correct
 */
export const findCorrectGuess = (
  guesses: string[],
  targetPhrase: string,
  threshold: number = DEFAULT_GAME_CONFIG.fuzzyMatchThreshold
): { guess: string; validation: GuessValidation } | null => {
  for (const guess of guesses) {
    const validation = validateGuessAgainstPhrase(guess, targetPhrase, threshold);
    if (validation.isValid && validation.fuzzyMatchResult?.isMatch) {
      return { guess, validation };
    }
  }
  return null;
};

/**
 * Ranks guesses by their similarity to the target phrase
 */
export const rankGuessesBySimilarity = (
  guesses: string[],
  targetPhrase: string
): Array<{ guess: string; similarity: number; isCorrect: boolean }> => {
  const threshold = DEFAULT_GAME_CONFIG.fuzzyMatchThreshold;
  
  return guesses
    .map(guess => {
      const fuzzyResult = fuzzyMatchGuess(guess, targetPhrase, threshold);
      return {
        guess,
        similarity: fuzzyResult.similarity,
        isCorrect: fuzzyResult.isMatch,
      };
    })
    .sort((a, b) => b.similarity - a.similarity);
};

// ============================================================================
// ANTI-CHEATING UTILITIES
// ============================================================================

/**
 * Checks if a guess is too similar to previous guesses (potential spam)
 */
export const isDuplicateGuess = (
  newGuess: string,
  previousGuesses: string[],
  similarityThreshold: number = 0.9
): boolean => {
  const normalizedNewGuess = newGuess.toLowerCase().trim();
  
  for (const prevGuess of previousGuesses) {
    const normalizedPrevGuess = prevGuess.toLowerCase().trim();
    
    // Exact match
    if (normalizedNewGuess === normalizedPrevGuess) {
      return true;
    }
    
    // Very similar (potential spam)
    const similarity = getGuessSimilarity(normalizedNewGuess, normalizedPrevGuess);
    if (similarity >= similarityThreshold) {
      return true;
    }
  }
  
  return false;
};

/**
 * Validates that a guess is not too similar to the presenter's username
 * (prevents accidental reveals)
 */
export const isGuessNotPresenterHint = (
  guess: string,
  presenterUsername: string,
  similarityThreshold: number = 0.7
): boolean => {
  const similarity = getGuessSimilarity(guess, presenterUsername);
  return similarity < similarityThreshold;
};

// ============================================================================
// DEBUGGING AND TESTING UTILITIES
// ============================================================================

/**
 * Provides detailed analysis of a guess for debugging purposes
 */
export const analyzeGuess = (
  guess: string,
  targetPhrase: string,
  threshold: number = DEFAULT_GAME_CONFIG.fuzzyMatchThreshold
): {
  originalGuess: string;
  targetPhrase: string;
  validation: GuessValidation;
  analysis: {
    normalizedGuess: string;
    normalizedTarget: string;
    similarity: number;
    isMatch: boolean;
    threshold: number;
    passesThreshold: boolean;
  };
} => {
  const validation = validateGuessAgainstPhrase(guess, targetPhrase, threshold);
  
  return {
    originalGuess: guess,
    targetPhrase,
    validation,
    analysis: {
      normalizedGuess: validation.fuzzyMatchResult?.normalizedGuess ?? '',
      normalizedTarget: validation.fuzzyMatchResult?.normalizedTarget ?? '',
      similarity: validation.fuzzyMatchResult?.similarity ?? 0,
      isMatch: validation.fuzzyMatchResult?.isMatch ?? false,
      threshold,
      passesThreshold: (validation.fuzzyMatchResult?.similarity ?? 0) >= threshold,
    },
  };
};

/**
 * Tests the fuzzy matching system with a set of test cases
 */
export const runFuzzyMatchingTests = (): Array<{
  targetPhrase: string;
  testCases: Array<{
    guess: string;
    expectedMatch: boolean;
    actualResult: FuzzyMatchResult;
  }>;
}> => {
  const testSuites = [
    {
      targetPhrase: 'apple pie',
      testCases: [
        { guess: 'apple pie', expectedMatch: true },
        { guess: 'Apple Pie', expectedMatch: true },
        { guess: 'apple pies', expectedMatch: true },
        { guess: 'aple pie', expectedMatch: true }, // typo
        { guess: 'apple pi', expectedMatch: true }, // partial
        { guess: 'pie apple', expectedMatch: true }, // reversed
        { guess: 'banana bread', expectedMatch: false },
        { guess: 'apple', expectedMatch: false }, // too short
      ],
    },
    {
      targetPhrase: 'New York City',
      testCases: [
        { guess: 'new york city', expectedMatch: true },
        { guess: 'NYC', expectedMatch: false }, // abbreviation
        { guess: 'New York', expectedMatch: true }, // partial but close
        { guess: 'york city', expectedMatch: true },
        { guess: 'new york cty', expectedMatch: true }, // typo
        { guess: 'Los Angeles', expectedMatch: false },
      ],
    },
  ];

  return testSuites.map(suite => ({
    targetPhrase: suite.targetPhrase,
    testCases: suite.testCases.map(testCase => ({
      guess: testCase.guess,
      expectedMatch: testCase.expectedMatch,
      actualResult: fuzzyMatchGuess(testCase.guess, suite.targetPhrase),
    })),
  }));
};
