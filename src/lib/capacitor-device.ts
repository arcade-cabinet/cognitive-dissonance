/**
 * Capacitor Device Integration
 *
 * Native device detection and capabilities using Capacitor APIs.
 * Provides better device information than web APIs alone.
 */

import { Capacitor } from '@capacitor/core';
import { type DeviceInfo as CapDeviceInfo, Device } from '@capacitor/device';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { type OrientationLockType, ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar, Style } from '@capacitor/status-bar';

export interface EnhancedDeviceInfo {
  // Basic info
  platform: 'ios' | 'android' | 'web';
  manufacturer: string;
  model: string;
  osVersion: string;

  // Screen info
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  isTablet: boolean;

  // Capabilities
  isNative: boolean;
  hasNotch: boolean;
  hasHaptics: boolean;
  hasKeyboard: boolean;

  // Orientation
  orientation: 'portrait' | 'landscape';
  canRotate: boolean;

  // Device type classification
  deviceType: 'phone' | 'tablet' | 'foldable' | 'desktop';
  formFactor: 'small' | 'medium' | 'large' | 'xlarge';
}

/**
 * Get comprehensive device information using Capacitor
 */
export async function getDeviceInfo(): Promise<EnhancedDeviceInfo> {
  const isNative = Capacitor.isNativePlatform();

  let deviceInfo: CapDeviceInfo | null = null;

  if (isNative) {
    try {
      deviceInfo = await Device.getInfo();
    } catch (error) {
      console.warn('Failed to get native device info:', error);
    }
  }

  // Screen dimensions
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;

  // Orientation
  const orientation: 'portrait' | 'landscape' =
    screenWidth > screenHeight ? 'landscape' : 'portrait';

  // Platform
  const platform = (deviceInfo?.platform || Capacitor.getPlatform()) as 'ios' | 'android' | 'web';

  // Detect tablet vs phone
  const isTablet = detectIsTablet(deviceInfo, screenWidth, screenHeight);

  // Device type
  const deviceType = classifyDeviceType(platform, isTablet, screenWidth, screenHeight);

  // Form factor based on physical size
  const formFactor = classifyFormFactor(screenWidth, screenHeight, pixelRatio);

  // Notch detection
  const hasNotch = detectNotch(platform, deviceInfo, screenWidth, screenHeight);

  // Capabilities
  const hasHaptics = isNative && platform !== 'web';
  const hasKeyboard = platform === 'android' || platform === 'ios';
  const canRotate = isNative || platform === 'web';

  return {
    platform,
    manufacturer: deviceInfo?.manufacturer || 'Unknown',
    model: deviceInfo?.model || 'Unknown',
    osVersion: deviceInfo?.osVersion || 'Unknown',
    screenWidth,
    screenHeight,
    pixelRatio,
    isTablet,
    isNative,
    hasNotch,
    hasHaptics,
    hasKeyboard,
    orientation,
    canRotate,
    deviceType,
    formFactor,
  };
}

/**
 * Detect if device is a tablet
 */
function detectIsTablet(
  deviceInfo: CapDeviceInfo | null,
  screenWidth: number,
  screenHeight: number
): boolean {
  // Native detection (most reliable)
  if (deviceInfo?.isVirtual !== undefined) {
    // Use native API if available
    const minDimension = Math.min(screenWidth, screenHeight);

    // iPad detection
    if (deviceInfo.platform === 'ios' && deviceInfo.model?.includes('iPad')) {
      return true;
    }

    // Android tablet detection
    if (deviceInfo.platform === 'android') {
      // Android tablets typically have sw600dp or larger
      // This roughly translates to 600+ CSS pixels in smallest dimension
      return minDimension >= 600;
    }
  }

  // Fallback to dimension-based detection
  const minDim = Math.min(screenWidth, screenHeight);
  return minDim >= 600;
}

/**
 * Classify device type
 */
function classifyDeviceType(
  platform: string,
  isTablet: boolean,
  screenWidth: number,
  screenHeight: number
): 'phone' | 'tablet' | 'foldable' | 'desktop' {
  if (platform === 'web') {
    return 'desktop';
  }

  // Check for foldable indicators
  const aspectRatio = Math.max(screenWidth, screenHeight) / Math.min(screenWidth, screenHeight);
  const isFoldableAspect = aspectRatio > 2.0 || aspectRatio < 0.5;

  if (isFoldableAspect) {
    return 'foldable';
  }

  return isTablet ? 'tablet' : 'phone';
}

/**
 * Classify form factor by physical screen size
 */
function classifyFormFactor(
  width: number,
  height: number,
  pixelRatio: number
): 'small' | 'medium' | 'large' | 'xlarge' {
  // Calculate physical size approximation
  const physicalWidth = width * pixelRatio;
  const physicalHeight = height * pixelRatio;
  const diagonalPixels = Math.sqrt(physicalWidth ** 2 + physicalHeight ** 2);

  // Rough classification based on diagonal
  if (diagonalPixels < 1000) return 'small'; // Small phones
  if (diagonalPixels < 1500) return 'medium'; // Regular phones
  if (diagonalPixels < 2500) return 'large'; // Phablets/small tablets
  return 'xlarge'; // Large tablets/foldables
}

/**
 * Detect device notch
 */
function detectNotch(
  platform: string,
  deviceInfo: CapDeviceInfo | null,
  width: number,
  height: number
): boolean {
  if (platform !== 'ios') return false;

  // Known iPhone models with notch
  const model = deviceInfo?.model?.toLowerCase() || '';
  const hasNotchModel =
    model.includes('iphone') &&
    (model.includes('x') ||
      model.includes('11') ||
      model.includes('12') ||
      model.includes('13') ||
      model.includes('14') ||
      model.includes('15'));

  if (hasNotchModel) return true;

  // Fallback: check for specific resolutions
  const pixelRatio = window.devicePixelRatio || 1;
  const physicalWidth = width * pixelRatio;
  const physicalHeight = height * pixelRatio;

  // Known iPhone X series resolutions
  const notchResolutions = [
    { w: 1125, h: 2436 }, // iPhone X, XS, 11 Pro
    { w: 1242, h: 2688 }, // iPhone XS Max, 11 Pro Max
    { w: 828, h: 1792 }, // iPhone XR, 11
    { w: 1170, h: 2532 }, // iPhone 12, 12 Pro, 13, 13 Pro, 14
    { w: 1284, h: 2778 }, // iPhone 12 Pro Max, 13 Pro Max, 14 Plus
    { w: 1179, h: 2556 }, // iPhone 14 Pro, 15, 15 Pro
    { w: 1290, h: 2796 }, // iPhone 14 Pro Max, 15 Plus, 15 Pro Max
  ];

  return notchResolutions.some(
    (res) =>
      (physicalWidth === res.w && physicalHeight === res.h) ||
      (physicalWidth === res.h && physicalHeight === res.w)
  );
}

/**
 * Initialize native platform features
 */
export async function initializePlatform(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('Running in web mode - native features unavailable');
    return;
  }

  const platform = Capacitor.getPlatform();

  try {
    // Configure status bar
    if (platform === 'ios' || platform === 'android') {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0a0a18' });
    }

    // Configure keyboard behavior
    Keyboard.setAccessoryBarVisible({ isVisible: false });

    // Lock orientation to landscape for optimal gameplay (optional)
    // await ScreenOrientation.lock({ orientation: 'landscape' });

    console.log('Platform initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize platform features:', error);
  }
}

/**
 * Get safe area insets (native implementation)
 */
export async function getSafeAreaInsets(): Promise<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}> {
  if (!Capacitor.isNativePlatform()) {
    // Fallback to CSS env variables
    const computedStyle = getComputedStyle(document.documentElement);
    return {
      top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0', 10) || 0,
      right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0', 10) || 0,
      bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0', 10) || 0,
      left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0', 10) || 0,
    };
  }

  // Native implementation would use platform-specific APIs
  // For now, use device info to estimate
  const deviceInfo = await getDeviceInfo();

  return {
    top: deviceInfo.hasNotch ? 44 : 0,
    right: 0,
    bottom: deviceInfo.platform === 'ios' ? 34 : 0,
    left: 0,
  };
}

/**
 * Lock screen orientation
 */
export async function lockOrientation(
  orientation: 'portrait' | 'landscape' | 'any'
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('Orientation lock not available in web mode');
    return;
  }

  try {
    const orientationType: OrientationLockType =
      orientation === 'any' ? 'any' : orientation === 'portrait' ? 'portrait' : 'landscape';

    await ScreenOrientation.lock({ orientation: orientationType });
  } catch (error) {
    console.warn('Failed to lock orientation:', error);
  }
}

/**
 * Unlock screen orientation
 */
export async function unlockOrientation(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await ScreenOrientation.unlock();
  } catch (error) {
    console.warn('Failed to unlock orientation:', error);
  }
}

/**
 * Get current orientation
 */
export async function getCurrentOrientation(): Promise<'portrait' | 'landscape'> {
  if (!Capacitor.isNativePlatform()) {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  try {
    const result = await ScreenOrientation.orientation();
    return result.type.includes('portrait') ? 'portrait' : 'landscape';
  } catch (error) {
    console.warn('Failed to get orientation:', error);
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }
}

/**
 * Trigger haptic feedback
 */
export async function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const impactStyle =
      style === 'light'
        ? ImpactStyle.Light
        : style === 'heavy'
          ? ImpactStyle.Heavy
          : ImpactStyle.Medium;

    await Haptics.impact({ style: impactStyle });
  } catch (_error) {
    // Silently fail for haptics
  }
}

/**
 * Listen for orientation changes
 */
export function addOrientationListener(
  callback: (orientation: 'portrait' | 'landscape') => void
): () => void {
  if (!Capacitor.isNativePlatform()) {
    // Fallback to window events
    const handler = () => {
      const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      callback(orientation);
    };

    window.addEventListener('orientationchange', handler);
    window.addEventListener('resize', handler);

    return () => {
      window.removeEventListener('orientationchange', handler);
      window.removeEventListener('resize', handler);
    };
  }

  // Native orientation listener
  let listenerHandle: { remove: () => void } | null = null;

  ScreenOrientation.addListener('screenOrientationChange', (result) => {
    const orientation = result.type.includes('portrait') ? 'portrait' : 'landscape';
    callback(orientation);
  }).then((handle) => {
    listenerHandle = handle;
  });

  return () => {
    if (listenerHandle) {
      listenerHandle.remove();
    }
  };
}

/**
 * Hide keyboard (useful for game focus)
 */
export async function hideKeyboard(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await Keyboard.hide();
  } catch (error) {
    console.warn('Failed to hide keyboard:', error);
  }
}

/**
 * Check if app is in foreground
 */
export function isAppActive(): boolean {
  if (!Capacitor.isNativePlatform()) {
    return document.visibilityState === 'visible';
  }

  // In native context, assume active (can be enhanced with App plugin listeners)
  return true;
}
