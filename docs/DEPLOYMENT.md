# Deployment Guide

This guide covers building and deploying Cognitive Dissonance to various platforms.

## Table of Contents

- [Web Deployment](#web-deployment)
- [Android Deployment](#android-deployment)
- [iOS Deployment](#ios-deployment)
- [Release Process](#release-process)

## Web Deployment

### Static Hosting

The game is built as a static Single Page Application (SPA) and can be hosted anywhere that serves static files.

#### Build for Production

```bash
pnpm build
```

This creates an optimized production build in `dist/`:
- Minified JavaScript/CSS
- Tree-shaken dependencies
- ~175KB gzipped total bundle size

#### Deploy to GitHub Pages

```bash
# Build the project
pnpm build

# Deploy to gh-pages branch (if configured)
pnpm run deploy
```

Or configure GitHub Actions to automatically deploy on push to main.

#### Deploy to Other Platforms

The `dist/` folder can be deployed to:
- **Vercel**: Connect repo, auto-deploy on push
- **Netlify**: Drag & drop `dist/` folder or connect repo
- **Cloudflare Pages**: Connect repo, build command: `pnpm build`
- **AWS S3 + CloudFront**: Upload `dist/` to S3, configure CloudFront
- **Firebase Hosting**: `firebase deploy --only hosting`

### PWA Features

The app includes PWA capabilities:
- Service worker for offline play
- Installable on mobile devices
- App manifest with icons

## Android Deployment

### Prerequisites

- Node.js 20+
- Java 17+
- Android SDK
- Capacitor CLI

### Building APKs

#### For Development (Local)

```bash
# Build web app + sync to Android
pnpm build:mobile

# Open in Android Studio
pnpm android

# Or build from command line
cd android
./gradlew assembleDebug
```

Debug APK will be in `android/app/build/outputs/apk/debug/`

#### For Release (Automated via GitHub Actions)

The release workflow automatically builds signed APKs for all architectures when you create a release.

**Setup signing configuration first** - See [Android Signing Guide](./ANDROID_SIGNING.md) for details.

1. Configure GitHub secrets (keystore, passwords)
2. Push to main with a conventional commit
3. Release-please creates a release PR
4. Merge the PR
5. GitHub Actions builds and uploads signed APKs:
   - `psyduck-panic-{version}-arm64-v8a.apk` (64-bit ARM, modern devices)
   - `psyduck-panic-{version}-armeabi-v7a.apk` (32-bit ARM, older devices)
   - `psyduck-panic-{version}-x86.apk` (Intel 32-bit, emulators)
   - `psyduck-panic-{version}-x86_64.apk` (Intel 64-bit, emulators)
   - `psyduck-panic-{version}-universal.apk` (all architectures, larger file)

Without signing configuration, unsigned debug APKs are built instead (for testing only).

### Google Play Store Submission

1. Ensure signed APKs are configured (see [ANDROID_SIGNING.md](./ANDROID_SIGNING.md))
2. Create a release on GitHub
3. Download signed APK from GitHub Releases
4. Go to [Google Play Console](https://play.google.com/console)
5. Create a new app (or select existing)
6. Upload the signed APK to internal testing track
7. Test thoroughly
8. Promote to production when ready

**Required assets for Play Store:**
- App icon (512×512 PNG)
- Feature graphic (1024×500 PNG)
- Screenshots (at least 2 per device type)
- Privacy policy URL
- App description

## iOS Deployment

### Prerequisites

- macOS with Xcode 14+
- Apple Developer account ($99/year)
- CocoaPods

### Building for iOS

```bash
# Build web app + sync to iOS
pnpm build:mobile

# Open in Xcode
pnpm ios
```

### Code Signing

1. Open project in Xcode
2. Select target → Signing & Capabilities
3. Select your team
4. Xcode auto-manages provisioning profiles

### TestFlight Distribution

1. In Xcode, select "Any iOS Device (arm64)"
2. Product → Archive
3. Distribute App → App Store Connect
4. Upload to TestFlight
5. Add testers via App Store Connect
6. Submit for TestFlight review

### App Store Submission

1. Upload build via Xcode or TestFlight
2. Go to [App Store Connect](https://appstoreconnect.apple.com)
3. Create app listing
4. Add screenshots, description, keywords
5. Select build
6. Submit for review

**Required assets for App Store:**
- App icon (1024×1024 PNG, no transparency)
- Screenshots (multiple device sizes)
- Privacy policy URL
- App Store description

## Release Process

### Semantic Versioning

The project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning:

- `feat:` → Minor version bump (1.0.0 → 1.1.0)
- `fix:` → Patch version bump (1.0.0 → 1.0.1)
- `feat!:` or `BREAKING CHANGE:` → Major version bump (1.0.0 → 2.0.0)

### Release Workflow

1. **Develop and commit**:
   ```bash
   git commit -m "feat: add new enemy type"
   git commit -m "fix: character animation glitch"
   git push origin main
   ```

2. **release-please creates PR**:
   - Analyzes commits since last release
   - Determines version bump
   - Updates CHANGELOG.md
   - Creates release PR

3. **Review and merge release PR**:
   - Check CHANGELOG accuracy
   - Verify version number
   - Merge when ready

4. **Automated release**:
   - Creates GitHub release with tag
   - Builds Android APKs (all architectures)
   - Uploads APKs to release assets
   - Publishes release notes

5. **Manual distribution**:
   - Download APKs from GitHub Releases
   - Submit to Play Store / App Store
   - Announce release

### Emergency Hotfix

For critical bugs:

```bash
# Create fix
git commit -m "fix!: critical security vulnerability"
git push origin main

# Manually trigger release if needed
gh workflow run release.yml
```

## Build Optimization

### Bundle Size Analysis

```bash
pnpm build

# Analyze bundle
pnpm run analyze
```

Current bundle size: ~556KB uncompressed, ~175KB gzipped

### Performance Optimization

- Code splitting: Dynamic imports for routes
- Tree shaking: Unused code eliminated
- Minification: Terser minifies all JS
- Compression: Enable gzip/brotli on server
- Asset optimization: Images compressed, fonts subset

### Capacitor Optimization

- Native plugins loaded on demand
- WebView cache configured
- Splash screen optimized
- App bundle signing configured

## Monitoring

### Web Analytics

Add analytics to track:
- Page views
- Game sessions
- Error tracking
- Performance metrics

Recommended tools:
- Google Analytics
- Plausible Analytics
- Sentry (error tracking)

### Mobile Analytics

For native apps:
- Firebase Analytics
- Crashlytics (crash reporting)
- App Store / Play Store metrics

## Troubleshooting

### Build Fails

```bash
# Clear all caches
rm -rf node_modules dist android ios .cache
pnpm install
pnpm build
```

### Capacitor Sync Fails

```bash
# Reset Capacitor
rm -rf android ios
pnpm cap add android
pnpm cap add ios
pnpm cap sync
```

### Android Signing Issues

See [Android Signing Guide](./ANDROID_SIGNING.md) for detailed troubleshooting.

### iOS Code Signing Issues

1. Open Xcode
2. Preferences → Accounts → Download Manual Profiles
3. Project → Signing & Capabilities → Clean Build Folder
4. Try archive again

## CI/CD Configuration

### GitHub Actions Workflows

- **ci.yml**: Runs on PRs (lint, test, build)
- **release.yml**: Runs on main (release-please + APK builds)

### Environment Variables

Set in GitHub repository settings → Secrets:

- `KEYSTORE_BASE64`: Base64-encoded Android keystore
- `KEYSTORE_PASSWORD`: Keystore password
- `KEY_ALIAS`: Key alias
- `KEY_PASSWORD`: Key password

### Branch Protection

Recommended settings:
- Require PR reviews
- Require status checks (CI)
- Require up-to-date branches
- No force push to main

## References

- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- [Capacitor Deployment](https://capacitorjs.com/docs/deploying)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Android App Signing](./ANDROID_SIGNING.md)
- [Conventional Commits](https://www.conventionalcommits.org/)
