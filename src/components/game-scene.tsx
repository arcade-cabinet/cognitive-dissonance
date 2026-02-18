'use client';

import * as BABYLON from '@babylonjs/core';
import { Scene } from 'reactylon';
import { Engine } from 'reactylon/web';
import AISphere from '@/components/ai-sphere';
import AudioEngineSystem from '@/components/audio-engine';
import DiegeticGUI from '@/components/diegetic-gui';
import EnemySpawner from '@/components/enemy-spawner';
import PatternStabilizer from '@/components/pattern-stabilizer';
import Platter from '@/components/platter';
import PostProcessCorruption from '@/components/post-process-corruption';
import SpatialAudio from '@/components/spatial-audio';
import SPSEnemies from '@/components/sps-enemies';
import XRSession from '@/components/xr-session';

interface GameSceneProps {
  coherence: number;
}

function SceneContent({ coherence }: { coherence: number }) {
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

      {/* Camera */}
      <arcRotateCamera
        name="camera"
        alpha={Math.PI / 4}
        beta={Math.PI / 3}
        radius={8}
        target={BABYLON.Vector3.Zero()}
        lowerRadiusLimit={4}
        upperRadiusLimit={18}
        lowerBetaLimit={0.1}
        upperBetaLimit={Math.PI / 2.2}
        setActiveOnSceneIfNoneActive
      />

      {/* Core 3D elements (created imperatively) */}
      <AISphere />
      <Platter />

      {/* Gameplay systems */}
      <PatternStabilizer />
      <EnemySpawner />

      {/* Polish systems */}
      <PostProcessCorruption />
      <SpatialAudio />
      <SPSEnemies />
      <DiegeticGUI coherence={coherence} />
      <AudioEngineSystem />
      <XRSession />
    </>
  );
}

export default function GameScene({ coherence }: GameSceneProps) {
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
        }}
      >
        <SceneContent coherence={coherence} />
      </Scene>
    </Engine>
  );
}
