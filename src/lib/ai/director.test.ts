import { beforeEach, describe, expect, it } from 'vitest';
import {
  AIDirector,
  BuildingState,
  RelievingState,
  SurgingState,
  SustainingState,
} from './director';

describe('AIDirector', () => {
  let director: AIDirector;

  beforeEach(() => {
    director = new AIDirector();
    // Default to BuildingState
  });

  it('should initialize with default state', () => {
    expect(director.tension).toBe(0.3);
    expect(director.fsm.currentState).toBeInstanceOf(BuildingState);
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
    describe('BuildingState', () => {
      beforeEach(() => {
        director.fsm.changeTo('BUILDING');
      });

      it('should increase tension over time', () => {
        director.targetTension = 0.3;
        director.update(1.0); // 1 second
        expect(director.targetTension).toBeGreaterThan(0.3);
      });

      it('should transition to SURGING if tension high and skill high', () => {
        director.tension = 0.75;
        director.targetTension = 0.75;
        director.stateTimer = 4.0;
        // Mock high skill
        director.performance.accuracy = 1.0;
        director.performance.combo = 15; // > 15 for max combo factor
        director.performance.recentCounters = 10;

        director.update(0.016);
        expect(director.fsm.currentState).toBeInstanceOf(SurgingState);
      });

      it('should transition to RELIEVING if panic is critical', () => {
        director.performance.panic = 81;
        director.update(0.016);
        expect(director.fsm.currentState).toBeInstanceOf(RelievingState);
      });

      it('should transition to SUSTAINING if panic is moderate or skill low', () => {
        director.performance.panic = 61;
        director.update(0.016);
        expect(director.fsm.currentState).toBeInstanceOf(SustainingState);
      });
    });

    describe('SustainingState', () => {
      beforeEach(() => {
        director.fsm.changeTo('SUSTAINING');
      });

      it('should nudge tension towards 0.5 (down)', () => {
        director.targetTension = 0.6;
        director.update(1.0);
        expect(director.targetTension).toBeLessThan(0.6);
        expect(director.targetTension).toBeGreaterThan(0.5);
      });

      it('should nudge tension towards 0.5 (up)', () => {
        director.targetTension = 0.4;
        director.update(1.0);
        expect(director.targetTension).toBeGreaterThan(0.4);
        expect(director.targetTension).toBeLessThan(0.5);
      });

      it('should transition to BUILDING if player recovers', () => {
        director.stateTimer = 5.0;
        director.performance.panic = 30;
        director.performance.accuracy = 1.0;
        director.performance.combo = 10;

        director.update(0.016);
        expect(director.fsm.currentState).toBeInstanceOf(BuildingState);
      });

      it('should transition to RELIEVING if panic high', () => {
        director.performance.panic = 76;
        director.update(0.016);
        expect(director.fsm.currentState).toBeInstanceOf(RelievingState);
      });
    });

    describe('RelievingState', () => {
      beforeEach(() => {
        // enter() drops tension immediately
        director.targetTension = 0.8;
        director.fsm.changeTo('RELIEVING');
      });

      it('should decrease tension further', () => {
        const afterEnter = director.targetTension;
        director.update(1.0);
        expect(director.targetTension).toBeLessThan(afterEnter);
      });

      it('should transition to BUILDING once stabilized', () => {
        director.performance.panic = 40;
        director.performance.accuracy = 1.0;
        director.performance.combo = 10;
        director.stateTimer = 6.0;

        director.update(0.016);
        expect(director.fsm.currentState).toBeInstanceOf(BuildingState);
      });
    });

    describe('SurgingState', () => {
      beforeEach(() => {
        director.tension = 0.5;
        director.fsm.changeTo('SURGING');
      });

      it('should spike tension on enter', () => {
        expect(director.targetTension).toBeGreaterThan(0.7);
      });

      it('should transition to RELIEVING after timer if panic high', () => {
        director.stateTimer = 5.0;
        director.performance.panic = 60;
        director.update(0.016);
        expect(director.fsm.currentState).toBeInstanceOf(RelievingState);
      });

      it('should transition to SUSTAINING after timer if panic low', () => {
        director.stateTimer = 5.0;
        director.performance.panic = 40;
        director.update(0.016);
        expect(director.fsm.currentState).toBeInstanceOf(SustainingState);
      });

      it('should emergency exit to RELIEVING if panic critical', () => {
        director.performance.panic = 86;
        director.update(0.016);
        expect(director.fsm.currentState).toBeInstanceOf(RelievingState);
      });
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
