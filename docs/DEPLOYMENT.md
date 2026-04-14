---
title: Deployment
updated: 2026-04-13
status: current
domain: ops
---

# Deployment — Cognitive Dissonance

## Development

```bash
pnpm install
pnpm dev          # Turbopack dev server (440ms startup)
# Open http://localhost:3000
```

## Production Build

```bash
pnpm build        # Next.js production build
pnpm start        # Production server on port 3000
```

## GitHub Pages (Primary Deploy Target)

The CD pipeline auto-deploys to GitHub Pages on every push to `main`:

1. Builds with `GITHUB_PAGES=true` (triggers `output: 'export'` in `next.config.ts`)
2. Static export to `out/` directory
3. Deploys via `actions/deploy-pages`

URL: https://arcade-cabinet.github.io/cognitive-dissonance/

## Other Hosting

Next.js 16 App Router can also deploy to:

- **Vercel**: Zero-config, push to GitHub
- **Any static host**: Set `GITHUB_PAGES=true` for static export, host `out/` on any CDN
- **Docker**: Standard Next.js Dockerfile

## Environment Requirements

- Node.js 22+ (see `.nvmrc`)
- pnpm 10.26+ (see `packageManager` in `package.json`)
- WebGL-capable browser (Chrome, Firefox, Edge, Safari 17+)
- WebXR-capable device for hand tracking (Quest, Vision Pro) — stub only

## Android Debug APK

The CD pipeline also builds an Android debug APK via Gradle:

- JDK 17 (Temurin)
- Android SDK (via `android-actions/setup-android`)
- `./gradlew assembleDebug` in `android/` directory
- APK uploaded as workflow artifact (30-day retention)

Note: The Android APK is a React Native shell — game components are not yet wired to the native entry point.

## CSP Notes

The game is 100% CSP-safe:

- No eval or dynamic code generation
- All shaders are static string literals in `BABYLON.Effect.ShadersStore`
- No external font loading (system monospace only)
- No external image/texture loading (all procedural)
