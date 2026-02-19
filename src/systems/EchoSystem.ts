import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { TensionSystem } from './TensionSystem';

/**
 * EchoSystem — Singleton managing ghost keycap replays of missed patterns
 *
 * When a pattern reaches the platter rim without stabilization:
 * - Spawns a translucent ghost keycap (alpha 0.4, red-tinted)
 * - Auto-disposes after 1800ms
 * - Increases tension by 0.035
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
   * Spawn a ghost keycap echo for a missed pattern.
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

    // Create ghost keycap mesh (box, same dimensions as real keycap: 0.08 × 0.04 × 0.08m)
    const echoMesh = Mesh.CreateBox(`echo_${keyName}`, 0.08, this.scene);
    echoMesh.position.set(position.x, position.y, position.z);
    echoMesh.scaling.set(1, 0.5, 1); // Flatten to keycap proportions

    // Create translucent red-tinted material
    const echoMaterial = new StandardMaterial(`echoMaterial_${keyName}`, this.scene);
    echoMaterial.diffuseColor = new Color3(1.0, 0.3, 0.3); // Red-tinted
    echoMaterial.emissiveColor = new Color3(0.8, 0.2, 0.2); // Faint red glow
    echoMaterial.alpha = 0.4; // Translucent
    echoMesh.material = echoMaterial;

    // Store echo
    this.activeEchoes.set(keyName, echoMesh);

    // Set auto-dispose timer (1800ms)
    const timerId = window.setTimeout(() => {
      this.disposeEcho(keyName);
    }, 1800);
    this.echoTimers.set(keyName, timerId);

    // Increase tension by 0.035
    this.tensionSystem.increase(0.035);

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
   * Trigger a medium haptic pulse.
   * Validates: Requirement 20.3
   *
   * This will be wired to MechanicalHaptics when implemented (Task 21).
   */
  private triggerHapticPulse(): void {
    // TODO: Wire to MechanicalHaptics.triggerContact('medium') when implemented
    console.log('[EchoSystem] Haptic pulse triggered (medium)');
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
