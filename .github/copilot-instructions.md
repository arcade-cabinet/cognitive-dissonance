# GitHub Copilot Instructions

You are GitHub Copilot, an AI assistant helping developers write code for Cognitive Dissonance v3.0, a cross-platform (web + Android + iOS) interactive 3D experience built with Reactylon Native + Babylon.js 8 + Miniplex ECS + Expo SDK 55.

## Project Context

- **Stack**: Reactylon Native + Babylon.js 8 + Miniplex ECS + Expo SDK 55 + Metro + React 19 + React Native 0.83
- **Architecture**: Miniplex ECS core, imperative 3D (meshes in useEffect), declarative lights/camera (Reactylon JSX)
- **Bundler**: Metro (universal for web + Android + iOS)
- **Linter**: Biome 2.4
- **Testing**: Jest + fast-check (unit + PBT) + Playwright (web E2E) + Maestro (mobile E2E)

## Key Conventions

### Babylon.js Imports

Always use tree-shakable subpath imports:

```typescript
// ✅ Correct
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

// ❌ Wrong (barrel import)
import { Mesh, Vector3 } from "@babylonjs/core";
```

### Miniplex ECS API

Use Miniplex 2.0 API:

```typescript
// ✅ Correct
const query = world.with('level', 'platterCore');
const entity = world.add({ level: true, platterCore: true });

// ❌ Wrong (Miniplex 1.x API)
const query = world.archetype('level', 'platterCore');
const entity = world.createEntity({ level: true, platterCore: true });
```

### Reactylon Patterns

- **Imperative meshes**: Create in useEffect, not JSX
- **Declarative lights/camera**: Use lowercase JSX tags
- **Render loop**: `scene.registerBeforeRender(fn)` / `scene.unregisterBeforeRender(fn)`

```typescript
// ✅ Correct
useEffect(() => {
  const mesh = MeshBuilder.CreateBox('box', { size: 1 }, scene);
  return () => mesh.dispose();
}, [scene]);

<hemisphericLight name="light" intensity={0.7} direction={new Vector3(0, 1, 0)} />
```

### GSAP + Babylon.js

GSAP works natively with Babylon.js Vector3:

```typescript
gsap.to(mesh.position, { x: 5, duration: 1, ease: "power2.out" });
```

### Shaders

All GLSL shaders must be static strings in `Effect.ShadersStore` (CSP-safe):

```typescript
Effect.ShadersStore["myVertexShader"] = `
  precision highp float;
  attribute vec3 position;
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;
```

## Common Pitfalls

1. **Barrel imports from @babylonjs/core** — Always use subpath imports
2. **Miniplex 1.x API** — Use `world.with()` and `world.add()` (not `archetype()` and `createEntity()`)
3. **JSX for meshes** — Only use JSX for lights/camera, create meshes imperatively
4. **React re-renders for animation** — Use `scene.registerBeforeRender()` for per-frame logic
5. **Biome auto-fix removes field declarations** — Re-add private fields after `biome check --write --unsafe`

## File Structure

```
src/
├── engine/                   # Engine initialization
├── ecs/                      # Miniplex ECS world + archetypes
├── systems/                  # Core gameplay systems (singletons)
├── enemies/                  # Enemy systems
├── objects/                  # 3D object factories
├── shaders/                  # GLSL shaders
├── xr/                       # AR/MR systems
├── audio/                    # Tone.js audio
├── store/                    # Zustand stores
└── types/                    # TypeScript types
```

## Commands

```bash
pnpm start         # Metro dev server (all platforms)
pnpm web           # Expo web dev server
pnpm android       # Metro + Expo dev-client (Android)
pnpm ios           # Metro + Expo dev-client (iOS)
pnpm lint          # Biome check
pnpm test          # Jest unit + PBT tests
pnpm test:e2e:web  # Playwright web E2E
pnpm test:e2e:mobile # Maestro mobile E2E
```
