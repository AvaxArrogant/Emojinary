/**
 * Cross-platform functionality testing utilities
 * 
 * This module provides utilities to test that the application works
 * consistently across different platforms and orientations.
 */

import { getDeviceInfo } from './mobileResponsiveness';

export interface CrossPlatformTestResult {
  platform: string;
  deviceType: string;
  orientation: string;
  viewport: { width: number; height: number };
  tests: {
    buttonsClickable: boolean;
    textReadable: boolean;
    layoutResponsive: boolean;
    touchEventsWork: boolean;
    orientationSupported: boolean;
  };
  score: number;
  issues: string[];
}

/**
 * Tests if buttons are properly clickable across platforms
 */
export function testButtonClickability(): boolean {
  const buttons = document.querySelectorAll('button:not([disabled])');
  
  for (const button of Array.from(buttons)) {
    const rect = button.getBoundingClientRect();
    const style = window.getComputedStyle(button);
    
    // Check if button is visible and has proper size
    if (rect.width < 44 || rect.height < 44) {
      return false;
    }
    
    // Check if button has proper touch-action
    if (style.touchAction !== 'manipulation' && style.touchAction !== 'none') {
      // This is acceptable for desktop, but should be set for mobile
      const deviceInfo = getDeviceInfo();
      if (deviceInfo.touchSupported) {
        return false;
      }
    }
    
    // Check if button is not hidden
    if (style.visibility === 'hidden' || style.display === 'none') {
      return false;
    }
  }
  
  return true;
}

/**
 * Tests if text is readable across different screen sizes
 */
export function testTextReadability(): boolean {
  const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, label');
  const deviceInfo = getDeviceInfo();
  const minFontSize = deviceInfo.type === 'mobile' ? 14 : 12;
  
  for (const element of Array.from(textElements)) {
    const style = window.getComputedStyle(element);
    const fontSize = parseFloat(style.fontSize);
    
    // Skip elements with no text content
    if (!(element as HTMLElement).textContent?.trim()) {
      continue;
    }
    
    if (fontSize < minFontSize) {
      return false;
    }
  }
  
  return true;
}

/**
 * Tests if layout is responsive and doesn't overflow
 */
export function testLayoutResponsiveness(): boolean {
  const body = document.body;
  const html = document.documentElement;
  
  // Check for horizontal overflow
  const scrollWidth = Math.max(body.scrollWidth, html.scrollWidth);
  const clientWidth = Math.max(body.clientWidth, html.clientWidth);
  
  // Allow small tolerance for scrollbars
  if (scrollWidth > clientWidth + 20) {
    return false;
  }
  
  // Check if critical elements are visible
  const criticalSelectors = [
    'button[class*="join"]',
    'button[class*="start"]',
    '[class*="player"]',
    'h1, h2',
  ];
  
  for (const selector of criticalSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of Array.from(elements)) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Tests if touch events work properly on touch devices
 */
export function testTouchEvents(): boolean {
  const deviceInfo = getDeviceInfo();
  
  // If device doesn't support touch, this test passes
  if (!deviceInfo.touchSupported) {
    return true;
  }
  
  // Test if touch events are properly supported
  try {
    const testElement = document.createElement('div');
    let touchStartFired = false;
    let touchEndFired = false;
    
    testElement.addEventListener('touchstart', () => {
      touchStartFired = true;
    });
    
    testElement.addEventListener('touchend', () => {
      touchEndFired = true;
    });
    
    // Create synthetic touch events
    const touchStart = new TouchEvent('touchstart', {
      touches: [new Touch({
        identifier: 0,
        target: testElement,
        clientX: 0,
        clientY: 0,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
      })],
    });
    
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [new Touch({
        identifier: 0,
        target: testElement,
        clientX: 0,
        clientY: 0,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
      })],
    });
    
    testElement.dispatchEvent(touchStart);
    testElement.dispatchEvent(touchEnd);
    
    return touchStartFired && touchEndFired;
  } catch (error) {
    // If Touch constructor is not available, assume touch events work
    return true;
  }
}

/**
 * Tests if orientation changes are properly supported
 */
export function testOrientationSupport(): boolean {
  const deviceInfo = getDeviceInfo();
  
  // Test if orientation media queries work
  const portraitQuery = window.matchMedia('(orientation: portrait)');
  const landscapeQuery = window.matchMedia('(orientation: landscape)');
  
  // One of them should match
  if (!portraitQuery.matches && !landscapeQuery.matches) {
    return false;
  }
  
  // Test if orientation matches actual viewport
  const isActuallyPortrait = window.innerHeight > window.innerWidth;
  const isActuallyLandscape = window.innerWidth > window.innerHeight;
  
  if (isActuallyPortrait && !portraitQuery.matches) {
    return false;
  }
  
  if (isActuallyLandscape && !landscapeQuery.matches) {
    return false;
  }
  
  return true;
}

/**
 * Runs comprehensive cross-platform tests
 */
export function runCrossPlatformTest(): CrossPlatformTestResult {
  const deviceInfo = getDeviceInfo();
  
  const tests = {
    buttonsClickable: testButtonClickability(),
    textReadable: testTextReadability(),
    layoutResponsive: testLayoutResponsiveness(),
    touchEventsWork: testTouchEvents(),
    orientationSupported: testOrientationSupport(),
  };
  
  // Calculate score
  let score = 0;
  const totalTests = Object.keys(tests).length;
  const passedTests = Object.values(tests).filter(Boolean).length;
  score = Math.round((passedTests / totalTests) * 100);
  
  // Generate issues list
  const issues: string[] = [];
  if (!tests.buttonsClickable) {
    issues.push('Some buttons are not properly clickable or sized');
  }
  if (!tests.textReadable) {
    issues.push('Text size is too small for current platform');
  }
  if (!tests.layoutResponsive) {
    issues.push('Layout has overflow or responsiveness issues');
  }
  if (!tests.touchEventsWork) {
    issues.push('Touch events are not working properly');
  }
  if (!tests.orientationSupported) {
    issues.push('Orientation changes are not properly supported');
  }
  
  return {
    platform: deviceInfo.isIOS ? 'iOS' : deviceInfo.isAndroid ? 'Android' : 'Desktop',
    deviceType: deviceInfo.type,
    orientation: deviceInfo.orientation,
    viewport: {
      width: deviceInfo.viewportWidth,
      height: deviceInfo.viewportHeight,
    },
    tests,
    score,
    issues,
  };
}

/**
 * Simulates orientation change for testing
 */
export function simulateOrientationChange(): Promise<void> {
  return new Promise((resolve) => {
    // Dispatch orientation change event
    window.dispatchEvent(new Event('orientationchange'));
    
    // Also dispatch resize event
    window.dispatchEvent(new Event('resize'));
    
    // Wait for layout to settle
    setTimeout(resolve, 300);
  });
}

/**
 * Tests specific platform features
 */
export function testPlatformSpecificFeatures(): {
  iOS: { safeareas: boolean; touchCallout: boolean };
  android: { overscroll: boolean; viewport: boolean };
  desktop: { hover: boolean; keyboard: boolean };
} {
  const deviceInfo = getDeviceInfo();
  
  return {
    iOS: {
      safeareas: deviceInfo.isIOS && CSS.supports('padding-top', 'env(safe-area-inset-top)'),
      touchCallout: deviceInfo.isIOS && CSS.supports('-webkit-touch-callout', 'none'),
    },
    android: {
      overscroll: CSS.supports('overscroll-behavior', 'contain'),
      viewport: window.visualViewport !== undefined,
    },
    desktop: {
      hover: window.matchMedia('(hover: hover)').matches,
      keyboard: 'keyboard' in navigator,
    },
  };
}

/**
 * Logs cross-platform test results for debugging
 */
export function logCrossPlatformTestResults(): void {
  const result = runCrossPlatformTest();
  const platformFeatures = testPlatformSpecificFeatures();
  
  console.group('🔄 Cross-Platform Test Results');
  console.log('Platform:', result.platform);
  console.log('Device Type:', result.deviceType);
  console.log('Orientation:', result.orientation);
  console.log('Viewport:', `${result.viewport.width}x${result.viewport.height}`);
  console.log('Score:', `${result.score}/100`);
  
  console.group('Test Results:');
  Object.entries(result.tests).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}:`, passed);
  });
  console.groupEnd();
  
  if (result.issues.length > 0) {
    console.group('Issues Found:');
    result.issues.forEach(issue => console.warn('⚠️', issue));
    console.groupEnd();
  }
  
  console.group('Platform Features:');
  console.log('iOS Features:', platformFeatures.iOS);
  console.log('Android Features:', platformFeatures.android);
  console.log('Desktop Features:', platformFeatures.desktop);
  console.groupEnd();
  
  console.groupEnd();
}

export default {
  runCrossPlatformTest,
  testButtonClickability,
  testTextReadability,
  testLayoutResponsiveness,
  testTouchEvents,
  testOrientationSupport,
  simulateOrientationChange,
  testPlatformSpecificFeatures,
  logCrossPlatformTestResults,
};
