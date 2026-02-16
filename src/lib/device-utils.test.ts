import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { calculateViewport, type DeviceInfo, detectDevice } from './device-utils';

describe('device-utils', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _originalWindow = { ...window };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _originalNavigator = { ...navigator };

  beforeEach(() => {
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 600,
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: 1,
    });

    // Reset navigator
    Object.defineProperty(window, 'navigator', {
      writable: true,
      configurable: true,
      value: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        maxTouchPoints: 0,
      },
    });

    // Reset visualViewport
    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      configurable: true,
      value: undefined,
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });

    // Ensure ontouchstart is undefined for desktop tests
    // @ts-expect-error
    delete window.ontouchstart;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectDevice', () => {
    test('detects desktop device', () => {
      const info = detectDevice();
      expect(info.type).toBe('desktop');
      expect(info.isTouchDevice).toBe(false);
      expect(info.orientation).toBe('landscape');
    });

    test('detects mobile phone (portrait)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)',
          maxTouchPoints: 1,
        },
      });

      const info = detectDevice();
      expect(info.type).toBe('phone');
      expect(info.isTouchDevice).toBe(true);
      expect(info.orientation).toBe('portrait');
      expect(info.isIOS).toBe(true);
    });

    test('detects tablet', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      Object.defineProperty(window, 'innerHeight', { value: 1024 });
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X)',
          maxTouchPoints: 1,
        },
      });

      const info = detectDevice();
      expect(info.type).toBe('tablet');
      expect(info.orientation).toBe('portrait');
    });

    test('detects foldable device via user agent', () => {
      Object.defineProperty(window, 'innerWidth', { value: 280 });
      Object.defineProperty(window, 'innerHeight', { value: 653 });
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Linux; Android 11; SM-F916U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
          maxTouchPoints: 1,
        },
      });

      const info = detectDevice();
      expect(info.type).toBe('foldable');
      expect(info.isFoldable).toBe(true);
      expect(info.foldState).toBe('folded');
    });

    test('safely handles missing visualViewport', () => {
      // Ensure visualViewport is undefined
      // @ts-expect-error
      window.visualViewport = undefined;

      // Should not throw
      const info = detectDevice();
      expect(info).toBeDefined();
    });

    test('detects foldable via window segments if available', () => {
      const getWindowSegments = vi.fn().mockReturnValue([{ x: 0 }, { x: 100 }]);
      // @ts-expect-error
      window.visualViewport = {
        getWindowSegments,
      };

      const info = detectDevice();
      expect(info.isFoldable).toBe(true);
    });
  });

  describe('calculateViewport', () => {
    const baseWidth = 800;
    const baseHeight = 600;

    test('calculates viewport for desktop', () => {
      const deviceInfo: DeviceInfo = {
        type: 'desktop',
        orientation: 'landscape',
        screenWidth: 1024,
        screenHeight: 768,
        pixelRatio: 1,
        isTouchDevice: false,
        isIOS: false,
        isAndroid: false,
        hasNotch: false,
        isFoldable: false,
      };

      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      // Expected: height constrained to 85% of 768 = ~652.
      // But 800x600 fits within 1024x768 comfortably.
      // The logic:
      // scale = width / baseWidth
      // We expect it to maintain aspect ratio.
      expect(vp.aspectRatio).toBeCloseTo(baseWidth / baseHeight);
      expect(vp.width / vp.height).toBeCloseTo(baseWidth / baseHeight);
    });

    test('calculates viewport for phone portrait', () => {
      const deviceInfo: DeviceInfo = {
        type: 'phone',
        orientation: 'portrait',
        screenWidth: 375,
        screenHeight: 667,
        pixelRatio: 2,
        isTouchDevice: true,
        isIOS: true,
        isAndroid: false,
        hasNotch: false,
        isFoldable: false,
      };

      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      // Should use most of the width
      expect(vp.width).toBeLessThan(375);
      expect(vp.width).toBeGreaterThan(300);
      expect(vp.aspectRatio).toBeCloseTo(4 / 3);
    });

    test('handles notch safely', () => {
      const deviceInfo: DeviceInfo = {
        type: 'phone',
        orientation: 'portrait',
        screenWidth: 375,
        screenHeight: 812,
        pixelRatio: 3,
        isTouchDevice: true,
        isIOS: true,
        isAndroid: false,
        hasNotch: true, // iPhone X
        isFoldable: false,
      };

      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      // Ensure offsets account for notch (mocked via CSS check logic fallback)
      // Since we can't easily mock getComputedStyle here for env(), we rely on the hardcoded fallback in calculateSafeInsets
      // top notch is 44px
      expect(vp.offsetY).toBeGreaterThanOrEqual(44);
    });
  });
});
