---
title: Project State
updated: 2026-04-13
status: current
domain: context
---

# State

Current state of the project — what's done, what's next, what's actively in
flight. Updated when a phase closes or a new effort starts, not every commit.

## What's on main

- **v3.0 ECS architecture** (Miniplex world, system modules, declarative
  entity queries) — landed in commit `3efeaee`.
- **25 dream handlers** for the pattern-stabilizer subsystem — each handler
  is a specialized shader effect keyed to a seeded dream archetype.
- **Visual design overhaul** — fragile glass sphere, heavy industrial platter,
  three-point lighting, celestial nebula shader, degrading coherence ring.
- **Comprehensive tests:** 60 unit tests (Vitest) + 48 browser component
  tests (Vitest browser mode, real WebGL via Playwright) + 17 E2E smoke tests
  (Playwright headed via xvfb).
- **Capacitor 8.3 iOS + Android** — not React Native. The web build is wrapped
  in a WebView; native plugins (device, haptics, status bar, splash screen,
  screen orientation) bridge to platform APIs.
- **Responsive scaling** — phone portrait camera reframing, tablet 1.5x render
  scale cap, desktop native retina. Handled in `src/lib/device.ts` with
  Capacitor `@capacitor/device` detection + browser fallback.
- **CI:** Biome lint + TypeScript typecheck + Vitest unit + Vitest browser +
  Playwright E2E. CodeQL on JS/TS. SonarCloud coverage analysis. All jobs
  feed a single `CI Success` job that branch protection requires.
- **CD:** Push to `main` → GitHub Pages (web) + Android debug APK + iOS
  unsigned simulator build. All three artifacts are built for every `main`
  push via `.github/workflows/cd.yml`.
- **Branch protection** on `main` requires `CI Success` to merge. Dependabot
  auto-merge respects this gate (via `gh pr merge --auto`).

## Active work

- **PR #201** (feat/vitest-browser-component-tests) — comprehensive test
  infrastructure pivot + Capacitor wiring + production launch readiness
  sweep. Consolidates all post-v3 polish in one reviewable change against
  `main`. Landing once CI passes and PR feedback is resolved.

## What's deliberately out of scope

- **No React Native.** The previous scaffolding (`native/App.tsx`) was a
  leftover from an aborted RN experiment and was deleted. If native needs
  diverge enough from web to justify RN, that's a separate v4.0 discussion.
- **No Firebase / remote telemetry.** Game state is local-only. The
  `google-services.json` gate in `android/app/build.gradle` is a no-op until
  that file appears, and nothing in the repo provides it.
- **No multiplayer / networking.** Single-player, seeded, deterministic.
- **No in-game settings screen.** Reduced motion, audio volume, and input
  scheme are driven by OS prefs and hardware (no manual override UI).

## Next

Roughly in priority order. Not a commitment — the user picks.

1. **Visual polish pass** on diegetic-gui (coherence ring) — subtle fracture
   lines when coherence < 30%, not yet implemented.
2. **Audio pass** on AudioEngineSystem — the adaptive score currently
   crossfades three stems; the user has asked for a fourth "collapse" stem
   layered on top during gameover.
3. **Android signing config** — `docs/ANDROID_SIGNING.md` describes the
   manual keystore steps; automating via CD secrets would let us publish
   signed release APKs for Play Store rollout.
4. **iOS TestFlight** — requires Apple Developer account + signing
   certificate. Out of scope for solo-development phase.

## Known issues

- SonarCloud shows failures on the branch even when code is clean — it's
  analysis-infra flakiness (rate-limited token), not a code issue.
  Non-blocking; `CI Success` does not depend on it.
- CodeQL occasionally skips when the PR base branch hasn't been analyzed
  yet. Self-resolves on the next push.
