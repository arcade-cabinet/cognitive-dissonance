# ECS - Cognitive Dissonance

**ECS Implementation**
- Miniplex 2.0 for lightweight, performant entity-component-system architecture.
- API: `world.with()` for queries, `world.add()` for entity creation (not the deprecated 1.x `archetype()` and `createEntity()`).
- All game objects are entities with typed components.

**Core Archetypes** (reduced to 4 main Dream archetypes + supporting archetypes)

**Level Archetypes (Dreams)**
- `PlatterRotationDream`: platterRotation (rpm, direction), patternConfig, enemyConfig, tensionCurve, difficultyConfig, audioParams.
- `LeverTensionDream`: leverConfig (pullThreshold), patternConfig, enemyConfig, tensionCurve, difficultyConfig, audioParams.
- `KeySequenceDream`: sequenceConfig (requiredKeys, memoryWindow), patternConfig, enemyConfig, tensionCurve, difficultyConfig, audioParams.
- `CrystallineCubeBossDream`: bossConfig (phases, worldCrush), patternConfig, enemyConfig, tensionCurve, difficultyConfig, audioParams.

**Hand Archetypes (XR)**
- `Hand_Archetype`: handedness (left/right), joints (26 per hand), gripStrength, pinchStrength.
- Created by XRManager when hand tracking is detected.

**AR Archetypes**
- `AR_Archetype`: arMode (glasses/phone), anchorTransform, planeDetection.
- Created by ARSessionManager for spatial anchoring.

**Enemy Archetypes**
- `YukaEnemy`: yukaAgent, morphTraitIndex (0--6), visualMesh, health.
  - 7 Yuka Traits (GPU vertex morphing via `MorphTargetManager`):
    - 0 — **NeonRaymarcher**: Fast evasion, neon trails, base form
    - 1 — **TendrilBinder**: Extends corruption to sphere (2× tension increase)
    - 2 — **PlatterCrusher**: Heavy, flattens keycaps (requires multi-finger hold)
    - 3 — **GlassShatterer**: Fragile, high-speed, glass-shard death burst
    - 4 — **EchoRepeater**: Morphs duplicate self (up to 3 copies)
    - 5 — **LeverSnatcher**: Forces unwanted AR mode switch
    - 6 — **SphereCorruptor**: Morphs toward sphere, accelerates corruption
- `CrystallineCubeBoss`: bossPhase (1--5), cubeScale, worldDistortion.

**Systems**
- `TensionSystem`: Singleton managing tension 0.0--0.999, over-stabilization rebound, tension listeners.
- `DifficultyScalingSystem`: Logarithmic scaling from tension + time + seed.
- `PatternStabilizationSystem`: Keycap hold tracking, pattern matching, coherence bonus (0.09), tendril retraction.
- `CorruptionTendrilSystem`: SolidParticleSystem with 24 cylinder tendrils, tension-proportional spawning.
- `MechanicalAnimationSystem`: GSAP timelines for slit, lever, keycap, platter animations.
- `EchoSystem`: Ghost keycap spawning (translucent red, alpha 0.4, 1800ms auto-dispose).
- `ProceduralMorphSystem`: MorphTargetManager, 7 Yuka traits, GPU vertex morphing.
- `CrystallineCubeBossSystem`: 5-phase GSAP world-crush timeline:
    - Phase 1 (Emerge): Boss spawns above platter with glass-shard particles.
    - Phase 2 (Descend): GSAP gravity descent toward platter.
    - Phase 3 (Crush): Slam into real-world plane, AR anchor jitter, camera shake.
    - Phase 4 (Counter): Hand grip OR phone stabilization counter opportunity.
    - Phase 5 (Shatter/Break): Success = shard burst into 7 Yuka; failure = 0.99 tension + platter deformation.
- `PostProcessCorruption`: DefaultRenderingPipeline with bloom, vignette, chromatic aberration.
- `ImmersionAudioBridge`: Tone.js + expo-audio native bridge.
- `KeyboardInputSystem`: Physical keyboard to gameplay bridge (letter keys, spacebar, Enter, arrows).
- `GamePhaseManager`: Phase state machine (loading/title/playing/shattered/error).

**Benefits**
- Decoupled, easy to extend with new Dream archetypes.
- High performance for many entities via Miniplex queries.
- Buried seed resets all systems cleanly via `spawnDreamFromSeed()`.

This ECS is clean, scalable, and perfectly aligned with the buried-seed procedural core.
