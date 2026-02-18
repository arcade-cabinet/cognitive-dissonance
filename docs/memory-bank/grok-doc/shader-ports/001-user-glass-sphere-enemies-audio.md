# Turn 1 (USER) — Lines 4-217

**Summary**: Cursor (Opus 4.6) has identified several critical gaps requiring supplemental planning for our Cognitive Dissonance game, the definitive version of wh
**Topics**: glass-sphere, enemies, audio, gsap, shaders, babylon, tension, seed, postfx, csp
**Code**: 9 | **New**: YES | **Design**: no | **Definitive**: YES

---

Cursor (Opus 4.6) has identified several critical gaps requiring supplemental planning for our Cognitive Dissonance game, the definitive version of which you should hav FULL memory of:

````markdown
# Grok Superheavy Expert Supplement Request

## Context

We are rebuilding "Cognitive Dissonance" as a **Next.js 15 + Babylon.js 7 + Reactylon 3.5** project. The full game design and component code exists from our previous conversation, but it was developed with mixed Three.js/R3F assumptions. We need definitive, production-ready answers to **7 critical gaps** before we can produce the codebase.

**Stack**: Next.js 15 (App Router) + React 19 + Babylon.js 7 (`@babylonjs/core`) + Reactylon 3.5 + GSAP 3.12 (with CustomEase, MotionPathPlugin, Flip) + Tone.js 14 + Zustand 5 + seedrandom + Yuka.js 0.7 + Miniplex 2 + miniplex-react 2 + Tailwind CSS 4 + TypeScript 5

**CSP Requirement**: 100% CSP-safe. No eval, no dynamic Function constructors, no dynamic code generation. All shader strings must be static string literals.

**Target**: Every answer must be a COMPLETE, copy-paste-ready code block. No pseudocode, no "// ... rest here", no placeholders. Production-quality TypeScript.

---

## GAP 1: Celestial Nebula Shader — Port from Three.js to Babylon.js ShaderMaterial

We have this Three.js GLSL shader that renders a celestial nebula effect on a sphere (fbm noise, fresnel glow, color mixing). It needs to be ported to a **Babylon.js ShaderMaterial** that can be applied to a MeshBuilder.CreateSphere inside a Reactylon Scene.

### Three.js version (what we have):

```glsl
// Vertex (Three.js)
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment (Three.js)
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform float u_cloud_density;
uniform float u_glow_intensity;

float random(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898,78.233,151.7182))) * 43758.5453);
}
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f*f*(3.0 - 2.0*f);
    return mix(
        mix(mix(random(i+vec3(0,0,0)), random(i+vec3(1,0,0)), u.x),
            mix(random(i+vec3(0,1,0)), random(i+vec3(1,1,0)), u.x), u.y),
        mix(mix(random(i+vec3(0,0,1)), random(i+vec3(1,0,1)), u.x),
            mix(random(i+vec3(0,1,1)), random(i+vec3(1,1,1)), u.x), u.y),
        u.z
    );
}
float fbm(vec3 p) {
    float v = 0.0, amp = 0.5;
    for (int i = 0; i < 6; i++) {
        v += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return v;
}
void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float d = 1.0 - dot(uv, uv);
    if (d < 0.0) discard;
    vec3 pos = vec3(uv, sqrt(d));
    vec3 coord = pos * u_cloud_density + u_time * 0.1;
    float c = fbm(coord);
    vec3 nebula = mix(u_color1, u_color2, smoothstep(0.4, 0.6, c));
    float fresnel = pow(1.0 - max(dot(normalize(pos), vec3(0,0,1)), 0.0), 2.0) * u_glow_intensity;
    vec3 glow = fresnel * u_color2;
    gl_FragColor = vec4(nebula + glow, 1.0);
}
```

### What we need:

1. The complete Babylon.js vertex shader (using `attribute vec3 position;`, `attribute vec2 uv;`, `uniform mat4 worldViewProjection;`, `varying vec2 vUV;`)
2. The complete Babylon.js fragment shader (using `varying vec2 vUV;` instead of `vUv`)
3. A complete TypeScript function `createCelestialShaderMaterial(scene: BABYLON.Scene): BABYLON.ShaderMaterial` that:
   - Stores vertex/fragment in `BABYLON.Effect.ShadersStore`
   - Creates a ShaderMaterial with all uniforms (u_time, u_color1, u_color2, u_cloud_density, u_glow_intensity)
   - Returns the material ready to apply to a sphere
4. A Reactylon component example showing how to use it on an inner sphere

---

## GAP 2: Neon-Raymarcher — Port from R3F to Babylon.js ShaderMaterial

We have a full R3F component that renders orbiting SDF boxes with holographic green iridescence (raymarched in a fragment shader on a full-screen plane). It uses useFrame for animation and useThree for viewport dimensions.

### What we need:

A complete Babylon.js version that:
1. Uses BABYLON.ShaderMaterial with the same SDF raymarching logic
2. Can be applied to a billboard quad (or used as a post-process effect)
3. Accepts `amount` (number of SDF boxes), `positions[]` and `rotations[]` as uniform arrays
4. Is animated via `scene.registerBeforeRender` (not useFrame)
5. Is wrapped in a Reactylon component: `export function NeonRaymarcherEnemy({ tension, amount }: Props)`
6. The GLSL must include: sdBox, opSmoothUnion, rotate, fresnel, calcNormal, getHolographicMaterial (green iridescence)

Provide the COMPLETE component file (~200 lines) with all GLSL inlined as static string literals stored in Effect.ShadersStore.

---

## GAP 3: Crystalline-Cube — Port from raw WebGL to Babylon.js ShaderMaterial

Same as Gap 2 but for the boss enemy shader. We have a raw WebGL raymarcher that renders a rotating crystalline cube with sine-wave displacement and Inigo Quilez palette coloring.

### What we need:

A complete Babylon.js ShaderMaterial version that:
1. Renders a raymarched crystalline object on a billboard quad
2. Accepts uniforms: complexity, colorShift, lightIntensity, tension
3. Uses BABYLON.Effect.ShadersStore for CSP safety
4. Is wrapped as a Reactylon component: `export function CrystallineCubeEnemy({ tension, complexity }: Props)`

Provide the COMPLETE component file.

---

## GAP 4: Reactylon Component API Verification

We need **definitive answers** to these Reactylon API questions, with working code examples for each:

1. **How does Reactylon render a Babylon.js Cylinder?** Is it `<cylinder>` (lowercase), `<Cylinder>`, or something else? What are the exact prop names for height, diameter, tessellation, position?

2. **How does Reactylon handle PBRMaterial?** Is it `<pbrMaterial>` as a child of the mesh, or does it use a material prop?

3. **How does Reactylon handle ShaderMaterial?** Can we pass vertexSource and fragmentSource as props, or do we need to use Effect.ShadersStore first?

4. **How does Reactylon handle refs?** Does `useRef<BABYLON.Mesh>` work with `ref={myRef}` on a `<box>` element?

5. **How does Reactylon handle scene.registerBeforeRender?** The conversation used useBeforeRender. Is this a real Reactylon hook? What is its exact signature?

6. **How does Reactylon handle Engine and Scene?** The conversation used:
   ```tsx
   import { Engine } from 'reactylon/web';
   import { Scene } from 'reactylon';
   ```
   Is this correct? What props does Engine accept (e.g., antialias, alpha)?

7. **How does Reactylon handle ParticleSystem?** Can we declare it as JSX or must it be imperative?

8. **How does Reactylon handle PointLight, SpotLight, HemisphericLight?** What is the JSX syntax?

Provide a COMPLETE working Reactylon component (50-100 lines) that demonstrates: a rotating cylinder with PBR material, a sphere with custom ShaderMaterial, a PointLight, a ParticleSystem, and a ref that is used in registerBeforeRender. This will serve as our API reference.

---

## GAP 5: Miniplex + Reactylon Integration

Our game uses Miniplex ECS for state (tension, coherence, patterns, enemies). The conversation assumed useEntity from miniplex-react would work inside Reactylon components.

### What we need:

1. Can miniplex-react's useEntity and useEntities be used inside a Reactylon component that also uses useScene? Or do we need a custom bridge?
2. If there is a conflict, provide a pattern for bridging Miniplex state into Reactylon's render loop (e.g., using Zustand as the bridge instead of Miniplex directly).
3. Provide a COMPLETE working example showing an entity with `tension: number` being created, updated in registerBeforeRender, and read by a sibling component.

---

## GAP 6: GSAP Animating Babylon.js Objects

The conversation uses patterns like:
```tsx
gsap.to(mesh.position, { y: 0.048, duration: 1.4, ease: "power3.out" });
gsap.to(mesh.rotation, { x: -0.08, duration: 1.6 });
```

### What we need:

1. Does GSAP's to() work directly with BABYLON.Vector3 properties? Babylon.js Vector3 has .x, .y, .z as regular number properties — confirm this works.
2. Does gsap.to(pointLight, { intensity: 2.9 }) work with Babylon.js PointLight?
3. Does gsap.to(pbrMaterial, { roughness: 0.5 }) work?
4. Provide a COMPLETE working example of GSAP animating a Babylon.js mesh position, rotation, and material property inside a Reactylon component.
5. Confirm CustomEase, MotionPathPlugin, and Flip all work with Babylon.js objects (or explain workarounds).

---

## GAP 7: Next.js 15 App Router + Babylon.js + Reactylon SSR

Babylon.js requires window, document, and WebGL context. Next.js App Router renders components on the server first.

### What we need:

1. The COMPLETE next.config.mjs that handles Babylon.js + Reactylon + GSAP (any transpilePackages or webpack config needed?)
2. The COMPLETE app/layout.tsx with proper metadata and body setup
3. The pattern for dynamically importing the 3D scene component with ssr: false:
   ```tsx
   const GameScene = dynamic(() => import('@/components/game-scene'), { ssr: false });
   ```
4. The COMPLETE .babelrc or babel.config.js for babel-plugin-reactylon tree-shaking in a Next.js project
5. Any "use client" directives needed and where
6. The COMPLETE tsconfig.json with path aliases (@/components/*, @/store/*, @/lib/*, @/game/*)

---

## OUTPUT FORMAT

For each gap, provide:
1. A brief explanation of the answer
2. The COMPLETE, production-ready code (no placeholders, no "// ... rest here")
3. Any caveats or gotchas

Label each section clearly as `## GAP 1 ANSWER`, `## GAP 2 ANSWER`, etc.

The output document should be saved or provided as a single markdown file that can be fed directly back to the implementation agent.
````