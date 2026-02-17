import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  SpiralAttackGoal,
  SpiralEvaluator,
  SummonEvaluator,
  SummonGoal,
  SweepAttackGoal,
  SweepEvaluator,
} from './boss-ai';

const mockEnemyType: EnemyType = {
  icon: '🦆',
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
    vi.useFakeTimers();
    boss = new BossAI({ ...mockState });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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

  it('should produce spawn actions when cooldown is 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // Force high desirability for something
    boss.attackCooldown = 0;
    const actions = boss.update(0.1, mockState);
    // It might pick move or spawn depending on arbitration, but with bias it should spawn eventually
    // To test specific logic, we test goals directly below.
    // Here just check that update runs without error.
    expect(actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
  });

  it('should move to target when moveTo is called', () => {
    boss.moveTo(100, 100);
    // Wait for cooldown
    vi.advanceTimersByTime(2000);
    // Should be back to wandering
    // We can't easily check private behavior weights, but we can ensure no crash
  });

  describe('Goals', () => {
    it('BurstAttackGoal executes correctly', () => {
      const goal = new BurstAttackGoal(boss);
      goal.activate();
      goal.execute();

      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
      expect(boss.actions.some((a) => a.type === 'flash')).toBe(true);
      expect(goal.status).toBe(Goal.STATUS.COMPLETED);
      expect(boss.attackCooldown).toBeGreaterThan(0);

      // Execute again should do nothing if completed
      boss.actions = [];
      goal.execute();
      expect(boss.actions.length).toBe(0);
    });

    it('SweepAttackGoal executes correctly', () => {
      const goal = new SweepAttackGoal(boss);
      goal.activate();

      // Simulate multiple frames
      for (let i = 0; i < 20; i++) {
        boss.frameDelta = 0.1;
        goal.execute();
      }

      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
      if (goal.status === Goal.STATUS.COMPLETED) {
        expect(boss.attackCooldown).toBeGreaterThan(0);
      }
    });

    it('SpiralAttackGoal executes correctly', () => {
      const goal = new SpiralAttackGoal(boss);
      goal.activate();

      // Simulate execution loop
      for (let i = 0; i < 50; i++) {
        boss.frameDelta = 0.1;
        goal.execute();
      }

      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
      expect(boss.actions.some((a) => a.type === 'shake')).toBe(true); // finishes with shake
    });

    it('SummonGoal executes correctly', () => {
      const goal = new SummonGoal(boss);
      goal.activate();
      goal.execute();

      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
      expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    });

    it('RageGoal executes correctly', () => {
      const goal = new RageGoal(boss);
      goal.activate();
      goal.execute();

      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
      expect(boss.actions.some((a) => a.type === 'shake')).toBe(true);
      expect(boss.actions.some((a) => a.type === 'flash')).toBe(true);
      expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    });
  });

  describe('Evaluators', () => {
    it('BurstEvaluator calculates desirability', () => {
      const evalutor = new BurstEvaluator(boss, 1.0);
      boss.attackCooldown = 1;
      expect(evalutor.calculateDesirability()).toBe(0);

      boss.attackCooldown = 0;
      boss.state.patterns = [];
      expect(evalutor.calculateDesirability()).toBe(0);

      boss.state.patterns = ['burst'];
      expect(evalutor.calculateDesirability()).toBeGreaterThan(0);

      // Test setGoal
      evalutor.setGoal(boss.vehicle);
      expect(boss.brain.subgoals.length).toBeGreaterThan(0);
    });

    it('SweepEvaluator calculates desirability', () => {
      const evalutor = new SweepEvaluator(boss, 1.0);
      boss.attackCooldown = 0;
      boss.state.patterns = ['sweep'];
      expect(evalutor.calculateDesirability()).toBeGreaterThan(0);

      evalutor.setGoal(boss.vehicle);
      expect(boss.brain.subgoals.length).toBeGreaterThan(0);
    });

    it('SpiralEvaluator calculates desirability', () => {
      const evalutor = new SpiralEvaluator(boss, 1.0);
      boss.attackCooldown = 0;
      boss.state.patterns = ['spiral'];
      expect(evalutor.calculateDesirability()).toBeGreaterThan(0);

      evalutor.setGoal(boss.vehicle);
      expect(boss.brain.subgoals.length).toBeGreaterThan(0);
    });

    it('RepositionEvaluator calculates desirability', () => {
      const evalutor = new RepositionEvaluator(boss, 1.0);
      boss.attackCooldown = 10;
      // Should be desirable when cooldown is high (fallback)
      expect(evalutor.calculateDesirability()).toBeGreaterThan(0);

      evalutor.setGoal(boss.vehicle);
      expect(boss.brain.subgoals.length).toBeGreaterThan(0);
    });

    it('SummonEvaluator calculates desirability', () => {
      const evalutor = new SummonEvaluator(boss, 1.0);
      boss.attackCooldown = 0;
      expect(evalutor.calculateDesirability()).toBeGreaterThan(0);

      evalutor.setGoal(boss.vehicle);
      expect(boss.brain.subgoals.length).toBeGreaterThan(0);
    });

    it('RageEvaluator calculates desirability', () => {
      const evalutor = new RageEvaluator(boss, 1.0);
      boss.attackCooldown = 0;
      boss.state.hp = 100;
      boss.state.maxHp = 100; // High HP
      expect(evalutor.calculateDesirability()).toBe(0);

      boss.state.hp = 10; // Low HP
      expect(evalutor.calculateDesirability()).toBeGreaterThan(0);

      evalutor.setGoal(boss.vehicle);
      expect(boss.brain.subgoals.length).toBeGreaterThan(0);
    });
  });
});
