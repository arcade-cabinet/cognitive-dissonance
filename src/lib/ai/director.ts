/**
 * AI Director — Dynamic Difficulty Governor
 *
 * Uses Yuka.js StateMachine to observe player performance and
 * adjust game pressure in real-time. Inspired by Left 4 Dead's
 * AI Director and missile command's escalating chaos.
 *
 * States:
 *   BUILDING   — Gradually increasing pressure (player doing well)
 *   SUSTAINING — Holding current difficulty (player balanced)
 *   RELIEVING  — Easing up slightly (player struggling)
 *   SURGING    — Sudden spike for dramatic moments
 *
 * The director tracks a "tension" score (0-1) that smoothly
 * interpolates between states. This prevents jarring difficulty
 * changes and creates natural rhythm: build → surge → relieve → build.
 */

import { GameEntity, State, StateMachine } from 'yuka';

/** Performance snapshot the director evaluates each tick */
export interface PlayerPerformance {
  panic: number; // Current panic (0-100)
  combo: number; // Current combo count
  accuracy: number; // Recent accuracy (0-1) over last ~10 actions
  recentEscapes: number; // Enemies escaped in last 5 seconds
  recentCounters: number; // Enemies countered in last 5 seconds
  wave: number; // Current wave
  bossActive: boolean; // Boss fight in progress
}

/** Director output — modifiers applied to the game each frame */
export interface DirectorModifiers {
  /** Tension level (0-1), drives overall intensity */
  tension: number;
  /** Spawn delay multiplier (< 1 = faster, > 1 = slower) */
  spawnDelayMultiplier: number;
  /** Enemy speed multiplier */
  enemySpeedMultiplier: number;
  /** Max enemies adjustment (-2 to +4) */
  maxEnemyAdjustment: number;
  /** Should we spawn a special (encrypted/child) enemy? */
  /** Chance (0-1) that a special enemy spawns. Check Math.random() < this at spawn time. */
  spawnSpecialChance: number;
  /** Boss aggression (0-1), makes boss attack more frequently */
  bossAggression: number;
}

/**
 * The Director entity — wraps Yuka FSM and produces modifiers.
 */
export class AIDirector extends GameEntity {
  fsm: StateMachine<AIDirector>;
  tension: number;
  targetTension: number;
  stateTimer: number;
  /** Last frame delta in seconds — used by FSM states */
  lastDelta: number;
  performance: PlayerPerformance;
  modifiers: DirectorModifiers;

  // Rolling performance tracking
  private recentActions: Array<{ time: number; hit: boolean }>;
  private actionWindow: number;

  constructor() {
    super();
    this.tension = 0.3;
    this.targetTension = 0.3;
    this.stateTimer = 0;
    this.lastDelta = 0.016;
    this.actionWindow = 5000; // 5 second rolling window

    this.performance = {
      panic: 0,
      combo: 0,
      accuracy: 1,
      recentEscapes: 0,
      recentCounters: 0,
      wave: 0,
      bossActive: false,
    };

    this.modifiers = {
      tension: 0.3,
      spawnDelayMultiplier: 1,
      enemySpeedMultiplier: 1,
      maxEnemyAdjustment: 0,
      spawnSpecialChance: 0,
      bossAggression: 0.3,
    };

    this.recentActions = [];

    // Set up FSM
    this.fsm = new StateMachine(this);
    this.fsm.add('BUILDING', new BuildingState());
    this.fsm.add('SUSTAINING', new SustainingState());
    this.fsm.add('RELIEVING', new RelievingState());
    this.fsm.add('SURGING', new SurgingState());
    this.fsm.changeTo('BUILDING');
  }

  /** Record a player action (counter or miss) */
  recordAction(hit: boolean, now: number): void {
    this.recentActions.push({ time: now, hit });
    this.pruneRecentActions(now);
  }

  /** Update rolling accuracy from recent actions */
  private updateAccuracy(): void {
    if (this.recentActions.length === 0) {
      this.performance.accuracy = 0.5; // Default to neutral when no data
      return;
    }
    const hits = this.recentActions.filter((a) => a.hit).length;
    this.performance.accuracy = hits / this.recentActions.length;
  }

  /** Remove actions older than the rolling window */
  private pruneRecentActions(now: number): void {
    const cutoff = now - this.actionWindow;
    const firstValid = this.recentActions.findIndex((a) => a.time >= cutoff);
    if (firstValid > 0) {
      this.recentActions = this.recentActions.slice(firstValid);
    } else if (firstValid === -1) {
      this.recentActions = [];
    }
  }

  /** Feed current game state to the director */
  updatePerformance(perf: Partial<PlayerPerformance>, now: number): void {
    Object.assign(this.performance, perf);
    this.pruneRecentActions(now);
    this.updateAccuracy();
  }

  /** Main update — call every frame with dt in seconds */
  override update(delta: number): this {
    this.lastDelta = delta;
    this.stateTimer += delta;

    // Smooth tension interpolation (never jumps)
    const lerpSpeed = 0.8 * delta;
    this.tension += (this.targetTension - this.tension) * lerpSpeed;
    this.tension = Math.max(0, Math.min(1, this.tension));

    // Update FSM
    this.fsm.update();

    // Compute modifiers from tension
    this.computeModifiers();

    return this;
  }

  private computeModifiers(): void {
    const t = this.tension;
    const wave = this.performance.wave;
    const waveMod = 1 + wave * 0.08;

    this.modifiers = {
      tension: t,
      // Spawn delay: 1.2 at low tension → 0.65 at max tension
      spawnDelayMultiplier: 1.2 - t * 0.55,
      // Speed: 0.95 at low tension → 1.25 at max tension
      enemySpeedMultiplier: (0.95 + t * 0.3) * waveMod,
      // Max enemies: -1 at low → +4 at max
      maxEnemyAdjustment: Math.round(-1 + t * 5),
      // Special enemies chance increases with tension
      spawnSpecialChance: t * 0.15,
      // Boss aggression tracks tension directly
      bossAggression: 0.2 + t * 0.6,
    };
  }

  /** Get a "player skill estimate" (0-1) from recent performance */
  getSkillEstimate(): number {
    const { accuracy, combo, recentCounters, recentEscapes } = this.performance;
    const comboFactor = Math.min(1, combo / 15);
    const ratioFactor =
      recentCounters + recentEscapes > 0 ? recentCounters / (recentCounters + recentEscapes) : 0.5;
    return accuracy * 0.4 + comboFactor * 0.3 + ratioFactor * 0.3;
  }
}

// ─── FSM States ────────────────────────────────────────────

/** BUILDING: Gradually increase tension. Player is doing well. */
export class BuildingState extends State<AIDirector> {
  override enter(director: AIDirector): void {
    director.stateTimer = 0;
  }

  override execute(director: AIDirector): void {
    const skill = director.getSkillEstimate();
    // Tension builds faster when player is more skilled
    const buildRate = 0.03 + skill * 0.05;
    director.targetTension = Math.min(1, director.targetTension + buildRate * director.lastDelta);

    // Transition to SURGING if tension is high and player is still killing it
    if (director.tension > 0.7 && skill > 0.7 && director.stateTimer > 3) {
      director.fsm.changeTo('SURGING');
      return;
    }

    // Transition to RELIEVING if panic is critical (check first — more specific)
    if (director.performance.panic > 80) {
      director.fsm.changeTo('RELIEVING');
      return;
    }

    // Transition to SUSTAINING if player is struggling
    if (director.performance.panic > 60 || skill < 0.35) {
      director.fsm.changeTo('SUSTAINING');
    }
  }
}

/** SUSTAINING: Hold tension steady. Player is balanced. */
export class SustainingState extends State<AIDirector> {
  override enter(director: AIDirector): void {
    director.stateTimer = 0;
  }

  override execute(director: AIDirector): void {
    // Gently nudge tension toward 0.5 (delta-scaled so it's frame-rate independent)
    // Use 0.5 factor to close half the gap per second (approx)
    director.targetTension += (0.5 - director.targetTension) * 0.5 * director.lastDelta;

    const skill = director.getSkillEstimate();

    // If player recovers, build again
    if (skill > 0.6 && director.performance.panic < 40 && director.stateTimer > 4) {
      director.fsm.changeTo('BUILDING');
      return;
    }

    // If player is really struggling, relieve
    if (director.performance.panic > 75 || skill < 0.25) {
      director.fsm.changeTo('RELIEVING');
    }
  }
}

/** RELIEVING: Back off. Player needs breathing room. */
export class RelievingState extends State<AIDirector> {
  override enter(director: AIDirector): void {
    director.stateTimer = 0;
    // Immediately drop target tension
    director.targetTension = Math.max(0.15, director.targetTension - 0.3);
  }

  override execute(director: AIDirector): void {
    // Slowly reduce tension further (approx 0.2 per second)
    director.targetTension = Math.max(0.1, director.targetTension - 0.2 * director.lastDelta);
    // Once panic drops and player stabilizes, start building again
    if (
      director.performance.panic < 50 &&
      director.getSkillEstimate() > 0.4 &&
      director.stateTimer > 5
    ) {
      director.fsm.changeTo('BUILDING');
    }
  }
}

/** SURGING: Dramatic intensity spike. Creates memorable moments. */
export class SurgingState extends State<AIDirector> {
  override enter(director: AIDirector): void {
    director.stateTimer = 0;
    // Spike tension to near-max
    director.targetTension = Math.min(1, director.tension + 0.25);
  }

  override execute(director: AIDirector): void {
    // Surge lasts 3-6 seconds then transitions
    if (director.stateTimer > 4) {
      // If player survived the surge, relieve
      if (director.performance.panic > 50) {
        director.fsm.changeTo('RELIEVING');
      } else {
        director.fsm.changeTo('SUSTAINING');
      }
      return;
    }

    // Emergency exit if player is about to die
    if (director.performance.panic > 85) {
      director.fsm.changeTo('RELIEVING');
    }
  }
}
