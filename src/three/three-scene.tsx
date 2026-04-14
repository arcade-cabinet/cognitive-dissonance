import { Environment, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Color } from 'three';
import AISphere from './components/ai-sphere';
import CorruptionPass from './components/corruption-pass';
import EmergentControls from './components/emergent-controls';
import Platter from './components/platter';
import SkyRain from './components/sky-rain';

interface ThreeSceneProps {
  reducedMotion: boolean;
}

/**
 * R3F root for the cabinet.
 *
 * Replaces the Babylon `GameScene` component. Canvas owns the renderer +
 * scene; each child is a hook-driven system that reads Koota state and
 * imperatively drives Three objects.
 *
 * The camera is an arc-style view — tilted down slightly to see the platter
 * top surface + the AI sphere sitting above it. Mobile portrait gets a
 * pulled-back framing via `computeFraming` (handled inside the camera helper).
 */
export default function ThreeScene({ reducedMotion }: ThreeSceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      }}
      onCreated={({ scene }) => {
        scene.background = new Color(0x0a0a0f);
      }}
    >
      <PerspectiveCamera makeDefault fov={45} position={[4, 3, 5]} near={0.1} far={100} />

      {/* PMREM environment — feeds reflections on glass + platter. */}
      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.6} />
      </Suspense>

      {/* Key + fill + rim lights match the Babylon setup. */}
      <hemisphereLight args={[0xbbccff, 0x080810, 0.35]} />
      <pointLight position={[0, 2, 3]} intensity={8} color={0x4080cc} distance={15} />
      <pointLight position={[3, 5, -4]} intensity={12} color={0xffffff} distance={20} />

      {/* Cabinet chassis */}
      <Platter />
      <AISphere reducedMotion={reducedMotion} />
      <SkyRain />

      {/* Level-parameterized input controls — emerge through rim slits */}
      <EmergentControls />

      {/* Postprocessing lives last so every effect wraps everything above. */}
      <CorruptionPass />
    </Canvas>
  );
}
