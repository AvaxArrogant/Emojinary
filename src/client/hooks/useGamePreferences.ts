import { useState, useEffect, useCallback } from 'react';

interface GamePreferences {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  autoScrollGuesses: boolean;
  showTimerWarnings: boolean;
  preferredEmojiSkin: string;
  recentEmojis: string[];
}

const DEFAULT_PREFERENCES: GamePreferences = {
  soundEnabled: true,
  notificationsEnabled: true,
  autoScrollGuesses: true,
  showTimerWarnings: true,
  preferredEmojiSkin: 'default',
  recentEmojis: [],
};

const STORAGE_KEY = 'emojirades-preferences';
const MAX_RECENT_EMOJIS = 20;

/**
 * Custom hook for managing user preferences and local state
 */
export const useGamePreferences = () => {
  const [preferences, setPreferences] = useState<GamePreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        console.warn('Failed to save preferences:', error);
      }
    }
  }, [preferences, isLoaded]);

  const updatePreference = useCallback(<K extends keyof GamePreferences>(
    key: K,
    value: GamePreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleSound = useCallback(() => {
    updatePreference('soundEnabled', !preferences.soundEnabled);
  }, [preferences.soundEnabled, updatePreference]);

  const toggleNotifications = useCallback(() => {
    updatePreference('notificationsEnabled', !preferences.notificationsEnabled);
  }, [preferences.notificationsEnabled, updatePreference]);

  const toggleAutoScroll = useCallback(() => {
    updatePreference('autoScrollGuesses', !preferences.autoScrollGuesses);
  }, [preferences.autoScrollGuesses, updatePreference]);

  const toggleTimerWarnings = useCallback(() => {
    updatePreference('showTimerWarnings', !preferences.showTimerWarnings);
  }, [preferences.showTimerWarnings, updatePreference]);

  const addRecentEmoji = useCallback((emoji: string) => {
    setPreferences(prev => {
      const filtered = prev.recentEmojis.filter(e => e !== emoji);
      const updated = [emoji, ...filtered].slice(0, MAX_RECENT_EMOJIS);
      return { ...prev, recentEmojis: updated };
    });
  }, []);

  const clearRecentEmojis = useCallback(() => {
    updatePreference('recentEmojis', []);
  }, [updatePreference]);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return {
    preferences,
    isLoaded,
    updatePreference,
    toggleSound,
    toggleNotifications,
    toggleAutoScroll,
    toggleTimerWarnings,
    addRecentEmoji,
    clearRecentEmojis,
    resetPreferences,
  };
};

/**
 * Custom hook for managing UI state (modals, panels, etc.)
 */
export const useGameUI = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const openModal = useCallback((modalId: string) => {
    setActiveModal(modalId);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const toggleSettings = useCallback(() => {
    setSettingsOpen(prev => !prev);
  }, []);

  const toggleLeaderboard = useCallback(() => {
    setLeaderboardOpen(prev => !prev);
  }, []);

  const closeAllPanels = useCallback(() => {
    setSidebarOpen(false);
    setSettingsOpen(false);
    setLeaderboardOpen(false);
    setActiveModal(null);
  }, []);

  return {
    activeModal,
    sidebarOpen,
    settingsOpen,
    leaderboardOpen,
    openModal,
    closeModal,
    toggleSidebar,
    toggleSettings,
    toggleLeaderboard,
    closeAllPanels,
  };
};

/**
 * Custom hook for managing keyboard shortcuts
 */
export const useGameKeyboard = () => {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setPressedKeys(prev => new Set([...prev, event.key.toLowerCase()]));
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(event.key.toLowerCase());
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const isPressed = useCallback((key: string) => {
    return pressedKeys.has(key.toLowerCase());
  }, [pressedKeys]);

  const isComboPressed = useCallback((keys: string[]) => {
    return keys.every(key => pressedKeys.has(key.toLowerCase()));
  }, [pressedKeys]);

  return {
    pressedKeys,
    isPressed,
    isComboPressed,
  };
};
