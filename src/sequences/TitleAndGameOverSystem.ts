import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';

/**
 * TitleAndGameOverSystem — Diegetic title and game-over text planes
 *
 * Requirement 19.3: "COGNITIVE DISSONANCE" plane on platter rim, animated in via GSAP back.out ease
 * Requirement 19.4: "COGNITION SHATTERED" plane on sphere, red static text, GSAP yoyo scaling × 3
 *
 * Source: ARCH v3.7 TitleAndGameOverSystem
 */
export class TitleAndGameOverSystem {
  private titlePlane: Mesh | null = null;
  private gameOverPlane: Mesh | null = null;
  private titleTimeline: gsap.core.Timeline | null = null;
  private gameOverTimeline: gsap.core.Timeline | null = null;

  constructor(private scene: Scene) {}

  /**
   * Display "COGNITIVE DISSONANCE" title on platter rim
   * Animated in via GSAP back.out ease
   */
  showTitle(platterMesh: Mesh): void {
    if (this.titlePlane) {
      this.hideTitle();
    }

    // Create plane mesh for title
    this.titlePlane = MeshBuilder.CreatePlane(
      'titlePlane',
      {
        width: 1.0,
        height: 0.15,
      },
      this.scene,
    );

    // Position on platter rim (front edge)
    this.titlePlane.position.set(0, 0.1, 0.6);
    this.titlePlane.parent = platterMesh;

    // Create dynamic texture with text
    const texture = new DynamicTexture('titleTexture', { width: 1024, height: 256 }, this.scene);
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#1a1a1a'; // near-black background
    ctx.fillRect(0, 0, 1024, 256);
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#e0e0e0'; // light gray text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COGNITIVE DISSONANCE', 512, 128);
    texture.update();

    // Create material with texture
    const material = new StandardMaterial('titleMaterial', this.scene);
    material.diffuseTexture = texture;
    material.emissiveColor = new Color3(0.3, 0.3, 0.3); // subtle glow
    material.backFaceCulling = false;

    this.titlePlane.material = material;

    // GSAP animation: scale from 0 to 1 with back.out ease
    this.titlePlane.scaling.setAll(0);
    this.titleTimeline = gsap.timeline();
    this.titleTimeline.to(this.titlePlane.scaling, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.2,
      ease: 'back.out(1.7)',
    });
  }

  /**
   * Hide title plane
   */
  hideTitle(): void {
    if (this.titleTimeline) {
      this.titleTimeline.kill();
      this.titleTimeline = null;
    }
    if (this.titlePlane) {
      this.titlePlane.dispose();
      this.titlePlane = null;
    }
  }

  /**
   * Display "COGNITION SHATTERED" game-over text on sphere
   * Red static text with GSAP yoyo scaling × 3
   */
  showGameOver(sphereMesh: Mesh): void {
    if (this.gameOverPlane) {
      this.hideGameOver();
    }

    // Create plane mesh for game-over text
    this.gameOverPlane = MeshBuilder.CreatePlane(
      'gameOverPlane',
      {
        width: 1.2,
        height: 0.2,
      },
      this.scene,
    );

    // Position at sphere center (will be visible through glass)
    this.gameOverPlane.position.set(0, 0, 0);
    this.gameOverPlane.parent = sphereMesh;

    // Create dynamic texture with red static text
    const texture = new DynamicTexture('gameOverTexture', { width: 1024, height: 256 }, this.scene);
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#000000'; // black background
    ctx.fillRect(0, 0, 1024, 256);
    ctx.font = 'bold 52px monospace';
    ctx.fillStyle = '#ff3333'; // red text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COGNITION SHATTERED', 512, 128);
    texture.update();

    // Create material with texture
    const material = new StandardMaterial('gameOverMaterial', this.scene);
    material.diffuseTexture = texture;
    material.emissiveColor = new Color3(1.0, 0.2, 0.2); // red glow
    material.backFaceCulling = false;

    this.gameOverPlane.material = material;

    // GSAP yoyo scaling animation (3 repeats)
    this.gameOverPlane.scaling.setAll(1.0);
    this.gameOverTimeline = gsap.timeline({ repeat: 3, yoyo: true });
    this.gameOverTimeline.to(this.gameOverPlane.scaling, {
      x: 1.2,
      y: 1.2,
      z: 1.2,
      duration: 0.6,
      ease: 'power2.inOut',
    });
  }

  /**
   * Hide game-over plane
   */
  hideGameOver(): void {
    if (this.gameOverTimeline) {
      this.gameOverTimeline.kill();
      this.gameOverTimeline = null;
    }
    if (this.gameOverPlane) {
      this.gameOverPlane.dispose();
      this.gameOverPlane = null;
    }
  }

  /**
   * Reset system (hide all text)
   */
  reset(): void {
    this.hideTitle();
    this.hideGameOver();
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.hideTitle();
    this.hideGameOver();
  }
}
