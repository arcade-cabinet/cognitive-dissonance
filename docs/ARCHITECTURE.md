# Psyduck Panic - Architecture Documentation

## Overview

Psyduck Panic is a browser-based retro arcade game built with modern web technologies and native mobile capabilities. The game features a unique premise where players must counter AI hype thought bubbles before their brother transforms into Psyduck from panic overload.

## Technology Stack

### Core Technologies
- **React 19** - UI component framework
- **TypeScript 5** - Type-safe development
- **Vite 7** - Build tool and dev server
- **React Three Fiber 9** - 3D rendering via Three.js
- **@react-three/drei 10** - R3F helper components (Text, Billboard, Line)
- **Miniplex 2** - Entity Component System (ECS)
- **miniplex-react 2** - React bindings for Miniplex ECS
- **Tone.js 15** - Adaptive music system with real-time synth layers
- **Capacitor 8** - Native mobile runtime (iOS/Android)
- **Anime.js 4** - UI/HUD animations

### Development Tools
- **Biome 2.3** - Fast linter and formatter
- **Vitest 4** - Unit testing framework
- **Playwright 1.58** - End-to-end testing
- **pnpm 10** - Fast package manager

## System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
├─────────────────────────────────────────────────────────────┤
│  React Components (UI/HUD)  │  R3F Canvas (3D Scene)        │
│  - Game.tsx                  │  - GameScene.tsx               │
│  - HUD overlays              │  - CharacterModel.tsx          │
│  - Menus & dialogs           │  - RoomBackground.tsx          │
│                              │  - ECS Systems (Enemy, Boss,   │
│  Tone.js (Adaptive Music)    │    Particle, Trail, Confetti)  │
│  - music.ts                  │                                │
│  - Layers by panic/wave      │  Miniplex ECS (Entity Mgmt)   │
│                              │  - world.ts, state-sync.ts     │
└──────────────────┬───────────┴───────────────┬──────────────┘
                   │                           │
┌──────────────────▼───────────────────────────▼──────────────┐
│                      Business Logic Layer                    │
├─────────────────────────────────────────────────────────────┤
│  Game Engine (Web Worker)   │  Device Management            │
│  - GameLogic                 │  - CapacitorDevice           │
│  - Enemy spawning            │  - DeviceUtils               │
│  - Collision detection       │  - Responsive layout         │
│  - Score/panic calculation   │  - Orientation handling      │
│  - Grading (S/A/B/C/D)      │                              │
└──────────────────┬───────────┴───────────────┬──────────────┘
                   │                           │
┌──────────────────▼───────────────────────────▼──────────────┐
│                     Platform Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Web APIs                    │  Capacitor Native APIs        │
│  - WebGL (via Three.js)      │  - Device info                │
│  - Web Audio (via Tone.js)   │  - Screen orientation         │
│  - IndexedDB (scores)        │  - Haptics                   │
│  - Service Worker            │  - Status bar                │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Game Component (`Game.tsx`)
The main React component that orchestrates the game:

```text
Game.tsx
├── R3F Canvas
│   └── GameScene (ref-based updates at 60fps)
├── Worker Communication
│   ├── Game state updates → ECS sync
│   ├── Event processing (SFX, VFX triggers)
│   └── Input handling
├── UI State Management
│   ├── useReducer (ui-state.ts)
│   └── Grading (grading.ts)
├── Tone.js Music
│   └── Adaptive layers by panic/wave
└── HUD Rendering
    ├── Score, panic, combo
    ├── Wave announcements
    ├── Grade overlay (S/A/B/C/D)
    └── Game over stats
```


### 3D Scene (`GameScene.tsx`)

Orchestrates all R3F rendering systems:

```text
GameScene
├── CameraController (screen shake)
├── RoomBackground (3D diorama)
│   ├── Back wall + floor
│   ├── Window with moon + stars
│   ├── Desk with keyboard/mouse
│   ├── Monitor glow (shifts calm→red with panic)
│   ├── Posters (change text by wave)
│   └── Progressive clutter (energy drinks, books, 2nd monitor)
├── CharacterModel
│   ├── Normal state (0-33% panic) — calm blue
│   ├── Panic state (33-66% panic) — yellow, sweat drops
│   ├── Psyduck state (66-100% panic) — orange, cross-eyes
│   └── Eyes (dynamic pupil tracking, speed scales with panic)
├── ECS Systems (driven by Miniplex archetypes)
│   ├── EnemySystem — colored bubbles with glow, icon, word label
│   ├── BossSystem — pulsing sphere, orbiting orbs, HP display
│   ├── ParticleSystem — burst particles on counter
│   ├── TrailSystem — ring trails on counter
│   └── ConfettiSystem — victory confetti
└── FlashOverlay (fullscreen flash effect)
```

### ECS Layer (Miniplex)

Entity Component System for all game entities:

```text
ECS (src/ecs/)
├── world.ts
│   ├── Entity type (position, velocity, enemy, boss, particle, trail, confetti, powerUp)
│   ├── World<Entity> instance
│   └── Archetypes: enemies, particles, trails, confettis, powerUps, bosses
├── react.ts
│   └── createReactAPI bindings (from miniplex-react)
└── state-sync.ts
    ├── syncStateToECS() — bridges worker GameState → ECS entities
    ├── spawnParticles() — burst particles at position
    ├── spawnConfetti() — victory confetti
    └── clearAllEntities() — reset on game restart
```


### Game Logic (`GameLogic`)

Core game mechanics in Web Worker:

```text
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

```text
1. Worker: Update game state (60 FPS)
   ├── Update enemy positions
   ├── Check collisions
   ├── Update timers
   └── Calculate panic

2. Worker → Main: Post state update + events

3. Main Thread: Process state
   ├── Sync ECS entities (state-sync.ts)
   ├── R3F systems render from ECS (useFrame)
   ├── Update React HUD (ref-based, no re-renders)
   ├── Process events (SFX, particles, music)
   └── Update Tone.js music layers

4. User Input → Main Thread

5. Main Thread → Worker: Send input

6. Loop back to step 1
```

### State Flow

```text
GameState (from Worker)
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
├── fl: number (flash alpha)
├── flCol: string (flash color)
├── shake: number
└── events: GameEvent[]
```

## Coordinate System

- **Game space**: 800x600 pixels (GAME_WIDTH x GAME_HEIGHT)
- **Scene space**: x: (-4, 4), y: (3, -3)
- **Conversion**: `gx(x) = (x - 400) / 100`, `gy(y) = -(y - 300) / 100`
- Shared `src/components/scene/coordinates.ts` provides `gx()`/`gy()` — all rendering systems import from there

## Platform Integration


### Capacitor Integration

```text
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

```text
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

```text
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

## Performance Optimizations

### Web Worker
- Game logic runs off main thread
- Prevents UI blocking
- Smooth 60 FPS even during intensive calculations


### R3F / Three.js Rendering

- Hardware-accelerated WebGL via Three.js
- Ref-based updates (no React re-renders at 60fps)
- ECS archetypes for efficient entity iteration
- Particle lifecycle management with automatic cleanup


### Memory Management

- ECS entity cleanup on removal
- Particle/trail/confetti lifecycle with auto-decay
- Event queue limits
- World.remove() for departed entities

## Build Pipeline

```text
Source Code
    ↓
TypeScript Compilation (tsc --noEmit)
    ↓
Vite Build (with manual chunks)
    ↓
Optimized Chunks:
├── vendor-react (~46KB)
├── vendor-three (~1.2MB, gzip ~334KB)
├── vendor-tone (~253KB, gzip ~62KB)
├── vendor-anime (~27KB)
├── game-utils (~10KB)
├── game-ecs (~24KB)
└── index (~47KB)
    ↓
Capacitor Sync (optional)
    ↓
Native App Bundles
    ├→ iOS (.ipa)
    └→ Android (.apk/.aab)
```

## File Structure

```text
psyduck-panic/
├── src/
│   ├── components/
│   │   ├── Game.tsx              # Main game component (R3F + HUD + worker)
│   │   ├── Landing.tsx           # Start screen
│   │   ├── Layout.astro          # Astro page layout
│   │   └── scene/
│   │       ├── GameScene.tsx     # R3F scene orchestrator
│   │       ├── CharacterModel.tsx # 3D character (Normal/Panic/Psyduck)
│   │       ├── RoomBackground.tsx # 3D diorama room
│   │       └── systems/
│   │           ├── EnemySystem.tsx    # ECS enemy rendering
│   │           ├── BossSystem.tsx     # ECS boss rendering
│   │           └── ParticleSystem.tsx # Particles, trails, confetti
│   ├── ecs/
│   │   ├── world.ts              # Miniplex World + Entity + archetypes
│   │   ├── react.ts              # createReactAPI bindings
│   │   └── state-sync.ts         # Worker state → ECS bridge
│   ├── lib/
│   │   ├── game-logic.ts         # Core game engine (Web Worker)
│   │   ├── events.ts             # GameEvent + GameState types
│   │   ├── types.ts              # Enemy, Boss, PowerUp types
│   │   ├── constants.ts          # Game data (types, waves, powerups)
│   │   ├── audio.ts              # Web Audio SFX
│   │   ├── music.ts              # Tone.js adaptive music
│   │   ├── grading.ts            # Grade calculation (S/A/B/C/D)
│   │   ├── ui-state.ts           # UI state reducer + actions
│   │   ├── storage.ts            # IndexedDB persistence
│   │   ├── device-utils.ts       # Responsive viewport
│   │   └── capacitor-device.ts   # Native device APIs
│   ├── design/
│   │   └── tokens.ts             # Design token system
│   ├── styles/                   # CSS (game, landing, global)
│   ├── worker/
│   │   └── game.worker.ts        # Web Worker entry point
│   ├── App.tsx                   # React Router
│   └── main.tsx                  # Entry point
├── docs/                         # Documentation
├── e2e/                          # Playwright E2E tests
├── public/                       # Static assets
└── AGENTS.md                     # Cross-agent memory bank
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
2. **IndexedDB** - Scores stored locally
3. **Content Security Policy** - Strict CSP headers
4. **HTTPS Only** - Secure connections
5. **Native Sandboxing** - Platform security features

## Future Enhancements

- [x] Yuka.js AI for boss behavior (Vehicle + Think + GoalEvaluators in boss-ai.ts)
- [x] AI Director FSM for dynamic difficulty (director.ts)
- [ ] Proper panic escalation algorithms (logarithmic curves)
- [ ] Multiplayer mode
- [ ] Cloud save sync
- [ ] Achievements system
- [ ] Leaderboards
- [ ] Additional game modes
- [ ] Character customization
- [ ] Daily challenges
