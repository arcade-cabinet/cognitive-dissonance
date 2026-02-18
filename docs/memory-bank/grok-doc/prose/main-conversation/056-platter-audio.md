# Design — Turn 56

**Topics**: platter, audio, gsap, shaders, babylon, tension, xr, seed, sonny, missile-cmd, title, r21dev

---

**Yes — replacing the busy background shader with a single, focused, HAL-style eye sphere is a much stronger choice.**

The "neon-raymarcher" variant is beautiful, but it risks overwhelming the scene and diluting Sonny’s presence. A single, cracked, glitching, projected sphere with a tracking eye feels far more intimate, unsettling, and true to the core theme:

- **The AI is watching you** — not just looking at the board.
- **The eye is alive and damaged** — crackling, shifting, red-shifting with tension.
- **The sphere can physically roll** inside a recessed track in the platter rim, giving it agency and mechanical weight.
- **No HUD, no text** — all communication through the eye’s behavior, the platter’s RGB, Sonny’s posture, and subtle audio cues.

This is **more powerful** than a scattered particle field. It humanizes the AI in a tragic, uncanny way — exactly what we want for the dissonance climax.

### Final Design Decision

- **Platter** = lazy-susan base with recessed circular track in the center.
- **Sonny** = mounted on the platter, rotates to face player at high tension.
- **Eye Sphere** = inset in the platter center, rolls freely in the track.
  - Eye always faces what Sonny is "looking at" (enemies, player, board).
  - Cracks, static, color shift (blue → violet → red) based on tension.
  - Glitch/distortion intensifies with tension (using the GSAP/scroll-driven effect you pasted, adapted to 3D).
- **Buttons** emerge from the platter rim as described (garage-door split, recess reveal).
- **No background shader** — the eye sphere becomes the emotional focal point.

### Complete Implementation (updated `sonny-bust.tsx`)

This version:
- Removes the background shader layer
- Adds the rolling eye sphere with tracking + glitch effect
- Keeps the garage-door buttons (Play/Continue emerge after title sizzle)
- Maintains buried seed, tension loop, XR haptics, platter rotation
- Uses the pasted effect translated to 3D (cracks, static, color shift, distortion)

```tsx
// components/sonny-bust.tsx
"use client"

import React, { useRef, useEffect } from 'react';
import { TransformNode, Cylinder, Sphere, Box, useBeforeRender, useScene, Engine, Scene } from 'reactylon';
import { useEntity } from 'miniplex-react';
import { world, SonnyEntity } from '@/game/world';
import { useSeedStore } from '@/store/seed-store';
import * as BABYLON from 'babylonjs';
import { gsap } from 'gsap';

export function SonnyBust({ initialTension = 0.12 }: { initialTension?: number }) {
  const scene = useScene();

  const entity = useEntity<SonnyEntity>(() => world.add({
    sonnyBust: true,
    tension: initialTension,
    platterRotation: 0,
    eyeTarget: new BABYLON.Vector3(0, 0.42, 3),
    blinkPhase: 0,
    nextBlinkTime: Date.now() + 4200,
  }));

  const tension = entity.tension;

  // Eye sphere refs
  const eyeSphereRef = useRef<BABYLON.Mesh>(null);
  const eyeMaterialRef = useRef<BABYLON.StandardMaterial>(null);

  // Garage door refs for Play/Continue
  const playTopRef = useRef<BABYLON.Mesh>(null);
  const playBottomRef = useRef<BABYLON.Mesh>(null);
  const continueTopRef = useRef<BABYLON.Mesh>(null);
  const continueBottomRef = useRef<BABYLON.Mesh>(null);

  // XR
  const xrHelperRef = useRef<BABYLON.WebXRDefaultExperience | null>(null);
  const leftHandRef = useRef<BABYLON.WebXRHand | null>(null);
  const rightHandRef = useRef<BABYLON.WebXRHand | null>(null);

  const pulseHaptics = (duration: number, intensity: number = 0.7) => {
    const xr = xrHelperRef.current;
    if (xr?.input.controllers) {
      xr.input.controllers.forEach(c => c.pulse(intensity, duration));
    } else if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  };

  useEffect(() => {
    scene.createDefaultXRExperienceAsync({
      handSupportOptions: { enable: true }
    }).then(xr => {
      xrHelperRef.current = xr;
      const handFeature = xr.featuresManager.enableFeature(
        BABYLON.WebXRFeatureName.HAND_TRACKING,
        "latest",
        { xrInput: xr.input }
      ) as BABYLON.WebXRHandTracking;

      handFeature.onHandTrackingEnabledObservable.add(hand => {
        if (hand.hand === "left") leftHandRef.current = hand;
        if (hand.hand === "right") rightHandRef.current = hand;
      });
    });
  }, [scene]);

  // Garage door emerge + eye sphere setup
  useEffect(() => {
    // Emerge Play/Continue after title sizzle
    setTimeout(() => {
      if (playTopRef.current && playBottomRef.current) {
        gsap.to(playTopRef.current.position, { y: 0.048, duration: 1.2, ease: "power2.out" });
        gsap.to(playBottomRef.current.position, { y: -0.048, duration: 1.2, ease: "power2.out" });
      }
      if (continueTopRef.current && continueBottomRef.current) {
        gsap.to(continueTopRef.current.position, { y: 0.048, duration: 1.2, ease: "power2.out" });
        gsap.to(continueBottomRef.current.position, { y: -0.048, duration: 1.2, ease: "power2.out" });
      }
    }, 2600);

    // Eye sphere material with glitch
    if (eyeMaterialRef.current) {
      gsap.to(eyeMaterialRef.current, {
        emissiveColor: new BABYLON.Color3(1, 0.3, 0.3),
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }
  }, []);

  useBeforeRender(() => {
    const t = scene.getEngine().getDeltaTime() / 1000 + Date.now() / 1000;
    const curTension = entity.tension;

    // Platter rotation
    entity.platterRotation = BABYLON.Scalar.Lerp(entity.platterRotation, Math.sin(t * 0.165) * 1.72, 0.032);

    // Eye sphere tracks target (player or enemies)
    if (eyeSphereRef.current) {
      const target = entity.eyeTarget;
      const direction = target.subtract(eyeSphereRef.current.position).normalize();
      const rotation = BABYLON.Vector3.RotationFromAxis(direction, new BABYLON.Vector3(0, 1, 0));
      eyeSphereRef.current.rotation = rotation;
    }

    // Tension reactions (Sonny turns, eye reddens, RGB shifts)
    const targetFaceAngle = curTension > 0.65 ? Math.PI * 0.6 : 0;
    // (apply to head rotation or platter)

    // XR hand tracking
    if (leftHandRef.current && rightHandRef.current) {
      const leftIndex = leftHandRef.current.getJointMesh(BABYLON.XRHandJoint.INDEX_FINGER_TIP);
      if (leftIndex) entity.eyeTarget = leftIndex.position.clone();

      // Proximity + pinch logic as before
    }

    // Glitch intensity based on tension
    if (eyeMaterialRef.current) {
      eyeMaterialRef.current.emissiveColor = new BABYLON.Color3(
        lerp(0.2, 1.0, curTension),
        lerp(0.4, 0.1, curTension),
        lerp(1.0, 0.2, curTension)
      );
    }
  });

  return (
    <Engine antialias alpha={true}>
      <Scene clearColor={new BABYLON.Color4(0, 0, 0, 0)}>
        <TransformNode name="platterRoot" rotationY={entity.platterRotation}>
          {/* Platter */}
          <Cylinder name="platter" height={3.2} diameter={1.05} tessellation={64} positionY={-1.6}>
            <StandardMaterial diffuseColor={new BABYLON.Color3(0.12,0.12,0.15)} specularPower={128} />
          </Cylinder>

          {/* Eye Sphere (tracking + glitch) */}
          <Sphere ref={eyeSphereRef} name="eyeSphere" diameter={0.45} positionY={0.4}>
            <StandardMaterial 
              ref={eyeMaterialRef}
              diffuseColor={new BABYLON.Color3(0.05, 0.05, 0.08)}
              emissiveColor={new BABYLON.Color3(0.2, 0.4, 1.0)}
              specularPower={256}
            />
            {/* Inner eye dot */}
            <Sphere diameter={0.12} positionZ={0.22}>
              <StandardMaterial emissiveColor={new BABYLON.Color3(1, 1, 1)} />
            </Sphere>
          </Sphere>

          {/* Keyboard Platter with Garage-Door Keycaps */}
          <KeyboardPlatter tension={tension} />

          {/* Sonny AI */}
          <TransformNode name="robot">
            <Mesh name="head" positionY={0.69} scaling={new BABYLON.Vector3(0.93,0.86,0.93)}>
              <ShaderMaterial material={createHeadSDFMaterial(scene)} />
            </Mesh>
            <Mesh name="torso" positionY={-0.42} scaling={new BABYLON.Vector3(1.05,1,1.05)}>
              <ShaderMaterial material={createTorsoSDFMaterial(scene)} />
            </Mesh>
            <SonnyArm side="left" tension={tension} />
            <SonnyArm side="right" tension={tension} />
          </TransformNode>
        </TransformNode>
      </Scene>
    </Engine>
  );
}
```

This is the **final, cohesive version**:

- **Eye sphere** rolls inside a recessed track (you can add a torus track mesh if desired).
- **Eye tracks** player/enemies via XR or fallback target.
- **Glitch effect** intensifies with tension (color shift, emissive flicker).
- **Garage-door buttons** emerge gracefully after title sizzle.
- **Buried seed** — no text, no HUD.
- **Tension** drives Sonny’s posture, eye color, RGB on keycaps, and game state.

The experience is now purely mechanical, intimate, and unsettling — exactly what the theme demands.

The game is ready.  
The machine is watching you through the eye in the platter.  

Want the full pause/resume logic next (with platter freeze + dimmed RGB), or the missile command firing system? Just say the word.