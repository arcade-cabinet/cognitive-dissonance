import { ArcRotateCamera, type Scene as BabylonScene, Color3, Color4, Vector3 } from '@babylonjs/core';
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
  reducedMotion: boolean;
}

function SceneContent({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      {/* Lighting */}
      <hemisphericLight name="hemiLight" direction={new Vector3(0, 1, 0)} intensity={0.3} />
      <pointLight name="rimLight" position={new Vector3(0, 2, 3)} intensity={2} diffuse={new Color3(0.3, 0.5, 0.8)} />
      <pointLight
        name="keyLight"
        position={new Vector3(3, 5, -4)}
        intensity={1.8}
        diffuse={new Color3(0.9, 0.9, 1.0)}
      />

      {/* Camera is created procedurally in onSceneReady to ensure it's active before first render */}

      {/* Core 3D elements (created imperatively) */}
      <AISphere reducedMotion={reducedMotion} />
      <Platter />

      {/* Gameplay systems */}
      <PatternStabilizer />
      <EnemySpawner />

      {/* Polish systems — DiegeticGUI reads coherence from Koota directly,
          no prop drilling needed. */}
      <PostProcessCorruption reducedMotion={reducedMotion} />
      <SpatialAudio />
      <SPSEnemies />
      <DiegeticGUI />
      <AudioEngineSystem />
      <PhysicsKeys />
      <XRSession />
    </>
  );
}

export default function GameScene({ reducedMotion }: GameSceneProps) {
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
          scene.clearColor = new Color4(0.04, 0.04, 0.06, 1);

          const engine = scene.getEngine();
          const canvas = engine.getRenderingCanvas();

          const computeFraming = (): { radius: number; beta: number } => {
            const w = canvas?.clientWidth ?? 1280;
            const h = canvas?.clientHeight ?? 800;
            const isPortrait = h > w;
            const isNarrow = w < 600;
            return {
              radius: isPortrait && isNarrow ? 11 : 8,
              beta: isPortrait && isNarrow ? Math.PI / 2.5 : Math.PI / 3,
            };
          };

          const initial = computeFraming();
          const camera = new ArcRotateCamera(
            'camera',
            Math.PI / 4,
            initial.beta,
            initial.radius,
            Vector3.Zero(),
            scene,
          );
          camera.lowerRadiusLimit = 4;
          camera.upperRadiusLimit = 18;
          camera.lowerBetaLimit = 0.1;
          camera.upperBetaLimit = Math.PI / 2.2;
          if (canvas) {
            camera.attachControl(canvas, true);
          }
          scene.activeCamera = camera;

          // Recompute framing on resize/rotation so phone portrait ↔ landscape
          // doesn't leave the camera over-zoomed or clipped.
          const onResize = () => {
            const { radius, beta } = computeFraming();
            camera.radius = radius;
            camera.beta = beta;
          };
          const resizeObserver =
            typeof window !== 'undefined' && window.ResizeObserver && canvas ? new ResizeObserver(onResize) : null;
          if (resizeObserver && canvas) resizeObserver.observe(canvas);
          if (typeof window !== 'undefined') window.addEventListener('orientationchange', onResize);

          scene.onDisposeObservable.addOnce(() => {
            if (resizeObserver) resizeObserver.disconnect();
            if (typeof window !== 'undefined') window.removeEventListener('orientationchange', onResize);
          });

          // Expose scene for E2E/browser test diagnostics only in dev.
          // Only clear the reference if this scene still owns it (protects
          // against overlapping scene lifetimes during test teardown).
          if (typeof globalThis !== 'undefined' && process.env.NODE_ENV !== 'production') {
            const g = globalThis as unknown as { __scene?: BabylonScene };
            g.__scene = scene;
            scene.onDisposeObservable.addOnce(() => {
              if (g.__scene === scene) delete g.__scene;
            });
          }
        }}
      >
        <SceneContent reducedMotion={reducedMotion} />
      </Scene>
    </Engine>
  );
}
