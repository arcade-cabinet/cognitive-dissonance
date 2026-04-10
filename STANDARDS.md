---
title: Code Quality Standards
updated: 2026-04-10
status: current
domain: technical
---

# Code Quality Standards — Cognitive Dissonance v3.0

Non-negotiable constraints for code quality, architecture, and development practices.

## File Size & Decomposition

**Maximum 300 lines of code per file** (any language, any project type). Enforced by pre-commit hooks.

- Split large files immediately upon reaching 280 LOC
- Organize by responsibility: one system per file, one archetype handler per file, one visual component per file
- Test files (`*.test.ts`) may exceed this limit only for comprehensive test suites (comment why)

## Imports: Tree-Shakable Only

**NEVER use barrel imports from @babylonjs/core:**

```typescript
// ❌ WRONG
import { Mesh, Vector3, MeshBuilder } from "@babylonjs/core";

// ✅ CORRECT
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
```

Tree-shaking is critical for bundle size on mobile platforms.

## Miniplex ECS API

**Use Miniplex 2.0 API only:**

```typescript
// ✅ Correct (Miniplex 2.0)
const query = world.with('level', 'platterCore');
const entity = world.add({ level: true, platterCore: true });
world.remove(entity);

// ❌ Wrong (Miniplex 1.x)
const query = world.archetype('level', 'platterCore');
const entity = world.createEntity({ level: true, platterCore: true });
world.destroy(entity);
```

All Miniplex code must use the `with()` query API and `add()`/`remove()` lifecycle methods.

## 3D Rendering: Imperative Babylon.js

**All Babylon.js mesh creation is imperative, not JSX:**

```typescript
// ✅ Correct
useEffect(() => {
  const mesh = MeshBuilder.CreateBox('box', { size: 1 }, scene);
  mesh.position.z = 5;
  return () => mesh.dispose();
}, [scene]);

// ❌ Wrong (JSX for meshes)
return <box name="box" size={1} position={[0, 0, 5]} />;
```

Reactylon is in `package.json` and planned for native support, but currently zero source files use it for mesh creation. All creation is imperative.

## Shaders: Effect.ShadersStore Only

**All GLSL shaders must be registered in `Effect.ShadersStore` as static strings:**

```typescript
// ✅ Correct (in src/shaders/registry.ts)
Effect.ShadersStore["myVertexShader"] = `
  precision highp float;
  attribute vec3 position;
  uniform mat4 worldViewProjection;
  void main() {
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

// ❌ Wrong (inline strings, CSP violations)
const shader = \`precision highp float; ...\`;
```

CSP-safe registration prevents runtime injection attacks.

## Render Loop: registerBeforeRender

**All per-frame logic must use `scene.registerBeforeRender()`:**

```typescript
// ✅ Correct
useEffect(() => {
  const update = () => {
    // Per-frame logic here
    mesh.rotation.y += 0.01;
  };
  scene.registerBeforeRender(update);
  return () => scene.unregisterBeforeRender(update);
}, [scene]);

// ❌ Wrong (React state updates every frame)
const [rotation, setRotation] = useState(0);
// this causes constant re-renders
```

Never use React state for animation state. Use Babylon.js properties directly.

## GSAP Animations

**GSAP works natively with Babylon.js Vector3 and mesh properties:**

```typescript
// ✅ Correct
gsap.to(mesh.position, { 
  x: 5, 
  z: -10, 
  duration: 1, 
  ease: "power2.out" 
});

gsap.to(mesh.rotation, {
  x: Math.PI / 2,
  duration: 0.5,
  ease: "expo.inOut"
});
```

No custom tweens needed — GSAP directly animates Babylon.js properties.

## No Stubs, TODOs, or Pass Bodies

**Every function must have a complete implementation.** Missing implementations are bugs:

- No `// TODO` comments in shipped code
- No `pass` or `return undefined` bodies
- Stale or incomplete features must be deleted, not left hanging
- If a feature is partially done, it goes on a separate branch — never merges incomplete

## Documentation Maintenance

**Documentation is code.** Stale docs are bugs.

- Update ARCHITECTURE.md whenever systems are added/removed
- Update DESIGN.md when visual or game design changes
- Update TESTING.md when test strategy or coverage goals change
- Update CLAUDE.md with new conventions or patterns discovered
- Update AGENTS.md at the end of each session with active status
- Update STATE.md with current work focus and known issues

All markdown files must have YAML frontmatter: `title`, `updated`, `status`, `domain`.

## Testing Requirements

- **Unit tests** for pure logic (seed helpers, archetype slot calculations, state derivations)
- **Integration tests** for system interactions (ECS queries, render loops, event handlers)
- **E2E tests** for critical gameplay flows (mobile + web via Playwright/Maestro)
- Minimum coverage: 70% lines, 80% branches for core systems
- Stale tests are deleted or updated — never skip failing tests

Commands:
```bash
pnpm test              # Jest unit + property-based tests
pnpm test:coverage     # Jest with lcov report
pnpm test:e2e:web      # Playwright
pnpm test:e2e:mobile   # Maestro (iOS + Android)
```

## Biome Linting & Formatting

**Use Biome 2.4 for single-pass lint + format:**

```bash
pnpm lint          # Check (no fix)
pnpm lint:fix      # Auto-fix
pnpm format        # Format only
```

**Common Biome gotchas:**
- `--write --unsafe` removes private field declarations that are only assigned in methods — re-add manually after running auto-fix
- Always run `pnpm lint` before committing
- Never commit unformatted code

## TypeScript Strict Mode

- `strict: true` in `tsconfig.json`
- ES2022 target (no polyfills for modern browsers/native)
- No `any` types — use `unknown` + type guards where needed
- All async functions must return Promise (no implicit void)

## Commit Conventions

**Conventional Commits always:**

- `feat:` — new feature (archetype, system, shader, etc.)
- `fix:` — bug fix (physics tuning, shader fix, memory leak, etc.)
- `refactor:` — internal reorganization (no behavior change)
- `perf:` — performance optimization
- `test:` — test-only changes
- `docs:` — documentation-only changes
- `chore:` — dependency updates, CI config
- `ci:` — GitHub Actions / deployment workflow changes
- `build:` — build config, Metro/Expo settings

Example: `feat: add CrystallineCubeBoss 5-phase GSAP timeline`

## Platform-Specific Code

**Use platform-aware imports and feature detection:**

```typescript
// ✅ Correct
import { Platform } from "react-native";

if (Platform.OS === "web") {
  // Web-only: WebXR, WebGPU, pointer events
} else if (Platform.OS === "ios") {
  // iOS-only: ARKit, Metal
} else if (Platform.OS === "android") {
  // Android-only: ARCore, Vulkan
}
```

Never use `global.__DEV__` or `typeof window === 'undefined'` — use `Platform.OS` checks instead.

## Design System & Branding

- **All materials use PBR** (metallic, roughness, normal maps)
- **All colors derived from design tokens** (see `docs/design/` directory)
- **All fonts monospace** (technical aesthetic — no serif/sans-serif)
- **No external 3D model imports** — everything procedural (MeshBuilder + SPS + morph targets)
- **No HUD during gameplay** — all feedback diegetic (in-world)
- **No text overlays in AR** — immersion is paramount

## Memory & Performance

- Dispose all meshes, materials, textures on unmount
- Unregister all `registerBeforeRender` callbacks
- Cap particle systems at 512 particles (SPS)
- Limit light count to 8 (deferred rendering budget)
- Profile on real Android devices (SD888+) and iPhones (12+)

## Version Constraints

| Dependency | Min Version |
|---|---|
| Node | 22.0.0 |
| React | 19.2.0 |
| React Native | 0.83.2 |
| TypeScript | 5.9.3 |
| Babylon.js | 8.51.2 |
| Expo SDK | 55.0.0-preview.11 |
| Metro | Latest (bundled with Expo) |
| Miniplex | 2.0.0 |

Breaking version changes (e.g., Babylon 9.x) require branch + RFC discussion.

## What NOT to Do

- ❌ No `console.log()` in production code (use error/warning logs only)
- ❌ No `any` types
- ❌ No barrel imports from @babylonjs/core
- ❌ No JSX for Babylon.js meshes
- ❌ No react state for animation
- ❌ No external 3D models (everything procedural)
- ❌ No HUD text during gameplay
- ❌ No unmanaged subscriptions or refs
- ❌ No unhandled promise rejections
- ❌ No platform-specific code without feature detection
