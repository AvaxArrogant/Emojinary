/**
 * Sound Effects System for Emojirades Game
 * Provides audio feedback with toggle functionality
 */

export type SoundType = 
  | 'correctGuess'
  | 'wrongGuess'
  | 'roundStart'
  | 'roundEnd'
  | 'gameStart'
  | 'gameEnd'
  | 'playerJoin'
  | 'timerWarning'
  | 'buttonClick'
  | 'emojiSelect'
  | 'notification'
  | 'presenterChange'
  | 'scoreUpdate'
  | 'connectionLost'
  | 'connectionRestored'
  | 'error'
  | 'success';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume?: number;
}

class SoundEffectsManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;

  constructor() {
    // Initialize audio context on first user interaction
    this.initializeAudioContext();
    
    // Load sound preferences from localStorage
    const savedEnabled = localStorage.getItem('emojirades-sound-enabled');
    const savedVolume = localStorage.getItem('emojirades-sound-volume');
    
    this.enabled = savedEnabled !== null ? savedEnabled === 'true' : true;
    this.volume = savedVolume !== null ? parseFloat(savedVolume) : 0.3;
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.audioContext = null;
    }
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
  }

  private getSoundConfig(type: SoundType): SoundConfig {
    const configs: Record<SoundType, SoundConfig> = {
      correctGuess: { frequency: 800, duration: 300, type: 'sine', volume: 0.4 },
      wrongGuess: { frequency: 200, duration: 200, type: 'sawtooth', volume: 0.2 },
      roundStart: { frequency: 600, duration: 150, type: 'triangle', volume: 0.3 },
      roundEnd: { frequency: 400, duration: 400, type: 'sine', volume: 0.3 },
      gameStart: { frequency: 880, duration: 500, type: 'sine', volume: 0.4 },
      gameEnd: { frequency: 660, duration: 800, type: 'triangle', volume: 0.4 },
      playerJoin: { frequency: 440, duration: 100, type: 'sine', volume: 0.2 },
      timerWarning: { frequency: 1000, duration: 100, type: 'square', volume: 0.3 },
      buttonClick: { frequency: 300, duration: 50, type: 'sine', volume: 0.1 },
      emojiSelect: { frequency: 500, duration: 80, type: 'triangle', volume: 0.15 },
      notification: { frequency: 700, duration: 200, type: 'sine', volume: 0.25 },
      presenterChange: { frequency: 750, duration: 250, type: 'triangle', volume: 0.3 },
      scoreUpdate: { frequency: 900, duration: 150, type: 'sine', volume: 0.2 },
      connectionLost: { frequency: 150, duration: 300, type: 'sawtooth', volume: 0.2 },
      connectionRestored: { frequency: 600, duration: 200, type: 'sine', volume: 0.3 },
      error: { frequency: 180, duration: 400, type: 'sawtooth', volume: 0.25 },
      success: { frequency: 1000, duration: 300, type: 'sine', volume: 0.3 }
    };

    return configs[type];
  }

  private async playTone(config: SoundConfig) {
    if (!this.enabled || !this.audioContext) return;

    try {
      await this.ensureAudioContext();
      
      if (!this.audioContext) return;

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
      oscillator.type = config.type;

      const volume = (config.volume || 1) * this.volume;
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + config.duration / 1000);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + config.duration / 1000);
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  async play(type: SoundType) {
    const config = this.getSoundConfig(type);
    await this.playTone(config);
  }

  // Special compound sounds
  async playCorrectGuess() {
    if (!this.enabled) return;
    
    try {
      // Play a pleasant ascending tone sequence
      await this.play('correctGuess');
      setTimeout(() => this.playTone({ frequency: 1000, duration: 200, type: 'sine', volume: 0.3 }), 150);
      setTimeout(() => this.playTone({ frequency: 1200, duration: 200, type: 'sine', volume: 0.2 }), 300);
    } catch (error) {
      console.warn('Failed to play correct guess sound:', error);
    }
  }

  async playGameStart() {
    if (!this.enabled) return;
    
    try {
      // Play an exciting game start fanfare
      await this.play('gameStart');
      setTimeout(() => this.playTone({ frequency: 1100, duration: 300, type: 'triangle', volume: 0.3 }), 200);
      setTimeout(() => this.playTone({ frequency: 1320, duration: 400, type: 'sine', volume: 0.2 }), 400);
    } catch (error) {
      console.warn('Failed to play game start sound:', error);
    }
  }

  async playTimerWarning() {
    if (!this.enabled) return;
    
    try {
      // Play urgent beeping
      for (let i = 0; i < 3; i++) {
        setTimeout(() => this.play('timerWarning'), i * 200);
      }
    } catch (error) {
      console.warn('Failed to play timer warning sound:', error);
    }
  }

  async playPresenterChange() {
    if (!this.enabled) return;
    
    try {
      // Play a distinctive presenter change sound
      await this.play('presenterChange');
      setTimeout(() => this.playTone({ frequency: 900, duration: 200, type: 'triangle', volume: 0.25 }), 100);
    } catch (error) {
      console.warn('Failed to play presenter change sound:', error);
    }
  }

  async playScoreUpdate() {
    if (!this.enabled) return;
    
    try {
      // Play a quick score update chime
      await this.play('scoreUpdate');
    } catch (error) {
      console.warn('Failed to play score update sound:', error);
    }
  }

  async playConnectionLost() {
    if (!this.enabled) return;
    
    try {
      // Play a descending tone to indicate connection loss
      await this.play('connectionLost');
      setTimeout(() => this.playTone({ frequency: 120, duration: 200, type: 'sawtooth', volume: 0.15 }), 150);
    } catch (error) {
      console.warn('Failed to play connection lost sound:', error);
    }
  }

  async playConnectionRestored() {
    if (!this.enabled) return;
    
    try {
      // Play an ascending tone to indicate connection restored
      await this.play('connectionRestored');
      setTimeout(() => this.playTone({ frequency: 800, duration: 150, type: 'sine', volume: 0.2 }), 100);
    } catch (error) {
      console.warn('Failed to play connection restored sound:', error);
    }
  }

  // Settings management
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('emojirades-sound-enabled', this.enabled.toString());
    
    // Play a test sound when enabling
    if (this.enabled) {
      setTimeout(() => this.play('notification'), 100);
    }
    
    return this.enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('emojirades-sound-volume', this.volume.toString());
  }

  isEnabled() {
    return this.enabled;
  }

  getVolume() {
    return this.volume;
  }

  // Initialize audio context on user interaction
  async initialize() {
    await this.ensureAudioContext();
  }
}

// Export singleton instance
export const soundEffects = new SoundEffectsManager();

// Hook for React components
export const useSoundEffects = () => {
  return {
    playSound: soundEffects.play.bind(soundEffects),
    play: soundEffects.play.bind(soundEffects), // Alias for backward compatibility
    playCorrectGuess: soundEffects.playCorrectGuess.bind(soundEffects),
    playGameStart: soundEffects.playGameStart.bind(soundEffects),
    playTimerWarning: soundEffects.playTimerWarning.bind(soundEffects),
    playPresenterChange: soundEffects.playPresenterChange.bind(soundEffects),
    playScoreUpdate: soundEffects.playScoreUpdate.bind(soundEffects),
    playConnectionLost: soundEffects.playConnectionLost.bind(soundEffects),
    playConnectionRestored: soundEffects.playConnectionRestored.bind(soundEffects),
    toggle: soundEffects.toggle.bind(soundEffects),
    setVolume: soundEffects.setVolume.bind(soundEffects),
    isEnabled: soundEffects.isEnabled.bind(soundEffects),
    getVolume: soundEffects.getVolume.bind(soundEffects),
    initialize: soundEffects.initialize.bind(soundEffects)
  };
};
