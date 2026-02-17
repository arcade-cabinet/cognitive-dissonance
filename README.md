# Cognitive Dissonance

A 3D browser game where you defend your AI from hallucinations raining down as cognitive distortions. Counter denial, delusion, and fallacy before cognitive overload triggers a head explosion. Built with **React Three Fiber**, **TypeScript**, and **Web Workers**.

## Game Overview

Your AI is drowning in hallucinations. Cognitive distortions descend as holographic SDF shapes — counter them with the right ability before the overload meter hits 100%. Survive 5 escalating waves plus boss encounters to restore clarity.

### Controls

- **Keyboard:**
  - `F1` - Counter DENIAL (orange sphere-lid SDF)
  - `F2` - Counter DELUSION (green octahedron SDF)
  - `F3` - Counter FALLACY (purple twisted torus SDF)
  - `F4` - Nuke (clears all enemies)
  - `Space` - Pause / Resume

- **Mouse/Touch:**
  - Click/tap enemies to auto-counter them
  - Click 3D keycaps directly

### Game Mechanics

- **Enemy Types** (raymarched SDF shapes):
  - **DENIAL** (Orange): Copium, It's Fine, Trust Me, No Problem
  - **DELUSION** (Green): AGI Tuesday, Exponential, Singularity, Paradigm
  - **FALLACY** (Purple): Just Scale It, Correlation, Ad Hominem, Straw Man

- **Powerups:**
  - TIME WARP: Slows down enemies
  - CLARITY: Shields from panic damage
  - 2X SCORE: Doubles your score

- **Combo System**: Chain successful counters for higher scores
- **Boss Battles**: Face THE ECHO CHAMBER and THE GRAND DELUSION
- **Endless Mode**: Continue after Wave 5 for infinite challenge

## Development

### Prerequisites

- Node.js 20+
- pnpm

### Setup

```bash
pnpm install     # Install dependencies
pnpm dev         # Run development server
pnpm build       # Production build
pnpm preview     # Preview production build
```

### Testing

```bash
pnpm test        # Unit tests (277 tests)
pnpm test:watch  # Watch mode
pnpm test:e2e    # Playwright E2E tests
```

### Code Quality

```bash
pnpm typecheck   # TypeScript strict check
pnpm lint        # Biome lint
pnpm lint:fix    # Auto-fix
```

All PRs must pass: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`

## Architecture

### Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI components |
| **TypeScript 5** | Type safety |
| **Vite 7** | Build tool and dev server |
| **React Three Fiber 9** | 3D rendering (Three.js) |
| **Miniplex 2** | Entity Component System (ECS) |
| **Tone.js 15** | Adaptive music system |
| **Capacitor 8** | Native mobile (iOS/Android) |
| **Biome 2** | Linting and formatting |
| **Vitest 4** | Unit testing |
| **Playwright 1.58** | E2E testing |

### Key Architecture

- **Worker + ECS**: Game logic runs in a Web Worker. State syncs to Miniplex ECS. R3F systems render ECS entities.
- **Ref-based rendering**: GameScene uses refs (not state) for 60fps updates without React re-renders.
- **3D Keyboard UI**: The mechanical keyboard IS the entire interface. Keycaps change labels based on game state. RGB backlighting reflects panic level.
- **Raymarched SDF Enemies**: Each enemy type is a per-object raymarched signed distance function (denial=sphere-lid, delusion=octahedron, fallacy=torus) with holographic iridescent materials.
- **NS-5 Android Bust**: Rear bust composition — camera behind the character showing back of head, shoulders, and keyboard. Continuous tension escalation via body language.

### Project Structure

```
src/
  components/
    Game.tsx              # Main game component (R3F Canvas + HUD + worker)
    scene/
      GameScene.tsx       # R3F scene orchestrator
      CharacterBust.tsx   # NS-5 android rear bust
      KeyboardControls.tsx # 3D mechanical keyboard with RGB
      systems/            # ECS rendering systems
  ecs/                    # Miniplex ECS world + state sync
  lib/                    # Game logic, audio, AI, panic system
  design/                 # Design tokens (metallic technopunk)
  worker/                 # Web Worker game loop
e2e/                      # Playwright E2E tests + helpers
```

## Automated Workflows

- **Dependabot**: Weekly dependency update PRs
- **Automerge**: Auto-merges safe updates when CI passes
- **Release**: Android APK builds via GitHub Actions

See [`docs/AUTOMATED_WORKFLOWS.md`](docs/AUTOMATED_WORKFLOWS.md) for details.

## License

MIT
