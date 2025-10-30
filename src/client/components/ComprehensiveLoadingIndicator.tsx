import React from 'react';
import { LoadingSpinner } from './LoadingScreen';
import { useEnhancedLoading } from '../hooks/useEnhancedLoading';

interface ComprehensiveLoadingIndicatorProps {
  className?: string;
  showOperationDetails?: boolean;
  maxOperationsToShow?: number;
}

export const ComprehensiveLoadingIndicator: React.FC<ComprehensiveLoadingIndicatorProps> = ({
  className = '',
  showOperationDetails = false,
  maxOperationsToShow = 3,
}) => {
  const { getAllLoadingStates, isAnyLoading, hasTimedOutOperations } = useEnhancedLoading();
  const loadingStates = getAllLoadingStates();

  if (!isAnyLoading) {
    return null;
  }

  const displayStates = loadingStates.slice(0, maxOperationsToShow);
  const hasMoreOperations = loadingStates.length > maxOperationsToShow;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="small" color="blue" />
          <span className="text-sm font-medium text-gray-900">
            {loadingStates.length === 1 ? 'Processing...' : `${loadingStates.length} operations running`}
          </span>
        </div>
        
        {hasTimedOutOperations && (
          <div className="flex items-center space-x-1 text-xs text-yellow-600">
            <span>⚠️</span>
            <span>Some operations taking longer</span>
          </div>
        )}
      </div>

      {showOperationDetails && (
        <div className="space-y-2">
          {displayStates.map((state) => (
            <div key={state.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 flex-1">
                <div className={`w-2 h-2 rounded-full ${
                  state.hasTimedOut ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500'
                }`} />
                <span className="text-gray-600 truncate">
                  {state.message}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 ml-2">
                {state.progress !== undefined && (
                  <div className="w-12 bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                )}
                <span className="text-gray-400 text-xs">
                  {Math.round((Date.now() - state.startTime) / 1000)}s
                </span>
              </div>
            </div>
          ))}
          
          {hasMoreOperations && (
            <div className="text-xs text-gray-500 text-center pt-1 border-t border-gray-100">
              +{loadingStates.length - maxOperationsToShow} more operations
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface LoadingStatusBadgeProps {
  operationId?: string;
  className?: string;
  size?: 'small' | 'medium';
}

export const LoadingStatusBadge: React.FC<LoadingStatusBadgeProps> = ({
  operationId,
  className = '',
  size = 'small',
}) => {
  const { getLoadingState, isAnyLoading, hasTimedOutOperations } = useEnhancedLoading();
  
  const state = operationId ? getLoadingState(operationId) : null;
  const showBadge = operationId ? !!state : isAnyLoading;
  
  if (!showBadge) {
    return null;
  }

  const isTimedOut = operationId ? state?.hasTimedOut : hasTimedOutOperations;
  const sizeClasses = size === 'small' ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm';

  return (
    <div className={`inline-flex items-center space-x-1 rounded-full ${sizeClasses} ${
      isTimedOut 
        ? 'bg-yellow-100 text-yellow-800' 
        : 'bg-blue-100 text-blue-800'
    } ${className}`}>
      <LoadingSpinner 
        size={size === 'small' ? 'small' : 'medium'} 
        color={isTimedOut ? 'red' : 'blue'} 
      />
      <span>
        {isTimedOut ? 'Slow' : 'Loading'}
      </span>
    </div>
  );
};

interface StartupLoadingScreenProps {
  progress?: number;
  currentStep?: string;
  tips?: string[];
}

export const StartupLoadingScreen: React.FC<StartupLoadingScreenProps> = ({
  progress,
  currentStep = 'Initializing...',
  tips = [
    '🎭 Welcome to Emojirades!',
    '👥 Invite friends to play together',
    '⏱️ Quick 2-minute rounds',
    '🏆 Compete for the highest score',
  ],
}) => {
  const [currentTipIndex, setCurrentTipIndex] = React.useState(0);

  React.useEffect(() => {
    if (tips.length > 1) {
      const interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [tips.length]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center z-50">
      <div className="text-center max-w-sm mx-4">
        {/* Animated Logo */}
        <div className="relative mb-8">
          <div className="text-6xl animate-bounce">🎭</div>
          <div className="absolute -top-2 -right-2 text-2xl animate-spin">✨</div>
        </div>
        
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Emojirades</h1>
        <p className="text-gray-600 mb-8">Setting up your game...</p>
        
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-center mb-3">
            <LoadingSpinner size="large" color="blue" />
          </div>
          
          <p className="text-lg text-gray-700 mb-4">{currentStep}</p>
          
          {progress !== undefined && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
          )}
        </div>
        
        {/* Rotating Tips */}
        <div className="bg-white bg-opacity-80 rounded-lg p-4 border border-gray-200 min-h-[60px] flex items-center justify-center">
          <p className="text-sm text-gray-600 transition-opacity duration-300">
            {tips[currentTipIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};

interface JoinGameLoadingProps {
  className?: string;
}

export const JoinGameLoading: React.FC<JoinGameLoadingProps> = ({
  className = '',
}) => {
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <LoadingSpinner size="small" color="blue" />
      <span className="text-blue-600 font-medium">
        Joining game{dots}
      </span>
    </div>
  );
};

interface StartGameLoadingProps {
  className?: string;
}

export const StartGameLoading: React.FC<StartGameLoadingProps> = ({
  className = '',
}) => {
  const [message, setMessage] = React.useState('Preparing game...');

  React.useEffect(() => {
    const messages = [
      'Preparing game...',
      'Setting up rounds...',
      'Almost ready...',
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setMessage(messages[index] || 'Loading...');
    }, 1500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <LoadingSpinner size="small" color="green" />
      <span className="text-green-600 font-medium">
        {message}
      </span>
    </div>
  );
};
