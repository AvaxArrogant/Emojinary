import React from 'react';
import { LoadingSpinner } from './LoadingScreen';
import { RefreshButton } from './RefreshButton';
import { useValidatedGameData } from '../hooks/useValidatedGameData';

type PartialDataHandlerProps = {
  children: React.ReactNode;
  fallbackComponent?: React.ComponentType<{ missingData: string[] }>;
  showLoadingIndicators?: boolean;
  allowInteraction?: boolean;
};

type DataSection = {
  name: string;
  isAvailable: boolean;
  isRequired: boolean;
  loadingIndicator?: React.ReactNode;
  fallbackContent?: React.ReactNode;
};

/**
 * Component that handles partial data states gracefully
 * Implements requirements 1.1, 4.1, and 5.4 for partial data handling
 */
export const PartialDataHandler: React.FC<PartialDataHandlerProps> = ({
  children,
  fallbackComponent: FallbackComponent,
  showLoadingIndicators = true,
  allowInteraction = true
}) => {
  const {
    hasValidGameData,
    hasValidPlayerData,
    hasValidUserData,
    validationStatus,
    dataFreshness
  } = useValidatedGameData();

  // Define data sections and their availability
  const dataSections: DataSection[] = [
    {
      name: 'Game State',
      isAvailable: hasValidGameData,
      isRequired: true,
      loadingIndicator: (
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="small" color="blue" />
          <span className="text-sm text-gray-600">Loading game state...</span>
        </div>
      ),
      fallbackContent: (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600">ℹ️</span>
            <span className="text-sm text-blue-800">Game state unavailable</span>
          </div>
        </div>
      )
    },
    {
      name: 'Player Data',
      isAvailable: hasValidPlayerData,
      isRequired: false,
      loadingIndicator: (
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="small" color="green" />
          <span className="text-sm text-gray-600">Loading players...</span>
        </div>
      ),
      fallbackContent: (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">👥</span>
            <span className="text-sm text-gray-700">No player data available</span>
          </div>
        </div>
      )
    },
    {
      name: 'User Data',
      isAvailable: hasValidUserData,
      isRequired: false,
      loadingIndicator: (
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="small" color="blue" />
          <span className="text-sm text-gray-600">Loading user info...</span>
        </div>
      ),
      fallbackContent: (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-purple-600">👤</span>
            <span className="text-sm text-purple-800">User data unavailable</span>
          </div>
        </div>
      )
    }
  ];

  // Get missing data sections
  const missingData = dataSections
    .filter(section => !section.isAvailable)
    .map(section => section.name);

  const missingRequiredData = dataSections
    .filter(section => section.isRequired && !section.isAvailable)
    .map(section => section.name);

  // Check if we have enough data to show the main content
  const canShowMainContent = validationStatus.partialDataAvailable && missingRequiredData.length === 0;

  // If we have a custom fallback component and missing required data
  if (FallbackComponent && missingRequiredData.length > 0) {
    return <FallbackComponent missingData={missingData} />;
  }

  // If no data is available at all, show loading state
  if (!validationStatus.partialDataAvailable) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 safe-area-padding">
        <div className="container-mobile">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🎭</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Emojirades</h2>
              <p className="text-gray-600 mb-6">Setting up your game experience...</p>
            </div>
            
            {showLoadingIndicators && (
              <div className="space-y-4 w-full max-w-md">
                {dataSections.map((section) => (
                  <div key={section.name} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <span className="text-sm font-medium text-gray-700">{section.name}</span>
                    {section.isAvailable ? (
                      <span className="text-green-600">✅</span>
                    ) : (
                      <LoadingSpinner size="small" color="blue" />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <RefreshButton
              size="medium"
              showText={true}
              showStatus={true}
              reason="validation"
            />
          </div>
        </div>
      </div>
    );
  }

  // If we can show main content, render it with partial data indicators
  if (canShowMainContent) {
    return (
      <div className="relative">
        {/* Partial data warning banner */}
        {missingData.length > 0 && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600">⚠️</span>
                <span className="text-sm text-yellow-800">
                  Some data is unavailable: {missingData.join(', ')}
                </span>
              </div>
              <RefreshButton
                size="small"
                showText={false}
                reason="validation"
                className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300"
              />
            </div>
          </div>
        )}
        
        {/* Data staleness warning */}
        {dataFreshness.isStale && (
          <div className="bg-orange-50 border-b border-orange-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-orange-600">🕐</span>
                <span className="text-sm text-orange-800">
                  Data may be outdated ({Math.floor(dataFreshness.gameAge / 1000)}s old)
                </span>
              </div>
              <RefreshButton
                size="small"
                showText={false}
                reason="stale"
                className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300"
              />
            </div>
          </div>
        )}
        
        {/* Main content with interaction overlay if needed */}
        <div className={`${!allowInteraction ? 'pointer-events-none opacity-75' : ''}`}>
          {children}
        </div>
        
        {/* Missing data sections overlay */}
        {showLoadingIndicators && missingData.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-white rounded-lg shadow-lg border p-3 max-w-xs">
              <div className="text-xs font-medium text-gray-700 mb-2">Loading:</div>
              <div className="space-y-1">
                {dataSections
                  .filter(section => !section.isAvailable)
                  .map((section) => (
                    <div key={section.name} className="flex items-center space-x-2">
                      <LoadingSpinner size="small" color="gray" />
                      <span className="text-xs text-gray-600">{section.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback: show partial content with missing data placeholders
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 safe-area-padding">
      <div className="container-mobile">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center py-mobile">
            <h1 className="text-mobile-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              🎭 Emojirades
            </h1>
            <p className="text-mobile-base sm:text-lg text-gray-600 px-2">
              Loading game data...
            </p>
          </div>
          
          {/* Data sections */}
          <div className="grid gap-4">
            {dataSections.map((section) => (
              <div key={section.name} className="card-mobile p-mobile">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{section.name}</h3>
                {section.isAvailable ? (
                  <div className="text-green-600 text-sm">✅ Available</div>
                ) : showLoadingIndicators ? (
                  section.loadingIndicator
                ) : (
                  section.fallbackContent
                )}
              </div>
            ))}
          </div>
          
          {/* Refresh option */}
          <div className="text-center">
            <RefreshButton
              size="large"
              showText={true}
              showStatus={true}
              reason="validation"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Default fallback component for missing data
 */
export const DefaultPartialDataFallback: React.FC<{ missingData: string[] }> = ({ missingData }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 safe-area-padding">
    <div className="container-mobile">
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Unavailable</h2>
          <p className="text-gray-600 mb-4">
            Some required data is missing: {missingData.join(', ')}
          </p>
        </div>
        
        <RefreshButton
          size="large"
          showText={true}
          showStatus={true}
          reason="validation"
        />
      </div>
    </div>
  </div>
);
