# Babylon.js and Reactylon Components - Cognitive Dissonance

**Babylon.js 8 Stack**
- **Reactylon Native** + **Babylon.js 8** for all 3D rendering and interaction.
- No Three.js or React Three Fiber in final build (for CSP safety and performance).
- All geometry created with Babylon primitives (`MeshBuilder.CreateCylinder`, `CreateTorus`, `CreateBox`, `CreateSphere`, `CreateIcoSphere`).
- PBR materials (`PBRMaterial`) for industrial metal and glass.
- GSAP for all mechanical animations (not Babylon's built-in animation system).
- `DefaultRenderingPipeline` for global corruption effects.
- All audio through **Tone.js** exclusively (Babylon audio engine disabled).
- **Havok WASM** physics for keycap springs, lever resistance, platter torque.
- SolidParticleSystem for corruption tendrils.
- DynamicTexture for diegetic text.

**Tree-Shakable Imports (Critical)**
All `@babylonjs/core` imports MUST use subpath imports for tree-shaking:
```typescript
// Correct
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

// Wrong (barrel import)
import { Mesh, Vector3 } from "@babylonjs/core";
```

**Engine Initialization**
- Web: `WebGPUEngine.IsSupportedAsync` → WebGPU or WebGL2 fallback via `EngineInitializer`.
  - WebGPU detection: Chrome 113+, Firefox 141+, Safari 26+.
  - WebGL2 fallback: Reduced particle count, disabled refraction, SceneOptimizer auto-quality.
  - Hardware scaling: `1/devicePixelRatio` for consistent rendering density.
- Native: Babylon Native engine created by Reactylon automatically.
  - iOS: Metal backend via bgfx (GLSL → MSL transpilation).
  - Android: Vulkan backend via bgfx (GLSL → SPIR-V transpilation).

**Shader Strategy**
- All shaders authored in GLSL, stored in `Effect.ShadersStore` via `src/shaders/registry.ts`.
- Babylon.js 8 auto-transpiles GLSL → WGSL when running on WebGPU (zero manual WGSL authoring needed).
- Native: bgfx handles GLSL → Metal/Vulkan/SPIR-V transpilation transparently.
- Future optimization: WGSL can be authored directly for WebGPU-specific perf gains.

**21dev Components Adapted**
- **Bluetooth Key** (21st.dev): Adapted as mechanical keycap with garage-door emergence, PLAY symbol, RGB glow. Converted to Babylon `MeshBuilder.CreateBox` + emissive PBR + GSAP animation.
- **Lever Switch** (21st.dev): Adapted as MODE_LEVER with same garage-door split, visible recess glow, mechanical swing. Converted to Babylon `MeshBuilder.CreateBox` + rotation animation.
- **Celestial Sphere Shader** (21st.dev): Ported directly as GLSL stored in `Effect.ShadersStore` inside the glass sphere. Tension uniforms drive color shift, jitter, static.

**Adaptation Process**
- All 21dev components were reverse-engineered from their visual/mechanical style.
- Converted to pure Babylon.js primitives and shaders for CSP compliance and runtime control.
- Enhanced with tension reactivity, buried seed variation, and GSAP mechanical animation.
- Meshes created imperatively in `useEffect` hooks (not JSX), per Reactylon conventions.

**Platform Rendering**
| Platform | Engine | Renderer | Shaders |
|----------|--------|----------|---------|
| Web (Chrome 113+) | WebGPUEngine | WebGPU | GLSL auto-converted to WGSL |
| Web (fallback) | Engine (WebGL2) | WebGL2 | GLSL direct |
| iOS (iPhone 12+) | Babylon Native | Metal | GLSL → MSL via bgfx |
| Android (SD888+) | Babylon Native | Vulkan | GLSL → SPIR-V via bgfx |

This integration gives us full control while honoring the original 21dev aesthetic.
