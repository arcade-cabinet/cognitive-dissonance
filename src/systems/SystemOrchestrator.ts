import type { Engine } from '@babylonjs/core/Engines/engine';
import type { Scene } from '@babylonjs/core/scene';
import { ImmersionAudioBridge } from '../audio/ImmersionAudioBridge';
import { SpatialAudioManager } from '../audio/SpatialAudioManager';
import { CrystallineCubeBossSystem } from '../enemies/CrystallineCubeBossSystem';
import { ProceduralMorphSystem } from '../enemies/ProceduralMorphSystem';
import { MechanicalDegradationSystem } from '../fallback/MechanicalDegradationSystem';
import { HandPhysics } from '../physics/HandPhysics';
import { HavokInitializer } from '../physics/HavokInitializer';
import { KeycapPhysics } from '../physics/KeycapPhysics';
import { PlatterPhysics } from '../physics/PlatterPhysics';
import { PostProcessCorruption } from '../postprocess/PostProcessCorruption';
import { GamePhaseManager } from '../sequences/GamePhaseManager';
import { ShatterSequence } from '../sequences/ShatterSequence';
import { ARSessionManager } from '../xr/ARSessionManager';
import { CorruptionTendrilSystem } from './CorruptionTendrilSystem';
import { DifficultyScalingSystem } from './DifficultyScalingSystem';
import { DreamTypeHandler } from './DreamTypeHandler';
import { EchoSystem } from './EchoSystem';
import { KeyboardInputSystem } from './KeyboardInputSystem';
import { MechanicalAnimationSystem } from './MechanicalAnimationSystem';
import { PatternStabilizationSystem } from './PatternStabilizationSystem';
import { TensionSystem } from './TensionSystem';

/**
 * SystemOrchestrator — Manages initialization order, per-frame update order, and disposal order for all game systems.
 *
 * Initialization order (25 systems):
 * 1. EngineInitializer → SceneManager → DeviceQuality → ECS World (handled externally)
 * 2. MechanicalPlatter (handled externally)
 * 3. SphereNebulaMaterial (handled externally)
 * 4. DiegeticCoherenceRing (handled externally)
 * 5. HavokInitializer (physics engine)
 * 6. KeycapPhysics
 * 7. PlatterPhysics
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
 * 18. ImmersionAudioBridge
 * 19. SpatialAudioManager
 * 20. DreamTypeHandler
 * 21. ARSessionManager
 * 22. KeyboardInputSystem
 * 23. MechanicalDegradationSystem
 * 24. GamePhaseManager
 * 25. ShatterSequence
 *
 * Per-frame update order (12 systems):
 * 1. KeyboardInputSystem (input)
 * 2. PatternStabilizationSystem (gameplay)
 * 3. DifficultyScalingSystem (difficulty recomputation)
 * 4. TensionSystem (state)
 * 5. CorruptionTendrilSystem (visuals)
 * 6. ProceduralMorphSystem (enemies)
 * 7. CrystallineCubeBossSystem (boss)
 * 8. EchoSystem (feedback)
 * 9. MechanicalDegradationSystem (fallback)
 * 10. PostProcessCorruption (post-process)
 * 11. ImmersionAudioBridge (audio)
 * 12. DreamTypeHandler (archetype logic)
 *
 * Disposal order: reverse of initialization order
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

  // Per-frame update callbacks
  private updateCallbacks: Array<() => void> = [];

  private constructor() {}

  static getInstance(): SystemOrchestrator {
    if (!SystemOrchestrator.instance) {
      SystemOrchestrator.instance = new SystemOrchestrator();
    }
    return SystemOrchestrator.instance;
  }

  /**
   * Initialize all systems in the specified order.
   * Systems 1-4 (EngineInitializer, SceneManager, DeviceQuality, ECS World) are handled externally.
   * Systems 5-25 are initialized here.
   *
   * @param engine - Babylon.js engine instance
   * @param scene - Babylon.js scene instance
   */
  async initAll(_engine: Engine, scene: Scene): Promise<void> {
    // 5. HavokInitializer (physics engine)
    this.havokInitializer = HavokInitializer.getInstance();
    await this.havokInitializer.initialize(scene);

    // 6. KeycapPhysics
    this.keycapPhysics = KeycapPhysics.getInstance();
    // KeycapPhysics.applyKeycapPhysics() will be called for each keycap when platter is created

    // 7. PlatterPhysics
    this.platterPhysics = PlatterPhysics.getInstance();
    // PlatterPhysics.applyPlatterPhysics() and applyLeverPhysics() will be called when platter is created

    // 8. HandPhysics
    this.handPhysics = HandPhysics.getInstance();
    this.handPhysics.initialize(scene);

    // 9. TensionSystem
    this.tensionSystem = TensionSystem.getInstance();
    // TensionSystem.init() will be called when first Dream is spawned (requires tensionCurve from Level_Archetype entity)

    // 10. DifficultyScalingSystem
    this.difficultyScalingSystem = DifficultyScalingSystem.getInstance();
    // DifficultyScalingSystem.initialize() will be called when first Dream is spawned (requires difficultyConfig from Level_Archetype entity)

    // 11. PatternStabilizationSystem
    this.patternStabilizationSystem = PatternStabilizationSystem.getInstance();
    // PatternStabilizationSystem.setLevelEntity() will be called when first Dream is spawned

    // 12. CorruptionTendrilSystem
    this.corruptionTendrilSystem = CorruptionTendrilSystem.getInstance();
    // CorruptionTendrilSystem initialization deferred until sphere mesh is available

    // 13. MechanicalAnimationSystem
    this.mechanicalAnimationSystem = MechanicalAnimationSystem.getInstance();
    // MechanicalAnimationSystem initialization deferred until platter meshes are available

    // 14. EchoSystem
    this.echoSystem = EchoSystem.getInstance();
    // EchoSystem initialization deferred until scene is available

    // 15. ProceduralMorphSystem
    this.proceduralMorphSystem = ProceduralMorphSystem.getInstance();
    // ProceduralMorphSystem initialization deferred until scene is available

    // 16. CrystallineCubeBossSystem
    this.crystallineCubeBossSystem = CrystallineCubeBossSystem.getInstance();
    // CrystallineCubeBossSystem initialization deferred until scene is available

    // 17. PostProcessCorruption
    this.postProcessCorruption = PostProcessCorruption.getInstance();
    // PostProcessCorruption initialization deferred until camera is available

    // 18. ImmersionAudioBridge
    this.immersionAudioBridge = ImmersionAudioBridge.getInstance();
    await this.immersionAudioBridge.initialize();

    // 19. SpatialAudioManager
    this.spatialAudioManager = SpatialAudioManager.getInstance();
    // SpatialAudioManager initialization deferred until scene is available

    // 20. DreamTypeHandler
    this.dreamTypeHandler = DreamTypeHandler.getInstance();
    // DreamTypeHandler initialization deferred until first Dream is spawned

    // 21. ARSessionManager
    this.arSessionManager = new ARSessionManager();
    // ARSessionManager initialization deferred until user initiates AR session

    // 22. KeyboardInputSystem
    this.keyboardInputSystem = KeyboardInputSystem.getInstance();
    // KeyboardInputSystem initialization deferred until scene is available

    // 23. MechanicalDegradationSystem
    if (this.tensionSystem) {
      this.mechanicalDegradationSystem = MechanicalDegradationSystem.getInstance(scene, this.tensionSystem);
    }
    // MechanicalDegradationSystem activation deferred until platter meshes are available

    // 24. GamePhaseManager
    this.gamePhaseManager = GamePhaseManager.getInstance();
    // GamePhaseManager initialization deferred until platter and sphere meshes are available

    // 25. ShatterSequence
    this.shatterSequence = ShatterSequence.getInstance();
    // ShatterSequence initialization deferred until platter and sphere meshes are available

    // Register per-frame update callbacks in the specified order
    this.registerUpdateCallbacks(scene);
  }

  /**
   * Register per-frame update callbacks via scene.registerBeforeRender in the specified order.
   *
   * @param scene - Babylon.js scene instance
   */
  private registerUpdateCallbacks(scene: Scene): void {
    // 1. KeyboardInputSystem (input) — no per-frame update needed (event-driven)
    // 2. PatternStabilizationSystem (gameplay) — no per-frame update needed (event-driven)
    // 3. DifficultyScalingSystem (difficulty recomputation)
    const difficultyUpdate = () => {
      if (this.difficultyScalingSystem) {
        const elapsedMs = performance.now() - (scene.metadata?.dreamStartTime ?? 0);
        this.difficultyScalingSystem.update(elapsedMs);
      }
    };
    this.updateCallbacks.push(difficultyUpdate);
    scene.registerBeforeRender(difficultyUpdate);

    // 4. TensionSystem (state) — no per-frame update needed (event-driven via increase/decrease calls)
    // 5. CorruptionTendrilSystem (visuals)
    const corruptionUpdate = () => {
      if (this.corruptionTendrilSystem) {
        const dt = scene.getEngine().getDeltaTime() / 1000;
        this.corruptionTendrilSystem.update(dt);
      }
    };
    this.updateCallbacks.push(corruptionUpdate);
    scene.registerBeforeRender(corruptionUpdate);

    // 6. ProceduralMorphSystem (enemies)
    const morphUpdate = () => {
      if (this.proceduralMorphSystem) {
        const dt = scene.getEngine().getDeltaTime() / 1000;
        this.proceduralMorphSystem.update(dt);
      }
    };
    this.updateCallbacks.push(morphUpdate);
    scene.registerBeforeRender(morphUpdate);

    // 7. CrystallineCubeBossSystem (boss) — self-registers its own update loop in initialize()
    // 8. EchoSystem (feedback) — no per-frame update needed (event-driven)
    // 9. MechanicalDegradationSystem (fallback) — self-registers its own update loop in activate()

    // 10. PostProcessCorruption (post-process) — no per-frame update needed (tension listener updates effects)
    // 11. ImmersionAudioBridge (audio) — no per-frame update needed (tension listener updates reverb)
    // 12. DreamTypeHandler (archetype logic)
    const dreamUpdate = () => {
      if (this.dreamTypeHandler) {
        const handler = this.dreamTypeHandler.getCurrentHandler();
        if (handler) {
          handler.update(scene.getEngine().getDeltaTime() / 1000); // convert ms to seconds
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
    // Reverse order: 25 → 5
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

    // Physics systems (reverse order: 8 → 5)
    this.handPhysics?.dispose();
    this.handPhysics = null;

    this.platterPhysics?.dispose();
    this.platterPhysics = null;

    this.keycapPhysics?.dispose();
    this.keycapPhysics = null;

    this.havokInitializer?.dispose();
    this.havokInitializer = null;

    // Clear update callbacks
    this.updateCallbacks = [];
  }

  /**
   * Get system instance by name (for external access).
   */
  getHavokInitializer(): HavokInitializer | null {
    return this.havokInitializer;
  }

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
}
