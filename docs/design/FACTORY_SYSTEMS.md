# Factory Systems - Cognitive Dissonance

**Overview**
The buried seed is the single source of truth for all procedural generation. It ensures every run feels like a unique "dream" the AI is having, while maintaining deterministic replayability.

**Seed Store (`src/store/seed-store.ts`)**
- Zustand store with `seedString`, mulberry32 RNG instance, and `hashSeed()` utility.
- `generateNewSeed()` creates a new seed and resets all systems.
- `replayLastSeed()` continues with the previous seed for identical replay.
- All systems subscribe to seed changes for instant reset.

**Seed-Derived Procedural Generation (`src/ecs/World.ts`)**
- `spawnDreamFromSeed()` returns complete Dream entity with archetype-specific components.
- All randomness is derived from the seed — no `Math.random()` outside the factory.
- Parameters include: dream archetype selection (`seedHash % 4`), pattern config (count, speed, holdDuration), enemy config (spawnRate, morphTraits, aggression), tension curves (baseIncrease, stabilizationReduction, reboundProbability), difficulty config (scalingCoefficient, dampingFactor), audio params (bpm, swing, rootNote).
- The seed determines everything: which of the 4 Dream archetypes spawns, the exact enemy wave composition, the difficulty curve shape, and the audio atmosphere.

**Dream Archetypes (Miniplex 2.0 ECS)**
1. **PlatterRotationDream**: Platter rotation parameters (rpm, direction).
2. **LeverTensionDream**: Lever pull threshold and mode switching.
3. **KeySequenceDream**: Required key ordering and memory window.
4. **CrystallineCubeBossDream**: 5-phase boss timeline configuration.

**Integration Points**
- PatternStabilizationSystem uses seed for pattern colors and speeds.
- ProceduralMorphSystem uses seed for 7 Yuka trait distribution and morph weights.
- ImmersionAudioBridge uses seed for BPM, swing, sequence patterns.
- SphereNebulaMaterial uses seed for initial hue and corruption patterns.
- CorruptionTendrilSystem uses seed-derived color palette for tendril coloring.

**Tension Curve Configuration**
- Loaded from `src/configs/patterns.json` via `configLoader.ts`.
- 3 tension curve variants: `default`, `aggressive`, `forgiving`.
- Key parameters per curve:
  - `increaseRate`: Tension increase per missed pattern (default: 0.005, retuned from 0.018 during playtesting).
  - `decreaseRate`: Tension decrease per successful hold (default: 0.012).
  - `overStabilizationThreshold`: Low-tension threshold triggering rebound (default: 0.05).
  - `reboundProbability`: Chance of tension rebound when over-stabilized (default: 0.02).
  - `reboundAmount`: Tension increase on rebound event (default: 0.12).
- Phase progression: 3 phases with escalating pattern counts and spawn rates.

**Logarithmic Escalation**
- DifficultyScalingSystem applies `scaledValue = baseValue * (1 + k * Math.log1p(tension * timeScale))`.
- Seed-derived damping coefficient (0.7--0.9) prevents runaway escalation.
- Creates smooth but dramatic difficulty ramp without breaking the buried seed determinism.
- Endless progression with asymptotic ceilings.
- `scene.metadata.currentTension` updated per frame for cross-system reads.

This system is the heart of replay value and thematic consistency.
