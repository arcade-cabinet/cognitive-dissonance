/**
 * PlatformConfig tests.
 *
 * We need to isolate each module load because PlatformConfig evaluates
 * Platform.OS at import time. We use jest.isolateModules for each test
 * to get a fresh import with the mocked Platform.OS value.
 */

describe('PlatformConfig', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when Platform.OS is "web"', () => {
    it('isWeb is true', () => {
      jest.isolateModules(() => {
        jest.doMock('react-native', () => ({
          Platform: { OS: 'web' },
        }));
        const { isWeb } = require('../PlatformConfig');
        expect(isWeb).toBe(true);
      });
    });

    it('isNative is false', () => {
      jest.isolateModules(() => {
        jest.doMock('react-native', () => ({
          Platform: { OS: 'web' },
        }));
        const { isNative } = require('../PlatformConfig');
        expect(isNative).toBe(false);
      });
    });
  });

  describe('when Platform.OS is "ios"', () => {
    it('isWeb is false', () => {
      jest.isolateModules(() => {
        jest.doMock('react-native', () => ({
          Platform: { OS: 'ios' },
        }));
        const { isWeb } = require('../PlatformConfig');
        expect(isWeb).toBe(false);
      });
    });

    it('isNative is true', () => {
      jest.isolateModules(() => {
        jest.doMock('react-native', () => ({
          Platform: { OS: 'ios' },
        }));
        const { isNative } = require('../PlatformConfig');
        expect(isNative).toBe(true);
      });
    });
  });

  describe('when Platform.OS is "android"', () => {
    it('isWeb is false', () => {
      jest.isolateModules(() => {
        jest.doMock('react-native', () => ({
          Platform: { OS: 'android' },
        }));
        const { isWeb } = require('../PlatformConfig');
        expect(isWeb).toBe(false);
      });
    });

    it('isNative is true', () => {
      jest.isolateModules(() => {
        jest.doMock('react-native', () => ({
          Platform: { OS: 'android' },
        }));
        const { isNative } = require('../PlatformConfig');
        expect(isNative).toBe(true);
      });
    });
  });

  describe('when Platform.OS is "windows" (unsupported)', () => {
    it('isWeb is false', () => {
      jest.isolateModules(() => {
        jest.doMock('react-native', () => ({
          Platform: { OS: 'windows' },
        }));
        const { isWeb } = require('../PlatformConfig');
        expect(isWeb).toBe(false);
      });
    });

    it('isNative is false', () => {
      jest.isolateModules(() => {
        jest.doMock('react-native', () => ({
          Platform: { OS: 'windows' },
        }));
        const { isNative } = require('../PlatformConfig');
        expect(isNative).toBe(false);
      });
    });
  });

  describe('default mock (web)', () => {
    // The default jest mock for react-native maps to src/__mocks__/react-native.ts
    // which sets Platform.OS = 'web'
    it('uses the default mock Platform.OS = web', () => {
      jest.isolateModules(() => {
        jest.doMock('react-native', () => ({
          Platform: { OS: 'web' },
        }));
        const { isWeb, isNative } = require('../PlatformConfig');
        expect(isWeb).toBe(true);
        expect(isNative).toBe(false);
      });
    });
  });
});
