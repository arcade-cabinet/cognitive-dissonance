import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnemyType } from '../types';
import { type BossAction, BossAI, type BossState } from './boss-ai';

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

  it('should trigger Rage mode at low HP', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const lowHpState = { ...mockState, hp: 10, maxHp: 100 };
    boss = new BossAI(lowHpState);
    boss.attackCooldown = 0;
    const actions = boss.update(0.1, lowHpState);
    // Rage at low HP has highest desirability with bias 1.2
    expect(actions.some((a) => a.type === 'shake' && a.intensity === 12)).toBe(true);
  });

  it('should move to target when moveTo is called', () => {
    boss.moveTo(100, 100);
    boss.update(0.1, mockState);
    vi.advanceTimersByTime(1500);
  });

  it('should respect pattern constraints', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const noPatternState = { ...mockState, patterns: [] as string[] };
    boss = new BossAI(noPatternState);
    boss.attackCooldown = 0;

    const actions = boss.update(0.1, noPatternState);

    // With no patterns and high HP, only Reposition or Summon can be chosen
    // Reposition produces a move action, Summon produces spawn
    // But Summon desirability is low at high HP.
    expect(actions.some((a) => a.type === 'move' || a.type === 'spawn_enemies')).toBe(true);
  });

  // ─── Goal Specific Tests ───

  it('should execute BurstAttackGoal', () => {
    // Only 'burst' pattern available
    const state = { ...mockState, patterns: ['burst'] };
    boss = new BossAI(state);
    boss.attackCooldown = 0;

    // Force random to favor burst if needed, but pattern restriction does it
    const actions = boss.update(0.1, state);

    const spawn = actions.find((a) => a.type === 'spawn_enemies');
    expect(spawn).toBeDefined();
    // Burst spawns multiple enemies
    expect(spawn?.enemies?.length).toBeGreaterThan(1);
    expect(actions.some((a) => a.type === 'flash')).toBe(true);
  });

  it('should execute SweepAttackGoal', () => {
    // Only 'sweep' pattern available
    const state = { ...mockState, patterns: ['sweep'] };
    boss = new BossAI(state);
    boss.attackCooldown = 0;

    // First update selects the goal and starts moving
    let actions = boss.update(0.1, state);

    // Sweep moves to start position first
    // It might not spawn immediately
    // We need to simulate multiple frames
    let spawned = false;
    for (let i = 0; i < 30; i++) {
      actions = boss.update(0.1, state);
      if (actions.some((a) => a.type === 'spawn_enemies')) {
        spawned = true;
        break;
      }
    }
    expect(spawned).toBe(true);
  });

  it('should execute SpiralAttackGoal', () => {
    // Only 'spiral' pattern available
    const state = { ...mockState, patterns: ['spiral'] };
    boss = new BossAI(state);
    boss.attackCooldown = 0;

    // Use high aggression to make spiral more desirable
    boss.state.aggression = 1.0;

    let actions: BossAction[] = [];
    let spawned = false;

    // Goal activation
    boss.update(0.1, state);

    // Execution over time
    for (let i = 0; i < 20; i++) {
      actions = boss.update(0.1, state);
      if (actions.some((a) => a.type === 'spawn_enemies')) {
        spawned = true;
        break;
      }
    }

    expect(spawned).toBe(true);
  });

  it('should execute SummonGoal', () => {
    // No patterns, high HP -> Reposition or Summon
    // Reduce HP to make Summon more desirable
    const state = { ...mockState, patterns: [] as string[], hp: 50, maxHp: 100 };
    boss = new BossAI(state);
    boss.attackCooldown = 0;

    // Mock random to favor summon (bias 0.6 vs Reposition 0.5)
    // Summon desirability: 0.2 + 0.2 + random
    vi.spyOn(Math, 'random').mockReturnValue(0.9);

    const actions = boss.update(0.1, state);
    const spawn = actions.find((a) => a.type === 'spawn_enemies');

    expect(spawn).toBeDefined();
    // Summon spawns minions (child=true or just enemies)
    // Check enemies count
    expect(spawn?.enemies?.length).toBeGreaterThan(0);
  });

  it('should execute RepositionGoal', () => {
    // Force reposition by having cooldown > 0
    boss.attackCooldown = 1.0;

    // Reposition is the fallback when on cooldown
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const actions = boss.update(0.1, mockState);

    // Reposition just sets a move target, which update() converts to a move action
    expect(actions.some((a) => a.type === 'move')).toBe(true);
  });

  it('should handle RageGoal execution details', () => {
    const lowHpState = { ...mockState, hp: 5, maxHp: 100 };
    boss = new BossAI(lowHpState);
    boss.attackCooldown = 0;

    const actions = boss.update(0.1, lowHpState);
    const spawn = actions.find((a) => a.type === 'spawn_enemies');

    expect(spawn).toBeDefined();
    expect(actions.some((a) => a.type === 'shake')).toBe(true);
    expect(actions.some((a) => a.type === 'flash')).toBe(true);

    // Rage spawns many enemies
    expect(spawn?.enemies?.length).toBeGreaterThan(4);
  });

  it('should complete SpiralAttackGoal and shake screen', () => {
    const state = { ...mockState, patterns: ['spiral'] };
    boss = new BossAI(state);
    boss.attackCooldown = 0;
    boss.state.aggression = 1.0;

    // Force Spiral by ensuring random favors it (though it should win anyway)
    // Use 0.5 to avoid edge cases
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    // First update picks goal
    boss.update(0.1, state);

    const allActions: BossAction[] = [];
    // Max spawns is around 14. Interval 0.2s. Total ~2.8s
    // Increase loop count to be safe
    for (let i = 0; i < 150; i++) {
      const actions = boss.update(0.1, state);
      allActions.push(...actions);
    }

    const spawns = allActions.filter((a) => a.type === 'spawn_enemies');
    expect(spawns.length).toBeGreaterThan(5);
  });
});
