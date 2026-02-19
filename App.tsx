import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { EngineInitializer } from './src/engine/EngineInitializer';
import { SceneManager } from './src/engine/SceneManager';
import { DeviceQuality } from './src/utils/DeviceQuality';
import { isWeb } from './src/utils/PlatformConfig';

export default function App() {
  const [engine, setEngine] = useState<Engine | WebGPUEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceQuality] = useState(() => new DeviceQuality());

  useEffect(() => {
    if (isWeb) {
      // Web: Initialize engine with canvas
      const canvas = document.createElement('canvas');
      canvas.id = 'renderCanvas';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      document.body.appendChild(canvas);

      EngineInitializer.createEngine(canvas)
        .then((eng) => {
          setEngine(eng);
          eng.runRenderLoop(() => {
            if (eng.scenes.length > 0) {
              const scene = eng.scenes[0];
              scene.render();
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
    } else {
      // Native: Engine will be created by Reactylon Native
      // For now, show placeholder
      setError('Native engine initialization not yet implemented');
    }
  }, [deviceQuality]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Cognitive Dissonance v3.0</Text>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!engine) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Cognitive Dissonance v3.0</Text>
        <Text style={styles.subtext}>Initializing engine...</Text>
      </View>
    );
  }

  return (
    <SceneManager engine={engine} deviceQuality={deviceQuality}>
      <View style={styles.container}>
        <Text style={styles.text}>Cognitive Dissonance v3.0</Text>
        <Text style={styles.subtext}>Engine initialized</Text>
      </View>
    </SceneManager>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtext: {
    color: '#888',
    fontSize: 16,
    marginTop: 8,
  },
  errorText: {
    color: '#f00',
    fontSize: 14,
    marginTop: 8,
  },
});
