/**
 * Device Detection and Responsive Utilities
 *
 * Smart detection for tablets, phones (portrait/landscape), foldables, and desktops.
 * Provides adaptive layout calculations and viewport management.
 */

import { GAME_HEIGHT, GAME_WIDTH } from './constants';

export type DeviceType = 'phone' | 'tablet' | 'foldable' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface DeviceInfo {
  type: DeviceType;
  orientation: Orientation;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  isTouchDevice: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasNotch: boolean;
  isFoldable: boolean;
  foldState?: 'folded' | 'unfolded' | 'tent' | 'book';
}

export interface ViewportDimensions {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  aspectRatio: number;
}

/**
 * Detect current device type and capabilities
 */
export function detectDevice(): DeviceInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;

  // Orientation
  const orientation: Orientation = width > height ? 'landscape' : 'portrait';

  // Touch detection
  const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator.msMaxTouchPoints ?? 0) > 0;

  // Platform detection
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);

  // Notch detection (approximate)
  const hasNotch =
    isIOS &&
    pixelRatio >= 3 &&
    ((width === 375 && height === 812) || // iPhone X/XS/11 Pro
      (width === 414 && height === 896) || // iPhone XR/XS Max/11/11 Pro Max
      (width === 390 && height === 844) || // iPhone 12/13/14
      (width === 393 && height === 852) || // iPhone 14 Pro
      (width === 428 && height === 926)); // iPhone 12/13/14 Pro Max

  // Foldable detection
  const isFoldable = detectFoldable();
  const foldState = isFoldable ? detectFoldState() : undefined;

  // Device type classification
  let type: DeviceType;

  if (isFoldable) {
    type = 'foldable';
  } else if (!isTouchDevice) {
    type = 'desktop';
  } else {
    // Distinguish between phone and tablet
    const minDimension = Math.min(width, height);

    // Tablets generally have larger screens
    // Using 600px as breakpoint (common Android tablet size)
    if (minDimension >= 600) {
      type = 'tablet';
    } else {
      type = 'phone';
    }
  }

  return {
    type,
    orientation,
    screenWidth: width,
    screenHeight: height,
    pixelRatio,
    isTouchDevice,
    isIOS,
    isAndroid,
    hasNotch,
    isFoldable,
    foldState,
  };
}

/**
 * Detect if device is foldable using various APIs
 */
function detectFoldable(): boolean {
  // Check for Window Segments API (foldable devices)
  if (window.visualViewport?.getWindowSegments) {
    const segments = window.visualViewport.getWindowSegments();
    return segments && segments.length > 1;
  }

  // Check for specific foldable user agents
  const userAgent = navigator.userAgent.toLowerCase();
  const isFoldableUA = /fold|flip|duo/.test(userAgent) || /sm-f\d{3}/.test(userAgent); // Samsung Fold pattern

  // Check for dual-screen via media query
  const hasDualScreen =
    window.matchMedia('(horizontal-viewport-segments: 2)').matches ||
    window.matchMedia('(vertical-viewport-segments: 2)').matches;

  return isFoldableUA || hasDualScreen;
}

/**
 * Detect fold state for foldable devices
 */
function detectFoldState(): 'folded' | 'unfolded' | 'tent' | 'book' {
  // Try to use Device Posture API if available
  if (navigator.devicePosture) {
    const posture = navigator.devicePosture.type;
    if (posture === 'folded') return 'folded';
    if (posture === 'continuous') return 'unfolded';
  }

  // Fallback: guess based on aspect ratio and screen size
  const aspectRatio = window.innerWidth / window.innerHeight;

  if (aspectRatio < 0.6 || aspectRatio > 1.7) {
    return 'folded'; // Very narrow or very wide suggests folded
  }

  return 'unfolded';
}

/**
 * Calculate optimal viewport dimensions for the game
 * Maintains aspect ratio while maximizing screen usage
 */
export function calculateViewport(
  baseWidth: number,
  baseHeight: number,
  deviceInfo: DeviceInfo
): ViewportDimensions {
  const { screenWidth, screenHeight, type, orientation, foldState } = deviceInfo;

  // Base aspect ratio (4:3 for 800x600)
  const baseAspectRatio = baseWidth / baseHeight;
  const screenAspectRatio = screenWidth / screenHeight;

  // Calculate safe area insets
  const safeInsets = calculateSafeInsets(deviceInfo);

  // Available space after safe insets
  const availableWidth = screenWidth - safeInsets.left - safeInsets.right;
  const availableHeight = screenHeight - safeInsets.top - safeInsets.bottom;

  let width: number;
  let height: number;
  let scale: number;

  // Special handling for foldables in folded state
  if (type === 'foldable' && foldState === 'folded') {
    // Use smaller dimension to fit within one screen
    const maxDim = Math.min(availableWidth, availableHeight * 0.8);
    if (orientation === 'portrait') {
      width = maxDim;
      height = maxDim / baseAspectRatio;
    } else {
      height = maxDim;
      width = maxDim * baseAspectRatio;
    }
    scale = width / baseWidth;
  }
  // Phone portrait mode - use most of screen width
  else if (type === 'phone' && orientation === 'portrait') {
    width = availableWidth * 0.95;
    height = width / baseAspectRatio;

    // If height exceeds available, constrain by height
    if (height > availableHeight * 0.85) {
      height = availableHeight * 0.85;
      width = height * baseAspectRatio;
    }

    scale = width / baseWidth;
  }
  // Phone landscape - maximize screen usage (match original: use full constraining dimension)
  else if (type === 'phone' && orientation === 'landscape') {
    // Try to use full width
    width = availableWidth * 0.98;
    height = width / baseAspectRatio;

    // Constrain by height — use 0.98 to match width utilization
    if (height > availableHeight * 0.98) {
      height = availableHeight * 0.98;
      width = height * baseAspectRatio;
    }

    scale = width / baseWidth;
  }
  // Foldable unfolded/tent/book - treat like a small tablet
  else if (
    type === 'foldable' &&
    (foldState === 'unfolded' || foldState === 'tent' || foldState === 'book')
  ) {
    if (screenAspectRatio > baseAspectRatio) {
      height = availableHeight * 0.92;
      width = height * baseAspectRatio;
    } else {
      width = availableWidth * 0.92;
      height = width / baseAspectRatio;
    }

    scale = width / baseWidth;
  }
  // Tablet - use scale that fits well
  else if (type === 'tablet') {
    if (screenAspectRatio > baseAspectRatio) {
      // Screen is wider - constrain by height
      height = availableHeight * 0.9;
      width = height * baseAspectRatio;
    } else {
      // Screen is narrower - constrain by width
      width = availableWidth * 0.9;
      height = width / baseAspectRatio;
    }

    scale = width / baseWidth;
  }
  // Desktop - use comfortable size with max constraints
  else {
    const maxWidth = Math.min(availableWidth * 0.85, baseWidth * 1.5);
    const maxHeight = Math.min(availableHeight * 0.85, baseHeight * 1.5);

    if (screenAspectRatio > baseAspectRatio) {
      height = maxHeight;
      width = height * baseAspectRatio;
    } else {
      width = maxWidth;
      height = width / baseAspectRatio;
    }

    scale = width / baseWidth;
  }

  // Calculate centering offsets
  const offsetX = safeInsets.left + (availableWidth - width) / 2;
  const offsetY = safeInsets.top + (availableHeight - height) / 2;

  return {
    width: Math.round(width),
    height: Math.round(height),
    scale: Math.round(scale * 1000) / 1000, // Round to 3 decimals
    offsetX: Math.round(offsetX),
    offsetY: Math.round(offsetY),
    aspectRatio: baseAspectRatio,
  };
}

/**
 * Calculate safe area insets for notches, home indicators, etc.
 */
function calculateSafeInsets(deviceInfo: DeviceInfo): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  // Try to use CSS env() values for safe areas
  const computedStyle = getComputedStyle(document.documentElement);

  const top =
    parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0', 10) ||
    (deviceInfo.hasNotch && deviceInfo.orientation === 'portrait' ? 44 : 0);

  const right = parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0', 10) || 0;

  const bottom =
    parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0', 10) ||
    (deviceInfo.isIOS ? 34 : 0); // iOS home indicator

  const left = parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0', 10) || 0;

  return { top, right, bottom, left };
}

/**
 * Create a responsive resize observer for the game canvas
 */
export function createResizeObserver(
  callback: (viewport: ViewportDimensions, deviceInfo: DeviceInfo) => void
): () => void {
  let resizeTimeout: number;
  let orientationTimeout: number;

  const handleResize = () => {
    // Debounce rapid resize events
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      const deviceInfo = detectDevice();
      const viewport = calculateViewport(GAME_WIDTH, GAME_HEIGHT, deviceInfo);
      callback(viewport, deviceInfo);
    }, 150);
  };

  const handleOrientationChange = () => {
    // Orientation change often needs a slight delay to get correct dimensions
    clearTimeout(orientationTimeout);
    orientationTimeout = window.setTimeout(() => {
      const deviceInfo = detectDevice();
      const viewport = calculateViewport(GAME_WIDTH, GAME_HEIGHT, deviceInfo);
      callback(viewport, deviceInfo);
    }, 200);
  };

  // Add event listeners
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleOrientationChange);

  // Visual viewport API for better mobile browser support (address bar showing/hiding)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
  }

  // Call once immediately
  handleResize();

  // Return cleanup function
  return () => {
    clearTimeout(resizeTimeout);
    clearTimeout(orientationTimeout);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleOrientationChange);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleResize);
    }
  };
}

/**
 * Get recommended UI scale for different device types
 */
export function getUIScale(deviceInfo: DeviceInfo): number {
  const { type, screenWidth, pixelRatio } = deviceInfo;

  // Base scale on physical screen density
  const physicalWidth = screenWidth * pixelRatio;

  if (type === 'phone') {
    // Smaller UI for phones
    return physicalWidth < 1000 ? 0.8 : 0.9;
  } else if (type === 'tablet') {
    return 1.0;
  } else if (type === 'foldable') {
    // Depends on fold state
    return deviceInfo.foldState === 'folded' ? 0.85 : 1.0;
  } else {
    // Desktop - can be larger
    return 1.1;
  }
}

/**
 * Convert viewport coordinates to game coordinates
 */
export function viewportToGame(
  x: number,
  y: number,
  viewport: ViewportDimensions
): { x: number; y: number } {
  return {
    x: (x - viewport.offsetX) / viewport.scale,
    y: (y - viewport.offsetY) / viewport.scale,
  };
}

/**
 * Convert game coordinates to viewport coordinates
 */
export function gameToViewport(
  x: number,
  y: number,
  viewport: ViewportDimensions
): { x: number; y: number } {
  return {
    x: x * viewport.scale + viewport.offsetX,
    y: y * viewport.scale + viewport.offsetY,
  };
}
