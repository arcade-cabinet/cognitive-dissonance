# XR and Haptics - Cognitive Dissonance

**Dual AR/MR Architecture**

Two distinct play modes managed by `ARSessionManager`, switchable via the diegetic MODE_LEVER on the platter rim:

1. **Glasses Room-Scale (MR)**
   - Platter anchored to real-world horizontal plane via `WebXRAnchor`.
   - 26-joint hand tracking on each hand via `XRManager`.
   - Hand entities created as Miniplex `Hand_Archetype` with gripStrength and pinchStrength per frame.
   - `HandInteractionSystem` maps 26 joints to keycap, lever, and sphere interactions.
   - Full spatial audio aligned with real-world anchor position.

2. **Phone Camera Projection (AR)**
   - Tap-to-place via WebXR hit-test.
   - Touch controls on projected geometry via `PhoneProjectionTouchSystem`.
   - Pointer observers + raycast pick routing.
   - Simplified haptics (phone vibration motor).

**MODE_LEVER**
- Diegetic lever on platter rim switches between modes.
- GSAP resistance animation (`back.out(1.7)` ease) for satisfying mechanical feel.
- Gear-grind audio feedback via ImmersionAudioBridge.
- Lever position 0.0 (down/phone mode) to 1.0 (up/glasses mode).

**WebXR Hand Tracking**
- `WebXRHandTracking` feature from `@babylonjs/core/XR/features/WebXRHandTracking`.
- Creates `Hand_Archetype` Miniplex entities via `world.add()`.
- Per-frame grip and pinch calculation from joint data.
- Joint tracking for 26 joints per hand.
- Keycap interaction via proximity + pinch threshold.

**Haptics**

Cross-platform haptic feedback synced to tension and game events:

- **Native (iOS/Android)**: `expo-haptics` — impact (Heavy/Medium/Light), notification, and selection feedback. Dynamic import for tree-shaking.
- **Web**: `navigator.vibrate()` — pattern-based vibration.
- **Audio Haptics (all platforms)**: Tone.js brown noise rumble at low frequencies (-60dB → -18dB with tension) for sub-bass "feel".

**Haptic Events (via MechanicalHaptics)**
- `triggerContact()`: Keycap press / tendril retraction — light impact.
- `triggerStabilization()`: Successful pattern match — medium impact.
- `triggerCorruption()`: Pattern failure / enemy spawn — heavy notification.
- `triggerShatter()`: Sphere break — long heavy vibration pattern.
- All intensities scale with tension level.

**Key Files**
- `src/xr/XRManager.ts` — WebXR session + hand tracking → Miniplex entities
- `src/xr/ARSessionManager.ts` — Dual AR/MR mode management
- `src/xr/MechanicalHaptics.ts` — Cross-platform haptics (expo + web + Tone.js)
- `src/systems/HandInteractionSystem.ts` — 26-joint → keycap/lever/sphere mapping
- `src/systems/PhoneProjectionTouchSystem.ts` — Touch controls for phone AR mode

**AR Anchoring & Placement**
- `WebXRAnchor` + `WebXRHitTest` for plane detection.
- Platter "sinks" with dust particles + gear settling on placement (GSAP sequence).
- Sphere always parented to platter track (mechanical constraint).
- Supports shared dreams multiplayer anchor sync (future).

**Phone Projection Touch System**
- Screen pointer events raycast from camera to projected platter rim/keycaps/lever.
- Touch contact triggers `PatternStabilizationSystem.holdKey()` or `MechanicalAnimationSystem.pullLever()`.
- Visually identical mechanical response as hand mode.
- Managed by `PhoneProjectionTouchSystem` with pointer observers + raycast pick routing.

**Device Support**
- AR Glasses: Meta Quest 3, Apple Vision Pro (via WebXR)
- AR Phone: iPhone 12+ (ARKit), Android (ARCore) — with `expo-camera` integration
- Web: Any browser with `navigator.xr` support
- Fallback: Flat-screen mode with keyboard + mouse (no AR)
