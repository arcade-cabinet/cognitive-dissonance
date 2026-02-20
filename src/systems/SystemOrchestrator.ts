import type { Engine } from '@babylonjs/core/Engines/engine';
import type { Scene } from '@babylonjs/core/scene';
import { ImmersionAudioBridge } from '../audio/ImmersionAudioBridge';
import { SpatialAudioManager } from '../audio/SpatialAudioManager';
import { world } from '../ecs/World';
import { CrystallineCubeBossSystem } from '../enemies/CrystallineCubeBossSystem';
import { ProceduralMorphSystem } from '../enemies/ProceduralMorphSystem';
import { YukaSteeringSystem } from '../enemies/YukaSteeringSystem';
import { MechanicalDegradationSystem } from '../fallback/MechanicalDegradationSystem';
import { HandPhysics } from '../physics/HandPhysics';
import { HavokInitializer } from '../physics/HavokInitializer';
import { KeycapPhysics } from '../physics/KeycapPhysics';
import { PlatterPhysics } from '../physics/PlatterPhysics';
import { PostProcessCorruption } from '../postprocess/PostProcessCorruption';
import { GamePhaseManager } from '../sequences/GamePhaseManager';
import { ShatterSequence } from '../sequences/ShatterSequence';
import { ArchetypeActivationSystem } from '../ecs/ArchetypeActivationSystem';
import { DreamSequencer } from '../sequences/DreamSequencer';
import { ARSessionManager } from '../xr/ARSessionManager';
import { HandInteractionSystem } from '../xr/HandInteractionSystem';
import { MechanicalHaptics } from '../xr/MechanicalHaptics';
import { CorruptionTendrilSystem } from './CorruptionTendrilSystem';
import { DifficultyScalingSystem } from './DifficultyScalingSystem';
import { DreamTypeHandler } from './DreamTypeHandler';
import { EchoSystem } from './EchoSystem';
import { KeyboardInputSystem } from './KeyboardInputSystem';
import { MechanicalAnimationSystem } from './MechanicalAnimationSystem';
import { PatternStabilizationSystem } from './PatternStabilizationSystem';
import { SphereTrackballSystem } from './SphereTrackballSystem';
import { TensionSystem } from './TensionSystem';

/**
 * SystemOrchestrator — Manages initialization order, per-frame update order,
 * and disposal order for all game systems.
 *
 * Physics: Uses force/torque simulation (no Havok WASM dependency).
 * Audio: Tone.js audio graph created during init; AudioContext resumed on
 *        first user gesture via ImmersionAudioBridge.resumeOnUserGesture().
 *
 * Initialization order (31 systems):
 * 1-4. EngineInitializer, SceneManager, DeviceQuality, ECS World (external)
 * 5. HavokInitializer (WASM physics engine)
 * 6. KeycapPhysics (force/torque simulation)
 * 7. PlatterPhysics (force/torque simulation)
 * 8. HandPhysics
 * 9. TensionSystem
 * 10. DifficultyScalingSystem
 * 11. PatternStabilizationSystem
 * 12. CorruptionTendrilSystem
 * 13. MechanicalAnimationSystem
 * 14. EchoSystem
 * 15. ProceduralMorphSystem
 * 16. CrystallineCubeBossSystem
 * 17. PostProcessCorruption
 * 18. ImmersionAudioBridge (audio graph only — context deferred)
 * 19. SpatialAudioManager
 * 20. DreamTypeHandler
 * 21. ARSessionManager
 * 22. KeyboardInputSystem
 * 23. MechanicalDegradationSystem
 * 24. GamePhaseManager
 * 25. ShatterSequence
 * 26. YukaSteeringSystem
 * 27. HandInteractionSystem
 * 28. SphereTrackballSystem
 * 29. MechanicalHaptics
 * 30. ArchetypeActivationSystem
 * 31. DreamSequencer
 *
 * Per-frame update order (6 active systems):
 * 1. DifficultyScalingSystem
 * 2. CorruptionTendrilSystem
 * 3. ProceduralMorphSystem
 * 4. YukaSteeringSystem
 * 5. PatternStabilizationSystem
 * 6. DreamTypeHandler
 *
 * Disposal order: reverse of initialization
 *
 * Validates: Requirement 32
 */
export class SystemOrchestrator {
  private static instance: SystemOrchestrator | null = null;

  // System instances
  private havokInitializer: HavokInitializer | null = null;
  private keycapPhysics: KeycapPhysics | null = null;
  private platterPhysics: PlatterPhysics | null = null;
  private handPhysics: HandPhysics | null = null;
  private tensionSystem: TensionSystem | null = null;
  private difficultyScalingSystem: DifficultyScalingSystem | null = null;
  private patternStabilizationSystem: PatternStabilizationSystem | null = null;
  private corruptionTendrilSystem: CorruptionTendrilSystem | null = null;
  private mechanicalAnimationSystem: MechanicalAnimationSystem | null = null;
  private echoSystem: EchoSystem | null = null;
  private proceduralMorphSystem: ProceduralMorphSystem | null = null;
  private crystallineCubeBossSystem: CrystallineCubeBossSystem | null = null;
  private postProcessCorruption: PostProcessCorruption | null = null;
  private immersionAudioBridge: ImmersionAudioBridge | null = null;
  private spatialAudioManager: SpatialAudioManager | null = null;
  private dreamTypeHandler: DreamTypeHandler | null = null;
  private arSessionManager: ARSessionManager | null = null;
  private keyboardInputSystem: KeyboardInputSystem | null = null;
  private mechanicalDegradationSystem: MechanicalDegradationSystem | null = null;
  private gamePhaseManager: GamePhaseManager | null = null;
  private shatterSequence: ShatterSequence | null = null;
  private yukaSteeringSystem: YukaSteeringSystem | null = null;
  private handInteractionSystem: HandInteractionSystem | null = null;
  private sphereTrackballSystem: SphereTrackballSystem | null = null;
  private mechanicalHaptics: MechanicalHaptics | null = null;
  private archetypeActivationSystem: ArchetypeActivationSystem | null = null;
  private dreamSequencer: DreamSequencer | null = null;

  // Per-frame update callbacks (stored for unregistration)
  private updateCallbacks: Array<() => void> = [];
  private scene: Scene | null = null;
  private updatesEnabled = true;

  private constructor() {}

  static getInstance(): SystemOrchestrator {
    if (!SystemOrchestrator.instance) {
      SystemOrchestrator.instance = new SystemOrchestrator();
    }
    return SystemOrchestrator.instance;
  }

  /**
   * Initialize all systems in order.
   * Systems 1-4 (Engine, Scene, DeviceQuality, ECS) are handled by GameBootstrap.
   */
  async initAll(_engine: Engine, scene: Scene): Promise<void> {
    // 5. HavokInitializer (WASM physics engine — universal via UMD entry)
    this.havokInitializer = HavokInitializer.getInstance();
    await this.havokInitializer.initialize(scene);

    // 6. KeycapPhysics
    this.keycapPhysics = KeycapPhysics.getInstance();

    // 7. PlatterPhysics
    this.platterPhysics = PlatterPhysics.getInstance();

    // 8. HandPhysics
    this.handPhysics = HandPhysics.getInstance();
    this.handPhysics.initialize(scene);

    // 8. TensionSystem
    this.tensionSystem = TensionSystem.getInstance();

    // 9. DifficultyScalingSystem
    this.difficultyScalingSystem = DifficultyScalingSystem.getInstance();

    // 10. PatternStabilizationSystem
    this.patternStabilizationSystem = PatternStabilizationSystem.getInstance();

    // 11. CorruptionTendrilSystem (mesh wiring deferred)
    this.corruptionTendrilSystem = CorruptionTendrilSystem.getInstance();

    // 12. MechanicalAnimationSystem (mesh wiring deferred)
    this.mechanicalAnimationSystem = MechanicalAnimationSystem.getInstance();

    // 13. EchoSystem
    this.echoSystem = EchoSystem.getInstance();

    // 14. ProceduralMorphSystem (requires scene + ECS world)
    this.proceduralMorphSystem = ProceduralMorphSystem.getInstance(scene, world);

    // 15. CrystallineCubeBossSystem
    this.crystallineCubeBossSystem = CrystallineCubeBossSystem.getInstance();

    // 16. PostProcessCorruption (camera wiring deferred)
    this.postProcessCorruption = PostProcessCorruption.getInstance();

    // 17. ImmersionAudioBridge (audio graph only — AudioContext deferred to user gesture)
    this.immersionAudioBridge = ImmersionAudioBridge.getInstance();
    await this.immersionAudioBridge.initialize();

    // 18. SpatialAudioManager
    this.spatialAudioManager = SpatialAudioManager.getInstance();

    // 19. DreamTypeHandler
    this.dreamTypeHandler = DreamTypeHandler.getInstance();

    // 20. ARSessionManager
    this.arSessionManager = new ARSessionManager();

    // 21. KeyboardInputSystem (scene wiring deferred)
    this.keyboardInputSystem = KeyboardInputSystem.getInstance();

    // 22. MechanicalDegradationSystem
    if (this.tensionSystem) {
      this.mechanicalDegradationSystem = MechanicalDegradationSystem.getInstance(scene, this.tensionSystem);
    }

    // 23. GamePhaseManager (mesh wiring deferred)
    this.gamePhaseManager = GamePhaseManager.getInstance();

    // 24. ShatterSequence (mesh wiring deferred)
    this.shatterSequence = ShatterSequence.getInstance();

    // 25. YukaSteeringSystem (mesh wiring deferred)
    this.yukaSteeringSystem = YukaSteeringSystem.getInstance();

    // 26. HandInteractionSystem (mesh wiring deferred — activated by ARSessionManager)
    this.handInteractionSystem = HandInteractionSystem.getInstance();

    // 27. SphereTrackballSystem (mesh wiring deferred — core trackball interaction)
    this.sphereTrackballSystem = SphereTrackballSystem.getInstance();

    // 28. MechanicalHaptics (Tone.js brown noise rumble — init deferred to user gesture)
    this.mechanicalHaptics = MechanicalHaptics.getInstance();

    // 30. ArchetypeActivationSystem (configures primitive entities per-Dream)
    this.archetypeActivationSystem = ArchetypeActivationSystem.getInstance();

    // 31. DreamSequencer (session-level Dream pacing orchestrator)
    this.dreamSequencer = DreamSequencer.getInstance();

    // Store scene reference for unregistration in disposeAll()
    this.scene = scene;

    // Register per-frame update callbacks
    this.registerUpdateCallbacks(scene);
  }

  /**
   * Enable or disable per-frame update callbacks.
   * Used to gate updates during shattered phase (H3 race condition fix).
   */
  setUpdatesEnabled(enabled: boolean): void {
    this.updatesEnabled = enabled;
  }

  private registerUpdateCallbacks(scene: Scene): void {
    // DifficultyScalingSystem
    const difficultyUpdate = () => {
      if (!this.updatesEnabled) return;
      if (this.difficultyScalingSystem) {
        const elapsedMs = performance.now() - (scene.metadata?.dreamStartTime ?? 0);
        this.difficultyScalingSystem.update(elapsedMs);
      }
    };
    this.updateCallbacks.push(difficultyUpdate);
    scene.registerBeforeRender(difficultyUpdate);

    // CorruptionTendrilSystem
    const corruptionUpdate = () => {
      if (!this.updatesEnabled) return;
      if (this.corruptionTendrilSystem) {
        const dt = scene.getEngine().getDeltaTime() / 1000;
        this.corruptionTendrilSystem.update(dt);
      }
    };
    this.updateCallbacks.push(corruptionUpdate);
    scene.registerBeforeRender(corruptionUpdate);

    // ProceduralMorphSystem
    const morphUpdate = () => {
      if (!this.updatesEnabled) return;
      if (this.proceduralMorphSystem) {
        const dt = scene.getEngine().getDeltaTime() / 1000;
        this.proceduralMorphSystem.update(dt);
      }
    };
    this.updateCallbacks.push(morphUpdate);
    scene.registerBeforeRender(morphUpdate);

    // YukaSteeringSystem (AI enemy movement)
    const yukaUpdate = () => {
      if (!this.updatesEnabled) return;
      if (this.yukaSteeringSystem) {
        const dt = scene.getEngine().getDeltaTime() / 1000;
        this.yukaSteeringSystem.update(dt);
      }
    };
    this.updateCallbacks.push(yukaUpdate);
    scene.registerBeforeRender(yukaUpdate);

    // PatternStabilizationSystem (pattern spawn + timeout checks)
    const patternUpdate = () => {
      if (!this.updatesEnabled) return;
      if (this.patternStabilizationSystem) {
        const dt = scene.getEngine().getDeltaTime() / 1000;
        this.patternStabilizationSystem.update(dt);
      }
    };
    this.updateCallbacks.push(patternUpdate);
    scene.registerBeforeRender(patternUpdate);

    // DreamTypeHandler
    const dreamUpdate = () => {
      if (!this.updatesEnabled) return;
      if (this.dreamTypeHandler) {
        const handler = this.dreamTypeHandler.getCurrentHandler();
        if (handler) {
          handler.update(scene.getEngine().getDeltaTime() / 1000);
        }
      }
    };
    this.updateCallbacks.push(dreamUpdate);
    scene.registerBeforeRender(dreamUpdate);
  }

  /**
   * Dispose all systems in reverse initialization order.
   */
  disposeAll(): void {
    // Unregister all per-frame callbacks from scene before clearing (M7 fix)
    if (this.scene) {
      for (const cb of this.updateCallbacks) {
        this.scene.unregisterBeforeRender(cb);
      }
    }
    this.updateCallbacks = [];

    this.dreamSequencer?.dispose();
    this.dreamSequencer = null;

    this.archetypeActivationSystem?.dispose();
    this.archetypeActivationSystem = null;

    this.mechanicalHaptics?.dispose();
    this.mechanicalHaptics = null;

    this.sphereTrackballSystem?.dispose();
    this.sphereTrackballSystem = null;

    this.handInteractionSystem?.dispose();
    this.handInteractionSystem = null;

    this.yukaSteeringSystem?.dispose();
    this.yukaSteeringSystem = null;

    this.shatterSequence?.dispose();
    this.shatterSequence = null;

    this.gamePhaseManager?.dispose();
    this.gamePhaseManager = null;

    this.mechanicalDegradationSystem?.dispose();
    this.mechanicalDegradationSystem = null;

    this.keyboardInputSystem?.dispose();
    this.keyboardInputSystem = null;

    this.arSessionManager?.dispose();
    this.arSessionManager = null;

    this.dreamTypeHandler?.dispose();
    this.dreamTypeHandler = null;

    this.spatialAudioManager?.dispose();
    this.spatialAudioManager = null;

    this.immersionAudioBridge?.dispose();
    this.immersionAudioBridge = null;

    this.postProcessCorruption?.dispose();
    this.postProcessCorruption = null;

    this.crystallineCubeBossSystem?.dispose();
    this.crystallineCubeBossSystem = null;

    this.proceduralMorphSystem?.dispose();
    this.proceduralMorphSystem = null;

    this.echoSystem?.dispose();
    this.echoSystem = null;

    this.mechanicalAnimationSystem?.dispose();
    this.mechanicalAnimationSystem = null;

    this.corruptionTendrilSystem?.dispose();
    this.corruptionTendrilSystem = null;

    this.patternStabilizationSystem?.dispose();
    this.patternStabilizationSystem = null;

    this.difficultyScalingSystem?.dispose();
    this.difficultyScalingSystem = null;

    this.tensionSystem?.dispose();
    this.tensionSystem = null;

    this.handPhysics?.dispose();
    this.handPhysics = null;

    this.platterPhysics?.dispose();
    this.platterPhysics = null;

    this.keycapPhysics?.dispose();
    this.keycapPhysics = null;

    this.havokInitializer?.dispose();
    this.havokInitializer = null;

    this.scene = null;
  }

  // ── System accessors ──

  getKeycapPhysics(): KeycapPhysics | null {
    return this.keycapPhysics;
  }

  getPlatterPhysics(): PlatterPhysics | null {
    return this.platterPhysics;
  }

  getHandPhysics(): HandPhysics | null {
    return this.handPhysics;
  }

  getTensionSystem(): TensionSystem | null {
    return this.tensionSystem;
  }

  getDifficultyScalingSystem(): DifficultyScalingSystem | null {
    return this.difficultyScalingSystem;
  }

  getPatternStabilizationSystem(): PatternStabilizationSystem | null {
    return this.patternStabilizationSystem;
  }

  getCorruptionTendrilSystem(): CorruptionTendrilSystem | null {
    return this.corruptionTendrilSystem;
  }

  getMechanicalAnimationSystem(): MechanicalAnimationSystem | null {
    return this.mechanicalAnimationSystem;
  }

  getEchoSystem(): EchoSystem | null {
    return this.echoSystem;
  }

  getProceduralMorphSystem(): ProceduralMorphSystem | null {
    return this.proceduralMorphSystem;
  }

  getCrystallineCubeBossSystem(): CrystallineCubeBossSystem | null {
    return this.crystallineCubeBossSystem;
  }

  getPostProcessCorruption(): PostProcessCorruption | null {
    return this.postProcessCorruption;
  }

  getImmersionAudioBridge(): ImmersionAudioBridge | null {
    return this.immersionAudioBridge;
  }

  getSpatialAudioManager(): SpatialAudioManager | null {
    return this.spatialAudioManager;
  }

  getDreamTypeHandler(): DreamTypeHandler | null {
    return this.dreamTypeHandler;
  }

  getARSessionManager(): ARSessionManager | null {
    return this.arSessionManager;
  }

  getKeyboardInputSystem(): KeyboardInputSystem | null {
    return this.keyboardInputSystem;
  }

  getMechanicalDegradationSystem(): MechanicalDegradationSystem | null {
    return this.mechanicalDegradationSystem;
  }

  getGamePhaseManager(): GamePhaseManager | null {
    return this.gamePhaseManager;
  }

  getShatterSequence(): ShatterSequence | null {
    return this.shatterSequence;
  }

  getYukaSteeringSystem(): YukaSteeringSystem | null {
    return this.yukaSteeringSystem;
  }

  getHandInteractionSystem(): HandInteractionSystem | null {
    return this.handInteractionSystem;
  }

  getSphereTrackballSystem(): SphereTrackballSystem | null {
    return this.sphereTrackballSystem;
  }

  getMechanicalHaptics(): MechanicalHaptics | null {
    return this.mechanicalHaptics;
  }

  getArchetypeActivationSystem(): ArchetypeActivationSystem | null {
    return this.archetypeActivationSystem;
  }

  getDreamSequencer(): DreamSequencer | null {
    return this.dreamSequencer;
  }
}
