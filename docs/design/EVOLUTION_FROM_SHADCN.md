# Evolution from shadcn - Cognitive Dissonance

**Initial Approach (Pre-v1.0)**
- Started with shadcn/ui for 2D landing page + UI elements (buttons, sliders, cards).
- Typical web game structure with HTML overlay on 3D canvas.
- Robot bust with humanized NS-5 android face as the AI character.

**Pivot Decision (v1.0)**
- Rejected 2D landing pages and traditional UI in favor of fully immersed 3D experience.
- Everything must be diegetic — part of the machine itself.
- Replaced robot bust with pure glass sphere to remove anthropomorphism.
- Replaced Missile Command gameplay with pattern stabilization.
- Replaced visible seed with buried seed.

**Translation Process (v1.0 → v2.0)**
- Bluetooth Key and Lever Switch from 21st.dev: converted from React/Three.js to pure Babylon.js primitives with GSAP animation.
- Celestial Sphere Shader: ported directly as ShaderMaterial inside the glass sphere.
- All UI (buttons, sliders) removed and replaced with platter keycaps and lever.
- No HTML overlays — all interaction is physical on the platter.

**v2.0 → v3.0 Migration**
- React + Three.js + Vite → Reactylon Native + Babylon.js 8 + Expo SDK 55 + Metro.
- React Three Fiber → Imperative `MeshBuilder` in `useEffect` hooks.
- Framer Motion → GSAP 3.13+ with CustomEase, MotionPath, Flip.
- Ammo.js physics → Havok WASM physics.
- seedrandom → mulberry32 PRNG in Zustand store.
- Miniplex 1.x → Miniplex 2.0 (`world.with()`, `world.add()`).
- Browser-only → Cross-platform (web + Android + iOS) with dual AR/MR modes.
- Vite bundler → Metro universal bundler via Expo.

**Necessitated Changes**
- Full Babylon.js 8 / Reactylon Native stack for runtime control on all platforms.
- Tree-shakable `@babylonjs/core` subpath imports (barrel imports break tree-shaking).
- GSAP for mechanical animations instead of Framer Motion.
- Diegetic GUI (glowing ring around sphere track via torus mesh + emissive PBR).
- CSP-safe code (no eval, no dynamic scripts, shaders in `Effect.ShadersStore`).
- Spatial audio via Tone.js exclusively (Babylon audio engine disabled).
- expo-haptics for native haptic feedback, `navigator.vibrate` for web.
- Havok WASM for physics (keycap springs, lever resistance, platter torque).

**Migration File Map (v2.0 → v3.0)**
- **100% portable** (no changes): `src/store/`, `src/types/`, `src/ecs/`, GLSL shaders, game logic systems.
- **Replaced**: `next.config.ts` → `metro.config.js` + `app.json`, `vitest.config.ts` → `jest.config.ts`, `index.html` → `index.web.tsx` + `index.native.tsx`.
- **Deleted**: All Next.js artifacts (`src/app/`, `postcss.config.mjs`, `tailwind.config.*`).
- **New**: `App.tsx` (universal root), Expo prebuild (`android/`, `ios/`), `.maestro/` flows.
- Platform entry points: `index.web.tsx` (web), `index.native.tsx` (native), both import canonical `App.tsx`.

This evolution created a cohesive, immersive world where the player is inside the machine, not outside it.
