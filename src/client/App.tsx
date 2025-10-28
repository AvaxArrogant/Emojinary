import React from 'react';
import { GameProvider } from './contexts/GameContext';
import { GameApp } from './components/GameApp';

export const App = () => {
  return (
    <GameProvider>
      <GameApp />
    </GameProvider>
  );
};
