# GitHub Actions CI/CD — Cognitive Dissonance v3.0

## Overview

The project uses GitHub Actions for continuous integration and deployment across all platforms (web, Android, iOS). The CI/CD pipeline is split into two workflows:

- **CI** (`.github/workflows/ci.yml`): Runs on all pull requests and pushes to `main`
- **CD** (`.github/workflows/cd.yml`): Runs on pushes to `main` only

## CI Workflow

**Trigger**: Pull requests, pushes to `main`

**Jobs**:

### 1. code-quality

Runs linting, type-checking, and unit tests.

```yaml
steps:
  - Checkout code
  - Setup Node.js 22 + pnpm
  - Install dependencies
  - Run Biome lint: pnpm lint
  - Run TypeScript type-check: pnpm exec tsc --noEmit
  - Run Jest unit tests: pnpm test
```

**Exit criteria**: All checks must pass (0 lint errors, 0 type errors, all tests passing)

### 2. web-build

Builds Expo web export and verifies bundle size.

```yaml
needs: [code-quality]
steps:
  - Checkout code
  - Setup Node.js 22 + pnpm
  - Install dependencies
  - Build Expo web: pnpm build:web
  - Check bundle size: gzip -c dist/assets/*.js | wc -c
  - Fail if > 5242880 bytes (5 MB gzipped)
```

**Exit criteria**: Bundle size < 5 MB gzipped

### 3. android-build

Builds Android debug APK via Gradle.

```yaml
needs: [code-quality]
steps:
  - Checkout code
  - Setup Node.js 22 + pnpm
  - Install dependencies
  - Setup Java 17
  - Run Gradle: ./gradlew assembleDebug (android/)
```

**Exit criteria**: Debug APK builds successfully

### 4. web-e2e

Runs Playwright E2E tests against Expo web dev server.

```yaml
needs: [web-build]
steps:
  - Checkout code
  - Setup Node.js 22 + pnpm
  - Install dependencies
  - Install Playwright browsers: pnpm exec playwright install chromium --with-deps
  - Run Playwright tests: pnpm test:e2e:web
```

**Exit criteria**: All Playwright tests passing

**Test files**: `e2e/web/smoke.spec.ts`, `e2e/web/gameplay.spec.ts`

### 5. mobile-e2e

Runs Maestro E2E flows on Android emulator.

```yaml
needs: [android-build]
runs-on: macos-latest
steps:
  - Checkout code
  - Setup Node.js 22 + pnpm
  - Install dependencies
  - Start Android emulator (API 34, x86_64)
  - Install debug APK
  - Install Maestro CLI
  - Run Maestro flows: maestro test .maestro/
```

**Exit criteria**: All Maestro flows passing

**Flow files**: `.maestro/app-launch.yaml`, `.maestro/gameplay-loop.yaml`, `.maestro/ar-session.yaml`, `.maestro/game-over.yaml`

### 6. ci-success

Meta-job that depends on all other jobs. Used for branch protection rules.

```yaml
needs: [code-quality, web-build, android-build, web-e2e, mobile-e2e]
```

## CD Workflow

**Trigger**: Pushes to `main` only

**Jobs**:

### 1. deploy-web

Deploys Expo web export to GitHub Pages.

```yaml
steps:
  - Checkout code
  - Setup Node.js 22 + pnpm
  - Install dependencies
  - Build Expo web: pnpm build:web
  - Deploy to GitHub Pages: actions/deploy-pages
```

**Output**: https://[username].github.io/cognitive-dissonance/

### 2. deploy-android

Builds Android release APK and uploads to GitHub Release.

```yaml
steps:
  - Checkout code
  - Setup Node.js 22 + pnpm
  - Install dependencies
  - Setup Java 17
  - Decode keystore from secret
  - Run Gradle: ./gradlew assembleRelease (android/)
  - Upload APK to GitHub Release (tag: v3.0.0)
```

**Output**: `app-release.apk` attached to GitHub Release

**Secrets required**: `ANDROID_KEYSTORE`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

### 3. deploy-ios

Triggers EAS Build for iOS preview profile.

```yaml
if: vars.EAS_PROJECT_ID != ''
steps:
  - Checkout code
  - Setup Node.js 22 + pnpm
  - Install dependencies
  - Setup Expo CLI
  - Run EAS Build: eas build --platform ios --profile preview --non-interactive
```

**Output**: iOS build uploaded to TestFlight

**Secrets required**: `EXPO_TOKEN`

**Variables required**: `EAS_PROJECT_ID`

## Automerge Workflow

**Trigger**: Pull requests with `automerge` label

**Behavior**: Automatically merges PR after CI passes

```yaml
needs: [ci-success]
if: contains(github.event.pull_request.labels.*.name, 'automerge')
steps:
  - Merge PR via GitHub API
```

**Note**: Dependabot PRs are no longer excluded from CI — all PRs run full test suite.

## Removed from v2.0

The following jobs were removed in the v3.0 migration:

- **Playwright E2E matrix** (17 profiles): Replaced by single Playwright web E2E job + Maestro mobile E2E
- **SonarCloud scan**: Replaced by Biome (single binary, zero plugin deps)
- **CodeQL JavaScript analysis**: Retained optionally, but Biome covers lint/format
- **Next.js build step**: Replaced by Expo web build
- **Next.js static export deploy**: Replaced by Expo web export deploy

## Secrets and Variables

### Repository Secrets

| Secret | Purpose | How to Generate |
|--------|---------|-----------------|
| `EXPO_TOKEN` | Expo account access token | `eas login` → `eas whoami --json` → copy `authenticationToken` |
| `ANDROID_KEYSTORE` | Base64-encoded Android keystore | `base64 -i my-release-key.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password | Set during keystore generation |
| `ANDROID_KEY_ALIAS` | Key alias | Set during keystore generation |
| `ANDROID_KEY_PASSWORD` | Key password | Set during keystore generation |

### Repository Variables

| Variable | Purpose | How to Set |
|----------|---------|------------|
| `EAS_PROJECT_ID` | Expo project ID | Copy from `app.json` `extra.eas.projectId` |

## Debugging CI Failures

### code-quality job fails

**Biome lint errors**:
```bash
# Run locally
pnpm lint

# Auto-fix
pnpm lint:fix
```

**TypeScript type errors**:
```bash
# Run locally
pnpm exec tsc --noEmit

# Common issues:
# - Missing @babylonjs/core subpath imports
# - Incorrect Miniplex API usage (world.with() not archetype())
# - Missing field declarations (Biome auto-fix removes them)
```

**Jest test failures**:
```bash
# Run locally
pnpm test

# Run specific test
pnpm test -- src/systems/__tests__/TensionSystem.test.ts

# Run with coverage
pnpm test:coverage
```

### web-build job fails

**Bundle size exceeds 5 MB**:
- Check for barrel imports from `@babylonjs/core` (use subpath imports only)
- Run bundle analyzer: `pnpm build:web` → check `dist/` size
- Remove unused dependencies

**Expo web build errors**:
```bash
# Run locally
pnpm build:web

# Clear Metro cache
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### android-build job fails

**Gradle build errors**:
```bash
# Run locally
cd android
./gradlew assembleDebug --stacktrace

# Clean build
./gradlew clean

# Kill Gradle daemon
./gradlew --stop
```

**SDK not found**:
- Set `ANDROID_HOME` environment variable
- Install Android SDK 34 via Android Studio

### web-e2e job fails

**Playwright test failures**:
```bash
# Run locally
pnpm test:e2e:web

# Run in headed mode (see browser)
pnpm exec playwright test --headed

# Debug specific test
pnpm exec playwright test e2e/web/smoke.spec.ts --debug
```

**Expo web dev server not starting**:
- Check port 8081 is not in use
- Verify `pnpm web` works locally

### mobile-e2e job fails

**Maestro flow failures**:
```bash
# Run locally (requires Android emulator)
maestro test .maestro/app-launch.yaml

# Debug with Maestro Studio
maestro studio
```

**Android emulator issues**:
- Verify emulator starts: `emulator -avd Pixel_5_API_34`
- Check APK installs: `adb install android/app/build/outputs/apk/debug/app-debug.apk`

### deploy-web job fails

**GitHub Pages deployment errors**:
- Verify `dist/` directory exists after build
- Check GitHub Pages is enabled in repository settings
- Verify branch is `main` (not `master`)

### deploy-android job fails

**Keystore decoding errors**:
- Verify `ANDROID_KEYSTORE` secret is base64-encoded
- Test locally: `echo $ANDROID_KEYSTORE | base64 -d > test.keystore`

**Signing errors**:
- Verify all 4 Android secrets are set correctly
- Check keystore password matches `ANDROID_KEYSTORE_PASSWORD`

### deploy-ios job fails

**EAS Build errors**:
- Verify `EXPO_TOKEN` is valid: `eas whoami`
- Check `EAS_PROJECT_ID` matches `app.json`
- Verify Apple Developer account is configured: `eas credentials`

## Performance Metrics

### CI Job Durations (Typical)

| Job | Duration |
|-----|----------|
| code-quality | ~2 min |
| web-build | ~3 min |
| android-build | ~5 min |
| web-e2e | ~2 min |
| mobile-e2e | ~8 min (includes emulator boot) |
| **Total CI** | ~12 min (parallel execution) |

### CD Job Durations (Typical)

| Job | Duration |
|-----|----------|
| deploy-web | ~3 min |
| deploy-android | ~6 min |
| deploy-ios | ~15 min (EAS Build cloud) |

## References

- [Architecture](./ARCHITECTURE.md) — System architecture
- [Deployment](./DEPLOYMENT.md) — Deployment procedures
- [Testing](./TESTING.md) — Test infrastructure
