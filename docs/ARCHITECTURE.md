# Psyduck Panic - Architecture Documentation

## Overview

Psyduck Panic is a browser-based retro arcade game built with modern web technologies and native mobile capabilities. The game features a unique premise where players must counter AI hype thought bubbles before their brother transforms into Psyduck from panic overload.

## Technology Stack

### Core Technologies
- **Astro 5.17** - Static site generator and build system
- **React 19** - UI component framework
- **TypeScript 5** - Type-safe development
- **PixiJS 8.16** - WebGL-powered 2D rendering engine
- **Capacitor 8** - Native mobile runtime (iOS/Android)
- **Anime.js 3.2** - Animation library

### Development Tools
- **Biome 2.3** - Fast linter and formatter
- **Vitest 4** - Unit testing framework
- **Playwright 1.58** - End-to-end testing
- **pnpm 10** - Fast package manager

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
├─────────────────────────────────────────────────────────────┤
│  React Components (UI/HUD)  │  PixiJS Renderer (Game View)  │
│  - Game.tsx                  │  - PixiRenderer              │
│  - HUD overlays              │  - CharacterRenderer         │
│  - Menus & dialogs           │  - Particle systems          │
└──────────────────┬───────────┴───────────────┬──────────────┘
                   │                           │
┌──────────────────▼───────────────────────────▼──────────────┐
│                      Business Logic Layer                    │
├─────────────────────────────────────────────────────────────┤
│  Game Engine (Web Worker)   │  Device Management            │
│  - GameLogic                 │  - CapacitorDevice           │
│  - Enemy spawning            │  - DeviceUtils               │
│  - Collision detection       │  - Responsive layout         │
│  - Score calculation         │  - Orientation handling      │
└──────────────────┬───────────┴───────────────┬──────────────┘
                   │                           │
┌──────────────────▼───────────────────────────▼──────────────┐
│                     Platform Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Web APIs                    │  Capacitor Native APIs        │
│  - Canvas/WebGL              │  - Device info                │
│  - Web Audio                 │  - Screen orientation         │
│  - LocalStorage              │  - Haptics                   │
│  - Service Worker            │  - Status bar                │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Game Component (`Game.tsx`)
The main React component that orchestrates the game:

```typescript
Game.tsx
├── Canvas Management
│   ├── PixiJS initialization
│   └── Responsive sizing
├── Worker Communication
│   ├── Game state updates
│   └── Input handling
├── UI State Management
│   ├── React reducer for UI
│   └── Event handlers
└── HUD Rendering
    ├── Score, panic, combo
    ├── Wave announcements
    └── Overlays
```

### PixiJS Renderer (`PixiRenderer`)
Handles all WebGL rendering:

```typescript
PixiRenderer
├── Scene Graph
│   ├── Stars (background)
│   ├── Enemies
│   ├── Character
│   ├── Particles/Effects
│   └── UI elements (powerups)
├── Character Renderer
│   ├── Normal state (0-33%)
│   ├── Panic state (33-66%)
│   └── Psyduck state (66-100%)
└── Visual Effects
    ├── Particle systems
    ├── Screen shake
    └── Flash effects
```

### Game Logic (`GameLogic`)
Core game mechanics in Web Worker:

```typescript
GameLogic (Worker)
├── Game Loop
│   └── 60 FPS update cycle
├── Entity Management
│   ├── Enemy spawning
│   ├── Powerup spawning
│   └── Boss management
├── Collision Detection
│   └── Enemy-click intersection
├── State Management
│   ├── Panic calculation
│   ├── Score tracking
│   └── Combo system
└── Event Queue
    ├── SFX triggers
    ├── Visual effects
    └── Feed updates
```

## Data Flow

### Game Loop Flow
```
1. Worker: Update game state (60 FPS)
   ├── Update enemy positions
   ├── Check collisions
   ├── Update timers
   └── Calculate panic
   
2. Worker → Main: Post state update
   
3. Main Thread: Process state
   ├── Update React UI
   ├── Update PixiJS renderer
   └── Trigger audio effects
   
4. User Input → Main Thread
   
5. Main Thread → Worker: Send input
   
6. Loop back to step 1
```

### State Flow
```
GameState (Immutable)
├── enemies: Enemy[]
├── powerups: PowerUpInstance[]
├── boss: Boss | null
├── score: number
├── panic: number
├── combo: number
├── wave: number
├── waveTime: number
├── abilities: AbilityCooldowns
├── powerupEffects: PowerupEffects
└── events: GameEvent[]
```

## Platform Integration

### Capacitor Integration
```
Web App
└── Capacitor Runtime
    ├── iOS
    │   ├── WKWebView
    │   ├── Native plugins
    │   └── App Store distribution
    └── Android
        ├── WebView
        ├── Native plugins
        └── Play Store distribution
```

### Device Detection Flow
```
1. App Launch
   ├── Capacitor.isNativePlatform()
   └── Initialize native plugins
   
2. Get Device Info
   ├── Device.getInfo() (native)
   ├── Screen dimensions
   ├── Pixel ratio
   └── Form factor classification
   
3. Calculate Viewport
   ├── Safe area insets
   ├── Aspect ratio maintenance
   └── Responsive scaling
   
4. Configure Features
   ├── Lock/unlock orientation
   ├── Status bar styling
   └── Keyboard behavior
```

## Responsive System

### Viewport Calculation
The game maintains a 4:3 aspect ratio (800x600 base) while adapting to any screen:

```typescript
Viewport Dimensions
├── Phone Portrait
│   ├── Use 95% of width
│   └── Scale to fit height
├── Phone Landscape
│   ├── Use 98% of width
│   └── Maximize screen usage
├── Tablet
│   ├── Use 90% of space
│   └── Comfortable viewing
├── Foldable
│   ├── Detect fold state
│   └── Adapt to screen segments
└── Desktop
    ├── Max 1.5x base size
    └── Centered display
```

### Safe Areas
Handles notches, home indicators, and system UI:

```
┌─────────────────────────────┐
│     Status Bar / Notch      │ ← Safe Area Top
├─────────────────────────────┤
│                             │
│      Game Viewport          │
│      (800x600 scaled)       │
│                             │
├─────────────────────────────┤
│     Home Indicator          │ ← Safe Area Bottom
└─────────────────────────────┘
```

## Performance Optimizations

### Web Worker
- Game logic runs off main thread
- Prevents UI blocking
- Smooth 60 FPS even during intensive calculations

### PixiJS Rendering
- Hardware-accelerated WebGL
- Object pooling for particles
- Efficient scene graph updates
- Texture atlasing for sprites

### Memory Management
- Entity cleanup on removal
- Particle lifecycle management
- Texture disposal
- Event queue limits

## Build Pipeline

```
Source Code
    ↓
TypeScript Compilation
    ↓
Astro Build
    ↓
Static HTML/CSS/JS
    ↓
Capacitor Sync
    ↓
Native App Bundles
    ├→ iOS (.ipa)
    └→ Android (.apk/.aab)
```

## File Structure

```
psyduck-panic/
├── src/
│   ├── components/        # React components
│   │   ├── Game.tsx       # Main game component
│   │   └── Layout.astro   # Page layout
│   ├── lib/               # Core logic
│   │   ├── game-logic.ts  # Game engine
│   │   ├── pixi-renderer.ts      # WebGL renderer
│   │   ├── character-renderer.ts # Character states
│   │   ├── capacitor-device.ts   # Native APIs
│   │   ├── device-utils.ts       # Responsive utils
│   │   ├── audio.ts       # Sound system
│   │   └── constants.ts   # Game data
│   ├── design/            # Design system
│   │   └── tokens.ts      # Design tokens
│   ├── styles/            # Global CSS
│   ├── pages/             # Astro pages
│   └── worker/            # Web workers
├── docs/                  # Documentation
├── e2e/                   # E2E tests
├── public/                # Static assets
├── capacitor.config.ts    # Capacitor config
└── astro.config.mjs       # Astro config
```

## Deployment Targets

### Web (GitHub Pages)
- Static hosting
- PWA with service worker
- Responsive web app

### iOS (App Store)
- Native iOS app via Capacitor
- WKWebView wrapper
- Native device APIs

### Android (Play Store)
- Native Android app via Capacitor
- WebView wrapper
- Native device APIs

## Security Considerations

1. **No Backend** - Pure client-side game
2. **Local Storage** - Scores stored locally
3. **Content Security Policy** - Strict CSP headers
4. **HTTPS Only** - Secure connections
5. **Native Sandboxing** - Platform security features

## Future Enhancements

- [ ] Multiplayer mode
- [ ] Cloud save sync
- [ ] Achievements system
- [ ] Leaderboards
- [ ] Additional game modes
- [ ] Character customization
- [ ] More boss battles
- [ ] Daily challenges
