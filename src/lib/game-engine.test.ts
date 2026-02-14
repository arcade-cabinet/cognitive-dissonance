import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from './game-engine';

// Mock canvas and audio
const createMockCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  // Mock getContext for testing environment
  if (!canvas.getContext('2d')) {
    canvas.getContext = vi.fn().mockReturnValue({
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      createLinearGradient: vi.fn(),
      createRadialGradient: vi.fn(),
      createPattern: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 0 }),
    });
  }
  return canvas;
};

// Mock AudioContext
class MockAudioContext {
  createOscillator() {
    return {
      type: 'square',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }
  currentTime = 0;
  state = 'running';
  resume = vi.fn();
  destination = {};
}

// Mock AudioContext for testing - cast through unknown for type safety
global.AudioContext = MockAudioContext as unknown as typeof AudioContext;

describe('GameEngine', () => {
  let canvas: HTMLCanvasElement;
  let game: GameEngine;

  beforeEach(() => {
    // Setup DOM elements needed by game
    document.body.innerHTML = `
      <div id="overlay" class="hidden"></div>
      <div id="overlay-title"></div>
      <div id="overlay-desc"></div>
      <div id="end-stats" class="hidden"></div>
      <div id="hype-feed"></div>
      <div id="boss-hp-container"></div>
      <div id="boss-name"></div>
      <div id="boss-hp-bar"></div>
      <div id="wave-announce"></div>
      <div id="wa-title"></div>
      <div id="wa-sub"></div>
      <div id="panic-bar"></div>
      <div id="combo-display"></div>
      <div id="wave-display"></div>
      <div id="time-display"></div>
      <div id="score-display"></div>
      <div id="cd-reality"></div>
      <div id="cd-history"></div>
      <div id="cd-logic"></div>
      <div id="cd-special"></div>
      <div id="pu-slow"></div>
      <div id="pu-shield"></div>
      <div id="pu-double"></div>
    `;

    canvas = createMockCanvas();
    game = new GameEngine(canvas);
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(game.score).toBe(0);
      expect(game.panic).toBe(0);
      expect(game.combo).toBe(0);
      expect(game.running).toBe(false);
      expect(game.wave).toBe(0);
      expect(game.enemies).toHaveLength(0);
    });

    it('should initialize with canvas context', () => {
      expect(game.canvas).toBeDefined();
      expect(game.c).toBeDefined();
    });

    it('should initialize audio system', () => {
      expect(game.sfx).toBeDefined();
    });

    it('should initialize stars for background', () => {
      expect(game.stars).toHaveLength(80);
      game.stars.forEach((star) => {
        expect(star.x).toBeGreaterThanOrEqual(0);
        expect(star.y).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Game State', () => {
    it('should reset game state', () => {
      game.score = 1000;
      game.panic = 50;
      game.combo = 10;
      game.running = true;

      game.reset();

      expect(game.score).toBe(0);
      expect(game.panic).toBe(0);
      expect(game.combo).toBe(0);
      expect(game.running).toBe(false);
    });

    it('should start game correctly', () => {
      game.start();

      expect(game.running).toBe(true);
      expect(game.wave).toBe(0);

      // Stop the game to prevent runaway animation frames
      game.running = false;
    });
  });

  describe('Enemy Management', () => {
    it('should spawn enemies', () => {
      const initialCount = game.enemies.length;
      game.spawnEnemy();
      expect(game.enemies.length).toBe(initialCount + 1);
    });

    it('should spawn enemy with correct properties', () => {
      game.spawnEnemy();
      const enemy = game.enemies[0];

      expect(enemy).toBeDefined();
      expect(enemy.word).toBeDefined();
      expect(enemy.type).toBeDefined();
      expect(enemy.x).toBeDefined();
      expect(enemy.y).toBeDefined();
      expect(['reality', 'history', 'logic']).toContain(enemy.counter);
    });

    it('should find enemy at position', () => {
      game.spawnEnemy();
      const enemy = game.enemies[0];
      const found = game.findEnemyAt(enemy.x, enemy.y);

      expect(found).toBe(enemy);
    });

    it('should not find enemy at far position', () => {
      game.spawnEnemy();
      const found = game.findEnemyAt(9999, 9999);

      expect(found).toBeNull();
    });
  });

  describe('Powerup Management', () => {
    it('should spawn powerups', () => {
      const initialCount = game.powerups.length;
      game.spawnPowerUp();
      expect(game.powerups.length).toBe(initialCount + 1);
    });

    it('should spawn powerup with valid type', () => {
      game.spawnPowerUp();
      const powerup = game.powerups[0];

      expect(['slow', 'shield', 'double']).toContain(powerup.id);
      expect(powerup.x).toBeGreaterThan(0);
      expect(powerup.y).toBeDefined();
    });
  });

  describe('Ability System', () => {
    beforeEach(() => {
      game.running = true;
    });

    it('should trigger reality ability', () => {
      game.triggerAbility('reality');
      expect(game.abilityCd.reality).toBeGreaterThan(0);
    });

    it('should trigger history ability', () => {
      game.triggerAbility('history');
      expect(game.abilityCd.history).toBeGreaterThan(0);
    });

    it('should trigger logic ability', () => {
      game.triggerAbility('logic');
      expect(game.abilityCd.logic).toBeGreaterThan(0);
    });

    it('should not trigger ability on cooldown', () => {
      game.triggerAbility('reality');
      const firstCd = game.abilityCd.reality;
      game.triggerAbility('reality');
      expect(game.abilityCd.reality).toBe(firstCd);
    });

    it('should counter correct enemy type', () => {
      // Spawn a reality enemy
      game.spawnEnemy();
      const enemy = game.enemies[0];
      if (enemy.counter === 'reality') {
        const initialScore = game.score;
        game.triggerAbility('reality');
        expect(game.score).toBeGreaterThan(initialScore);
        expect(game.enemies).not.toContain(enemy);
      }
    });
  });

  describe('Nuke System', () => {
    beforeEach(() => {
      game.running = true;
    });

    it('should trigger nuke', () => {
      game.triggerNuke();
      expect(game.nukeCd).toBeGreaterThan(0);
    });

    it('should not trigger nuke on cooldown', () => {
      game.triggerNuke();
      const firstCd = game.nukeCd;
      game.triggerNuke();
      expect(game.nukeCd).toBe(firstCd);
    });

    it('should clear all enemies on nuke', () => {
      game.spawnEnemy();
      game.spawnEnemy();
      game.spawnEnemy();
      expect(game.enemies.length).toBe(3);

      game.triggerNuke();
      expect(game.enemies.length).toBe(0);
    });
  });

  describe('Panic System', () => {
    it('should add panic', () => {
      game.addPanic(10);
      expect(game.panic).toBe(10);
    });

    it('should not exceed 100 panic', () => {
      game.addPanic(150);
      expect(game.panic).toBe(100);
    });

    it('should end game at 100 panic', () => {
      game.running = true;
      game.addPanic(100);
      expect(game.running).toBe(false);
    });

    it('should not add panic when shield active', () => {
      game.pu.shield = 1000;
      game.addPanic(50);
      expect(game.panic).toBe(0);
    });

    it('should have invulnerability frames', () => {
      game.addPanic(10);
      expect(game.panicInvuln).toBeGreaterThan(0);

      game.addPanic(10);
      expect(game.panic).toBe(10); // Should not add more during i-frames
    });
  });

  describe('Combo System', () => {
    beforeEach(() => {
      game.running = true;
    });

    it('should increment combo on counter', () => {
      game.spawnEnemy();
      const enemy = game.enemies[0];
      game.counterEnemy(enemy);
      expect(game.combo).toBe(1);
    });

    it('should track max combo', () => {
      game.spawnEnemy();
      game.counterEnemy(game.enemies[0]);
      game.spawnEnemy();
      game.counterEnemy(game.enemies[0]);
      expect(game.maxCombo).toBe(2);
    });

    it('should increase score with combo multiplier', () => {
      game.spawnEnemy();
      game.counterEnemy(game.enemies[0]);
      const score1 = game.score;

      game.spawnEnemy();
      game.counterEnemy(game.enemies[0]);
      const score2 = game.score - score1;

      expect(score2).toBeGreaterThan(score1);
    });

    it('should reset combo on miss', () => {
      game.combo = 10;
      game.triggerAbility('reality'); // Will miss if no reality enemies
      expect(game.combo).toBe(0);
    });
  });

  describe('Boss System', () => {
    it('should start boss phase', () => {
      const bossConfig = {
        name: 'Test Boss',
        hp: 10,
        pats: ['burst'],
      };

      game.startBoss(bossConfig);

      expect(game.bossPhase).toBe(true);
      expect(game.boss).toBeDefined();
      expect(game.boss?.name).toBe('Test Boss');
      expect(game.boss?.hp).toBe(10);
    });

    it('should clear enemies when boss starts', () => {
      game.spawnEnemy();
      game.spawnEnemy();
      expect(game.enemies.length).toBe(2);

      const bossConfig = {
        name: 'Test Boss',
        hp: 10,
        pats: ['burst'],
      };
      game.startBoss(bossConfig);

      expect(game.enemies.length).toBe(0);
    });
  });

  describe('Wave System', () => {
    it('should start wave 0', () => {
      game.startWave(0);
      expect(game.wave).toBe(0);
      expect(game.waveTime).toBeGreaterThan(0);
    });

    it('should progress to next wave', () => {
      game.wave = 0;
      game.nextWave();
      expect(game.wave).toBeGreaterThan(0);
    });
  });

  describe('UI Updates', () => {
    it('should update UI elements', () => {
      game.score = 100;
      game.panic = 50;
      game.combo = 5;
      game.updateUI();

      const scoreDisplay = document.getElementById('score-display');
      const panicBar = document.getElementById('panic-bar');
      const comboDisplay = document.getElementById('combo-display');

      expect(scoreDisplay?.textContent).toBe('100');
      expect(panicBar?.style.width).toBe('50%');
      expect(comboDisplay?.textContent).toBe('COMBO: x5');
    });
  });

  describe('Momentum Perks', () => {
    it('should activate perks at combo 5', () => {
      game.combo = 5;
      game.updateMomentum();

      expect(game.momPerks.spawnDelay).toBeGreaterThan(0);
      expect(game.momPerks.scoreBonus).toBeGreaterThan(0);
    });

    it('should activate stronger perks at combo 10', () => {
      game.combo = 10;
      game.updateMomentum();

      expect(game.momPerks.spawnDelay).toBe(0.15);
      expect(game.momPerks.scoreBonus).toBe(0.25);
      expect(game.momPerks.cdReduction).toBe(0.1);
    });

    it('should have no perks below combo 5', () => {
      game.combo = 3;
      game.updateMomentum();

      expect(game.momPerks.spawnDelay).toBe(0);
      expect(game.momPerks.scoreBonus).toBe(0);
      expect(game.momPerks.cdReduction).toBe(0);
    });
  });
});
