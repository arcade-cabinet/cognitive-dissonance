# Cognitive Dissonance — Native (Android / iOS)

React Native entry point for the game, using Reactylon's `NativeEngine`.

## Structure

- `App.tsx` — Main entry point for Metro bundler
- `../android/` — Android scaffold (Gradle, Kotlin)
- `../ios/` — iOS scaffold (Xcode, Podfile)

## Setup

1. Install dependencies: `pnpm install`
2. Install pods (iOS): `cd ../ios && pod install`
3. Run:
   - Android: `npx react-native run-android`
   - iOS: `npx react-native run-ios`

## Notes

- This entry point is **not compiled by Next.js / Turbopack**.
- Game components in `src/components/` are shared between web and native.
- The `NativeEngine` from `reactylon/native` replaces the web `Engine`.
- WebXR features are not available on native — use ARKit/ARCore instead.
