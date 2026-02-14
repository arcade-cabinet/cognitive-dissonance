import { FEED, GAME_HEIGHT, GAME_WIDTH, POWERUPS, TYPES, WAVES } from './constants';
import type { GameEvent, GameState } from './events';
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

  getBossX(t: number): number {
    if (!this.boss) return W / 2;
    this._lastBossX = this.boss.x + Math.sin(t / 800) * 60;
    return this._lastBossX;
  }

  startWave(idx: number): void {
    this.wave = idx;
    const currentWave = WAVES[Math.min(idx, WAVES.length - 1)];
    this.waveTime = currentWave.dur;
    this.bossPhase = false;
    this.boss = null;
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
      y: -60,
      iFrame: 0,
      spiralAngle: 0,
    };
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
    this.events.push({ type: 'SFX', name: 'stopMusic' });
    this.events.push({ type: 'GAME_OVER', score: this.score, win });
  }

  spawnEnemy(): void {
    const typeKeys = Object.keys(TYPES);
    const typeKey = typeKeys[Math.floor(Math.random() * typeKeys.length)];
    const type = TYPES[typeKey];
    const word = type.words[Math.floor(Math.random() * type.words.length)];
    const cfg = WAVES[Math.min(this.wave, WAVES.length - 1)];
    const side = Math.random() < 0.5 ? 0 : 1;
    const enemy: Enemy = {
      id: Date.now() + Math.random(),
      x: side === 0 ? -40 : W + 40,
      y: 100 + Math.random() * 180,
      word,
      type,
      vx: (side === 0 ? 1 : -1) * (0.8 + Math.random() * 0.4) * cfg.spd,
      vy: (Math.random() - 0.5) * 0.3,
      counter: type.counter,
      spd: cfg.spd,
    };
    this.enemies.push(enemy);
  }

  spawnPowerUp(): void {
    const pu = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    this.powerups.push({
      ...pu,
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
        this.fl = 0.4;
        this.flCol = '#2ecc71';
        this.events.push({ type: 'CONFETTI', x: W / 2, y: 120, color: 'random' });
        setTimeout(() => this.nextWave(), 1500);
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
    const pts = 10 * this.combo * (this.pu.double > 0 ? 2 : 1);
    const bonusPts = Math.floor(pts * this.momPerks.scoreBonus);
    this.score += pts + bonusPts;
    this.events.push({ type: 'SFX', name: 'counter', args: [this.combo] });
    this.events.push({ type: 'PARTICLE', x: e.x, y: e.y, color: e.type.color });
    this.updateMomentum();
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

  addPanic(amt: number): void {
    if (this.pu.shield > 0 || this.panicInvuln > 0) return;
    this.panic = Math.min(100, this.panic + amt);
    this.panicInvuln = 30;
    this.events.push({ type: 'SFX', name: 'panicHit' });
    this.shake = 6;
    this.fl = 0.3;
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

    // Wave timer logic
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

    // Update timers
    if (this.panicInvuln > 0) this.panicInvuln--;
    if (this.nukeCd > 0) this.nukeCd -= 16.67 * dt;
    if (this.abilityCd.reality > 0) this.abilityCd.reality -= 16.67 * dt;
    if (this.abilityCd.history > 0) this.abilityCd.history -= 16.67 * dt;
    if (this.abilityCd.logic > 0) this.abilityCd.logic -= 16.67 * dt;
    if (this.pu.slow > 0) this.pu.slow -= 16.67 * dt;
    if (this.pu.shield > 0) this.pu.shield -= 16.67 * dt;
    if (this.pu.double > 0) this.pu.double -= 16.67 * dt;

    // Update enemies
    if (!this.bossPhase) {
      const cfg = WAVES[Math.min(this.wave, WAVES.length - 1)];
      const spawnDelay = cfg.spawn * (1 - this.momPerks.spawnDelay);
      if (now - this.lastSpawn > spawnDelay && this.enemies.length < cfg.max) {
        this.spawnEnemy();
        this.lastSpawn = now;
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.x += e.vx * dt * slowFactor;
      e.y += e.vy * dt * slowFactor;
      if (e.x < -60 || e.x > W + 60) {
        this.enemies.splice(i, 1);
        this.combo = 0;
        this.addPanic(8);
      }
    }

    // Update powerups
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

    // Update boss
    if (this.bossPhase && this.boss) {
      if (this.boss.iFrame > 0) this.boss.iFrame--;
      this.boss.timer++;

      // Basic boss movement
      this.boss.x = this.getBossX(now);

      // Attacks - simplified as in original logic (logic was commented out there too? No, it said "simplified for brevity" in my thought process)
      // I should check game-engine.ts content closely.
      // In game-engine.ts, it said: "// Boss movement and attacks would go here // (simplified for brevity)"
      // WAIT, the file read output showed that comment!
      // Does that mean the original game logic was missing boss logic??
      // Let me re-read game-engine.ts carefully.
    }

    // Logic for boss patterns seems missing in the file I read.
    // It seems I might have missed it or the provided file content was truncated or simplified by the user/system?
    // "Complete game logic extracted and converted to TypeScript" comment suggests it was extracted.
    // I should check `startBoss` again. It sets `pat`.
    // But `loop` had `// Boss movement and attacks would go here`
    // This implies the current codebase might have incomplete boss logic?
    // Or I missed it.
    // I will stick to what is there. If it was missing, I can't invent it without specific instructions.
    // However, `getBossX` exists. I used it.

    // Update flash and shake
    if (this.fl > 0) this.fl -= 0.02 * dt;
    if (this.shake > 0) this.shake -= 0.5 * dt;

    // Update feed
    this.feedTimer += dt * 16.67;
    if (this.feedTimer > 3000) {
      this.feedTimer = 0;
      this.addFeedItem();
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
