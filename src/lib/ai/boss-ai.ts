/**
 * Boss AI — Goal-Driven Unpredictable Boss Behavior
 *
 * Uses Yuka.js Vehicle + Think + GoalEvaluators to create bosses
 * that feel alive, not scripted. Like missile command, the boss
 * picks tactics dynamically based on its HP, the player's skill,
 * and the current game tension.
 *
 * The boss is a Yuka Vehicle with steering behaviors for movement.
 * Its "brain" (Think) evaluates goals each tick and picks the most
 * desirable one. Goals include:
 *
 *   - BurstAttack: Spawn cluster of enemies at boss position
 *   - SweepAttack: Sweep across screen spawning a line of enemies
 *   - SpiralAttack: Spiral pattern of enemies rotating outward
 *   - Reposition: Move to a strategic position
 *   - Summon: Spawn minion enemies
 *   - Rage: Enraged state at low HP (faster, more aggressive)
 */

import {
  ArriveBehavior,
  CompositeGoal,
  Goal,
  GoalEvaluator,
  Think,
  Vector3,
  Vehicle,
  WanderBehavior,
} from 'yuka';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import type { Enemy, EnemyType } from '../types';

const W = GAME_WIDTH;
const H = GAME_HEIGHT;

/** Command queue — boss AI pushes actions, game logic executes them */
export interface BossAction {
  type: 'spawn_enemies' | 'move' | 'flash' | 'shake';
  enemies?: Partial<Enemy>[];
  x?: number;
  y?: number;
  intensity?: number;
}

/** Boss AI state passed from game logic */
export interface BossState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  aggression: number; // 0-1, from AI Director
  patterns: string[];
  enemyTypes: EnemyType[];
  wave: number;
}

/**
 * The Boss AI brain. Wraps a Yuka Vehicle with Think goal system.
 */
export class BossAI {
  vehicle: Vehicle;
  brain: Think<Vehicle>;
  actions: BossAction[];
  state: BossState;
  attackCooldown: number;
  /** Current frame delta in seconds — updated each frame for goals to use */
  frameDelta: number;
  private wanderBehavior: WanderBehavior;
  private arriveBehavior: ArriveBehavior;
  private moveTarget: Vector3;
  private moveCooldownTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(state: BossState) {
    this.state = state;
    this.actions = [];
    this.attackCooldown = 0;
    this.frameDelta = 0.016;

    // Set up Yuka Vehicle for boss movement
    this.vehicle = new Vehicle();
    this.vehicle.position.set(state.x, 0, state.y);
    this.vehicle.maxSpeed = 80;
    this.vehicle.maxForce = 200;
    this.vehicle.mass = 1;

    // Wander behavior for organic idle movement
    this.wanderBehavior = new WanderBehavior();
    this.wanderBehavior.jitter = 20;
    this.wanderBehavior.radius = 40;
    this.wanderBehavior.distance = 60;
    this.wanderBehavior.weight = 0.3;
    this.vehicle.steering.add(this.wanderBehavior);

    // Arrive behavior for deliberate repositioning
    this.moveTarget = new Vector3(W / 2, 0, 80);
    this.arriveBehavior = new ArriveBehavior(this.moveTarget);
    this.arriveBehavior.deceleration = 3;
    this.arriveBehavior.weight = 0.7;
    this.arriveBehavior.active = false;
    this.vehicle.steering.add(this.arriveBehavior);

    // Set up goal-driven brain
    this.brain = new Think(this.vehicle);
    this.brain.addEvaluator(new BurstEvaluator(this, 1.0));
    this.brain.addEvaluator(new SweepEvaluator(this, 0.9));
    this.brain.addEvaluator(new SpiralEvaluator(this, 0.7));
    this.brain.addEvaluator(new RepositionEvaluator(this, 0.5));
    this.brain.addEvaluator(new SummonEvaluator(this, 0.6));
    this.brain.addEvaluator(new RageEvaluator(this, 1.2));
  }

  /** Update boss AI each frame. delta in seconds. */
  update(delta: number, state: BossState): BossAction[] {
    this.state = state;
    this.actions = [];

    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    // Store delta for goals to use
    this.frameDelta = delta;

    // Update vehicle position from game state
    this.vehicle.position.set(state.x, 0, state.y);

    // Update wander intensity based on aggression
    this.wanderBehavior.jitter = 15 + state.aggression * 30;
    this.vehicle.maxSpeed = 60 + state.aggression * 80;

    // Let the brain decide what to do
    this.brain.arbitrate();
    this.brain.execute();

    // Update vehicle physics
    this.vehicle.update(delta);

    // Clamp to game bounds
    const vx = Math.max(80, Math.min(W - 80, this.vehicle.position.x));
    const vy = Math.max(40, Math.min(180, this.vehicle.position.z));

    // Push position update as an action
    this.actions.push({ type: 'move', x: vx, y: vy });

    return this.actions;
  }

  /** Set a deliberate move target */
  moveTo(x: number, y: number): void {
    this.moveTarget.set(x, 0, y);
    this.arriveBehavior.active = true;
    this.wanderBehavior.weight = 0.1;
    // Clear any previous move cooldown to prevent overlapping timeouts
    if (this.moveCooldownTimer !== null) {
      clearTimeout(this.moveCooldownTimer);
    }
    // Re-enable wander after a bit (via cooldown)
    this.moveCooldownTimer = setTimeout(() => {
      this.arriveBehavior.active = false;
      this.wanderBehavior.weight = 0.3;
      this.moveCooldownTimer = null;
    }, 1500);
  }

  /** Get HP ratio (0-1) */
  getHpRatio(): number {
    return this.state.hp / this.state.maxHp;
  }

  /** Pick a random enemy type from available types */
  randomEnemyType(): EnemyType {
    if (this.state.enemyTypes.length === 0) {
      throw new Error('No enemy types configured');
    }
    return this.state.enemyTypes[Math.floor(Math.random() * this.state.enemyTypes.length)];
  }
}

// ─── Goals ─────────────────────────────────────────────────

/** Burst Attack: spawn cluster at boss position */
export class BurstAttackGoal extends Goal<Vehicle> {
  boss: BossAI;
  executed: boolean;

  constructor(boss: BossAI) {
    super();
    this.boss = boss;
    this.executed = false;
  }

  override activate(): void {
    this.executed = false;
  }

  override execute(): void {
    if (this.executed) {
      this.status = Goal.STATUS.COMPLETED;
      return;
    }

    const { x, y } = this.boss.state;
    const count = 3 + Math.floor(this.boss.state.aggression * 4);
    const enemies: Partial<Enemy>[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1.2 + Math.random() * 0.8;
      const type = this.boss.randomEnemyType();
      enemies.push({
        x: x + Math.cos(angle) * 20,
        y: y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type,
        word: type.words[Math.floor(Math.random() * type.words.length)],
        counter: type.counter,
        spd: speed,
      });
    }

    this.boss.actions.push({ type: 'spawn_enemies', enemies });
    this.boss.actions.push({ type: 'flash', intensity: 0.2 });
    this.boss.attackCooldown = 2.5 - this.boss.state.aggression * 1.0;
    this.executed = true;
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {
    // no-op
  }
}

/** Sweep Attack: boss moves across screen spawning a line */
export class SweepAttackGoal extends CompositeGoal<Vehicle> {
  boss: BossAI;
  private sweepTimer: number;
  private sweepDuration: number;
  private spawned: number;
  private direction: number;

  constructor(boss: BossAI) {
    super();
    this.boss = boss;
    this.sweepTimer = 0;
    this.sweepDuration = 2.0;
    this.spawned = 0;
    this.direction = Math.random() < 0.5 ? -1 : 1;
  }

  override activate(): void {
    this.sweepTimer = 0;
    this.spawned = 0;
    this.direction = Math.random() < 0.5 ? -1 : 1;
    // Move to one side
    const startX = this.direction > 0 ? 100 : W - 100;
    this.boss.moveTo(startX, 80);
  }

  override execute(): void {
    this.sweepTimer += this.boss.frameDelta;

    const maxSpawns = 5 + Math.floor(this.boss.state.aggression * 4);
    const spawnInterval = this.sweepDuration / maxSpawns;

    if (this.sweepTimer > spawnInterval * this.spawned && this.spawned < maxSpawns) {
      const progress = this.spawned / maxSpawns;
      const spawnX =
        this.direction > 0 ? 100 + progress * (W - 200) : W - 100 - progress * (W - 200);
      const type = this.boss.randomEnemyType();

      this.boss.actions.push({
        type: 'spawn_enemies',
        enemies: [
          {
            x: spawnX,
            y: this.boss.state.y + 30,
            vx: 0,
            vy: 1.5 + Math.random() * 0.5,
            type,
            word: type.words[Math.floor(Math.random() * type.words.length)],
            counter: type.counter,
            spd: 1.5,
          },
        ],
      });
      this.spawned++;
    }

    if (this.sweepTimer >= this.sweepDuration) {
      this.boss.attackCooldown = 3.0 - this.boss.state.aggression * 1.2;
      this.status = Goal.STATUS.COMPLETED;
    }
  }

  override terminate(): void {
    // no-op
  }
}

/** Spiral Attack: enemies spawn in expanding spiral */
export class SpiralAttackGoal extends Goal<Vehicle> {
  boss: BossAI;
  private spiralTimer: number;
  private spiralAngle: number;
  private spawned: number;

  constructor(boss: BossAI) {
    super();
    this.boss = boss;
    this.spiralTimer = 0;
    this.spiralAngle = 0;
    this.spawned = 0;
  }

  override activate(): void {
    this.spiralTimer = 0;
    this.spiralAngle = Math.random() * Math.PI * 2;
    this.spawned = 0;
  }

  override execute(): void {
    this.spiralTimer += this.boss.frameDelta;

    const maxSpawns = 8 + Math.floor(this.boss.state.aggression * 6);
    const spawnInterval = 0.2;

    if (this.spiralTimer > spawnInterval * this.spawned && this.spawned < maxSpawns) {
      this.spiralAngle += 0.7; // Golden angle-ish for nice spiral
      const radius = 30 + this.spawned * 8;
      const { x, y } = this.boss.state;
      const spawnX = x + Math.cos(this.spiralAngle) * radius;
      const spawnY = y + Math.sin(this.spiralAngle) * radius;
      const type = this.boss.randomEnemyType();

      // Enemies fly outward from spiral center
      const dx = Math.cos(this.spiralAngle);
      const dy = Math.sin(this.spiralAngle);

      this.boss.actions.push({
        type: 'spawn_enemies',
        enemies: [
          {
            x: Math.max(20, Math.min(W - 20, spawnX)),
            y: Math.max(20, Math.min(H - 20, spawnY)),
            vx: dx * (0.8 + this.boss.state.aggression * 0.6),
            vy: dy * (0.8 + this.boss.state.aggression * 0.6),
            type,
            word: type.words[Math.floor(Math.random() * type.words.length)],
            counter: type.counter,
            spd: 1.0 + this.boss.state.aggression * 0.5,
          },
        ],
      });
      this.spawned++;
    }

    if (this.spawned >= maxSpawns) {
      this.boss.attackCooldown = 3.5 - this.boss.state.aggression * 1.5;
      this.boss.actions.push({ type: 'shake', intensity: 8 });
      this.status = Goal.STATUS.COMPLETED;
    }
  }

  override terminate(): void {
    // no-op
  }
}

/** Reposition: move to a strategic position */
export class RepositionGoal extends Goal<Vehicle> {
  boss: BossAI;

  constructor(boss: BossAI) {
    super();
    this.boss = boss;
  }

  override activate(): void {
    // Pick a random position in the boss zone
    const targetX = 100 + Math.random() * (W - 200);
    const targetY = 50 + Math.random() * 100;
    this.boss.moveTo(targetX, targetY);
  }

  override execute(): void {
    // Just move — completes quickly
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {
    // no-op
  }
}

/** Summon: spawn minion enemies */
export class SummonGoal extends Goal<Vehicle> {
  boss: BossAI;

  constructor(boss: BossAI) {
    super();
    this.boss = boss;
  }

  override activate(): void {
    // no-op
  }

  override execute(): void {
    const count = 2 + Math.floor(this.boss.state.aggression * 3);
    const enemies: Partial<Enemy>[] = [];

    for (let i = 0; i < count; i++) {
      const side = Math.random() < 0.5 ? 0 : 1;
      const type = this.boss.randomEnemyType();
      enemies.push({
        x: side === 0 ? -40 : W + 40,
        y: 100 + Math.random() * 180,
        vx: (side === 0 ? 1 : -1) * (1.0 + Math.random() * 0.5),
        vy: (Math.random() - 0.5) * 0.3,
        type,
        word: type.words[Math.floor(Math.random() * type.words.length)],
        counter: type.counter,
        spd: 1.2,
        child: true,
      });
    }

    this.boss.actions.push({ type: 'spawn_enemies', enemies });
    this.boss.attackCooldown = 2.0;
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {
    // no-op
  }
}

/** Rage: enraged state at low HP — faster attacks, more aggressive */
export class RageGoal extends Goal<Vehicle> {
  boss: BossAI;

  constructor(boss: BossAI) {
    super();
    this.boss = boss;
  }

  override activate(): void {
    // no-op
  }

  override execute(): void {
    // Rage is a burst + summon combo
    const { x, y } = this.boss.state;
    const count = 5 + Math.floor(this.boss.state.aggression * 5);
    const enemies: Partial<Enemy>[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 1.5 + Math.random() * 1.0;
      const type = this.boss.randomEnemyType();
      enemies.push({
        x: x + Math.cos(angle) * 30,
        y: y + Math.sin(angle) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type,
        word: type.words[Math.floor(Math.random() * type.words.length)],
        counter: type.counter,
        spd: speed,
        encrypted: Math.random() < 0.3,
      });
    }

    this.boss.actions.push({ type: 'spawn_enemies', enemies });
    this.boss.actions.push({ type: 'shake', intensity: 12 });
    this.boss.actions.push({ type: 'flash', intensity: 0.3 });
    this.boss.attackCooldown = 1.5;
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {
    // no-op
  }
}

// ─── Evaluators ────────────────────────────────────────────

export class BurstEvaluator extends GoalEvaluator<Vehicle> {
  boss: BossAI;

  constructor(boss: BossAI, bias: number) {
    super(bias);
    this.boss = boss;
  }

  override calculateDesirability(): number {
    if (this.boss.attackCooldown > 0) return 0;
    // More desirable at medium aggression, available in all patterns
    if (!this.boss.state.patterns.includes('burst')) return 0;
    return 0.5 + this.boss.state.aggression * 0.3 + Math.random() * 0.2;
  }

  override setGoal(_owner: Vehicle): void {
    this.boss.brain.clearSubgoals();
    this.boss.brain.addSubgoal(new BurstAttackGoal(this.boss));
  }
}

export class SweepEvaluator extends GoalEvaluator<Vehicle> {
  boss: BossAI;

  constructor(boss: BossAI, bias: number) {
    super(bias);
    this.boss = boss;
  }

  override calculateDesirability(): number {
    if (this.boss.attackCooldown > 0) return 0;
    if (!this.boss.state.patterns.includes('sweep')) return 0;
    return 0.4 + this.boss.state.aggression * 0.2 + Math.random() * 0.3;
  }

  override setGoal(_owner: Vehicle): void {
    this.boss.brain.clearSubgoals();
    this.boss.brain.addSubgoal(new SweepAttackGoal(this.boss));
  }
}

export class SpiralEvaluator extends GoalEvaluator<Vehicle> {
  boss: BossAI;

  constructor(boss: BossAI, bias: number) {
    super(bias);
    this.boss = boss;
  }

  override calculateDesirability(): number {
    if (this.boss.attackCooldown > 0) return 0;
    if (!this.boss.state.patterns.includes('spiral')) return 0;
    // Spiral is rare but flashy — more desirable at high aggression
    return 0.3 + this.boss.state.aggression * 0.4 + Math.random() * 0.2;
  }

  override setGoal(_owner: Vehicle): void {
    this.boss.brain.clearSubgoals();
    this.boss.brain.addSubgoal(new SpiralAttackGoal(this.boss));
  }
}

export class RepositionEvaluator extends GoalEvaluator<Vehicle> {
  boss: BossAI;

  constructor(boss: BossAI, bias: number) {
    super(bias);
    this.boss = boss;
  }

  override calculateDesirability(): number {
    // Always available as a fallback when on cooldown
    if (this.boss.attackCooldown > 0) return 0.4 + Math.random() * 0.2;
    return 0.1 + Math.random() * 0.1;
  }

  override setGoal(_owner: Vehicle): void {
    this.boss.brain.clearSubgoals();
    this.boss.brain.addSubgoal(new RepositionGoal(this.boss));
  }
}

export class SummonEvaluator extends GoalEvaluator<Vehicle> {
  boss: BossAI;

  constructor(boss: BossAI, bias: number) {
    super(bias);
    this.boss = boss;
  }

  override calculateDesirability(): number {
    if (this.boss.attackCooldown > 0) return 0;
    // More desirable when HP is lower (boss calls for help)
    const hpFactor = 1 - this.boss.getHpRatio();
    return 0.2 + hpFactor * 0.4 + Math.random() * 0.15;
  }

  override setGoal(_owner: Vehicle): void {
    this.boss.brain.clearSubgoals();
    this.boss.brain.addSubgoal(new SummonGoal(this.boss));
  }
}

export class RageEvaluator extends GoalEvaluator<Vehicle> {
  boss: BossAI;

  constructor(boss: BossAI, bias: number) {
    super(bias);
    this.boss = boss;
  }

  override calculateDesirability(): number {
    if (this.boss.attackCooldown > 0) return 0;
    // Only activates at low HP (< 30%)
    const hpRatio = this.boss.getHpRatio();
    if (hpRatio > 0.3) return 0;
    // Very desirable at low HP
    return 0.8 + (1 - hpRatio) * 0.5 + Math.random() * 0.1;
  }

  override setGoal(_owner: Vehicle): void {
    this.boss.brain.clearSubgoals();
    this.boss.brain.addSubgoal(new RageGoal(this.boss));
  }
}
