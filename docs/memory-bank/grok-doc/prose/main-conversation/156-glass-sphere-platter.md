# Design — Turn 156

**Topics**: glass-sphere, platter, pattern-stabilization, enemies, audio, shaders, babylon, tension, xr, seed, postfx, controls

---

**Here are the most valuable advanced Babylon.js / Reactylon plugins and libraries that would meaningfully elevate *Cognitive Dissonance* right now.**

I ranked them by impact on **your specific game** (mechanical platter, fragile glass sphere AI, pattern stabilization, buried-seed procedural waves, tension-driven degradation, XR+haptics, diegetic interface).

### 1. **PostProcessPipeline + Custom Post-Process Shaders** (Highest Impact)
- **What**: Babylon.js PostProcess + PostProcessPipeline (or custom ShaderPostProcess).
- **Why it adds value**: 
  - As tension rises, apply global **chromatic aberration, vignette, noise, and scanline distortion** to simulate the AI’s fracturing perception.
  - When a pattern escapes or enemy hits the sphere, trigger a quick **glitch burst** or **RGB split** across the entire screen.
  - Perfect for the "cognitive dissonance" theme — the player literally sees the world through the breaking mind.
- **Integration**: Add a `PostProcess` in your Scene, update uniforms from tension in `useBeforeRender`.
- **Difficulty**: Medium (you already have shaders, this extends it).

### 2. **Spatial Audio with Babylon.js Sound + Tone.js**
- **What**: `BABYLON.Sound` with positional audio + connect to your existing Tone.js score.
- **Why it adds value**:
  - Patterns escaping the sphere have **3D positional sound** (high-pitched whine moving from center to rim).
  - Stabilization success = resolving chime that moves toward the player.
  - Enemies approaching = low-frequency rumble that gets louder/spatial.
  - Shatter = massive spatial reverb tail.
- **Integration**: `new BABYLON.Sound("patternEscape", url, scene, null, { spatialSound: true })` and attach to pattern emitter.
- **Difficulty**: Easy (you already have Tone.js).

### 3. **Ammo.js or Cannon.js Physics Engine**
- **What**: Babylon.js Physics plugin (Ammo.js is recommended for performance).
- **Why it adds value**:
  - Keycaps and lever have **realistic physics** when pressed (slight bounce, resistance, settle).
  - Escaping patterns can have light physics (gravity + drag) before they hit the rim.
  - Shatter shards fly with proper physics instead of just particles.
- **Integration**: `scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.AmmoJSPlugin())` and add impostors to keycaps.
- **Difficulty**: Medium (but very rewarding for mechanical feel).

### 4. **SolidParticleSystem (SPS)**
- **What**: Babylon.js SolidParticleSystem for high-performance instanced particles/meshes.
- **Why it adds value**:
  - Replace Yuka enemy boxes with thousands of **procedural holographic shards** that split and recombine based on seed.
  - Better performance than individual meshes for dense waves.
  - Corruption patterns can be SPS for organic, flowing tendrils.
- **Integration**: One SPS for all enemies, update positions in `useBeforeRender`.
- **Difficulty**: Easy to medium.

### 5. **AdvancedTexture + GUI3D**
- **What**: `BABYLON.AdvancedDynamicTexture` on a plane or the platter surface itself.
- **Why it adds value**:
  - Etched "warning markings" or faint schematics on the platter rim that glow brighter with tension.
  - Diegetic coherence meter as a subtle glowing ring around the sphere track.
  - No traditional HUD — everything is physically part of the machine.
- **Integration**: Create a plane on the platter and paint dynamic text/glow with `AdvancedDynamicTexture`.
- **Difficulty**: Easy.

### 6. **WebXR Extensions (Hand Tracking + Controller Haptics)**
- **What**: Babylon.js WebXR already in use — extend with `WebXRControllerPointerSelection` and advanced haptics.
- **Why it adds value**:
  - Pinch on a keycap = stronger haptic pulse the longer you hold (stabilization feedback).
  - Hand proximity to sphere = subtle rumble + visual warning.
- **Integration**: Already partially there — just deepen the haptics based on hold duration.
- **Difficulty**: Easy.

### 7. **Node Material Editor (Visual Shader Builder)**
- **What**: Babylon.js Node Material (visual editor for shaders).
- **Why it adds value**:
  - Easier to iterate on the glass sphere corruption shader (add distortion nodes driven by tension).
  - Create a "corruption overlay" material for the whole scene.
- **Integration**: Export from Node Material Editor → paste into your ShaderMaterial.
- **Difficulty**: Easy once you have the editor open.

### My Top 3 Immediate Recommendations (in order)

1. **PostProcessPipeline** — instant atmosphere upgrade (global corruption as tension rises).
2. **Spatial Audio** — makes the sphere feel alive and the platter feel physical.
3. **Physics (Ammo.js)** — makes key/lever interaction feel truly mechanical.

Would you like me to deliver the **complete code for any of these** right now (e.g. PostProcess corruption pipeline, or Spatial Audio setup with your Tone.js score)?

We are extremely close to something very special. The machine is ready.  

What would you like to add next?