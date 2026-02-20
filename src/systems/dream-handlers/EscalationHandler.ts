/**
 * EscalationDream handler — the "boiling frog" archetype
 *
 * Mechanics:
 * - Progressive activation — surfaces become active one at a time
 * - activationOrder determines which surface activates first, second, etc.
 * - A new surface activates every activationIntervalS seconds
 * - Each newly active surface adds its own mini-challenge:
 *   - keycaps: random emerge/retract cycle (whack-a-mole lite)
 *   - lever: must keep in target zone
 *   - platter: rotation that must be matched
 *   - sphere: drift that must be maintained
 *   - crystallineCube: facet that must be aligned
 *   - morphCube: shape that must be held
 * - compoundTensionMultiplier: tension increase rate multiplies for each new active surface
 * - startDifficulty sets base challenge intensity
 * - maxDimensions caps how many surfaces can be active (3-6)
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { EscalationSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** State for a surface mini-challenge */
interface SurfaceChallenge {
  surface: string;
  active: boolean;
  activatedAt: number;         // elapsed time when activated
  targetValue: number;         // target to match (interpretation varies per surface)
  currentValue: number;        // current value tracked per surface
  failTimer: number;           // seconds of failure (used for tension calculation)
}

/** Base tension rate for each difficulty level */
const DIFFICULTY_BASE: Record<string, number> = {
  easy: 0.005,
  medium: 0.01,
};

export class EscalationHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;

  // Slot parameters
  private activationOrder: string[] = ['keycaps', 'lever', 'platter', 'sphere', 'crystallineCube', 'morphCube'];
  private activationIntervalS = 30;
  private startDifficulty: 'easy' | 'medium' = 'easy';
  private maxDimensions = 5;
  private compoundTensionMultiplier = 1.5;

  // Runtime state
  private challenges: SurfaceChallenge[] = [];
  private activeChallengeCount = 0;
  private elapsedTime = 0;
  private lastActivationTime = 0;
  private meshCache: Map<string, Mesh | null> = new Map();

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as EscalationSlots | undefined;
    this.activationOrder = slots?.activationOrder ?? ['keycaps', 'lever', 'platter', 'sphere', 'crystallineCube', 'morphCube'];
    this.activationIntervalS = slots?.activationIntervalS ?? 30;
    this.startDifficulty = slots?.startDifficulty ?? 'easy';
    this.maxDimensions = slots?.maxDimensions ?? 5;
    this.compoundTensionMultiplier = slots?.compoundTensionMultiplier ?? 1.5;

    // Cache meshes
    this.meshCache.set('sphere', scene.getMeshByName('sphere') as Mesh);
    this.meshCache.set('lever', scene.getMeshByName('lever') as Mesh);
    this.meshCache.set('platter', scene.getMeshByName('platter') as Mesh);
    this.meshCache.set('crystallineCube', scene.getMeshByName('crystallineCube') as Mesh);
    this.meshCache.set('morphCube', scene.getMeshByName('morphCube') as Mesh);

    // Initialize all challenges (inactive by default)
    this.challenges = [];
    for (const surface of this.activationOrder) {
      this.challenges.push({
        surface,
        active: false,
        activatedAt: 0,
        targetValue: Math.random(),
        currentValue: 0,
        failTimer: 0,
      });
    }

    // Activate the first surface immediately
    if (this.challenges.length > 0) {
      this.challenges[0].active = true;
      this.challenges[0].activatedAt = 0;
      this.activeChallengeCount = 1;
    }

    this.elapsedTime = 0;
    this.lastActivationTime = 0;
  }

  update(dt: number): void {
    if (!this.scene) return;

    this.elapsedTime += dt;
    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Check if it's time to activate the next surface
    if (
      this.elapsedTime - this.lastActivationTime >= this.activationIntervalS &&
      this.activeChallengeCount < Math.min(this.maxDimensions, this.challenges.length)
    ) {
      this.lastActivationTime = this.elapsedTime;
      const nextChallenge = this.challenges[this.activeChallengeCount];
      if (nextChallenge) {
        nextChallenge.active = true;
        nextChallenge.activatedAt = this.elapsedTime;
        nextChallenge.targetValue = Math.random();
        this.activeChallengeCount++;
      }
    }

    // Base tension rate from difficulty
    const baseTensionRate = DIFFICULTY_BASE[this.startDifficulty] ?? 0.005;

    // Compound multiplier based on active surface count
    const compoundRate = baseTensionRate * Math.pow(this.compoundTensionMultiplier, this.activeChallengeCount - 1);

    // Run mini-challenges for each active surface
    let totalFail = 0;

    for (const challenge of this.challenges) {
      if (!challenge.active) continue;

      // Update mini-challenge based on surface type
      const success = this.updateSurfaceChallenge(challenge, dt, tension);

      if (!success) {
        challenge.failTimer += dt;
        totalFail++;
      } else {
        challenge.failTimer = Math.max(0, challenge.failTimer - dt * 0.5);
      }

      // Randomize target periodically (every 8-15s based on difficulty)
      const targetChangeInterval = this.startDifficulty === 'easy' ? 15 : 8;
      if (this.elapsedTime - challenge.activatedAt > 0) {
        const timeSinceActivation = this.elapsedTime - challenge.activatedAt;
        if (timeSinceActivation % targetChangeInterval < dt) {
          challenge.targetValue = Math.random();
        }
      }
    }

    // Apply compound tension
    if (totalFail > 0 && this.scene?.metadata) {
      const tensionIncrease = compoundRate * totalFail * dt;
      this.scene.metadata.currentTension = Math.min(
        1,
        (this.scene.metadata.currentTension ?? 0) + tensionIncrease,
      );
    }

    // Tension decrease for all challenges met simultaneously
    if (totalFail === 0 && this.activeChallengeCount > 1) {
      if (this.scene?.metadata) {
        this.scene.metadata.currentTension = Math.max(
          0,
          (this.scene.metadata.currentTension ?? 0) - 0.002 * dt,
        );
      }
    }
  }

  /**
   * Update a single surface mini-challenge.
   * Returns true if the player is meeting the challenge, false if failing.
   */
  private updateSurfaceChallenge(challenge: SurfaceChallenge, _dt: number, _tension: number): boolean {
    switch (challenge.surface) {
      case 'keycaps': {
        // Whack-a-mole lite: check if scene metadata has pressed keys matching target
        const pressedKeys: Set<string> = this.scene?.metadata?.pressedKeys ?? new Set();
        // Simplified: target is to press at least one key
        challenge.currentValue = pressedKeys.size > 0 ? 1 : 0;
        return challenge.currentValue > 0;
      }

      case 'lever': {
        // Must keep lever in target zone (±0.15 of targetValue)
        const leverMesh = this.meshCache.get('lever');
        const leverPos = leverMesh?.position.y ?? 0;
        const normalizedLever = Math.max(0, Math.min(1, (leverPos + 1) / 2));
        challenge.currentValue = normalizedLever;
        return Math.abs(normalizedLever - challenge.targetValue) < 0.15;
      }

      case 'platter': {
        // Rotation must be matched — check platter rotation vs target
        const platterMesh = this.meshCache.get('platter');
        const platterRot = platterMesh?.rotation.y ?? 0;
        const normalizedRot = ((platterRot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
        challenge.currentValue = normalizedRot;
        return Math.abs(normalizedRot - challenge.targetValue) < 0.1;
      }

      case 'sphere': {
        // Drift that must be maintained — check sphere angular velocity
        const sphereMesh = this.meshCache.get('sphere');
        const sphereRot = sphereMesh?.rotation.y ?? 0;
        const normalizedSphere = Math.abs(Math.sin(sphereRot));
        challenge.currentValue = normalizedSphere;
        return Math.abs(normalizedSphere - challenge.targetValue) < 0.2;
      }

      case 'crystallineCube': {
        // Facet alignment — simplified: cube rotation near target
        const cubeMesh = this.meshCache.get('crystallineCube');
        const cubeRot = cubeMesh?.rotation.y ?? 0;
        const normalizedCube = ((cubeRot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
        challenge.currentValue = normalizedCube;
        return Math.abs(normalizedCube - challenge.targetValue) < 0.15;
      }

      case 'morphCube': {
        // Shape hold — simplified: morph cube position near target
        const morphMesh = this.meshCache.get('morphCube');
        const morphPos = morphMesh?.position.y ?? 0;
        const normalizedMorph = Math.max(0, Math.min(1, (morphPos + 1) / 2));
        challenge.currentValue = normalizedMorph;
        return Math.abs(normalizedMorph - challenge.targetValue) < 0.2;
      }

      default:
        return true;
    }
  }

  /** Get all challenge states (for external rendering / testing) */
  getChallenges(): ReadonlyArray<SurfaceChallenge> {
    return this.challenges;
  }

  /** Get the number of currently active challenges */
  getActiveChallengeCount(): number {
    return this.activeChallengeCount;
  }

  dispose(): void {
    this.challenges = [];
    this.activeChallengeCount = 0;
    this.elapsedTime = 0;
    this.lastActivationTime = 0;
    this.meshCache.clear();
    this.entity = null;
    this.scene = null;
  }
}

// Self-register
registerHandler('Escalation', EscalationHandler);
