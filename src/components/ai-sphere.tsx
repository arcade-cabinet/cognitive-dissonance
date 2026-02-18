'use client';

import * as BABYLON from '@babylonjs/core';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import { createCelestialShaderMaterial } from '@/lib/shaders/celestial';
import { useLevelStore } from '@/store/level-store';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

interface AISphereProps {
  tension: number;
}

export default function AISphere({ tension }: AISphereProps) {
  const scene = useScene();
  const outerSphereRef = useRef<BABYLON.Mesh | null>(null);
  const innerSphereRef = useRef<BABYLON.Mesh | null>(null);
  const glassMatRef = useRef<BABYLON.PBRMaterial | null>(null);
  const innerMatRef = useRef<BABYLON.ShaderMaterial | null>(null);
  const explodedRef = useRef(false);

  // Create spheres imperatively
  useEffect(() => {
    if (!scene) return;

    // Outer glass sphere
    const outerSphere = BABYLON.MeshBuilder.CreateSphere('aiSphereOuter', { diameter: 0.52, segments: 64 }, scene);
    outerSphere.position.y = 0.4;
    outerSphereRef.current = outerSphere;

    const glassMat = new BABYLON.PBRMaterial('glassMat', scene);
    glassMat.albedoColor = new BABYLON.Color3(0.02, 0.04, 0.09);
    glassMat.roughness = 0.02;
    glassMat.metallic = 0.05;
    glassMat.subSurface.isRefractionEnabled = true;
    glassMat.subSurface.indexOfRefraction = 1.52;
    glassMat.alpha = 0.3;
    glassMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    outerSphere.material = glassMat;
    glassMatRef.current = glassMat;

    // Inner celestial nebula sphere
    const innerSphere = BABYLON.MeshBuilder.CreateSphere('aiSphereInner', { diameter: 0.49, segments: 64 }, scene);
    innerSphere.position.y = 0.4;
    innerSphereRef.current = innerSphere;

    const celestialMat = createCelestialShaderMaterial(scene);
    innerSphere.material = celestialMat;
    innerMatRef.current = celestialMat;

    // Emerge animation
    outerSphere.scaling.setAll(0.01);
    innerSphere.scaling.setAll(0.01);
    gsap.to(outerSphere.scaling, { x: 1, y: 1, z: 1, duration: 3.8, ease: 'power4.out', delay: 2.6 });
    gsap.to(innerSphere.scaling, { x: 1, y: 1, z: 1, duration: 3.8, ease: 'power4.out', delay: 2.6 });

    return () => {
      outerSphere.dispose();
      innerSphere.dispose();
      glassMat.dispose();
      celestialMat.dispose();
    };
  }, [scene]);

  // Animation loop: tension-driven updates
  useEffect(() => {
    if (!scene) return;

    const observer = scene.onBeforeRenderObservable.add(() => {
      const cur = useLevelStore.getState().tension;
      const t = performance.now() / 1000;

      // Update celestial shader uniforms
      if (innerMatRef.current) {
        const mat = innerMatRef.current;
        mat.setFloat('u_time', t);
        mat.setFloat('u_cloud_density', 2.5 + cur * 3.5);
        mat.setFloat('u_glow_intensity', 1.5 + cur * 2.5);
        mat.setColor3('u_color1', new BABYLON.Color3(lerp(0.03, 0.9, cur), lerp(0.4, 0.2, cur), lerp(1.0, 0.1, cur)));
        mat.setColor3('u_color2', new BABYLON.Color3(lerp(0.1, 1.0, cur), lerp(0.8, 0.4, cur), lerp(1.0, 0.2, cur)));
      }

      // Glass degradation
      if (glassMatRef.current) {
        glassMatRef.current.roughness = 0.02 + cur * 0.45;
        glassMatRef.current.alpha = 0.3 - cur * 0.15;
      }

      // Physical jitter / bounce
      if (outerSphereRef.current) {
        outerSphereRef.current.position.x = Math.sin(t * 14) * cur * 0.06;
        outerSphereRef.current.position.z = Math.cos(t * 17) * cur * 0.04;
        outerSphereRef.current.rotation.x = Math.sin(t * 6) * cur * 0.12;
        outerSphereRef.current.rotation.z = Math.cos(t * 8) * cur * 0.09;
      }

      // Mirror jitter on inner sphere
      if (innerSphereRef.current && outerSphereRef.current) {
        innerSphereRef.current.position.copyFrom(outerSphereRef.current.position);
        innerSphereRef.current.rotation.copyFrom(outerSphereRef.current.rotation);
      }

      // Max tension shatter
      if (cur >= 0.99 && !explodedRef.current) {
        explodedRef.current = true;

        // Remove this observer first to prevent running on disposed meshes
        scene.onBeforeRenderObservable.remove(observer);

        const emitPos = outerSphereRef.current?.position.clone() ?? BABYLON.Vector3.Zero();

        // Create procedural particle texture (white circle on transparent)
        const particleTex = new BABYLON.DynamicTexture('shatterTex', 64, scene, false);
        const texCtx = particleTex.getContext();
        texCtx.fillStyle = '#ffffff';
        texCtx.beginPath();
        texCtx.arc(32, 32, 28, 0, Math.PI * 2);
        texCtx.fill();
        particleTex.update();

        const shatterParticles = new BABYLON.ParticleSystem('shatter', 1600, scene);
        shatterParticles.particleTexture = particleTex;
        shatterParticles.emitter = emitPos;
        shatterParticles.minSize = 0.012;
        shatterParticles.maxSize = 0.11;
        shatterParticles.color1 = new BABYLON.Color4(0.9, 0.3, 0.3, 1);
        shatterParticles.color2 = new BABYLON.Color4(1.0, 0.6, 0.4, 1);
        shatterParticles.emitRate = 1200;
        shatterParticles.minLifeTime = 0.6;
        shatterParticles.maxLifeTime = 3.2;
        shatterParticles.direction1 = new BABYLON.Vector3(-8, 4, -8);
        shatterParticles.direction2 = new BABYLON.Vector3(8, 12, 8);
        shatterParticles.gravity = new BABYLON.Vector3(0, -15, 0);
        shatterParticles.createPointEmitter(new BABYLON.Vector3(-0.1, -0.1, -0.1), new BABYLON.Vector3(0.1, 0.1, 0.1));
        shatterParticles.start();
        shatterParticles.targetStopDuration = 2.8;

        // Dispose spheres after capturing position
        outerSphereRef.current?.dispose();
        innerSphereRef.current?.dispose();

        // Trigger game over
        window.dispatchEvent(new Event('gameOver'));
        return; // exit observer early since we removed it
      }
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
    };
  }, [scene]);

  return null; // Meshes created imperatively
}
