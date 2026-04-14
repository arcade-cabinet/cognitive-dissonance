/**
 * Device detection and responsive scaling helpers.
 *
 * Uses `@capacitor/device` when running as a Capacitor native app (iOS/Android),
 * and falls back to browser heuristics on the web. All values are cached after
 * first call — platform never changes at runtime.
 */

import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

export type Platform = 'web' | 'ios' | 'android';
export type FormFactor = 'phone' | 'tablet' | 'desktop';

export interface DeviceProfile {
  platform: Platform;
  formFactor: FormFactor;
  isNative: boolean;
  isMobile: boolean;
  isTouch: boolean;
  /** CSS logical pixels (matches window.innerWidth/innerHeight) */
  viewportWidth: number;
  viewportHeight: number;
  /** Device pixel ratio for canvas backing buffer sizing */
  pixelRatio: number;
  /** Aspect ratio: width / height */
  aspectRatio: number;
  /** true if height > width */
  isPortrait: boolean;
}

let cachedProfile: DeviceProfile | null = null;

/**
 * Compute the current device profile. Call once at app startup and pass the
 * result through context/props. Re-compute on orientationchange.
 */
export async function detectDevice(): Promise<DeviceProfile> {
  if (cachedProfile) return cachedProfile;

  const isNative = Capacitor.isNativePlatform();
  let platform: Platform = 'web';

  if (isNative) {
    const info = await Device.getInfo();
    if (info.platform === 'ios') platform = 'ios';
    else if (info.platform === 'android') platform = 'android';
    else platform = 'web'; // electron/other native shells fall back to web
  }

  // Cache window once — avoid repeated typeof checks. globalThis.window is
  // undefined in non-browser runtimes (server, workers); the fallback values
  // are sane defaults for SSR-hydration paths the game doesn't currently use
  // but might in the future.
  const w = typeof globalThis.window === 'undefined' ? null : globalThis.window;
  const viewportWidth = w?.innerWidth ?? 1280;
  const viewportHeight = w?.innerHeight ?? 800;
  const pixelRatio = w?.devicePixelRatio || 1;
  const aspectRatio = viewportWidth / viewportHeight;
  const isPortrait = viewportHeight > viewportWidth;

  // Form factor heuristics — min dimension of the viewport in CSS px
  const minDim = Math.min(viewportWidth, viewportHeight);
  const maxDim = Math.max(viewportWidth, viewportHeight);
  let formFactor: FormFactor;
  if (isNative) {
    // Native: phone if min < 600 CSS px, tablet otherwise
    formFactor = minDim < 600 ? 'phone' : 'tablet';
  } else if (minDim < 600 || maxDim < 960) {
    formFactor = 'phone';
  } else if (minDim < 1024) {
    formFactor = 'tablet';
  } else {
    formFactor = 'desktop';
  }

  const isMobile = formFactor !== 'desktop' || isNative;
  const isTouch = w !== null && ('ontouchstart' in w || (w.navigator.maxTouchPoints ?? 0) > 0);

  cachedProfile = {
    platform,
    formFactor,
    isNative,
    isMobile,
    isTouch,
    viewportWidth,
    viewportHeight,
    pixelRatio,
    aspectRatio,
    isPortrait,
  };

  return cachedProfile;
}

/**
 * Reset the cache (call on orientationchange / window resize).
 */
export function invalidateDeviceProfile(): void {
  cachedProfile = null;
}

/**
 * Pick a render scale factor appropriate for the device.
 *
 * - Phone: 1.0 (no supersampling — GPU is precious)
 * - Tablet: up to 1.5 (mild sharpness bump, capped at 1.5x CSS pixels)
 * - Desktop: pixelRatio up to 2 (native retina, capped at 2x)
 *
 * Keep canvas backing-buffer = cssWidth * renderScale.
 */
export function getRenderScale(profile: DeviceProfile): number {
  if (profile.formFactor === 'desktop') return Math.min(profile.pixelRatio, 2);
  if (profile.formFactor === 'tablet') return Math.min(profile.pixelRatio, 1.5);
  return 1;
}
