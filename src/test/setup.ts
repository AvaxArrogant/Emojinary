import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Redis for server tests
vi.mock('@devvit/web/server', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    hGet: vi.fn(),
    hSet: vi.fn(),
    hGetAll: vi.fn(),
    hgetall: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    exists: vi.fn(),
    zAdd: vi.fn(),
  },
  reddit: {
    getCurrentUsername: vi.fn(),
  },
  context: {},
}));

// Mock realtime manager
vi.mock('../server/core/realtimeManager', () => ({
  broadcastPlayerJoined: vi.fn(),
  broadcastGameStarted: vi.fn(),
  broadcastRoundStarted: vi.fn(),
  broadcastEmojisSubmitted: vi.fn(),
  broadcastGuessSubmitted: vi.fn(),
  broadcastRoundEnded: vi.fn(),
  startRoundTimer: vi.fn(),
  stopRoundTimer: vi.fn(),
}));

// Mock data manager
vi.mock('../server/core/dataManager', () => ({
  updatePlayerScore: vi.fn(),
  updateLeaderboard: vi.fn(),
  getAllPlayers: vi.fn().mockResolvedValue([
    { id: 'player_1', username: 'alice', score: 10, isActive: true },
    { id: 'player_2', username: 'bob', score: 5, isActive: true },
  ]),
}));

// Mock fetch for client tests
global.fetch = vi.fn();

// Mock window.location for client tests
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
  },
  writable: true,
});

// Mock Web Audio API
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    frequency: { setValueAtTime: vi.fn() },
    type: 'sine',
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1000000,
      jsHeapSizeLimit: 10000000,
    },
  },
});

// Mock navigator properties
Object.defineProperty(navigator, 'hardwareConcurrency', {
  writable: true,
  value: 4,
});

Object.defineProperty(navigator, 'deviceMemory', {
  writable: true,
  value: 8,
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));
