# Development Guide

## Quick Start

```bash
# Install dependencies
npm ci

# Start development server
npm run dev
# Open http://localhost:4321/psyduck-panic/

# Build for production
npm run build

# Preview production build
npm run preview
```

## Testing

### Unit Tests (Vitest)

```bash
# Run tests once
npm test

# Watch mode for development
npm run test:watch

# With UI
npm run test:ui

# With coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Install browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# With UI
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed
```

## Code Quality

### Linting

```bash
# Check code
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

## Project Structure

- `src/lib/` - Core game logic and utilities
- `src/components/` - React and Astro components
- `src/pages/` - Astro pages (routes)
- `src/styles/` - Global styles
- `src/test/` - Test utilities
- `e2e/` - Playwright E2E tests
- `.github/workflows/` - CI/CD pipelines

## Adding New Features

1. **New Game Mechanic**
   - Add types to `src/lib/types.ts`
   - Implement logic in `src/lib/game-engine.ts`
   - Add tests in `src/lib/game-engine.test.ts`

2. **New Enemy Type**
   - Add to `TYPES` in `src/lib/constants.ts`
   - Update type definitions
   - Add tests for validation

3. **New Powerup**
   - Add to `POWERUPS` in `src/lib/constants.ts`
   - Implement in game engine
   - Add spawn logic

## Debugging

### Browser DevTools
- Open browser console during development
- Check Network tab for asset loading
- Use React DevTools for component inspection

### Test Debugging
```bash
# Run single test file
npx vitest src/lib/game-engine.test.ts

# Debug specific test
npx vitest -t "should spawn enemies"
```

## Performance Optimization

### Build Analysis
```bash
npm run build
# Check dist/ folder size
ls -lh dist/assets/
```

### Bundle Size Tips
- Lazy load heavy dependencies
- Tree-shake unused code
- Optimize images in public/
- Use code splitting

## Deployment

### GitHub Pages (Automatic)
Pushes to `main` branch trigger automatic deployment via `.github/workflows/cd.yml`

### Manual Deployment
```bash
npm run build
# Upload dist/ folder to your hosting service
```

## Troubleshooting

### Tests Failing
- Check Node version (20+ required)
- Clear node_modules and reinstall: `rm -rf node_modules && npm ci`
- Check for port conflicts (4321, 4322, 4323)

### Build Errors
- Run `npm run astro check` for TypeScript errors
- Check import paths are correct
- Verify all dependencies are installed

### Game Not Loading
- Check browser console for errors
- Verify Canvas API is supported
- Check that JavaScript is enabled
- Try in different browser

## Resources

- [Astro Docs](https://docs.astro.build/)
- [React Docs](https://react.dev/)
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Biome Docs](https://biomejs.dev/)
