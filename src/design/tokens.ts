/**
 * Design Tokens — Cognitive Dissonance
 *
 * Centralized design system values for consistent styling across the application.
 * Metallic technopunk aesthetic: brushed aluminum, RGB chromatic accents, monospace type.
 */

// =============================================================================
// COLOR TOKENS
// =============================================================================

export const colors = {
  // Primary Colors — Metallic chrome
  primary: {
    main: '#c0c8d8', // Brushed steel (brand)
    light: '#e0e8f0',
    dark: '#8899bb',
    darker: '#667788',
  },

  // Secondary Colors — Chromatic accent
  secondary: {
    main: '#00ccff', // Cyan (AI/neural theme)
    light: '#66ddff',
    dark: '#0099cc',
    darker: '#006699',
  },

  // Accent Colors - Enemy types
  accent: {
    reality: '#e67e22', // Orange (hype)
    history: '#2ecc71', // Green (growth)
    logic: '#9b59b6', // Purple (demos)
  },

  // Semantic Colors
  semantic: {
    success: '#2ecc71',
    warning: '#f39c12',
    error: '#e74c3c',
    info: '#3498db',
  },

  // UI Colors
  ui: {
    background: {
      primary: '#0e0e28',
      secondary: '#1a1a2e',
      tertiary: '#16213e',
      overlay: 'rgba(5, 5, 15, 0.97)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#ecf0f1',
      tertiary: '#bdc3c7',
      muted: '#7f8c8d',
    },
    border: {
      default: '#2a2a4a',
      accent: 'rgba(241, 196, 15, 0.3)',
      glow: 'rgba(0, 255, 255, 0.5)',
    },
  },

  // 3D Scene Colors — dark foundation with vivid colorful accents
  // Inspired by the original 2D game's neon-arcade-meets-cozy-bedroom aesthetic
  scene: {
    background: '#0e0e28',
    wall: '#1c1c42', // Rich dark indigo
    floor: '#1e1e38', // Visible dark navy
    desk: '#34495e', // Bright enough to see desk surface
    deskEdge: '#2c3e50', // Visible edge highlight
    keyboard: '#222d3a', // Dark but visible keys
    mouse: '#4a6070', // Light enough to read shape
    windowPane: '#060620', // Deep night sky
    windowFrame: '#4a5a6c', // Visible frame
    poster: '#303050', // Visible poster bg
    posterText: '#aabbdd', // Bright, clearly readable
    monitorGlow: '#60ccff', // Vivid cyan-blue glow
    monitorGlowWarm: '#ff8844', // Warm panic glow
    moonColor: '#fffde8', // Bright moon
    moonGlow: '#ffd090', // Warm golden glow
    ambient: '#5566aa', // Rich blue ambient
    fillLight: '#88aacc', // Bright fill
    keyLight: '#aabbcc', // Strong key light
    rimLight: '#4466aa', // Saturated blue rim
    deskLamp: '#ffcc66', // Warm desk accent
    screenSpill: '#3388ff', // Monitor screen spill color
  },

  // Powerup Colors
  powerup: {
    slow: '#3498db', // Time Warp
    shield: '#2ecc71', // Clarity
    double: '#f1c40f', // 2X Score
  },

  // Character Bust (rear view — NS-5 style android)
  character: {
    shell: '#f1f3f7', // Pearlescent white shell (MeshPhysicalMaterial clearcoat)
    shellWarm: '#ffe8d6', // Warm stress tint at high panic
    dark: '#0a0a0f', // Dark metallic (joints, seams, cable channels)
    joint: '#bbbbbb', // Bright metallic (neck rings, actuator caps)
    cable: '#0f0f14', // Cable rubber (dark, slight metalness)
    cableStress: '#442222', // Cable color when under tension (warm tint)
    eyeGlow: '#99ddff', // Eye emissive color (calm)
    eyeStress: '#ff4444', // Eye emissive color (high panic)
    statusLed: '#33ff66', // Status LED (calm green)
    statusWarn: '#ffaa00', // Status LED (warning amber)
    statusCrit: '#ff2222', // Status LED (critical red)
    panelSeam: '#1a1a2a', // Panel seam line color
    spark: '#66ccff', // Electrical spark color
  },

  // Boss Colors
  boss: {
    primary: '#e74c3c',
    glow: 'rgba(231, 76, 60, 0.25)',
    flash: '#ffffff',
  },

  // Effects
  effects: {
    shadow: 'rgba(0, 0, 0, 0.35)',
    glow: {
      yellow: 'rgba(241, 196, 15, 0.5)',
      cyan: 'rgba(0, 255, 255, 0.5)',
      purple: 'rgba(142, 68, 173, 0.5)',
      red: 'rgba(231, 76, 60, 0.5)',
    },
    particle: {
      hit: ['#e74c3c', '#f1c40f', '#ffffff'],
      confetti: ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'],
    },
  },
} as const;

// =============================================================================
// TYPOGRAPHY TOKENS
// =============================================================================

export const typography = {
  // Font Families — Cognitive Dissonance (metallic technopunk)
  fonts: {
    display: '"Courier New", "Lucida Console", monospace', // Sharp, clinical headers
    body: '"Courier New", "Lucida Console", monospace', // Tech aesthetic for gameplay
    accent: '"Courier New", "Lucida Console", monospace', // Consistent monospace identity
    mono: '"Courier New", "Lucida Console", monospace', // Terminal/stats
  },

  // Font Sizes
  sizes: {
    tiny: '10px',
    xxs: '12px',
    xs: '14px',
    sm: '16px',
    base: '18px',
    md: '20px',
    lg: '24px',
    xl: '32px',
    xxl: '40px',
    '3xl': '48px',
    '4xl': '64px',
    '5xl': '80px',
    '6xl': '96px',
    icon: {
      sm: '24px',
      md: '32px',
      lg: '48px',
      xl: '64px',
    },
  },

  // Font Weights
  weights: {
    normal: 400,
    bold: 700,
  },

  // Line Heights
  lineHeights: {
    tight: 1.3,
    base: 1.6,
    relaxed: 1.8,
    loose: 2.2,
  },

  // Letter Spacing
  letterSpacing: {
    tight: '-0.05em',
    normal: '0',
    wide: '0.05em',
    wider: '0.1em',
    widest: '0.15em',
    title: '5px',
  },
} as const;

// =============================================================================
// SPACING TOKENS
// =============================================================================

export const spacing = {
  // Base spacing unit: 4px
  px: '1px',
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
} as const;

// =============================================================================
// ANIMATION TOKENS
// =============================================================================

export const animations = {
  // Durations (in milliseconds)
  duration: {
    instant: 0,
    fastest: 80,
    faster: 100,
    fast: 150,
    normal: 200,
    medium: 300,
    slow: 400,
    slower: 600,
    slowest: 800,
  },

  // Easings
  easing: {
    // Standard easings
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Custom easings
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },

  // Delays
  delay: {
    none: '0ms',
    short: '100ms',
    medium: '200ms',
    long: '400ms',
  },

  // Specific animations
  pulse: {
    duration: 1500,
    easing: 'easeInOut',
    scale: [1, 1.04],
  },

  float: {
    duration: 3000,
    easing: 'easeInOut',
    translateY: [-5, 0],
  },

  shake: {
    duration: 500,
    easing: 'easeInOut',
  },

  bob: {
    duration: 1000,
    easing: 'easeInOut',
    translateY: [-3, 0],
  },
} as const;

// =============================================================================
// SHADOW TOKENS
// =============================================================================

export const shadows = {
  // Box shadows
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',

  // Text shadows
  text: {
    sm: '1px 1px 0 rgba(0, 0, 0, 0.5)',
    base: '2px 2px 0 #000',
    lg: '4px 4px 0 #c0392b',
    glow: {
      yellow: '0 0 10px rgba(241, 196, 15, 0.5)',
      cyan: '0 0 15px rgba(0, 255, 255, 0.5)',
      purple: '0 0 20px rgba(142, 68, 173, 0.4)',
      red: '0 0 30px rgba(231, 76, 60, 0.3)',
    },
  },

  // Inset shadows
  inset: {
    sm: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
    base: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
  },

  // Glows (box-shadow for glow effects)
  glow: {
    button: '0 0 30px rgba(231, 76, 60, 0.3)',
    powerup: '0 0 20px currentColor',
    boss: '0 0 40px rgba(231, 76, 60, 0.5)',
  },

  // Vignette
  vignette: 'inset 0 0 120px rgba(0, 0, 0, 0.7), inset 0 0 40px rgba(0, 0, 0, 0.4)',
} as const;

// =============================================================================
// BORDER TOKENS
// =============================================================================

export const borders = {
  // Border radius
  radius: {
    none: '0',
    sm: '2px',
    base: '3px',
    md: '4px',
    lg: '6px',
    full: '9999px',
  },

  // Border widths
  width: {
    none: '0',
    thin: '1px',
    base: '2px',
    thick: '3px',
    thicker: '4px',
  },
} as const;

// =============================================================================
// LAYOUT TOKENS
// =============================================================================

export const layout = {
  // Game dimensions
  game: {
    width: 800,
    height: 600,
  },

  // Z-index layers
  zIndex: {
    background: 0,
    stars: 10,
    game: 20,
    particles: 30,
    enemies: 40,
    character: 45,
    boss: 50,
    effects: 55,
    hud: 60,
    powerups: 70,
    overlay: 90,
    modal: 100,
  },

  // Breakpoints
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
  },
} as const;

// =============================================================================
// EXPORT HELPERS
// =============================================================================

/**
 * Convert design tokens to CSS variables
 */
export function generateCSSVariables(): Record<string, string> {
  const vars: Record<string, string> = {};

  // Helper to flatten nested objects
  const flatten = (obj: Record<string, unknown>, prefix = ''): void => {
    for (const [key, value] of Object.entries(obj)) {
      const cssKey = prefix ? `${prefix}-${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flatten(value as Record<string, unknown>, cssKey);
      } else {
        vars[`--${cssKey}`] = String(value);
      }
    }
  };

  // Generate variables for each token category
  flatten(colors, 'color');
  flatten(spacing, 'space');
  flatten(shadows, 'shadow');
  flatten(borders.radius, 'radius');
  flatten(borders.width, 'border-width');

  return vars;
}

// Type exports for TypeScript
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Animations = typeof animations;
export type Shadows = typeof shadows;
export type Borders = typeof borders;
export type Layout = typeof layout;
