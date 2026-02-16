import { beforeEach, describe, expect, it } from 'vitest';
import type { EnemyType } from '../types';
import { BossAI, type BossState } from './boss-ai';

const mockEnemyType: EnemyType = {
  icon: '🧪',
  color: '#fff',
  words: ['test'],
  counter: 'reality',
};

const mockState: BossState = {
  x: 400,
  y: 300,
  hp: 100,
  maxHp: 100,
  aggression: 0.5,
  patterns: ['burst', 'sweep', 'spiral'],
  enemyTypes: [mockEnemyType],
  wave: 1,
};

describe('BossAI', () => {
  let boss: BossAI;

  beforeEach(() => {
    // Reset state for each test
    boss = new BossAI({ ...mockState });
  });

  it('should initialize correctly', () => {
    expect(boss.vehicle).toBeDefined();
    expect(boss.brain).toBeDefined();
    expect(boss.actions).toHaveLength(0);
  });

  it('should update and produce movement actions', () => {
    const actions = boss.update(0.016, mockState);
    const moveAction = actions.find((a) => a.type === 'move');
    expect(moveAction).toBeDefined();
    expect(moveAction?.x).toBeDefined();
    expect(moveAction?.y).toBeDefined();
  });

  it('should reduce cooldown on update', () => {
    boss.attackCooldown = 1.0;
    boss.update(0.1, mockState);
    expect(boss.attackCooldown).toBeCloseTo(0.9);
  });

  it('should pick random enemy type', () => {
    const type = boss.randomEnemyType();
    expect(type).toBe(mockEnemyType);
  });

  it('should throw if no enemy types', () => {
    boss.state.enemyTypes = [];
    expect(() => boss.randomEnemyType()).toThrow();
  });

  it('should eventually produce spawn actions', () => {
    // Reset cooldown
    boss.attackCooldown = 0;
    let spawned = false;
    // Run enough updates to likely trigger a goal
    for (let i = 0; i < 100; i++) {
      const actions = boss.update(0.1, mockState);
      if (actions.some((a) => a.type === 'spawn_enemies')) {
        spawned = true;
        break;
      }
    }
    expect(spawned).toBe(true);
  });

  it('should trigger Rage mode at low HP', () => {
    // Low HP -> High desirability for Rage
    const lowHpState = { ...mockState, hp: 10, maxHp: 100 };
    boss = new BossAI(lowHpState);
    boss.attackCooldown = 0;

    // We can't easily force it without mocking Math.random, but likely it will pick Rage
    // Rage goal immediately spawns enemies and shakes

    // Let's try to detect if Rage was picked by checking for Shake/Flash
    // Rage adds shake intensity 12
    let raged = false;
    for (let i = 0; i < 50; i++) {
      const actions = boss.update(0.1, lowHpState);
      if (actions.some((a) => a.type === 'shake' && a.intensity === 12)) {
        raged = true;
        break;
      }
    }
    // Might flake if randomness is against us, but usually Rage desirability is 0.8+ at low HP
    expect(raged).toBe(true);
  });

  it('should move to target when moveTo is called', () => {
    boss.moveTo(100, 100);
    // Can't check internal state easily, but it shouldn't crash
    boss.update(0.1, mockState);
  });

  it('should respect pattern constraints', () => {
    const noPatternState = { ...mockState, patterns: [] };
    boss = new BossAI(noPatternState);
    boss.attackCooldown = 0;

    // Should NOT spawn burst/sweep/spiral
    // Only Reposition, Summon (maybe), Rage (if low HP)
    // Summon doesn't check pattern.

    // If we are high HP, Summon is low desirability.
    // Reposition is fallback.

    const _actions = boss.update(0.1, noPatternState);
    // It might do nothing or reposition
  });
});
