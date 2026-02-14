# GitHub Copilot Instructions

For comprehensive instructions on working with this codebase, please refer to **[AGENTS.md](../AGENTS.md)** in the root directory.

## Quick Reference

- **Project**: Psyduck Panic - Retro arcade browser game
- **Stack**: Astro + React + TypeScript + Canvas API
- **Style**: Functional, type-safe, minimal dependencies
- **Testing**: Vitest (unit) + Playwright (E2E)

## Key Commands

```bash
pnpm dev        # Start dev server
pnpm test       # Run unit tests
pnpm test:e2e   # Run E2E tests
pnpm lint:fix   # Fix linting issues
pnpm build      # Production build
```

## Before Suggesting Code

1. Read [AGENTS.md](../AGENTS.md) for detailed guidelines
2. Check existing patterns in similar files
3. Ensure suggestions follow TypeScript strict mode
4. Consider bundle size impact
5. Match the retro game aesthetic

## Important Files

- `src/lib/game-engine.ts` - Core game logic
- `src/components/Game.tsx` - Main game component
- `src/lib/constants.ts` - Game configuration
- `src/lib/types.ts` - TypeScript definitions

---

📖 **Full documentation**: [AGENTS.md](../AGENTS.md)
