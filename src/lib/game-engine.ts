// Complete game logic extracted and converted to TypeScript
import { SFX } from './audio';
import { FEED, GAME_HEIGHT, GAME_WIDTH, POWERUPS, TYPES, WAVES } from './constants';
import type { Boss, BossConfig, Confetti, Enemy, MomentumPerks, Particle, PowerUpInstance, Star, Trail } from './types';

const W = GAME_WIDTH;
const H = GAME_HEIGHT;

export class GameEngine {
  canvas: HTMLCanvasElement;
  c: CanvasRenderingContext2D;
  sfx: SFX;
  stars: Star[];
  feedTimer: number;
  feedIdx: number;
  _lastBossX: number;

  // Game state
  enemies: Enemy[];
  particles: Particle[];
  powerups: PowerUpInstance[];
  trails: Trail[];
  confetti: Confetti[];
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
  wT: ReturnType<typeof setInterval> | null;
  lastFrame: number;
  momPerks: MomentumPerks;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.c = canvas.getContext('2d')!;
    this.sfx = new SFX();
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * 320,
        z: 0,
        sz: Math.random() * 2.5 + 0.5,
        sp: Math.random() * 0.3 + 0.1,
        a: Math.random() * 0.8 + 0.2,
      });
    }
    this.feedTimer = 0;
    this.feedIdx = 0;
    this._lastBossX = W / 2;

    // Initialize all properties
    this.enemies = [];
    this.particles = [];
    this.powerups = [];
    this.trails = [];
    this.confetti = [];
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
    this.wT = null;
    this.lastFrame = 0;
    this.momPerks = { spawnDelay: 0, scoreBonus: 0, cdReduction: 0 };

    this.reset();
  }

  reset(): void {
    // Clear any running wave timer
    if (this.wT) {
      clearInterval(this.wT as unknown as number);
      this.wT = null;
    }

    this.enemies = [];
    this.particles = [];
    this.powerups = [];
    this.trails = [];
    this.confetti = [];
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
  }

  start(): void {
    this.reset();
    this.running = true;
    if (!this.sfx.ctx) this.sfx.init();
    this.sfx.resume();
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.add('hidden');
    const endStats = document.getElementById('end-stats');
    if (endStats) {
      endStats.classList.add('hidden');
      endStats.innerHTML = '';
    }
    const hypeFeed = document.getElementById('hype-feed');
    if (hypeFeed) hypeFeed.innerHTML = '';
    this.feedIdx = 0;
    this.startWave(0);
    this.updateUI();
    this.lastFrame = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  getBossX(t: number): number {
    if (!this.boss) return W / 2;
    this._lastBossX = this.boss.x + Math.sin(t / 800) * 60;
    return this._lastBossX;
  }

  startWave(idx: number): void {
    this.sfx.stopMusic();
    this.wave = idx;
    const currentWave = WAVES[Math.min(idx, WAVES.length - 1)];
    this.waveTime = currentWave.dur;
    this.bossPhase = false;
    this.boss = null;
    const bossContainer = document.getElementById('boss-hp-container');
    if (bossContainer) bossContainer.style.display = 'none';
    const waveAnnounce = document.getElementById('wave-announce');
    const isEndless = idx >= WAVES.length;
    const title = isEndless ? `ENDLESS ${idx - (WAVES.length - 1)}` : `WAVE ${idx + 1}`;
    const titleEl = document.getElementById('wa-title');
    const subEl = document.getElementById('wa-sub');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = isEndless ? '"No more timelines. Just vibes."' : currentWave.sub;
    if (waveAnnounce) {
      waveAnnounce.classList.remove('show');
      void waveAnnounce.offsetWidth;
      waveAnnounce.classList.add('show');
    }
    this.sfx.waveStart();
    this.sfx.startMusic(Math.min(idx, 4));
    this.updateUI();
    if (this.wT) clearInterval(this.wT as unknown as number);
    this.wT = setInterval(() => {
      this.waveTime--;
      if (this.waveTime <= 0) {
        if (this.wT) clearInterval(this.wT as unknown as number);
        const cfg = WAVES[Math.min(this.wave, WAVES.length - 1)];
        if (!this.endless && cfg.boss && !this.bossPhase) {
          this.startBoss(cfg.boss);
        } else if (this.endless) {
          this.nextWave();
        } else {
          this.nextWave();
        }
      }
      this.updateUI();
    }, 1000);
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
    const bossContainer = document.getElementById('boss-hp-container');
    if (bossContainer) bossContainer.style.display = 'block';
    const bossName = document.getElementById('boss-name');
    if (bossName) bossName.textContent = cfg.name;
    const bossHpBar = document.getElementById('boss-hp-bar');
    if (bossHpBar) bossHpBar.style.width = '100%';
    const waveAnnounce = document.getElementById('wave-announce');
    const titleEl = document.getElementById('wa-title');
    const subEl = document.getElementById('wa-sub');
    if (titleEl) titleEl.textContent = '⚠ BOSS ⚠';
    if (subEl) subEl.textContent = cfg.name;
    if (waveAnnounce) {
      waveAnnounce.classList.remove('show');
      void waveAnnounce.offsetWidth;
      waveAnnounce.classList.add('show');
    }
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
    this.sfx.stopMusic();
    if (this.wT) clearInterval(this.wT);
    const overlay = document.getElementById('overlay');
    const title = document.getElementById('overlay-title');
    const desc = document.getElementById('overlay-desc');
    const stats = document.getElementById('end-stats');
    if (win) {
      if (title) title.innerHTML = 'CRISIS AVERTED';
      if (desc)
        desc.innerHTML =
          'His brain is safe... for now.<br><br>Press SPACE to continue into ENDLESS MODE';
      const acc =
        this.totalC + this.totalM > 0
          ? Math.round((this.totalC / (this.totalC + this.totalM)) * 100)
          : 0;
      if (stats) {
        stats.innerHTML = `SCORE: ${this.score}<br>ACCURACY: ${acc}%<br>MAX COMBO: x${this.maxCombo}<br>NUKES: ${this.nukesUsed}`;
        stats.classList.remove('hidden');
      }
    } else {
      if (title) title.innerHTML = 'FULL PSYCHOSIS';
      if (desc) desc.innerHTML = 'His brain melted. Game over.<br><br>Press SPACE to retry';
      const acc =
        this.totalC + this.totalM > 0
          ? Math.round((this.totalC / (this.totalC + this.totalM)) * 100)
          : 0;
      if (stats) {
        stats.innerHTML = `SCORE: ${this.score}<br>WAVE: ${this.wave + 1}<br>ACCURACY: ${acc}%<br>MAX COMBO: x${this.maxCombo}`;
        stats.classList.remove('hidden');
      }
    }
    if (overlay) overlay.classList.remove('hidden');
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
      this.sfx.miss();
    }
    this.updateUI();
  }

  triggerNuke(): void {
    if (!this.running) return;
    if (this.nukeCd > 0) return;
    this.nukeCd = this.nukeMax;
    this.nukesUsed++;
    this.sfx.nuke();
    if (this.bossPhase && this.boss && this.boss.iFrame <= 0) {
      this.boss.hp = Math.max(0, this.boss.hp - 3);
      this.boss.iFrame = 15;
      this.sfx.bossHit();
      const bossHpBar = document.getElementById('boss-hp-bar');
      if (bossHpBar && this.boss) {
        bossHpBar.style.width = `${(this.boss.hp / this.boss.maxHp) * 100}%`;
      }
      if (this.boss.hp <= 0) {
        this.sfx.bossDie();
        this.boss = null;
        this.bossPhase = false;
        this.fl = 0.4;
        this.flCol = '#2ecc71';
        for (let i = 0; i < 60; i++) {
          this.confetti.push({
            x: W / 2,
            y: 120,
            vx: (Math.random() - 0.5) * 8,
            vy: -Math.random() * 10 - 5,
            col: ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'][
              Math.floor(Math.random() * 5)
            ],
            life: 100,
          });
        }
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
    this.updateUI();
  }

  counterEnemy(e: Enemy): void {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.totalC++;
    const pts = 10 * this.combo * (this.pu.double > 0 ? 2 : 1);
    const bonusPts = Math.floor(pts * this.momPerks.scoreBonus);
    this.score += pts + bonusPts;
    this.sfx.counter(this.combo);
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3 - 2,
        col: e.type.color,
        life: 30,
      });
    }
    this.updateMomentum();
    this.updateUI();
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
    this.sfx.panicHit();
    this.shake = 6;
    this.fl = 0.3;
    this.flCol = '#e74c3c';
    if (this.panic >= 100) {
      this.endGame(false);
    }
    this.updateUI();
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

  updateUI(): void {
    const panicBar = document.getElementById('panic-bar');
    if (panicBar) panicBar.style.width = `${this.panic}%`;
    const comboDisplay = document.getElementById('combo-display');
    if (comboDisplay) comboDisplay.textContent = `COMBO: x${this.combo}`;
    const waveDisplay = document.getElementById('wave-display');
    if (waveDisplay) {
      if (this.wave >= WAVES.length) {
        waveDisplay.textContent = `ENDLESS ${this.wave - (WAVES.length - 1)}`;
      } else {
        waveDisplay.textContent = `WAVE ${this.wave + 1}`;
      }
    }
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) timeDisplay.textContent = `${this.waveTime}`;
    const scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) scoreDisplay.textContent = `${this.score}`;

    // Update cooldown bars
    const cdReality = document.getElementById('cd-reality');
    if (cdReality)
      cdReality.style.width = `${(this.abilityCd.reality / this.abilityMax.reality) * 100}%`;
    const cdHistory = document.getElementById('cd-history');
    if (cdHistory)
      cdHistory.style.width = `${(this.abilityCd.history / this.abilityMax.history) * 100}%`;
    const cdLogic = document.getElementById('cd-logic');
    if (cdLogic) cdLogic.style.width = `${(this.abilityCd.logic / this.abilityMax.logic) * 100}%`;
    const cdSpecial = document.getElementById('cd-special');
    if (cdSpecial) cdSpecial.style.width = `${(this.nukeCd / this.nukeMax) * 100}%`;

    // Update powerup display
    const puSlow = document.getElementById('pu-slow');
    if (puSlow) puSlow.style.opacity = this.pu.slow > 0 ? '1' : '0.15';
    const puShield = document.getElementById('pu-shield');
    if (puShield) puShield.style.opacity = this.pu.shield > 0 ? '1' : '0.15';
    const puDouble = document.getElementById('pu-double');
    if (puDouble) puDouble.style.opacity = this.pu.double > 0 ? '1' : '0.15';
  }

  loop(now: number): void {
    if (!this.running) return;
    const dt = Math.min((now - this.lastFrame) / 16.67, 2);
    this.lastFrame = now;
    const slowFactor = this.pu.slow > 0 ? 0.5 : 1;

    // Update timers
    if (this.panicInvuln > 0) this.panicInvuln--;
    if (this.nukeCd > 0) this.nukeCd -= 16.67;
    if (this.abilityCd.reality > 0) this.abilityCd.reality -= 16.67;
    if (this.abilityCd.history > 0) this.abilityCd.history -= 16.67;
    if (this.abilityCd.logic > 0) this.abilityCd.logic -= 16.67;
    if (this.pu.slow > 0) this.pu.slow -= 16.67;
    if (this.pu.shield > 0) this.pu.shield -= 16.67;
    if (this.pu.double > 0) this.pu.double -= 16.67;

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

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.15 * dt;
      p.life--;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 0.3 * dt;
      c.life--;
      if (c.life <= 0) this.confetti.splice(i, 1);
    }

    // Update boss
    if (this.bossPhase && this.boss) {
      if (this.boss.iFrame > 0) this.boss.iFrame--;
      this.boss.timer++;

      // Boss movement and attacks would go here
      // (simplified for brevity)
    }

    // Update flash and shake
    if (this.fl > 0) this.fl -= 0.02 * dt;
    if (this.shake > 0) this.shake -= 0.5 * dt;

    // Update feed
    this.feedTimer += dt;
    if (this.feedTimer > 180) {
      this.feedTimer = 0;
      this.addFeedItem();
    }

    // Render
    this.render(now);
    this.updateUI();

    requestAnimationFrame(this.loop.bind(this));
  }

  addFeedItem(): void {
    const feed = FEED[this.feedIdx % FEED.length];
    this.feedIdx++;
    const hypeFeed = document.getElementById('hype-feed');
    if (hypeFeed) {
      const item = document.createElement('div');
      item.className = 'feed-item';
      item.innerHTML = `<span class="feed-handle">${feed[0]}</span><span class="feed-text">${feed[1]}</span><span class="feed-stat">${feed[2]}</span>`;
      hypeFeed.appendChild(item);
      setTimeout(() => item.classList.add('show'), 10);
      setTimeout(() => {
        item.classList.remove('show');
        setTimeout(() => item.remove(), 500);
      }, 4000);
      while (hypeFeed.children.length > 3) {
        hypeFeed.children[0].remove();
      }
    }
  }

  render(t: number): void {
    const shake = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    this.c.save();
    this.c.translate(shake, shake);

    // Clear canvas
    this.c.fillStyle = '#0a0a18';
    this.c.fillRect(0, 0, W, H);

    // Draw stars
    for (const star of this.stars) {
      star.x -= star.sp;
      if (star.x < -10) star.x = W + 10;
      this.c.fillStyle = `rgba(255,255,255,${star.a})`;
      this.c.fillRect(star.x, star.y, star.sz, star.sz);
    }

    // Draw enemies
    for (const e of this.enemies) {
      this.c.save();
      this.c.translate(e.x, e.y);
      this.c.fillStyle = e.type.color;
      this.c.font = '32px Arial';
      this.c.textAlign = 'center';
      this.c.textBaseline = 'middle';
      this.c.fillText(e.type.icon, 0, 0);
      this.c.font = '10px "Press Start 2P"';
      this.c.fillText(e.word, 0, 20);
      this.c.restore();
    }

    // Draw powerups
    for (const p of this.powerups) {
      this.c.fillStyle = p.color;
      this.c.font = '24px Arial';
      this.c.textAlign = 'center';
      this.c.fillText(p.icon, p.x, p.y);
    }

    // Draw particles
    for (const p of this.particles) {
      this.c.fillStyle = p.col;
      this.c.globalAlpha = p.life / 30;
      this.c.fillRect(p.x - 2, p.y - 2, 4, 4);
      this.c.globalAlpha = 1;
    }

    // Draw confetti
    for (const c of this.confetti) {
      this.c.fillStyle = c.col;
      this.c.globalAlpha = c.life / 100;
      this.c.fillRect(c.x - 3, c.y - 3, 6, 6);
      this.c.globalAlpha = 1;
    }

    // Draw boss
    if (this.bossPhase && this.boss) {
      const bx = this.getBossX(t);
      this.c.save();
      this.c.translate(bx, this.boss.y);
      this.c.fillStyle = '#e74c3c';
      this.c.font = '48px Arial';
      this.c.textAlign = 'center';
      this.c.fillText('👾', 0, 0);
      this.c.restore();
    }

    // Flash overlay
    if (this.fl > 0) {
      this.c.fillStyle = this.flCol;
      this.c.globalAlpha = this.fl;
      this.c.fillRect(0, 0, W, H);
      this.c.globalAlpha = 1;
    }

    this.c.restore();
  }
}
