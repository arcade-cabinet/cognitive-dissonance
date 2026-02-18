// components/spatial-audio.tsx
"use client"

import React, { useEffect } from 'react';
import { useScene } from 'reactylon';
import * as BABYLON from 'babylonjs';
import * as Tone from 'tone';
import { useAudioStore } from '@/store/audio-store';

export function SpatialAudio({ tension }: { tension: number }) {
  const scene = useScene();

  useEffect(() => {
    const listener = scene.audioListener || new BABYLON.AudioListener(scene);
    scene.audioListener = listener;

    // Pattern escape sound
    const escapeSound = new BABYLON.Sound("escape", "/sounds/pattern-escape.wav", scene, null, {
      spatialSound: true,
      loop: false,
      volume: 0.6
    });

    // Stabilization success
    const stabilizeSound = new BABYLON.Sound("stabilize", "/sounds/stabilize-chime.wav", scene, null, {
      spatialSound: true,
      volume: 0.8
    });

    // Shatter
    const shatterSound = new BABYLON.Sound("shatter", "/sounds/glass-shatter-reverb.wav", scene, null, {
      spatialSound: true,
      volume: 1.2
    });

    return () => {
      escapeSound.dispose();
      stabilizeSound.dispose();
      shatterSound.dispose();
    };
  }, []);

  return null;
}