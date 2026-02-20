# Development — Cognitive Dissonance v3.0

## Prerequisites

- **Node.js** >= 22.0.0
- **pnpm** 10.26+
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)

## Initial Setup

```bash
# Clone repository
git clone https://github.com/[username]/cognitive-dissonance.git
cd cognitive-dissonance

# Install dependencies
pnpm install

# Generate native projects (if not already present)
npx expo prebuild --clean
```

## Development Workflow

### Web Development

```bash
# Start Expo web dev server
pnpm web

# Open in browser
# http://localhost:8081
```

**Hot reload**: Enabled by default. Changes to TypeScript/TSX files trigger automatic reload.

### Android Development

```bash
# Start Metro dev server + Android emulator
pnpm android

# Or start Metro separately
pnpm start
# Then press 'a' to open Android
```

**Requirements**:
- Android Studio with SDK 34
- Android emulator (Pixel 5 API 34 recommended)
- `ANDROID_HOME` environment variable set

**Hot reload**: Enabled via Metro. Shake device or press `Cmd+M` (macOS) / `Ctrl+M` (Windows/Linux) for dev menu.

### iOS Development

```bash
# Start Metro dev server + iOS simulator
pnpm ios

# Or start Metro separately
pnpm start
# Then press 'i' to open iOS
```

**Requirements**:
- macOS with Xcode 15+
- iOS simulator (iPhone 14 recommended)

**Hot reload**: Enabled via Metro. Shake device or press `Cmd+D` for dev menu.

## Code Quality

### Linting

```bash
# Run Biome lint
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Format code
pnpm format
```

**Biome config**: `biome.json` (2-space indent, single quotes, trailing commas, semicolons, 120 line width)

### Type Checking

```bash
# Run TypeScript type-check
pnpm exec tsc --noEmit
```

**Common type errors**:
- Missing @babylonjs/core subpath imports (use `@babylonjs/core/Meshes/mesh`, not `@babylonjs/core`)
- Incorrect Miniplex API usage (`world.with()` not `archetype()`, `world.add()` not `createEntity()`)
- Missing field declarations (Biome auto-fix removes them — re-add after `biome check --write --unsafe`)

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Web E2E Tests

```bash
# Run Playwright tests
pnpm test:e2e:web

# Headed mode (see browser)
pnpm exec playwright test --headed

# Debug specific test
pnpm exec playwright test e2e/web/smoke.spec.ts --debug
```

### Mobile E2E Tests

```bash
# Run Maestro flows (requires Android emulator or iOS simulator)
pnpm test:e2e:mobile

# Android only
pnpm test:e2e:mobile:android

# iOS only
pnpm test:e2e:mobile:ios
```

## Debugging

### Web

- **Chrome DevTools**: Open browser console for errors and logs
- **React DevTools**: Install browser extension for component inspection
- **Babylon.js Inspector**: Press `Cmd+Shift+I` (macOS) / `Ctrl+Shift+I` (Windows/Linux) in-game

### Native

- **React Native Debugger**: Shake device → "Debug" → opens Chrome debugger
- **Flipper**: Install Flipper desktop app for advanced debugging
- **Xcode Debugger**: For iOS native code debugging
- **Android Studio Logcat**: For Android native code debugging

## Common Issues

### Metro bundler fails to start

```bash
# Clear Metro cache
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

### Android build fails

```bash
# Clean Gradle build
cd android
./gradlew clean

# Kill Gradle daemon
./gradlew --stop

# Rebuild
./gradlew assembleDebug
```

### iOS build fails

```bash
# Clean Xcode build
cd ios
xcodebuild clean

# Reinstall pods
rm -rf Pods Podfile.lock
pod install
```

### Type errors after Biome auto-fix

Biome auto-fix sometimes removes private field declarations that are only assigned in methods. Re-add them manually:

```typescript
// Before Biome auto-fix
class MySystem {
  private scene: Scene | null = null;
  
  initialize(scene: Scene) {
    this.scene = scene;
  }
}

// After Biome auto-fix (field removed)
class MySystem {
  initialize(scene: Scene) {
    this.scene = scene; // Type error: Property 'scene' does not exist
  }
}

// Fix: Re-add field declaration
class MySystem {
  private scene: Scene | null = null;
  
  initialize(scene: Scene) {
    this.scene = scene;
  }
}
```

## Project Structure

```text
/
├── index.web.tsx              # Web entry (Metro + Expo web + WebGPU)
├── index.native.tsx           # Native entry (Metro + Expo SDK 55 dev-client)
├── App.tsx                    # Root component
├── app.json                   # Expo app configuration
├── src/
│   ├── __mocks__/             # Jest mocks (react-native, tone)
│   ├── accessibility/         # Voice commands + haptics
│   ├── audio/                 # Tone.js audio
│   ├── configs/               # Config loader + patterns.json
│   ├── ecs/                   # Miniplex ECS world + archetypes
│   ├── enemies/               # Enemy systems
│   ├── engine/                # Engine initialization
│   ├── fallback/              # WebGL2 degradation
│   ├── multiplayer/           # WebRTC shared dreams
│   ├── native/                # Native platform integrations (ARKit, ARCore, BabylonNative)
│   ├── objects/               # 3D object factories
│   ├── physics/               # Havok physics (keycap, platter, hand)
│   ├── postprocess/           # Post-processing effects
│   ├── sequences/             # Title + game-over + shatter
│   ├── shaders/               # GLSL shaders + materials
│   ├── store/                 # Zustand stores
│   ├── systems/               # Core gameplay systems (singletons)
│   ├── types/                 # TypeScript types
│   ├── ui/                    # Diegetic GUI
│   ├── utils/                 # Utilities (seed, device quality, platform config)
│   └── xr/                    # AR/MR + XR + haptics systems
├── e2e/web/                   # Playwright web E2E (5 spec files)
├── .maestro/                  # Maestro mobile E2E
├── android/                   # Android native project
├── ios/                       # iOS native project
├── scripts/                   # Build analysis scripts
└── docs/                      # Documentation
```

## References

- [Architecture](./ARCHITECTURE.md) — System architecture
- [Level Archetypes](./LEVEL_ARCHETYPES.md) — 25 Dream archetype definitions
- [Testing](./TESTING.md) — Test infrastructure
- [Deployment](./DEPLOYMENT.md) — Build and deployment
