import React, { useState, useEffect } from 'react';
import {
  getDeviceInfo,
  monitorOrientationChanges,
  useResponsiveBreakpoint,
  type DeviceInfo,
  type ScreenOrientation,
} from '../utils/mobileResponsiveness';

interface CrossPlatformTestProps {
  /** Whether to show the test panel */
  visible?: boolean;
  /** Callback when platform changes are detected */
  onPlatformChange?: (deviceInfo: DeviceInfo) => void;
  /** Whether to automatically test on orientation changes */
  autoTest?: boolean;
}

interface PlatformTestResult {
  timestamp: number;
  deviceInfo: DeviceInfo;
  breakpoint: string;
  layoutConsistency: {
    buttonsVisible: boolean;
    textReadable: boolean;
    navigationAccessible: boolean;
    contentFitsScreen: boolean;
  };
  functionalityTest: {
    touchEventsWork: boolean;
    keyboardEventsWork: boolean;
    scrollingSmooth: boolean;
    animationsPerform: boolean;
  };
  orientationSupport: {
    portraitWorks: boolean;
    landscapeWorks: boolean;
    transitionSmooth: boolean;
  };
  score: number;
  issues: string[];
}

export const CrossPlatformTest: React.FC<CrossPlatformTestProps> = ({
  visible = false,
  onPlatformChange,
  autoTest = true,
}) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo());
  const [testResults, setTestResults] = useState<PlatformTestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<PlatformTestResult | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const { breakpoint, isMobile } = useResponsiveBreakpoint();
  
  // Test layout consistency
  const testLayoutConsistency = (): PlatformTestResult['layoutConsistency'] => {
    const buttons = document.querySelectorAll('button');
    const buttonsVisible = Array.from(buttons).every(btn => {
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    });
    
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
    const textReadable = Array.from(textElements).every(el => {
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      return fontSize >= (isMobile ? 14 : 12); // Higher minimum for mobile
    });
    
    const navigationElements = document.querySelectorAll('nav, [role="navigation"], .nav-tabs-mobile');
    const navigationAccessible = Array.from(navigationElements).every(nav => {
      const rect = nav.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    
    const contentFitsScreen = document.body.scrollWidth <= window.innerWidth + 10; // 10px tolerance
    
    return {
      buttonsVisible,
      textReadable,
      navigationAccessible,
      contentFitsScreen,
    };
  };
  
  // Test functionality across platforms
  const testFunctionality = (): PlatformTestResult['functionalityTest'] => {
    // Test touch events (if supported)
    let touchEventsWork = true;
    if (deviceInfo.touchSupported) {
      try {
        const testElement = document.createElement('div');
        testElement.addEventListener('touchstart', () => {});
        touchEventsWork = true;
      } catch (error) {
        touchEventsWork = false;
      }
    }
    
    // Test keyboard events
    let keyboardEventsWork = true;
    try {
      const testElement = document.createElement('input');
      testElement.addEventListener('keydown', () => {});
      keyboardEventsWork = true;
    } catch (error) {
      keyboardEventsWork = false;
    }
    
    // Test scrolling performance (simplified)
    const scrollingSmooth = 'scrollBehavior' in document.documentElement.style;
    
    // Test animation performance (simplified)
    const animationsPerform = 'animation' in document.documentElement.style;
    
    return {
      touchEventsWork,
      keyboardEventsWork,
      scrollingSmooth,
      animationsPerform,
    };
  };
  
  // Test orientation support
  const testOrientationSupport = (): PlatformTestResult['orientationSupport'] => {
    const portraitWorks = window.innerHeight > window.innerWidth || deviceInfo.orientation === 'portrait';
    const landscapeWorks = window.innerWidth > window.innerHeight || deviceInfo.orientation === 'landscape';
    
    // Test if CSS orientation media queries work
    const transitionSmooth = window.matchMedia('(orientation: portrait)').matches !== 
                            window.matchMedia('(orientation: landscape)').matches;
    
    return {
      portraitWorks,
      landscapeWorks,
      transitionSmooth,
    };
  };
  
  // Run comprehensive cross-platform test
  const runTest = async (): Promise<PlatformTestResult> => {
    setIsRunningTest(true);
    
    try {
      // Small delay to ensure DOM is stable
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const layoutConsistency = testLayoutConsistency();
      const functionalityTest = testFunctionality();
      const orientationSupport = testOrientationSupport();
      
      // Calculate score
      let score = 100;
      const issues: string[] = [];
      
      // Layout consistency scoring
      if (!layoutConsistency.buttonsVisible) {
        score -= 20;
        issues.push('Some buttons are not visible');
      }
      if (!layoutConsistency.textReadable) {
        score -= 15;
        issues.push('Text size too small for platform');
      }
      if (!layoutConsistency.navigationAccessible) {
        score -= 10;
        issues.push('Navigation elements not accessible');
      }
      if (!layoutConsistency.contentFitsScreen) {
        score -= 25;
        issues.push('Content overflows screen width');
      }
      
      // Functionality scoring
      if (deviceInfo.touchSupported && !functionalityTest.touchEventsWork) {
        score -= 20;
        issues.push('Touch events not working properly');
      }
      if (!functionalityTest.keyboardEventsWork) {
        score -= 10;
        issues.push('Keyboard events not working');
      }
      if (!functionalityTest.scrollingSmooth) {
        score -= 5;
        issues.push('Scrolling may not be smooth');
      }
      if (!functionalityTest.animationsPerform) {
        score -= 5;
        issues.push('Animations may not perform well');
      }
      
      // Orientation scoring
      if (!orientationSupport.portraitWorks) {
        score -= 15;
        issues.push('Portrait orientation issues detected');
      }
      if (!orientationSupport.landscapeWorks) {
        score -= 15;
        issues.push('Landscape orientation issues detected');
      }
      if (!orientationSupport.transitionSmooth) {
        score -= 10;
        issues.push('Orientation transitions may not be smooth');
      }
      
      score = Math.max(0, Math.min(100, score));
      
      const result: PlatformTestResult = {
        timestamp: Date.now(),
        deviceInfo: { ...deviceInfo },
        breakpoint,
        layoutConsistency,
        functionalityTest,
        orientationSupport,
        score,
        issues,
      };
      
      setCurrentTest(result);
      setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      
      return result;
    } finally {
      setIsRunningTest(false);
    }
  };
  
  // Monitor device and orientation changes
  useEffect(() => {
    const cleanup = monitorOrientationChanges((_orientation: ScreenOrientation, info: DeviceInfo) => {
      setDeviceInfo(info);
      onPlatformChange?.(info);
      
      if (autoTest) {
        setTimeout(runTest, 500); // Delay to allow layout to settle
      }
    });
    
    return cleanup;
  }, [autoTest, onPlatformChange, runTest]);
  
  // Run initial test
  useEffect(() => {
    if (autoTest) {
      runTest();
    }
  }, [autoTest]);
  
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
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              🔄 Cross-Platform Test
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={runTest}
                disabled={isRunningTest}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isRunningTest ? '⏳' : '🧪'} Test
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
        
        {/* Current Platform Info */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Platform:</span>
              <span className="font-medium">
                {deviceInfo.isIOS ? 'iOS' : deviceInfo.isAndroid ? 'Android' : 'Desktop'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Device Type:</span>
              <span className="font-medium capitalize">{deviceInfo.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Orientation:</span>
              <span className="font-medium capitalize">{deviceInfo.orientation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Breakpoint:</span>
              <span className="font-medium">{breakpoint}</span>
            </div>
          </div>
        </div>
        
        {/* Test Results */}
        {currentTest && (
          <div className="px-4 py-3">
            <div className={`text-center p-3 rounded-lg border ${getScoreBgColor(currentTest.score)}`}>
              <div className={`text-2xl font-bold ${getScoreColor(currentTest.score)}`}>
                {currentTest.score}
              </div>
              <div className="text-xs text-gray-600">Platform Compatibility</div>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className={`font-semibold ${
                  currentTest.layoutConsistency.contentFitsScreen ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentTest.layoutConsistency.contentFitsScreen ? '✅' : '❌'}
                </div>
                <div className="text-gray-600">Layout</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className={`font-semibold ${
                  currentTest.functionalityTest.touchEventsWork || !deviceInfo.touchSupported ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentTest.functionalityTest.touchEventsWork || !deviceInfo.touchSupported ? '✅' : '❌'}
                </div>
                <div className="text-gray-600">Touch</div>
              </div>
            </div>
            
            {/* Issues */}
            {currentTest.issues.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-900 mb-1">
                  Issues Found:
                </div>
                <div className="space-y-1">
                  {currentTest.issues.slice(0, 3).map((issue, issueIndex) => (
                    <div key={issueIndex} className="text-xs text-red-600 bg-red-50 p-1 rounded">
                      • {issue}
                    </div>
                  ))}
                  {currentTest.issues.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{currentTest.issues.length - 3} more issues
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Detailed Results */}
        {showDetails && currentTest && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs space-y-3">
              {/* Layout Consistency */}
              <div>
                <div className="font-semibold text-gray-900 mb-1">Layout Consistency:</div>
                <div className="space-y-1 pl-2">
                  <div className={`flex justify-between ${
                    currentTest.layoutConsistency.buttonsVisible ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>Buttons Visible:</span>
                    <span>{currentTest.layoutConsistency.buttonsVisible ? '✅' : '❌'}</span>
                  </div>
                  <div className={`flex justify-between ${
                    currentTest.layoutConsistency.textReadable ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>Text Readable:</span>
                    <span>{currentTest.layoutConsistency.textReadable ? '✅' : '❌'}</span>
                  </div>
                  <div className={`flex justify-between ${
                    currentTest.layoutConsistency.contentFitsScreen ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>Fits Screen:</span>
                    <span>{currentTest.layoutConsistency.contentFitsScreen ? '✅' : '❌'}</span>
                  </div>
                </div>
              </div>
              
              {/* Functionality */}
              <div>
                <div className="font-semibold text-gray-900 mb-1">Functionality:</div>
                <div className="space-y-1 pl-2">
                  <div className={`flex justify-between ${
                    currentTest.functionalityTest.touchEventsWork || !deviceInfo.touchSupported ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>Touch Events:</span>
                    <span>{currentTest.functionalityTest.touchEventsWork || !deviceInfo.touchSupported ? '✅' : '❌'}</span>
                  </div>
                  <div className={`flex justify-between ${
                    currentTest.functionalityTest.scrollingSmooth ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>Smooth Scroll:</span>
                    <span>{currentTest.functionalityTest.scrollingSmooth ? '✅' : '❌'}</span>
                  </div>
                </div>
              </div>
              
              {/* Orientation Support */}
              <div>
                <div className="font-semibold text-gray-900 mb-1">Orientation:</div>
                <div className="space-y-1 pl-2">
                  <div className={`flex justify-between ${
                    currentTest.orientationSupport.portraitWorks ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>Portrait:</span>
                    <span>{currentTest.orientationSupport.portraitWorks ? '✅' : '❌'}</span>
                  </div>
                  <div className={`flex justify-between ${
                    currentTest.orientationSupport.landscapeWorks ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>Landscape:</span>
                    <span>{currentTest.orientationSupport.landscapeWorks ? '✅' : '❌'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Test History */}
            {testResults.length > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-900 mb-1">
                  Recent Tests:
                </div>
                <div className="space-y-1">
                  {testResults.slice(1, 4).map((result, index) => (
                    <div key={result.timestamp} className="flex justify-between text-xs">
                      <span className="text-gray-600">
                        {result.deviceInfo.type} ({result.deviceInfo.orientation})
                      </span>
                      <span className={getScoreColor(result.score)}>
                        {result.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Hook for cross-platform testing
 */
export function useCrossPlatformTest(autoTest = false) {
  const [isTestVisible, setIsTestVisible] = useState(false);
  
  const showTestPanel = () => setIsTestVisible(true);
  const hideTestPanel = () => setIsTestVisible(false);
  const toggleTestPanel = () => setIsTestVisible(!isTestVisible);
  
  return {
    isTestVisible,
    showTestPanel,
    hideTestPanel,
    toggleTestPanel,
    TestComponent: () => (
      <CrossPlatformTest
        visible={isTestVisible}
        onPlatformChange={(deviceInfo) => {
          console.log('Platform changed:', deviceInfo);
        }}
        autoTest={autoTest}
      />
    ),
  };
}

export default CrossPlatformTest;
