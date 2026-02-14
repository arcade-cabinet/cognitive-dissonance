# 🔧 Development Guide

Complete guide for developers who want to contribute to or modify Psyduck Panic.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Adding Features](#adding-features)
- [Performance](#performance)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## 🔑 Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 10.13.0+ (specified in package.json)
- Modern browser with Canvas API support
- Git

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/arcade-cabinet/psyduck-panic.git
cd psyduck-panic

# Install dependencies
pnpm install

# Start development server
pnpm dev
# Open http://localhost:4321/psyduck-panic/

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## 🏗️ Architecture

### Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Astro** | 5.17+ | Static site generation & routing |
| **React** | 19.2+ | UI components & game rendering |
| **TypeScript** | 5.9+ | Type safety & developer experience |
| **Canvas API** | Native | 2D game rendering |
| **Web Audio API** | Native | Sound effects and music |
| **Biome** | 2.3+ | Linting and code formatting |
| **Vitest** | 4.0+ | Unit testing framework |
| **Playwright** | 1.58+ | End-to-end testing |

### Project Structure

```
psyduck-panic/
├── .github/
│   ├── workflows/          # CI/CD pipelines
│   │   ├── ci.yml         # Continuous integration
│   │   └── cd.yml         # Deployment to GitHub Pages
│   └── copilot-instructions.md  # GitHub Copilot instructions
├── docs/                   # Additional documentation
│   ├── ARCHITECTURE.md    # Detailed architecture docs
│   ├── CODE_OF_CONDUCT.md # Community guidelines
│   └── CONTRIBUTING.md    # Contribution guidelines
├── e2e/                   # Playwright E2E tests
│   └── game.spec.ts      # Main game E2E tests
├── src/
│   ├── components/
│   │   ├── Game.tsx      # Main React game component
│   │   └── Layout.astro  # Page layout wrapper
│   ├── lib/
│   │   ├── audio.ts      # Web Audio API sound system
│   │   ├── constants.ts  # Game data (types, waves, powerups)
│   │   ├── types.ts      # TypeScript interfaces
│   │   └── game-engine.ts # Core game loop and logic
│   ├── pages/
│   │   └── index.astro   # Entry point
│   ├── styles/
│   │   └── game.css      # Game styles
│   └── test/             # Unit test utilities
├── astro.config.mjs      # Astro configuration
├── biome.json            # Biome linting config
├── playwright.config.ts  # E2E test config
├── vitest.config.ts      # Unit test config
├── AGENTS.md             # AI agent instructions
├── CLAIDE.md             # Claude instructions
├── DEVELOPING.md         # This file
├── SECURITY.md           # Security policies
└── README.md             # Public-facing README
```

### Core Architecture

#### Game Engine (`src/lib/game-engine.ts`)

The game engine manages:
- **Game State** - Player stats, enemies, powerups, waves
- **Game Loop** - Delta time calculations, updates, collisions
- **Spawn Logic** - Enemy and powerup generation
- **Collision Detection** - Enemy-player interactions
- **Wave Management** - Difficulty progression and boss battles

#### Rendering (`src/components/Game.tsx`)

React component that:
- Manages Canvas API rendering
- Handles user input (keyboard, mouse, touch)
- Updates UI elements (HUD, buttons, feed)
- Applies visual effects (CRT, particles)

#### Audio System (`src/lib/audio.ts`)

Web Audio API implementation:
- Procedural sound generation (no audio files)
- Dynamic music tempo based on wave progression
- Sound effects for actions and events

#### Constants & Types

- `src/lib/constants.ts` - Game data, enemy types, waves, powerups
- `src/lib/types.ts` - TypeScript interfaces and types

## 🧪 Testing

### Unit Tests (Vitest)

```bash
# Run tests once
pnpm test

# Watch mode for development
pnpm test:watch

# With UI dashboard
pnpm test:ui

# With coverage report
pnpm test:coverage
```

**Test Files:**
- `src/lib/game-engine.test.ts` - Core game logic tests
- `src/lib/audio.test.ts` - Audio system tests

### E2E Tests (Playwright)

```bash
# Install browsers (first time only)
pnpm exec playwright install

# Run E2E tests
pnpm test:e2e

# With interactive UI
pnpm test:e2e:ui

# Headed mode (see browser)
pnpm test:e2e:headed
```

**Test Files:**
- `e2e/game.spec.ts` - Full game flow tests

### Writing Tests

Unit tests follow Vitest conventions:

```typescript
import { describe, it, expect } from 'vitest'
import { yourFunction } from './your-module'

describe('Feature Name', () => {
  it('should do something specific', () => {
    const result = yourFunction()
    expect(result).toBe(expected)
  })
})
```

## ✨ Code Quality

### Linting & Formatting

We use [Biome](https://biomejs.dev/) for unified linting and formatting:

```bash
# Check code
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Format code
pnpm format
```

### Type Checking

```bash
# Check TypeScript types
pnpm astro check
```

### Pre-commit Checklist

Before committing:
- ✅ Run `pnpm lint` - No linting errors
- ✅ Run `pnpm test` - All tests pass
- ✅ Run `pnpm astro check` - No type errors
- ✅ Test locally with `pnpm dev`

## 🎨 Adding Features

### Adding a New Enemy Type

1. **Define Type** in `src/lib/constants.ts`:
```typescript
export const TYPES = {
  // ... existing types
  NEW_TYPE: {
    name: 'New Type',
    color: '#HEX',
    emoji: '🎯',
    key: '4',
    phrases: ['Phrase 1', 'Phrase 2']
  }
}
```

2. **Update TypeScript types** in `src/lib/types.ts`
3. **Add to wave configurations** in `src/lib/constants.ts`
4. **Write tests** in `src/lib/game-engine.test.ts`

### Adding a New Power-Up

1. **Define Power-Up** in `src/lib/constants.ts`:
```typescript
export const POWERUPS = {
  // ... existing powerups
  NEW_POWERUP: {
    name: 'Power Name',
    emoji: '⚡',
    duration: 10000,
    description: 'Effect description'
  }
}
```

2. **Implement effect** in `src/lib/game-engine.ts`
3. **Add spawn logic** to power-up spawning system
4. **Test the behavior** with unit tests

### Adding a New Wave

Edit `WAVES` array in `src/lib/constants.ts`:

```typescript
{
  duration: 30000,
  spawnInterval: 2000,
  maxConcurrent: 5,
  boss: undefined, // or boss config
  distribution: {
    REALITY: 50,
    HISTORY: 30,
    LOGIC: 20
  }
}
```

## 📊 Performance

### Build Optimization

```bash
# Production build with analysis
pnpm build

# Check bundle size
ls -lh dist/assets/
```

**Current Metrics:**
- Bundle Size: ~226 KB
- Gzipped: ~72 KB  
- Build Time: ~1.5 seconds

### Performance Tips

1. **Canvas Optimization**
   - Minimize canvas redraws
   - Use requestAnimationFrame efficiently
   - Batch draw operations

2. **Memory Management**
   - Clean up event listeners
   - Remove off-screen entities
   - Limit particle effects

3. **Bundle Size**
   - Lazy load heavy dependencies
   - Tree-shake unused code
   - Optimize images

### Profiling

Use browser DevTools:
- **Performance Tab** - Record game loop performance
- **Memory Tab** - Check for memory leaks
- **Network Tab** - Analyze asset loading

## 🚀 Deployment

### Automatic Deployment (GitHub Actions)

Pushes to `main` branch automatically deploy via `.github/workflows/cd.yml`:

1. Builds the project
2. Deploys to GitHub Pages
3. Available at: https://arcade-cabinet.github.io/psyduck-panic/

### Manual Deployment

```bash
# Build production bundle
pnpm build

# Upload dist/ folder to hosting service
```

### Environment Configuration

Edit `astro.config.mjs` for deployment settings:

```javascript
export default defineConfig({
  site: 'https://your-domain.com',
  base: '/your-base-path',
  // ...
})
```

## 🐛 Troubleshooting

### Common Issues

#### Tests Failing

**Issue:** Unit or E2E tests fail
**Solutions:**
- Verify Node.js version: `node --version` (should be 20+)
- Clear dependencies: `rm -rf node_modules && pnpm install`
- Check port availability (4321, 4322, 4323)
- Review test logs for specific errors

#### Build Errors

**Issue:** Build fails with errors
**Solutions:**
- Run `pnpm astro check` for type errors
- Verify import paths are correct
- Check all dependencies installed: `pnpm install`
- Clear build cache: `rm -rf dist .astro`

#### Game Not Loading

**Issue:** Blank screen or errors in browser
**Solutions:**
- Open browser console to see errors
- Verify Canvas API support
- Check JavaScript is enabled
- Try different browser
- Clear browser cache

#### Development Server Issues

**Issue:** Dev server won't start
**Solutions:**
- Check port 4321 isn't in use: `lsof -i :4321`
- Try different port: `pnpm dev --port 4322`
- Clear .astro cache: `rm -rf .astro`

### Getting Help

1. **Check Documentation** - Review this guide and README
2. **Search Issues** - Look for similar problems in GitHub Issues
3. **Ask Questions** - Open a new issue with details
4. **Community** - Reach out in discussions

## 📚 Additional Resources

- [Astro Documentation](https://docs.astro.build/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Guide](https://vitest.dev/guide/)
- [Playwright Docs](https://playwright.dev/)
- [Biome Documentation](https://biomejs.dev/)
- [Canvas API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Web Audio API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

## 🤝 Need Help?

- **Bug Reports** - [Open an issue](https://github.com/arcade-cabinet/psyduck-panic/issues)
- **Feature Requests** - [Start a discussion](https://github.com/arcade-cabinet/psyduck-panic/discussions)
- **Security Issues** - See [SECURITY.md](SECURITY.md)

---

Happy coding! 🎮✨
