// Mock @babylonjs/core engine modules
const mockInitAsync = jest.fn().mockResolvedValue(undefined);
const mockSetHardwareScalingLevel = jest.fn();
const mockDispose = jest.fn();

const mockWebGPUEngine = jest.fn().mockImplementation(() => ({
  initAsync: mockInitAsync,
  setHardwareScalingLevel: mockSetHardwareScalingLevel,
  dispose: mockDispose,
}));

const mockEngine = jest.fn().mockImplementation(() => ({
  setHardwareScalingLevel: mockSetHardwareScalingLevel,
  dispose: mockDispose,
}));

jest.mock('@babylonjs/core/Engines/webgpuEngine', () => ({
  WebGPUEngine: Object.assign(mockWebGPUEngine, {
    IsSupportedAsync: Promise.resolve(true),
  }),
}));

jest.mock('@babylonjs/core/Engines/engine', () => ({
  Engine: mockEngine,
}));

import { EngineInitializer } from '../EngineInitializer';

// Mock window.devicePixelRatio in Node test environment
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {};
}
Object.defineProperty(globalThis.window, 'devicePixelRatio', { value: 2, writable: true, configurable: true });

describe('EngineInitializer', () => {
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Reset singleton
    (EngineInitializer as any).instance = null;
    mockWebGPUEngine.mockClear();
    mockEngine.mockClear();
    mockInitAsync.mockClear();
    mockSetHardwareScalingLevel.mockClear();
    mockDispose.mockClear();
    mockCanvas = {} as HTMLCanvasElement;
  });

  afterEach(() => {
    EngineInitializer.dispose();
  });

  describe('createEngine', () => {
    it('creates WebGPU engine when supported', async () => {
      const { WebGPUEngine } = require('@babylonjs/core/Engines/webgpuEngine');
      WebGPUEngine.IsSupportedAsync = Promise.resolve(true);

      const engine = await EngineInitializer.createEngine(mockCanvas);

      expect(mockWebGPUEngine).toHaveBeenCalledWith(mockCanvas, {
        stencil: true,
        powerPreference: 'high-performance',
      });
      expect(mockInitAsync).toHaveBeenCalled();
      expect(engine).toBeDefined();
    });

    it('calls setHardwareScalingLevel with devicePixelRatio for WebGPU', async () => {
      const { WebGPUEngine } = require('@babylonjs/core/Engines/webgpuEngine');
      WebGPUEngine.IsSupportedAsync = Promise.resolve(true);

      await EngineInitializer.createEngine(mockCanvas);

      expect(mockSetHardwareScalingLevel).toHaveBeenCalledWith(1 / window.devicePixelRatio);
    });

    it('falls back to WebGL2 when WebGPU is not supported', async () => {
      const { WebGPUEngine } = require('@babylonjs/core/Engines/webgpuEngine');
      WebGPUEngine.IsSupportedAsync = Promise.resolve(false);

      // Reset singleton so we get a fresh creation
      (EngineInitializer as any).instance = null;

      const engine = await EngineInitializer.createEngine(mockCanvas);

      expect(mockEngine).toHaveBeenCalledWith(mockCanvas, true, {
        stencil: true,
        powerPreference: 'high-performance',
      });
      expect(engine).toBeDefined();
    });

    it('calls setHardwareScalingLevel with devicePixelRatio for WebGL', async () => {
      const { WebGPUEngine } = require('@babylonjs/core/Engines/webgpuEngine');
      WebGPUEngine.IsSupportedAsync = Promise.resolve(false);
      (EngineInitializer as any).instance = null;

      await EngineInitializer.createEngine(mockCanvas);

      expect(mockSetHardwareScalingLevel).toHaveBeenCalledWith(1 / window.devicePixelRatio);
    });

    it('returns existing instance on subsequent calls', async () => {
      const { WebGPUEngine } = require('@babylonjs/core/Engines/webgpuEngine');
      WebGPUEngine.IsSupportedAsync = Promise.resolve(true);

      const engine1 = await EngineInitializer.createEngine(mockCanvas);
      const engine2 = await EngineInitializer.createEngine(mockCanvas);

      expect(engine1).toBe(engine2);
      // Constructor should only be called once
      expect(mockWebGPUEngine).toHaveBeenCalledTimes(1);
    });

    it('does not create a second engine when instance already exists', async () => {
      const { WebGPUEngine } = require('@babylonjs/core/Engines/webgpuEngine');
      WebGPUEngine.IsSupportedAsync = Promise.resolve(true);

      await EngineInitializer.createEngine(mockCanvas);
      mockWebGPUEngine.mockClear();
      mockEngine.mockClear();

      await EngineInitializer.createEngine(mockCanvas);

      expect(mockWebGPUEngine).not.toHaveBeenCalled();
      expect(mockEngine).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('disposes the engine instance', async () => {
      const { WebGPUEngine } = require('@babylonjs/core/Engines/webgpuEngine');
      WebGPUEngine.IsSupportedAsync = Promise.resolve(true);

      await EngineInitializer.createEngine(mockCanvas);
      EngineInitializer.dispose();

      expect(mockDispose).toHaveBeenCalled();
    });

    it('sets instance to null after dispose', async () => {
      const { WebGPUEngine } = require('@babylonjs/core/Engines/webgpuEngine');
      WebGPUEngine.IsSupportedAsync = Promise.resolve(true);

      await EngineInitializer.createEngine(mockCanvas);
      EngineInitializer.dispose();

      expect((EngineInitializer as any).instance).toBeNull();
    });

    it('is a no-op when no instance exists', () => {
      // Should not throw
      EngineInitializer.dispose();
      expect(mockDispose).not.toHaveBeenCalled();
    });

    it('allows creating a new engine after dispose', async () => {
      const { WebGPUEngine } = require('@babylonjs/core/Engines/webgpuEngine');
      WebGPUEngine.IsSupportedAsync = Promise.resolve(true);

      await EngineInitializer.createEngine(mockCanvas);
      EngineInitializer.dispose();
      mockWebGPUEngine.mockClear();

      const newEngine = await EngineInitializer.createEngine(mockCanvas);

      expect(newEngine).toBeDefined();
      expect(mockWebGPUEngine).toHaveBeenCalledTimes(1);
    });
  });
});
