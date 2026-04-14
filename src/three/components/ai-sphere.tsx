import { useFrame } from '@react-three/fiber';
import { useTrait, useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import type { Group } from 'three';
import { Level } from '@/sim/world';
import { type AICore, createAICore } from '../ai-core';

interface AISphereProps {
  reducedMotion: boolean;
}

/**
 * AISphere — composite glass shell + celestial nebula interior.
 *
 * Uses createAICore() from the research port. Glass refraction + iridescence
 * + nebula palette all shift with tension — the sphere IS the tension
 * indicator.
 *
 * reducedMotion prop is honored by the nebula `update()` — we skip the
 * animation tick so the interior still reads but doesn't strobe.
 */
export default function AISphere({ reducedMotion }: AISphereProps) {
  const world = useWorld();
  const level = useTrait(world, Level);
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<AICore | null>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const fakeScene = groupRef.current as unknown as Parameters<typeof createAICore>[0];
    coreRef.current = createAICore(fakeScene, { outerRadius: 0.6 });
    return () => {
      coreRef.current?.dispose();
      coreRef.current = null;
    };
  }, []);

  useEffect(() => {
    coreRef.current?.setTension(level?.tension ?? 0);
  }, [level?.tension]);

  useFrame((_state, dt) => {
    if (reducedMotion) return;
    coreRef.current?.update(dt);
  });

  // Position the sphere above the platter surface.
  return <group ref={groupRef} position={[0, 0.4, 0]} />;
}
