import type { BossAction } from './ai/boss-ai';
import { BossAI } from './ai/boss-ai';
import { AIDirector } from './ai/director';
import { FEED, GAME_HEIGHT, GAME_WIDTH, POWERUPS, TYPES, WAVES } from './constants';
import type { GameEvent, GameState } from './events';
import { calculatePanicDamage, calculatePanicDecay, getPanicModifiers } from './panic-system';
import { secureRandom } from './secure-random';
import type { Boss, BossConfig, Enemy, MomentumPerks, PowerUpInstance } from './types';

const W = GAME_WIDTH;
const H = GAME_HEIGHT;

export class GameLogic {
  feedTimer: number;
  feedIdx: number;
  _lastBossX: number;

  // Game state
  enemies: Enemy[];
  powerups: PowerUpInstance[];
  score: number;
  panic: number;
  combo: number;
  maxCombo: number;
  totalC: number;
  totalM: number;
  nukesUsed: number;
  wave: number;
  waveTime: number;
  running: boolean;
  lastSpawn: number;
  lastPU: number;
  nukeCd: number;
  nukeMax: number;
  abilityMax: { reality: number; history: number; logic: number };
  abilityCd: { reality: number; history: number; logic: number };
  pu: { slow: number; shield: number; double: number };
  fl: number;
  flCol: string;
  shake: number;
  boss: Boss | null;
  bossPhase: boolean;
  endless: boolean;
  endlessLevel: number;
  panicInvuln: number;
  momPerks: MomentumPerks;
  secondAccumulator: number;

  // AI systems
  private director: AIDirector;
  private bossAI: BossAI | null;
  private recentEscapes: number;
  private recentCounters: number;
  private recentResetTimer: number;
  private bossWaveTransitionFrames: number;

  // Event queue
  events: GameEvent[] = [];

  constructor() {
    this.feedTimer = 0;
    this.feedIdx = 0;
    this._lastBossX = W / 2;

    // Initialize all properties
    this.enemies = [];
    this.powerups = [];
    this.score = 0;
    this.panic = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalC = 0;
    this.totalM = 0;
    this.nukesUsed = 0;
    this.wave = 0;
    this.waveTime = 0;
    this.running = false;
    this.lastSpawn = 0;
    this.lastPU = 0;
    this.nukeCd = 0;
    this.nukeMax = 12000;
    this.abilityMax = { reality: 420, history: 420, logic: 420 };
    this.abilityCd = { reality: 0, history: 0, logic: 0 };
    this.pu = { slow: 0, shield: 0, double: 0 };
    this.fl = 0;
    this.flCol = '#fff';
    this.shake = 0;
    this.boss = null;
    this.bossPhase = false;
    this.endless = false;
    this.endlessLevel = 0;
    this.panicInvuln = 0;
    this.momPerks = { spawnDelay: 0, scoreBonus: 0, cdReduction: 0 };
    this.secondAccumulator = 0;

    // AI systems
    this.director = new AIDirector();
    this.bossAI = null;
    this.recentEscapes = 0;
    this.recentCounters = 0;
    this.recentResetTimer = 0;
    this.bossWaveTransitionFrames = 0;

    this.reset();
  }

  reset(): void {
    this.enemies = [];
    this.powerups = [];
    this.score = 0;
    this.panic = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalC = 0;
    this.totalM = 0;
    this.nukesUsed = 0;
    this.wave = 0;
    this.waveTime = 0;
    this.running = false;
    this.lastSpawn = 0;
    this.lastPU = 0;
    this.nukeCd = 0;
    this.nukeMax = 12000;
    this.abilityMax = { reality: 420, history: 420, logic: 420 };
    this.abilityCd = { reality: 0, history: 0, logic: 0 };
    this.pu = { slow: 0, shield: 0, double: 0 };
    this.fl = 0;
    this.flCol = '#fff';
    this.shake = 0;
    this.boss = null;
    this.bossPhase = false;
    this.endless = false;
    this.endlessLevel = 0;
    this.panicInvuln = 0;
    this.momPerks = { spawnDelay: 0, scoreBonus: 0, cdReduction: 0 };
    this.events = [];
    this.secondAccumulator = 0;

    // Reset AI
    this.director = new AIDirector();
    this.bossAI = null;
    this.recentEscapes = 0;
    this.recentCounters = 0;
    this.recentResetTimer = 0;
    this.bossWaveTransitionFrames = 0;
  }

  startOrContinue(): void {
    if (this.running) return;
    this.start();
  }

  startEndlessMode(): void {
    this.endless = true;
    this.running = true;
    this.events.push({ type: 'SFX', name: 'resume' });
    this.startWave(this.wave + 1);
  }

  start(): void {
    this.reset();
    this.running = true;
    this.events.push({ type: 'SFX', name: 'resume' });
    this.feedIdx = 0;
    this.startWave(0);
  }

  startWave(idx: number): void {
    this.wave = idx;
    const currentWave = WAVES[Math.min(idx, WAVES.length - 1)];
    this.waveTime = currentWave.dur;
    this.bossPhase = false;
    this.boss = null;
    this.bossAI = null;
    this.secondAccumulator = 0;

    const isEndless = idx >= WAVES.length;
    const title = isEndless ? `ENDLESS ${idx - (WAVES.length - 1)}` : `WAVE ${idx + 1}`;
    const sub = isEndless ? '"No more timelines. Just vibes."' : currentWave.sub;

    this.events.push({ type: 'WAVE_START', wave: idx, title, sub });
    this.events.push({ type: 'SFX', name: 'waveStart' });
    this.events.push({ type: 'SFX', name: 'startMusic', args: [Math.min(idx, 4)] });
  }

  startBoss(cfg: BossConfig): void {
    this.bossPhase = true;
    this.enemies = [];
    this.boss = {
      name: cfg.name,
      hp: cfg.hp,
      maxHp: cfg.hp,
      pat: cfg.pats[0],
      timer: 0,
      x: W / 2,
      y: 80,
      iFrame: 0,
      spiralAngle: 0,
    };

    // Initialize Yuka boss AI
    const enemyTypes = Object.values(TYPES);
    this.bossAI = new BossAI({
      x: W / 2,
      y: 80,
      hp: cfg.hp,
      maxHp: cfg.hp,
      aggression: this.director.modifiers.bossAggression,
      patterns: cfg.pats,
      enemyTypes,
      wave: this.wave,
    });

    this.events.push({ type: 'BOSS_START', name: cfg.name, hp: cfg.hp });
    this.fl = 0.3;
    this.flCol = '#e74c3c';
  }

  nextWave(): void {
    if (!this.endless && this.wave >= WAVES.length - 1) {
      this.endGame(true);
      return;
    }
    if (this.endless) {
      this.endlessLevel++;
    }
    this.startWave(this.endless ? WAVES.length + this.endlessLevel : this.wave + 1);
  }

  endGame(win: boolean): void {
    this.running = false;
    this.bossAI = null;
    this.events.push({ type: 'SFX', name: 'stopMusic' });
    this.events.push({
      type: 'GAME_OVER',
      score: this.score,
      win,
      totalC: this.totalC,
      totalM: this.totalM,
      maxCombo: this.maxCombo,
      nukesUsed: this.nukesUsed,
      wavesCleared: win ? WAVES.length : this.wave + 1,
    });
  }

  spawnEnemy(): void {
    const typeKeys = Object.keys(TYPES);
    const typeKey = typeKeys[Math.floor(Math.random() * typeKeys.length)];
    const type = TYPES[typeKey];
    const word = type.words[Math.floor(Math.random() * type.words.length)];
    const cfg = WAVES[Math.min(this.wave, WAVES.length - 1)];
    const side = Math.random() < 0.5 ? 0 : 1;

    // Get panic + director modifiers for dynamic speed
    const panicMods = getPanicModifiers(this.panic, this.wave);
    const directorMods = this.director.modifiers;
    const speedMult = panicMods.speedMultiplier * directorMods.enemySpeedMultiplier;

    // Determine if this enemy should be special
    const isEncrypted = Math.random() < panicMods.encryptChance;
    const isChild = !isEncrypted && Math.random() < panicMods.variantChance;

    const enemy: Enemy = {
      id: Date.now() + secureRandom(),
      x: side === 0 ? -40 : W + 40,
      y: 100 + Math.random() * 180,
      word,
      type,
      vx: (side === 0 ? 1 : -1) * (0.8 + Math.random() * 0.4) * cfg.spd * speedMult,
      vy: (Math.random() - 0.5) * 0.3,
      counter: type.counter,
      spd: cfg.spd * speedMult,
      encrypted: isEncrypted,
      child: isChild,
    };
    this.enemies.push(enemy);
  }

  /** Spawn enemy from boss AI action (partial enemy data) */
  private spawnBossEnemy(partial: Partial<Enemy>): void {
    const type = partial.type || Object.values(TYPES)[0];
    const enemy: Enemy = {
      id: Date.now() + secureRandom(),
      x: partial.x ?? W / 2,
      y: partial.y ?? 80,
      word: partial.word || type.words[0],
      type,
      vx: partial.vx ?? 0,
      vy: partial.vy ?? 1,
      counter: partial.counter || type.counter,
      spd: partial.spd ?? 1,
      encrypted: partial.encrypted,
      child: partial.child,
    };
    this.enemies.push(enemy);
  }

  spawnPowerUp(): void {
    const pu = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    this.powerups.push({
      ...pu,
      id: `${pu.id}-${Date.now()}-${secureRandom()}`,
      x: 100 + Math.random() * (W - 200),
      y: -30,
      vy: 0.6 + Math.random() * 0.4,
    });
  }

  triggerAbility(type: 'reality' | 'history' | 'logic'): void {
    if (!this.running) return;
    if (this.abilityCd[type] > 0) return;
    this.abilityCd[type] = this.abilityMax[type] * (1 - this.momPerks.cdReduction);
    let hit = false;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.counter === type && !e.encrypted) {
        this.counterEnemy(e);
        this.enemies.splice(i, 1);
        hit = true;
      }
    }
    if (!hit) {
      this.combo = 0;
      this.totalM++;
      this.events.push({ type: 'SFX', name: 'miss' });
      this.director.recordAction(false, performance.now());
    }
  }

  triggerNuke(): void {
    if (!this.running) return;
    if (this.nukeCd > 0) return;
    this.nukeCd = this.nukeMax;
    this.nukesUsed++;
    this.events.push({ type: 'SFX', name: 'nuke' });
    if (this.bossPhase && this.boss && this.boss.iFrame <= 0) {
      this.boss.hp = Math.max(0, this.boss.hp - 3);
      this.boss.iFrame = 15;
      this.events.push({ type: 'SFX', name: 'bossHit' });
      this.events.push({ type: 'BOSS_HIT', hp: this.boss.hp, maxHp: this.boss.maxHp });

      if (this.boss.hp <= 0) {
        this.events.push({ type: 'SFX', name: 'bossDie' });
        this.events.push({ type: 'BOSS_DIE' });
        this.boss = null;
        this.bossPhase = false;
        this.bossAI = null;
        this.fl = 0.4;
        this.flCol = '#2ecc71';
        this.events.push({ type: 'CONFETTI', x: W / 2, y: 120, color: 'random' });
        this.bossWaveTransitionFrames = 90;
      }
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.encrypted) {
        this.counterEnemy(e);
        this.enemies.splice(i, 1);
      }
    }
    this.shake = 12;
    this.fl = 0.5;
    this.flCol = '#fff';
  }

  counterEnemy(e: Enemy): void {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.totalC++;
    this.recentCounters++;
    const pts = 10 * this.combo * (this.pu.double > 0 ? 2 : 1);
    const bonusPts = Math.floor(pts * this.momPerks.scoreBonus);
    this.score += pts + bonusPts;
    this.events.push({ type: 'SFX', name: 'counter', args: [this.combo] });
    this.events.push({ type: 'PARTICLE', x: e.x, y: e.y, color: e.type.color });
    this.updateMomentum();
    this.director.recordAction(true, performance.now());
  }

  updateMomentum(): void {
    if (this.combo >= 10) {
      this.momPerks.spawnDelay = 0.15;
      this.momPerks.scoreBonus = 0.25;
      this.momPerks.cdReduction = 0.1;
    } else if (this.combo >= 5) {
      this.momPerks.spawnDelay = 0.08;
      this.momPerks.scoreBonus = 0.1;
      this.momPerks.cdReduction = 0.05;
    } else {
      this.momPerks.spawnDelay = 0;
      this.momPerks.scoreBonus = 0;
      this.momPerks.cdReduction = 0;
    }
  }

  addPanic(baseAmt: number): void {
    if (this.pu.shield > 0 || this.panicInvuln > 0) return;

    // Apply logarithmic damage curve from panic system
    const actualDamage = calculatePanicDamage(baseAmt, this.panic);
    this.panic = Math.min(100, this.panic + actualDamage);
    this.panicInvuln = 30;
    this.recentEscapes++;

    this.events.push({ type: 'SFX', name: 'panicHit' });

    // Shake intensity scales with panic zone
    this.shake = 4 + (this.panic / 100) * 8;
    this.fl = 0.2 + (this.panic / 100) * 0.2;
    this.flCol = '#e74c3c';

    if (this.panic >= 100) {
      this.endGame(false);
    }
  }

  findEnemyAt(x: number, y: number): Enemy | null {
    for (const e of this.enemies) {
      const dx = e.x - x;
      const dy = e.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        return e;
      }
    }
    return null;
  }

  update(dt: number, now: number): void {
    if (!this.running) return;

    // Boss wave transition (frame-based delay to allow confetti)
    if (this.bossWaveTransitionFrames > 0) {
      this.bossWaveTransitionFrames--;
      if (this.bossWaveTransitionFrames <= 0) {
        this.nextWave();
      }
    }

    const deltaSec = (dt * 16.67) / 1000; // Convert frame-time factor to seconds

    // ─── Update AI Director ─────────────────────────────
    this.recentResetTimer += deltaSec;
    if (this.recentResetTimer >= 5) {
      // Reset rolling counters every 5 seconds
      this.recentEscapes = 0;
      this.recentCounters = 0;
      this.recentResetTimer = 0;
    }

    this.director.updatePerformance(
      {
        panic: this.panic,
        combo: this.combo,
        recentEscapes: this.recentEscapes,
        recentCounters: this.recentCounters,
        wave: this.wave,
        bossActive: this.bossPhase,
      },
      now
    );
    this.director.update(deltaSec);

    // ─── Panic Decay ────────────────────────────────────
    const decay = calculatePanicDecay(this.panic, this.combo, dt);
    if (decay > 0) {
      this.panic = Math.max(0, this.panic - decay);
    }

    // ─── Wave timer ─────────────────────────────────────
    this.secondAccumulator += dt * 16.67;
    if (this.secondAccumulator >= 1000) {
      this.secondAccumulator -= 1000;
      this.waveTime--;
      if (this.waveTime <= 0) {
        const cfg = WAVES[Math.min(this.wave, WAVES.length - 1)];
        if (!this.endless && cfg.boss && !this.bossPhase) {
          this.startBoss(cfg.boss);
        } else if (this.endless) {
          this.nextWave();
        } else {
          this.nextWave();
        }
      }
    }

    const slowFactor = this.pu.slow > 0 ? 0.5 : 1;

    // ─── Update timers ──────────────────────────────────
    if (this.panicInvuln > 0) this.panicInvuln--;
    if (this.nukeCd > 0) this.nukeCd -= 16.67 * dt;
    if (this.abilityCd.reality > 0) this.abilityCd.reality -= 16.67 * dt;
    if (this.abilityCd.history > 0) this.abilityCd.history -= 16.67 * dt;
    if (this.abilityCd.logic > 0) this.abilityCd.logic -= 16.67 * dt;
    if (this.pu.slow > 0) this.pu.slow -= 16.67 * dt;
    if (this.pu.shield > 0) this.pu.shield -= 16.67 * dt;
    if (this.pu.double > 0) this.pu.double -= 16.67 * dt;

    // ─── Spawn enemies (with AI Director + Panic modifiers) ─────
    if (!this.bossPhase) {
      const cfg = WAVES[Math.min(this.wave, WAVES.length - 1)];
      const panicMods = getPanicModifiers(this.panic, this.wave);
      const directorMods = this.director.modifiers;

      // Spawn delay combines: wave config × momentum × panic × director
      const spawnDelay =
        cfg.spawn *
        (1 - this.momPerks.spawnDelay) *
        panicMods.spawnRateMultiplier *
        directorMods.spawnDelayMultiplier;

      // Max enemies adjusted by director
      const maxEnemies = cfg.max + directorMods.maxEnemyAdjustment;

      if (now - this.lastSpawn > spawnDelay && this.enemies.length < maxEnemies) {
        this.spawnEnemy();
        this.lastSpawn = now;
      }
    }

    // ─── Update enemies ─────────────────────────────────
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.x += e.vx * dt * slowFactor;
      e.y += e.vy * dt * slowFactor;
      if (e.x < -60 || e.x > W + 60 || e.y < -60 || e.y > H + 60) {
        this.enemies.splice(i, 1);
        this.combo = 0;
        this.addPanic(8);
      }
    }

    // ─── Update powerups ────────────────────────────────
    if (now - this.lastPU > 15000) {
      this.spawnPowerUp();
      this.lastPU = now;
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += p.vy * dt;
      if (p.y > H + 30) {
        this.powerups.splice(i, 1);
      }
    }

    // ─── Update boss (Yuka AI-driven) ───────────────────
    if (this.bossPhase && this.boss && this.bossAI) {
      if (this.boss.iFrame > 0) this.boss.iFrame--;
      this.boss.timer++;

      // Feed current state to boss AI
      const actions = this.bossAI.update(deltaSec, {
        x: this.boss.x,
        y: this.boss.y,
        hp: this.boss.hp,
        maxHp: this.boss.maxHp,
        aggression: this.director.modifiers.bossAggression,
        patterns: WAVES[Math.min(this.wave, WAVES.length - 1)].boss?.pats || ['burst'],
        enemyTypes: Object.values(TYPES),
        wave: this.wave,
      });

      // Execute boss actions
      this.executeBossActions(actions);
    }

    // ─── Update flash and shake ─────────────────────────
    if (this.fl > 0) this.fl -= 0.02 * dt;
    if (this.shake > 0) this.shake -= 0.5 * dt;

    // ─── Update feed ────────────────────────────────────
    this.feedTimer += dt * 16.67;
    if (this.feedTimer > 3000) {
      this.feedTimer = 0;
      this.addFeedItem();
    }
  }

  /** Process boss AI action queue */
  private executeBossActions(actions: BossAction[]): void {
    if (!this.boss) return;

    for (const action of actions) {
      switch (action.type) {
        case 'move':
          if (action.x != null) this.boss.x = action.x;
          if (action.y != null) this.boss.y = action.y;
          break;

        case 'spawn_enemies':
          if (action.enemies) {
            for (const partial of action.enemies) {
              this.spawnBossEnemy(partial);
            }
          }
          break;

        case 'flash':
          this.fl = Math.max(this.fl, action.intensity ?? 0.2);
          this.flCol = '#e74c3c';
          break;

        case 'shake':
          this.shake = Math.max(this.shake, action.intensity ?? 6);
          break;
      }
    }
  }

  addFeedItem(): void {
    const feed = FEED[this.feedIdx % FEED.length];
    this.feedIdx++;
    this.events.push({ type: 'FEED', handle: feed[0], text: feed[1], stat: feed[2] });
  }

  getState(): GameState {
    const state: GameState = {
      enemies: this.enemies,
      powerups: this.powerups,
      score: this.score,
      panic: this.panic,
      combo: this.combo,
      wave: this.wave,
      waveTime: this.waveTime,
      abilityCd: this.abilityCd,
      abilityMax: this.abilityMax,
      nukeCd: this.nukeCd,
      nukeMax: this.nukeMax,
      pu: this.pu,
      boss: this.boss,
      running: this.running,
      fl: this.fl,
      flCol: this.flCol,
      shake: this.shake,
      events: [...this.events],
    };
    this.events = []; // Clear events after sending
    return state;
  }
}
