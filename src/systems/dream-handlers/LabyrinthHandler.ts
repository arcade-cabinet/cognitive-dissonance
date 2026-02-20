/**
 * LabyrinthDream handler
 *
 * Mechanics:
 * - An invisible maze is mapped onto the sphere surface
 * - A glowing "guide particle" moves across the sphere surface based on sphere rotation
 * - Player tilts sphere to guide particle through the maze to a target zone
 * - mazeComplexity determines maze density (3=simple, 8=complex)
 * - wallBounce: 'elastic' = particle bounces off walls, 'sticky' = particle stops at walls
 * - targetZoneSize is the angular size of the target (larger = easier)
 * - mazeRotationOffset rotates the entire maze (seed-derived for variety)
 * - Particle reaching target = tension decrease bonus
 * - Particle hitting walls = small tension increase
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

type WallBounceType = 'elastic' | 'sticky';

/** 2D grid cell for the maze */
interface MazeCell {
  row: number;
  col: number;
  wallTop: boolean;
  wallRight: boolean;
  wallBottom: boolean;
  wallLeft: boolean;
  visited: boolean;
}

/** Guide particle position on the sphere surface (in angular coordinates) */
interface ParticlePosition {
  theta: number; // Azimuthal angle (0 to 2*PI)
  phi: number;   // Polar angle (0 to PI)
}

export class LabyrinthHandler implements DreamHandler {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future entity access and disposed in dispose()
  private entity: GameEntity | null = null;
  private scene: Scene | null = null;
  private sphereMesh: Mesh | null = null;
  private morphCubeMesh: Mesh | null = null;

  // Slot parameters
  private mazeComplexity = 5;
  private particleSpeed = 1.0;
  private targetZoneSize = 0.1;
  private wallBounce: WallBounceType = 'elastic';
  private mazeRotationOffset = 0;

  // Runtime state
  private maze: MazeCell[][] = [];
  private particle: ParticlePosition = { theta: 0, phi: Math.PI / 2 };
  private targetZone: ParticlePosition = { theta: Math.PI, phi: Math.PI / 2 };
  private previousSphereRotation = { x: 0, y: 0 };
  private particleMesh: Mesh | null = null;
  private targetReached = false;
  private wallHitCooldown = 0; // Prevents rapid tension spikes from repeated wall hits

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;

    // Read slot parameters from archetype
    const slots = entity.archetype?.slots;
    if (slots && 'mazeComplexity' in slots) {
      this.mazeComplexity = slots.mazeComplexity;
      this.particleSpeed = slots.particleSpeed;
      this.targetZoneSize = slots.targetZoneSize;
      this.wallBounce = slots.wallBounce;
      this.mazeRotationOffset = slots.mazeRotationOffset;
    }

    // Find meshes
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;
    this.morphCubeMesh = scene.getMeshByName('morphCube') as Mesh;

    if (!this.sphereMesh) {
      console.warn('[LabyrinthHandler] Sphere mesh not found in scene');
    }

    // Store initial sphere rotation
    if (this.sphereMesh) {
      this.previousSphereRotation = {
        x: this.sphereMesh.rotation.x,
        y: this.sphereMesh.rotation.y,
      };
    }

    // Generate maze
    this.generateMaze();

    // Place particle at start (top-left corner of maze in angular space)
    this.particle = {
      theta: this.mazeRotationOffset,
      phi: Math.PI * 0.3,
    };

    // Place target zone at end (bottom-right corner of maze in angular space)
    this.targetZone = {
      theta: this.mazeRotationOffset + Math.PI,
      phi: Math.PI * 0.7,
    };

    this.targetReached = false;
    this.wallHitCooldown = 0;

    // Visual indicator for target zone on morph cube (if present)
    if (this.morphCubeMesh) {
      gsap.to(this.morphCubeMesh.rotation, {
        y: Math.PI * 2,
        duration: 8,
        ease: 'none',
        repeat: -1,
      });
    }
  }

  update(dt: number): void {
    if (!this.sphereMesh || this.targetReached) return;

    // Calculate sphere rotation delta
    const deltaX = this.sphereMesh.rotation.x - this.previousSphereRotation.x;
    const deltaY = this.sphereMesh.rotation.y - this.previousSphereRotation.y;

    // Store for next frame
    this.previousSphereRotation = {
      x: this.sphereMesh.rotation.x,
      y: this.sphereMesh.rotation.y,
    };

    // Move particle based on sphere rotation delta
    const proposedTheta = this.particle.theta + deltaY * this.particleSpeed;
    const proposedPhi = this.particle.phi + deltaX * this.particleSpeed;

    // Check wall collisions
    const collision = this.checkWallCollision(proposedTheta, proposedPhi);

    // Decrease wall hit cooldown
    this.wallHitCooldown = Math.max(0, this.wallHitCooldown - dt);

    if (collision) {
      // Wall hit
      if (this.wallBounce === 'elastic') {
        // Elastic: bounce back (don't move, or slightly reverse)
        // Particle stays in place (effectively bounces back to where it was)
      } else {
        // Sticky: particle stops at wall
        // Don't update position
      }

      // Small tension increase on wall hit (with cooldown)
      if (this.wallHitCooldown <= 0 && this.scene?.metadata) {
        this.scene.metadata.currentTension = Math.min(
          1,
          (this.scene.metadata.currentTension ?? 0) + 0.02,
        );
        this.wallHitCooldown = 0.3; // 300ms cooldown
      }
    } else {
      // No collision — update particle position
      this.particle.theta = proposedTheta;
      this.particle.phi = Math.max(0.1, Math.min(Math.PI - 0.1, proposedPhi));
    }

    // Check if particle reached target zone
    const distToTarget = this.angularDistance(this.particle, this.targetZone);
    if (distToTarget <= this.targetZoneSize) {
      this.targetReached = true;
      // Tension decrease bonus
      if (this.scene?.metadata) {
        this.scene.metadata.currentTension = Math.max(
          0,
          (this.scene.metadata.currentTension ?? 0) - 0.12,
        );
      }
    }
  }

  /** Generate a simple grid-based maze using recursive backtracking */
  private generateMaze(): void {
    const size = this.mazeComplexity;
    this.maze = [];

    // Initialize grid with all walls
    for (let row = 0; row < size; row++) {
      this.maze[row] = [];
      for (let col = 0; col < size; col++) {
        this.maze[row][col] = {
          row,
          col,
          wallTop: true,
          wallRight: true,
          wallBottom: true,
          wallLeft: true,
          visited: false,
        };
      }
    }

    // Recursive backtracking
    const stack: MazeCell[] = [];
    const start = this.maze[0][0];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.removeWall(current, next);
        next.visited = true;
        stack.push(next);
      }
    }
  }

  /** Get unvisited neighbors for maze generation */
  private getUnvisitedNeighbors(cell: MazeCell): MazeCell[] {
    const { row, col } = cell;
    const neighbors: MazeCell[] = [];
    const size = this.mazeComplexity;

    if (row > 0 && !this.maze[row - 1][col].visited) neighbors.push(this.maze[row - 1][col]);
    if (row < size - 1 && !this.maze[row + 1][col].visited) neighbors.push(this.maze[row + 1][col]);
    if (col > 0 && !this.maze[row][col - 1].visited) neighbors.push(this.maze[row][col - 1]);
    if (col < size - 1 && !this.maze[row][col + 1].visited) neighbors.push(this.maze[row][col + 1]);

    return neighbors;
  }

  /** Remove wall between two adjacent cells */
  private removeWall(a: MazeCell, b: MazeCell): void {
    const dRow = b.row - a.row;
    const dCol = b.col - a.col;

    if (dRow === -1) {
      a.wallTop = false;
      b.wallBottom = false;
    } else if (dRow === 1) {
      a.wallBottom = false;
      b.wallTop = false;
    } else if (dCol === -1) {
      a.wallLeft = false;
      b.wallRight = false;
    } else if (dCol === 1) {
      a.wallRight = false;
      b.wallLeft = false;
    }
  }

  /** Check if moving to the proposed position would hit a wall */
  private checkWallCollision(theta: number, phi: number): boolean {
    const size = this.mazeComplexity;

    // Map angular position to maze grid cell
    const normalizedTheta = ((theta - this.mazeRotationOffset) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const col = Math.floor((normalizedTheta / (Math.PI * 2)) * size) % size;
    const row = Math.floor((phi / Math.PI) * size);

    // Clamp row to valid range
    const clampedRow = Math.max(0, Math.min(size - 1, row));
    const clampedCol = Math.max(0, Math.min(size - 1, col));

    // Map current particle position to cell
    const currentNormTheta = ((this.particle.theta - this.mazeRotationOffset) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const currentCol = Math.floor((currentNormTheta / (Math.PI * 2)) * size) % size;
    const currentRow = Math.max(0, Math.min(size - 1, Math.floor((this.particle.phi / Math.PI) * size)));

    // If same cell, no wall collision
    if (clampedRow === currentRow && clampedCol === currentCol) return false;

    // Check if wall exists between current cell and proposed cell
    if (!this.maze[currentRow] || !this.maze[currentRow][currentCol]) return true;

    const cell = this.maze[currentRow][currentCol];
    const dRow = clampedRow - currentRow;
    const dCol = clampedCol - currentCol;

    if (dRow === -1 && cell.wallTop) return true;
    if (dRow === 1 && cell.wallBottom) return true;
    if (dCol === -1 && cell.wallLeft) return true;
    if (dCol === 1 && cell.wallRight) return true;

    return false;
  }

  /** Calculate angular distance between two positions on the sphere */
  private angularDistance(a: ParticlePosition, b: ParticlePosition): number {
    const dTheta = a.theta - b.theta;
    const dPhi = a.phi - b.phi;
    return Math.sqrt(dTheta * dTheta + dPhi * dPhi);
  }

  /** Get current particle position (for external system / visual feedback) */
  getParticlePosition(): Readonly<ParticlePosition> {
    return this.particle;
  }

  /** Get target zone position */
  getTargetZone(): Readonly<ParticlePosition> {
    return this.targetZone;
  }

  /** Check if target has been reached */
  isTargetReached(): boolean {
    return this.targetReached;
  }

  /** Get the maze grid (for rendering) */
  getMaze(): ReadonlyArray<ReadonlyArray<MazeCell>> {
    return this.maze;
  }

  dispose(): void {
    if (this.morphCubeMesh) {
      gsap.killTweensOf(this.morphCubeMesh.rotation);
    }
    if (this.particleMesh) {
      this.particleMesh.dispose();
      this.particleMesh = null;
    }
    this.entity = null;
    this.scene = null;
    this.sphereMesh = null;
    this.morphCubeMesh = null;
    this.maze = [];
    this.particle = { theta: 0, phi: Math.PI / 2 };
    this.targetReached = false;
    this.wallHitCooldown = 0;
  }
}

// Self-register
registerHandler('Labyrinth', LabyrinthHandler);
