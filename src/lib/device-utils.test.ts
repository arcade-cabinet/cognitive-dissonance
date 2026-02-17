import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  calculateViewport,
  createResizeObserver,
  type DeviceInfo,
  detectDevice,
  gameToViewport,
  getUIScale,
  viewportToGame,
} from './device-utils';

describe('device-utils', () => {
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
    delete (window as unknown as Record<string, unknown>).ontouchstart;
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
      Object.defineProperty(window, 'visualViewport', { value: undefined });

      // Should not throw
      const info = detectDevice();
      expect(info).toBeDefined();
    });

    test('detects foldable via window segments if available', () => {
      const getWindowSegments = vi.fn().mockReturnValue([{ x: 0 }, { x: 100 }]);
      Object.defineProperty(window, 'visualViewport', {
        value: {
          getWindowSegments,
        },
        writable: true,
      });

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

    test('calculates viewport for desktop with wide screen', () => {
      const deviceInfo: DeviceInfo = {
        type: 'desktop',
        orientation: 'landscape',
        screenWidth: 1920,
        screenHeight: 1080, // 16:9
        pixelRatio: 1,
        isTouchDevice: false,
        isIOS: false,
        isAndroid: false,
        hasNotch: false,
        isFoldable: false,
      };

      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      // 16:9 > 4:3. Should constrain by height.
      expect(vp.aspectRatio).toBeCloseTo(baseWidth / baseHeight);
    });

    test('calculates viewport for tablet with wide screen', () => {
      const deviceInfo: DeviceInfo = {
        type: 'tablet',
        orientation: 'landscape',
        screenWidth: 1024,
        screenHeight: 600, // Wide
        pixelRatio: 2,
        isTouchDevice: true,
        isIOS: false,
        isAndroid: true,
        hasNotch: false,
        isFoldable: false,
      };

      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      expect(vp.aspectRatio).toBeCloseTo(baseWidth / baseHeight);
    });

    test('calculates viewport for tablet portrait', () => {
      const deviceInfo: DeviceInfo = {
        type: 'tablet',
        orientation: 'portrait',
        screenWidth: 768,
        screenHeight: 1024,
        pixelRatio: 2,
        isTouchDevice: true,
        isIOS: true,
        isAndroid: false,
        hasNotch: false,
        isFoldable: false,
      };

      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      // 0.75 < 1.33. Should constrain by width.
      expect(vp.aspectRatio).toBeCloseTo(baseWidth / baseHeight);
    });

    test('calculates viewport for foldable unfolded', () => {
      const deviceInfo: DeviceInfo = {
        type: 'foldable',
        orientation: 'landscape',
        screenWidth: 2208,
        screenHeight: 1768,
        pixelRatio: 3,
        isTouchDevice: true,
        isIOS: false,
        isAndroid: true,
        hasNotch: false,
        isFoldable: true,
        foldState: 'unfolded',
      };

      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      expect(vp.aspectRatio).toBeCloseTo(baseWidth / baseHeight);
    });

    test('calculates viewport for phone landscape', () => {
      const deviceInfo: DeviceInfo = {
        type: 'phone',
        orientation: 'landscape',
        screenWidth: 812,
        screenHeight: 375,
        pixelRatio: 3,
        isTouchDevice: true,
        isIOS: true,
        isAndroid: false,
        hasNotch: true,
        isFoldable: false,
      };

      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      // Phone landscape Logic.
      // Base aspect 1.33. Screen aspect 2.16.
      // Constrained by height.
      expect(vp.aspectRatio).toBeCloseTo(baseWidth / baseHeight);
    });
  });

  describe('getUIScale', () => {
    test('returns correct scale for phone', () => {
      const info = {
        type: 'phone',
        screenWidth: 375,
        pixelRatio: 2,
      } as Partial<DeviceInfo> as DeviceInfo;
      expect(getUIScale(info)).toBe(0.8); // 375*2 = 750 < 1000
    });

    test('returns correct scale for tablet', () => {
      const info = {
        type: 'tablet',
        screenWidth: 768,
        pixelRatio: 2,
      } as Partial<DeviceInfo> as DeviceInfo;
      expect(getUIScale(info)).toBe(1.0);
    });

    test('returns correct scale for foldable', () => {
      const folded = { type: 'foldable', foldState: 'folded' } as Partial<DeviceInfo> as DeviceInfo;
      expect(getUIScale(folded)).toBe(0.85);

      const unfolded = {
        type: 'foldable',
        foldState: 'unfolded',
      } as Partial<DeviceInfo> as DeviceInfo;
      expect(getUIScale(unfolded)).toBe(1.0);
    });

    test('returns correct scale for desktop', () => {
      const info = { type: 'desktop' } as Partial<DeviceInfo> as DeviceInfo;
      expect(getUIScale(info)).toBe(1.1);
    });
  });

  describe('coordinate conversion', () => {
    const viewport = {
      width: 800,
      height: 600,
      scale: 0.5,
      offsetX: 100,
      offsetY: 50,
      aspectRatio: 1.33,
    };

    test('viewportToGame converts correctly', () => {
      // (150 - 100) / 0.5 = 50 / 0.5 = 100
      // (100 - 50) / 0.5 = 50 / 0.5 = 100
      const gamePos = viewportToGame(150, 100, viewport);
      expect(gamePos.x).toBe(100);
      expect(gamePos.y).toBe(100);
    });

    test('gameToViewport converts correctly', () => {
      // 100 * 0.5 + 100 = 50 + 100 = 150
      // 100 * 0.5 + 50 = 50 + 50 = 100
      const viewPos = gameToViewport(100, 100, viewport);
      expect(viewPos.x).toBe(150);
      expect(viewPos.y).toBe(100);
    });
  });

  describe('createResizeObserver', () => {
    test('sets up and cleans up listeners', () => {
      vi.useFakeTimers();
      const addEventListener = vi.spyOn(window, 'addEventListener');
      const removeEventListener = vi.spyOn(window, 'removeEventListener');
      const callback = vi.fn();

      const cleanup = createResizeObserver(callback);

      expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(addEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function));

      // Initial call triggers after debounce
      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalled();

      cleanup();
      vi.useRealTimers();

      expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    });

    test('uses visualViewport if available', () => {
      vi.useFakeTimers();
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();
      Object.defineProperty(window, 'visualViewport', {
        value: {
          addEventListener,
          removeEventListener,
        },
        writable: true,
      });

      const callback = vi.fn();
      const cleanup = createResizeObserver(callback);

      expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));

      cleanup();
      expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      vi.useRealTimers();
    });

    test('handles orientation change', () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      const cleanup = createResizeObserver(callback);

      // Trigger orientation change
      window.dispatchEvent(new Event('orientationchange'));

      // Should debounce/delay
      expect(callback).not.toHaveBeenCalled();

      // Orientation change delay is 200ms
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalled();

      cleanup();
      vi.useRealTimers();
    });
  });
});
