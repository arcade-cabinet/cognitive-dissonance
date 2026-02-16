import { beforeEach, describe, expect, it } from 'vitest';
import { Goal } from 'yuka';
import type { EnemyType } from '../types';
import {
  BossAI,
  type BossState,
  BurstAttackGoal,
  BurstEvaluator,
  RageEvaluator,
  RageGoal,
  RepositionEvaluator,
  RepositionGoal,
  SpiralAttackGoal,
  SpiralEvaluator,
  SummonEvaluator,
  SummonGoal,
  SweepAttackGoal,
  SweepEvaluator,
} from './boss-ai';

const mockEnemyType: EnemyType = {
  name: 'test',
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

  describe('Goals', () => {
    it('BurstAttackGoal should spawn enemies and flash', () => {
      const goal = new BurstAttackGoal(boss);
      goal.activate();
      goal.execute();

      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
      expect(boss.actions.some((a) => a.type === 'flash')).toBe(true);
      expect(boss.attackCooldown).toBeGreaterThan(0);
      expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    });

    it('SweepAttackGoal should spawn enemies over time', () => {
      const goal = new SweepAttackGoal(boss);
      goal.activate();

      // First execution sets move target
      goal.execute();
      expect(boss.moveTarget).toBeDefined();

      // Simulate time passing and calls
      for (let i = 0; i < 20; i++) {
        boss.frameDelta = 0.1;
        goal.execute();
      }

      // Should have spawned enemies
      // Note: Sweep spawns multiple times
      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
      expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    });

    it('SpiralAttackGoal should spawn enemies in spiral', () => {
      const goal = new SpiralAttackGoal(boss);
      goal.activate();

      // Simulate execution
      for (let i = 0; i < 20; i++) {
        boss.frameDelta = 0.1;
        goal.execute();
      }

      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
      expect(boss.actions.some((a) => a.type === 'shake')).toBe(true); // Should shake at end
      expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    });

    it('RepositionGoal should move boss', () => {
      const goal = new RepositionGoal(boss);
      goal.activate();
      goal.execute();

      // Check if goal completed
      expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    });

    it('SummonGoal should spawn minions', () => {
      const goal = new SummonGoal(boss);
      goal.execute();

      const spawnAction = boss.actions.find((a) => a.type === 'spawn_enemies');
      expect(spawnAction).toBeDefined();
      expect(spawnAction?.enemies?.[0].child).toBe(true);
      expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    });

    it('RageGoal should spawn enemies and shake violently', () => {
      const goal = new RageGoal(boss);
      goal.execute();

      expect(boss.actions.some((a) => a.type === 'shake' && a.intensity === 12)).toBe(true);
      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
      expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    });
  });

  describe('Evaluators', () => {
    it('BurstEvaluator should return score when available', () => {
      const evaluator = new BurstEvaluator(boss, 1.0);
      boss.attackCooldown = 0;
      const score = evaluator.calculateDesirability();
      expect(score).toBeGreaterThan(0);
    });

    it('BurstEvaluator should return 0 when on cooldown', () => {
      const evaluator = new BurstEvaluator(boss, 1.0);
      boss.attackCooldown = 1.0;
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('SweepEvaluator should return score', () => {
      const evaluator = new SweepEvaluator(boss, 0.9);
      boss.attackCooldown = 0;
      expect(evaluator.calculateDesirability()).toBeGreaterThan(0);
    });

    it('SpiralEvaluator should return score', () => {
      const evaluator = new SpiralEvaluator(boss, 0.7);
      boss.attackCooldown = 0;
      expect(evaluator.calculateDesirability()).toBeGreaterThan(0);
    });

    it('RepositionEvaluator should return score even on cooldown', () => {
      const evaluator = new RepositionEvaluator(boss, 0.5);
      boss.attackCooldown = 5.0; // on cooldown
      expect(evaluator.calculateDesirability()).toBeGreaterThan(0);
    });

    it('SummonEvaluator should favor low HP', () => {
      const evaluator = new SummonEvaluator(boss, 0.6);
      boss.attackCooldown = 0;
      boss.state.hp = 10;

      // Randomness makes direct comparison tricky, but we can check it returns > 0
      expect(evaluator.calculateDesirability()).toBeGreaterThan(0);
    });

    it('RageEvaluator should return 0 if HP high', () => {
      const evaluator = new RageEvaluator(boss, 1.2);
      boss.state.hp = 100;
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('RageEvaluator should return high score if HP low', () => {
      const evaluator = new RageEvaluator(boss, 1.2);
      boss.state.hp = 10;
      boss.attackCooldown = 0;
      expect(evaluator.calculateDesirability()).toBeGreaterThan(0.8);
    });
  });
});
