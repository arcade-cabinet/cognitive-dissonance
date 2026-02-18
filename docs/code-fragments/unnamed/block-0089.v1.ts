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