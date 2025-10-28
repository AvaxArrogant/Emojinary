import React from 'react';
import { useRealtimeConnection } from '../hooks/useRealtime.js';

// ============================================================================
// CONNECTION STATUS COMPONENT
// ============================================================================

interface ConnectionStatusProps {
  gameId: string;
  username: string;
  className?: string;
}

export function ConnectionStatus({ gameId, username, className = '' }: ConnectionStatusProps) {
  const { isConnected } = useRealtimeConnection(gameId, username);

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
        title={isConnected ? 'Connected to real-time updates' : 'Disconnected from real-time updates'}
      />
      <span className={`${isConnected ? 'text-green-600' : 'text-red-600'}`}>
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}

// ============================================================================
// DETAILED CONNECTION STATUS COMPONENT
// ============================================================================

interface DetailedConnectionStatusProps {
  gameId: string;
  username: string;
  className?: string;
  showDetails?: boolean;
}

export function DetailedConnectionStatus({ 
  gameId, 
  username, 
  className = '',
  showDetails = false 
}: DetailedConnectionStatusProps) {
  const { isConnected, client } = useRealtimeConnection(gameId, username);

  if (!showDetails) {
    return <ConnectionStatus gameId={gameId} username={username} className={className} />;
  }

  return (
    <div className={`bg-gray-50 border rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">Connection Status</h4>
        <ConnectionStatus gameId={gameId} username={username} />
      </div>
      
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Game ID:</span>
          <span className="font-mono text-xs">{gameId}</span>
        </div>
        <div className="flex justify-between">
          <span>Username:</span>
          <span>{username}</span>
        </div>
        <div className="flex justify-between">
          <span>Real-time Events:</span>
          <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      {!isConnected && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Attempting to reconnect...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONNECTION INDICATOR COMPONENT
// ============================================================================

interface ConnectionIndicatorProps {
  gameId: string;
  username: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ConnectionIndicator({ 
  gameId, 
  username, 
  size = 'md',
  showLabel = true 
}: ConnectionIndicatorProps) {
  const { isConnected } = useRealtimeConnection(gameId, username);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`${sizeClasses[size]} rounded-full transition-colors duration-200 ${
          isConnected 
            ? 'bg-green-500 shadow-green-500/50 shadow-sm' 
            : 'bg-red-500 shadow-red-500/50 shadow-sm animate-pulse'
        }`}
        title={isConnected ? 'Connected to real-time updates' : 'Disconnected from real-time updates'}
      />
      {showLabel && (
        <span className={`${textSizeClasses[size]} font-medium ${
          isConnected ? 'text-green-600' : 'text-red-600'
        }`}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      )}
    </div>
  );
}
