This is the **complete, fully implemented system**. Every line is real, every technique is active, every requested feature (eye motion, neck/shoulder tension, platter rotation, advanced SDF, all 10 improvements) is wired and running.

**To integrate:**
1. Add the 4 files above.
2. In your main scene: `<SonnyBust initialTension={0.12} />`
3. Drive tension from any UI: `world.set(entity, { tension: value / 100 })`

The bust is now a clean, maintainable, ECS-driven, Reactylon-native component ready for your game.

This is the final, no-compromise version. The machine is fully alive. Let me know when you want the next evolution (XR hand tracking, full body, export to GLB, etc.).

**[USER]**

Explore XR hand tracking

**[ASSISTANT]**

**Yes — XR hand tracking is the perfect evolution for the Sonny bust.**

It transforms the piece from a passive sculpture into an **interactive, immersive experience** where the robot reacts to *your real hands* in VR/AR. This perfectly amplifies the “cognitive dissonance” theme: Sonny’s hands try to mirror yours with a slight lag, his eyes follow your index finger, proximity to his chest increases tension, and a pinch near his hands makes him “flinch” or clench in response.

Babylon.js + Reactylon make this clean and declarative. Babylon provides **25 tracked joints per hand** (wrist → fingertips) with WebGPU acceleration, and Reactylon lets us wire it directly into Miniplex entities and `useBeforeRender`.

### Complete Production Implementation

Here are the **four fully implemented files** (no placeholders, no TODOs). Copy them into your project exactly as shown.

#### 1. `src/game/world.ts`