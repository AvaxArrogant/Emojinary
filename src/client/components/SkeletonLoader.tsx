import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = false,
}) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${width} ${height} ${
        rounded ? 'rounded-full' : 'rounded'
      } ${className}`}
    />
  );
};

interface PlayerListSkeletonProps {
  count?: number;
  className?: string;
}

export const PlayerListSkeleton: React.FC<PlayerListSkeletonProps> = ({
  count = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex items-center mr-3">
              <SkeletonLoader
                width="w-3"
                height="h-3"
                rounded={true}
                className="mr-2"
              />
            </div>
            <div>
              <SkeletonLoader
                width="w-24"
                height="h-4"
                className="mb-1"
              />
              <SkeletonLoader
                width="w-16"
                height="h-3"
              />
            </div>
          </div>
          <div className="text-right">
            <SkeletonLoader
              width="w-12"
              height="h-4"
              className="mb-1"
            />
            <SkeletonLoader
              width="w-20"
              height="h-3"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

interface GameInfoSkeletonProps {
  className?: string;
}

export const GameInfoSkeleton: React.FC<GameInfoSkeletonProps> = ({
  className = '',
}) => {
  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonLoader width="w-16" height="h-4" />
          <SkeletonLoader width="w-24" height="h-6" />
        </div>
        <div className="flex items-center justify-between">
          <SkeletonLoader width="w-20" height="h-4" />
          <SkeletonLoader width="w-12" height="h-4" />
        </div>
        <div className="flex items-center justify-between">
          <SkeletonLoader width="w-24" height="h-4" />
          <SkeletonLoader width="w-16" height="h-4" />
        </div>
        <div className="flex items-center justify-between">
          <SkeletonLoader width="w-18" height="h-4" />
          <SkeletonLoader width="w-20" height="h-3" />
        </div>
      </div>
    </div>
  );
};

interface LoadingOverlayProps {
  message?: string;
  progress?: number | undefined;
  showProgress?: boolean;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading...',
  progress,
  showProgress = false,
  className = '',
}) => {
  return (
    <div className={`absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-lg ${className}`}>
      <div className="text-center max-w-xs">
        <div className="w-8 h-8 mb-3 mx-auto">
          <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 w-full h-full"></div>
        </div>
        <p className="text-sm text-gray-600 mb-2">{message}</p>
        
        {showProgress && progress !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, progress || 0))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface InitialLoadingScreenProps {
  message?: string;
  progress?: number | undefined;
  showProgress?: boolean;
  tips?: string[];
}

export const StartupLoadingScreen: React.FC<InitialLoadingScreenProps> = ({
  message = 'Loading Emojirades...',
  progress,
  showProgress = false,
  tips = [
    '🎭 Get ready to guess phrases from emoji clues!',
    '👥 Play with 2-8 players for maximum fun',
    '⏱️ Each round lasts 2 minutes',
    '🏆 First correct guess wins the round!',
  ],
}) => {
  const [currentTipIndex, setCurrentTipIndex] = React.useState(0);

  React.useEffect(() => {
    if (tips.length > 1) {
      const interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [tips.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Logo/Icon */}
        <div className="text-6xl mb-6 animate-bounce">🎭</div>
        
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Emojirades</h1>
        <p className="text-gray-600 mb-8">Loading your game experience...</p>
        
        {/* Loading Spinner */}
        <div className="w-12 h-12 mb-6 mx-auto">
          <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 w-full h-full"></div>
        </div>
        
        {/* Loading Message */}
        <p className="text-lg text-gray-700 mb-4">{message}</p>
        
        {/* Progress Bar */}
        {showProgress && progress !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, progress || 0))}%` }}
            />
          </div>
        )}
        
        {/* Rotating Tips */}
        {tips.length > 0 && (
          <div className="bg-white bg-opacity-70 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 transition-opacity duration-500">
              {tips[currentTipIndex]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface OperationLoadingIndicatorProps {
  operation: string;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  inline?: boolean;
  className?: string;
}

export const OperationLoadingIndicator: React.FC<OperationLoadingIndicatorProps> = ({
  operation,
  message,
  size = 'medium',
  inline = false,
  className = '',
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  };

  const containerClasses = inline
    ? 'inline-flex items-center space-x-2'
    : 'flex items-center justify-center space-x-2';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`} />
      <span className={`text-gray-600 ${textSizeClasses[size]}`}>
        {message || `${operation}...`}
      </span>
    </div>
  );
};

export const JoinGameLoading: React.FC<{ className?: string }> = ({
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
      <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 w-4 h-4" />
      <span className="text-blue-600 font-medium">
        Joining game{dots}
      </span>
    </div>
  );
};

export const StartGameLoading: React.FC<{ className?: string }> = ({
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
      <div className="animate-spin rounded-full border-2 border-gray-300 border-t-green-600 w-4 h-4" />
      <span className="text-green-600 font-medium">
        {message}
      </span>
    </div>
  );
};
