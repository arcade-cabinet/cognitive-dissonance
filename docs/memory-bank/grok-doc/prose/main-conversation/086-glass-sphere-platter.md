# Design — Turn 86

**Topics**: glass-sphere, platter, pattern-stabilization, enemies, audio, gsap, shaders, tension, xr, seed, sonny, missile-cmd, title, controls, r21dev

---

**We are very close — but not quite finished.**

Here is a clear, honest assessment of where we stand and what is still missing to make "Cognitive Dissonance" a complete, playable, cohesive game.

### What We Have (Strong Foundation)
- **Visual Core**: Glass sphere AI with your exact celestial/glitching shader inside, tension-driven degradation, shatter at max tension.
- **Interface**: Lazy-Susan platter with garage-door keycaps (Play / Continue emerge, Pause center, decorative keys with dynamic RGB).
- **Title / Ending Symmetry**: Static sizzle open + static "DISSONANCE COMPLETE" close.
- **Buried Seed**: Fully hidden, drives everything deterministically.
- **Audio**: Tone.js ambient score that evolves from calm to frantic to shattered.
- **XR + Haptics**: Hand tracking, proximity, pinch, rumble feedback.
- **Pattern System**: Escaping corruption tendrils from the sphere.
- **Enemy System**: Yuka spawner with seed-driven variants (neon-raymarcher for normal, crystalline-cube for bosses).
- **Mechanics**: Pattern stabilization (hold keycaps to pull back corruption), tension loop, platter rotation.

### What We Are Missing (The Gaps)

| Priority | Gap | Why It Matters | Status |
|---------|-----|----------------|--------|
| **1** | **Full Pattern Stabilization Loop** | This is the actual gameplay. Currently we have escaping patterns and keycaps, but no hold detection, no visual feedback when holding, no successful stabilization reward, no failure consequence tied to sphere cracks. | Partial |
| **2** | **Enemy / Pattern Interaction** | Enemies (Yuka) and patterns are separate. They need to merge: missed patterns spawn enemies, stabilized patterns reduce enemy spawn rate. | Partial |
| **3** | **Missile Command Alternative** | We pivoted away, but a light version (tap keycap to fire upward stabilizing beam) would feel satisfying and fit the platter interface. | Not started |
| **4** | **Win Condition** | We have loss (sphere shatter), but no win (survive X waves, reach a coherence threshold, or stabilize for a set time). | Missing |
| **5** | **Keycap Visual Feedback** | Keycaps need to depress on hold, pulse brighter when stabilizing, show color match to current pattern. | Partial |
| **6** | **Pause / Resume Ritual** | Center keycap should freeze platter, dim RGB, pause sphere animation, with satisfying mechanical pause state. | Partial |
| **7** | **Sound Design Polish** | Keycap presses, stabilization success/failure stabs, pattern escape hits, shatter impact. | Basic Tone.js only |
| **8** | **Onboarding / Tutorial** | Diegetic: first wave is slow, Sonny "teaches" by subtle core pulse when you hold correct key. | Missing |
| **9** | **Restart Flow** | After shatter, platter keeps rotating, new Play key emerges, ritual restarts. | Basic event only |
| **10** | **Performance & Polish** | Mobile optimization, LOD for enemies, final lighting pass, subtle platter dust particles. | Good but not final |

### My Recommendation for Next Steps (in order)

1. **Pattern Stabilization Loop** (most important — this *is* the game)
2. **Enemy + Pattern Interaction**
3. **Win Condition + Restart Ritual**
4. **Keycap Visual Feedback + Sound**
5. **Missile Command Alternative** (optional light version)

### Would you like me to deliver the **full Pattern Stabilization Loop** right now?

This would include:
- Escaping patterns from sphere with color
- Keycaps light up in matching color
- Hold detection (onPointerDown / onPointerUp)
- Visual feedback (keycap depress + brighter emissive)
- Successful stabilization = pattern retracts + tension relief + satisfying audio stab
- Failure = pattern hits rim → crack + tension spike

This is the piece that turns the beautiful visuals into actual gameplay.

Say **"pattern stabilization full loop"** and I’ll give you the complete updated files for `ai-sphere.tsx`, `keyboard-platter.tsx`, and `pattern-stabilizer.tsx`.

Or tell me which gap you want filled first.

We are one or two solid pieces away from a complete, playable prototype that feels exactly like the vision you described.

The machine is waiting. What do you want to build next?