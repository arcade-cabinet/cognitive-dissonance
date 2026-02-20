import {
  ARCHETYPE_METADATA,
  type ArchetypeComponent,
  type ArchetypeMetadata,
  type ArchetypeType,
  type CognitiveLoad,
  type CrystallineCubeComponent,
  type KeycapComponent,
  type LeverComponent,
  type MorphCubeComponent,
  type PacingProfile,
  type PlatterComponent,
  type PlatterRotationSlots,
  type SphereComponent,
} from '../components';

// ── Constants ──

const ALL_ARCHETYPE_TYPES: ArchetypeType[] = [
  'PlatterRotation',
  'LeverTension',
  'KeySequence',
  'CrystallineCubeBoss',
  'FacetAlign',
  'OrbitalCatch',
  'RefractionAim',
  'Labyrinth',
  'TurntableScratch',
  'RhythmGate',
  'WhackAMole',
  'ChordHold',
  'MorphMirror',
  'Conductor',
  'LockPick',
  'CubeJuggle',
  'ZenDrift',
  'Pinball',
  'TendrilDodge',
  'Escalation',
  'Resonance',
  'Survival',
  'CubeStack',
  'GhostChase',
  'SphereSculpt',
];

const VALID_PACING_PROFILES: PacingProfile[] = [
  'calm',
  'rhythmic',
  'deliberate',
  'reactive',
  'frantic',
  'intense',
  'meditative',
  'building',
  'relentless',
  'creative',
  'layered',
  'chaotic',
  'flowing',
  'sustained',
  'burst',
  'steady',
];

const VALID_COGNITIVE_LOADS: CognitiveLoad[] = [
  'low',
  'low-med',
  'medium',
  'high',
  'very-high',
  'escalating',
];

const VALID_CUBES_USED = ['crystalline', 'morph', 'both', 'none'] as const;

// ── ARCHETYPE_METADATA coverage ──

describe('ARCHETYPE_METADATA', () => {
  it('has exactly 25 archetype entries', () => {
    const keys = Object.keys(ARCHETYPE_METADATA);
    expect(keys).toHaveLength(25);
  });

  it('contains an entry for every ArchetypeType', () => {
    for (const archetypeType of ALL_ARCHETYPE_TYPES) {
      expect(ARCHETYPE_METADATA).toHaveProperty(archetypeType);
    }
  });

  it('has no extra entries beyond the 25 defined types', () => {
    const keys = Object.keys(ARCHETYPE_METADATA);
    for (const key of keys) {
      expect(ALL_ARCHETYPE_TYPES).toContain(key);
    }
  });
});

// ── Metadata consistency ──

describe('Metadata consistency', () => {
  const entries = Object.entries(ARCHETYPE_METADATA) as [ArchetypeType, ArchetypeMetadata][];

  describe.each(entries)('%s metadata', (key, metadata) => {
    it('type field matches the key', () => {
      expect(metadata.type).toBe(key);
    });

    it('pacing is a valid PacingProfile', () => {
      expect(VALID_PACING_PROFILES).toContain(metadata.pacing);
    });

    it('cognitiveLoad is a valid CognitiveLoad', () => {
      expect(VALID_COGNITIVE_LOADS).toContain(metadata.cognitiveLoad);
    });

    it('primarySurfaces is a non-empty array', () => {
      expect(Array.isArray(metadata.primarySurfaces)).toBe(true);
      expect(metadata.primarySurfaces.length).toBeGreaterThan(0);
    });

    it('cubesUsed is a non-empty array of valid values', () => {
      expect(Array.isArray(metadata.cubesUsed)).toBe(true);
      expect(metadata.cubesUsed.length).toBeGreaterThan(0);
      for (const cubeValue of metadata.cubesUsed) {
        expect(VALID_CUBES_USED).toContain(cubeValue);
      }
    });

    it('thematicEnemyTrait is null or a valid YukaTrait', () => {
      const validTraits = [
        'NeonRaymarcher',
        'TendrilBinder',
        'PlatterCrusher',
        'GlassShatterer',
        'EchoRepeater',
        'LeverSnatcher',
        'SphereCorruptor',
        null,
      ];
      expect(validTraits).toContain(metadata.thematicEnemyTrait);
    });
  });
});

// ── Component interface validation ──

describe('Component interface validation', () => {
  it('KeycapComponent has expected properties', () => {
    const keycap: KeycapComponent = {
      letter: 'A',
      active: true,
      emerged: false,
      glowIntensity: 0.5,
      holdProgress: 0.0,
    };

    expect(keycap.letter).toBe('A');
    expect(keycap.active).toBe(true);
    expect(keycap.emerged).toBe(false);
    expect(keycap.glowIntensity).toBe(0.5);
    expect(keycap.holdProgress).toBe(0.0);
  });

  it('LeverComponent has expected properties', () => {
    const lever: LeverComponent = {
      position: 0.75,
      active: true,
      resistance: 0.3,
      locked: false,
    };

    expect(lever.position).toBe(0.75);
    expect(lever.active).toBe(true);
    expect(lever.resistance).toBe(0.3);
    expect(lever.locked).toBe(false);
  });

  it('PlatterComponent has expected properties', () => {
    const platter: PlatterComponent = {
      rotationRPM: 4,
      direction: 1,
      active: true,
      locked: false,
    };

    expect(platter.rotationRPM).toBe(4);
    expect(platter.direction).toBe(1);
    expect(platter.active).toBe(true);
    expect(platter.locked).toBe(false);
  });

  it('PlatterComponent direction is constrained to 1 or -1', () => {
    const cwPlatter: PlatterComponent = {
      rotationRPM: 5,
      direction: 1,
      active: true,
      locked: false,
    };
    const ccwPlatter: PlatterComponent = {
      rotationRPM: 5,
      direction: -1,
      active: true,
      locked: false,
    };

    expect([1, -1]).toContain(cwPlatter.direction);
    expect([1, -1]).toContain(ccwPlatter.direction);
  });

  it('SphereComponent has expected properties', () => {
    const sphere: SphereComponent = {
      active: true,
      angularSpeed: 1.5,
      driftEnabled: true,
      driftSpeed: 0.003,
    };

    expect(sphere.active).toBe(true);
    expect(sphere.angularSpeed).toBe(1.5);
    expect(sphere.driftEnabled).toBe(true);
    expect(sphere.driftSpeed).toBe(0.003);
  });

  it('CrystallineCubeComponent has expected properties', () => {
    const cube: CrystallineCubeComponent = {
      active: true,
      role: 'boss',
      health: 2.0,
      facetCount: 6,
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      orbitRadius: 3.0,
      orbitSpeed: 1.0,
      altitude: 1.5,
    };

    expect(cube.active).toBe(true);
    expect(cube.role).toBe('boss');
    expect(cube.health).toBe(2.0);
    expect(cube.facetCount).toBe(6);
    expect(cube.position).toEqual({ x: 0, y: 1, z: 0 });
    expect(cube.velocity).toEqual({ x: 0, y: 0, z: 0 });
    expect(cube.orbitRadius).toBe(3.0);
    expect(cube.orbitSpeed).toBe(1.0);
    expect(cube.altitude).toBe(1.5);
  });

  it('CrystallineCubeComponent role is constrained to valid values', () => {
    const validRoles = ['boss', 'reference', 'target', 'obstacle', 'metronome', 'progress'];
    const cube: CrystallineCubeComponent = {
      active: true,
      role: 'target',
      health: 0,
      facetCount: 4,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      orbitRadius: 1.0,
      orbitSpeed: 0.5,
      altitude: 0.5,
    };

    expect(validRoles).toContain(cube.role);
  });

  it('MorphCubeComponent has expected properties', () => {
    const morphCube: MorphCubeComponent = {
      active: true,
      role: 'mirror',
      morphProgress: 0.5,
      currentTrait: 'SphereCorruptor',
      position: { x: 1, y: 0, z: -1 },
      velocity: { x: 0.1, y: 0, z: 0 },
      orbitRadius: 2.0,
      orbitSpeed: 0.8,
      altitude: 1.0,
    };

    expect(morphCube.active).toBe(true);
    expect(morphCube.role).toBe('mirror');
    expect(morphCube.morphProgress).toBe(0.5);
    expect(morphCube.currentTrait).toBe('SphereCorruptor');
    expect(morphCube.position).toEqual({ x: 1, y: 0, z: -1 });
    expect(morphCube.velocity).toEqual({ x: 0.1, y: 0, z: 0 });
    expect(morphCube.orbitRadius).toBe(2.0);
    expect(morphCube.orbitSpeed).toBe(0.8);
    expect(morphCube.altitude).toBe(1.0);
  });

  it('MorphCubeComponent role is constrained to valid values', () => {
    const validRoles = ['mirror', 'obstacle', 'bumper', 'ghost', 'breathing', 'metronome'];
    const morphCube: MorphCubeComponent = {
      active: true,
      role: 'ghost',
      morphProgress: 0.0,
      currentTrait: 'EchoRepeater',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      orbitRadius: 1.0,
      orbitSpeed: 0.5,
      altitude: 0.5,
    };

    expect(validRoles).toContain(morphCube.role);
  });
});

// ── ArchetypeComponent validation ──

describe('ArchetypeComponent validation', () => {
  it('has all required fields: type, slots, seedHash, pacing, cognitiveLoad', () => {
    const slots: PlatterRotationSlots = {
      keycapSubset: ['Q', 'W', 'E', 'R'],
      leverActive: false,
      platterActive: true,
      sphereActive: false,
      crystallineCubeActive: false,
      morphCubeActive: false,
      rotationRPM: 4,
      reachZoneArc: 90,
      direction: 1,
    };

    const archetype: ArchetypeComponent = {
      type: 'PlatterRotation',
      slots,
      seedHash: 42,
      pacing: 'steady',
      cognitiveLoad: 'low-med',
    };

    expect(archetype.type).toBe('PlatterRotation');
    expect(archetype.slots).toBeDefined();
    expect(archetype.seedHash).toBe(42);
    expect(archetype.pacing).toBe('steady');
    expect(archetype.cognitiveLoad).toBe('low-med');
  });

  it('slots include BaseSlots fields', () => {
    const slots: PlatterRotationSlots = {
      keycapSubset: ['A', 'S', 'D'],
      leverActive: true,
      platterActive: true,
      sphereActive: false,
      crystallineCubeActive: false,
      morphCubeActive: false,
      rotationRPM: 6,
      reachZoneArc: 120,
      direction: -1,
    };

    expect(Array.isArray(slots.keycapSubset)).toBe(true);
    expect(typeof slots.leverActive).toBe('boolean');
    expect(typeof slots.platterActive).toBe('boolean');
    expect(typeof slots.sphereActive).toBe('boolean');
    expect(typeof slots.crystallineCubeActive).toBe('boolean');
    expect(typeof slots.morphCubeActive).toBe('boolean');
  });

  it('archetype type matches metadata pacing and cognitiveLoad', () => {
    for (const archetypeType of ALL_ARCHETYPE_TYPES) {
      const metadata = ARCHETYPE_METADATA[archetypeType];
      // Build a minimal archetype component using PlatterRotationSlots
      // (a concrete member of the ArchetypeSlots union) since ArchetypeSlots
      // is a union and plain BaseSlots is not assignable to it.
      const slots: PlatterRotationSlots = {
        keycapSubset: [],
        leverActive: false,
        platterActive: false,
        sphereActive: false,
        crystallineCubeActive: false,
        morphCubeActive: false,
        rotationRPM: 4,
        reachZoneArc: 90,
        direction: 1,
      };
      const archetype: ArchetypeComponent = {
        type: archetypeType,
        slots,
        seedHash: 0,
        pacing: metadata.pacing,
        cognitiveLoad: metadata.cognitiveLoad,
      };

      expect(archetype.pacing).toBe(metadata.pacing);
      expect(archetype.cognitiveLoad).toBe(metadata.cognitiveLoad);
    }
  });
});

// ── Cubes philosophy check ──

describe('Cubes philosophy check', () => {
  // Archetypes that specify crystallineCube in their surface references
  // should have 'crystalline' or 'both' in cubesUsed
  const crystallineArchetypes: ArchetypeType[] = [
    'CrystallineCubeBoss',
    'FacetAlign',
    'RefractionAim',
    'ChordHold',
    'Conductor',
    'LockPick',
    'Resonance',
  ];

  // Archetypes that specify morph cube in their surface references
  // should have 'morph' or 'both' in cubesUsed
  const morphArchetypes: ArchetypeType[] = [
    'Labyrinth',
    'RhythmGate',
    'WhackAMole',
    'MorphMirror',
    'ZenDrift',
    'Pinball',
    'GhostChase',
  ];

  // Archetypes that use both cubes
  const bothCubeArchetypes: ArchetypeType[] = [
    'OrbitalCatch',
    'CubeJuggle',
    'Escalation',
    'Survival',
    'CubeStack',
    'SphereSculpt',
  ];

  describe('crystalline cube archetypes', () => {
    it.each(crystallineArchetypes)(
      '%s should have crystalline or both in cubesUsed',
      (archetypeType) => {
        const metadata = ARCHETYPE_METADATA[archetypeType];
        const hasCrystalline =
          metadata.cubesUsed.includes('crystalline') || metadata.cubesUsed.includes('both');
        expect(hasCrystalline).toBe(true);
      },
    );
  });

  describe('morph cube archetypes', () => {
    it.each(morphArchetypes)('%s should have morph or both in cubesUsed', (archetypeType) => {
      const metadata = ARCHETYPE_METADATA[archetypeType];
      const hasMorph =
        metadata.cubesUsed.includes('morph') || metadata.cubesUsed.includes('both');
      expect(hasMorph).toBe(true);
    });
  });

  describe('both-cube archetypes', () => {
    it.each(bothCubeArchetypes)('%s should have both in cubesUsed', (archetypeType) => {
      const metadata = ARCHETYPE_METADATA[archetypeType];
      expect(metadata.cubesUsed).toContain('both');
    });
  });

  it('archetypes with cubesUsed "none" should not be in crystalline, morph, or both lists', () => {
    const noneArchetypes = Object.entries(ARCHETYPE_METADATA)
      .filter(([, meta]) => meta.cubesUsed.includes('none'))
      .map(([key]) => key);

    for (const archetypeType of noneArchetypes) {
      expect(crystallineArchetypes).not.toContain(archetypeType);
      expect(morphArchetypes).not.toContain(archetypeType);
      expect(bothCubeArchetypes).not.toContain(archetypeType);
    }
  });

  it('every archetype is categorized into exactly one cube usage group', () => {
    const noneArchetypes: ArchetypeType[] = [
      'PlatterRotation',
      'LeverTension',
      'KeySequence',
      'TurntableScratch',
      'TendrilDodge',
    ];

    const allCategorized = [
      ...crystallineArchetypes,
      ...morphArchetypes,
      ...bothCubeArchetypes,
      ...noneArchetypes,
    ];

    // Every archetype type should appear exactly once across all groups
    expect(allCategorized.sort()).toEqual([...ALL_ARCHETYPE_TYPES].sort());
    // No duplicates
    expect(new Set(allCategorized).size).toBe(allCategorized.length);
  });
});
