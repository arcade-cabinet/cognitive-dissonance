/**
 * React Native entry point for Cognitive Dissonance.
 *
 * This file is used by Metro bundler (Android/iOS) — NOT by Next.js.
 * It renders the same game scene using Reactylon's NativeEngine.
 *
 * NOTE: The import paths below (reactylon/native, reactylon) assume
 * Reactylon's React Native support is installed. If the 'reactylon/native'
 * export does not exist in your version, check the Reactylon docs for the
 * correct mobile engine import path.
 *
 * Prerequisites:
 *   - React Native 0.74+ with metro.config.js pointing here
 *   - @babylonjs/core and reactylon installed as dependencies
 *   - android/ and ios/ scaffold directories configured
 *
 * To run:
 *   npx react-native run-android
 *   npx react-native run-ios
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import * as BABYLON from '@babylonjs/core';
import { Scene } from 'reactylon';
import { NativeEngine } from 'reactylon/native';

// Hoisted constants to avoid allocation on every render
const LIGHT_DIR = new BABYLON.Vector3(0, 1, 0);
const CAMERA_TARGET = BABYLON.Vector3.Zero();
const CLEAR_COLOR = new BABYLON.Color4(0.04, 0.04, 0.06, 1);

export default function App() {
  const onSceneReady = useCallback((scene: BABYLON.Scene) => {
    scene.clearColor = CLEAR_COLOR;
  }, []);

  return (
    <View style={styles.container}>
      <NativeEngine>
        <Scene onSceneReady={onSceneReady}>
          {/* Lighting */}
          <hemisphericLight name="hemiLight" direction={LIGHT_DIR} intensity={0.3} />
          <arcRotateCamera
            name="camera"
            alpha={Math.PI / 4}
            beta={Math.PI / 3}
            radius={8}
            target={CAMERA_TARGET}
            setActiveOnSceneIfNoneActive
          />

          {/*
            Game components are shared with the web build in src/components/.
            Import and render them here when React Native integration is ready:
              <AISphere />
              <Platter />
              <PatternStabilizer />
              <EnemySpawner />
          */}
        </Scene>
      </NativeEngine>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
