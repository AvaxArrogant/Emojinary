import type { Phrase, PhraseDifficulty } from '../types/game.js';
import { GAME_CONSTANTS } from './constants.js';
import { getRandomItem } from './helpers.js';
import phrasesData from '../data/phrases.json';

// ============================================================================
// PHRASE TYPES AND INTERFACES
// ============================================================================

export type PhraseCategory = typeof GAME_CONSTANTS.PHRASE_CATEGORIES[number];

export type PhraseData = {
  id: string;
  text: string;
  difficulty: PhraseDifficulty;
  hints?: string[];
};

export type PhrasesDatabase = Record<PhraseCategory, PhraseData[]>;

export type PhraseSelectionOptions = {
  categories?: PhraseCategory[];
  difficulties?: PhraseDifficulty[];
  excludeIds?: string[];
  maxRepeats?: number;
};

export type SessionPhraseTracker = {
  gameId: string;
  usedPhraseIds: Set<string>;
  categoryUsageCount: Record<PhraseCategory, number>;
  difficultyUsageCount: Record<PhraseDifficulty, number>;
  createdAt: number;
  lastUsed: number;
};

// ============================================================================
// PHRASE DATABASE MANAGEMENT
// ============================================================================

/**
 * Get the complete phrases database
 */
export const getPhrasesDatabase = (): PhrasesDatabase => {
  return phrasesData as PhrasesDatabase;
};

/**
 * Get all available phrase categories
 */
export const getPhraseCategories = (): PhraseCategory[] => {
  return [...GAME_CONSTANTS.PHRASE_CATEGORIES];
};

/**
 * Get phrases from specific categories
 */
export const getPhrasesByCategory = (categories: PhraseCategory[]): PhraseData[] => {
  const database = getPhrasesDatabase();
  const phrases: PhraseData[] = [];
  
  for (const category of categories) {
    if (database[category]) {
      phrases.push(...database[category]);
    }
  }
  
  return phrases;
};

/**
 * Get phrases by difficulty level
 */
export const getPhrasesByDifficulty = (difficulties: PhraseDifficulty[]): PhraseData[] => {
  const database = getPhrasesDatabase();
  const phrases: PhraseData[] = [];
  
  for (const category of getPhraseCategories()) {
    const categoryPhrases = database[category] || [];
    const filteredPhrases = categoryPhrases.filter(phrase => 
      difficulties.includes(phrase.difficulty)
    );
    phrases.push(...filteredPhrases);
  }
  
  return phrases;
};

/**
 * Get a specific phrase by ID
 */
export const getPhraseById = (phraseId: string): PhraseData | null => {
  const database = getPhrasesDatabase();
  
  for (const category of getPhraseCategories()) {
    const categoryPhrases = database[category] || [];
    const phrase = categoryPhrases.find(p => p.id === phraseId);
    if (phrase) {
      return phrase;
    }
  }
  
  return null;
};

/**
 * Search phrases by text content
 */
export const searchPhrases = (query: string, options?: PhraseSelectionOptions): PhraseData[] => {
  const database = getPhrasesDatabase();
  const searchTerm = query.toLowerCase().trim();
  const phrases: PhraseData[] = [];
  
  const categoriesToSearch = options?.categories || getPhraseCategories();
  const difficultiesToInclude = options?.difficulties || ['easy', 'medium', 'hard'];
  const excludeIds = new Set(options?.excludeIds || []);
  
  for (const category of categoriesToSearch) {
    const categoryPhrases = database[category] || [];
    const matchingPhrases = categoryPhrases.filter(phrase => {
      // Skip excluded phrases
      if (excludeIds.has(phrase.id)) return false;
      
      // Filter by difficulty
      if (!difficultiesToInclude.includes(phrase.difficulty)) return false;
      
      // Check text match
      const textMatch = phrase.text.toLowerCase().includes(searchTerm);
      
      // Check hints match
      const hintsMatch = phrase.hints?.some(hint => 
        hint.toLowerCase().includes(searchTerm)
      ) || false;
      
      return textMatch || hintsMatch;
    });
    
    phrases.push(...matchingPhrases);
  }
  
  return phrases;
};

// ============================================================================
// SESSION PHRASE TRACKING
// ============================================================================

/**
 * Create a new session phrase tracker
 */
export const createSessionTracker = (gameId: string): SessionPhraseTracker => {
  return {
    gameId,
    usedPhraseIds: new Set(),
    categoryUsageCount: {
      movies: 0,
      books: 0,
      songs: 0,
      animals: 0,
      food: 0,
      places: 0,
      activities: 0,
    },
    difficultyUsageCount: {
      easy: 0,
      medium: 0,
      hard: 0,
    },
    createdAt: Date.now(),
    lastUsed: Date.now(),
  };
};

/**
 * Mark a phrase as used in the session
 */
export const markPhraseAsUsed = (
  tracker: SessionPhraseTracker, 
  phraseId: string, 
  category: PhraseCategory, 
  difficulty: PhraseDifficulty
): SessionPhraseTracker => {
  const updatedTracker = { ...tracker };
  
  updatedTracker.usedPhraseIds.add(phraseId);
  updatedTracker.categoryUsageCount[category]++;
  updatedTracker.difficultyUsageCount[difficulty]++;
  updatedTracker.lastUsed = Date.now();
  
  return updatedTracker;
};

/**
 * Check if a phrase has been used in the session
 */
export const isPhraseUsed = (tracker: SessionPhraseTracker, phraseId: string): boolean => {
  return tracker.usedPhraseIds.has(phraseId);
};

/**
 * Get usage statistics for the session
 */
export const getSessionStats = (tracker: SessionPhraseTracker) => {
  return {
    totalPhrasesUsed: tracker.usedPhraseIds.size,
    categoryUsage: { ...tracker.categoryUsageCount },
    difficultyUsage: { ...tracker.difficultyUsageCount },
    sessionDuration: Date.now() - tracker.createdAt,
    lastActivity: Date.now() - tracker.lastUsed,
  };
};

// ============================================================================
// PHRASE SELECTION ALGORITHMS
// ============================================================================

/**
 * Select a random phrase with smart balancing to avoid repeats
 */
export const selectRandomPhrase = (
  tracker: SessionPhraseTracker,
  options?: PhraseSelectionOptions
): PhraseData | null => {
  const database = getPhrasesDatabase();
  const categoriesToUse = options?.categories || getPhraseCategories();
  const difficultiesToUse = options?.difficulties || ['easy', 'medium', 'hard'];
  const maxRepeats = options?.maxRepeats || 0;
  
  // Get all available phrases
  let availablePhrases: PhraseData[] = [];
  
  for (const category of categoriesToUse) {
    const categoryPhrases = database[category] || [];
    const filteredPhrases = categoryPhrases.filter(phrase => {
      // Filter by difficulty
      if (!difficultiesToUse.includes(phrase.difficulty)) return false;
      
      // Skip if already used and we don't allow repeats
      if (maxRepeats === 0 && isPhraseUsed(tracker, phrase.id)) return false;
      
      return true;
    });
    
    availablePhrases.push(...filteredPhrases);
  }
  
  // If no phrases available, return null
  if (availablePhrases.length === 0) {
    return null;
  }
  
  // Apply smart balancing - prefer less used categories and difficulties
  const balancedPhrases = applySmartBalancing(availablePhrases, tracker);
  
  // Select random phrase from balanced set
  return getRandomItem(balancedPhrases);
};

/**
 * Apply smart balancing to phrase selection
 */
const applySmartBalancing = (
  phrases: PhraseData[], 
  tracker: SessionPhraseTracker
): PhraseData[] => {
  if (phrases.length === 0) return phrases;
  
  // Group phrases by category and difficulty
  const categoryGroups: Record<string, PhraseData[]> = {};
  const difficultyGroups: Record<string, PhraseData[]> = {};
  
  for (const phrase of phrases) {
    // Group by category
    if (!categoryGroups[phrase.id.split('_')[0] || '']) {
      categoryGroups[phrase.id.split('_')[0] || ''] = [];
    }
    categoryGroups[phrase.id.split('_')[0] || '']?.push(phrase);
    
    // Group by difficulty
    if (!difficultyGroups[phrase.difficulty]) {
      difficultyGroups[phrase.difficulty] = [];
    }
    difficultyGroups[phrase.difficulty]?.push(phrase);
  }
  
  // Find least used category
  const categoryUsage = tracker.categoryUsageCount;
  const leastUsedCategoryCount = Math.min(...Object.values(categoryUsage));
  const leastUsedCategories = Object.entries(categoryUsage)
    .filter(([_, count]) => count === leastUsedCategoryCount)
    .map(([category, _]) => category);
  
  // Find least used difficulty
  const difficultyUsage = tracker.difficultyUsageCount;
  const leastUsedDifficultyCount = Math.min(...Object.values(difficultyUsage));
  const leastUsedDifficulties = Object.entries(difficultyUsage)
    .filter(([_, count]) => count === leastUsedDifficultyCount)
    .map(([difficulty, _]) => difficulty as PhraseDifficulty);
  
  // Prefer phrases from least used categories and difficulties
  const preferredPhrases = phrases.filter(phrase => {
    const phraseCategory = phrase.id.split('_')[0] || '';
    const categoryMatch = leastUsedCategories.some(cat => phraseCategory.startsWith(cat));
    const difficultyMatch = leastUsedDifficulties.includes(phrase.difficulty);
    
    return categoryMatch || difficultyMatch;
  });
  
  // Return preferred phrases if available, otherwise return all
  return preferredPhrases.length > 0 ? preferredPhrases : phrases;
};

/**
 * Select multiple unique phrases for a game session
 */
export const selectMultiplePhrases = (
  tracker: SessionPhraseTracker,
  count: number,
  options?: PhraseSelectionOptions
): PhraseData[] => {
  const selectedPhrases: PhraseData[] = [];
  const tempTracker = { ...tracker };
  
  for (let i = 0; i < count; i++) {
    const phrase = selectRandomPhrase(tempTracker, {
      ...options,
      excludeIds: [...(options?.excludeIds || []), ...selectedPhrases.map(p => p.id)]
    });
    
    if (!phrase) break; // No more phrases available
    
    selectedPhrases.push(phrase);
    
    // Update temp tracker to avoid selecting the same phrase again
    const category = phrase.id.split('_')[0] as PhraseCategory;
    markPhraseAsUsed(tempTracker, phrase.id, category, phrase.difficulty);
  }
  
  return selectedPhrases;
};

/**
 * Get phrase recommendations based on session history
 */
export const getRecommendedPhrases = (
  tracker: SessionPhraseTracker,
  count: number = 5
): PhraseData[] => {
  // Recommend phrases from least used categories and difficulties
  const stats = getSessionStats(tracker);
  
  // Find categories with lowest usage
  const sortedCategories = Object.entries(stats.categoryUsage)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([category]) => category as PhraseCategory);
  
  // Find difficulties with lowest usage
  const sortedDifficulties = Object.entries(stats.difficultyUsage)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 2)
    .map(([difficulty]) => difficulty as PhraseDifficulty);
  
  return selectMultiplePhrases(tracker, count, {
    categories: sortedCategories,
    difficulties: sortedDifficulties,
  });
};

/**
 * Reset session tracker (clear used phrases)
 */
export const resetSessionTracker = (tracker: SessionPhraseTracker): SessionPhraseTracker => {
  return {
    ...tracker,
    usedPhraseIds: new Set(),
    categoryUsageCount: {
      movies: 0,
      books: 0,
      songs: 0,
      animals: 0,
      food: 0,
      places: 0,
      activities: 0,
    },
    difficultyUsageCount: {
      easy: 0,
      medium: 0,
      hard: 0,
    },
    lastUsed: Date.now(),
  };
};

/**
 * Convert PhraseData to Phrase (game type)
 */
export const convertToGamePhrase = (phraseData: PhraseData, category: PhraseCategory): Phrase => {
  const phrase: Phrase = {
    id: phraseData.id,
    text: phraseData.text,
    category,
    difficulty: phraseData.difficulty,
  };
  
  if (phraseData.hints) {
    phrase.hints = phraseData.hints;
  }
  
  return phrase;
};

/**
 * Get category from phrase ID
 */
export const getCategoryFromPhraseId = (phraseId: string): PhraseCategory | null => {
  const prefix = phraseId.split('_')[0];
  
  const categoryMap: Record<string, PhraseCategory> = {
    'mov': 'movies',
    'book': 'books',
    'song': 'songs',
    'animal': 'animals',
    'food': 'food',
    'place': 'places',
    'activity': 'activities',
  };
  
  return categoryMap[prefix || ''] || null;
};

/**
 * Validate phrase data structure
 */
export const validatePhraseData = (phraseData: any): phraseData is PhraseData => {
  return (
    typeof phraseData === 'object' &&
    typeof phraseData.id === 'string' &&
    typeof phraseData.text === 'string' &&
    ['easy', 'medium', 'hard'].includes(phraseData.difficulty) &&
    (phraseData.hints === undefined || Array.isArray(phraseData.hints))
  );
};

/**
 * Get total phrase count across all categories
 */
export const getTotalPhraseCount = (): number => {
  const database = getPhrasesDatabase();
  let total = 0;
  
  for (const category of getPhraseCategories()) {
    total += database[category]?.length || 0;
  }
  
  return total;
};

/**
 * Get phrase count by category
 */
export const getPhraseCounts = (): Record<PhraseCategory, number> => {
  const database = getPhrasesDatabase();
  const counts: Record<PhraseCategory, number> = {} as Record<PhraseCategory, number>;
  
  for (const category of getPhraseCategories()) {
    counts[category] = database[category]?.length || 0;
  }
  
  return counts;
};
