import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { isWeb } from '../utils/PlatformConfig';

// biome-ignore lint/complexity/noStaticOnlyClass: Singleton pattern for engine initialization
export class EngineInitializer {
  private static instance: Engine | WebGPUEngine | null = null;

  // biome-ignore lint/suspicious/noExplicitAny: Native canvas type is platform-specific
  static async createEngine(canvas: HTMLCanvasElement | any): Promise<Engine | WebGPUEngine> {
    if (EngineInitializer.instance) {
      return EngineInitializer.instance;
    }

    if (isWeb) {
      // Web: Try WebGPU first, fallback to WebGL2
      const webGPUSupported = await WebGPUEngine.IsSupportedAsync;

      if (webGPUSupported) {
        console.log('[EngineInitializer] Creating WebGPUEngine');
        const engine = new WebGPUEngine(canvas, {
          stencil: true,
          powerPreference: 'high-performance',
        });
        await engine.initAsync();
        engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
        EngineInitializer.instance = engine;
        return engine;
      } else {
        console.log('[EngineInitializer] WebGPU not supported, falling back to WebGL2');
        const engine = new Engine(canvas, true, {
          stencil: true,
          powerPreference: 'high-performance',
        });
        engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
        EngineInitializer.instance = engine;
        return engine;
      }
    } else {
      // Native: Babylon Native via Reactylon Native
      // The engine is created by Reactylon Native's native module
      // This path is handled by the Reactylon <Engine> component
      throw new Error('[EngineInitializer] Native engine initialization should be handled by Reactylon Native');
    }
  }

  static dispose(): void {
    if (EngineInitializer.instance) {
      EngineInitializer.instance.dispose();
      EngineInitializer.instance = null;
    }
  }
}
