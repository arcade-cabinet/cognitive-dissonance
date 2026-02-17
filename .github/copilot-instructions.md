# Copilot Instructions — Cognitive Dissonance

## How to Use This File

This file contains **Copilot-specific** development instructions. For project documentation, see:

- **[AGENTS.md](../AGENTS.md)** — Cross-agent memory bank (architecture, patterns, tech context, file structure)
- **[docs/DESIGN_VISION.md](../docs/DESIGN_VISION.md)** — Photorealistic procedural generation vision (THE authoritative design target)
- **[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)** — System architecture deep dive
- **[docs/DESIGN_SYSTEM.md](../docs/DESIGN_SYSTEM.md)** — Design tokens and visual language
- **[docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)** — Build, deploy, CI/CD pipeline

Always read AGENTS.md and the relevant docs/ files before starting work.

## Design Vision (Critical)

The visual target is **photorealistic procedural generation** — NOT low-poly, NOT retro placeholders. Every 3D element must use complex curves, PBR materials (MeshPhysicalMaterial), procedural textures (shader noise), and sophisticated lighting. Read `docs/DESIGN_VISION.md` for the full specification before touching any rendering code.

## Stack

- React 19 + TypeScript 5 + Vite 7
- React Three Fiber 9 + Three.js 0.182 + @react-three/drei 10
- Miniplex 2 ECS + miniplex-react 2 (NOT @miniplex/react)
- Tone.js 15 (adaptive music) + Yuka.js 0.7.8 (game AI)
- Biome 2.3 (lint/format) + Vitest 4 (tests) + Playwright 1.58 (E2E)
- pnpm (not npm/yarn)

## Architecture

- Game logic runs in a Web Worker (`src/worker/game.worker.ts` → `src/lib/game-logic.ts`)
- State syncs from worker → Miniplex ECS → R3F rendering systems
- GameScene uses refs (not React state) for 60fps updates
- Design tokens in `src/design/tokens.ts` — all colors/spacing come from here
- Logic in `/lib/`, not `.tsx` files — components are thin rendering layers

## Commands

```bash
pnpm dev          # Dev server
pnpm build        # Production build
pnpm typecheck    # TypeScript check
pnpm lint         # Biome lint
pnpm test         # Unit tests
pnpm test:e2e     # E2E tests
```

## Quality Gates

All PRs must pass: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
