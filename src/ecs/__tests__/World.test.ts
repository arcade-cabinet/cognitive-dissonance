import { world } from '../World';

describe('ECS World', () => {
  afterEach(() => {
    // Clean up all entities after each test
    for (const entity of world.entities) {
      world.remove(entity);
    }
  });

  it('starts with no entities', () => {
    expect(world.entities.length).toBe(0);
  });

  it('can add an entity', () => {
    const entity = world.add({ level: true } as any);
    expect(world.entities.length).toBe(1);
    expect(entity.level).toBe(true);
  });

  it('can remove an entity', () => {
    const entity = world.add({ level: true } as any);
    expect(world.entities.length).toBe(1);
    world.remove(entity);
    expect(world.entities.length).toBe(0);
  });

  it('can add multiple entities', () => {
    world.add({ level: true } as any);
    world.add({ level: true, boss: true } as any);
    world.add({ enemy: true } as any);
    expect(world.entities.length).toBe(3);
  });

  it('exports LeftHand and RightHand queries', () => {
    const { LeftHand, RightHand } = require('../World');
    expect(LeftHand).toBeDefined();
    expect(LeftHand.entities).toBeDefined();
    expect(RightHand).toBeDefined();
    expect(RightHand.entities).toBeDefined();
  });
});
