import React from 'react';

interface LoadingScreenProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  showSpinner?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...', 
  size = 'medium',
  showSpinner = true 
}) => {
  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-xl'
  };

  const spinnerSizes = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6', 
    large: 'w-8 h-8'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {showSpinner && (
        <div className={`${spinnerSizes[size]} mb-4`}>
          <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 w-full h-full"></div>
        </div>
      )}
      <p className={`${sizeClasses[size]} text-gray-600 text-center`}>
        {message}
      </p>
    </div>
  );
};

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'blue' | 'red' | 'green' | 'gray';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = 'blue' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-6 h-6 border-2',
    large: 'w-8 h-8 border-3'
  };

  const colorClasses = {
    blue: 'border-gray-300 border-t-blue-600',
    red: 'border-gray-300 border-t-red-600',
    green: 'border-gray-300 border-t-green-600',
    gray: 'border-gray-300 border-t-gray-600'
  };

  return (
    <div className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}></div>
  );
};
