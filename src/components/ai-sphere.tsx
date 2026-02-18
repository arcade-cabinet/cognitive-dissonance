'use client';

import * as BABYLON from '@babylonjs/core';
import gsap from 'gsap';
import { useCallback, useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import { world } from '@/game/world';
import { createCelestialShaderMaterial } from '@/lib/shaders/celestial';
import { useGameStore } from '@/store/game-store';
import { useLevelStore } from '@/store/level-store';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

interface AISphereProps {
  reducedMotion: boolean;
}

export default function AISphere({ reducedMotion }: AISphereProps) {
  const scene = useScene();
  const outerSphereRef = useRef<BABYLON.Mesh | null>(null);
  const innerSphereRef = useRef<BABYLON.Mesh | null>(null);
  const glassMatRef = useRef<BABYLON.PBRMaterial | null>(null);
  const innerMatRef = useRef<BABYLON.ShaderMaterial | null>(null);
  const explodedRef = useRef(false);
  /** Guards against re-triggering clarity while the pulse animation plays */
  const clarityActiveRef = useRef(false);
  const shatterCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Miniplex entity — synced every frame with current tension/coherence/exploded state */
  const sphereEntityRef = useRef(
    world.add({
      aiSphere: true,
      tension: 0.12 as number | undefined,
      coherence: 25 as number | undefined,
      exploded: false as boolean | undefined,
      crackLevel: 0 as number | undefined,
    }),
  );

  /**
   * Create (or recreate) both sphere meshes + materials.
   * Called on initial mount and on restart after shatter.
   */
  const buildSpheres = useCallback(
    (scn: BABYLON.Scene) => {
      // Outer glass sphere
      const outerSphere = BABYLON.MeshBuilder.CreateSphere('aiSphereOuter', { diameter: 0.52, segments: 64 }, scn);
      outerSphere.position.y = 0.4;
      outerSphereRef.current = outerSphere;

      const glassMat = new BABYLON.PBRMaterial('glassMat', scn);
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
      const innerSphere = BABYLON.MeshBuilder.CreateSphere('aiSphereInner', { diameter: 0.49, segments: 64 }, scn);
      innerSphere.position.y = 0.4;
      innerSphereRef.current = innerSphere;

      const celestialMat = createCelestialShaderMaterial(scn);
      innerSphere.material = celestialMat;
      innerMatRef.current = celestialMat;

      // Emerge animation: scale from nothing
      outerSphere.scaling.setAll(0.01);
      innerSphere.scaling.setAll(0.01);
      const emergeDuration = reducedMotion ? 0.6 : 3.8;
      const emergeDelay = reducedMotion ? 0 : 2.6;
      gsap.to(outerSphere.scaling, {
        x: 1,
        y: 1,
        z: 1,
        duration: emergeDuration,
        ease: 'power4.out',
        delay: emergeDelay,
      });
      gsap.to(innerSphere.scaling, {
        x: 1,
        y: 1,
        z: 1,
        duration: emergeDuration,
        ease: 'power4.out',
        delay: emergeDelay,
      });

      // Emissive pulse on emergence (blue → white → off)
      gsap.fromTo(
        glassMat,
        { emissiveIntensity: 0 },
        {
          emissiveIntensity: 0.8,
          duration: reducedMotion ? 0.3 : 1.5,
          delay: reducedMotion ? 0.1 : 3.0,
          yoyo: true,
          repeat: 1,
          ease: 'sine.inOut',
          onStart: () => {
            glassMat.emissiveColor = new BABYLON.Color3(0.1, 0.4, 1.0);
          },
          onComplete: () => {
            glassMat.emissiveColor = BABYLON.Color3.Black();
            glassMat.emissiveIntensity = 0;
          },
        },
      );
    },
    [reducedMotion],
  );

  // Initial sphere creation
  useEffect(() => {
    if (!scene) return;
    buildSpheres(scene);

    return () => {
      // Kill active GSAP tweens before disposing to prevent callbacks on dead objects
      if (outerSphereRef.current) gsap.killTweensOf(outerSphereRef.current.scaling);
      if (outerSphereRef.current) gsap.killTweensOf(outerSphereRef.current.position);
      if (outerSphereRef.current) gsap.killTweensOf(outerSphereRef.current.rotation);
      if (glassMatRef.current) gsap.killTweensOf(glassMatRef.current);
      if (shatterCleanupTimerRef.current) {
        clearTimeout(shatterCleanupTimerRef.current);
        shatterCleanupTimerRef.current = null;
      }
      outerSphereRef.current?.dispose();
      innerSphereRef.current?.dispose();
      glassMatRef.current?.dispose();
      innerMatRef.current?.dispose();
    };
  }, [scene, buildSpheres]);

  // Restart ritual: listen for phase transitions to recreate after shatter
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prev) => {
      const restarted = state.restartToken !== prev.restartToken;
      if (state.phase === 'playing' && restarted && explodedRef.current && scene) {
        // Sphere was shattered — recreate it as the "dream again" ritual
        explodedRef.current = false;
        clarityActiveRef.current = false;
        buildSpheres(scene);
      }
    });
    return unsub;
  }, [scene, buildSpheres]);

  // Animation loop: tension-driven updates + moment of clarity + shatter
  useEffect(() => {
    if (!scene) return;

    const observer = scene.onBeforeRenderObservable.add(() => {
      if (explodedRef.current) return; // Don't process after shatter

      const cur = useLevelStore.getState().tension;
      const coherence = useLevelStore.getState().coherence;
      const t = performance.now() / 1000;

      // Sync Miniplex entity with current state
      const entity = sphereEntityRef.current;
      entity.tension = cur;
      entity.coherence = coherence;
      entity.crackLevel = cur;

      // ── Moment of Clarity ──
      // When coherence reaches 100, the AI mind is briefly whole.
      // A beautiful calm before the inevitable.
      if (coherence >= 100 && !clarityActiveRef.current) {
        clarityActiveRef.current = true;

        // Sphere calms: smooth jitter to zero
        if (outerSphereRef.current) {
          gsap.to(outerSphereRef.current.position, { x: 0, z: 0, duration: 2, ease: 'power2.out' });
          gsap.to(outerSphereRef.current.rotation, { x: 0, z: 0, duration: 2, ease: 'power2.out' });
        }

        // Blue emissive pulse on glass
        if (glassMatRef.current) {
          glassMatRef.current.emissiveColor = new BABYLON.Color3(0.1, 0.4, 1.0);
          gsap.fromTo(
            glassMatRef.current,
            { emissiveIntensity: 0 },
            {
              emissiveIntensity: 1.5,
              duration: reducedMotion ? 0.35 : 1.5,
              yoyo: true,
              repeat: 1,
              ease: 'sine.inOut',
              onComplete: () => {
                if (glassMatRef.current) {
                  glassMatRef.current.emissiveColor = BABYLON.Color3.Black();
                  glassMatRef.current.emissiveIntensity = 0;
                }
                // After the moment passes, entropy resumes
                clarityActiveRef.current = false;
                useLevelStore.getState().addCoherence(-75);
                // Slightly increase base tension — the AI is degrading
                const curT = useLevelStore.getState().tension;
                useLevelStore.getState().setTension(Math.min(1, curT + 0.05));
              },
            },
          );
        }

        // Celestial shader: briefly shift to pure calm blue
        if (innerMatRef.current) {
          innerMatRef.current.setFloat('u_cloud_density', 2.0);
          innerMatRef.current.setFloat('u_glow_intensity', 3.0);
          innerMatRef.current.setColor3('u_color1', new BABYLON.Color3(0.03, 0.4, 1.0));
          innerMatRef.current.setColor3('u_color2', new BABYLON.Color3(0.1, 0.8, 1.0));
        }

        // Dispatch event for gameboard overlay
        window.dispatchEvent(new Event('coherenceMaintained'));
      }

      // ── Normal tension-driven updates (skip during clarity) ──
      if (!clarityActiveRef.current) {
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
          const jitterScale = reducedMotion ? 0.25 : 1;
          outerSphereRef.current.position.x = Math.sin(t * 14) * cur * 0.06 * jitterScale;
          outerSphereRef.current.position.z = Math.cos(t * 17) * cur * 0.04 * jitterScale;
          outerSphereRef.current.rotation.x = Math.sin(t * 6) * cur * 0.12 * jitterScale;
          outerSphereRef.current.rotation.z = Math.cos(t * 8) * cur * 0.09 * jitterScale;
        }

        // Mirror jitter on inner sphere
        if (innerSphereRef.current && outerSphereRef.current) {
          innerSphereRef.current.position.copyFrom(outerSphereRef.current.position);
          innerSphereRef.current.rotation.copyFrom(outerSphereRef.current.rotation);
        }
      } else if (innerMatRef.current) {
        // During clarity, still update time for shader animation
        innerMatRef.current.setFloat('u_time', t);
      }

      // ── Max tension shatter ──
      if (cur >= 0.99 && !explodedRef.current) {
        explodedRef.current = true;
        sphereEntityRef.current.exploded = true;

        // Remove this observer to prevent running on disposed meshes
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

        const shatterCleanupDelayMs = (shatterParticles.targetStopDuration + shatterParticles.maxLifeTime) * 1000;
        shatterCleanupTimerRef.current = setTimeout(() => {
          shatterParticles.dispose();
          particleTex.dispose();
          shatterCleanupTimerRef.current = null;
        }, shatterCleanupDelayMs);

        // Dispose spheres after capturing position
        outerSphereRef.current?.dispose();
        innerSphereRef.current?.dispose();

        // Trigger spatial audio shatter + game over
        window.dispatchEvent(new Event('sphereShattered'));
        window.dispatchEvent(new Event('gameOver'));
      }
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
    };
  }, [scene, reducedMotion]);

  return null; // Meshes created imperatively
}
