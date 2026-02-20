# Testing — Cognitive Dissonance v3.0

## Overview

The project uses a multi-layered testing strategy:
- **Unit + Property-Based Tests**: Jest + fast-check
- **Web E2E Tests**: Playwright
- **Mobile E2E Tests**: Maestro

## Unit and Property-Based Testing

### Framework

- **Jest** with ts-jest transform
- **fast-check** for property-based testing
- **Test environment**: node (no jsdom — game logic is headless-testable)

### Configuration

`jest.config.ts`:
```typescript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^@babylonjs/core/(.*)$': '<rootDir>/node_modules/@babylonjs/core/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^tone$': '<rootDir>/src/__mocks__/tone.ts',
  },
  transformIgnorePatterns: ['/node_modules/(?!.*@babylonjs)'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/index.ts'],
  coverageReporters: ['lcov', 'text-summary'],
  coverageDirectory: 'coverage',
};
```

### Test Structure

```text
src/
├── systems/
│   ├── TensionSystem.ts
│   └── __tests__/
│       └── TensionSystem.test.ts
├── ecs/
│   ├── World.ts
│   └── __tests__/
│       └── World.test.ts
└── utils/
    ├── seed-helpers.ts
    └── __tests__/
        └── seed-helpers.test.ts
```

### Property-Based Tests

2027 tests across 53 test suites (including 30 property-based tests) validate core system invariants:

**P1: Tension Clamping** — Tension always ∈ [0.0, 0.999]
**P2: Over-Stabilization Threshold** — Rebound only triggers below 0.05
**P3: Seed Determinism** — Same seed always produces same archetype
**P4: Pattern Coherence Bonus** — Full match grants exactly 0.09 decrease
**P5: Tendril Spawn Monotonicity** — Higher tension never produces fewer tendrils
**P17: Seed-to-Entity Completeness** — All component fields populated
**P18: Logarithmic Scaling Correctness** — Formula matches spec
**P19: Difficulty Snapshot Bounds** — All fields within specified ranges
**P21: Feedback Loop Stability** — Converges, doesn't diverge

See `docs/ARCHITECTURE.md` for system architecture details.

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# Specific test file
pnpm test -- src/systems/__tests__/TensionSystem.test.ts
```

## Web E2E Testing

### Framework

- **Playwright** against Expo web dev server
- **Browser**: Chromium only (WebGPU/WebGL2 support)

### Configuration

`playwright.config.ts`:
```typescript
export default defineConfig({
  testDir: './e2e/web',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:8081',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm web',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } },
    },
  ],
});
```

### Test Files

```text
e2e/web/
├── smoke.spec.ts              # App loads, engine initializes, scene renders
├── console-health.spec.ts     # Console error/warning monitoring
├── gameplay-lifecycle.spec.ts  # Full gameplay lifecycle testing
├── keyboard-interaction.spec.ts # Keyboard input and keycap interaction
└── visual-regression.spec.ts  # Visual regression screenshot comparison
```

### Running Tests

```bash
# Run all web E2E tests
pnpm test:e2e:web

# Run in headed mode (see browser)
pnpm exec playwright test --headed

# Debug specific test
pnpm exec playwright test e2e/web/smoke.spec.ts --debug
```

## Mobile E2E Testing

### Framework

- **Maestro** flows on Android emulator / iOS simulator

### Flow Files

```text
.maestro/
├── config.yaml            # Shared Maestro config (app ID, timeouts)
├── app-launch.yaml        # App starts, engine initializes, scene renders
├── gameplay-loop.yaml     # Touch keycaps, stabilize patterns, tension decreases
├── ar-session.yaml        # AR session starts (mocked camera), platter anchors
└── game-over.yaml         # Tension reaches max, sphere shatters, game-over screen
```

### Running Tests

```bash
# Run all mobile E2E tests (both platforms)
pnpm test:e2e:mobile

# Android only
pnpm test:e2e:mobile:android

# iOS only
pnpm test:e2e:mobile:ios

# Debug with Maestro Studio
maestro studio
```

## CI Integration

All tests run automatically in GitHub Actions CI:

1. **code-quality job**: Jest unit tests
2. **web-e2e job**: Playwright web E2E
3. **mobile-e2e job**: Maestro mobile E2E (Android emulator on macos-latest runner)

See `docs/GITHUB_ACTIONS.md` for full CI pipeline details.

## Coverage

Jest coverage output: `coverage/lcov.info` (lcov format for CI consumption)

Target coverage: 80%+ for core systems (TensionSystem, DifficultyScalingSystem, PatternStabilizationSystem, CorruptionTendrilSystem, ECS World)

## References

- [Architecture](./ARCHITECTURE.md) — System architecture
- [Level Archetypes](./LEVEL_ARCHETYPES.md) — 25 Dream archetype definitions
- [GitHub Actions](./GITHUB_ACTIONS.md) — CI/CD pipeline
- [Development](./DEVELOPMENT.md) — Local development workflow
