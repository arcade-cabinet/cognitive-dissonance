import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';

/**
 * Web-only engine initializer. Creates a WebGPU or WebGL2 engine from a
 * canvas element. On native platforms, engine initialization is handled
 * by Reactylon's <NativeEngine> component instead.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Singleton pattern for engine initialization
export class EngineInitializer {
  private static instance: Engine | WebGPUEngine | null = null;

  static async createEngine(canvas: HTMLCanvasElement): Promise<Engine | WebGPUEngine> {
    if (EngineInitializer.instance) {
      return EngineInitializer.instance;
    }

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
    }

    console.log('[EngineInitializer] WebGPU not supported, falling back to WebGL2');
    const engine = new Engine(canvas, true, {
      stencil: true,
      powerPreference: 'high-performance',
    });
    engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
    EngineInitializer.instance = engine;
    return engine;
  }

  static dispose(): void {
    if (EngineInitializer.instance) {
      EngineInitializer.instance.dispose();
      EngineInitializer.instance = null;
    }
  }
}
