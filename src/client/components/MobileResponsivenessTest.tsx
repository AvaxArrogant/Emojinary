import React, { useState, useEffect } from 'react';
import {
  runResponsivenessTest,
  getDeviceInfo,
  monitorOrientationChanges,
  simulateDevice,
  useResponsiveBreakpoint,
  type ResponsivenessTestResult,
  type DeviceInfo,
  type ScreenOrientation,
} from '../utils/mobileResponsiveness';

interface MobileResponsivenessTestProps {
  /** Whether to show the test panel */
  visible?: boolean;
  /** Container element to test (defaults to document.body) */
  container?: HTMLElement;
  /** Callback when test results change */
  onTestResults?: (results: ResponsivenessTestResult) => void;
  /** Whether to run tests automatically */
  autoTest?: boolean;
  /** Test interval in milliseconds */
  testInterval?: number;
}

export const MobileResponsivenessTest: React.FC<MobileResponsivenessTestProps> = ({
  visible = false,
  container,
  onTestResults,
  autoTest = true,
  testInterval = 5000,
}) => {
  const [testResults, setTestResults] = useState<ResponsivenessTestResult | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo());
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('current');
  
  const { breakpoint } = useResponsiveBreakpoint();
  
  // Run responsiveness test
  const runTest = async () => {
    setIsRunningTest(true);
    
    try {
      // Small delay to ensure DOM is stable
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const results = runResponsivenessTest(container);
      setTestResults(results);
      onTestResults?.(results);
    } catch (error) {
      console.error('Error running responsiveness test:', error);
    } finally {
      setIsRunningTest(false);
    }
  };
  
  // Monitor device changes
  useEffect(() => {
    const cleanup = monitorOrientationChanges((_orientation: ScreenOrientation, info: DeviceInfo) => {
      setDeviceInfo(info);
      if (autoTest) {
        runTest();
      }
    });
    
    return cleanup;
  }, [autoTest, container, runTest]);
  
  // Auto-test on mount and interval
  useEffect(() => {
    if (autoTest) {
      runTest();
      
      const interval = setInterval(runTest, testInterval);
      return () => clearInterval(interval);
    }
  }, [autoTest, testInterval, container]);
  
  // Handle device simulation
  const handleDeviceSimulation = (deviceType: string) => {
    setSelectedDevice(deviceType);
    
    if (deviceType !== 'current') {
      simulateDevice(deviceType as any);
      setTimeout(runTest, 200); // Run test after simulation
    }
  };
  
  if (!visible) {
    return null;
  }
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 border-green-200';
    if (score >= 70) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              📱 Mobile Test
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={runTest}
                disabled={isRunningTest}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isRunningTest ? '⏳' : '🔄'} Test
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
              >
                {showDetails ? '▼' : '▶'} Details
              </button>
            </div>
          </div>
        </div>
        
        {/* Device Info */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Device:</span>
              <span className="font-medium">
                {deviceInfo.type} ({deviceInfo.orientation})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Viewport:</span>
              <span className="font-medium">
                {deviceInfo.viewportWidth}×{deviceInfo.viewportHeight}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Breakpoint:</span>
              <span className="font-medium">{breakpoint}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Touch:</span>
              <span className="font-medium">
                {deviceInfo.touchSupported ? '✅' : '❌'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Test Results */}
        {testResults && (
          <div className="px-4 py-3">
            <div className={`text-center p-3 rounded-lg border ${getScoreBgColor(testResults.score)}`}>
              <div className={`text-2xl font-bold ${getScoreColor(testResults.score)}`}>
                {testResults.score}
              </div>
              <div className="text-xs text-gray-600">Responsiveness Score</div>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-semibold text-gray-900">
                  {testResults.touchTargets.filter(t => t.meetsMinimumSize).length}/
                  {testResults.touchTargets.length}
                </div>
                <div className="text-gray-600">Touch Targets</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-semibold text-gray-900">
                  {testResults.textReadability.appropriate.length}/
                  {testResults.textReadability.appropriate.length + testResults.textReadability.tooSmall.length}
                </div>
                <div className="text-gray-600">Text Size</div>
              </div>
            </div>
            
            {/* Recommendations */}
            {testResults.recommendations.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-900 mb-1">
                  Issues Found:
                </div>
                <div className="space-y-1">
                  {testResults.recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 p-1 rounded">
                      • {rec}
                    </div>
                  ))}
                  {testResults.recommendations.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{testResults.recommendations.length - 3} more issues
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Device Simulation */}
        {showDetails && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs font-semibold text-gray-900 mb-2">
              Test Different Devices:
            </div>
            <select
              value={selectedDevice}
              onChange={(e) => handleDeviceSimulation(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="current">Current Device</option>
              <option value="iphone-se">iPhone SE</option>
              <option value="iphone-12">iPhone 12</option>
              <option value="iphone-12-pro-max">iPhone 12 Pro Max</option>
              <option value="ipad">iPad</option>
              <option value="android-small">Android Small</option>
              <option value="android-large">Android Large</option>
            </select>
            
            {/* Detailed Results */}
            {testResults && (
              <div className="mt-3 space-y-2">
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    Touch Targets ({testResults.accessibility.missingTouchTargets.length} issues)
                  </summary>
                  <div className="mt-1 pl-2 space-y-1">
                    {testResults.accessibility.missingTouchTargets.slice(0, 3).map((element, index) => (
                      <div key={index} className="text-red-600">
                        • {element.tagName.toLowerCase()}.{element.className || 'no-class'}
                      </div>
                    ))}
                  </div>
                </details>
                
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    Text Readability ({testResults.textReadability.tooSmall.length} issues)
                  </summary>
                  <div className="mt-1 pl-2 space-y-1">
                    {testResults.textReadability.tooSmall.slice(0, 3).map((element, index) => (
                      <div key={index} className="text-red-600">
                        • {element.tagName.toLowerCase()}: {window.getComputedStyle(element).fontSize}
                      </div>
                    ))}
                  </div>
                </details>
                
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    Layout Issues ({testResults.layoutIssues.horizontalOverflow.length} overflow)
                  </summary>
                  <div className="mt-1 pl-2 space-y-1">
                    {testResults.layoutIssues.horizontalOverflow.slice(0, 3).map((element, index) => (
                      <div key={index} className="text-red-600">
                        • {element.tagName.toLowerCase()}.{element.className || 'no-class'}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Hook for using mobile responsiveness testing in components
 */
export function useMobileResponsivenessTest(autoTest = false) {
  const [testResults, setTestResults] = useState<ResponsivenessTestResult | null>(null);
  const [isTestVisible, setIsTestVisible] = useState(false);
  
  const runTest = () => {
    const results = runResponsivenessTest();
    setTestResults(results);
    return results;
  };
  
  const showTestPanel = () => setIsTestVisible(true);
  const hideTestPanel = () => setIsTestVisible(false);
  const toggleTestPanel = () => setIsTestVisible(!isTestVisible);
  
  return {
    testResults,
    isTestVisible,
    runTest,
    showTestPanel,
    hideTestPanel,
    toggleTestPanel,
    TestComponent: () => (
      <MobileResponsivenessTest
        visible={isTestVisible}
        onTestResults={setTestResults}
        autoTest={autoTest}
      />
    ),
  };
}

export default MobileResponsivenessTest;
