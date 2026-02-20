import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { Engine } from '@babylonjs/core/Engines/engine';
import type { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import type { Scene as BabylonScene } from '@babylonjs/core/scene';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { EngineInitializer } from './src/engine/EngineInitializer';
import { GameBootstrap } from './src/engine/GameBootstrap';
import { NativeSceneProvider, SceneManager } from './src/engine/SceneManager';
import { DeviceQuality } from './src/utils/DeviceQuality';
import { isNative, isWeb } from './src/utils/PlatformConfig';

// Conditionally require native-only modules so Metro doesn't bundle them for web.
// Using require() inside the component avoids top-level imports that would fail
// on web where @babylonjs/react-native and reactylon/mobile don't exist.
// biome-ignore lint/suspicious/noExplicitAny: dynamic require returns platform-specific types
let NativeEngine: any = null;
// biome-ignore lint/suspicious/noExplicitAny: dynamic require returns platform-specific types
let ReactylonScene: any = null;
if (isNative) {
  NativeEngine = require('reactylon/mobile').NativeEngine;
  ReactylonScene = require('reactylon').Scene;
}

function WebApp() {
  const [engine, setEngine] = useState<Engine | WebGPUEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceQuality] = useState(() => new DeviceQuality());

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.id = 'renderCanvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.zIndex = '0';
    document.body.appendChild(canvas);

    EngineInitializer.createEngine(canvas)
      .then((eng) => {
        setEngine(eng);
        eng.runRenderLoop(() => {
          if (eng.scenes.length > 0) {
            const scene = eng.scenes[0];
            // Only render when camera exists (GameBootstrap creates it asynchronously)
            if (scene.activeCamera) {
              scene.render();
            }
            // Monitor FPS for adaptive quality (Req 40.3)
            deviceQuality.monitorPerformance(eng.getFps(), scene);
          }
        });
      })
      .catch((err) => {
        console.error('[App] Engine initialization failed:', err);
        setError(err.message);
      });

    return () => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      EngineInitializer.dispose();
    };
  }, [deviceQuality]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!engine) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingDot} />
      </View>
    );
  }

  return (
    <SceneManager engine={engine} deviceQuality={deviceQuality}>
      <GameBootstrap />
    </SceneManager>
  );
}

function NativeApp() {
  const [camera, setCamera] = useState<Camera | null>(null);
  const [sceneReady, setSceneReady] = useState<{
    scene: BabylonScene;
    engine: Engine | WebGPUEngine;
  } | null>(null);

  const handleSceneReady = (scene: BabylonScene) => {
    // Configure scene to match web settings
    scene.clearColor = new Color4(0, 0, 0, 1);
    scene.useRightHandedSystem = true;

    // Create a default camera so Reactylon's NativeEngine has a camera
    // for its EngineView. GameBootstrap will create its own ArcRotateCamera
    // and dispose this one.
    scene.createDefaultCameraOrLight(true, undefined, true);
    setCamera(scene.activeCamera as Camera);

    const eng = scene.getEngine() as Engine | WebGPUEngine;
    setSceneReady({ scene, engine: eng });
    console.log('[App] Reactylon native scene ready');
  };

  return (
    <SafeAreaView style={styles.nativeContainer}>
      <View style={styles.nativeContainer}>
        <NativeEngine camera={camera}>
          <ReactylonScene onSceneReady={handleSceneReady}>
            {sceneReady ? (
              <NativeSceneProvider scene={sceneReady.scene} engine={sceneReady.engine}>
                <GameBootstrap />
              </NativeSceneProvider>
            ) : null}
          </ReactylonScene>
        </NativeEngine>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  if (isWeb) {
    return <WebApp />;
  }
  return <NativeApp />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  errorText: {
    color: '#f00',
    fontSize: 14,
  },
});
