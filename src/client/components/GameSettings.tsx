import React, { useState, useEffect } from 'react';
import { useSoundEffects } from '../utils/soundEffects';

interface GameSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GameSettings: React.FC<GameSettingsProps> = ({ isOpen, onClose }) => {
  const { toggle, setVolume, isEnabled, getVolume, play } = useSoundEffects();
  const [soundEnabled, setSoundEnabled] = useState(isEnabled());
  const [volume, setVolumeState] = useState(getVolume());
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  useEffect(() => {
    // Load animation preference from localStorage
    const savedAnimations = localStorage.getItem('emojirades-animations-enabled');
    setAnimationsEnabled(savedAnimations !== null ? savedAnimations === 'true' : true);
  }, []);

  const handleSoundToggle = () => {
    const newState = toggle();
    setSoundEnabled(newState);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setVolumeState(newVolume);
    // Play test sound
    setTimeout(() => play('notification'), 100);
  };

  const handleAnimationsToggle = () => {
    const newState = !animationsEnabled;
    setAnimationsEnabled(newState);
    localStorage.setItem('emojirades-animations-enabled', newState.toString());
    
    // Apply/remove animation classes to body
    if (newState) {
      document.body.classList.remove('animations-disabled');
    } else {
      document.body.classList.add('animations-disabled');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white rounded-t-xl border-b border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Game Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
              aria-label="Close settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 pt-4">

          <div className="space-y-6">
            {/* Sound Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">🔊</span>
                Sound Effects
              </h3>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Enable Sound</span>
                <button
                  onClick={handleSoundToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    soundEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {soundEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Volume</span>
                    <span className="text-sm text-gray-500">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <button
                    onClick={() => play('notification')}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Test Sound
                  </button>
                </div>
              )}
            </div>

            {/* Animation Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">✨</span>
                Visual Effects
              </h3>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Enable Animations</span>
                <button
                  onClick={handleAnimationsToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    animationsEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      animationsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <p className="text-sm text-gray-500">
                Disable animations to improve performance on slower devices
              </p>
            </div>

            {/* Reset Game */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">🔄</span>
                Reset Game
              </h3>
              
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Reset the game to start fresh from the lobby. This will clear all current game progress.
                </p>
                
                <button
                  onClick={async () => {
                    if (confirm('Reset game and return to lobby? This will clear all progress and you will need to rejoin.')) {
                      try {
                        // Try to reset via API first
                        const response = await fetch('/api/emergency/reset-game', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        
                        if (response.ok) {
                          console.log('Game reset via API');
                        } else {
                          console.warn('API reset failed, using local reset');
                        }
                      } catch (error) {
                        console.warn('API reset failed, using local reset:', error);
                      }
                      
                      // Clear local storage and reload
                      localStorage.clear();
                      sessionStorage.clear();
                      
                      // Close settings first
                      onClose();
                      
                      // Small delay then reload
                      setTimeout(() => {
                        window.location.reload();
                      }, 100);
                    }
                  }}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  🔄 Reset to Lobby
                </button>
              </div>
            </div>

            {/* Game Info */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">ℹ️</span>
                About
              </h3>
              
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Emojirades</strong> - A multiplayer guessing game</p>
                <p>Version 1.0.0</p>
                <p>Built with ❤️ for Reddit</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onClose}
              className="btn-mobile bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// CSS for slider styling
const sliderStyles = `
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.animations-disabled * {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = sliderStyles;
  document.head.appendChild(styleSheet);
}
