import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, POWERUPS, TYPES, WAVES } from '../lib/constants';
describe('Game Constants', () => {
    it('should have correct game dimensions', () => {
        expect(GAME_WIDTH).toBe(800);
        expect(GAME_HEIGHT).toBe(600);
    });
    it('should have three enemy types', () => {
        const typeKeys = Object.keys(TYPES);
        expect(typeKeys).toHaveLength(3);
        expect(typeKeys).toContain('REALITY');
        expect(typeKeys).toContain('HISTORY');
        expect(typeKeys).toContain('LOGIC');
    });
    it('should have valid enemy type data', () => {
        for (const type of Object.values(TYPES)) {
            expect(type.words).toBeInstanceOf(Array);
            expect(type.words.length).toBeGreaterThan(0);
            expect(type.color).toMatch(/^#[0-9a-f]{6}$/i);
            expect(type.icon).toBeTruthy();
            expect(['reality', 'history', 'logic']).toContain(type.counter);
        }
    });
    it('should have five waves', () => {
        expect(WAVES).toHaveLength(5);
    });
    it('should have progressive difficulty in waves', () => {
        for (let i = 1; i < WAVES.length; i++) {
            expect(WAVES[i].spd).toBeGreaterThanOrEqual(WAVES[i - 1].spd);
        }
    });
    it('should have three powerup types', () => {
        expect(POWERUPS).toHaveLength(3);
        const ids = POWERUPS.map((p) => p.id);
        expect(ids).toContain('slow');
        expect(ids).toContain('shield');
        expect(ids).toContain('double');
    });
});
