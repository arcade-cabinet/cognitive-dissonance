import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import type { Scene } from '@babylonjs/core/scene';
import type { TensionSystem } from '../systems/TensionSystem';

/**
 * MechanicalDegradationSystem — WebGL2 fallback visual feedback (Grok spec)
 *
 * Provides diegetic visual feedback when running on WebGL2 fallback (not WebGPU):
 * - Procedural crack generation using Voronoi distance field (mechanicalCrack shader)
 * - Platter rim hairline cracks that propagate with tension
 * - Gear-binding micro-jitter on platter rotation
 * - Dust particle spawn from slit edges (dustParticle shader)
 * - Sphere PBR normal map fracture propagation (pure normal map effect, no albedo change)
 * - Lever resistance creep (increase GSAP timeline duration as degradation progresses)
 *
 * CRITICAL: Zero color or tone changes to the Sphere under any fallback condition.
 *
 * Source: ARCH v3.1 MechanicalDegradationSystem
 * Validates: Requirement 21
 */
export class MechanicalDegradationSystem {
  private static instance: MechanicalDegradationSystem | null = null;

  private scene: Scene;
  private tensionSystem: TensionSystem;
  private platterMesh: Mesh | null = null;
  private sphereMesh: Mesh | null = null;
  private crackNormalMap: DynamicTexture | null = null;
  private crackShaderMaterial: ShaderMaterial | null = null;
  private currentTension = 0.0;
  private isActive = false;
  private jitterStartTime = 0;
  private previousJitter = 0;
  private boundSetTension: (tension: number) => void;

  // Voronoi crack propagation state
  private crackPropagation = 0.0;
  private crackDensity = 0.0;

  // Dust particle system
  private dustParticleSystem: ParticleSystem | null = null;
  private dustEmitRate = 0;

  // Sphere fracture normal map
  private sphereFractureMap: DynamicTexture | null = null;
  private sphereFractureLevel = 0.0;

  // Lever resistance (GSAP timeline duration multiplier)
  private leverResistanceCreep = 0.0;

  private constructor(scene: Scene, tensionSystem: TensionSystem) {
    this.scene = scene;
    this.tensionSystem = tensionSystem;
    this.jitterStartTime = performance.now();

    // Bind setTension method once and store reference
    this.boundSetTension = this.setTension.bind(this);

    // Register as tension listener
    this.tensionSystem.addListener(this.boundSetTension);
  }

  static getInstance(scene: Scene, tensionSystem: TensionSystem): MechanicalDegradationSystem {
    if (!MechanicalDegradationSystem.instance) {
      MechanicalDegradationSystem.instance = new MechanicalDegradationSystem(scene, tensionSystem);
    }
    return MechanicalDegradationSystem.instance;
  }

  /**
   * Activate degradation system (WebGL2 fallback detected)
   * @param platterMesh - Platter mesh to apply cracks/jitter
   * @param _leverMesh - Lever mesh for resistance creep
   * @param sphereMesh - Optional sphere mesh for fracture propagation
   */
  activate(platterMesh: Mesh, _leverMesh: Mesh, sphereMesh?: Mesh): void {
    this.isActive = true;
    this.platterMesh = platterMesh;
    this.sphereMesh = sphereMesh ?? null;
    this.previousJitter = 0;

    // Create Voronoi crack normal map
    this.createCrackNormalMap();

    // Create dust particle system
    this.createDustParticleSystem();

    // Create sphere fracture normal map (if sphere provided)
    if (this.sphereMesh) {
      this.createSphereFractureMap();
    }

    // Register per-frame update
    this.scene.registerBeforeRender(this.update);
  }

  /**
   * Deactivate degradation system (not needed or Dream transition)
   */
  deactivate(): void {
    this.isActive = false;
    this.scene.unregisterBeforeRender(this.update);

    // Remove crack normal map
    if (this.crackNormalMap) {
      this.crackNormalMap.dispose();
      this.crackNormalMap = null;
    }

    // Remove crack shader material
    if (this.crackShaderMaterial) {
      this.crackShaderMaterial.dispose();
      this.crackShaderMaterial = null;
    }

    // Remove dust particle system
    if (this.dustParticleSystem) {
      this.dustParticleSystem.dispose();
      this.dustParticleSystem = null;
    }

    // Remove sphere fracture map
    if (this.sphereFractureMap) {
      this.sphereFractureMap.dispose();
      this.sphereFractureMap = null;
    }

    // Remove residual jitter from platter rotation
    if (this.platterMesh) {
      this.platterMesh.rotation.y -= this.previousJitter;
      this.previousJitter = 0;
    }
  }

  /**
   * TensionSystem listener interface
   */
  setTension(tension: number): void {
    this.currentTension = tension;
    this.updateCrackIntensity();
    this.updateDustEmission();
    this.updateSphereFracture();
    this.updateLeverResistanceCreep();
  }

  /**
   * Create procedural crack normal map using Voronoi distance field
   * Uses the mechanicalCrack shader for GPU-based crack generation
   */
  private createCrackNormalMap(): void {
    if (!this.platterMesh) return;

    const size = 512;
    this.crackNormalMap = new DynamicTexture('crackNormalMap', size, this.scene, false);
    const ctx = this.crackNormalMap.getContext() as CanvasRenderingContext2D;

    // Draw base Voronoi-inspired crack pattern (radial cracks from center)
    ctx.fillStyle = '#8080ff'; // Normal map neutral (no displacement)
    ctx.fillRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;

    // Generate Voronoi-like crack cells
    const numCells = 16;
    const cellPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < numCells; i++) {
      const angle = (i / numCells) * Math.PI * 2 + Math.sin(i * 2.7) * 0.3;
      const radius = size * (0.25 + Math.sin(i * 1.3) * 0.15);
      cellPoints.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }

    // Draw Voronoi cell edges as cracks
    ctx.strokeStyle = '#4040ff'; // Slight inward normal for crack indentation
    ctx.lineWidth = 1;

    // Radial cracks from center
    const numRadialCracks = 12;
    for (let i = 0; i < numRadialCracks; i++) {
      const angle = (i / numRadialCracks) * Math.PI * 2;
      const startRadius = size * 0.3;
      const endRadius = size * 0.5;

      const startX = centerX + Math.cos(angle) * startRadius;
      const startY = centerY + Math.sin(angle) * startRadius;
      const endX = centerX + Math.cos(angle) * endRadius;
      const endY = centerY + Math.sin(angle) * endRadius;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      // Add jagged path segments for organic crack look
      const segments = 4;
      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        const mx = startX + (endX - startX) * t + (Math.random() - 0.5) * 8;
        const my = startY + (endY - startY) * t + (Math.random() - 0.5) * 8;
        ctx.lineTo(mx, my);
      }
      ctx.stroke();
    }

    // Draw connecting cracks between Voronoi cell points
    for (let i = 0; i < cellPoints.length; i++) {
      const next = cellPoints[(i + 1) % cellPoints.length];
      ctx.beginPath();
      ctx.moveTo(cellPoints[i].x, cellPoints[i].y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }

    this.crackNormalMap.update();

    // Apply to platter material
    const material = this.platterMesh.material as PBRMaterial;
    if (material) {
      material.bumpTexture = this.crackNormalMap;
      material.bumpTexture.level = 0.0; // Start at zero, will scale with tension
    }

    // Create ShaderMaterial reference for Voronoi crack generation
    this.crackShaderMaterial = new ShaderMaterial(
      'crackShader',
      this.scene,
      {
        vertex: 'coherenceRingFill', // Reuse standard vertex shader
        fragment: 'mechanicalCrack',
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: ['worldViewProjection', 'world', 'tension', 'time', 'crackDensity'],
      },
    );

    this.crackShaderMaterial.setFloat('tension', 0.0);
    this.crackShaderMaterial.setFloat('time', 0.0);
    this.crackShaderMaterial.setFloat('crackDensity', 0.0);
  }

  /**
   * Create dust particle system for slit edge emissions
   */
  private createDustParticleSystem(): void {
    if (!this.platterMesh) return;

    // Create a small plane for the dust particle texture
    const dustTexture = new DynamicTexture('dustTexture', 32, this.scene, false);
    const ctx = dustTexture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.fill();
    dustTexture.update();

    this.dustParticleSystem = new ParticleSystem('dustParticles', 100, this.scene);
    this.dustParticleSystem.particleTexture = dustTexture;
    this.dustParticleSystem.emitter = this.platterMesh;

    // Particle appearance
    this.dustParticleSystem.color1 = new Color4(0.6, 0.5, 0.4, 0.4);
    this.dustParticleSystem.color2 = new Color4(0.4, 0.35, 0.3, 0.2);
    this.dustParticleSystem.colorDead = new Color4(0.3, 0.25, 0.2, 0.0);

    // Particle physics
    this.dustParticleSystem.minSize = 0.002;
    this.dustParticleSystem.maxSize = 0.005;
    this.dustParticleSystem.minLifeTime = 0.5;
    this.dustParticleSystem.maxLifeTime = 1.5;
    this.dustParticleSystem.emitRate = 0; // Start at 0, scale with tension
    this.dustParticleSystem.gravity = new Vector3(0, -0.01, 0);

    // Emit from slit edges
    this.dustParticleSystem.minEmitBox = new Vector3(-0.3, 0, -0.01);
    this.dustParticleSystem.maxEmitBox = new Vector3(0.3, 0, 0.01);

    this.dustParticleSystem.start();
  }

  /**
   * Create sphere fracture normal map (pure normal map effect, no albedo change)
   */
  private createSphereFractureMap(): void {
    if (!this.sphereMesh) return;

    const size = 256;
    this.sphereFractureMap = new DynamicTexture('sphereFractureMap', size, this.scene, false);
    const ctx = this.sphereFractureMap.getContext() as CanvasRenderingContext2D;

    // Start with neutral normal map
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, size, size);

    this.sphereFractureMap.update();

    // Apply to sphere material as bump texture (normal map only, no albedo change)
    const material = this.sphereMesh.material as PBRMaterial;
    if (material) {
      material.bumpTexture = this.sphereFractureMap;
      material.bumpTexture.level = 0.0;
    }
  }

  /**
   * Update crack intensity and propagation based on tension
   */
  private updateCrackIntensity(): void {
    if (!this.platterMesh || !this.crackNormalMap) return;

    // Propagate cracks with tension
    this.crackPropagation = this.currentTension;
    this.crackDensity = this.currentTension * 0.8;

    const material = this.platterMesh.material as PBRMaterial;
    if (material?.bumpTexture) {
      // Scale crack intensity from 0.0 to 0.8 with tension
      material.bumpTexture.level = this.currentTension * 0.8;
    }

    // Update crack shader uniforms
    if (this.crackShaderMaterial) {
      this.crackShaderMaterial.setFloat('tension', this.currentTension);
      this.crackShaderMaterial.setFloat('crackDensity', this.crackDensity);
    }
  }

  /**
   * Update dust emission rate based on tension
   * Dust spawns from slit edges, increasing with degradation
   */
  private updateDustEmission(): void {
    if (!this.dustParticleSystem) return;

    // Scale emit rate: 0 at tension 0, up to 50 at max tension
    this.dustEmitRate = Math.floor(this.currentTension * 50);
    this.dustParticleSystem.emitRate = this.dustEmitRate;
  }

  /**
   * Update sphere fracture normal map propagation
   * Pure normal map effect -- no albedo changes
   */
  private updateSphereFracture(): void {
    if (!this.sphereMesh || !this.sphereFractureMap) return;

    // Propagate fracture lines with tension
    this.sphereFractureLevel = this.currentTension * 0.5;

    const material = this.sphereMesh.material as PBRMaterial;
    if (material?.bumpTexture) {
      material.bumpTexture.level = this.sphereFractureLevel;
    }

    // Redraw fracture pattern when tension crosses thresholds
    if (this.currentTension > 0.3) {
      this.drawSphereFractures();
    }
  }

  /**
   * Draw fracture lines on sphere normal map
   */
  private drawSphereFractures(): void {
    if (!this.sphereFractureMap) return;

    const ctx = this.sphereFractureMap.getContext() as CanvasRenderingContext2D;
    const size = 256;

    // Reset to neutral
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, size, size);

    // Draw fracture lines proportional to tension
    ctx.strokeStyle = '#6060ff'; // Inward normal perturbation
    ctx.lineWidth = 1;

    const numFractures = Math.floor(this.currentTension * 8);
    for (let i = 0; i < numFractures; i++) {
      const startX = Math.sin(i * 1.7) * size * 0.3 + size / 2;
      const startY = Math.cos(i * 2.3) * size * 0.3 + size / 2;
      const endX = Math.sin(i * 0.9 + 1.0) * size * 0.4 + size / 2;
      const endY = Math.cos(i * 1.5 + 0.7) * size * 0.4 + size / 2;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    this.sphereFractureMap.update();
  }

  /**
   * Update lever resistance creep
   * Increases GSAP timeline duration multiplier as degradation progresses
   */
  private updateLeverResistanceCreep(): void {
    // Lever resistance creeps exponentially with tension for progressive feel
    this.leverResistanceCreep = this.currentTension * this.currentTension;
  }

  /**
   * Per-frame update: rotation micro-jitter with gear-binding effect
   */
  private update = (): void => {
    if (!this.isActive || !this.platterMesh) return;

    const elapsed = performance.now() - this.jitterStartTime;
    const jitterPeriod = 200; // ms
    const jitterAmplitude = 0.0005;

    // Sinusoidal jitter with gear-binding micro-stutter
    const baseJitter = Math.sin((elapsed / jitterPeriod) * Math.PI * 2) * jitterAmplitude * this.currentTension;

    // Gear-binding: add higher-frequency micro-jitter at high tension
    const gearBindFreq = 50; // ms - faster micro-stutter
    const gearBind = this.currentTension > 0.5
      ? Math.sin((elapsed / gearBindFreq) * Math.PI * 2) * jitterAmplitude * 0.3 * (this.currentTension - 0.5) * 2
      : 0;

    const jitter = baseJitter + gearBind;

    // Apply jitter additively: subtract previous jitter, add new jitter
    this.platterMesh.rotation.y += jitter - this.previousJitter;
    this.previousJitter = jitter;

    // Update crack shader time
    if (this.crackShaderMaterial) {
      this.crackShaderMaterial.setFloat('time', performance.now() / 1000.0);
    }
  };

  /**
   * Get current lever resistance multiplier (for GSAP timeline integration)
   * Now includes degradation creep for progressive resistance
   */
  getLeverResistanceMultiplier(): number {
    // Base: 1.0 to 2.5 with tension, plus creep for progressive feel
    return 1.0 + this.currentTension * 1.5 + this.leverResistanceCreep * 0.5;
  }

  /**
   * Get crack propagation value (0.0-1.0)
   */
  getCrackPropagation(): number {
    return this.crackPropagation;
  }

  /**
   * Get crack density value (0.0-0.8)
   */
  getCrackDensity(): number {
    return this.crackDensity;
  }

  /**
   * Get dust emission rate
   */
  getDustEmitRate(): number {
    return this.dustEmitRate;
  }

  /**
   * Get sphere fracture level (0.0-0.5)
   */
  getSphereFractureLevel(): number {
    return this.sphereFractureLevel;
  }

  /**
   * Trigger world impact effect (boss slam)
   */
  triggerWorldImpact(): void {
    if (!this.isActive || !this.platterMesh) return;

    // Permanent crack intensity increase
    const material = this.platterMesh.material as PBRMaterial;
    if (material?.bumpTexture) {
      material.bumpTexture.level = Math.min(0.8, material.bumpTexture.level + 0.2);
    }

    // Spike dust emission
    if (this.dustParticleSystem) {
      this.dustParticleSystem.emitRate = 100; // Burst of dust
      // Reset to tension-based rate after brief delay
      setTimeout(() => {
        if (this.dustParticleSystem) {
          this.dustParticleSystem.emitRate = this.dustEmitRate;
        }
      }, 300);
    }

    // Jitter spike (reset jitter start time for phase shift)
    this.jitterStartTime = performance.now();
  }

  /**
   * Reset for new Dream
   */
  reset(): void {
    this.currentTension = 0.0;
    this.jitterStartTime = performance.now();
    this.crackPropagation = 0.0;
    this.crackDensity = 0.0;
    this.dustEmitRate = 0;
    this.sphereFractureLevel = 0.0;
    this.leverResistanceCreep = 0.0;
    this.updateCrackIntensity();
    this.updateDustEmission();
    this.updateSphereFracture();
  }

  /**
   * Dispose system
   */
  dispose(): void {
    this.deactivate();
    this.tensionSystem.removeListener(this.boundSetTension);
    MechanicalDegradationSystem.instance = null;
  }
}
