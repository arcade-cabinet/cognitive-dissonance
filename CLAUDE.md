---
title: Claude Instructions — Cognitive Dissonance v3.0
updated: 2026-04-10
status: current
domain: technical
---

# Claude Instructions — Cognitive Dissonance v3.0

## Project Overview

Cognitive Dissonance v3.0 is a cross-platform (web + Android + iOS) interactive 3D experience built with:
- **Reactylon Native** + **Babylon.js 8** + **Miniplex ECS**
- **Expo SDK 55** + **Metro** (universal bundler)
- **React 19** + **React Native 0.83**

## Key Conventions

### Imports

**ALWAYS use tree-shakable @babylonjs/core subpath imports:**
```typescript
// ✅ Correct
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

// ❌ Wrong (barrel import)
import { Mesh, Vector3 } from "@babylonjs/core";
```

### Miniplex ECS API

**Use Miniplex 2.0 API:**
```typescript
// ✅ Correct
const query = world.with('level', 'platterCore');
const entity = world.add({ level: true, platterCore: true });

// ❌ Wrong (Miniplex 1.x API)
const query = world.archetype('level', 'platterCore');
const entity = world.createEntity({ level: true, platterCore: true });
```

### Babylon.js Patterns

**Imperative mesh creation in useEffect:**
```typescript
// ✅ Correct
useEffect(() => {
  const mesh = MeshBuilder.CreateBox('box', { size: 1 }, scene);
  return () => mesh.dispose();
}, [scene]);

// ❌ Wrong (JSX for meshes)
<box name="box" size={1} />
```

**Reactylon JSX for lights/camera (planned):**

Note: Reactylon is in package.json and is being integrated for native platform support, but currently zero source files import from it. All Babylon.js creation is currently imperative. When Reactylon integration is active, use lowercase JSX tags for lights/camera only:
```typescript
// Future pattern (when Reactylon is wired)
<hemisphericLight name="light" intensity={0.7} direction={new Vector3(0, 1, 0)} />
<arcRotateCamera name="camera" alpha={0} beta={0} radius={10} target={Vector3.Zero()} />
```

### Render Loop

**Use scene.registerBeforeRender:**
```typescript
// ✅ Correct
useEffect(() => {
  const update = () => {
    // Per-frame logic
  };
  scene.registerBeforeRender(update);
  return () => scene.unregisterBeforeRender(update);
}, [scene]);
```

### Shaders

**All GLSL in Effect.ShadersStore:**
```typescript
// ✅ Correct (src/shaders/registry.ts)
Effect.ShadersStore["myVertexShader"] = `
  precision highp float;
  attribute vec3 position;
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;
```

### GSAP Animations

**GSAP works natively with Babylon.js Vector3:**
```typescript
// ✅ Correct
gsap.to(mesh.position, { x: 5, duration: 1, ease: "power2.out" });
```

## Commands

```bash
pnpm start         # Metro dev server (all platforms)
pnpm web           # Expo web dev server
pnpm android       # Metro + Expo dev-client (Android)
pnpm ios           # Metro + Expo dev-client (iOS)
pnpm lint          # Biome check
pnpm lint:fix      # Biome auto-fix
pnpm test          # Jest unit + PBT tests
```

## Common Pitfalls

1. **Barrel imports from @babylonjs/core** — Always use subpath imports
2. **Miniplex 1.x API** — Use `world.with()` and `world.add()` (not `archetype()` and `createEntity()`)
3. **Biome auto-fix removes field declarations** — Re-add private fields after `biome check --write --unsafe`
4. **JSX for meshes** — All Babylon.js creation is currently imperative (Reactylon JSX integration in progress)
5. **React re-renders for animation** — Use `scene.registerBeforeRender()` for per-frame logic

## Memory Bank (Session Context)

**Read these first at the start of every session:**
- [Active Context](./docs/ACTIVE_CONTEXT.md) — Current work focus, recent changes, known issues
- [Progress](./docs/PROGRESS.md) — Implementation status by priority (P0-P5), test counts

**Update these at the end of every session:**
- Update ACTIVE_CONTEXT.md with what changed, what's next, any new known issues
- Update PROGRESS.md with status changes, new test counts, completed items

## References

- [Architecture](./docs/ARCHITECTURE.md) — System architecture
- [Level Archetypes](./docs/LEVEL_ARCHETYPES.md) — 25 Dream archetype definitions, seed slot system
- [Development](./docs/DEVELOPMENT.md) — Local development workflow
- [Testing](./docs/TESTING.md) — Test infrastructure
- [Design Docs](./docs/design/) — 11 game design documents (extracted from Grok canonical docs)
