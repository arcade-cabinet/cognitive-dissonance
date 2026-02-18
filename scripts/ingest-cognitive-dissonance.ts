// scripts/ingest-cognitive-dissonance.ts
// Enhanced v2: Smart filename detection, deduplication, Cline memory bank, design decisions
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');
const CODE_FRAGMENTS_DIR = path.join(DOCS_DIR, 'code-fragments');
const MEMORY_BANK_DIR = path.join(DOCS_DIR, 'memory-bank');

const SHADER_PORTS_FILE = path.join(DOCS_DIR, 'Grok-Cognitive_Dissonance_Babylon.js_Shader_Ports.md');
const PROCEDURAL_FILE = path.join(DOCS_DIR, 'Grok-Procedural_Robot_Bust_Modeling_Breakdown.md');

// Track version counts for deduplication
const versionCounter = new Map<string, number>();
const manifestEntries: ManifestEntry[] = [];

interface ManifestEntry {
  outputPath: string;
  sourceLine: number;
  sourceFile: string;
  version: number;
  definitive: boolean;
  contextHeading: string;
  lang: string;
}

interface CodeBlock {
  code: string;
  lang: string;
  lineNumber: number;
  precedingContext: string;
  isDefinitive: boolean;
}

async function ensureDir(dir: string) {
  await fs.ensureDir(dir);
}

// Smart Filename Detection

function detectFilenameFromCode(code: string): string | null {
  const pathPatterns = [
    /^\/\/\s*((?:components|store|lib|game|app|hooks|src)\/[\w\-./]+\.\w+)/m,
    /^\/\*\s*((?:components|store|lib|game|app|hooks|src)\/[\w\-./]+\.\w+)/m,
  ];
  for (const pat of pathPatterns) {
    const m = code.match(pat);
    if (m) return normalizeFilePath(m[1]);
  }
  const useClientPath = code.match(/^['"]use client['"];?\s*\n\s*\/\/\s*([\w\-./]+\.(?:tsx?|jsx?))/m);
  if (useClientPath) return normalizeFilePath(useClientPath[1]);
  return null;
}

function detectFilenameFromContext(context: string): string | null {
  const mdPatterns = [
    /[`*]+\s*((?:components|store|lib|game|app)\/[\w\-./]+\.\w+)\s*[`*]+/,
    /[`]\s*([\w\-./]+\.(?:tsx?|ts|jsx?|json|css|html|glsl))\s*[`]/,
    /(?:Updated|New|Complete|Full|Final)\s+[`*]*([\w\-./]+\.(?:tsx?|ts|jsx?))[`*]*/i,
  ];
  for (const pat of mdPatterns) {
    const m = context.match(pat);
    if (m) return normalizeFilePath(m[1]);
  }
  return null;
}

function normalizeFilePath(filepath: string): string {
  let p = filepath.replace(/^src\//, '');
  p = p.replace(/^\.\//, '');
  return p;
}

function classifyByContent(code: string, lang: string): string | null {
  const lower = code.toLowerCase();
  if (lang === 'json' && code.includes('"name"') && code.includes('"dependencies"')) return 'config/package.json';
  if (lang === 'json' && code.includes('"compilerOptions"')) return 'config/tsconfig.json';
  if (lang === 'html' && code.includes('<!DOCTYPE')) {
    if (lower.includes('sonny') || lower.includes('ns-5') || lower.includes('bust')) return 'html/sonny-demo.html';
    return 'html/demo.html';
  }
  if (lang === 'css' && code.includes('#reactylon-canvas')) return 'config/globals.css';
  if (lang === 'glsl' || (code.includes('gl_FragColor') && code.includes('void main') && !code.includes('import'))) {
    if (lower.includes('nebula') || lower.includes('fbm') || lower.includes('u_cloud_density')) return 'lib/shaders/celestial.glsl';
    if (lower.includes('sdbox') && lower.includes('holographic')) return 'lib/shaders/neon-raymarcher.glsl';
    if (lower.includes('palette') && lower.includes('displacement')) return 'lib/shaders/crystalline-cube.glsl';
    return 'lib/shaders/unknown.glsl';
  }
  return null;
}

function getOutputPath(code: string, lang: string, context: string): string {
  const fromCode = detectFilenameFromCode(code);
  if (fromCode) return fromCode;
  const fromContext = detectFilenameFromContext(context);
  if (fromContext) return fromContext;
  const fromContent = classifyByContent(code, lang);
  if (fromContent) return fromContent;
  const ext = lang === 'glsl' ? 'glsl' : lang === 'html' ? 'html' : lang === 'json' ? 'json' : lang === 'css' ? 'css' : lang === 'tsx' || lang === 'jsx' ? 'tsx' : 'ts';
  const id = (versionCounter.get('__unnamed__') || 0) + 1;
  versionCounter.set('__unnamed__', id);
  return `unnamed/block-${String(id).padStart(4, '0')}.${ext}`;
}

function getVersionedPath(basePath: string): { fullPath: string; version: number } {
  const count = (versionCounter.get(basePath) || 0) + 1;
  versionCounter.set(basePath, count);
  const dir = path.dirname(basePath);
  const ext = path.extname(basePath);
  const name = path.basename(basePath, ext);
  return {
    fullPath: path.join(dir, `${name}.v${count}${ext}`),
    version: count,
  };
}

// Definitive Version Detection

const DEFINITIVE_MARKERS = [
  'here is the complete',
  'final version',
  'production-ready',
  'copy-paste ready',
  'replace your previous',
  'definitive version',
  'complete, polished',
  'no placeholders',
  'ready to run',
  'ready to copy',
  'full, final',
  'the definitive',
  'complete, fully implemented',
];

function isDefinitiveSection(context: string): boolean {
  const lower = context.toLowerCase();
  return DEFINITIVE_MARKERS.some(marker => lower.includes(marker));
}

// Code Block Extraction

function extractCodeBlocks(content: string, _sourceFile: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const lang = match[1] || 'ts';
    const code = match[2].trim();
    if (code.split('\n').length < 3) continue;
    if (['bash', 'sh', 'shell', 'prompt', 'text', 'markdown', 'md'].includes(lang)) continue;
    const lineNumber = content.substring(0, match.index).split('\n').length;
    const precedingStart = Math.max(0, match.index - 500);
    const precedingContext = content.substring(precedingStart, match.index);
    const broaderStart = Math.max(0, match.index - 2000);
    const broaderContext = content.substring(broaderStart, match.index);
    blocks.push({
      code,
      lang: normalizeLang(lang),
      lineNumber,
      precedingContext,
      isDefinitive: isDefinitiveSection(broaderContext),
    });
  }
  return blocks;
}

function normalizeLang(lang: string): string {
  const map: Record<string, string> = {
    typescript: 'ts', javascript: 'js', tsx: 'tsx', jsx: 'jsx',
    ts: 'ts', js: 'js', json: 'json', html: 'html', css: 'css', glsl: 'glsl', '': 'ts',
  };
  return map[lang.toLowerCase()] || lang.toLowerCase();
}

// Process Documents

async function processDocument(filePath: string, sourceLabel: string) {
  console.log(chalk.blue.bold(`\n📘 Processing: ${sourceLabel}`));
  const content = await fs.readFile(filePath, 'utf-8');
  const blocks = extractCodeBlocks(content, sourceLabel);
  console.log(chalk.gray(`   Found ${blocks.length} code blocks`));
  let extracted = 0;
  for (const block of blocks) {
    const logicalPath = getOutputPath(block.code, block.lang, block.precedingContext);
    const { fullPath: versionedPath, version } = getVersionedPath(logicalPath);
    const outputFile = path.join(CODE_FRAGMENTS_DIR, versionedPath);
    await ensureDir(path.dirname(outputFile));
    await fs.writeFile(outputFile, block.code);
    manifestEntries.push({
      outputPath: versionedPath,
      sourceLine: block.lineNumber,
      sourceFile: sourceLabel,
      version,
      definitive: block.isDefinitive,
      contextHeading: extractHeading(block.precedingContext),
      lang: block.lang,
    });
    const defTag = block.isDefinitive ? chalk.yellow(' [DEFINITIVE]') : '';
    console.log(chalk.green(`   ✅ ${versionedPath}`) + chalk.gray(` (line ${block.lineNumber})`) + defTag);
    extracted++;
  }
  console.log(chalk.cyan(`   📦 Extracted ${extracted} blocks from ${sourceLabel}`));
}

function extractHeading(context: string): string {
  const headings = context.match(/#{1,4}\s+.+/g);
  if (headings && headings.length > 0) {
    return headings[headings.length - 1].replace(/^#+\s*/, '').trim().substring(0, 100);
  }
  const bold = context.match(/\*\*([^*]+)\*\*/g);
  if (bold && bold.length > 0) {
    return bold[bold.length - 1].replace(/\*\*/g, '').trim().substring(0, 100);
  }
  return '(no heading)';
}

// Manifest Generation

async function writeManifest() {
  console.log(chalk.blue.bold('\n📋 Generating manifest...'));
  const sorted = [...manifestEntries].sort((a, b) => {
    if (a.definitive !== b.definitive) return a.definitive ? -1 : 1;
    return a.outputPath.localeCompare(b.outputPath);
  });
  const groups = new Map<string, ManifestEntry[]>();
  for (const entry of sorted) {
    const logical = entry.outputPath.replace(/\.v\d+(\.\w+)$/, '$1');
    if (!groups.has(logical)) groups.set(logical, []);
    groups.get(logical)!.push(entry);
  }
  let md = `# Code Fragments Manifest\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `Total blocks extracted: **${manifestEntries.length}**\n`;
  md += `Unique logical files: **${groups.size}**\n`;
  md += `Definitive versions: **${manifestEntries.filter(e => e.definitive).length}**\n\n`;
  md += `---\n\n`;
  for (const [logical, entries] of groups) {
    md += `## \`${logical}\`\n\n`;
    md += `| Version | Source | Line | Definitive | Context |\n`;
    md += `|---------|--------|------|------------|--------|\n`;
    for (const e of entries) {
      const def = e.definitive ? 'YES' : '';
      md += `| \`${e.outputPath}\` | ${e.sourceFile} | ${e.sourceLine} | ${def} | ${e.contextHeading} |\n`;
    }
    md += `\n`;
  }
  await fs.writeFile(path.join(CODE_FRAGMENTS_DIR, 'MANIFEST.md'), md);
  console.log(chalk.green(`   ✅ MANIFEST.md written (${manifestEntries.length} entries, ${groups.size} unique files)`));
}

// Cline Memory Bank (7 files)

async function buildMemoryBank() {
  console.log(chalk.blue.bold('\n🧠 Building Cline-style Memory Bank (7 files)...'));
  await ensureDir(MEMORY_BANK_DIR);

  await fs.writeFile(path.join(MEMORY_BANK_DIR, 'projectbrief.md'), `# Project Brief — Cognitive Dissonance

## What It Is

Cognitive Dissonance is a haunting interactive 3D browser experience where you hold a fragile glass AI mind together as its own thoughts try to escape.

## Core Requirements

- **Glass Sphere AI**: Transparent PBR glass sphere with celestial nebula shader inside. Starts calm blue, degrades through yellows/greens to violent reds as tension rises. Physical jitter, crack overlay, shatter at max tension.
- **Heavy Industrial Platter**: Black metal platter with thick rim (18cm+ depth), only rotates on central Y axis. Recessed circular track holds the sphere. Garage-door mechanical slits reveal keys/lever.
- **Pattern Stabilization Gameplay**: Corruption patterns (colored tendrils) escape from sphere center to rim. Hold matching colored keycaps on the platter to pull them back. Missed patterns spawn enemies.
- **Buried Seed**: Hidden deterministic seed (seedrandom) drives all procedural generation. Every run is different but reproducible.
- **Enemy Waves**: Missed patterns spawn holographic SDF enemies (neon-raymarcher for normal, crystalline cubes for bosses). Yuka.js AI behaviors. Logarithmic escalation.
- **Adaptive Audio**: Tone.js spatial score evolving from calm drone to frantic glitch percussion as tension rises.
- **Symmetric Titles**: "COGNITIVE DISSONANCE" (opening) to "COGNITION SHATTERED" (game over).
- **Diegetic Interface**: No HUD. Coherence meter as glowing ring etched into platter surface.
- **Endless**: No forced win condition. Logarithmic advancement with high replay value from buried seed.

## Scope Boundaries

- Web-first (Next.js), mobile via PWA, XR via WebXR hand tracking
- 100% CSP-safe (no eval, no dynamic code generation of any kind)
- All geometry procedural (no imported 3D models)
- All shaders as static GLSL string literals
`);

  await fs.writeFile(path.join(MEMORY_BANK_DIR, 'productContext.md'), `# Product Context — Cognitive Dissonance

## Why This Exists

The game explores the theme of artificial cognition through interactive metaphor. You are not fighting external monsters — you are desperately trying to keep a single fragile mind from fracturing. The corruption comes from within.

## Thematic Vision

> "The machine is just glass — and you are the only one keeping it from shattering."

### Key Emotional Beats
- **Calm**: Blue nebula, gentle rotation, sparse patterns, soft drone audio
- **Unease**: Yellows creep in, patterns accelerate, keycap RGB drifts, audio filter opens
- **Panic**: Reds dominate, sphere jitters violently, enemies swarm, glitch percussion pounds
- **Shatter**: Glass explodes, particles fly, static fills screen, "COGNITION SHATTERED"

### Design Pivots (from conversation history)
1. De-humanized the AI: NS-5 Sonny android bust became glass sphere. More unsettling because it removes empathy.
2. Pattern stabilization over shooting: Missile Command was "old and not fun." Holding keys is intimate and hopeless.
3. Buried seed over visible seed: Exposing the seed broke immersion. AI dreams in secret.
4. "COGNITION SHATTERED" over "Game Over": Symmetric, thematic, not generic.
5. No HUD: All communication through the machine — RGB lighting, sphere degradation, audio.

## User Experience Goals
- Intimate and tactile (holding keys, feeling mechanical feedback)
- Hopeless but compelling (you WILL lose, but the journey matters)
- Visually haunting (celestial nebula degrading inside cracking glass)
- Acoustically immersive (spatial score that degrades with the mind)
- High replay value (every seed creates a unique "dream")
`);

  await fs.writeFile(path.join(MEMORY_BANK_DIR, 'activeContext.md'), `# Active Context — Cognitive Dissonance

## Current State (${new Date().toISOString().split('T')[0]})

### What's Done
- v2 scaffold complete: Next.js 15 + Babylon.js 8 + Reactylon 3.5.4
- Build passes with zero type errors
- All 20+ component files written and compiling
- 3 shader materials ported to Babylon.js (celestial, neon-raymarcher, crystalline-cube)
- Zustand stores (seed, level, audio) implemented
- Miniplex ECS world with entity archetypes
- ATC background shader (WebGL2, CSP-safe)
- Title/game-over overlays with symmetric static design

### What's NOT Done (Runtime)
- 3D scene rendering untested at runtime
- Pattern stabilization click detection not wired
- Enemy spawner billboard planes need depth/alpha testing
- Audio Tone.js initialization requires user gesture flow
- Post-process corruption shader needs Babylon.js 8 API testing

### Next Steps (Priority Order)
1. Run npm run dev and debug until 3D scene renders
2. Verify glass sphere + celestial shader display
3. Verify platter geometry + GSAP garage-door animations
4. Wire pattern stabilization click detection
5. Wire enemy spawner tension-threshold spawning
6. Test audio initialization flow
7. Test post-process corruption ramp

### Open Decisions
- Physics engine (Ammo.js) for keycap press weight — currently stubbed
- XR hand tracking session setup — not implemented
- Spatial audio (Tone.js Panner3D) — placeholder only
`);

  await fs.writeFile(path.join(MEMORY_BANK_DIR, 'systemPatterns.md'), `# System Patterns — Cognitive Dissonance

## Architecture

Next.js 15 App Router
- app/page.tsx: dynamic import of GameBoard with ssr: false
- GameBoard (2D React): ATCShader background + Title/GameOver overlays
- GameScene (Reactylon Engine/Scene): all 3D systems as child components
  - AISphere: imperative glass PBR sphere + celestial ShaderMaterial
  - Platter: imperative cylinders + boxes + GSAP garage-door
  - PatternStabilizer: imperative particle systems for escaping tendrils
  - EnemySpawner: imperative billboard planes with SDF ShaderMaterials
  - PostProcessCorruption: imperative custom PostProcess
  - SPSEnemies: imperative SolidParticleSystem
  - DiegeticGUI: imperative torus ring mesh
- State Layer (Zustand): seed-store, level-store, audio-store

## Key Patterns

1. **Imperative Mesh Creation**: All Babylon.js meshes/materials created in useEffect, NOT as JSX.
2. **Observable Render Loop**: scene.onBeforeRenderObservable.add() — cleanup wrapped in braces.
3. **CSP-Safe Shader Store**: All GLSL in BABYLON.Effect.ShadersStore as static string constants.
4. **GSAP + Babylon.js**: gsap.to(mesh.position, {...}) works natively with Vector3 number properties.
5. **SSR Bypass**: All 3D code in 'use client' files loaded via dynamic({ ssr: false }).
6. **Zustand Bridge**: Render loop reads useLevelStore.getState().tension. React subscribes normally.
7. **Reactylon JSX (lowercase)**: hemisphericLight, arcRotateCamera, pointLight for declarative elements.
8. **Engine Config**: forceWebGL={true}, engineOptions for antialias/adaptToDeviceRatio/audioEngine:false.
`);

  await fs.writeFile(path.join(MEMORY_BANK_DIR, 'techContext.md'), `# Tech Context — Cognitive Dissonance

## Stack

| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 15.1 | App Router, SSR framework |
| React | 19 | UI components |
| TypeScript | 5 | Type safety |
| Babylon.js | 8.51 | 3D rendering engine |
| Reactylon | 3.5.4 | Declarative Babylon.js + React bindings |
| GSAP | 3.12 | Advanced animations |
| Tone.js | 14.8 | Adaptive spatial audio |
| Zustand | 5 | Global state management |
| Miniplex | 2 | Entity Component System |
| Yuka.js | 0.7 | Enemy AI behaviors |
| seedrandom | 3.0 | Deterministic buried seed |
| Tailwind CSS | 4 | 2D overlay styling |
| babel-plugin-reactylon | 1.3 | Babylon.js tree-shaking |

## Commands

npm install, npm run dev, npm run build, npm start

## Constraints

- CSP-safe: No eval, no dynamic code generation. All shaders as static strings.
- SSR bypass: All 3D code in 'use client' files with dynamic ssr:false.
- WebGL forced: forceWebGL=true on Engine for complex GLSL raymarcher compatibility.
- Babylon audio disabled: audioEngine: false. Tone.js handles all sound.
- npm only (not pnpm, not yarn).
- System fonts: Courier New monospace.

## Key Dependency Notes

- reactylon exports Engine from reactylon/web, everything else from reactylon
- useScene() hook from reactylon returns BABYLON.Scene
- Effect.ShadersStore keys: {name}VertexShader, {name}FragmentShader
- scene.onBeforeRenderObservable.remove() returns boolean — wrap cleanup in braces
- GSAP plugins must be registered once: gsap.registerPlugin(CustomEase)
`);

  await fs.writeFile(path.join(MEMORY_BANK_DIR, 'progress.md'), `# Progress — Cognitive Dissonance

## What Works

- [x] Next.js 15 scaffold with App Router
- [x] TypeScript compilation — zero errors
- [x] npm run build succeeds
- [x] All 20+ component files compile
- [x] 3 shader materials ported to Babylon.js 8
- [x] Zustand stores (seed, level, audio)
- [x] Miniplex ECS world with archetypes
- [x] ATC WebGL2 background shader
- [x] Title/game-over overlays
- [x] GSAP CustomEase definitions
- [x] Documentation restructured into Cline memory bank

## What's Left (Runtime Verification)

- [ ] 3D scene renders on npm run dev
- [ ] Glass sphere visible with celestial shader
- [ ] Platter geometry visible with proper materials
- [ ] GSAP garage-door animation plays
- [ ] Pattern stabilization click detection works
- [ ] Enemy spawner creates billboard planes
- [ ] Post-process corruption ramps with tension
- [ ] SPS enemy particles activate
- [ ] Diegetic GUI ring visible
- [ ] Audio initializes on user gesture
- [ ] Full gameplay loop

## Stubbed / Placeholder

- physics-keys.tsx: Ammo.js setup commented out
- spatial-audio.tsx: No Tone.js Panner3D nodes connected
- XR hand tracking: Not implemented

## Known Issues

- Reactylon Engine does NOT accept antialias as top-level prop (must be in engineOptions)
- Reactylon Scene does NOT accept clearColor as prop (must use onSceneReady callback)
- onBeforeRenderObservable.remove() returns boolean (cleanup must be wrapped in braces)
- babel-plugin-reactylon package name is babel-plugin-reactylon (not reactylon/babel-plugin)
- ShaderMaterial does NOT have storeEffectOnSubMeshes option
- Tone.js MetalSynth does NOT accept frequency in constructor
`);

  await fs.writeFile(path.join(MEMORY_BANK_DIR, 'design-decisions.md'), `# Design Decisions — Cognitive Dissonance

## Why Glass Sphere Instead of Sonny Bust

Original: NS-5 android (Sonny from I, Robot) sitting at desk.
Evolution: Full bust -> rear bust -> HAL eye -> pure glass sphere.
The sphere is MORE powerful because it removes empathy, makes corruption internal, and glass = fragility.

## Why Pattern Stabilization Instead of Missile Command

Missile Command felt old, violent, external. Pattern stabilization is intimate, mechanical, hopeless, non-violent, and diegetic. You're touching the mind directly through the interface.

## Why Buried Seed

Visible seed (Adjective-Adjective-Noun) broke the fourth wall. Buried seed means the AI dreams in secret. New Game button IS the shuffle.

## Why "COGNITION SHATTERED" Not "Game Over"

Symmetric with opening. Cold, clinical, machine-like. Continues thematic vocabulary.

## Why No HUD

The platter IS the interface. Coherence = glowing ring. Tension = sphere color + RGB drift + audio. All feedback through the machine itself.
`);

  console.log(chalk.magenta.bold('   ✅ Memory bank complete (7 files)'));
}

// Main

async function main() {
  console.log(chalk.bold.magenta('\n🚀 Cognitive Dissonance — Enhanced Docs Organizer v2\n'));

  for (const [label, fp] of [['Shader Ports', SHADER_PORTS_FILE], ['Procedural Bust', PROCEDURAL_FILE]] as const) {
    if (!await fs.pathExists(fp)) {
      console.error(chalk.red(`❌ ${label} not found: ${fp}`));
      process.exit(1);
    }
  }

  console.log(chalk.gray('🧹 Cleaning previous output...'));
  await fs.remove(CODE_FRAGMENTS_DIR);
  await fs.remove(MEMORY_BANK_DIR);

  for (const dir of [
    CODE_FRAGMENTS_DIR,
    path.join(CODE_FRAGMENTS_DIR, 'components'),
    path.join(CODE_FRAGMENTS_DIR, 'components/ui'),
    path.join(CODE_FRAGMENTS_DIR, 'store'),
    path.join(CODE_FRAGMENTS_DIR, 'lib'),
    path.join(CODE_FRAGMENTS_DIR, 'lib/shaders'),
    path.join(CODE_FRAGMENTS_DIR, 'config'),
    path.join(CODE_FRAGMENTS_DIR, 'html'),
    path.join(CODE_FRAGMENTS_DIR, 'unnamed'),
    path.join(CODE_FRAGMENTS_DIR, 'game'),
    MEMORY_BANK_DIR,
  ]) {
    await ensureDir(dir);
  }

  await processDocument(PROCEDURAL_FILE, 'Grok-Procedural_Robot_Bust_Modeling_Breakdown.md');
  await processDocument(SHADER_PORTS_FILE, 'Grok-Cognitive_Dissonance_Babylon.js_Shader_Ports.md');
  await writeManifest();
  await buildMemoryBank();

  const definitiveCount = manifestEntries.filter(e => e.definitive).length;
  const uniqueFiles = new Set(manifestEntries.map(e => e.outputPath.replace(/\.v\d+(\.\w+)$/, '$1'))).size;

  console.log(chalk.bold.green('\n🎉 ALL DONE!'));
  console.log(chalk.white(`📦 Total blocks extracted: ${manifestEntries.length}`));
  console.log(chalk.white(`📂 Unique logical files: ${uniqueFiles}`));
  console.log(chalk.yellow(`⭐ Definitive versions: ${definitiveCount}`));
  console.log(chalk.white('📂 Structure:'));
  console.log(chalk.white('   • code-fragments/   — every code block with proper filenames'));
  console.log(chalk.white('   • memory-bank/      — Cline-style knowledge base (7 files)'));
  console.log(chalk.white('   • MANIFEST.md       — full extraction manifest'));
}

main().catch(err => {
  console.error(chalk.red('💥 Error:'), err);
  process.exit(1);
});
