import { beforeEach, describe, expect, it } from 'vitest';
import { GameLogic } from './game-logic';
import { WAVES } from './constants';

describe('GameLogic Coverage', () => {
  let game: GameLogic;

  beforeEach(() => {
    game = new GameLogic();
    game.running = true;
  });

  it('should transition to endless mode correctly', () => {
    // Setup last wave state
    game.wave = WAVES.length - 1;
    game.endless = true;
    game.endlessLevel = 0;

    game.nextWave();

    expect(game.endlessLevel).toBe(1);
    expect(game.wave).toBe(WAVES.length + 1);
  });

  it('should end game if not endless and last wave complete', () => {
    game.wave = WAVES.length - 1;
    game.endless = false;

    game.nextWave();

    expect(game.running).toBe(false);
    expect(game.events).toContainEqual(expect.objectContaining({ type: 'GAME_OVER', win: true }));
  });

  it('should not damage boss with nuke if iFrame is active', () => {
    const bossConfig = { name: 'Test Boss', hp: 100, pats: ['burst'] };
    game.startBoss(bossConfig);
    if (!game.boss) throw new Error('Boss not started');

    // Hit boss once to trigger iFrames
    game.nukeCd = 0;
    game.triggerNuke();
    expect(game.boss.iFrame).toBeGreaterThan(0);
    const hpAfterFirstHit = game.boss.hp;

    // Hit again immediately
    game.nukeCd = 0;
    game.triggerNuke();

    expect(game.boss.hp).toBe(hpAfterFirstHit); // Should be same
  });

  it('should not add panic if invulnerability is active', () => {
    game.panicInvuln = 10;
    const initialPanic = game.panic;

    game.addPanic(10);

    expect(game.panic).toBe(initialPanic);
  });

  it('should not add panic if shield is active', () => {
    game.pu.shield = 100;
    const initialPanic = game.panic;

    game.addPanic(10);

    expect(game.panic).toBe(initialPanic);
  });

  it('should spawn boss enemy from partial data', () => {
      const bossConfig = { name: 'Test Boss', hp: 100, pats: ['burst'] };
      game.startBoss(bossConfig);

      const action = {
          type: 'spawn_enemies',
          enemies: [{ x: 100, y: 100, vx: 1, vy: 1 }]
      };

      // biome-ignore lint/suspicious/noExplicitAny: access private method for testing
      (game as unknown as { executeBossActions: (actions: Array<{ type: string; enemies: Array<{ x: number; y: number; vx: number; vy: number }> }>) => void }).executeBossActions([action]);

      expect(game.enemies.length).toBeGreaterThan(0);
      if (game.enemies.length > 0) {
        const enemy = game.enemies[0];
        expect(enemy.x).toBe(100);
        expect(enemy.y).toBe(100);
      }
  });
});
