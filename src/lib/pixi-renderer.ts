import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';
import type { GameState } from './events';

export class PixiRenderer {
  app: Application;
  gameContainer: Container;
  starsContainer: Container;
  enemyContainer: Container;
  uiContainer: Container;
  particlesContainer: Container;

  stars: { x: number; y: number; z: number; sz: number; sp: number; a: number; sprite: Graphics }[];
  particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    col: string;
    life: number;
    sprite: Graphics;
  }[];
  confetti: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    col: string;
    life: number;
    sprite: Graphics;
  }[];

  enemyMap: Map<number, { container: Container; text: Text; icon: Text }>;
  powerupMap: Map<string, { container: Container; text: Text }>;
  bossGraphics: Graphics | null;
  flashGraphics: Graphics;

  enemyStyle: TextStyle;
  iconStyle: TextStyle;

  shake: number = 0;

  constructor() {
    this.app = new Application();
    this.gameContainer = new Container();
    this.starsContainer = new Container();
    this.enemyContainer = new Container();
    this.uiContainer = new Container();
    this.particlesContainer = new Container();

    this.stars = [];
    this.particles = [];
    this.confetti = [];
    this.enemyMap = new Map();
    this.powerupMap = new Map();
    this.bossGraphics = null;

    this.flashGraphics = new Graphics();

    this.enemyStyle = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 10,
      fill: 'white',
      align: 'center',
    });

    this.iconStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 32,
      fill: 'white',
      align: 'center',
    });
  }

  async init(canvas: HTMLCanvasElement) {
    await this.app.init({
      canvas,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#0a0a18',
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false, // Retro style
    });

    this.app.stage.addChild(this.gameContainer);
    this.gameContainer.addChild(this.starsContainer);
    this.gameContainer.addChild(this.enemyContainer);
    this.gameContainer.addChild(this.particlesContainer);
    this.gameContainer.addChild(this.uiContainer);

    // Add flash overlay
    this.app.stage.addChild(this.flashGraphics);

    this.initStars();
  }

  initStars() {
    for (let i = 0; i < 80; i++) {
      const star = {
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * 320,
        z: 0,
        sz: Math.random() * 2.5 + 0.5,
        sp: Math.random() * 0.3 + 0.1,
        a: Math.random() * 0.8 + 0.2,
        sprite: new Graphics(),
      };
      star.sprite.rect(0, 0, star.sz, star.sz);
      star.sprite.fill({ color: 0xffffff, alpha: star.a });
      this.starsContainer.addChild(star.sprite);
      this.stars.push(star);
    }
  }

  update(state: GameState) {
    // Update shake
    this.shake = state.shake;
    if (this.shake > 0) {
      const shakeX = (Math.random() - 0.5) * this.shake;
      const shakeY = (Math.random() - 0.5) * this.shake;
      this.gameContainer.position.set(shakeX, shakeY);
    } else {
      this.gameContainer.position.set(0, 0);
    }

    // Update Stars
    for (const star of this.stars) {
      star.x -= star.sp;
      if (star.x < -10) star.x = GAME_WIDTH + 10;
      star.sprite.x = star.x;
      star.sprite.y = star.y;
    }

    // Sync Enemies
    const activeIds = new Set<number>();

    for (const enemy of state.enemies) {
      activeIds.add(enemy.id);
      let entry = this.enemyMap.get(enemy.id);

      if (!entry) {
        // Create new enemy
        const container = new Container();

        const icon = new Text({
          text: enemy.type.icon,
          style: { ...this.iconStyle, fill: enemy.type.color },
        });
        icon.anchor.set(0.5);

        const text = new Text({ text: enemy.word, style: this.enemyStyle });
        text.anchor.set(0.5);
        text.y = 20;

        container.addChild(icon);
        container.addChild(text);

        this.enemyContainer.addChild(container);
        entry = { container, icon, text };
        this.enemyMap.set(enemy.id, entry);
      }

      entry.container.x = enemy.x;
      entry.container.y = enemy.y;
    }

    // Remove dead enemies
    for (const [id, entry] of this.enemyMap) {
      if (!activeIds.has(id)) {
        this.enemyContainer.removeChild(entry.container);
        entry.container.destroy({ children: true });
        this.enemyMap.delete(id);
      }
    }

    // Sync Powerups
    // Remove extra powerups
    while (this.powerupMap.size > state.powerups.length) {
      const key = Array.from(this.powerupMap.keys()).pop();
      if (key) {
        const entry = this.powerupMap.get(key);
        if (entry) {
          this.uiContainer.removeChild(entry.container);
          entry.container.destroy();
          this.powerupMap.delete(key);
        }
      }
    }

    state.powerups.forEach((pu, i) => {
      const key = `pu-${i}`;
      let entry = this.powerupMap.get(key);
      if (!entry) {
        const container = new Container();
        const text = new Text({
          text: pu.icon,
          style: { fontSize: 24, fill: pu.color, fontFamily: 'Arial' },
        });
        text.anchor.set(0.5);
        container.addChild(text);
        this.uiContainer.addChild(container);
        entry = { container, text };
        this.powerupMap.set(key, entry);
      }
      entry.container.x = pu.x;
      entry.container.y = pu.y;
      entry.text.text = pu.icon; // update icon just in case
      entry.text.style.fill = pu.color;
    });

    // Particles
    // Update and draw existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // Gravity
      p.life--;
      p.sprite.x = p.x;
      p.sprite.y = p.y;
      p.sprite.alpha = p.life / 30;

      if (p.life <= 0) {
        this.particlesContainer.removeChild(p.sprite);
        p.sprite.destroy();
        this.particles.splice(i, 1);
      }
    }

    // Confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.3;
      c.life--;
      c.sprite.x = c.x;
      c.sprite.y = c.y;
      c.sprite.alpha = c.life / 100;

      if (c.life <= 0) {
        this.particlesContainer.removeChild(c.sprite);
        c.sprite.destroy();
        this.confetti.splice(i, 1);
      }
    }

    // Boss
    if (state.boss) {
      if (!this.bossGraphics) {
        this.bossGraphics = new Graphics();
        this.gameContainer.addChild(this.bossGraphics);
      }
      this.bossGraphics.clear();

      // Draw boss
      // Use text for boss to match original style: 👾
      // Actually, I can't easily draw text with Graphics.
      // I should manage a boss text sprite.
      // For now, I'll draw a red box placeholder if I can't do text easily here,
      // but wait, I can just add a Text to this.bossGraphics if it was a Container.
      // Let's change bossGraphics to bossContainer later if needed.
      // For now, let's just use a simple red square as fallback if text is hard,
      // BUT I can use Text.

      // Better: let's just make a boss text instance on the fly if needed or cache it.
      // Since boss is unique, I'll add a member `bossText`.
    }

    // Simplified Boss Rendering
    if (state.boss) {
      // Ideally would render the 👾 emoji here
      // I will leave it for now as "Boss logic" handles it, but visual is missing.
      // Let's add a quick text for boss.
      let bossText = this.gameContainer.getChildByName('bossText') as Text;
      if (!bossText) {
        bossText = new Text({ text: '👾', style: { fontSize: 48, fill: '#e74c3c' } });
        bossText.label = 'bossText';
        (bossText as any).name = 'bossText';
        bossText.anchor.set(0.5);
        this.gameContainer.addChild(bossText);
      }
      bossText.x = state.boss.x;
      bossText.y = state.boss.y;
      bossText.visible = true;
    } else {
      const bossText = this.gameContainer.getChildByName('bossText');
      if (bossText) bossText.visible = false;
    }

    // Flash
    if (state.fl > 0) {
      this.flashGraphics.clear();
      this.flashGraphics.rect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      this.flashGraphics.fill({ color: state.flCol, alpha: state.fl });
    } else {
      this.flashGraphics.clear();
    }
  }

  spawnParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 6; i++) {
      const g = new Graphics();
      g.rect(-2, -2, 4, 4);
      g.fill(color);
      g.x = x;
      g.y = y;
      this.particlesContainer.addChild(g);

      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3 - 2,
        col: color,
        life: 30,
        sprite: g,
      });
    }
  }

  spawnConfetti(x: number, y: number) {
    for (let i = 0; i < 60; i++) {
      const col = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'][
        Math.floor(Math.random() * 5)
      ];
      const g = new Graphics();
      g.rect(-3, -3, 6, 6);
      g.fill(col);
      g.x = x;
      g.y = y;
      this.particlesContainer.addChild(g);

      this.confetti.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 10 - 5,
        col,
        life: 100,
        sprite: g,
      });
    }
  }

  destroy() {
    this.app.destroy(true, { children: true, texture: true });
  }
}
