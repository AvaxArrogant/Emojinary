import React from 'react';
import { GameProvider } from './contexts/GameContext';
import { GameApp } from './components/GameApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastNotification';

export const App = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <GameProvider>
          <GameApp />
        </GameProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};
