/**
 * PinballDream handler
 *
 * Mechanics:
 * - Platter becomes a pinball field (top-down view)
 * - Ball(s) roll across platter surface using physics-like simulation
 * - Keycaps act as bumpers/targets — ball hitting a keycap = score (tension decrease 0.01)
 * - LEVER controls two flippers (left/right sides of platter)
 * - Lever position >0.5 = right flipper active, <0.5 = left flipper active
 *   (flippers deflect ball upward)
 * - bumperCount additional stationary bumpers on the field
 * - multiball: how many balls active at once (1-3)
 * - Ball falling off bottom = tension increase 0.05
 * - Ball speed increases with tension: ballSpeed * (1 + tension * 0.5)
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { PinballSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** 2D position and velocity for a pinball */
interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
}

/** A bumper on the field */
interface Bumper {
  x: number;
  y: number;
  radius: number;
}

/** Keycap target on the field */
interface KeycapTarget {
  letter: string;
  x: number;
  y: number;
  radius: number;
}

/** Field dimensions (normalized: platter is a unit square centered at 0,0) */
const FIELD_HALF_WIDTH = 0.5;
const FIELD_HALF_HEIGHT = 0.6;

/** Flipper geometry */
const FLIPPER_Y = -0.45; // Near bottom of field
const FLIPPER_LENGTH = 0.2;

/** Ball radius for collision */
const BALL_RADIUS = 0.025;

/** Bumper bounce speed multiplier */
const BUMPER_BOUNCE = 1.3;

export class PinballHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;
  private leverMesh: Mesh | null = null;

  // Slot parameters
  private ballSpeed = 1.0;
  private flipperStrength = 1.0;
  private bumperCount = 2;
  private multiball = 1;

  // Runtime state
  private balls: BallState[] = [];
  private bumpers: Bumper[] = [];
  private keycapTargets: KeycapTarget[] = [];
  private elapsedTime = 0;
  private score = 0;

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as PinballSlots | undefined;
    this.ballSpeed = slots?.ballSpeed ?? 1.0;
    this.flipperStrength = slots?.flipperStrength ?? 1.0;
    this.bumperCount = slots?.bumperCount ?? 2;
    this.multiball = slots?.multiball ?? 1;

    // Find lever mesh
    this.leverMesh = scene.getMeshByName('lever') as Mesh;

    // Place keycap targets on the field
    const keycapSubset = slots?.keycapSubset ?? ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D'];
    this.keycapTargets = [];
    for (let i = 0; i < keycapSubset.length; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      this.keycapTargets.push({
        letter: keycapSubset[i],
        x: -0.3 + col * 0.2,
        y: 0.1 + row * 0.15,
        radius: 0.04,
      });
    }

    // Place bumpers randomly in upper half of field
    this.bumpers = [];
    for (let i = 0; i < this.bumperCount; i++) {
      this.bumpers.push({
        x: (Math.random() - 0.5) * 0.6,
        y: 0.1 + Math.random() * 0.3,
        radius: 0.05,
      });
    }

    // Spawn balls
    this.balls = [];
    for (let i = 0; i < this.multiball; i++) {
      this.spawnBall();
    }

    this.elapsedTime = 0;
    this.score = 0;
  }

  update(dt: number): void {
    if (!this.scene) return;

    this.elapsedTime += dt;
    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Effective speed scales with tension
    const effectiveSpeed = this.ballSpeed * (1 + tension * 0.5);

    // Read lever position for flipper control
    const leverPos = this.leverMesh?.position.y ?? 0;
    const normalizedLever = Math.max(0, Math.min(1, (leverPos + 1) / 2));
    const leftFlipperActive = normalizedLever < 0.5;
    const rightFlipperActive = normalizedLever > 0.5;

    for (const ball of this.balls) {
      if (!ball.alive) continue;

      // Apply gravity (balls drift downward)
      ball.vy -= 0.3 * dt;

      // Move ball
      ball.x += ball.vx * effectiveSpeed * dt;
      ball.y += ball.vy * effectiveSpeed * dt;

      // Wall bounces (left/right)
      if (ball.x < -FIELD_HALF_WIDTH + BALL_RADIUS) {
        ball.x = -FIELD_HALF_WIDTH + BALL_RADIUS;
        ball.vx = Math.abs(ball.vx) * 0.9;
      } else if (ball.x > FIELD_HALF_WIDTH - BALL_RADIUS) {
        ball.x = FIELD_HALF_WIDTH - BALL_RADIUS;
        ball.vx = -Math.abs(ball.vx) * 0.9;
      }

      // Top wall bounce
      if (ball.y > FIELD_HALF_HEIGHT - BALL_RADIUS) {
        ball.y = FIELD_HALF_HEIGHT - BALL_RADIUS;
        ball.vy = -Math.abs(ball.vy) * 0.9;
      }

      // Flipper collision check (near bottom)
      if (ball.y <= FLIPPER_Y + BALL_RADIUS && ball.vy < 0) {
        // Left flipper zone
        if (leftFlipperActive && ball.x >= -FLIPPER_LENGTH && ball.x <= 0) {
          ball.vy = Math.abs(ball.vy) * this.flipperStrength;
          ball.vx += 0.2 * this.flipperStrength; // Slight rightward deflection
        }
        // Right flipper zone
        if (rightFlipperActive && ball.x >= 0 && ball.x <= FLIPPER_LENGTH) {
          ball.vy = Math.abs(ball.vy) * this.flipperStrength;
          ball.vx -= 0.2 * this.flipperStrength; // Slight leftward deflection
        }
      }

      // Ball falls off bottom
      if (ball.y < -FIELD_HALF_HEIGHT) {
        ball.alive = false;

        // Tension increase on ball loss
        if (this.scene?.metadata) {
          this.scene.metadata.currentTension = Math.min(
            1,
            (this.scene.metadata.currentTension ?? 0) + 0.05,
          );
        }

        // Respawn after a short delay (handled by checking alive balls)
        continue;
      }

      // Bumper collisions
      for (const bumper of this.bumpers) {
        const dx = ball.x - bumper.x;
        const dy = ball.y - bumper.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bumper.radius + BALL_RADIUS) {
          // Bounce away from bumper
          const nx = dx / dist;
          const ny = dy / dist;
          ball.vx = nx * Math.abs(ball.vx + ball.vy) * BUMPER_BOUNCE;
          ball.vy = ny * Math.abs(ball.vx + ball.vy) * BUMPER_BOUNCE;
          // Push ball outside bumper
          ball.x = bumper.x + nx * (bumper.radius + BALL_RADIUS + 0.01);
          ball.y = bumper.y + ny * (bumper.radius + BALL_RADIUS + 0.01);
        }
      }

      // Keycap target collisions
      for (const target of this.keycapTargets) {
        const dx = ball.x - target.x;
        const dy = ball.y - target.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < target.radius + BALL_RADIUS) {
          // Score — tension decrease
          this.score++;
          if (this.scene?.metadata) {
            this.scene.metadata.currentTension = Math.max(
              0,
              (this.scene.metadata.currentTension ?? 0) - 0.01,
            );
          }

          // Bounce off keycap
          const nx = dx / dist;
          const ny = dy / dist;
          ball.vx = nx * Math.abs(ball.vx + ball.vy) * 0.8;
          ball.vy = ny * Math.abs(ball.vx + ball.vy) * 0.8;
          ball.x = target.x + nx * (target.radius + BALL_RADIUS + 0.01);
          ball.y = target.y + ny * (target.radius + BALL_RADIUS + 0.01);
        }
      }
    }

    // Respawn dead balls
    const aliveBalls = this.balls.filter((b) => b.alive).length;
    if (aliveBalls < this.multiball) {
      this.spawnBall();
    }
  }

  /** Spawn a new ball at the top of the field */
  private spawnBall(): void {
    this.balls.push({
      x: (Math.random() - 0.5) * 0.4,
      y: FIELD_HALF_HEIGHT - 0.1,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.2,
      alive: true,
    });
  }

  /** Get ball states (for external rendering / testing) */
  getBalls(): ReadonlyArray<BallState> {
    return this.balls;
  }

  /** Get the current score */
  getScore(): number {
    return this.score;
  }

  /** Get the number of alive balls */
  getAliveBallCount(): number {
    return this.balls.filter((b) => b.alive).length;
  }

  dispose(): void {
    this.balls = [];
    this.bumpers = [];
    this.keycapTargets = [];
    this.score = 0;
    this.elapsedTime = 0;
    this.entity = null;
    this.scene = null;
    this.leverMesh = null;
  }
}

// Self-register
registerHandler('Pinball', PinballHandler);
