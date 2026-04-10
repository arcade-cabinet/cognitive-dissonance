---
title: Level Archetypes (25 Designs)
updated: 2026-04-10
status: current
domain: product
---

# Level Archetypes — Cognitive Dissonance v3.0

## Design Philosophy

Every Dream the player enters is an instance of one of 25 level archetypes. The seed system selects an archetype and mutates its **slot parameters** to create variation. Each archetype choreographs a unique combination of the six interaction primitives — but the diegetic feedback is always the same: tension flows through nebula color, Fresnel rim, audio reverb, and corruption post-processing. There is no HUD. The machine speaks through sound and light.

## Six Interaction Primitives

| # | Surface | Constraint | Verbs |
|---|---------|-----------|-------|
| 1 | **Keycaps** (14 keys, any subset) | Fixed to platter, emerge vertically | press, hold, release, sequence |
| 2 | **Lever** (continuous 0.0–1.0) | Pivots in place on platter | pull, hold-position, pump, gate |
| 3 | **Platter** (rotates around Y-axis) | Fixed center, rotates in-plane | spin, stop, reverse, match-speed |
| 4 | **Sphere** (trackball in inset) | Free rotation, fixed position | rotate, aim, track, drift, stabilize |
| 5 | **Crystalline Cube** (SDF geometry) | Free 3D movement | orbit, approach, facet-flash, reflect, shatter |
| 6 | **Morph Cube** (shape-shifting) | Free 3D movement | pulse, stretch, split, reform, mirror |

## Archetype Catalog

---

### 1. PlatterRotation

**Feel:** Spinning record — keys orbit past your reach zone

**Surfaces:** Platter + Keycaps
**Player verb:** Hold keycaps as they orbit through the 90deg reach zone
**Cube behavior:** None
**Tension driver:** Missed keys in reach zone, RPM increases with tension
**Seed slots:** `rotationRPM` (2–8), `keycapSubset` (4–14 keys), `reachZoneArc` (60deg–120deg), `direction` (CW/CCW)

*Inspiration: Turntable DJ mechanics, beatmania IIDX controller rotation*

---

### 2. LeverTension

**Feel:** Radio tuning — dial in the right frequency before the window closes

**Surfaces:** Lever + Slit
**Player verb:** Match lever position to corruption pattern frequency within tolerance
**Cube behavior:** None
**Tension driver:** Frequency mismatch, patterns that pass unmatched
**Seed slots:** `slitPeriod` (1.5–4s), `frequencyTolerance` (0.05–0.25), `patternCount` (1–3 simultaneous)

*Inspiration: Lockpicking sweet-spot mechanics (Skyrim, Fallout), safe cracking rotation*

---

### 3. KeySequence

**Feel:** Simon Says — remember and reproduce

**Surfaces:** Keycaps + Ghost highlights
**Player verb:** Press keys in displayed order within time window
**Cube behavior:** None
**Tension driver:** Wrong key resets sequence, timeout on per-key window
**Seed slots:** `sequenceLength` (2–5), `timeWindowMs` (400–2000), `keycapSubset`, `showDuration` (how long pattern displays)

*Inspiration: Simon electronic game, Brain Age pattern memory*

---

### 4. CrystallineCubeBoss

**Feel:** Siege defense — shield and counter-attack

**Surfaces:** Crystalline Cube + Lever + Keycaps
**Player verb:** Angle shield with lever, fire stabilization pulses with keycaps
**Cube behavior:** Descends (4s), slams (up to 3 cycles), retreats on counter
**Tension driver:** Slam impact, cube health regeneration over time
**Seed slots:** `slamCycles` (1–5), `bossHealth` (1.0–2.5), `descentSpeed`, `counterWindowMs` (200–800)

*Inspiration: Boss patterns in Cuphead, parry mechanics in Sekiro*

---

### 5. FacetAlign

**Feel:** Rubik's Cube meets safe cracking — rotate until the pattern clicks

**Surfaces:** Sphere + Crystalline Cube
**Player verb:** Rotate sphere to align cube facet colors with target pattern shown on nebula
**Cube behavior:** Hovers above platter, facets light up when sphere rotation aligns within threshold
**Tension driver:** Time pressure, facets scramble periodically, wrong alignment briefly locks rotation
**Seed slots:** `facetCount` (4–8), `alignmentThresholdDeg` (5–20), `scrambleIntervalS` (8–20), `lockoutDurationMs` (300–1000)

*Inspiration: Combination locks, Ratchet & Clank ring puzzles, Rubik's Cube speedsolving*

---

### 6. OrbitalCatch

**Feel:** Juggling planets — track and intercept orbiting targets

**Surfaces:** Sphere + Crystalline Cube + Morph Cube
**Player verb:** Rotate sphere to aim at cubes as they orbit, press keycap to "catch" when aligned
**Cube behavior:** Orbit platter at varying altitudes, speeds, and directions. Multiple cubes at once.
**Tension driver:** Missed catches, cubes accelerate with tension, new cubes spawn
**Seed slots:** `orbitCount` (1–4), `orbitSpeedBase` (0.5–2.0 rad/s), `orbitRadiusRange`, `altitudeRange` (Y: -0.3 to 0.5), `catchWindowDeg` (10–30)

*Inspiration: Orbital mechanics games, Katamari target tracking, asteroid defense*

---

### 7. RefractionAim

**Feel:** Periscope — steer light through a crystal lens

**Surfaces:** Sphere + Crystalline Cube + Keycaps
**Player verb:** Rotate sphere to steer nebula light through crystalline cube refraction onto target keycaps, which glow when lit
**Cube behavior:** Stationary or slowly drifting, acts as a prism/lens
**Tension driver:** Light beam misalignment, target keycaps change, cube drifts off-center
**Seed slots:** `beamWidth` (narrow–wide), `cubePosition`, `targetKeycapCount` (1–4), `driftSpeed`, `refractionAngle`

*Inspiration: Prism puzzles in Zelda, light reflection puzzles in Portal*

---

### 8. Labyrinth

**Feel:** Marble in a maze — tilt the world, guide the particle

**Surfaces:** Sphere (primary)
**Player verb:** Rotate sphere to guide an internal glowing particle through channels toward a target zone. Sphere nebula shows the internal maze pattern.
**Cube behavior:** None (or optional: morph cube as moving obstacle inside sphere)
**Tension driver:** Particle in dead zones, time spent off-path, particle hitting maze walls
**Seed slots:** `mazeComplexity` (3x3 to 8x8), `particleSpeed`, `targetZoneSize`, `wallBounce` (elastic/sticky), `mazeRotationOffset`

*Inspiration: Marble Madness trackball, wooden labyrinth tilt maze, Super Monkey Ball*

---

### 9. TurntableScratch

**Feel:** DJ scratching — spin forward, scratch back, drop the beat

**Surfaces:** Platter + Lever + Keycaps
**Player verb:** Spin platter forward to build a musical phrase, then scratch (reverse) at marked moments. Lever controls scratch intensity. Keys trigger beat drops.
**Cube behavior:** None
**Tension driver:** Mistimed scratches, off-beat drops, scratch too early or late
**Seed slots:** `phraseLengthBeats` (4–16), `scratchPoints` (1–4 per phrase), `bpm` (80–140), `keyDropSubset` (2–6 keys), `scratchWindowMs` (100–400)

*Inspiration: beatmania IIDX turntable, DJ Hero scratch mechanics, Sound Voltex knob spins*

---

### 10. RhythmGate

**Feel:** Musical doors — act only when the gate opens on the beat

**Surfaces:** Slit + Keycaps + Lever
**Player verb:** Slit opens rhythmically on the beat. Press keycaps or pull lever ONLY during open windows. Actions during closed windows increase tension.
**Cube behavior:** None (or morph cube pulses on-beat as visual metronome)
**Tension driver:** Actions during closed windows, missed open windows, desync from rhythm
**Seed slots:** `bpm` (60–160), `gatePattern` (quarter/eighth/syncopated), `openRatio` (0.2–0.6 of beat), `keySubset`, `leverRequired` (bool)

*Inspiration: Rhythm Heaven timing windows, Guitar Hero strum gates, Crypt of the NecroDancer*

---

### 11. WhackAMole

**Feel:** Pop-up targets — hit them before they sink

**Surfaces:** Keycaps (primary)
**Player verb:** Keys emerge randomly, stay up for a limited time, then retract. Press before they sink. Multiple keys at once at higher tension.
**Cube behavior:** Morph cube appears above platter, visually "pushing" keys down if player is too slow
**Tension driver:** Missed keycaps, multiple simultaneous emerges, retract speed increases
**Seed slots:** `emergeDurationMs` (300–2000), `maxSimultaneous` (1–6), `emergeIntervalMs` (500–3000), `keycapSubset`, `decoyRate` (0–0.3, keys that shouldn't be pressed)

*Inspiration: Whac-A-Mole arcade cabinets, Bop It reaction games*

---

### 12. ChordHold

**Feel:** Piano chord — press and hold the right combination together

**Surfaces:** Keycaps (multi-press)
**Player verb:** Target chord (2–4 simultaneous keys) shown via ghost highlights. Hold all keys in the chord simultaneously for required duration. Chords progress through a sequence.
**Cube behavior:** Crystalline cube displays chord shape in its facets as hint
**Tension driver:** Incomplete chords, holding wrong key, chord timeout
**Seed slots:** `chordSize` (2–4), `holdDurationMs` (500–2000), `sequenceLength` (3–8 chords), `transitionWindowMs` (200–1000), `keycapSubset`

*Inspiration: Guitar Hero chord holds, piano chord exercises, Rock Band multi-note sustains*

---

### 13. MorphMirror

**Feel:** Anti-synchronization — do the opposite of what the cube does

**Surfaces:** Sphere + Morph Cube
**Player verb:** Morph cube performs rotation/shape changes. Player must rotate sphere in the OPPOSITE direction or perform the inverse motion. Matching the cube increases tension.
**Cube behavior:** Performs deliberate, visible rotation/morphing patterns that the player must counter
**Tension driver:** Matching (not opposing) the cube's motion, latency in counter-rotation
**Seed slots:** `cubePatternSpeed` (0.3–1.5), `cubeMotionType` (rotation/stretch/oscillate), `inversePrecisionDeg` (10–30), `patternChangeIntervalS` (3–10)

*Inspiration: Mirror puzzle mechanics, Simon Says "do the opposite" variant, Bop It Bounce*

---

### 14. Conductor

**Feel:** Orchestra baton — control tempo and dynamics

**Surfaces:** Lever (dynamics) + Platter (tempo) + Keycaps (cues)
**Player verb:** Lever controls volume (pull = forte, release = piano). Platter speed sets tempo. Keycaps cue different instrument sections (e.g., Q=strings, W=brass, E=percussion). Music coherence depends on matching all three.
**Cube behavior:** Crystalline cube pulses with the ideal rhythm — visual metronome reference
**Tension driver:** Tempo mismatch, dynamic mismatch, missed instrument cues
**Seed slots:** `targetBpm` (60–180), `dynamicCurve` (crescendo/decrescendo/sforzando), `sectionCount` (2–5 instrument groups), `toleranceBpm` (±3 to ±15), `cueMoments` (beats where specific keys must be pressed)

*Inspiration: Mad Maestro!, Maestro VR conducting, Wii Music*

---

### 15. LockPick

**Feel:** Safe cracking — feel for the click

**Surfaces:** Sphere (dial) + Lever (tension wrench)
**Player verb:** Rotate sphere slowly to find "notch" positions. When sphere rotation hits a notch, lever must be pulled to set the pin. Multiple pins in sequence. Wrong rotation or premature lever pull resets current pin.
**Cube behavior:** Crystalline cube hovers behind sphere, facets click into place as pins are set (visual progress)
**Tension driver:** Reset pins, overshoot notches, time pressure
**Seed slots:** `pinCount` (3–7), `notchWidthDeg` (3–12), `notchPositions` (random per seed), `resetPenalty` (reset-all vs reset-one), `leverHoldDurationMs` (200–800)

*Inspiration: Splinter Cell lockpicking, Fallout lock mechanic, real combination safe cracking*

---

### 16. CubeJuggle

**Feel:** Keep them all in the air — 3D plate spinning

**Surfaces:** Sphere + Crystalline Cube + Morph Cube
**Player verb:** Multiple cubes orbit the sphere. Each cube slowly decays altitude (falls). Rotate sphere toward a falling cube to "bump" it back up. Let one hit the platter and tension spikes.
**Cube behavior:** Orbit at different altitudes, slowly descending. When sphere aims at them, they bounce back up.
**Tension driver:** Cube impacts on platter, more cubes = more juggling pressure
**Seed slots:** `cubeCount` (2–5), `decayRate` (altitude loss per second), `bumpStrength`, `orbitSpread` (tight cluster vs wide orbit), `spawnInterval` (new cube every N seconds)

*Inspiration: Plate spinning, juggling, balloon-tap keep-up games*

---

### 17. ZenDrift

**Feel:** Meditation — stillness is the game

**Surfaces:** Sphere (gaze drift only)
**Player verb:** Maintain coherence by keeping sphere rotation minimal. Sphere drifts subtly via eye gaze. Over-correction (jerky input) increases tension. Smooth, tiny adjustments decrease it.
**Cube behavior:** Morph cube breathes slowly, visual anchor for calm. Crystalline cube absent.
**Tension driver:** Angular velocity magnitude (spinning too fast), jerk (derivative of angular velocity), over-correction
**Seed slots:** `driftSpeed` (0.001–0.005 rad/frame), `jerkThreshold`, `coherenceDecayRate`, `sessionDurationS` (30–120), `gazeWeight` (how much eye tracking affects drift)

*Inspiration: Rez Area 5 (trance zone), Tetris Effect zen mode, meditation apps with breath tracking*

---

### 18. Pinball

**Feel:** Mechanical pinball — launch, bounce, score

**Surfaces:** Platter (launch ramp) + Lever (flipper) + Keycaps (bumpers/targets)
**Player verb:** Platter spin angle determines launch direction. Lever is the flipper — timed pulls deflect the "energy ball" (a corruption tendril repurposed as ball). Keycaps are targets that retract when hit. Clear all targets.
**Cube behavior:** Morph cube acts as a bumper in 3D space, deflecting the energy ball unpredictably
**Tension driver:** Ball draining (falling past lever), missed flipper timing, targets that regenerate
**Seed slots:** `targetLayout` (keycap subset arrangement), `ballSpeed`, `flipperStrength`, `bumperCount` (0–3 morph cube bumpers), `multiball` (1–3 simultaneous balls)

*Inspiration: Real pinball machine playfield design, Pro Pinball, Sonic Spinball*

---

### 19. TendrilDodge

**Feel:** Bullet hell on a platter — weave between approaching threats

**Surfaces:** Sphere + Lever + Keycaps
**Player verb:** Corruption tendrils approach from all angles in 3D space. Rotate sphere to "face" oncoming tendrils (facing them dissolves them). Pull lever to activate temporary shield. Press lit keycaps to clear waves.
**Cube behavior:** Cubes absent — tendrils ARE the gameplay
**Tension driver:** Tendrils reaching platter surface, tendril count increases with time
**Seed slots:** `tendrilWaveSize` (3–12), `waveIntervalS` (2–8), `approachSpeed`, `dissolveAngleDeg` (15–45, how precisely sphere must face tendril), `shieldDurationMs` (300–1500), `shieldCooldownS` (3–10)

*Inspiration: Ikaruga polarity switching, bullet-hell pattern dodging, Tempest tube shooter*

---

### 20. Escalation

**Feel:** Complexity staircase — one more thing, one more thing...

**Surfaces:** ALL (progressive activation)
**Player verb:** Starts with just one active surface (e.g., 3 keycaps). Every 20-30s, a new dimension activates (platter starts spinning, lever emerges, sphere starts drifting, cube appears). Player must manage increasing cognitive load.
**Cube behavior:** Cube is the final dimension to activate — its arrival is the climax
**Tension driver:** Each new dimension adds base tension, failure on any active dimension compounds
**Seed slots:** `activationOrder` (permutation of 6 surfaces), `activationIntervalS` (15–45), `startDifficulty` (easy/medium), `maxDimensions` (3–6), `compoundTensionMultiplier`

*Inspiration: Tetris Effect journey mode (escalating complexity), Multitask (browser game), plate-spinning acts*

---

### 21. Resonance

**Feel:** Tuning fork — find the frequency that makes everything sing

**Surfaces:** Sphere + Lever + Crystalline Cube
**Player verb:** Sphere rotation sets a "pitch" (mapped to rotation speed). Lever sets amplitude. Crystalline cube resonates when pitch + amplitude match its natural frequency. Find and sustain the resonance.
**Cube behavior:** Vibrates when close to resonance, glows and grows when resonating, dims when off
**Tension driver:** Off-resonance time, resonance breaking, cube shrinking from neglect
**Seed slots:** `resonanceFrequency` (hidden, must discover), `toleranceBand` (narrow–wide), `frequencyDriftRate` (target frequency slowly changes), `amplitudeRange`, `holdDurationS` (how long resonance must be sustained)

*Inspiration: Rez lock-on mechanics, theremin performance, tuning instruments by ear*

---

### 22. Survival

**Feel:** Treadmill — the machine runs, you just keep up

**Surfaces:** ALL (simultaneously active)
**Player verb:** All surfaces demand attention. Patterns approach keycaps, platter spins requiring reach-zone timing, lever gates open and close, sphere drifts needing correction, cubes orbit needing tracking. Tension rises constantly. Survive as long as possible.
**Cube behavior:** Both cubes orbit, occasionally diving toward platter (must be deflected via sphere aim)
**Tension driver:** Constant tension increase rate, compounded by any failures
**Seed slots:** `baseTensionRiseRate` (0.01–0.05/s), `surfaceIntensity` (per-surface difficulty weights), `respiteIntervalS` (0 = none, 15–30 = brief calm periods), `cubeAggressionRate`

*Inspiration: Tetris marathon mode, Geometry Wars survival, endless runner pacing*

---

### 23. CubeStack

**Feel:** Tower builder — synchronize two free bodies

**Surfaces:** Sphere + Crystalline Cube + Morph Cube
**Player verb:** Both cubes must be stacked (aligned vertically above platter). Sphere rotation controls which cube receives input. Lever toggles between cubes. Align, stack, and balance.
**Cube behavior:** Each cube has independent drift/rotation. Must be stabilized into aligned stack.
**Tension driver:** Cubes drifting apart, stack toppling, misalignment
**Seed slots:** `stackHeight` (2–4 elements), `driftForce`, `alignmentThresholdDeg` (3–15), `switchCooldownMs` (200–1000), `balanceDifficultyMode` (static/dynamic wind)

*Inspiration: Jenga balance, stacking games, tower defense alignment puzzles*

---

### 24. GhostChase

**Feel:** Echo hunt — catch your own shadows

**Surfaces:** Keycaps + Sphere + Echo System
**Player verb:** Player's previous actions create echo ghosts (ghost keycaps, ghost sphere rotation). After a delay, echoes replay. Player must perform a NEW pattern that harmonizes with (not duplicates) the echo. Ghost patterns and live patterns must interleave without collision.
**Cube behavior:** Morph cube replays the echo visually in 3D space — a ghost trail the player must weave around
**Tension driver:** Pattern collision (pressing a key the echo is pressing), timing overlap
**Seed slots:** `echoDelayMs` (500–3000), `echoCount` (1–3 simultaneous ghosts), `harmonizeMode` (interleave/complement/invert), `keySubset`, `echoDecayRate` (how quickly ghosts fade)

*Inspiration: Braid time-rewind clones, Cursor*10 (parallel cursors), racing game ghost replays*

---

### 25. SphereSculpt

**Feel:** Pottery wheel — shape the light

**Surfaces:** Sphere + Morph Cube + Keycaps
**Player verb:** Sphere rotation sculpts the morph cube's shape. Different rotation axes map to different morphing dimensions (X = stretch, Y = twist, Z = compress). Target shape shown as crystalline cube wireframe. Match the morph cube to the target shape.
**Cube behavior:** Morph cube deforms in real-time based on sphere input. Crystalline cube shows the target shape as transparent wireframe.
**Tension driver:** Shape divergence from target, time pressure, target morphing to new shape
**Seed slots:** `targetComplexity` (simple box to complex form), `axisMappingSensitivity`, `morphDamping` (how quickly cube responds), `targetHoldDurationS` (must maintain match for N seconds), `targetChangeIntervalS`

*Inspiration: Pottery wheel mechanics, clay sculpting VR apps, shape-matching puzzles*

---

## Archetype Classification Matrix

| # | Archetype | Primary Axes | Cubes Used | Cognitive Load | Pacing |
|---|-----------|-------------|-----------|---------------|--------|
| 1 | PlatterRotation | Platter+Keys | None | Low-Med | Steady |
| 2 | LeverTension | Lever+Slit | None | Low | Rhythmic |
| 3 | KeySequence | Keys | None | Medium | Burst |
| 4 | CrystallineCubeBoss | Cube+Lever+Keys | Crystalline | High | Intense |
| 5 | FacetAlign | Sphere+Cube | Crystalline | Medium | Deliberate |
| 6 | OrbitalCatch | Sphere+Cubes | Both | High | Frantic |
| 7 | RefractionAim | Sphere+Cube+Keys | Crystalline | Medium | Precise |
| 8 | Labyrinth | Sphere | Optional Morph | Low-Med | Calm |
| 9 | TurntableScratch | Platter+Lever+Keys | None | Medium | Rhythmic |
| 10 | RhythmGate | Slit+Keys+Lever | Optional Morph | Medium | Rhythmic |
| 11 | WhackAMole | Keys | Morph | Low-Med | Reactive |
| 12 | ChordHold | Keys+Cube | Crystalline | Medium | Deliberate |
| 13 | MorphMirror | Sphere+Cube | Morph | Medium | Flowing |
| 14 | Conductor | Lever+Platter+Keys | Crystalline | High | Rhythmic |
| 15 | LockPick | Sphere+Lever | Crystalline | Medium | Deliberate |
| 16 | CubeJuggle | Sphere+Cubes | Both | High | Frantic |
| 17 | ZenDrift | Sphere (gaze) | Morph | Low | Meditative |
| 18 | Pinball | Platter+Lever+Keys | Morph | Medium | Chaotic |
| 19 | TendrilDodge | Sphere+Lever+Keys | None | High | Intense |
| 20 | Escalation | ALL (progressive) | Both | Escalating | Building |
| 21 | Resonance | Sphere+Lever+Cube | Crystalline | Medium | Sustained |
| 22 | Survival | ALL (simultaneous) | Both | Very High | Relentless |
| 23 | CubeStack | Sphere+Cubes+Lever | Both | High | Precise |
| 24 | GhostChase | Keys+Sphere+Echo | Morph | High | Layered |
| 25 | SphereSculpt | Sphere+Cubes+Keys | Both | Medium | Creative |

## Seed Slot System

Each archetype defines a set of **slot parameters** that the seed system can mutate:

```
Archetype(seed) → {
  archetypeId: 0-24,
  slots: {
    [paramName]: value derived from seed hash
  },
  tensionCurve: derived from seed,
  difficultyConfig: derived from seed,
  enemyConfig: {          // Optional — not all archetypes use enemies
    yukaTraitBias: YukaTrait[],
    spawnRate: number,
    maxCount: number
  }
}
```

The seed hash is decomposed into parameter ranges per archetype. For example:
- Bits 0-4 → archetype selection (0-24)
- Bits 5-8 → keycap subset selection
- Bits 9-12 → speed/timing scaling
- Bits 13-16 → cube behavior mode
- Bits 17-20 → direction/orientation
- Bits 21-31 → remaining parameter space

This gives each archetype ~128 parameter combinations from the seed alone, before difficulty scaling and tension curve variations are applied. Total unique Dream configurations: 25 archetypes x 128 slot combos x 8 difficulty curves = **25,600 meaningfully distinct levels**.

## Pacing Guidelines

A well-designed endless game session should follow a **pacing arc**:

1. **Opening** (Dreams 1-2): Low cognitive load archetypes (Labyrinth, ZenDrift, PlatterRotation, LeverTension)
2. **Development** (Dreams 3-5): Medium load, introduce cubes (FacetAlign, RefractionAim, ChordHold, MorphMirror)
3. **Climax** (Dream 6-7): High load or boss (CrystallineCubeBoss, OrbitalCatch, Survival, CubeJuggle)
4. **Resolution** (Dream 8): Zen cooldown before next cycle (ZenDrift, Labyrinth, Resonance)

The seed system should bias archetype selection toward this arc shape while never repeating the same archetype within a cycle.

## Cube Usage Philosophy

Cubes are not enemies. They are **dimensional amplifiers**:

- **Crystalline Cube as reference/target**: FacetAlign, RefractionAim, ChordHold, LockPick, Resonance, CubeStack, SphereSculpt
- **Morph Cube as mirror/obstacle**: MorphMirror, WhackAMole, Labyrinth (optional), Pinball, GhostChase, SphereSculpt
- **Both cubes as spatial challenge**: OrbitalCatch, CubeJuggle, CubeStack, Escalation, Survival

The free 3D movement of cubes is what creates the depth, height, and spatial awareness dimension that platter-bound surfaces cannot. Every archetype that uses cubes should exploit this — cubes should never just sit stationary on the platter surface.

## Research Sources

Game design patterns referenced during archetype development:
- [Marble Madness trackball mechanics](https://en.wikipedia.org/wiki/Marble_Madness)
- [beatmania IIDX turntable system](https://lay.bm5keys-forever.com/en/2021/08/turntable_system/)
- [Tetris Effect synesthesia design](https://www.nicholassinger.com/blog/tetriseffect)
- [VR spatial interaction patterns](https://uxplanet.org/designing-for-spatial-ux-in-ar-vr-a-beginner-to-advanced-guide-to-immersive-interface-design-c55f092deb0b)
- [Pinball playfield element design](https://www.libertygames.co.uk/blog/the-pinball-playfield/)
- [Lock picking minigame patterns](https://tvtropes.org/pmwiki/pmwiki.php/Main/LockpickingMinigame)
- [Maestro VR conducting mechanics](https://maestrovr.com/)
- [Arcade game design fundamentals](https://gamedesignskills.com/game-design/arcade/)
- [Eye tracking in VR applications](https://pmc.ncbi.nlm.nih.gov/articles/PMC10449001/)
- [Mizuguchi synesthesia game philosophy](https://www.brothers-in-gaming.com/post/synesthesia-in-video-games)
