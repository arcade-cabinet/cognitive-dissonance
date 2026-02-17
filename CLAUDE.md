# Claude Code Instructions — Cognitive Dissonance

## How to Use This File

This file contains **Claude-specific** development instructions. For project documentation, see:

- **[AGENTS.md](./AGENTS.md)** — Cross-agent memory bank (architecture, patterns, tech context, file structure)
- **[docs/DESIGN_VISION.md](./docs/DESIGN_VISION.md)** — Photorealistic procedural generation vision (THE authoritative design target)
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — System architecture deep dive
- **[docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)** — Design tokens and visual language
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — Build, deploy, CI/CD pipeline
- **[docs/AUTOMATED_WORKFLOWS.md](./docs/AUTOMATED_WORKFLOWS.md)** — GitHub Actions workflow documentation

Always read AGENTS.md and the relevant docs/ files before starting work. Update AGENTS.md after significant changes.

## Design Vision (Critical)

The visual target is **photorealistic procedural generation** with a **rear bust composition** — camera behind the NS-5 android showing back of head, shoulders, and keyboard row. NOT low-poly, NOT retro, NOT cartoonish. Every 3D element must use complex curves, PBR materials, procedural textures, and sophisticated lighting. Enemies are **raymarched SDF shapes** (denial=sphere-lid, delusion=octahedron, fallacy=torus) with holographic iridescent materials. Game over is a **head explosion effect** (anime.js). Read `docs/DESIGN_VISION.md` for the full specification before touching any rendering code.

## Commands

```bash
pnpm dev          # Dev server (Vite)
pnpm build        # Production build (typecheck + icons + Vite)
pnpm typecheck    # TypeScript strict check
pnpm lint         # Biome lint
pnpm lint:fix     # Biome auto-fix
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright E2E tests
```

## Code Quality Gates

All PRs must pass: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`

## Key Architecture Decisions

- **Worker + ECS**: Game logic runs in a Web Worker (`game-logic.ts`). State syncs to Miniplex ECS. R3F systems render ECS entities.
- **Ref-based rendering**: GameScene uses refs (not state) for 60fps updates without React re-renders.
- **Seeded RNG**: All game-state randomness uses `src/lib/rng.ts` (mulberry32). Cosmetic randomness (particles, stars) may use Math.random().
- **No monoliths**: Logic in `/lib/`, not `.tsx` files. Components are thin rendering layers.
- **`miniplex-react`** (not `@miniplex/react`) is the correct React bindings package.

## Conventions

- Biome for lint + format (not ESLint/Prettier)
- `pnpm` (not npm/yarn)
- Design tokens in `src/design/tokens.ts` — all colors and spacing come from here
- E2E tests use shared helpers from `e2e/helpers/`
- Governor subpackage at `e2e/helpers/governor/` for automated playthroughs

## Known Open Issues

See the "Open" section in code review findings tracked in AGENTS.md and GitHub Issues. Key items:

- Colorblind panic bar indicator needed
- Music and worker modules lack unit tests
- Floating-point drift in secondAccumulator (minor)
- calculateAccuracy API returns 0-100 while calculateGrade expects 0-1 (caller divides)
