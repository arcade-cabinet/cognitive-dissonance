import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

gsap.registerPlugin(CustomEase, MotionPathPlugin);

/**
 * MechanicalAnimationSystem
 *
 * Singleton system managing all GSAP-based mechanical animations:
 * - Garage-door slit open/close (staggered top/bottom)
 * - MODE_LEVER pull with resistance (back.out ease)
 * - Keycap emergence via curved MotionPath
 * - Platter rotation (for PlatterRotationDream archetype)
 *
 * Uses CustomEase "heavyMechanical" for weighty industrial feel.
 *
 * Validates: Requirement 8
 */
export class MechanicalAnimationSystem {
  private static instance: MechanicalAnimationSystem | null = null;
  private slitTop: Mesh | null = null;
  private slitBottom: Mesh | null = null;
  private modeLever: Mesh | null = null;
  private keycaps: Map<string, Mesh> = new Map();
  private platter: Mesh | null = null;
  /** Target rim positions per keycap (computed in MechanicalPlatter, set via setRimPositions) */
  private rimPositions: Map<string, { x: number; y: number; z: number }> = new Map();

  // GSAP timelines
  private slitTimeline: gsap.core.Timeline | null = null;
  private leverTimeline: gsap.core.Timeline | null = null;
  private keycapTimelines: Map<string, gsap.core.Timeline> = new Map();
  private platterTimeline: gsap.core.Timeline | null = null;

  // MODE_LEVER callback for AR mode switching
  private modeLeverCallback: ((position: number) => void) | null = null;

  private constructor() {
    // Define "heavyMechanical" CustomEase curve
    // Simulates weight and inertia: slow start, momentum build, heavy settle
    CustomEase.create(
      'heavyMechanical',
      'M0,0 C0.14,0 0.242,0.438 0.272,0.561 0.313,0.728 0.354,0.963 0.362,1 0.37,1.037 0.37,1.037 0.4,1.037 0.43,1.037 0.462,1.019 0.5,1.019 0.538,1.019 0.57,1.037 0.6,1.037 0.63,1.037 0.63,1.037 0.638,1 0.646,0.963 0.687,0.728 0.728,0.561 0.758,0.438 0.86,0 1,0',
    );
  }

  static getInstance(): MechanicalAnimationSystem {
    if (!MechanicalAnimationSystem.instance) {
      MechanicalAnimationSystem.instance = new MechanicalAnimationSystem();
    }
    return MechanicalAnimationSystem.instance;
  }

  /**
   * Initialize the system with scene and mesh references
   */
  init(
    _scene: Scene,
    slitTop: Mesh,
    slitBottom: Mesh,
    modeLever: Mesh,
    keycaps: Map<string, Mesh>,
    platter: Mesh,
  ): void {
    this.slitTop = slitTop;
    this.slitBottom = slitBottom;
    this.modeLever = modeLever;
    this.keycaps = keycaps;
    this.platter = platter;
  }

  /**
   * Set target rim positions for keycap emerge/retract animations.
   * Called from GameBootstrap with positions computed during platter creation.
   */
  setRimPositions(positions: Map<string, { x: number; y: number; z: number }>): void {
    this.rimPositions = positions;
  }

  /**
   * Animate garage-door slit open
   * Top slides up, bottom slides down, staggered timing to simulate weight difference
   * Validates: Requirement 8.2
   */
  openSlit(): void {
    if (!this.slitTop || !this.slitBottom) {
      console.warn('MechanicalAnimationSystem: slit meshes not initialized');
      return;
    }

    // Kill existing timeline if running
    this.slitTimeline?.kill();

    this.slitTimeline = gsap.timeline();

    // Top slides up (lighter, starts first)
    this.slitTimeline.to(
      this.slitTop.position,
      {
        y: 0.22, // well above platter surface (visible separation)
        duration: 1.2,
        ease: 'heavyMechanical',
      },
      0,
    );

    // Bottom slides down (heavier, starts 0.15s later)
    this.slitTimeline.to(
      this.slitBottom.position,
      {
        y: -0.22, // well below platter (visible separation)
        duration: 1.4,
        ease: 'heavyMechanical',
      },
      0.15,
    );
  }

  /**
   * Animate garage-door slit close (reverse of open)
   */
  closeSlit(): void {
    if (!this.slitTop || !this.slitBottom) {
      console.warn('MechanicalAnimationSystem: slit meshes not initialized');
      return;
    }

    this.slitTimeline?.kill();

    this.slitTimeline = gsap.timeline();

    // Bottom slides up first (heavier, slower) — returns to closed position
    this.slitTimeline.to(
      this.slitBottom.position,
      {
        y: 0.06,
        duration: 1.4,
        ease: 'heavyMechanical',
      },
      0,
    );

    // Top slides down (lighter, starts 0.15s later) — returns to closed position
    this.slitTimeline.to(
      this.slitTop.position,
      {
        y: 0.12,
        duration: 1.2,
        ease: 'heavyMechanical',
      },
      0.15,
    );
  }

  /**
   * Animate MODE_LEVER pull
   * Position: 0.0 (down/phone mode) to 1.0 (up/glasses mode)
   * Uses back.out ease for resistance feel
   * Validates: Requirement 8.3
   */
  pullLever(targetPosition: number): void {
    if (!this.modeLever) {
      console.warn('MechanicalAnimationSystem: MODE_LEVER mesh not initialized');
      return;
    }

    // Clamp position to [0, 1]
    const position = Math.max(0, Math.min(1, targetPosition));

    this.leverTimeline?.kill();

    // Lever rotates around X-axis (hinge at base)
    // 0.0 → -30° (down), 1.0 → +30° (up)
    const targetRotation = (position - 0.5) * (Math.PI / 6); // ±30° in radians

    this.leverTimeline = gsap.timeline({
      onUpdate: () => {
        // Trigger callback during animation for smooth AR mode transition
        if (this.modeLeverCallback) {
          this.modeLeverCallback(position);
        }
      },
    });

    this.leverTimeline.to(this.modeLever.rotation, {
      x: targetRotation,
      duration: 0.8,
      ease: 'back.out(1.7)', // Resistance feel
    });
  }

  /**
   * Register MODE_LEVER callback for AR mode switching
   * Validates: Requirement 8.5
   */
  registerModeLeverCallback(callback: (position: number) => void): void {
    this.modeLeverCallback = callback;
  }

  /**
   * Animate keycap emergence from platter interior to rim position
   * Uses curved MotionPath for organic mechanical feel
   * Validates: Requirement 8.4
   */
  emergeKeycap(keyName: string): void {
    const keycap = this.keycaps.get(keyName);
    if (!keycap) {
      console.warn(`MechanicalAnimationSystem: keycap ${keyName} not found`);
      return;
    }

    // Kill existing timeline if running
    const existingTimeline = this.keycapTimelines.get(keyName);
    existingTimeline?.kill();

    // Look up stored rim position (keycaps start retracted at center)
    const rimPos = this.rimPositions.get(keyName);
    const targetX = rimPos?.x ?? keycap.position.x;
    const targetY = rimPos?.y ?? 0.09;
    const targetZ = rimPos?.z ?? keycap.position.z;

    // Make keycap visible before animating
    keycap.setEnabled(true);

    // Curved path from center to rim position
    const path = [
      { x: 0, y: -0.02, z: 0 }, // Start at center (retracted)
      { x: targetX * 0.5, y: -0.02 + 0.03, z: targetZ * 0.5 }, // Mid-point with slight lift
      { x: targetX, y: targetY, z: targetZ }, // End at rim
    ];

    const timeline = gsap.timeline();

    timeline.to(keycap.position, {
      motionPath: {
        path,
        curviness: 1.2,
      },
      duration: 1.0,
      ease: 'heavyMechanical',
    });

    this.keycapTimelines.set(keyName, timeline);
  }

  /**
   * Retract keycap back into platter (reverse of emerge)
   */
  retractKeycap(keyName: string): void {
    const keycap = this.keycaps.get(keyName);
    if (!keycap) {
      console.warn(`MechanicalAnimationSystem: keycap ${keyName} not found`);
      return;
    }

    const existingTimeline = this.keycapTimelines.get(keyName);
    existingTimeline?.kill();

    // Use stored rim position as starting point
    const rimPos = this.rimPositions.get(keyName);
    const startX = rimPos?.x ?? keycap.position.x;
    const startY = rimPos?.y ?? 0.09;
    const startZ = rimPos?.z ?? keycap.position.z;

    const path = [
      { x: startX, y: startY, z: startZ }, // Start at rim
      { x: startX * 0.5, y: -0.03, z: startZ * 0.5 }, // Mid-point
      { x: 0, y: -0.02, z: 0 }, // End at center (retracted)
    ];

    const timeline = gsap.timeline({
      onComplete: () => {
        keycap.setEnabled(false); // Hide after retraction completes
      },
    });

    timeline.to(keycap.position, {
      motionPath: {
        path,
        curviness: 1.2,
      },
      duration: 0.8,
      ease: 'heavyMechanical',
    });

    this.keycapTimelines.set(keyName, timeline);
  }

  /**
   * Rotate platter (for PlatterRotationDream archetype)
   * RPM is seed-derived and scaled by difficulty
   */
  rotatePlatter(rpm: number): void {
    if (!this.platter) {
      console.warn('MechanicalAnimationSystem: platter mesh not initialized');
      return;
    }

    this.platterTimeline?.kill();

    // Convert RPM to radians per second
    const radiansPerSecond = (rpm * 2 * Math.PI) / 60;

    // Infinite rotation
    this.platterTimeline = gsap.timeline({ repeat: -1 });

    this.platterTimeline.to(this.platter.rotation, {
      y: `+=${2 * Math.PI}`, // One full rotation
      duration: (2 * Math.PI) / radiansPerSecond,
      ease: 'none', // Linear rotation
    });
  }

  /**
   * Stop platter rotation
   */
  stopPlatterRotation(): void {
    if (!this.platter) return;

    this.platterTimeline?.kill();

    // Ease to stop with heavy mechanical feel
    gsap.to(this.platter.rotation, {
      y: this.platter.rotation.y, // Hold current rotation
      duration: 0.4,
      ease: 'power2.out',
    });
  }

  /**
   * Reset all animations (for new Dream)
   */
  reset(): void {
    this.slitTimeline?.kill();
    this.leverTimeline?.kill();
    this.platterTimeline?.kill();

    for (const timeline of this.keycapTimelines.values()) {
      timeline.kill();
    }
    this.keycapTimelines.clear();
  }

  /**
   * Dispose system (cleanup)
   */
  dispose(): void {
    this.reset();
    this.slitTop = null;
    this.slitBottom = null;
    this.modeLever = null;
    this.keycaps.clear();
    this.rimPositions.clear();
    this.platter = null;
    this.modeLeverCallback = null;
  }
}
