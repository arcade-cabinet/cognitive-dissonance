/**
 * State Sync System
 *
 * Bridges the game worker's flat GameState into the ECS world.
 * Called once per frame when new state arrives from the worker.
 *
 * - Enemies: adds new, updates existing, removes departed
 * - Boss: adds/updates/removes single boss entity
 * - PowerUps: syncs from state array
 *
 * Particles, trails, and confetti are spawned by event handlers,
 * not synced from worker state (they're rendering-only).
 */

import type { GameState } from '../lib/events';
import { type Entity, world } from './world';

/** Map from game enemy ID to ECS entity for fast lookup */
const enemyEntityMap = new Map<number, Entity>();
let currentBossEntity: Entity | null = null;
/** Map from powerup ID to ECS entity for stable tracking */
const powerUpEntityMap = new Map<string, Entity>();

export function syncStateToECS(state: GameState): void {
  syncEnemies(state);
  syncBoss(state);
  syncPowerUps(state);
}

function syncEnemies(state: GameState): void {
  const activeIds = new Set<number>();

  for (const enemy of state.enemies) {
    activeIds.add(enemy.id);
    const existing = enemyEntityMap.get(enemy.id);

    if (existing) {
      // Update position
      if (existing.position) {
        existing.position.x = enemy.x;
        existing.position.y = enemy.y;
      }
      // Update enemy data
      if (existing.enemy) {
        existing.enemy.encrypted = !!enemy.encrypted;
        existing.enemy.word = enemy.word;
      }
    } else {
      // Spawn new enemy entity
      const entity = world.add({
        position: { x: enemy.x, y: enemy.y, z: 0 },
        enemy: {
          gameId: enemy.id,
          word: enemy.word,
          shape: enemy.type.shape,
          color: enemy.type.color,
          counter: enemy.counter,
          encrypted: !!enemy.encrypted,
          variant: enemy.child ? 'child' : undefined,
        },
      });
      enemyEntityMap.set(enemy.id, entity);
    }
  }

  // Remove departed enemies
  for (const [id, entity] of enemyEntityMap) {
    if (!activeIds.has(id)) {
      world.remove(entity);
      enemyEntityMap.delete(id);
    }
  }
}

function syncBoss(state: GameState): void {
  if (state.boss) {
    if (currentBossEntity) {
      // Update existing boss
      if (currentBossEntity.position) {
        currentBossEntity.position.x = state.boss.x;
        currentBossEntity.position.y = state.boss.y;
      }
      if (currentBossEntity.boss) {
        currentBossEntity.boss.hp = state.boss.hp;
        currentBossEntity.boss.maxHp = state.boss.maxHp;
        currentBossEntity.boss.iFrame = state.boss.iFrame;
      }
    } else {
      // Spawn boss
      currentBossEntity = world.add({
        position: { x: state.boss.x, y: state.boss.y, z: 0 },
        boss: {
          hp: state.boss.hp,
          maxHp: state.boss.maxHp,
          name: state.boss.name,
          iFrame: state.boss.iFrame,
        },
      });
    }
  } else if (currentBossEntity) {
    world.remove(currentBossEntity);
    currentBossEntity = null;
  }
}

function syncPowerUps(state: GameState): void {
  const activeIds = new Set<string>();

  for (const pu of state.powerups) {
    activeIds.add(pu.id);
    const existing = powerUpEntityMap.get(pu.id);

    if (existing) {
      // Update position and velocity
      if (existing.position) {
        existing.position.x = pu.x;
        existing.position.y = pu.y;
      }
      if (existing.velocity) {
        existing.velocity.vy = pu.vy;
      }
    } else {
      // Spawn new powerup entity
      const entity = world.add({
        position: { x: pu.x, y: pu.y, z: 0 },
        velocity: { vx: 0, vy: pu.vy, vz: 0 },
        powerUp: {
          icon: pu.icon,
          color: pu.color,
          dur: pu.dur,
        },
      });
      powerUpEntityMap.set(pu.id, entity);
    }
  }

  // Remove departed powerups
  for (const [id, entity] of powerUpEntityMap) {
    if (!activeIds.has(id)) {
      world.remove(entity);
      powerUpEntityMap.delete(id);
    }
  }
}

/** Spawn burst of particles at a position (called on counter events) */
export function spawnParticles(x: number, y: number, color: string, count = 15): void {
  for (let i = 0; i < count; i++) {
    world.add({
      position: { x, y, z: Math.random() * 0.5 },
      velocity: {
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8 + 0.2,
        vz: (Math.random() - 0.5) * 0.3,
      },
      particle: {
        life: 1,
        maxLife: 1,
        size: Math.random() * 0.08 + 0.02,
        color,
      },
    });
  }

  // Also spawn a trail ring
  world.add({
    position: { x, y, z: 0 },
    trail: {
      life: 1,
      radius: 0.45,
      color,
    },
  });
}

/** Spawn confetti burst (called on victory) */
export function spawnConfetti(count = 120): void {
  const colors = [
    '#e74c3c',
    '#f1c40f',
    '#2ecc71',
    '#3498db',
    '#9b59b6',
    '#ffffff',
    '#e67e22',
    '#1abc9c',
  ];
  for (let i = 0; i < count; i++) {
    world.add({
      position: {
        x: (Math.random() - 0.5) * 8,
        y: 4 + Math.random() * 2,
        z: (Math.random() - 0.5) * 2,
      },
      velocity: {
        vx: (Math.random() - 0.5) * 0.1,
        vy: -(Math.random() * 0.05 + 0.02),
        vz: (Math.random() - 0.5) * 0.05,
      },
      confetti: {
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        width: Math.random() * 0.08 + 0.03,
        height: Math.random() * 0.04 + 0.02,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      },
    });
  }
}

/** Clear all entities (on game restart) */
export function clearAllEntities(): void {
  for (const entity of [...world.entities]) {
    world.remove(entity);
  }
  enemyEntityMap.clear();
  currentBossEntity = null;
  powerUpEntityMap.clear();
}
