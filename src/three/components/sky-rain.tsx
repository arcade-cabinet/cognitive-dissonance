import { useFrame } from '@react-three/fiber';
import { useTrait, useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import type { Group } from 'three';
import { Level } from '@/sim/world';
import { createSkyRain, type SkyRain } from '../sky-rain';

/**
 * Sky rain — falling cyan/red debris cubes.
 *
 * Uses createSkyRain() InstancedMesh from the research port. Spawn rate +
 * fall speed are driven by current tension each frame.
 */
export default function SkyRainComponent() {
  const world = useWorld();
  const level = useTrait(world, Level);
  const groupRef = useRef<Group>(null);
  const rainRef = useRef<SkyRain | null>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const fakeScene = groupRef.current as unknown as Parameters<typeof createSkyRain>[0];
    rainRef.current = createSkyRain(fakeScene, { count: 160 });
    return () => {
      rainRef.current?.dispose();
      rainRef.current = null;
    };
  }, []);

  useFrame((_state, dt) => {
    rainRef.current?.update(dt, level?.tension ?? 0);
  });

  return <group ref={groupRef} />;
}
