# Deployment — Cognitive Dissonance v3.0

## Overview

Cognitive Dissonance v3.0 is deployed across three platforms:
- **Web**: Expo web export → GitHub Pages
- **Android**: Gradle release APK → GitHub Release
- **iOS**: EAS Build → TestFlight

All deployments are automated via GitHub Actions CD pipeline.

## Prerequisites

### All Platforms
- Node.js >= 22.0.0
- pnpm 10.26+
- Expo CLI (installed via `npx expo`)

### Android
- Android Studio with SDK 34
- Gradle 8.x (bundled with project)
- Java 17+

### iOS
- macOS with Xcode 15+
- iOS SDK 16.0+
- Apple Developer account (for TestFlight)

### EAS Build (iOS)
- Expo account
- `EXPO_TOKEN` secret configured in GitHub repository settings
- `EAS_PROJECT_ID` variable configured in GitHub repository settings

## Local Development Builds

### Web

```bash
# Start Expo web dev server
pnpm web

# Production build
pnpm build:web

# Preview production build locally
npx serve dist
```

Output: `dist/` directory with static HTML/JS/CSS

### Android

```bash
# Start Metro dev server + Android emulator
pnpm android

# Debug APK build
cd android
./gradlew assembleDebug

# Release APK build (requires signing config)
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk` or `android/app/build/outputs/apk/release/app-release.apk`

### iOS

```bash
# Start Metro dev server + iOS simulator
pnpm ios

# Xcode build (requires macOS)
cd ios
xcodebuild -workspace CognitiveDissonance.xcworkspace -scheme CognitiveDissonance -configuration Debug
```

Output: `.app` bundle in `ios/build/`

## Automated Deployments (GitHub Actions)

### Web Deployment (GitHub Pages)

**Trigger**: Push to `main` branch

**Workflow**: `.github/workflows/cd.yml` → `deploy-web` job

**Steps**:
1. Checkout code
2. Setup Node.js + pnpm
3. Install dependencies
4. Run `pnpm build:web` (Expo web export to `dist/`)
5. Deploy `dist/` to GitHub Pages via `actions/deploy-pages`

**URL**: https://[username].github.io/cognitive-dissonance/

**Bundle size check**: CI fails if gzipped bundle > 5 MB

### Android Deployment (GitHub Release)

**Trigger**: Push to `main` branch

**Workflow**: `.github/workflows/cd.yml` → `deploy-android` job

**Steps**:
1. Checkout code
2. Setup Node.js + pnpm
3. Install dependencies
4. Setup Java 17
5. Run `./gradlew assembleRelease` in `android/`
6. Upload `app-release.apk` to GitHub Release with tag `v3.0.0`

**Artifact**: `app-release.apk` attached to GitHub Release

**Signing**: Requires `ANDROID_KEYSTORE`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` secrets configured in repository settings

### iOS Deployment (EAS Build → TestFlight)

**Trigger**: Push to `main` branch (conditional on `EAS_PROJECT_ID` variable)

**Workflow**: `.github/workflows/cd.yml` → `deploy-ios` job

**Steps**:
1. Checkout code
2. Setup Node.js + pnpm
3. Install dependencies
4. Setup Expo CLI
5. Run `eas build --platform ios --profile preview --non-interactive`
6. EAS Build uploads to TestFlight automatically

**Output**: iOS build available in TestFlight for internal testing

**Requirements**:
- `EXPO_TOKEN` secret (Expo account access token)
- `EAS_PROJECT_ID` variable (Expo project ID from `app.json`)
- Apple Developer account with App Store Connect API key configured in Expo

## EAS Build Profiles

Defined in `eas.json`:

### Development Profile
```json
{
  "development": {
    "developmentClient": true,
    "distribution": "internal"
  }
}
```
- Includes Expo dev-client for over-the-air updates
- Internal distribution (no App Store submission)
- Use for local testing on physical devices

### Preview Profile
```json
{
  "preview": {
    "distribution": "internal"
  }
}
```
- Production-like build without dev-client
- Internal distribution (TestFlight for iOS, direct APK for Android)
- Use for QA and stakeholder testing

### Production Profile
```json
{
  "production": {
    "autoIncrement": true
  }
}
```
- Full production build
- Auto-increments build number
- Use for App Store / Play Store submission

## Manual EAS Builds

### iOS

```bash
# Development build
eas build --platform ios --profile development

# Preview build (TestFlight)
eas build --platform ios --profile preview

# Production build (App Store)
eas build --platform ios --profile production
```

### Android

```bash
# Development build
eas build --platform android --profile development

# Preview build (internal testing)
eas build --platform android --profile preview

# Production build (Play Store)
eas build --platform android --profile production
```

### Check Build Status

```bash
# List recent builds
eas build:list

# View specific build
eas build:view [BUILD_ID]
```

## Environment Variables

### Required for CI/CD

| Variable | Purpose | Where to Set |
|----------|---------|--------------|
| `EXPO_TOKEN` | Expo account access token | GitHub repository secrets |
| `EAS_PROJECT_ID` | Expo project ID | GitHub repository variables |
| `ANDROID_KEYSTORE` | Base64-encoded Android keystore | GitHub repository secrets |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password | GitHub repository secrets |
| `ANDROID_KEY_ALIAS` | Key alias | GitHub repository secrets |
| `ANDROID_KEY_PASSWORD` | Key password | GitHub repository secrets |

### Optional

| Variable | Purpose | Default |
|----------|---------|---------|
| `NODE_ENV` | Node environment | `production` |
| `EXPO_PUBLIC_API_URL` | API base URL (if backend exists) | — |

## Rollback Procedures

### Web (GitHub Pages)

1. Revert commit on `main` branch
2. GitHub Actions will automatically redeploy previous version

### Android (GitHub Release)

1. Download previous `app-release.apk` from GitHub Releases
2. Distribute to users via direct download or internal distribution channel

### iOS (TestFlight)

1. In App Store Connect, select previous build in TestFlight
2. Promote previous build to testers

## Monitoring

### Web

- **Bundle size**: Monitored in CI (fails if > 5 MB gzipped)
- **Runtime errors**: Browser console (no external monitoring configured)

### Native

- **Crash reporting**: Not configured (future: Sentry or Expo Application Services)
- **Performance**: Device-tier adaptive quality system (automatic FPS-based downgrade)

## Troubleshooting

### Web build fails with "Module not found"

- Verify all imports use @babylonjs/core subpath imports (not barrel imports)
- Run `pnpm install` to ensure dependencies are up to date
- Check Metro cache: `rm -rf node_modules/.cache`

### Android build fails with "SDK not found"

- Set `ANDROID_HOME` environment variable to Android SDK path
- Run `./gradlew --stop` to kill Gradle daemon
- Clean build: `./gradlew clean`

### iOS build fails with "Provisioning profile not found"

- Verify Apple Developer account is configured in Expo
- Run `eas credentials` to manage certificates and provisioning profiles
- Check `app.json` bundle identifier matches App Store Connect

### EAS Build fails with "Expo token invalid"

- Regenerate `EXPO_TOKEN`: `eas login` → `eas whoami --json` → copy `authenticationToken`
- Update GitHub repository secret

## Production Checklist

Before deploying to production:

- [ ] All tests passing (Jest unit tests, Playwright web E2E, Maestro mobile E2E)
- [ ] Bundle size < 5 MB gzipped (verified in CI)
- [ ] Biome lint passing (0 errors, 0 warnings)
- [ ] TypeScript type-check passing (`tsc --noEmit`)
- [ ] Manual QA on target devices (iPhone 12+, Snapdragon 888+)
- [ ] AR/MR modes tested on physical devices (glasses + phone)
- [ ] Audio tested on native (expo-audio bridge working)
- [ ] Haptics tested on native (expo-haptics working)
- [ ] Version number incremented in `app.json` and `package.json`
- [ ] CHANGELOG.md updated with release notes
- [ ] GitHub Release created with tag `vX.Y.Z`

## References

- [Architecture](./ARCHITECTURE.md) — System architecture and design decisions
- [GitHub Actions](./GITHUB_ACTIONS.md) — CI/CD pipeline details
- [Testing](./TESTING.md) — Test infrastructure and strategy
