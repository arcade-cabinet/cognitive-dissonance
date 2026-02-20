# Game Identity - Cognitive Dissonance

**Core Identity**: A tragic, intimate maintenance simulator where the player holds a fragile glass AI mind together as its own thoughts try to escape. The machine is not human — it is just glass, and you are the only one keeping it from shattering.

**Tone & Aesthetic**
- Cold, industrial, mechanical, beautiful, hopeless.
- Heavy black metal platter with satisfying garage-door mechanics.
- Fragile transparent glass sphere containing a living celestial nebula shader (GLSL in `Effect.ShadersStore`) that degrades with tension.
- No HUD, no text on screen except the symmetric static title and ending.
- Dark void background, dramatic rim lighting, subtle dust particles, perfect symmetry.
- Sound design: spatial Tone.js evolving from calm drone to frantic glitch to shattered collapse.

**Key Visual & Mechanical Signatures**
- Platter: heavy (PBR near-black metal, metallic 0.92, roughness 0.28), flat, thick rim (18cm+), only rotates on central axis. Created with `MeshBuilder.CreateCylinder`.
- Garage-door slit: top slides up, bottom slides down with GSAP CustomEase ("heavyMechanical") stagger, revealing internal depth with blue RGB glow.
- Key/lever emergence: deliberate, mechanical, satisfying. GSAP MotionPath for curved emergence, gear wobble with CustomEase.
- Sphere: recessed in center track (torus), PBR glass (IOR 1.52, thin-film, refraction), celestial GLSL shader inside that shifts blue to yellow/green to violent red with static, jitter, bounce, corruption.
- Patterns: 24 SPS corruption tendrils escaping from sphere center to rim.
- Enemies: ProceduralMorphSystem with 7 Yuka AI traits and GPU vertex morphing via `MorphTargetManager`. Crystalline-cube boss for Dream archetype 4.

**Player Role**
- Caretaker, not hero.
- Intimate, finger-on-the-pulse interaction via the platter keycaps (keyboard on web, hand tracking in XR).
- The game is about delaying the inevitable, not winning.

**Thematic Pillars**
- Fragility of intelligence
- The horror of self-corruption
- Mechanical beauty in breakdown
- Human attempt to hold something alien together

**Evolution of Identity**
1. Started as robot bust with humanized NS-5 android face.
2. Pivoted to pure glass sphere AI to remove anthropomorphism.
3. Rejected 2D landing pages/HUD in favor of fully immersed 3D experience.
4. v2.0: React + Three.js + Vite browser game.
5. v3.0: Reactylon Native + Babylon.js 8 + Expo SDK 55 cross-platform with dual AR/MR, Miniplex ECS, procedural morph enemies, crystalline-cube boss.
6. Final identity is cold, clinical, technopunk horror with intimate mechanical interaction.

This document defines the unchanging soul of the project.
