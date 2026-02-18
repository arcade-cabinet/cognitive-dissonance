'use client';

import * as BABYLON from '@babylonjs/core';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import { useGameStore } from '@/store/game-store';
import { useInputStore } from '@/store/input-store';
import { useLevelStore } from '@/store/level-store';
import { useSeedStore } from '@/store/seed-store';

// All GSAP plugins are now free (Webflow acquisition) — https://gsap.com/resources/private-repo-migration/
gsap.registerPlugin(CustomEase);

// Custom mechanical eases for satisfying garage-door feel
CustomEase.create('heavyMechanical', 'M0,0 C0.05,0 0.18,0.12 0.35,0.68 0.52,0.95 0.72,1 1,1');
CustomEase.create('mechSettle', 'M0,0 C0.12,0 0.25,0.62 0.42,0.82 0.58,1.08 0.75,0.96 1,1');
CustomEase.create('gearWobble', 'M0,0 C0.18,0.35 0.35,0.72 0.52,0.48 0.68,0.25 0.82,0.9 1,1');

export default function Platter() {
  const scene = useScene();
  const platterGroupRef = useRef<BABYLON.TransformNode | null>(null);
  const playTopRef = useRef<BABYLON.Mesh | null>(null);
  const playBottomRef = useRef<BABYLON.Mesh | null>(null);
  const continueTopRef = useRef<BABYLON.Mesh | null>(null);
  const continueBottomRef = useRef<BABYLON.Mesh | null>(null);
  const recessLightRef = useRef<BABYLON.PointLight | null>(null);
  const keycapMeshes = useRef<BABYLON.Mesh[]>([]);

  const { generateNewSeed, replayLastSeed } = useSeedStore.getState();

  useEffect(() => {
    if (!scene) return;

    const platterGroup = new BABYLON.TransformNode('platterRoot', scene);
    platterGroup.position.y = -1.6;
    platterGroupRef.current = platterGroup;

    // Heavy black metal platter base
    const baseMat = new BABYLON.PBRMaterial('platterBaseMat', scene);
    baseMat.albedoColor = new BABYLON.Color3(0.08, 0.08, 0.1);
    baseMat.metallic = 0.92;
    baseMat.roughness = 0.28;

    const base = BABYLON.MeshBuilder.CreateCylinder(
      'platterBase',
      { height: 0.32, diameter: 3, tessellation: 64 },
      scene,
    );
    base.material = baseMat;
    base.parent = platterGroup;

    // Thick industrial rim
    const rimMat = new BABYLON.PBRMaterial('rimMat', scene);
    rimMat.albedoColor = new BABYLON.Color3(0.06, 0.06, 0.08);
    rimMat.metallic = 0.96;
    rimMat.roughness = 0.18;
    rimMat.emissiveColor = new BABYLON.Color3(0, 0.13, 0.3);

    const rim = BABYLON.MeshBuilder.CreateCylinder('rim', { height: 0.2, diameter: 3.2, tessellation: 64 }, scene);
    rim.position.y = 0.15;
    rim.material = rimMat;
    rim.parent = platterGroup;

    // Recessed circular track for sphere
    const trackMat = new BABYLON.PBRMaterial('trackMat', scene);
    trackMat.albedoColor = new BABYLON.Color3(0.07, 0.07, 0.09);
    trackMat.metallic = 0.82;
    trackMat.roughness = 0.38;

    const track = BABYLON.MeshBuilder.CreateCylinder(
      'track',
      { height: 0.25, diameter: 0.78, tessellation: 64 },
      scene,
    );
    track.position.y = 0.4;
    track.material = trackMat;
    track.parent = platterGroup;

    // Garage door panels for play key
    const panelMat = new BABYLON.PBRMaterial('panelMat', scene);
    panelMat.albedoColor = new BABYLON.Color3(0.06, 0.06, 0.08);
    panelMat.metallic = 0.95;
    panelMat.roughness = 0.25;
    panelMat.emissiveColor = new BABYLON.Color3(0.04, 0.15, 0.3);

    const createGarageDoor = (name: string, posX: number, posZ: number, rotY: number) => {
      const parent = new BABYLON.TransformNode(`${name}Parent`, scene);
      parent.position = new BABYLON.Vector3(posX, 0, posZ);
      parent.rotation.y = rotY;
      parent.parent = platterGroup;

      const top = BABYLON.MeshBuilder.CreateBox(`${name}Top`, { width: 0.25, height: 0.12, depth: 0.18 }, scene);
      top.position.y = 0.021;
      top.material = panelMat;
      top.parent = parent;

      const bottom = BABYLON.MeshBuilder.CreateBox(`${name}Bottom`, { width: 0.25, height: 0.12, depth: 0.18 }, scene);
      bottom.position.y = -0.021;
      bottom.material = panelMat;
      bottom.parent = parent;

      // Keycap (hidden inside until door opens)
      const keycapMat = new BABYLON.PBRMaterial(`${name}KeycapMat`, scene);
      keycapMat.albedoColor = new BABYLON.Color3(0.1, 0.1, 0.12);
      keycapMat.metallic = 0.8;
      keycapMat.roughness = 0.3;
      keycapMat.emissiveColor = new BABYLON.Color3(0.04, 0.2, 0.4);

      const keycap = BABYLON.MeshBuilder.CreateBox(`${name}Keycap`, { width: 0.15, height: 0.08, depth: 0.15 }, scene);
      keycap.position.y = 0.05;
      keycap.material = keycapMat;
      keycap.parent = parent;

      return { top, bottom, keycap, parent };
    };

    const playDoor = createGarageDoor('play', -1.4, -0.35, -0.5);
    playTopRef.current = playDoor.top;
    playBottomRef.current = playDoor.bottom;

    const continueDoor = createGarageDoor('continue', 1.4, -0.35, 0.5);
    continueTopRef.current = continueDoor.top;
    continueBottomRef.current = continueDoor.bottom;

    // Click handlers
    playDoor.keycap.actionManager = new BABYLON.ActionManager(scene);
    playDoor.keycap.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => generateNewSeed()),
    );

    continueDoor.keycap.actionManager = new BABYLON.ActionManager(scene);
    continueDoor.keycap.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => replayLastSeed()),
    );

    // Center pause keycap
    const pauseMat = new BABYLON.PBRMaterial('pauseKeyMat', scene);
    pauseMat.albedoColor = new BABYLON.Color3(0.15, 0.08, 0.02);
    pauseMat.metallic = 0.8;
    pauseMat.roughness = 0.3;
    pauseMat.emissiveColor = new BABYLON.Color3(0.4, 0.15, 0.02);

    const pauseKey = BABYLON.MeshBuilder.CreateBox('pauseKey', { width: 0.18, height: 0.1, depth: 0.18 }, scene);
    pauseKey.position = new BABYLON.Vector3(0, 0, -1.4);
    pauseKey.material = pauseMat;
    pauseKey.parent = platterGroup;
    pauseKey.isPickable = true;

    pauseKey.actionManager = new BABYLON.ActionManager(scene);
    pauseKey.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
        useGameStore.getState().togglePause();
      }),
    );

    // Decorative keycaps around the rim
    const decorKeys: BABYLON.Mesh[] = [];
    const decorMat = new BABYLON.PBRMaterial('decorKeyMat', scene);
    decorMat.albedoColor = new BABYLON.Color3(0.22, 0.22, 0.26);
    decorMat.metallic = 0.85;
    decorMat.roughness = 0.3;
    decorMat.emissiveColor = new BABYLON.Color3(0.06, 0.1, 0.2);

    for (let i = 0; i < 12; i++) {
      const side = i < 6 ? -1 : 1;
      const idx = i < 6 ? i : i - 6;
      const angle = side * (0.4 + idx * 0.18);
      const key = BABYLON.MeshBuilder.CreateBox(`decorKey${i}`, { width: 0.12, height: 0.08, depth: 0.12 }, scene);
      key.position = new BABYLON.Vector3(Math.sin(angle) * 1.4, 0, Math.cos(angle) * 1.4 - 0.35);
      key.rotation.y = angle;
      key.material = decorMat;
      key.parent = platterGroup;
      key.isPickable = true;

      // Keycap hold interaction for pattern stabilization
      key.actionManager = new BABYLON.ActionManager(scene);
      const keycapIndex = i;
      key.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, () => {
          useInputStore.getState().pressKeycap(keycapIndex);
        }),
      );
      key.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickUpTrigger, () => {
          useInputStore.getState().releaseKeycap(keycapIndex);
        }),
      );

      decorKeys.push(key);
    }
    keycapMeshes.current = decorKeys;

    // Recess glow light
    const recessLight = new BABYLON.PointLight('recessGlow', BABYLON.Vector3.Zero(), scene);
    recessLight.diffuse = new BABYLON.Color3(0.2, 0.8, 1.0);
    recessLight.intensity = 0;
    recessLight.parent = platterGroup;
    recessLightRef.current = recessLight;

    // Garage door emerge after title sizzle
    setTimeout(() => {
      openGarageDoor(playTopRef.current, playBottomRef.current);
      openGarageDoor(continueTopRef.current, continueBottomRef.current);
    }, 2600);

    return () => {
      platterGroup.dispose(false, true);
    };
  }, [scene, generateNewSeed, replayLastSeed]);

  // Platter rotation + RGB pulsing
  useEffect(() => {
    if (!scene) return;

    const observer = scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() / 1000;
      if (platterGroupRef.current) {
        platterGroupRef.current.rotation.y = Math.sin(t * 0.165) * 1.72;
      }

      // Decorative key RGB pulsing based on tension
      const cur = useLevelStore.getState().tension;
      keycapMeshes.current.forEach((key) => {
        const mat = key.material as BABYLON.PBRMaterial;
        if (mat) {
          mat.emissiveColor = new BABYLON.Color3(lerp(0.06, 0.4, cur), lerp(0.1, 0.12, cur), lerp(0.2, 0.04, cur));
        }
      });
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
    };
  }, [scene]);

  return null;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function openGarageDoor(top: BABYLON.Mesh | null, bottom: BABYLON.Mesh | null) {
  if (!top || !bottom) return;

  const tl = gsap.timeline();

  tl.to([top.position, bottom.position], {
    y: (_i: number, target: BABYLON.Vector3) => (target === top.position ? 0.12 : -0.12),
    duration: 1.95,
    ease: 'heavyMechanical',
    stagger: 0.22,
  });

  tl.to(
    [top.rotation, bottom.rotation],
    {
      x: (_i: number, target: BABYLON.Vector3) => (target === top.rotation ? -0.095 : 0.095),
      duration: 1.45,
      ease: 'gearWobble',
      yoyo: true,
      repeat: 1,
      stagger: 0.18,
    },
    '-=1.6',
  );
}
