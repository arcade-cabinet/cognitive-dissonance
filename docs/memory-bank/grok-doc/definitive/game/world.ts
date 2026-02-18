// game/world.ts
export interface EnemyEntity {
  enemy: true;
  yukaAgent: Yuka.Agent;           // Yuka steering agent
  visualMesh: BABYLON.Mesh;        // the holographic neon box
  config: EnemyConfig;             // from seed factory
  health: number;
  type: 'zigzag' | 'split' | 'seek' | 'wander';
}