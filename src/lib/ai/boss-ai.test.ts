import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    boss.attackCooldown = 0;
    const actions = boss.update(0.1, mockState);
    expect(actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
  });

  it('should move to target when moveTo is called', () => {
    boss.moveTo(100, 100);
    boss.update(0.1, mockState);
    vi.advanceTimersByTime(1500);
  });

  describe('BurstEvaluator & BurstAttackGoal', () => {
    it('BurstEvaluator: should return 0 if on cooldown', () => {
      boss.attackCooldown = 1;
      const evaluator = new BurstEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('BurstEvaluator: should return 0 if pattern not available', () => {
      boss.state.patterns = ['sweep'];
      const evaluator = new BurstEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('BurstEvaluator: should return high score if valid', () => {
      boss.attackCooldown = 0;
      boss.state.patterns = ['burst'];
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const evaluator = new BurstEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBeGreaterThan(0);
    });

    it('BurstAttackGoal: should spawn enemies and complete', () => {
      const goal = new BurstAttackGoal(boss);
      goal.activate();
      goal.execute();
      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
      expect(boss.actions.some((a) => a.type === 'flash')).toBe(true);
      expect(goal.status).toBe('completed');
    });
  });

  describe('SweepEvaluator & SweepAttackGoal', () => {
    it('SweepEvaluator: should return 0 if on cooldown', () => {
      boss.attackCooldown = 1;
      const evaluator = new SweepEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('SweepEvaluator: should return 0 if pattern not available', () => {
      boss.state.patterns = ['burst'];
      const evaluator = new SweepEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('SweepAttackGoal: should spawn enemies over time', () => {
      const goal = new SweepAttackGoal(boss);
      goal.activate();

      // First update
      goal.execute();

      // Advance time to trigger spawn
      boss.frameDelta = 0.5; // Simulate time passing
      goal.execute();

      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);

      // Advance to finish
      boss.frameDelta = 2.0;
      goal.execute();
      expect(goal.status).toBe('completed');
    });
  });

  describe('SpiralEvaluator & SpiralAttackGoal', () => {
    it('SpiralEvaluator: should return 0 if on cooldown', () => {
      boss.attackCooldown = 1;
      const evaluator = new SpiralEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('SpiralEvaluator: should return 0 if pattern not available', () => {
      boss.state.patterns = ['burst'];
      const evaluator = new SpiralEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('SpiralAttackGoal: should spawn spiral and shake screen', () => {
      const goal = new SpiralAttackGoal(boss);
      goal.activate();

      // Force spawns
      boss.frameDelta = 0.3; // larger than spawnInterval
      goal.execute();

      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);

      // Advance to complete
      for(let i=0; i<20; i++) {
        goal.execute();
      }

      expect(boss.actions.some((a) => a.type === 'shake')).toBe(true);
      expect(goal.status).toBe('completed');
    });
  });

  describe('RepositionEvaluator & RepositionGoal', () => {
    it('RepositionEvaluator: should return positive desirability even on cooldown', () => {
      boss.attackCooldown = 1;
      const evaluator = new RepositionEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBeGreaterThan(0);
    });

    it('RepositionGoal: should call moveTo and complete', () => {
      const moveToSpy = vi.spyOn(boss, 'moveTo');
      const goal = new RepositionGoal(boss);
      goal.activate();
      expect(moveToSpy).toHaveBeenCalled();
      goal.execute();
      expect(goal.status).toBe('completed');
    });
  });

  describe('SummonEvaluator & SummonGoal', () => {
    it('SummonEvaluator: should return 0 on cooldown', () => {
      boss.attackCooldown = 1;
      const evaluator = new SummonEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('SummonEvaluator: should prefer low HP', () => {
      boss.attackCooldown = 0;
      boss.state.hp = 10; // Low HP
      const evalLow = new SummonEvaluator(boss, 1).calculateDesirability();

      boss.state.hp = 100; // High HP
      const evalHigh = new SummonEvaluator(boss, 1).calculateDesirability();

      // Depending on random factor, this might be flaky if we don't mock random
      // But the formula is 0.2 + hpFactor * 0.4.
      // Low HP -> hpFactor ~ 0.9 -> ~0.56 base
      // High HP -> hpFactor ~ 0 -> ~0.2 base
      // Random is 0..0.15.
      // So Low HP (min 0.56) > High HP (max 0.35) always.
      expect(evalLow).toBeGreaterThan(evalHigh);
    });

    it('SummonGoal: should spawn minions', () => {
      const goal = new SummonGoal(boss);
      goal.execute();
      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);

      // Check for child flag in spawned enemies
      const spawnAction = boss.actions.find(a => a.type === 'spawn_enemies');
      expect(spawnAction?.enemies?.[0].child).toBe(true);
    });
  });

  describe('RageEvaluator & RageGoal', () => {
    it('RageEvaluator: should return 0 on cooldown or high HP', () => {
      boss.attackCooldown = 0;
      boss.state.hp = 50; // 50% HP > 30% threshold
      const evaluator = new RageEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('RageEvaluator: should return high score on low HP', () => {
      boss.attackCooldown = 0;
      boss.state.hp = 10; // 10% HP < 30%
      const evaluator = new RageEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBeGreaterThan(0.8);
    });

    it('RageGoal: should spawn aggressive enemies and shake', () => {
      const goal = new RageGoal(boss);
      goal.execute();
      expect(boss.actions.some((a) => a.type === 'spawn_enemies')).toBe(true);
      expect(boss.actions.some((a) => a.type === 'shake')).toBe(true);
      expect(boss.actions.some((a) => a.type === 'flash')).toBe(true);
    });
  });
});
