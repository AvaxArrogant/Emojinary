/**
 * Mobile Responsiveness Testing and Utilities
 * 
 * This module provides utilities for testing and ensuring mobile responsiveness
 * across different devices and screen orientations.
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type ScreenOrientation = 'portrait' | 'landscape';

export interface DeviceInfo {
  type: DeviceType;
  orientation: ScreenOrientation;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  touchSupported: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasNotch: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

export interface TouchTargetInfo {
  element: HTMLElement;
  width: number;
  height: number;
  isAccessible: boolean;
  meetsMinimumSize: boolean;
  hasProperSpacing: boolean;
}

export interface ResponsivenessTestResult {
  deviceInfo: DeviceInfo;
  touchTargets: TouchTargetInfo[];
  textReadability: {
    tooSmall: HTMLElement[];
    appropriate: HTMLElement[];
  };
  layoutIssues: {
    horizontalOverflow: HTMLElement[];
    verticalOverflow: HTMLElement[];
    overlappingElements: HTMLElement[];
  };
  accessibility: {
    missingTouchTargets: HTMLElement[];
    inadequateSpacing: HTMLElement[];
  };
  score: number; // 0-100
  recommendations: string[];
}

/**
 * Detects current device information
 */
export function getDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?=.*Mobile)|Tablet/i.test(userAgent) && window.innerWidth >= 768;
  
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Detect device type based on screen size and user agent
  let type: DeviceType = 'desktop';
  if (isMobile && !isTablet) {
    type = 'mobile';
  } else if (isTablet || (viewportWidth >= 768 && viewportWidth < 1024)) {
    type = 'tablet';
  }
  
  // Detect orientation
  const orientation: ScreenOrientation = viewportWidth > viewportHeight ? 'landscape' : 'portrait';
  
  // Detect notch (approximate detection for iOS devices)
  const hasNotch = isIOS && (
    (screenHeight === 812 && screenWidth === 375) || // iPhone X, XS
    (screenHeight === 896 && screenWidth === 414) || // iPhone XR, XS Max
    (screenHeight === 844 && screenWidth === 390) || // iPhone 12, 12 Pro
    (screenHeight === 926 && screenWidth === 428) || // iPhone 12 Pro Max
    (screenHeight === 932 && screenWidth === 430)    // iPhone 14 Pro Max
  );
  
  return {
    type,
    orientation,
    screenWidth,
    screenHeight,
    pixelRatio: window.devicePixelRatio || 1,
    touchSupported: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    isIOS,
    isAndroid,
    hasNotch,
    viewportWidth,
    viewportHeight,
  };
}

/**
 * Tests touch target accessibility and size
 */
export function testTouchTargets(container: HTMLElement = document.body): TouchTargetInfo[] {
  const touchableElements = container.querySelectorAll(
    'button, input, select, textarea, a, [role="button"], [tabindex], .emoji-button, .btn-mobile'
  );
  
  const results: TouchTargetInfo[] = [];
  const MIN_TOUCH_SIZE = 44; // iOS recommended minimum
  const MIN_SPACING = 8; // Minimum spacing between touch targets
  
  touchableElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    const rect = htmlElement.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(htmlElement);
    
    // Calculate effective touch area including padding
    const paddingTop = parseFloat(computedStyle.paddingTop);
    const paddingBottom = parseFloat(computedStyle.paddingBottom);
    const paddingLeft = parseFloat(computedStyle.paddingLeft);
    const paddingRight = parseFloat(computedStyle.paddingRight);
    
    const effectiveWidth = rect.width + paddingLeft + paddingRight;
    const effectiveHeight = rect.height + paddingTop + paddingBottom;
    
    const meetsMinimumSize = effectiveWidth >= MIN_TOUCH_SIZE && effectiveHeight >= MIN_TOUCH_SIZE;
    
    // Check spacing from other touch targets
    let hasProperSpacing = true;
    touchableElements.forEach((otherElement) => {
      if (otherElement === element) return;
      
      const otherRect = (otherElement as HTMLElement).getBoundingClientRect();
      const distance = Math.sqrt(
        Math.pow(rect.left - otherRect.left, 2) + Math.pow(rect.top - otherRect.top, 2)
      );
      
      if (distance < MIN_SPACING && distance > 0) {
        hasProperSpacing = false;
      }
    });
    
    const isAccessible = !htmlElement.hasAttribute('disabled') && 
                        computedStyle.visibility !== 'hidden' && 
                        computedStyle.display !== 'none';
    
    results.push({
      element: htmlElement,
      width: effectiveWidth,
      height: effectiveHeight,
      isAccessible,
      meetsMinimumSize,
      hasProperSpacing,
    });
  });
  
  return results;
}

/**
 * Tests text readability on mobile screens
 */
export function testTextReadability(container: HTMLElement = document.body): {
  tooSmall: HTMLElement[];
  appropriate: HTMLElement[];
} {
  const textElements = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, label, button');
  const MIN_FONT_SIZE = 14; // Minimum readable font size on mobile
  
  const tooSmall: HTMLElement[] = [];
  const appropriate: HTMLElement[] = [];
  
  textElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    const computedStyle = window.getComputedStyle(htmlElement);
    const fontSize = parseFloat(computedStyle.fontSize);
    
    // Skip elements with no text content
    if (!htmlElement.textContent?.trim()) return;
    
    if (fontSize < MIN_FONT_SIZE) {
      tooSmall.push(htmlElement);
    } else {
      appropriate.push(htmlElement);
    }
  });
  
  return { tooSmall, appropriate };
}

/**
 * Detects layout issues like overflow and overlapping elements
 */
export function detectLayoutIssues(container: HTMLElement = document.body): {
  horizontalOverflow: HTMLElement[];
  verticalOverflow: HTMLElement[];
  overlappingElements: HTMLElement[];
} {
  const allElements = container.querySelectorAll('*');
  const horizontalOverflow: HTMLElement[] = [];
  const verticalOverflow: HTMLElement[] = [];
  const overlappingElements: HTMLElement[] = [];
  
  const containerRect = container.getBoundingClientRect();
  
  allElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    const rect = htmlElement.getBoundingClientRect();
    
    // Check for horizontal overflow
    if (rect.right > containerRect.right + 10) { // 10px tolerance
      horizontalOverflow.push(htmlElement);
    }
    
    // Check for vertical overflow (less critical)
    if (rect.bottom > containerRect.bottom + 50) { // 50px tolerance
      verticalOverflow.push(htmlElement);
    }
    
    // Check for overlapping elements (simplified check)
    allElements.forEach((otherElement) => {
      if (otherElement === element) return;
      
      const otherRect = (otherElement as HTMLElement).getBoundingClientRect();
      
      // Check if elements overlap
      if (rect.left < otherRect.right &&
          rect.right > otherRect.left &&
          rect.top < otherRect.bottom &&
          rect.bottom > otherRect.top) {
        
        // Only report if it's likely unintentional overlap
        const zIndex1 = parseInt(window.getComputedStyle(htmlElement).zIndex) || 0;
        const zIndex2 = parseInt(window.getComputedStyle(otherElement as HTMLElement).zIndex) || 0;
        
        if (zIndex1 === zIndex2 && !overlappingElements.includes(htmlElement)) {
          overlappingElements.push(htmlElement);
        }
      }
    });
  });
  
  return {
    horizontalOverflow,
    verticalOverflow,
    overlappingElements,
  };
}

/**
 * Runs comprehensive mobile responsiveness tests
 */
export function runResponsivenessTest(container: HTMLElement = document.body): ResponsivenessTestResult {
  const deviceInfo = getDeviceInfo();
  const touchTargets = testTouchTargets(container);
  const textReadability = testTextReadability(container);
  const layoutIssues = detectLayoutIssues(container);
  
  // Calculate accessibility issues
  const missingTouchTargets = touchTargets.filter(t => !t.meetsMinimumSize).map(t => t.element);
  const inadequateSpacing = touchTargets.filter(t => !t.hasProperSpacing).map(t => t.element);
  
  // Calculate score (0-100)
  let score = 100;
  
  // Deduct points for issues
  score -= missingTouchTargets.length * 10; // -10 per inadequate touch target
  score -= inadequateSpacing.length * 5; // -5 per spacing issue
  score -= textReadability.tooSmall.length * 3; // -3 per small text element
  score -= layoutIssues.horizontalOverflow.length * 15; // -15 per overflow issue
  score -= layoutIssues.overlappingElements.length * 8; // -8 per overlap issue
  
  score = Math.max(0, Math.min(100, score));
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (missingTouchTargets.length > 0) {
    recommendations.push(`Increase touch target size for ${missingTouchTargets.length} elements (minimum 44px)`);
  }
  
  if (inadequateSpacing.length > 0) {
    recommendations.push(`Add more spacing between ${inadequateSpacing.length} touch targets`);
  }
  
  if (textReadability.tooSmall.length > 0) {
    recommendations.push(`Increase font size for ${textReadability.tooSmall.length} text elements (minimum 14px)`);
  }
  
  if (layoutIssues.horizontalOverflow.length > 0) {
    recommendations.push(`Fix horizontal overflow in ${layoutIssues.horizontalOverflow.length} elements`);
  }
  
  if (layoutIssues.overlappingElements.length > 0) {
    recommendations.push(`Resolve overlapping elements (${layoutIssues.overlappingElements.length} found)`);
  }
  
  if (deviceInfo.type === 'mobile' && deviceInfo.orientation === 'landscape') {
    recommendations.push('Test and optimize layout for landscape orientation');
  }
  
  if (deviceInfo.hasNotch) {
    recommendations.push('Ensure content respects safe area insets for devices with notches');
  }
  
  return {
    deviceInfo,
    touchTargets,
    textReadability,
    layoutIssues,
    accessibility: {
      missingTouchTargets,
      inadequateSpacing,
    },
    score,
    recommendations,
  };
}

/**
 * Simulates different device viewports for testing
 */
export function simulateDevice(deviceType: 'iphone-se' | 'iphone-12' | 'iphone-12-pro-max' | 'ipad' | 'android-small' | 'android-large'): void {
  const devices = {
    'iphone-se': { width: 375, height: 667 },
    'iphone-12': { width: 390, height: 844 },
    'iphone-12-pro-max': { width: 428, height: 926 },
    'ipad': { width: 768, height: 1024 },
    'android-small': { width: 360, height: 640 },
    'android-large': { width: 412, height: 869 },
  };
  
  const device = devices[deviceType];
  if (device) {
    // This would typically be used in testing environments
    // In a real browser, you'd need to use developer tools or testing frameworks
    console.log(`Simulating ${deviceType}: ${device.width}x${device.height}`);
    
    // For testing purposes, we can dispatch a resize event
    Object.defineProperty(window, 'innerWidth', { value: device.width, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: device.height, writable: true });
    window.dispatchEvent(new Event('resize'));
  }
}

/**
 * Monitors orientation changes and provides callbacks
 */
export function monitorOrientationChanges(callback: (orientation: ScreenOrientation, deviceInfo: DeviceInfo) => void): () => void {
  const handleOrientationChange = () => {
    // Small delay to ensure dimensions are updated
    setTimeout(() => {
      const deviceInfo = getDeviceInfo();
      callback(deviceInfo.orientation, deviceInfo);
    }, 100);
  };
  
  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('resize', handleOrientationChange);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('orientationchange', handleOrientationChange);
    window.removeEventListener('resize', handleOrientationChange);
  };
}

/**
 * Provides responsive breakpoint utilities
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export function getCurrentBreakpoint(): keyof typeof breakpoints | 'xs' {
  const width = window.innerWidth;
  
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
}

/**
 * Hook for responsive behavior in React components
 */
export function useResponsiveBreakpoint(): {
  breakpoint: keyof typeof breakpoints | 'xs';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
} {
  const [breakpoint, setBreakpoint] = React.useState(getCurrentBreakpoint());
  
  React.useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getCurrentBreakpoint());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return {
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
  };
}

// Add React import for the hook
import React from 'react';
