'use client';

import * as BABYLON from '@babylonjs/core';
import { Scene } from 'reactylon';
import { Engine } from 'reactylon/web';
import AISphere from '@/components/ai-sphere';
import AudioEngineSystem from '@/components/audio-engine';
import DiegeticGUI from '@/components/diegetic-gui';
import EnemySpawner from '@/components/enemy-spawner';
import PatternStabilizer from '@/components/pattern-stabilizer';
import PhysicsKeys from '@/components/physics-keys';
import Platter from '@/components/platter';
import PostProcessCorruption from '@/components/post-process-corruption';
import SpatialAudio from '@/components/spatial-audio';
import SPSEnemies from '@/components/sps-enemies';
import XRSession from '@/components/xr-session';

interface GameSceneProps {
  coherence: number;
  reducedMotion: boolean;
}

function SceneContent({ coherence, reducedMotion }: { coherence: number; reducedMotion: boolean }) {
  return (
    <>
      {/* Lighting */}
      <hemisphericLight name="hemiLight" direction={new BABYLON.Vector3(0, 1, 0)} intensity={0.3} />
      <pointLight
        name="rimLight"
        position={new BABYLON.Vector3(0, 2, 3)}
        intensity={2}
        diffuse={new BABYLON.Color3(0.3, 0.5, 0.8)}
      />
      <pointLight
        name="keyLight"
        position={new BABYLON.Vector3(3, 5, -4)}
        intensity={1.8}
        diffuse={new BABYLON.Color3(0.9, 0.9, 1.0)}
      />

      {/* Camera is created procedurally in onSceneReady to ensure it's active before first render */}

      {/* Core 3D elements (created imperatively) */}
      <AISphere reducedMotion={reducedMotion} />
      <Platter />

      {/* Gameplay systems */}
      <PatternStabilizer />
      <EnemySpawner />

      {/* Polish systems */}
      <PostProcessCorruption reducedMotion={reducedMotion} />
      <SpatialAudio />
      <SPSEnemies />
      <DiegeticGUI coherence={coherence} />
      <AudioEngineSystem />
      <PhysicsKeys />
      <XRSession />
    </>
  );
}

export default function GameScene({ coherence, reducedMotion }: GameSceneProps) {
  return (
    <Engine
      forceWebGL={true}
      engineOptions={{
        antialias: true,
        adaptToDeviceRatio: true,
        audioEngine: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      }}
    >
      <Scene
        onSceneReady={(scene) => {
          scene.clearColor = new BABYLON.Color4(0.04, 0.04, 0.06, 1);

          // Create camera procedurally so it's active before first render commit
          const camera = new BABYLON.ArcRotateCamera(
            'camera',
            Math.PI / 4,
            Math.PI / 3,
            8,
            BABYLON.Vector3.Zero(),
            scene,
          );
          camera.lowerRadiusLimit = 4;
          camera.upperRadiusLimit = 18;
          camera.lowerBetaLimit = 0.1;
          camera.upperBetaLimit = Math.PI / 2.2;
          const canvas = scene.getEngine().getRenderingCanvas();
          if (canvas) {
            camera.attachControl(canvas, true);
          }
          scene.activeCamera = camera;

          // Expose scene on window for E2E/browser test diagnostics
          if (typeof window !== 'undefined') {
            (window as unknown as { __scene: BABYLON.Scene }).__scene = scene;
          }
        }}
      >
        <SceneContent coherence={coherence} reducedMotion={reducedMotion} />
      </Scene>
    </Engine>
  );
}
