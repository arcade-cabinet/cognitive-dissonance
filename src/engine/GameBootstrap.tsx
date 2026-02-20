import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
// Side-effect: register createDynamicTexture on engine (needed by DynamicTexture with tree-shaking)
import '@babylonjs/core/Engines/Extensions/engine.dynamicTexture';
import '@babylonjs/core/Engines/WebGPU/Extensions/engine.dynamicTexture';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import gsap from 'gsap';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSeedConfigs } from '../configs/configLoader';
import { ArchetypeActivationSystem } from '../ecs/ArchetypeActivationSystem';
import { spawnKeycapEntities, spawnLeverEntity, spawnPlatterEntity, spawnSphereEntity } from '../ecs/primitives';
import { world } from '../ecs/World';
import { createMechanicalPlatter } from '../objects/MechanicalPlatter';
import { DreamSequencer } from '../sequences/DreamSequencer';
import { TitleAndGameOverSystem } from '../sequences/TitleAndGameOverSystem';
import { initializeShaderRegistry } from '../shaders/registry';
import { SphereNebulaMaterial } from '../shaders/SphereNebulaMaterial';
import { useGameStore } from '../store/game-store';
import { useSeedStore } from '../store/seed-store';
import { SystemOrchestrator } from '../systems/SystemOrchestrator';
import { TensionSystem } from '../systems/TensionSystem';
import type { GameEntity } from '../types';
import { DiegeticCoherenceRing } from '../ui/DiegeticCoherenceRing';
import { TitleOverlay } from '../ui/TitleOverlay';
import { hashSeed } from '../utils/seed-helpers';
import { useScene } from './SceneManager';

// Keycap letters matching MechanicalPlatter creation order
const KEYCAP_LETTERS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'] as const;

/**
 * GameBootstrap — Bridges React context to Babylon.js scene.
 *
 * Game flow (per user design):
 * 1. Semi-translucent title overlay ("COGNITIVE DISSONANCE") covers the scene
 * 2. Overlay fades out → reveals platter with AI orb (eye facing away)
 * 3. Garage-door slit opens → PLAY key emerges
 * 4. Enter key → PLAY keycap depresses, orb animation, gameplay begins
 *
 * Synchronous phase (immediate render):
 *   Camera, light, platter meshes, nebula material, coherence ring
 *
 * Asynchronous phase (gameplay systems come online):
 *   SystemOrchestrator.initAll() → Havok WASM + Tone.js audio graph, then
 *   wires all deferred systems to mesh references.
 *   Audio context is deferred to first user gesture (Enter to start game).
 */
export const GameBootstrap: React.FC = () => {
  const { scene, engine } = useScene();
  const disposablesRef = useRef<Array<{ dispose: () => void }>>([]);
  const orchestratorRef = useRef<SystemOrchestrator | null>(null);
  const playKeycapRef = useRef<Mesh | null>(null);
  const sphereRef = useRef<Mesh | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const systemsReadyRef = useRef(false);
  const startSequenceRunningRef = useRef(false);

  // Called when title overlay fade completes → trigger garage-door sequence
  const handleOverlayFadeComplete = useCallback(() => {
    setShowOverlay(false);
    console.log('[GameBootstrap] Title overlay faded — PLAY keycap already visible, opening slit');

    // Trigger slit open (PLAY keycap is already visible between slit halves)
    if (systemsReadyRef.current && orchestratorRef.current) {
      const mechAnim = orchestratorRef.current.getMechanicalAnimationSystem();
      if (mechAnim) {
        mechAnim.openSlit();
      }
    }
  }, []);

  /**
   * Choreographed start-game sequence triggered by Enter key during title phase.
   *
   * Timeline:
   * 0.00s — Resume AudioContext (user gesture)
   * 0.00s — PLAY keycap depresses (y drops 0.03) + mechanical click sound
   * 0.20s — Sphere rolls to face camera (rotation.z = 0.4 rad ≈ 23°)
   * 0.80s — Hold (eye faces player)
   * 1.10s — Sphere rolls back (rotation.z = 0)
   * 1.50s — setPhase('playing'), Dream spawning begins
   */
  const handleStartGameSequence = useCallback(() => {
    if (startSequenceRunningRef.current) return; // Prevent double-trigger
    startSequenceRunningRef.current = true;

    const orchestrator = orchestratorRef.current;
    const playKeycap = playKeycapRef.current;
    const sphere = sphereRef.current;

    if (!orchestrator) {
      useGameStore.getState().setPhase('playing');
      return;
    }

    console.log('[GameBootstrap] Start-game choreography beginning');

    // Resume AudioContext immediately (this IS the user gesture)
    orchestrator.getImmersionAudioBridge()?.resumeOnUserGesture();

    const tl = gsap.timeline({
      onComplete: () => {
        // Sequence complete — transition to playing phase
        useGameStore.getState().setPhase('playing');
        startSequenceRunningRef.current = false;
        console.log('[GameBootstrap] Start-game choreography complete — phase → playing');
      },
    });

    // PLAY keycap depresses (satisfying mechanical press)
    if (playKeycap) {
      tl.to(
        playKeycap.position,
        {
          y: playKeycap.position.y - 0.03,
          duration: 0.15,
          ease: 'power2.in',
          onComplete: () => {
            // Mechanical click sound at bottom of press
            orchestrator.getImmersionAudioBridge()?.playMechanicalClick();
            console.log('[GameBootstrap] PLAY keycap depressed — click!');
          },
        },
        0,
      );
    }

    // Sphere rolls to face camera (orb's "eye" turns toward player)
    if (sphere) {
      tl.to(
        sphere.rotation,
        {
          z: 0.4, // ~23° roll toward camera
          duration: 0.6,
          ease: 'power2.inOut',
        },
        0.2,
      );

      // Hold eye facing (gap handled by timeline position)

      // Sphere rolls back
      tl.to(
        sphere.rotation,
        {
          z: 0,
          duration: 0.4,
          ease: 'power2.inOut',
        },
        1.1,
      );
    }
  }, []);

  useEffect(() => {
    if (!scene || !engine) return;

    // Register custom shaders first
    initializeShaderRegistry();

    // ── Camera ──────────────────────────────────────
    const camera = new ArcRotateCamera('camera', Math.PI / 2, Math.PI / 2.5, 2, Vector3.Zero(), scene);
    camera.attachControl(engine.getRenderingCanvas(), true);
    camera.lowerRadiusLimit = 0.8;
    camera.upperRadiusLimit = 5;
    camera.wheelDeltaPercentage = 0.01;

    // ── Lighting ────────────────────────────────────
    const light = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // ── Mechanical Platter + All Meshes ─────────────
    const platter = createMechanicalPlatter(scene);
    playKeycapRef.current = platter.playKeycap;
    sphereRef.current = platter.sphere;

    // ── Spawn Primitive ECS Entities ─────────────
    // Each interaction surface becomes a Miniplex entity with its component data.
    // These entities persist for the session lifetime and get reconfigured per-Dream
    // by ArchetypeActivationSystem.
    spawnKeycapEntities(world, platter.keycaps);
    spawnLeverEntity(world, platter.lever);
    spawnPlatterEntity(world, platter.platter);
    spawnSphereEntity(world, platter.sphere);

    // ── Sphere Nebula Material ──────────────────────
    const nebulaMaterial = new SphereNebulaMaterial('sphereNebula', scene, platter.sphere);

    // ── Diegetic Coherence Ring ─────────────────────
    const coherenceRing = new DiegeticCoherenceRing(scene, platter.sphere);

    // ── Title System (for game-over text only now) ──
    const titleSystem = new TitleAndGameOverSystem(scene);

    // ── Tension listeners (visual feedback — wired immediately) ──
    const tensionSystem = TensionSystem.getInstance();
    tensionSystem.addListener((tension: number) => {
      nebulaMaterial.setTension(tension);
      coherenceRing.setTension(tension);
    });

    // ── Initial State ───────────────────────────────
    useSeedStore.getState().generateNewSeed();
    useGameStore.getState().setPhase('title');

    // ── SystemOrchestrator: Initialize all 25 gameplay systems (async) ──
    const orchestrator = SystemOrchestrator.getInstance();
    orchestratorRef.current = orchestrator;

    const initSystems = async () => {
      await orchestrator.initAll(engine as Engine, scene);
      console.log('[GameBootstrap] SystemOrchestrator.initAll() complete');

      // ── DreamSequencer + ArchetypeActivationSystem ──
      const dreamSequencer = DreamSequencer.getInstance();
      const archetypeActivation = ArchetypeActivationSystem.getInstance();

      // ── Wire deferred systems to mesh references ──

      // MechanicalAnimationSystem: slit, lever, keycaps (as Map), platter
      const keycapsMap = new Map<string, Mesh>();
      for (let i = 0; i < platter.keycaps.length; i++) {
        keycapsMap.set(KEYCAP_LETTERS[i], platter.keycaps[i]);
      }
      const mechAnimSystem = orchestrator.getMechanicalAnimationSystem();
      mechAnimSystem?.init(scene, platter.slitTop, platter.slitBottom, platter.lever, keycapsMap, platter.platter);
      mechAnimSystem?.setRimPositions(platter.rimPositions);

      // CorruptionTendrilSystem: sphere + seed-derived color palette
      const seedHash = hashSeed(useSeedStore.getState().seedString);
      orchestrator.getCorruptionTendrilSystem()?.init(scene, platter.sphere, seedHash);

      // PostProcessCorruption: camera for bloom/vignette/chromatic aberration
      const postProcess = orchestrator.getPostProcessCorruption();
      postProcess?.init(scene, camera);
      if (postProcess) {
        tensionSystem.addListener((tension: number) => {
          postProcess.setTension(tension);
        });
      }

      // ShatterSequence: sphere, platter, keycaps for glass-shard SPS
      orchestrator.getShatterSequence()?.initialize(scene, platter.sphere, platter.platter, platter.keycaps);

      // GamePhaseManager: platter + sphere for phase transitions
      // H7: Wire SpatialAudioManager with seed-derived audio params
      const spatialAudio = orchestrator.getSpatialAudioManager();
      if (spatialAudio) {
        spatialAudio.initialize(scene, { bpm: 120, rootNote: 0, swing: 0 });
      }

      const phaseManager = orchestrator.getGamePhaseManager();
      if (phaseManager) {
        phaseManager.initialize(scene, platter.platter, platter.sphere);
        // AudioContext resume is handled in start-game choreography (handleStartGameSequence)
        phaseManager.setOnShatteredPhaseStart(() => {
          // Record Dream shatter in DreamSequencer
          const currentTension = scene.metadata?.currentTension ?? 0;
          dreamSequencer.recordDreamShatter(currentTension);

          titleSystem.showGameOver(platter.sphere);
          orchestrator.getShatterSequence()?.trigger();
          // Stop pattern spawning when game ends
          orchestrator.getPatternStabilizationSystem()?.stopPatternSpawning();
          // Disable trackball during shatter (sphere is exploding)
          orchestrator.getSphereTrackballSystem()?.setEnabled(false);
          // H3: Disable per-frame updates to prevent race condition
          // (YukaSteeringSystem and ProceduralMorphSystem continue updating
          // while ShatterSequence disposes their meshes)
          orchestrator.setUpdatesEnabled(false);
        });

        // H1: Wire title phase callback → full state reset on restart
        phaseManager.setOnTitlePhaseStart(() => {
          console.log('[GameBootstrap] Title phase reset — restoring all system state');

          // Re-enable per-frame updates (H3 fix counterpart)
          orchestrator.setUpdatesEnabled(true);

          // Deactivate current archetype (resets all primitive entities to inactive)
          archetypeActivation.deactivate();

          // Reset tension to zero and unfreeze
          tensionSystem.unfreeze();
          tensionSystem.setTension(0);

          // Reset corruption tendrils
          orchestrator.getCorruptionTendrilSystem()?.reset();

          // Reset echo ghosts
          orchestrator.getEchoSystem()?.reset();

          // Reset shatter sequence (restores sphere visibility, clears isShattered)
          orchestrator.getShatterSequence()?.reset();

          // Reset sphere trackball (rotation + momentum → identity, re-enable)
          orchestrator.getSphereTrackballSystem()?.setEnabled(true);
          orchestrator.getSphereTrackballSystem()?.reset();

          // Ensure sphere is visible and enabled
          platter.sphere.isVisible = true;
          platter.sphere.setEnabled(true);

          // Deactivate current dream handler
          const dream = orchestrator.getDreamTypeHandler();
          if (dream?.getCurrentHandler()) {
            dream.getCurrentHandler()?.dispose();
          }

          // Reset Yuka steering system
          orchestrator.getYukaSteeringSystem()?.reset();

          // Retract all keycaps back to center (hidden for title screen)
          const mechAnimForRetract = orchestrator.getMechanicalAnimationSystem();
          if (mechAnimForRetract) {
            for (const letter of KEYCAP_LETTERS) {
              mechAnimForRetract.retractKeycap(letter);
            }
          }

          // Clear stale dreamStartTime
          scene.metadata = scene.metadata || {};
          scene.metadata.dreamStartTime = 0;

          // Reset start sequence flag so Enter key works again
          startSequenceRunningRef.current = false;
        });

        // Wire playing phase callback → activate Dream from seed
        phaseManager.setOnPlayingPhaseStart(() => {
          // v3.0: DreamSequencer selects from 25 archetypes with pacing awareness
          const seedString = useSeedStore.getState().seedString;

          // Start session if not already started (first play after title)
          if (dreamSequencer.getDreamIndex() === 0) {
            dreamSequencer.startSession(seedString);
          }

          // Select next Dream from pacing-appropriate pool
          const dreamConfig = dreamSequencer.selectNextDream();

          // Configure primitive entities via ArchetypeActivationSystem
          archetypeActivation.activate(dreamConfig.archetypeType, dreamConfig.seedHash, scene);

          // Set scene.metadata.dreamStartTime for DifficultyScalingSystem elapsed time
          scene.metadata = scene.metadata || {};
          scene.metadata.dreamStartTime = performance.now();

          // Initialize TensionSystem with Dream-specific tension curve
          const tensionSystem = TensionSystem.getInstance();
          tensionSystem.init(dreamConfig.tensionCurve);

          // Set tension to carryover value from previous Dream
          if (dreamConfig.carryoverTension > 0) {
            tensionSystem.setTension(dreamConfig.carryoverTension);
          }

          // Bridge to DreamTypeHandler for per-frame gameplay logic
          // (DreamTypeHandler still handles the 4 original archetypes;
          //  new archetypes get default no-op handling until handlers are written)
          const dream = orchestrator.getDreamTypeHandler();
          if (dream) {
            const { patterns: p } = loadSeedConfigs(seedString);
            const phase = p.phases[0];
            const sh = dreamConfig.seedHash;
            const slots = archetypeActivation.getActiveSlots();

            // Build backward-compatible GameEntity for DreamTypeHandler
            const base: GameEntity = {
              level: true,
              tensionCurve: dreamConfig.tensionCurve,
              keyPatterns: phase.patternKeys,
              buriedSeedHash: sh,
            };

            // Build level entity with archetype component (for handler slot access)
            // + old-style property flags for backward-compatible handlers
            const type = dreamConfig.archetypeType;
            const archetype = archetypeActivation.getActiveArchetype() ?? undefined;
            let levelEntity: GameEntity;
            if (type === 'PlatterRotation') {
              levelEntity = { ...base, archetype, platterCore: true, rotationAxis: true, rotationRPM: (slots as any)?.rotationRPM ?? 5 };
            } else if (type === 'LeverTension') {
              levelEntity = { ...base, archetype, leverCore: true, slitPeriod: (slots as any)?.slitPeriod ?? 2.5, frequencyTolerance: (slots as any)?.frequencyTolerance ?? 0.15 };
            } else if (type === 'KeySequence') {
              levelEntity = { ...base, archetype, keycapPatterns: [phase.patternKeys], stabilizationHoldTime: (slots as any)?.baseHoldTime ?? 1200 };
            } else if (type === 'CrystallineCubeBoss') {
              levelEntity = { ...base, archetype, boss: true, cubeCrystalline: true, slamCycles: (slots as any)?.slamCycles ?? 3 };
            } else {
              levelEntity = { ...base, archetype };
            }
            dream.activateDream(levelEntity, dreamConfig.archetypeType);
          }

          // Start pattern spawning (corruption patterns approach keycaps)
          orchestrator.getPatternStabilizationSystem()?.startPatternSpawning();

          // Emerge all keycaps from retracted center to rim positions
          const mechAnimForEmerge = orchestrator.getMechanicalAnimationSystem();
          if (mechAnimForEmerge) {
            for (const letter of KEYCAP_LETTERS) {
              mechAnimForEmerge.emergeKeycap(letter);
            }
          }

          console.log(`[GameBootstrap] Dream activated: ${dreamConfig.archetypeType} (phase: ${dreamConfig.pacingPhase})`);
        });
      }

      // ── Load seed configs and initialize TensionSystem ──
      const seedString = useSeedStore.getState().seedString;
      const { tensionCurve, difficultyConfig, patterns } = loadSeedConfigs(seedString);

      // TensionSystem: CRITICAL — without init(), increase()/decrease() are no-ops
      tensionSystem.init(tensionCurve);

      // Write currentTension to scene.metadata for cross-system reads
      // (DifficultyScalingSystem and DreamTypeHandler read scene.metadata.currentTension)
      scene.metadata = scene.metadata || {};
      tensionSystem.addListener((tension: number) => {
        scene.metadata.currentTension = tension;
      });

      // DreamSequencer: track peak tension per Dream and per session
      tensionSystem.addListener((tension: number) => {
        dreamSequencer.updatePeakTension(tension);
      });

      // ── PatternStabilizationSystem: pattern tracking + coherence bonus ──
      const patternStab = orchestrator.getPatternStabilizationSystem();
      if (patternStab) {
        patternStab.initialize(scene, tensionSystem);
        patternStab.setKeycapMeshMap(keycapsMap);
        patternStab.setLevelEntity({
          level: true,
          tensionCurve,
          keyPatterns: patterns.phases[0].patternKeys,
        } as GameEntity);
        // Set phase progression data — phases advance as tension crosses thresholds
        patternStab.setPhases(patterns.phases);
      }

      // ── EchoSystem: ghost keycap spawning on missed patterns ──
      const echoSystem = orchestrator.getEchoSystem();
      echoSystem?.initialize(scene, tensionSystem);

      // ── DifficultyScalingSystem: logarithmic difficulty scaling ──
      const diffScaling = orchestrator.getDifficultyScalingSystem();
      diffScaling?.initialize(scene, difficultyConfig);

      // ── DreamTypeHandler: per-archetype gameplay handlers ──
      const dreamHandler = orchestrator.getDreamTypeHandler();
      dreamHandler?.initialize(scene);

      // ── CrystallineCubeBossSystem: 5-phase boss timeline ──
      const bossSystem = orchestrator.getCrystallineCubeBossSystem();
      const degradation = orchestrator.getMechanicalDegradationSystem();
      const morphSystem = orchestrator.getProceduralMorphSystem();
      if (bossSystem && degradation && morphSystem) {
        bossSystem.initialize(scene, tensionSystem, degradation, morphSystem, platter.platter);
      }

      // ── YukaSteeringSystem: AI enemy movement ──
      const yukaSystem = orchestrator.getYukaSteeringSystem();
      yukaSystem?.initialize(scene, platter.sphere, platter.lever);

      // ── Tension propagation listeners ──
      // ImmersionAudioBridge: reverb wet 0.3→0.9 + brown noise volume
      const audioBridge = orchestrator.getImmersionAudioBridge();
      if (audioBridge) {
        tensionSystem.addListener((tension: number) => {
          audioBridge.setTension(tension);
        });
      }

      // ProceduralMorphSystem: tension-driven morphProgress
      if (morphSystem) {
        tensionSystem.addListener((tension: number) => {
          morphSystem.setTension(tension);
        });
      }

      // KeyboardInputSystem: bridges physical keyboard to gameplay systems
      const mechAnim = orchestrator.getMechanicalAnimationSystem();
      if (patternStab && mechAnim && dreamHandler) {
        const kbInput = orchestrator.getKeyboardInputSystem();
        kbInput?.initialize(scene, patternStab, mechAnim, dreamHandler);

        // Register choreographed start-game sequence for Enter during title
        kbInput?.registerTitleEnterCallback(handleStartGameSequence);
      }

      // ── SphereTrackballSystem: core arcball rotation mechanic ──
      const trackball = orchestrator.getSphereTrackballSystem();
      if (trackball) {
        trackball.initialize(scene, platter.sphere);

        // Diegetic audio feedback: angular speed drives tension micro-adjustments
        // Spinning the sphere faster subtly increases tension (destabilizing)
        scene.registerBeforeRender(() => {
          const speed = trackball.getAngularSpeed();
          if (speed > 0.005) {
            tensionSystem.increase(speed * 0.01);
          }
        });
      }

      // ── HandInteractionSystem: 26-joint hand tracking → gameplay mapping ──
      const handInteraction = orchestrator.getHandInteractionSystem();
      if (handInteraction && patternStab && mechAnim) {
        handInteraction.init(scene, patternStab, mechAnim, tensionSystem, keycapsMap, platter.lever, platter.sphere);
      }

      // ── MechanicalHaptics: brown noise rumble + cross-platform vibration ──
      const haptics = orchestrator.getMechanicalHaptics();
      if (haptics) {
        await haptics.init();
        tensionSystem.addListener((tension: number) => {
          haptics.setTension(tension);
        });
      }

      // ── ARSessionManager: dual AR/MR mode (XR session lifecycle) ──
      const arSession = orchestrator.getARSessionManager();
      if (arSession) {
        await arSession.initialize(scene, engine as Engine);
      }

      // ── PhoneProjectionTouchSystem: wire sphere drag → SphereTrackball ──
      if (trackball) {
        const { PhoneProjectionTouchSystem } = await import('../xr/PhoneProjectionTouchSystem');
        const phoneTouch = PhoneProjectionTouchSystem.getInstance();
        phoneTouch.setSphereDragCallback((dx, dy) => {
          trackball.applyRotationDelta(dx, dy);
        });
      }

      systemsReadyRef.current = true;
      console.log('[GameBootstrap] All deferred systems wired to meshes — game is PLAYABLE');
    };

    initSystems().catch((err) => {
      console.error('[GameBootstrap] System initialization failed:', err);
      useGameStore.getState().setPhase('loading');
    });

    // ── Disposables ─────────────────────────────────
    disposablesRef.current = [
      { dispose: () => camera.dispose() },
      { dispose: () => light.dispose() },
      nebulaMaterial,
      coherenceRing,
      titleSystem,
      // SystemOrchestrator.disposeAll() handles all 25 systems
      { dispose: () => orchestrator.disposeAll() },
      {
        dispose: () => {
          platter.sphere.dispose();
          for (const keycap of platter.keycaps) keycap.dispose();
          platter.playKeycap.dispose();
          platter.continueKeycap.dispose();
          platter.lever.dispose();
          platter.slitTop.dispose();
          platter.slitBottom.dispose();
          platter.track.dispose();
          platter.platter.dispose();
        },
      },
    ];

    return () => {
      for (const d of disposablesRef.current) {
        d.dispose();
      }
      disposablesRef.current = [];
    };
  }, [scene, engine, handleStartGameSequence]);

  return showOverlay ? <TitleOverlay onFadeComplete={handleOverlayFadeComplete} /> : null;
};
