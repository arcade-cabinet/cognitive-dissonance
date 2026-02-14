# Architecture Documentation

Deep dive into the technical architecture of Psyduck Panic.

## 🏗️ System Overview

Psyduck Panic is a client-side browser game built as a static site. All game logic runs in the browser using modern web APIs.

```
┌─────────────────────────────────────────┐
│           Browser (Client)              │
│  ┌───────────────────────────────────┐  │
│  │      Astro Static Site            │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │   React Game Component      │  │  │
│  │  │  ┌──────────┬──────────────┐│  │  │
│  │  │  │ Canvas   │  Web Audio   ││  │  │
│  │  │  │ Renderer │  Sound       ││  │  │
│  │  │  └──────────┴──────────────┘│  │  │
│  │  │  ┌──────────────────────────┐│  │
│  │  │  │  Game Engine (State)     ││  │
│  │  │  └──────────────────────────┘│  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 📦 Tech Stack Rationale

### Astro

**Why**: Static site generation for optimal performance
- Zero JavaScript by default (except what we need)
- Fast page loads
- SEO friendly
- Easy deployment to static hosts

### React

**Why**: Component-based UI with efficient rendering
- Hooks for state management
- Large ecosystem
- Excellent Canvas integration via refs
- Familiar to most developers

### TypeScript

**Why**: Type safety and better developer experience
- Catch errors at compile time
- Better IDE support
- Self-documenting code
- Easier refactoring

### Canvas API

**Why**: High-performance 2D rendering
- Native browser support
- Hardware accelerated
- Full control over rendering
- Pixel-perfect graphics

### Web Audio API

**Why**: Procedural sound generation
- No audio files needed (smaller bundle)
- Dynamic audio generation
- Low latency
- Full control over sound

## 🎮 Game Architecture

### Game Loop

Classic game loop pattern:

```typescript
function gameLoop(currentTime: number) {
  const deltaTime = currentTime - lastTime
  
  // 1. Process input
  handleInput()
  
  // 2. Update game state
  state = updateGameState(state, deltaTime)
  
  // 3. Render
  render(canvas, state)
  
  // 4. Next frame
  requestAnimationFrame(gameLoop)
}
```

### State Management

Functional state updates with immutability:

```typescript
interface GameState {
  // Core state
  player: Player
  enemies: Enemy[]
  powerups: Powerup[]
  
  // Game flow
  wave: number
  score: number
  panicLevel: number
  
  // Status
  gameOver: boolean
  paused: boolean
}

// Pure function for state updates
function updateGameState(
  state: GameState, 
  delta: number
): GameState {
  return {
    ...state,
    // Updated properties
  }
}
```

### Entity System

Simple entity-component pattern:

```typescript
interface Entity {
  id: string
  x: number
  y: number
  velocityX: number
  velocityY: number
  width: number
  height: number
}

interface Enemy extends Entity {
  type: string
  phrase: string
  hitPoints: number
}

interface Powerup extends Entity {
  type: string
  duration: number
}
```

## 🎨 Rendering Pipeline

### Canvas Rendering

```typescript
function render(ctx: CanvasRenderingContext2D, state: GameState) {
  // 1. Clear canvas
  clearCanvas(ctx)
  
  // 2. Draw background
  drawBackground(ctx)
  
  // 3. Draw entities (back to front)
  drawPowerups(ctx, state.powerups)
  drawEnemies(ctx, state.enemies)
  drawPlayer(ctx, state.player)
  
  // 4. Draw effects
  drawParticles(ctx, state.particles)
  drawCRTEffect(ctx)
  
  // 5. Draw UI
  drawHUD(ctx, state)
}
```

### Coordinate System

- Origin (0,0) at top-left
- X increases right
- Y increases down
- Canvas dimensions: 800x600 (scaled to fit viewport)

### Visual Effects

**CRT Effect**:
- Scanlines via semi-transparent lines
- Screen curvature via CSS transforms
- Glow effect via CSS filters

**Particles**:
- Emitted on collisions and events
- Physics-based movement
- Fade out over lifetime

## 🎵 Audio Architecture

### Sound System

```typescript
class AudioSystem {
  context: AudioContext
  
  // Procedural sound generation
  playCollisionSound() {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    
    // Configure and connect
    oscillator.connect(gain)
    gain.connect(context.destination)
    
    // Play
    oscillator.start()
    oscillator.stop(context.currentTime + duration)
  }
}
```

### Music System

Dynamic music that adjusts to game state:
- Base tempo increases with wave number
- Intensity increases with panic level
- Procedurally generated using Web Audio oscillators

## 🔄 Data Flow

### Input → State → Render

```
User Input (keyboard/mouse/touch)
    ↓
Input Handler (Game.tsx)
    ↓
State Update (game-engine.ts)
    ↓
New State
    ↓
Render (Canvas) + Audio + UI Updates
```

### Event Flow

```typescript
// Input events
keyboard.on('keydown', (key) => {
  if (key === '1') counterEnemy('REALITY')
})

// Game events
on('enemyHit', (enemy) => {
  playSound('hit')
  spawnParticles(enemy.x, enemy.y)
  updateScore(points)
})

// System events
on('waveComplete', () => {
  pauseGame()
  showWaveTransition()
})
```

## 💾 Persistence

### Local Storage

```typescript
interface SaveData {
  highScore: number
  settings: {
    soundEnabled: boolean
    musicEnabled: boolean
  }
}

// Save
localStorage.setItem('psyduck-panic', JSON.stringify(data))

// Load
const data = JSON.parse(localStorage.getItem('psyduck-panic'))
```

## 🎯 Collision Detection

### AABB (Axis-Aligned Bounding Box)

```typescript
function checkCollision(a: Entity, b: Entity): boolean {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y
}
```

### Collision Response

```typescript
function handleCollision(enemy: Enemy, player: Player) {
  // Enemy reaches player
  player.panicLevel += enemy.panicDamage
  
  // Remove enemy
  removeEnemy(enemy.id)
  
  // Visual feedback
  spawnParticles(enemy.x, enemy.y, 'collision')
  playSound('collision')
  
  // Game over check
  if (player.panicLevel >= 100) {
    triggerGameOver()
  }
}
```

## 📊 Performance Considerations

### Optimization Strategies

1. **Object Pooling** - Reuse enemy/particle objects
2. **Culling** - Don't render off-screen entities
3. **Throttling** - Limit spawn rates
4. **Delta Time** - Smooth gameplay across frame rates
5. **RAF** - Use requestAnimationFrame for rendering

### Bundle Optimization

- **Code Splitting** - Lazy load non-critical code
- **Tree Shaking** - Remove unused code
- **Minification** - Compress JavaScript
- **Asset Optimization** - No audio files, minimal images

### Memory Management

```typescript
// Clean up on game over
function cleanup() {
  // Clear entity arrays
  state.enemies = []
  state.particles = []
  state.powerups = []
  
  // Stop audio
  audioContext.close()
  
  // Cancel animation frame
  cancelAnimationFrame(frameId)
}
```

## 🔐 Security Considerations

### Client-Side Security

- **No Server** - No backend to attack
- **No Auth** - No passwords or sensitive data
- **XSS Protection** - React escapes by default
- **CSP** - Content Security Policy via headers
- **Static Assets** - All code reviewed before deploy

### Input Validation

```typescript
// Validate user input even though client-side
function sanitizeInput(input: string): string {
  return input.trim().slice(0, MAX_LENGTH)
}
```

## 🧪 Testing Strategy

### Unit Tests

Test pure functions in isolation:
- Game state updates
- Collision detection
- Score calculation
- Wave progression

### E2E Tests

Test full game flow:
- Game starts correctly
- Player can counter enemies
- Power-ups activate
- Game over triggers
- High scores persist

### Test Pyramid

```
        /\
       /E2E\        Few, slow, expensive
      /------\
     /  Intg  \     Some integration tests
    /----------\
   /   Unit     \   Many, fast, cheap
  /--------------\
```

## 📁 File Organization

```
src/
├── lib/              # Pure logic (no UI dependencies)
│   ├── game-engine.ts    # Core game state & logic
│   ├── audio.ts          # Sound generation
│   ├── constants.ts      # Configuration data
│   └── types.ts          # Type definitions
│
├── components/       # UI components
│   ├── Game.tsx          # Main game component
│   └── Layout.astro      # Page wrapper
│
├── pages/           # Routes
│   └── index.astro       # Entry point
│
└── styles/          # Global styles
    └── game.css          # Game-specific CSS
```

## 🚀 Build & Deploy

### Build Process

```
Source Code
    ↓
TypeScript Compilation
    ↓
Astro Build (SSG)
    ↓
React Bundle
    ↓
Asset Optimization
    ↓
Static Site (dist/)
    ↓
GitHub Pages Deploy
```

### Deploy Pipeline

```yaml
# .github/workflows/cd.yml
build → test → deploy
  ↓      ↓       ↓
 dist/  pass   pages
```

## 🔮 Future Architecture

### Potential Improvements

- **Web Workers** - Move game logic off main thread
- **WebGL** - Upgrade from Canvas 2D for more effects
- **IndexedDB** - Store more game data
- **Service Worker** - Offline support
- **WebRTC** - Multiplayer (if ever added)

---

For implementation details, see the source code and inline documentation.
