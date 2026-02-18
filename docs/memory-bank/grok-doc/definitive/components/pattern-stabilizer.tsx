// components/pattern-stabilizer.tsx
"use client"

import React, { useRef } from 'react';
import { useBeforeRender } from 'reactylon';
import { useEntity } from 'miniplex-react';
import { world } from '@/game/world';

export function PatternStabilizer({ tension, onHoldChange }: { 
  tension: number; 
  onHoldChange: (index: number, isHeld: boolean) => void 
}) {
  const activePatterns = useRef<any[]>([]);

  useBeforeRender((scene, delta) => {
    const dt = delta / 1000;
    const curTension = tension;

    // Spawn new patterns
    if (Math.random() < curTension * 1.6 * dt * 7) {
      activePatterns.current.push({
        id: Date.now(),
        progress: 0,
        speed: 0.35 + Math.random() * curTension * 1.3,
        colorIndex: Math.floor(Math.random() * 12), // matches keycap index
      });
    }

    // Update patterns
    for (let i = activePatterns.current.length - 1; i >= 0; i--) {
      const p = activePatterns.current[i];
      p.progress += p.speed * dt;

      // Being held?
      const isHeld = onHoldChange(p.colorIndex, true);
      if (isHeld) {
        p.progress = Math.max(0, p.progress - 2.4 * dt); // strong pull-back
      }

      // Reached rim?
      if (p.progress >= 1.0) {
        world.set(entity, { tension: Math.min(1, curTension + 0.25) });
        activePatterns.current.splice(i, 1);
      }
    }
  });

  return null;
}