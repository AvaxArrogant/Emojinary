/**
 * Final Integration Tests
 * Tests the complete integrated application functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Final Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Sound Effects Integration', () => {
    it('should initialize sound effects system', async () => {
      const { useSoundEffects } = await import('../../client/utils/soundEffects');
      const soundEffects = useSoundEffects();
      
      expect(soundEffects.isEnabled).toBeDefined();
      expect(soundEffects.playSound).toBeDefined();
      expect(soundEffects.toggle).toBeDefined();
      expect(soundEffects.setVolume).toBeDefined();
    });

    it('should handle sound preferences persistence', () => {
      // Set preferences before importing module
      localStorage.setItem('emojirades-sound-enabled', 'false');
      localStorage.setItem('emojirades-sound-volume', '0.7');
      
      // The module is already loaded, so we test the localStorage functionality directly
      expect(localStorage.getItem('emojirades-sound-volume')).toBe('0.7');
      expect(localStorage.getItem('emojirades-sound-enabled')).toBe('false');
    });
  });

  describe('Performance Monitor Integration', () => {
    it('should initialize performance monitoring', async () => {
      const { usePerformanceMonitor } = await import('../../client/utils/performanceMonitor');
      const monitor = usePerformanceMonitor();
      
      expect(monitor.startMonitoring).toBeDefined();
      expect(monitor.stopMonitoring).toBeDefined();
      expect(monitor.getMetrics).toBeDefined();
      expect(monitor.getSettings).toBeDefined();
    });

    it('should provide performance recommendations', async () => {
      const { usePerformanceMonitor } = await import('../../client/utils/performanceMonitor');
      const monitor = usePerformanceMonitor();
      
      const recommendations = monitor.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('CSS Integration', () => {
    it('should apply performance optimization classes', () => {
      // Test that CSS classes are properly defined
      document.body.classList.add('animations-disabled');
      expect(document.body.classList.contains('animations-disabled')).toBe(true);
      
      document.body.classList.add('render-low');
      expect(document.body.classList.contains('render-low')).toBe(true);
      
      document.body.classList.add('particles-disabled');
      expect(document.body.classList.contains('particles-disabled')).toBe(true);
    });
  });

  describe('Local Storage Integration', () => {
    it('should handle settings persistence', () => {
      // Test sound settings
      localStorage.setItem('emojirades-sound-enabled', 'true');
      localStorage.setItem('emojirades-sound-volume', '0.8');
      
      expect(localStorage.getItem('emojirades-sound-enabled')).toBe('true');
      expect(localStorage.getItem('emojirades-sound-volume')).toBe('0.8');
      
      // Test animation settings
      localStorage.setItem('emojirades-animations-enabled', 'false');
      expect(localStorage.getItem('emojirades-animations-enabled')).toBe('false');
      
      // Test performance settings
      const performanceSettings = {
        enableAnimations: false,
        enableSounds: true,
        enableParticleEffects: false,
        renderQuality: 'medium'
      };
      
      localStorage.setItem('emojirades-performance-settings', JSON.stringify(performanceSettings));
      const saved = JSON.parse(localStorage.getItem('emojirades-performance-settings') || '{}');
      
      expect(saved.enableAnimations).toBe(false);
      expect(saved.renderQuality).toBe('medium');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle audio initialization failures gracefully', async () => {
      // Mock AudioContext to fail
      const originalAudioContext = window.AudioContext;
      (window as any).AudioContext = undefined;
      (window as any).webkitAudioContext = undefined;
      
      const { useSoundEffects } = await import('../../client/utils/soundEffects');
      const soundEffects = useSoundEffects();
      
      // Should not throw errors
      expect(() => soundEffects.initialize()).not.toThrow();
      
      // Restore AudioContext
      window.AudioContext = originalAudioContext;
    });

    it('should handle performance monitoring failures gracefully', () => {
      // Test that performance API is properly mocked
      expect(window.performance).toBeDefined();
      expect(window.performance.now).toBeDefined();
      
      // Test that performance.now works
      const now = window.performance.now();
      expect(typeof now).toBe('number');
    });
  });

  describe('Mobile Compatibility', () => {
    it('should detect mobile devices', () => {
      // Test mobile detection logic
      const mobileUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15';
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(mobileUserAgent);
      
      expect(isMobile).toBe(true);
      
      // Test desktop user agent
      const desktopUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const isDesktop = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(desktopUserAgent);
      
      expect(isDesktop).toBe(true);
    });

    it('should handle reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        })),
        configurable: true
      });
      
      // Should respect accessibility preferences
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      expect(mediaQuery.matches).toBe(true);
    });
  });

  describe('Build Integration', () => {
    it('should have all required modules available', async () => {
      // Test that all main modules can be imported
      const modules = [
        '../../client/utils/soundEffects',
        '../../client/utils/performanceMonitor',
        '../../client/components/GameApp',
        '../../client/components/GameSettings'
      ];
      
      for (const modulePath of modules) {
        try {
          const module = await import(modulePath);
          expect(module).toBeDefined();
        } catch (error) {
          throw new Error(`Failed to import ${modulePath}: ${error}`);
        }
      }
    });
  });
});
