import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import { MechanicalHaptics } from '../xr/MechanicalHaptics';
import type { TensionSystem } from './TensionSystem';

// echoGhost shaders are registered in src/shaders/registry.ts

/**
 * EchoSystem — Singleton managing ghost keycap replays of missed patterns
 *
 * When a pattern reaches the platter rim without stabilization:
 * - Spawns a distorted silhouette (low-poly icosphere with vertex displacement)
 * - Applies scan-line transparency effect via echoGhost ShaderMaterial
 * - Auto-disposes after 1800ms
 * - Increases tension by 0.012
 * - Triggers medium haptic pulse
 * - One active echo per key maximum
 *
 * Validates: Requirement 20 (Echo System)
 */
export class EchoSystem {
  private static instance: EchoSystem | null = null;

  private scene: Scene | null = null;
  private tensionSystem: TensionSystem | null = null;
  private activeEchoes: Map<string, Mesh> = new Map();
  private echoTimers: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): EchoSystem {
    if (!EchoSystem.instance) {
      EchoSystem.instance = new EchoSystem();
    }
    return EchoSystem.instance;
  }

  /**
   * Initialize the system with scene and tension system references.
   */
  initialize(scene: Scene, tensionSystem: TensionSystem): void {
    this.scene = scene;
    this.tensionSystem = tensionSystem;
    console.log('[EchoSystem] Initialized');
  }

  /**
   * Create a distorted silhouette icosphere mesh for echo ghost.
   * Uses low-poly IcoSphere (subdivisions=1) with random vertex displacement.
   */
  private createDistortedSilhouette(keyName: string): Mesh | null {
    if (!this.scene) return null;

    // Create low-poly icosphere base
    const echoMesh = MeshBuilder.CreateIcoSphere(
      `echo_${keyName}`,
      { radius: 0.04, subdivisions: 1, updatable: true },
      this.scene,
    );

    // Apply vertex displacement to create distorted silhouette shape
    const positions = echoMesh.getVerticesData(VertexBuffer.PositionKind);
    if (positions) {
      const displaced = new Float32Array(positions.length);
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        // Flatten vertically (keycap-like proportions) and add noise
        const len = Math.sqrt(x * x + y * y + z * z);
        const noiseScale = 0.3 + Math.sin(i * 0.7) * 0.15; // deterministic pseudo-random
        displaced[i] = x * (1.0 + noiseScale * 0.2);
        displaced[i + 1] = y * 0.5; // flatten Y axis
        displaced[i + 2] = z * (1.0 + noiseScale * 0.2);
      }
      echoMesh.updateVerticesData(VertexBuffer.PositionKind, Array.from(displaced));
    }

    echoMesh.hasVertexAlpha = true;

    return echoMesh;
  }

  /**
   * Create an echoGhost ShaderMaterial with scan-line transparency.
   */
  private createEchoShaderMaterial(keyName: string): ShaderMaterial | null {
    if (!this.scene) return null;

    const shaderMaterial = new ShaderMaterial(
      `echoShader_${keyName}`,
      this.scene,
      {
        vertex: 'echoGhost',
        fragment: 'echoGhost',
      },
      {
        attributes: ['position', 'normal'],
        uniforms: ['worldViewProjection', 'world', 'time', 'distortAmount', 'alpha', 'glowColor'],
        needAlphaBlending: true,
      },
    );

    // Set initial uniform values
    shaderMaterial.setFloat('time', 0);
    shaderMaterial.setFloat('distortAmount', 0.003);
    shaderMaterial.setFloat('alpha', 0);
    shaderMaterial.setColor3('glowColor', new Color3(1.0, 0.3, 0.3)); // ghostly red

    return shaderMaterial;
  }

  /**
   * Spawn a ghost echo for a missed pattern.
   * Validates: Requirement 20.1, 20.3, 20.4
   *
   * @param keyName - The keycap letter that was missed (e.g., 'A', 'Q')
   * @param position - World position where the echo should appear (platter rim)
   */
  spawnEcho(keyName: string, position: { x: number; y: number; z: number }): void {
    if (!this.scene || !this.tensionSystem) {
      console.warn('[EchoSystem] Cannot spawn echo — system not initialized');
      return;
    }

    // Check for existing echo on this key (one per key maximum)
    if (this.activeEchoes.has(keyName)) {
      console.log(`[EchoSystem] Echo already active for key ${keyName} — skipping spawn`);
      return;
    }

    // Create distorted silhouette icosphere mesh
    const echoMesh = this.createDistortedSilhouette(keyName);
    if (!echoMesh) return;

    echoMesh.position.set(position.x, position.y, position.z);

    // Create and apply echoGhost ShaderMaterial with scan-line effect
    const echoShader = this.createEchoShaderMaterial(keyName);
    if (echoShader) {
      echoMesh.material = echoShader;

      // Animate shader uniforms: update time per frame
      const startTime = performance.now();
      const updateShader = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        echoShader.setFloat('time', elapsed);
      };
      this.scene.registerBeforeRender(updateShader);

      // Store cleanup reference
      const scene = this.scene;
      const origDispose = echoMesh.dispose.bind(echoMesh);
      echoMesh.dispose = () => {
        scene.unregisterBeforeRender(updateShader);
        origDispose();
      };
    }

    // GSAP animations: fade-in, pulse, fade-out over 1800ms lifetime
    // Fade in (0-200ms) — animate shader alpha uniform
    if (echoShader) {
      const alphaProxy = { alpha: 0 };
      gsap.to(alphaProxy, {
        alpha: 0.4,
        duration: 0.2,
        onUpdate: () => {
          echoShader.setFloat('alpha', alphaProxy.alpha);
        },
      });
    }

    // Gentle scale pulse (200-1400ms)
    gsap.to(echoMesh.scaling, {
      x: 1.1,
      y: 0.55,
      z: 1.1,
      duration: 0.6,
      yoyo: true,
      repeat: 1,
      ease: 'sine.inOut',
    });

    // Fade out before auto-dispose (1400-1800ms)
    if (echoShader) {
      gsap.to(
        { alpha: 0.4 },
        {
          alpha: 0,
          duration: 0.4,
          delay: 1.4,
          onUpdate: function (this: gsap.core.Tween) {
            echoShader.setFloat('alpha', (this as any).targets()[0].alpha);
          },
        },
      );
    }

    // Store echo
    this.activeEchoes.set(keyName, echoMesh);

    // Set auto-dispose timer (1800ms)
    const timerId = window.setTimeout(() => {
      this.disposeEcho(keyName);
    }, 1800);
    this.echoTimers.set(keyName, timerId);

    // Increase tension by 0.012 (missed pattern penalty)
    this.tensionSystem.increase(0.012);

    // Trigger medium haptic pulse
    this.triggerHapticPulse();

    console.log(
      `[EchoSystem] Spawned echo for key ${keyName} at position (${position.x}, ${position.y}, ${position.z})`,
    );
  }

  /**
   * Dispose a specific echo by key name.
   * Validates: Requirement 20.2
   *
   * @param keyName - The keycap letter whose echo should be disposed
   */
  disposeEcho(keyName: string): void {
    const echoMesh = this.activeEchoes.get(keyName);
    if (echoMesh) {
      echoMesh.dispose();
      this.activeEchoes.delete(keyName);
      console.log(`[EchoSystem] Disposed echo for key ${keyName}`);
    }

    const timerId = this.echoTimers.get(keyName);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      this.echoTimers.delete(keyName);
    }
  }

  /**
   * Trigger a medium haptic pulse via MechanicalHaptics.
   * Validates: Requirement 20.3
   *
   * Wired to MechanicalHaptics.triggerContact() for cross-platform haptics:
   * - Native (iOS/Android): expo-haptics Medium impact
   * - Web: navigator.vibrate with medium duration
   */
  private triggerHapticPulse(): void {
    MechanicalHaptics.getInstance().triggerContact(0.7, 'keycapHold');
  }

  /**
   * Get the set of currently active echo key names.
   */
  getActiveEchoKeys(): Set<string> {
    return new Set(this.activeEchoes.keys());
  }

  /**
   * Check if a specific key has an active echo.
   */
  hasActiveEcho(keyName: string): boolean {
    return this.activeEchoes.has(keyName);
  }

  /**
   * Reset the system for a new Dream.
   */
  reset(): void {
    // Dispose all active echoes
    for (const keyName of this.activeEchoes.keys()) {
      this.disposeEcho(keyName);
    }
    this.activeEchoes.clear();
    this.echoTimers.clear();
    console.log('[EchoSystem] Reset');
  }

  /**
   * Dispose the system.
   */
  dispose(): void {
    this.reset();
    this.scene = null;
    this.tensionSystem = null;
    console.log('[EchoSystem] Disposed');
  }
}
