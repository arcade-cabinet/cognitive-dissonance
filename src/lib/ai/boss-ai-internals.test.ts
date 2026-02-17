import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Goal, Vehicle } from 'yuka';
import { seedRng } from '../rng';
import {
  BossAI,
  BurstAttackGoal,
  BurstEvaluator,
  RageEvaluator,
  RepositionEvaluator,
  RepositionGoal,
  SpiralAttackGoal,
  SpiralEvaluator,
  SummonGoal,
  SweepAttackGoal,
  SweepEvaluator,
} from './boss-ai';

describe('BossAI Internals', () => {
  let boss: BossAI;
  let vehicle: Vehicle;

  beforeEach(() => {
    boss = new BossAI({
      x: 0,
      y: 0,
      hp: 100,
      maxHp: 100,
      aggression: 0.5,
      patterns: ['burst', 'sweep', 'spiral'],
      enemyTypes: [
        {
          counter: 'reality',
          words: ['TEST'],
          color: '#fff',
          shape: 'denial',
        },
      ],
      wave: 1,
    });
    vehicle = new Vehicle();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('BurstEvaluator', () => {
    it('should return 0 desirability if on cooldown', () => {
      boss.attackCooldown = 1;
      const evaluator = new BurstEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('should return 0 desirability if pattern not available', () => {
      boss.state.patterns = ['sweep'];
      const evaluator = new BurstEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('should calculate desirability based on aggression and random', () => {
      boss.attackCooldown = 0;
      boss.state.patterns = ['burst'];
      boss.state.aggression = 0.5;
      seedRng(42);

      const evaluator = new BurstEvaluator(boss, 1);
      const result = evaluator.calculateDesirability();
      // 0.5 + aggression*0.3 + rng()*0.2 — result should be in [0.5, 1.0)
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeLessThan(1.0);
    });

    it('should set BurstAttackGoal', () => {
      const evaluator = new BurstEvaluator(boss, 1);
      boss.brain.addSubgoal = vi.fn();
      boss.brain.clearSubgoals = vi.fn();

      evaluator.setGoal(vehicle);

      expect(boss.brain.clearSubgoals).toHaveBeenCalled();
      expect(boss.brain.addSubgoal).toHaveBeenCalledWith(expect.any(BurstAttackGoal));
    });
  });

  describe('RageEvaluator', () => {
    it('should return 0 if HP ratio > 0.3', () => {
      boss.state.hp = 40;
      boss.state.maxHp = 100; // 0.4
      const evaluator = new RageEvaluator(boss, 1);
      expect(evaluator.calculateDesirability()).toBe(0);
    });

    it('should return high desirability if HP ratio <= 0.3', () => {
      boss.state.hp = 20;
      boss.state.maxHp = 100; // 0.2
      seedRng(42);

      const evaluator = new RageEvaluator(boss, 1);
      const result = evaluator.calculateDesirability();
      // 0.8 + (1-0.2)*0.5 + rng()*0.1 — should be high (> 1.0)
      expect(result).toBeGreaterThan(1.0);
      expect(result).toBeLessThan(1.4);
    });
  });

  describe('BurstAttackGoal', () => {
    it('should spawn enemies and set cooldown', () => {
      const goal = new BurstAttackGoal(boss);
      boss.actions = [];
      boss.state.aggression = 0.5;
      seedRng(42);

      goal.execute();

      expect(boss.actions.length).toBeGreaterThanOrEqual(2); // spawn_enemies + flash
      expect(boss.actions[0].type).toBe('spawn_enemies');
      expect(boss.attackCooldown).toBeGreaterThan(0);
      expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    });
  });

  describe('Other Evaluators', () => {
    it('SweepEvaluator returns value if pattern present', () => {
      boss.state.patterns = ['sweep'];
      boss.attackCooldown = 0;
      const ev = new SweepEvaluator(boss, 1);
      seedRng(42);
      expect(ev.calculateDesirability()).toBeGreaterThan(0);
    });

    it('SweepEvaluator returns 0 if pattern missing', () => {
      boss.state.patterns = ['burst'];
      const ev = new SweepEvaluator(boss, 1);
      expect(ev.calculateDesirability()).toBe(0);
    });

    it('SweepEvaluator sets goal', () => {
      const ev = new SweepEvaluator(boss, 1);
      boss.brain.addSubgoal = vi.fn();
      boss.brain.clearSubgoals = vi.fn();
      ev.setGoal(vehicle);
      expect(boss.brain.clearSubgoals).toHaveBeenCalled();
      expect(boss.brain.addSubgoal).toHaveBeenCalledWith(expect.any(SweepAttackGoal));
    });

    it('SpiralEvaluator returns value if pattern present', () => {
      boss.state.patterns = ['spiral'];
      boss.attackCooldown = 0;
      const ev = new SpiralEvaluator(boss, 1);
      seedRng(42);
      expect(ev.calculateDesirability()).toBeGreaterThan(0);
    });

    it('SpiralEvaluator returns 0 if pattern missing', () => {
      boss.state.patterns = ['burst'];
      const ev = new SpiralEvaluator(boss, 1);
      expect(ev.calculateDesirability()).toBe(0);
    });

    it('SpiralEvaluator sets goal', () => {
      const ev = new SpiralEvaluator(boss, 1);
      boss.brain.addSubgoal = vi.fn();
      boss.brain.clearSubgoals = vi.fn();
      ev.setGoal(vehicle);
      expect(boss.brain.clearSubgoals).toHaveBeenCalled();
      expect(boss.brain.addSubgoal).toHaveBeenCalledWith(expect.any(SpiralAttackGoal));
    });

    it('RepositionEvaluator always returns something > 0 if on cooldown', () => {
      boss.attackCooldown = 5;
      const ev = new RepositionEvaluator(boss, 1);
      seedRng(42);
      // 0.4 + rng()*0.2 — should be in [0.4, 0.6)
      const result = ev.calculateDesirability();
      expect(result).toBeGreaterThanOrEqual(0.4);
      expect(result).toBeLessThan(0.6);
    });
  });

  describe('Other Goals', () => {
    it('RepositionGoal moves boss', () => {
      const goal = new RepositionGoal(boss);
      boss.moveTo = vi.fn();
      goal.activate();
      expect(boss.moveTo).toHaveBeenCalled();
      goal.execute();
      expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    });

    it('SummonGoal spawns enemies', () => {
      const goal = new SummonGoal(boss);
      boss.actions = [];
      goal.execute();
      expect(boss.actions.length).toBeGreaterThan(0);
      expect(boss.actions[0].type).toBe('spawn_enemies');
      expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    });
  });
});
