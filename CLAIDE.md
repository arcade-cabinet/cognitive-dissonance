# Claude/CLAIDE Instructions

For comprehensive instructions on working with this codebase, please refer to **[AGENTS.md](AGENTS.md)** in the root directory.

## Project Context

**Psyduck Panic: Evolution Deluxe** is a retro arcade browser game where players counter AI hype thought bubbles. Built as a static site with Astro, React, and TypeScript.

## Quick Start

```bash
pnpm install    # Install dependencies
pnpm dev        # Start development server (http://localhost:4321/psyduck-panic/)
pnpm test       # Run unit tests
pnpm test:e2e   # Run end-to-end tests
pnpm lint:fix   # Fix linting issues
pnpm build      # Build for production
```

## Key Guidelines

### Code Principles
- **Type Safety**: Strict TypeScript, no `any` types
- **Minimal Changes**: Surgical, focused modifications
- **Testing**: Write tests for new features and fixes
- **Performance**: Keep bundle small, optimize Canvas operations
- **Aesthetic**: Maintain retro/CRT visual style

### Project Structure
```
src/
├── lib/               # Core game logic (pure functions)
├── components/        # React/Astro UI components
└── pages/            # Astro pages (routing)
```

### Common Tasks

**Adding Enemy Types** → Edit `src/lib/constants.ts` TYPES object
**Modifying Game Balance** → Edit constants in `src/lib/constants.ts`
**Fixing Bugs** → Check `src/lib/game-engine.ts` for logic issues
**UI Changes** → Modify `src/components/Game.tsx`

## Development Workflow

1. 📖 Read [AGENTS.md](AGENTS.md) for detailed guidelines
2. 🔍 Explore existing code to understand patterns
3. 🧪 Run tests before changes: `pnpm test`
4. ✏️ Make minimal, focused changes
5. ✅ Add/update tests as needed
6. 🎨 Run linting: `pnpm lint:fix`
7. 🧪 Verify: `pnpm dev` and test manually
8. ✅ Run full suite: `pnpm test && pnpm test:e2e`

## Important Constraints

### ❌ Do NOT
- Add audio files (use Web Audio API procedurally)
- Add large dependencies (keep bundle <300KB)
- Use React class components (functional only)
- Break existing tests
- Add backend/server code (static site only)
- Commit secrets or API keys

### ✅ DO
- Follow TypeScript strict mode
- Match existing code patterns
- Write tests for new features
- Keep changes minimal and focused
- Maintain retro aesthetic
- Support mobile/touch interactions
- Update documentation when needed

## Testing

- **Unit Tests**: `src/lib/*.test.ts` (Vitest)
- **E2E Tests**: `e2e/*.spec.ts` (Playwright)
- **Pattern**: Functional, focused test cases

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/lib/game-engine.ts` | Core game loop, state management |
| `src/components/Game.tsx` | Main React component, Canvas rendering |
| `src/lib/constants.ts` | Game configuration and data |
| `src/lib/types.ts` | TypeScript type definitions |
| `src/lib/audio.ts` | Web Audio API sound system |

## Documentation

- **[AGENTS.md](AGENTS.md)** - Comprehensive AI agent instructions
- **[DEVELOPING.md](DEVELOPING.md)** - Full development guide
- **[SECURITY.md](SECURITY.md)** - Security policies
- **[README.md](README.md)** - Public-facing documentation

## Getting Help

- Review existing code for patterns
- Check test files for usage examples
- Read full documentation in AGENTS.md
- Search issues/discussions on GitHub

---

📖 **For complete guidelines and best practices, see [AGENTS.md](AGENTS.md)**

🎮 **Let's build an awesome retro game together!**
