import { beforeEach, describe, expect, it } from 'vitest';
import { AIDirector } from './director';

describe('AIDirector', () => {
  let director: AIDirector;

  beforeEach(() => {
    director = new AIDirector();
  });

  it('should initialize with default state', () => {
    expect(director.tension).toBe(0.3);
    expect(director.fsm.currentState?.constructor.name).toBe('BuildingState');
    expect(director.modifiers).toBeDefined();
  });

  it('should update tension over time', () => {
    const initialTension = director.tension;
    director.targetTension = 0.8;
    director.update(0.1); // 100ms
    expect(director.tension).toBeGreaterThan(initialTension);
    expect(director.tension).toBeLessThan(0.8);
  });

  it('should calculate modifiers correctly based on tension', () => {
    director.tension = 0.5;
    director.targetTension = 0.5; // stabilize
    director.update(0.016);

    expect(director.modifiers.tension).toBeCloseTo(0.5);
    // spawnDelay: 1.2 - 0.5 * 0.55 = 1.2 - 0.275 = 0.925
    expect(director.modifiers.spawnDelayMultiplier).toBeCloseTo(0.925);
  });

  it('should record player actions and update accuracy', () => {
    const now = 1000;
    director.recordAction(true, now);
    director.recordAction(false, now + 100);

    director.updatePerformance({}, now + 200);
    expect(director.performance.accuracy).toBe(0.5); // 1 hit, 1 miss
  });

  it('should prune old actions', () => {
    const now = 10000;
    director.recordAction(true, now - 6000); // Too old (window is 5000)
    director.recordAction(true, now - 1000); // Valid

    director.updatePerformance({}, now);
    // Only 1 valid action remains (the hit)
    expect(director.performance.accuracy).toBe(1);
  });

  describe('States', () => {
    it('BuildingState should increase tension', () => {
      director.fsm.changeTo('BUILDING');
      director.targetTension = 0.3;

      director.update(1.0); // 1 second

      expect(director.targetTension).toBeGreaterThan(0.3);
    });

    it('RelievingState should decrease tension', () => {
      // changeTo triggers enter(), which drops tension
      director.targetTension = 0.8;
      director.fsm.changeTo('RELIEVING');

      expect(director.targetTension).toBeLessThan(0.8);

      const afterEnter = director.targetTension;
      director.update(1.0);
      expect(director.targetTension).toBeLessThan(afterEnter);
    });

    it('SustainingState should nudge tension towards 0.5', () => {
      director.fsm.changeTo('SUSTAINING');
      director.targetTension = 0.6;

      director.update(1.0); // 1 second

      // Should decrease towards 0.5
      expect(director.targetTension).toBeLessThan(0.6);
      expect(director.targetTension).toBeGreaterThan(0.5);
    });

    it('SustainingState should nudge tension up towards 0.5', () => {
      director.fsm.changeTo('SUSTAINING');
      director.targetTension = 0.4;

      director.update(1.0); // 1 second

      // Should increase towards 0.5
      expect(director.targetTension).toBeGreaterThan(0.4);
      expect(director.targetTension).toBeLessThan(0.5);
    });

    it('SurgingState should increase tension significantly', () => {
      director.tension = 0.5;
      director.fsm.changeTo('SURGING');

      expect(director.targetTension).toBeGreaterThan(0.7);
    });
  });

  describe('Skill Estimate', () => {
    it('should calculate skill estimate', () => {
      director.performance.accuracy = 1.0;
      director.performance.combo = 15;
      director.performance.recentCounters = 10;
      director.performance.recentEscapes = 0;

      const skill = director.getSkillEstimate();
      // 1.0 * 0.4 + 1.0 * 0.3 + 1.0 * 0.3 = 1.0
      expect(skill).toBeCloseTo(1.0);
    });

    it('should handle low skill', () => {
      director.performance.accuracy = 0.0;
      director.performance.combo = 0;
      director.performance.recentCounters = 0;
      director.performance.recentEscapes = 10;

      const skill = director.getSkillEstimate();
      // 0 + 0 + 0 = 0
      expect(skill).toBeCloseTo(0.0);
    });
  });
});
