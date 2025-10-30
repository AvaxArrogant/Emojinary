import React, { Component, ReactNode } from 'react';

type LeaderboardErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
};

type LeaderboardErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

/**
 * Error boundary specifically for leaderboard components
 * Implements Requirement 3.1, 3.2, 3.5 - Independent error boundaries for leaderboard vs game logic
 */
export class LeaderboardErrorBoundary extends Component<
  LeaderboardErrorBoundaryProps,
  LeaderboardErrorBoundaryState
> {
  constructor(props: LeaderboardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LeaderboardErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging
    console.error('Leaderboard Error Boundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI or default fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="text-yellow-600 mb-2">⚠️ Leaderboard Unavailable</div>
            <p className="text-gray-600 mb-4 text-sm">
              The leaderboard encountered an error, but your game continues normally.
            </p>
            <button
              onClick={() => {
                // Reset error boundary state
                this.setState({ hasError: false });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Try Again
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Game progress is still being saved
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version of the error boundary for functional components
 */
export const useLeaderboardErrorHandler = () => {
  const handleLeaderboardError = (error: Error) => {
    console.warn('Leaderboard error handled gracefully:', error.message);
    
    // Don't throw the error - just log it
    // This prevents leaderboard errors from crashing the game
    return null;
  };

  return { handleLeaderboardError };
};

export default LeaderboardErrorBoundary;
