// ============================================================================
// FUZZY MATCHING SYSTEM
// ============================================================================

import Fuse from 'fuse.js';
import { DEFAULT_GAME_CONFIG } from '../types/game.js';

// ============================================================================
// TYPES
// ============================================================================

export type FuzzyMatchResult = {
  isMatch: boolean;
  similarity: number;
  normalizedGuess: string;
  normalizedTarget: string;
};

export type FuzzyMatchOptions = {
  threshold: number;
  includeScore: boolean;
  ignoreLocation: boolean;
  ignoreFieldNorm: boolean;
  minMatchCharLength: number;
};

// ============================================================================
// STRING NORMALIZATION AND PREPROCESSING
// ============================================================================

/**
 * Normalizes a string for fuzzy matching by:
 * - Converting to lowercase
 * - Removing extra whitespace
 * - Removing common punctuation
 * - Handling common word variations
 */
export const normalizeString = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let normalized = input.toLowerCase().trim();

  // Remove common punctuation but keep apostrophes for contractions
  normalized = normalized.replace(/[.,!?;:"()[\]{}]/g, '');

  // Normalize whitespace (multiple spaces to single space)
  normalized = normalized.replace(/\s+/g, ' ');

  // Handle common contractions and variations
  const contractions: Record<string, string> = {
    "don't": 'do not',
    "won't": 'will not',
    "can't": 'cannot',
    "isn't": 'is not',
    "aren't": 'are not',
    "wasn't": 'was not',
    "weren't": 'were not',
    "hasn't": 'has not',
    "haven't": 'have not',
    "hadn't": 'had not',
    "doesn't": 'does not',
    "didn't": 'did not',
    "shouldn't": 'should not',
    "wouldn't": 'would not',
    "couldn't": 'could not',
    "mustn't": 'must not',
    "needn't": 'need not',
    "daren't": 'dare not',
    "mayn't": 'may not',
    "shan't": 'shall not',
    "i'm": 'i am',
    "you're": 'you are',
    "he's": 'he is',
    "she's": 'she is',
    "it's": 'it is',
    "we're": 'we are',
    "they're": 'they are',
    "i've": 'i have',
    "you've": 'you have',
    "we've": 'we have',
    "they've": 'they have',
    "i'll": 'i will',
    "you'll": 'you will',
    "he'll": 'he will',
    "she'll": 'she will',
    "it'll": 'it will',
    "we'll": 'we will',
    "they'll": 'they will',
    "i'd": 'i would',
    "you'd": 'you would',
    "he'd": 'he would',
    "she'd": 'she would',
    "it'd": 'it would',
    "we'd": 'we would',
    "they'd": 'they would',
  };

  // Apply contractions
  for (const [contraction, expansion] of Object.entries(contractions)) {
    const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
    normalized = normalized.replace(regex, expansion);
  }

  // Handle common word variations and synonyms
  const synonyms: Record<string, string> = {
    'automobile': 'car',
    'vehicle': 'car',
    'cellphone': 'phone',
    'smartphone': 'phone',
    'mobile': 'phone',
    'television': 'tv',
    'telly': 'tv',
    'computer': 'pc',
    'laptop': 'computer',
    'desktop': 'computer',
    'movie': 'film',
    'picture': 'photo',
    'photograph': 'photo',
    'image': 'photo',
    'house': 'home',
    'residence': 'home',
    'dwelling': 'home',
    'bicycle': 'bike',
    'motorbike': 'motorcycle',
    'aeroplane': 'airplane',
    'aircraft': 'airplane',
    'plane': 'airplane',
  };

  // Apply synonyms (word boundaries to avoid partial matches)
  for (const [synonym, canonical] of Object.entries(synonyms)) {
    const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
    normalized = normalized.replace(regex, canonical);
  }

  // Remove articles and common words that don't add meaning
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const words = normalized.split(' ');
  const filteredWords = words.filter(word => !stopWords.includes(word) || words.length <= 2);
  
  return filteredWords.join(' ').trim();
};

/**
 * Preprocesses text for fuzzy matching by applying multiple normalization steps
 */
export const preprocessForMatching = (text: string): string => {
  const normalized = normalizeString(text);
  
  // Additional preprocessing for better matching
  let processed = normalized;
  
  // Handle plural forms
  processed = processed.replace(/\b(\w+)s\b/g, (match, word) => {
    // Don't remove 's' from words that are naturally plural or end in 'ss'
    if (word.endsWith('s') || word.length < 3) {
      return match;
    }
    return word;
  });
  
  // Handle past tense forms
  processed = processed.replace(/\b(\w+)ed\b/g, (match, word) => {
    if (word.length < 3) {
      return match;
    }
    return word;
  });
  
  // Handle -ing forms
  processed = processed.replace(/\b(\w+)ing\b/g, (match, word) => {
    if (word.length < 3) {
      return match;
    }
    return word;
  });
  
  return processed.trim();
};

// ============================================================================
// FUZZY MATCHING IMPLEMENTATION
// ============================================================================

/**
 * Default options for Fuse.js fuzzy matching
 */
const DEFAULT_FUSE_OPTIONS: FuzzyMatchOptions = {
  threshold: 1 - DEFAULT_GAME_CONFIG.fuzzyMatchThreshold, // Fuse uses distance, we use similarity
  includeScore: true,
  ignoreLocation: true,
  ignoreFieldNorm: true,
  minMatchCharLength: 2,
};

/**
 * Validates a guess against a target phrase using fuzzy matching
 * Returns true if the similarity is above the configured threshold
 */
export const validateGuessWithFuzzyMatching = (
  guess: string,
  targetPhrase: string,
  threshold: number = DEFAULT_GAME_CONFIG.fuzzyMatchThreshold
): FuzzyMatchResult => {
  // Normalize both strings
  const normalizedGuess = preprocessForMatching(guess);
  const normalizedTarget = preprocessForMatching(targetPhrase);
  
  // Handle empty strings
  if (!normalizedGuess || !normalizedTarget) {
    return {
      isMatch: false,
      similarity: 0,
      normalizedGuess,
      normalizedTarget,
    };
  }
  
  // Exact match after normalization
  if (normalizedGuess === normalizedTarget) {
    return {
      isMatch: true,
      similarity: 1.0,
      normalizedGuess,
      normalizedTarget,
    };
  }
  
  // Use Fuse.js for fuzzy matching
  const fuse = new Fuse([normalizedTarget], {
    ...DEFAULT_FUSE_OPTIONS,
    threshold: 1 - threshold, // Convert similarity to distance
  });
  
  const results = fuse.search(normalizedGuess);
  
  if (results.length === 0) {
    return {
      isMatch: false,
      similarity: 0,
      normalizedGuess,
      normalizedTarget,
    };
  }
  
  // Fuse.js returns a score (distance), convert to similarity
  const fuseScore = results[0]?.score ?? 1;
  const similarity = 1 - fuseScore;
  
  return {
    isMatch: similarity >= threshold,
    similarity,
    normalizedGuess,
    normalizedTarget,
  };
};

/**
 * Alternative fuzzy matching using Levenshtein distance
 * Useful as a fallback or for comparison
 */
export const calculateLevenshteinSimilarity = (str1: string, str2: string): number => {
  const normalized1 = preprocessForMatching(str1);
  const normalized2 = preprocessForMatching(str2);
  
  if (normalized1 === normalized2) return 1.0;
  if (!normalized1 || !normalized2) return 0;
  
  const len1 = normalized1.length;
  const len2 = normalized2.length;
  
  if (len1 === 0) return len2 === 0 ? 1.0 : 0;
  if (len2 === 0) return 0;
  
  // Initialize matrix
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0]![j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = normalized1[i - 1] === normalized2[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,     // deletion
        matrix[i]![j - 1]! + 1,     // insertion
        matrix[i - 1]![j - 1]! + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1]![len2]!;
  const maxLength = Math.max(len1, len2);
  
  return 1 - (distance / maxLength);
};

/**
 * Validates a guess using Levenshtein distance as an alternative method
 */
export const validateGuessWithLevenshtein = (
  guess: string,
  targetPhrase: string,
  threshold: number = DEFAULT_GAME_CONFIG.fuzzyMatchThreshold
): FuzzyMatchResult => {
  const normalizedGuess = preprocessForMatching(guess);
  const normalizedTarget = preprocessForMatching(targetPhrase);
  
  const similarity = calculateLevenshteinSimilarity(guess, targetPhrase);
  
  return {
    isMatch: similarity >= threshold,
    similarity,
    normalizedGuess,
    normalizedTarget,
  };
};

/**
 * Main fuzzy matching function that combines multiple approaches
 * Uses Fuse.js as primary method with Levenshtein as fallback
 */
export const fuzzyMatchGuess = (
  guess: string,
  targetPhrase: string,
  threshold: number = DEFAULT_GAME_CONFIG.fuzzyMatchThreshold
): FuzzyMatchResult => {
  // Try Fuse.js first
  const fuseResult = validateGuessWithFuzzyMatching(guess, targetPhrase, threshold);
  
  // If Fuse.js gives a low score, try Levenshtein as fallback
  if (!fuseResult.isMatch && fuseResult.similarity < threshold * 0.7) {
    const levenshteinResult = validateGuessWithLevenshtein(guess, targetPhrase, threshold);
    
    // Use the better result
    if (levenshteinResult.similarity > fuseResult.similarity) {
      return levenshteinResult;
    }
  }
  
  return fuseResult;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Tests multiple guesses against a target phrase and returns results
 * Useful for debugging and testing the fuzzy matching system
 */
export const testFuzzyMatching = (
  targetPhrase: string,
  guesses: string[],
  threshold: number = DEFAULT_GAME_CONFIG.fuzzyMatchThreshold
): Array<{ guess: string; result: FuzzyMatchResult }> => {
  return guesses.map(guess => ({
    guess,
    result: fuzzyMatchGuess(guess, targetPhrase, threshold),
  }));
};

/**
 * Gets the best matching guess from a list of guesses
 */
export const getBestMatch = (
  targetPhrase: string,
  guesses: string[],
  threshold: number = DEFAULT_GAME_CONFIG.fuzzyMatchThreshold
): { guess: string; result: FuzzyMatchResult } | null => {
  let bestMatch: { guess: string; result: FuzzyMatchResult } | null = null;
  let bestSimilarity = 0;
  
  for (const guess of guesses) {
    const result = fuzzyMatchGuess(guess, targetPhrase, threshold);
    if (result.similarity > bestSimilarity) {
      bestSimilarity = result.similarity;
      bestMatch = { guess, result };
    }
  }
  
  return bestMatch && bestMatch.result.similarity >= threshold ? bestMatch : null;
};
