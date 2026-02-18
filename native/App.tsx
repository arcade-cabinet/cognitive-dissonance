/**
 * React Native entry point for Cognitive Dissonance.
 *
 * This file is used by Metro bundler (Android/iOS) — NOT by Next.js.
 * It renders the same game scene using Reactylon's NativeEngine.
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

import React from 'react';
import { StyleSheet, View } from 'react-native';
import * as BABYLON from '@babylonjs/core';
import { Scene } from 'reactylon';
import { NativeEngine } from 'reactylon/native';

export default function App() {
  return (
    <View style={styles.container}>
      <NativeEngine>
        <Scene
          onSceneReady={(scene: BABYLON.Scene) => {
            scene.clearColor = new BABYLON.Color4(0.04, 0.04, 0.06, 1);
          }}
        >
          {/* Lighting */}
          <hemisphericLight
            name="hemiLight"
            direction={new BABYLON.Vector3(0, 1, 0)}
            intensity={0.3}
          />
          <arcRotateCamera
            name="camera"
            alpha={Math.PI / 4}
            beta={Math.PI / 3}
            radius={8}
            target={BABYLON.Vector3.Zero()}
            setActiveOnSceneIfNoneActive
          />

          {/*
            TODO: Import and render game components here.
            Components are shared with the web build in src/components/.
            Example:
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
