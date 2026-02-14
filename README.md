# 🎮 Psyduck Panic: Evolution Deluxe

A retro-style browser game where you must counter AI hype thought bubbles before your brother's brain melts from doomscrolling! Built with **Astro**, **React**, and **TypeScript**.

![Game Screenshot](https://github.com/user-attachments/assets/c087a654-20b1-4249-be62-50dde0eecd02)

## 🕹️ Game Overview

Your brother is stuck doomscrolling AI hype on Twitter. Counter the thought bubbles before his PANIC meter hits 100%! Survive 5 increasingly difficult waves plus boss battles to save his sanity.

### Controls

- **Keyboard:**
  - `1` - Counter REALITY bubbles (🦠 Hype)
  - `2` - Counter HISTORY bubbles (📈 Growth)
  - `3` - Counter LOGIC bubbles (🤖 Demos)
  - `Q` - Nuke (clears all bubbles)
  - `Space` - Start game / Continue to endless mode

- **Mouse/Touch:**
  - Click/tap enemies to auto-counter them
  - Click ability buttons to use them

### Game Mechanics

- **Enemy Types:**
  - 🦠 **REALITY** (Orange): Hype Train, Vaporware, Trust Me
  - 📈 **HISTORY** (Green): Exponential, Singularity, Hockey Stick
  - 🤖 **LOGIC** (Purple): Snake Demo, Agents, Wrapper

- **Powerups:**
  - ⏳ **Time Warp**: Slows down enemies
  - 🛡️ **Clarity**: Shields from panic damage
  - ⭐ **2X Score**: Doubles your score

- **Combo System**: Chain successful counters for higher scores
- **Boss Battles**: Face off against The Hype Train and The Singularity
- **Endless Mode**: Continue after Wave 5 for infinite challenge

## 🚀 Development

### Prerequisites

- Node.js 20+
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Testing

```bash
# Run unit tests
pnpm test

# Watch mode
pnpm test:watch

# Test with UI
pnpm test:ui

# Run E2E tests
pnpm test:e2e

# E2E with UI
pnpm test:e2e:ui
```

### Code Quality

```bash
# Lint code
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

## 🏗️ Architecture

### Project Structure

```
psyduck-panic/
├── .github/workflows/     # CI/CD pipelines
│   ├── ci.yml            # Continuous integration
│   └── cd.yml            # Deployment to GitHub Pages
├── e2e/                  # Playwright E2E tests
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
│   └── test/             # Unit tests
├── astro.config.mjs      # Astro configuration
├── biome.json            # Biome linting config
├── playwright.config.ts  # E2E test config
└── vitest.config.ts      # Unit test config
```

### Tech Stack

| Technology | Purpose |
|------------|---------|
| **Astro 5.17** | Static site generation |
| **React 19** | UI components |
| **TypeScript 5** | Type safety |
| **Canvas API** | 2D game rendering |
| **Web Audio API** | Sound effects and music |
| **Biome 2.3** | Linting and formatting |
| **Vitest 4** | Unit testing |
| **Playwright 1.58.2** | E2E testing |

## 🎨 Features

- ✅ Retro pixel-art aesthetic with CRT effects
- ✅ Dynamic music that speeds up with wave progression
- ✅ Combo system with momentum perks
- ✅ Multiple enemy types and boss battles
- ✅ Powerup system
- ✅ Endless mode after completion
- ✅ Touch-friendly mobile controls
- ✅ Keyboard shortcuts for desktop
- ✅ Real-time Twitter-style feed

## 📦 Build Output

Production build is optimized and deployed to GitHub Pages:
- **Bundle Size**: ~226 KB (gzipped: ~72 KB)
- **Build Time**: ~1.5 seconds
- **Deployment**: Automatic via GitHub Actions

## 🤝 Contributing

This is an educational project demonstrating modern web game development with Astro and React.

## 📄 License

MIT

## 🎯 Game Tips

1. **Master the Combos**: Chain counters for massive score multipliers
2. **Use Powerups Wisely**: Save shields for panic emergencies
3. **Boss Patterns**: Learn attack patterns to anticipate boss moves
4. **Click to Counter**: On mobile, tap enemies directly for quick counters
5. **Watch the Feed**: The Twitter feed shows what's coming next

---

Built with ❤️ using Astro + React + TypeScript