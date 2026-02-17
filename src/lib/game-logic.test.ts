import { beforeEach, describe, expect, it } from 'vitest';
import { GameLogic } from './game-logic';

describe('GameLogic', () => {
  let game: GameLogic;

  beforeEach(() => {
    game = new GameLogic();
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
      expect(game.events).toContainEqual(expect.objectContaining({ type: 'WAVE_START' }));
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

      expect(['slow', 'shield', 'double'].some((t) => powerup.id.startsWith(`${t}-`))).toBe(true);
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

    it('should clear all non-encrypted enemies on nuke', () => {
      // Spawn several enemies — some may be randomly encrypted
      for (let i = 0; i < 5; i++) {
        game.spawnEnemy();
      }
      const totalBefore = game.enemies.length;
      expect(totalBefore).toBe(5);

      const encryptedBefore = game.enemies.filter((e) => e.encrypted).length;

      game.triggerNuke();

      // Only encrypted enemies should survive
      expect(game.enemies.length).toBe(encryptedBefore);
      expect(game.enemies.every((e) => e.encrypted)).toBe(true);
    });
  });

  describe('Panic System', () => {
    it('should add panic with logarithmic damage curve', () => {
      game.addPanic(10);
      // At 0 panic, sigmoid curve softens damage (~0.5x multiplier)
      expect(game.panic).toBeGreaterThan(0);
      expect(game.panic).toBeLessThan(10); // Softened at low panic
    });

    it('should not exceed 100 panic', () => {
      // Need multiple hits to reach 100 due to curve + invuln
      for (let i = 0; i < 30; i++) {
        game.panicInvuln = 0; // Reset invuln for testing
        game.addPanic(50);
      }
      expect(game.panic).toBeLessThanOrEqual(100);
    });

    it('should end game at 100 panic', () => {
      game.running = true;
      // Force panic to near-max then hit with large damage
      game.panic = 95;
      game.addPanic(50); // Amplified at high panic, should push over 100
      expect(game.running).toBe(false);
      expect(game.events).toContainEqual(expect.objectContaining({ type: 'GAME_OVER' }));
    });

    it('should not add panic when shield active', () => {
      game.pu.shield = 1000;
      game.addPanic(50);
      expect(game.panic).toBe(0);
    });

    it('should have invulnerability frames', () => {
      game.addPanic(10);
      const panicAfterFirstHit = game.panic;
      expect(game.panicInvuln).toBeGreaterThan(0);

      game.addPanic(10);
      expect(game.panic).toBe(panicAfterFirstHit); // Should not add more during i-frames
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

  describe('Game Loop Update', () => {
    beforeEach(() => {
      game.start();
    });

    it('should reduce cooldowns', () => {
      game.abilityCd.reality = 100;
      game.nukeCd = 100;
      game.pu.shield = 100;

      game.update(1.0, 1000); // 1 frame (~16ms)

      expect(game.abilityCd.reality).toBeLessThan(100);
      expect(game.nukeCd).toBeLessThan(100);
      expect(game.pu.shield).toBeLessThan(100);
    });

    it('should spawn enemies over time', () => {
      const initial = game.enemies.length;
      // Advance time significantly
      // Spawn delay is around 1000ms usually
      for (let i = 0; i < 120; i++) {
        game.update(1.0, i * 16.67);
      }
      expect(game.enemies.length).toBeGreaterThan(initial);
    });

    it('should update enemies position', () => {
      game.spawnEnemy();
      const enemy = game.enemies[0];
      const initialX = enemy.x;
      const initialY = enemy.y;

      game.update(1.0, 1000);

      const distance = Math.sqrt((enemy.x - initialX) ** 2 + (enemy.y - initialY) ** 2);
      expect(distance).toBeGreaterThan(0);
    });

    it('should remove enemies out of bounds and penalize', () => {
      game.spawnEnemy();
      const enemy = game.enemies[0];
      // Move enemy out of bounds
      enemy.x = -100;

      const initialPanic = game.panic;
      game.update(1.0, 1000);

      expect(game.enemies).not.toContain(enemy);
      expect(game.panic).toBeGreaterThan(initialPanic);
    });

    it('should decay panic over time if combo > 3', () => {
      game.panic = 50;
      game.combo = 10;

      game.update(1.0, 1000);

      expect(game.panic).toBeLessThan(50);
    });

    it('should transition to next wave', () => {
      game.waveTime = 1; // 1 second left
      game.secondAccumulator = 990; // almost a second

      game.update(2.0, 1000); // Push over threshold

      // Should trigger next wave
      expect(game.events).toContainEqual(expect.objectContaining({ type: 'WAVE_START' }));
    });

    it('should update boss when active', () => {
      const bossConfig = {
        name: 'Test Boss',
        hp: 100,
        pats: ['burst'],
      };
      game.startBoss(bossConfig);
      if (!game.boss) throw new Error('Boss not started');
      const boss = game.boss;
      const initialTimer = boss.timer;
      const initialX = boss.x;

      game.update(1.0, 1000);

      expect(boss.timer).toBeGreaterThan(initialTimer);
      // Boss AI always produces a 'move' action, so position should change
      expect(boss.x).not.toBe(initialX);
    });

    it('should process boss hit with nuke', () => {
      const bossConfig = {
        name: 'Test Boss',
        hp: 100,
        pats: ['burst'],
      };
      game.startBoss(bossConfig);
      game.nukeCd = 0;
      game.running = true;

      game.triggerNuke();

      expect(game.boss?.hp).toBeLessThan(100);
      expect(game.events).toContainEqual(expect.objectContaining({ type: 'BOSS_HIT' }));
    });

    it('should kill boss if HP drops to 0', () => {
      const bossConfig = {
        name: 'Test Boss',
        hp: 3,
        pats: ['burst'],
      };
      game.startBoss(bossConfig);
      game.nukeCd = 0;

      game.triggerNuke(); // 3 damage

      expect(game.boss).toBeNull(); // Boss dead
      expect(game.events).toContainEqual(expect.objectContaining({ type: 'BOSS_DIE' }));
      expect(game.bossPhase).toBe(false);
    });
  });
});
