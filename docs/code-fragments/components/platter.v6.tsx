// components/platter.tsx
"use client"

import React, { useRef, useEffect } from 'react';
import { TransformNode, Cylinder, Box, ParticleSystem, useBeforeRender, useScene } from 'reactylon';
import * as BABYLON from 'babylonjs';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

// Advanced mechanical eases
CustomEase.create("heavyStart", "M0,0 C0.05,0 0.18,0.12 0.35,0.65 C0.52,0.92 0.72,1 1,1");
CustomEase.create("mechanicalSettle", "M0,0 C0.12,0 0.28,0.65 0.45,0.85 C0.62,1.05 0.78,0.98 1,1");
CustomEase.create("gearMicro", "M0,0 C0.2,0.4 0.4,0.6 0.6,0.4 C0.8,0.2 1,1 1,1");

export function Platter({ tension, onPlayPress, onContinuePress, onPausePress }: PlatterProps) {
  // ... all your refs ...

  const openGarageDoor = (type: 'play' | 'continue') => {
    const top = type === 'play' ? playTopRef.current : continueTopRef.current;
    const bottom = type === 'play' ? playBottomRef.current : continueBottomRef.current;

    if (!top || !bottom) return;

    const tl = gsap.timeline({
      defaults: { duration: 1.95 }
    });

    tl.to(top.position, { y: 0.052, ease: "heavyStart" }, 0)
      .to(bottom.position, { y: -0.052, ease: "mechanicalSettle" }, 0.22)
      .to(top.rotation, { x: -0.092, ease: "gearMicro", yoyo: true, repeat: 1 }, 0.15)
      .to(bottom.rotation, { x: 0.092, ease: "gearMicro", yoyo: true, repeat: 1 }, 0.37);

    if (recessGlowRef.current) {
      tl.to(recessGlowRef.current, { intensity: 2.9, duration: 1.7, ease: "power2.out" }, 0.4);
    }

    if (dustParticlesRef.current) {
      tl.call(() => dustParticlesRef.current?.start(), [], 0.65);
      tl.call(() => dustParticlesRef.current?.stop(), [], 2.1);
    }
  };

  // ... rest of your code ...
}