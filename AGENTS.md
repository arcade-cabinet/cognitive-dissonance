# 🤖 AI Agent Instructions

This document provides instructions for AI coding agents (GitHub Copilot, Claude, etc.) working on the Psyduck Panic codebase.

## 📋 Project Overview

**Psyduck Panic: Evolution Deluxe** is a retro-style browser game built with Astro, React, and TypeScript. The game features arcade-style gameplay where players counter AI hype thought bubbles.

### Key Technologies
- **Astro 5.17+** - Static site generation
- **React 19** - UI components
- **TypeScript 5** - Type safety
- **Canvas API** - Game rendering
- **Web Audio API** - Sound system
- **Biome** - Linting/formatting
- **Vitest** - Unit testing
- **Playwright** - E2E testing

## 🎯 Core Principles

### Code Quality
1. **Type Safety First** - Always use TypeScript, avoid `any`
2. **Test Coverage** - Write tests for new features and bug fixes
3. **Small Changes** - Make minimal, focused modifications
4. **Follow Conventions** - Match existing code style and patterns
5. **Performance** - Keep bundle size small, optimize canvas operations

### Development Workflow
1. Read existing code to understand patterns
2. Run tests before making changes (`pnpm test`)
3. Make minimal, surgical changes
4. Add/update tests as needed
5. Run linting (`pnpm lint:fix`)
6. Verify changes work (`pnpm dev`)
7. Run full test suite (`pnpm test && pnpm test:e2e`)

## 🏗️ Architecture Guidelines

### Project Structure
```
src/
├── lib/               # Core game logic (pure functions preferred)
│   ├── game-engine.ts # Main game loop and state management
│   ├── audio.ts       # Web Audio API sound system
│   ├── constants.ts   # Game data and configuration
│   └── types.ts       # TypeScript type definitions
├── components/        # React/Astro UI components
│   ├── Game.tsx       # Main game component with canvas
│   └── Layout.astro   # Page layout
└── pages/            # Astro pages (routing)
    └── index.astro   # Entry point
```

### Key Files

#### `src/lib/game-engine.ts`
- **Purpose**: Core game logic, state management, game loop
- **Pattern**: Functional approach with immutable state updates
- **Key Functions**:
  - `updateGameState()` - Main game loop update
  - `spawnEnemy()` - Enemy spawning logic
  - `checkCollision()` - Collision detection
  - `activatePowerup()` - Power-up effects

#### `src/components/Game.tsx`
- **Purpose**: React component for game rendering and input
- **Pattern**: React hooks for state, refs for Canvas
- **Responsibilities**:
  - Canvas rendering via `useRef`
  - Input handling (keyboard, mouse, touch)
  - Game loop via `requestAnimationFrame`
  - UI rendering (HUD, buttons, feed)

#### `src/lib/constants.ts`
- **Purpose**: Game configuration data
- **Contents**:
  - `TYPES` - Enemy type definitions
  - `WAVES` - Wave configurations
  - `POWERUPS` - Power-up definitions
  - Game balance constants

#### `src/lib/audio.ts`
- **Purpose**: Web Audio API sound system
- **Pattern**: Singleton audio context, procedural sounds
- **No Audio Files**: All sounds generated programmatically

## 💡 Common Tasks

### Adding a New Enemy Type

1. **Add to constants**:
```typescript
// src/lib/constants.ts
export const TYPES = {
  NEW_TYPE: {
    name: 'Type Name',
    color: '#HEX',
    emoji: '🎯',
    key: 'N',
    phrases: ['Phrase 1', 'Phrase 2', 'Phrase 3']
  }
}
```

2. **Update TypeScript types** in `src/lib/types.ts`
3. **Add to wave distribution** in `WAVES` array
4. **Write tests** in `src/lib/game-engine.test.ts`

### Adding a Power-Up

1. **Define in constants**:
```typescript
// src/lib/constants.ts
export const POWERUPS = {
  NEW_POWERUP: {
    name: 'Power Name',
    emoji: '⚡',
    duration: 10000,
    description: 'What it does'
  }
}
```

2. **Implement effect** in `game-engine.ts` `activatePowerup()`
3. **Add spawn logic** to power-up system
4. **Test behavior** with unit tests

### Modifying Game Balance

Edit values in `src/lib/constants.ts`:
- Wave duration/difficulty
- Enemy speed/spawn rates
- Power-up durations
- Score multipliers

### Adding UI Features

1. Add to `Game.tsx` component
2. Use existing CSS classes from `src/styles/game.css`
3. Follow retro/CRT aesthetic
4. Ensure mobile responsiveness

## 🧪 Testing Guidelines

### Unit Tests (Vitest)
- Location: `src/lib/*.test.ts`
- Run: `pnpm test`
- Coverage: Core game logic, state management, utilities

### E2E Tests (Playwright)
- Location: `e2e/*.spec.ts`
- Run: `pnpm test:e2e`
- Coverage: Full game flow, user interactions

### Test Patterns
```typescript
import { describe, it, expect, beforeEach } from 'vitest'

describe('Feature Name', () => {
  let state: GameState
  
  beforeEach(() => {
    state = createInitialGameState()
  })
  
  it('should handle specific case', () => {
    const result = updateGameState(state, delta)
    expect(result.someValue).toBe(expected)
  })
})
```

## 🎨 Code Style

### TypeScript
- Use strict mode (enabled)
- Avoid `any`, use proper types
- Prefer interfaces over types for objects
- Use const assertions where appropriate

### React
- Functional components only
- Use hooks (useState, useEffect, useRef, etc.)
- Avoid class components
- Keep components focused and small

### Naming Conventions
- **Files**: kebab-case (game-engine.ts)
- **Components**: PascalCase (Game.tsx)
- **Functions**: camelCase (updateGameState)
- **Constants**: UPPER_SNAKE_CASE (MAX_ENEMIES)
- **Types/Interfaces**: PascalCase (GameState)

### Comments
- Use JSDoc for public functions
- Explain "why" not "what"
- Keep comments up-to-date
- Remove commented-out code

## ⚠️ Important Constraints

### Do NOT
- ❌ Add audio files (use procedural Web Audio API)
- ❌ Add large dependencies (keep bundle small)
- ❌ Use class components (functional only)
- ❌ Modify files without understanding them
- ❌ Break existing tests
- ❌ Add backend/server code (static site only)
- ❌ Commit secrets or credentials
- ❌ Remove safety features without discussion

### DO
- ✅ Run tests before committing
- ✅ Keep bundle size small (<300KB)
- ✅ Use TypeScript strictly
- ✅ Follow existing patterns
- ✅ Write tests for new features
- ✅ Update documentation
- ✅ Consider mobile/touch support
- ✅ Maintain retro aesthetic

## 🐛 Bug Fixes

### Process
1. **Reproduce** - Understand the issue fully
2. **Locate** - Find root cause in code
3. **Fix** - Make minimal change to resolve
4. **Test** - Add test to prevent regression
5. **Verify** - Manually test the fix works

### Common Issues
- **Performance**: Check canvas redraws, memory leaks
- **Mobile**: Test touch events, viewport sizing
- **Audio**: Verify Web Audio API usage
- **Collisions**: Review game-engine.ts collision logic

## 🔐 Security

- Never commit secrets/API keys
- Sanitize all user input
- Use React's XSS protections
- Keep dependencies updated
- Follow SECURITY.md guidelines

## 📚 Resources

- [DEVELOPING.md](DEVELOPING.md) - Full development guide
- [SECURITY.md](SECURITY.md) - Security policies
- [README.md](README.md) - Public-facing docs

## 🤝 Collaboration

When working with other agents or developers:
- Communicate changes clearly
- Review existing issues/PRs first
- Ask questions if unclear
- Follow the established patterns
- Keep changes focused and minimal

---

**Remember**: Quality over speed. Make small, well-tested changes that maintain the game's retro charm and performance! 🎮✨
