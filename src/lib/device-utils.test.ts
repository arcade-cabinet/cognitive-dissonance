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
      expect(vp.offsetY).toBeGreaterThanOrEqual(44);
    });

    // ─── Enhanced Tests for full coverage ───

    test('calculates viewport for foldable (folded, portrait)', () => {
      const deviceInfo: DeviceInfo = {
        type: 'foldable',
        orientation: 'portrait',
        screenWidth: 300,
        screenHeight: 800,
        pixelRatio: 2,
        isTouchDevice: true,
        isIOS: false,
        isAndroid: true,
        hasNotch: false,
        isFoldable: true,
        foldState: 'folded',
      };

      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      // Should fit within width (maxDim = min(300, 800 * 0.8) = 300)
      expect(vp.width).toBe(300);
      expect(vp.height).toBeCloseTo(300 / (800 / 600));
    });

    test('calculates viewport for foldable (folded, landscape)', () => {
      const deviceInfo: DeviceInfo = {
        type: 'foldable',
        orientation: 'landscape',
        screenWidth: 800,
        screenHeight: 300,
        pixelRatio: 2,
        isTouchDevice: true,
        isIOS: false,
        isAndroid: true,
        hasNotch: false,
        isFoldable: true,
        foldState: 'folded',
      };

      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      // Should fit within height (maxDim = min(800, 300 * 0.8) = 240)
      expect(vp.height).toBe(240);
      expect(vp.width).toBeCloseTo(240 * (800 / 600));
    });

    test('calculates viewport for foldable (unfolded)', () => {
      const deviceInfo: DeviceInfo = {
        type: 'foldable',
        orientation: 'landscape',
        screenWidth: 1000,
        screenHeight: 800,
        pixelRatio: 2,
        isTouchDevice: true,
        isIOS: false,
        isAndroid: true,
        hasNotch: false,
        isFoldable: true,
        foldState: 'unfolded',
      };

      // screenAspectRatio = 1.25, base = 1.33. Screen is narrower than base.
      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      // Should constrain by width
      expect(vp.width).toBe(1000 * 0.92);
      expect(vp.height).toBeCloseTo((1000 * 0.92) / (800 / 600));
    });

    test('calculates viewport for phone landscape (constrained by height)', () => {
      const deviceInfo: DeviceInfo = {
        type: 'phone',
        orientation: 'landscape',
        screenWidth: 800,
        screenHeight: 300,
        pixelRatio: 2,
        isTouchDevice: true,
        isIOS: false,
        isAndroid: true,
        hasNotch: false,
        isFoldable: false,
      };

      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      // Height constraint kicks in: 300 * 0.98 = 294
      expect(vp.height).toBe(294);
      expect(vp.width).toBeCloseTo(294 * (800 / 600));
    });

    test('calculates viewport for tablet (wider screen)', () => {
      const deviceInfo: DeviceInfo = {
        type: 'tablet',
        orientation: 'landscape',
        screenWidth: 1200,
        screenHeight: 800,
        pixelRatio: 2,
        isTouchDevice: true,
        isIOS: false,
        isAndroid: true,
        hasNotch: false,
        isFoldable: false,
      };

      // 1200/800 = 1.5 > 1.33. Wider. Constrain by height.
      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      expect(vp.height).toBe(800 * 0.9);
      expect(vp.width).toBeCloseTo(800 * 0.9 * (800 / 600));
    });

    test('calculates viewport for tablet (narrower screen)', () => {
      const deviceInfo: DeviceInfo = {
        type: 'tablet',
        orientation: 'portrait',
        screenWidth: 800,
        screenHeight: 1200,
        pixelRatio: 2,
        isTouchDevice: true,
        isIOS: false,
        isAndroid: true,
        hasNotch: false,
        isFoldable: false,
      };

      // 0.66 < 1.33. Narrower. Constrain by width.
      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      expect(vp.width).toBe(800 * 0.9);
      expect(vp.height).toBeCloseTo((800 * 0.9) / (800 / 600));
    });

    test('calculates viewport for desktop (wider screen)', () => {
      const deviceInfo: DeviceInfo = {
        type: 'desktop',
        orientation: 'landscape',
        screenWidth: 1600,
        screenHeight: 900,
        pixelRatio: 1,
        isTouchDevice: false,
        isIOS: false,
        isAndroid: false,
        hasNotch: false,
        isFoldable: false,
      };

      // 1.77 > 1.33. Wider. Constrain by height.
      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      // Max height is min(900*0.85, 600*1.5=900) -> 765
      expect(vp.height).toBe(765);
      expect(vp.width).toBeCloseTo(765 * (800 / 600));
    });

    test('calculates viewport for desktop (narrower screen)', () => {
      const deviceInfo: DeviceInfo = {
        type: 'desktop',
        orientation: 'landscape',
        screenWidth: 1000,
        screenHeight: 1000,
        pixelRatio: 1,
        isTouchDevice: false,
        isIOS: false,
        isAndroid: false,
        hasNotch: false,
        isFoldable: false,
      };

      // 1.0 < 1.33. Narrower. Constrain by width.
      const vp = calculateViewport(baseWidth, baseHeight, deviceInfo);
      // Max width is min(1000*0.85=850, 800*1.5=1200) -> 850
      expect(vp.width).toBe(850);
      // 850 / (800/600) = 637.5 -> rounds to 638
      expect(vp.height).toBe(638);
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
  });
});
