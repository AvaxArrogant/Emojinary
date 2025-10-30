import React, { useState, useEffect } from 'react';
import { useConnectionState } from '../utils/connectionManager';
import { LoadingSpinner } from './LoadingScreen';

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'offline';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  inline?: boolean;
}

export const EnhancedConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className = '',
  showDetails = false,
  size = 'medium',
  inline = false,
}) => {
  const { 
    isOnline, 
    isConnected, 
    connectionQuality, 
    reconnectAttempts,
    shouldReconnect,
    reconnectDelay 
  } = useConnectionState();
  
  const [latency, setLatency] = useState<number | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Test connection latency periodically
  useEffect(() => {
    const testLatency = async () => {
      if (!isConnected || isTestingConnection) return;
      
      setIsTestingConnection(true);
      const start = performance.now();
      
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok) {
          const end = performance.now();
          setLatency(Math.round(end - start));
        }
      } catch (error) {
        setLatency(null);
      } finally {
        setIsTestingConnection(false);
      }
    };

    // Test immediately if connected
    if (isConnected) {
      testLatency();
    }

    // Test every 30 seconds
    const interval = setInterval(testLatency, 30000);
    return () => clearInterval(interval);
  }, [isConnected, isTestingConnection]);

  const getConnectionQualityFromLatency = (): ConnectionQuality => {
    if (!isOnline) return 'offline';
    if (!isConnected) return 'poor';
    if (latency === null) return connectionQuality as ConnectionQuality;
    
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    return 'poor';
  };

  const actualQuality = getConnectionQualityFromLatency();

  const getStatusColor = () => {
    switch (actualQuality) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-green-600 bg-green-100';
      case 'poor': return 'text-yellow-600 bg-yellow-100';
      case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = () => {
    switch (actualQuality) {
      case 'excellent': return '📶';
      case 'good': return '📶';
      case 'poor': return '📶';
      case 'offline': return '📵';
      default: return '❓';
    }
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!isConnected) {
      if (shouldReconnect) {
        return `Reconnecting... (${reconnectAttempts}/10)`;
      }
      return 'Disconnected';
    }
    
    switch (actualQuality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'poor': return 'Poor';
      default: return 'Connected';
    }
  };

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-2',
  };

  const containerClasses = inline 
    ? 'inline-flex items-center space-x-2'
    : 'flex items-center space-x-2';

  if (!showDetails) {
    return (
      <div className={`${containerClasses} ${className}`}>
        <div className={`rounded-full ${sizeClasses[size]} ${getStatusColor()} font-medium`}>
          <span className="mr-1">{getStatusIcon()}</span>
          {getStatusText()}
          {latency && actualQuality !== 'offline' && (
            <span className="ml-1 text-xs opacity-75">
              ({latency}ms)
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">Connection Status</h4>
        <div className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor()}`}>
          <span className="mr-1">{getStatusIcon()}</span>
          {getStatusText()}
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Network:</span>
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Server:</span>
          <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {latency !== null && isConnected && (
          <div className="flex justify-between">
            <span className="text-gray-600">Latency:</span>
            <span className={`${
              latency < 100 ? 'text-green-600' : 
              latency < 300 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {latency}ms
            </span>
          </div>
        )}
        
        {reconnectAttempts > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Reconnect attempts:</span>
            <span className="text-orange-600">
              {reconnectAttempts}/10
            </span>
          </div>
        )}
        
        {shouldReconnect && (
          <div className="flex justify-between">
            <span className="text-gray-600">Next retry:</span>
            <span className="text-blue-600">
              {Math.round(reconnectDelay / 1000)}s
            </span>
          </div>
        )}
      </div>
      
      {!isConnected && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <div className="flex items-center space-x-2 text-yellow-800">
            {shouldReconnect ? (
              <>
                <LoadingSpinner size="small" color="red" />
                <span>Attempting to reconnect...</span>
              </>
            ) : (
              <>
                <span>⚠️</span>
                <span>Connection lost. Please check your internet.</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface NetworkQualityIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export const NetworkQualityIndicator: React.FC<NetworkQualityIndicatorProps> = ({
  className = '',
  showLabel = true,
}) => {
  const { isOnline, isConnected } = useConnectionState();
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const testLatency = async () => {
      if (!isConnected) return;
      
      const start = performance.now();
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000),
        });
        
        if (response.ok) {
          setLatency(Math.round(performance.now() - start));
        }
      } catch {
        setLatency(null);
      }
    };

    if (isConnected) {
      testLatency();
      const interval = setInterval(testLatency, 15000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const getSignalBars = () => {
    if (!isOnline || !isConnected) return 0;
    if (latency === null) return 1;
    if (latency < 100) return 4;
    if (latency < 200) return 3;
    if (latency < 400) return 2;
    return 1;
  };

  const signalBars = getSignalBars();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-end space-x-0.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-1 bg-current transition-colors ${
              bar <= signalBars 
                ? signalBars >= 3 ? 'text-green-500' : 
                  signalBars >= 2 ? 'text-yellow-500' : 'text-red-500'
                : 'text-gray-300'
            }`}
            style={{ height: `${bar * 3 + 2}px` }}
          />
        ))}
      </div>
      
      {showLabel && (
        <span className={`text-xs font-medium ${
          !isOnline || !isConnected ? 'text-red-600' :
          signalBars >= 3 ? 'text-green-600' :
          signalBars >= 2 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {!isOnline ? 'Offline' :
           !isConnected ? 'No Connection' :
           latency ? `${latency}ms` : 'Connected'}
        </span>
      )}
    </div>
  );
};

interface ConnectionProblemAlertProps {
  className?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ConnectionProblemAlert: React.FC<ConnectionProblemAlertProps> = ({
  className = '',
  onRetry,
  onDismiss,
}) => {
  const { isOnline, isConnected, reconnectAttempts } = useConnectionState();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show alert if offline or disconnected for more than 5 seconds
    const timer = setTimeout(() => {
      if (!isOnline || !isConnected) {
        setIsVisible(true);
      }
    }, 5000);

    if (isOnline && isConnected) {
      setIsVisible(false);
    }

    return () => clearTimeout(timer);
  }, [isOnline, isConnected]);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="text-red-500 text-xl">⚠️</div>
        <div className="flex-1">
          <h4 className="font-medium text-red-900 mb-1">
            Connection Problem
          </h4>
          <p className="text-sm text-red-700 mb-3">
            {!isOnline 
              ? 'You appear to be offline. Please check your internet connection.'
              : 'Lost connection to the game server. Some features may not work properly.'
            }
          </p>
          
          {reconnectAttempts > 0 && (
            <p className="text-xs text-red-600 mb-3">
              Reconnection attempts: {reconnectAttempts}/10
            </p>
          )}
          
          <div className="flex space-x-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                Retry Connection
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
