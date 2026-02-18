// scripts/split-grok-conversations.ts
// Deep extraction: Split Grok conversations into reviewable pieces,
// cross-reference against already-extracted code, find remaining value.
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');
const GROK_DOC_DIR = path.join(DOCS_DIR, 'memory-bank', 'grok-doc');
const DEFINITIVE_DIR = path.join(GROK_DOC_DIR, 'definitive');
const PROSE_DIR = path.join(GROK_DOC_DIR, 'prose');
const CODE_FRAGMENTS_DIR = path.join(DOCS_DIR, 'code-fragments');

const MAIN_FILE = path.join(DOCS_DIR, 'Grok-Procedural_Robot_Bust_Modeling_Breakdown.md');
const SHADER_FILE = path.join(DOCS_DIR, 'Grok-Cognitive_Dissonance_Babylon.js_Shader_Ports.md');

async function findAllFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  if (!await fs.pathExists(dir)) return results;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...await findAllFiles(full));
    else results.push(full);
  }
  return results;
}

async function loadExistingFingerprints(): Promise<Set<string>> {
  const hashes = new Set<string>();
  const files = await findAllFiles(CODE_FRAGMENTS_DIR);
  for (const file of files) {
    if (file.endsWith('.md')) continue;
    const content = await fs.readFile(file, 'utf-8');
    const fp = content.trim().substring(0, 200);
    if (fp.length > 20) hashes.add(fp);
  }
  return hashes;
}

interface Turn {
  idx: number;
  speaker: 'USER' | 'ASSISTANT';
  startLine: number;
  endLine: number;
  content: string;
  summary: string;
  codeBlocks: number;
  hasNewCode: boolean;
  isDesign: boolean;
  isDefinitive: boolean;
  topics: string[];
}

function splitConversation(content: string): Turn[] {
  const lines = content.split('\n');
  const turns: Turn[] = [];
  let curStart = 0;
  let curSpeaker: 'USER' | 'ASSISTANT' = 'USER';
  const marker = /^\*\*\[(USER|ASSISTANT)\]\*\*$/;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(marker);
    if (m && i > 0) {
      const body = lines.slice(curStart, i).join('\n').trim();
      if (body.length > 0) {
        turns.push(buildTurn(turns.length, curSpeaker, curStart + 1, i, body));
      }
      curStart = i + 1;
      curSpeaker = m[1] as 'USER' | 'ASSISTANT';
    }
  }
  const last = lines.slice(curStart).join('\n').trim();
  if (last.length > 0) {
    turns.push(buildTurn(turns.length, curSpeaker, curStart + 1, lines.length, last));
  }
  return turns;
}

function buildTurn(idx: number, speaker: 'USER' | 'ASSISTANT', startLine: number, endLine: number, content: string): Turn {
  const codeMatches = content.match(/```\w*\n/g);
  const codeBlocks = codeMatches ? codeMatches.length : 0;
  return {
    idx, speaker, startLine, endLine, content,
    summary: getSummary(content, speaker),
    codeBlocks,
    hasNewCode: false,
    isDesign: checkDesign(content),
    isDefinitive: checkDefinitive(content),
    topics: getTopics(content),
  };
}

function getSummary(content: string, speaker: string): string {
  const nonEmpty = content.split('\n').filter(l => l.trim().length > 0);
  if (speaker === 'USER') return (nonEmpty[0] || '').substring(0, 150);
  for (const line of nonEmpty.slice(0, 10)) {
    if (line.startsWith('#')) return line.replace(/^#+\s*/, '').substring(0, 150);
    if (line.startsWith('**') && line.endsWith('**')) return line.replace(/\*\*/g, '').substring(0, 150);
  }
  return (nonEmpty[0] || '').substring(0, 150);
}

const TOPICS: [RegExp, string][] = [
  [/glass\s*sphere|celestial|nebula/i, 'glass-sphere'],
  [/platter|garage.?door|keycap|keyboard/i, 'platter'],
  [/pattern\s*stab|corruption\s*pattern|hold.*key/i, 'pattern-stabilization'],
  [/enemy|yuka|spawn|hallucination/i, 'enemies'],
  [/tone\.?js|audio|sound|music|drone/i, 'audio'],
  [/gsap|animation|ease|timeline|motion/i, 'gsap'],
  [/shader|glsl|sdf|raymarcher?/i, 'shaders'],
  [/reactylon|babylon/i, 'babylon'],
  [/tension|coherence|panic/i, 'tension'],
  [/xr|hand\s*track|haptic/i, 'xr'],
  [/seed|procedural|random/i, 'seed'],
  [/bust|sonny|ns-?5|robot/i, 'sonny'],
  [/missile|command|shoot/i, 'missile-cmd'],
  [/title|game\s*over|shattered/i, 'title'],
  [/post.?process|chromatic|vignette/i, 'postfx'],
  [/lever|play.*key|continue.*key/i, 'controls'],
  [/r21dev|variant|prompt/i, 'r21dev'],
  [/csp|eval|security/i, 'csp'],
];

function getTopics(content: string): string[] {
  const t: string[] = [];
  for (const [re, label] of TOPICS) if (re.test(content)) t.push(label);
  return t;
}

function checkDesign(content: string): boolean {
  const l = content.toLowerCase();
  return ['what do you think', 'pros', 'should we', 'let\'s explore', 'what about', 'what if', 'pivoting',
    'feels wrong', 'feels right', 'not fun', 'more fun', 'replay value', 'thematic', 'diegetic', 'humanizing',
    'missile command', 'pattern stabilization', 'buried seed'].some(m => l.includes(m));
}

function checkDefinitive(content: string): boolean {
  const l = content.toLowerCase();
  return ['here is the complete', 'final version', 'production-ready', 'copy-paste ready',
    'definitive version', 'complete, polished', 'no placeholders', 'the definitive',
    'complete, fully implemented'].some(m => l.includes(m));
}

function checkNewCode(turn: Turn, fingerprints: Set<string>): boolean {
  const blocks = turn.content.match(/```\w*\n[\s\S]*?```/g) || [];
  for (const block of blocks) {
    const code = block.replace(/^```\w*\n/, '').replace(/```$/, '').trim();
    if (code.length < 30) continue;
    if (!fingerprints.has(code.substring(0, 200))) return true;
  }
  return false;
}

function extractLatestNamedFiles(turns: Turn[]): Array<{name: string; code: string; turnIdx: number; line: number}> {
  const fileMap = new Map<string, {name: string; code: string; turnIdx: number; line: number}>();
  const pathRe = /^\/\/\s*((?:components|store|lib|game|app)\/[\w\-./]+\.\w+)/m;
  for (const turn of turns) {
    if (turn.speaker !== 'ASSISTANT') continue;
    const blocks = turn.content.match(/```\w*\n[\s\S]*?```/g) || [];
    for (const block of blocks) {
      const lang = (block.match(/^```(\w*)/) || [])[1] || '';
      if (['bash', 'sh', 'text', 'markdown', 'md'].includes(lang)) continue;
      const code = block.replace(/^```\w*\n/, '').replace(/```$/, '').trim();
      if (code.length < 50) continue;
      const nameMatch = code.match(pathRe);
      if (!nameMatch) continue;
      const name = nameMatch[1].replace(/^src\//, '');
      const existing = fileMap.get(name);
      if (!existing || turn.idx > existing.turnIdx || (turn.idx === existing.turnIdx && code.length > existing.code.length)) {
        fileMap.set(name, { name, code, turnIdx: turn.idx, line: turn.startLine });
      }
    }
  }
  return Array.from(fileMap.values());
}

async function processDoc(filePath: string, label: string, fingerprints: Set<string>) {
  console.log(chalk.blue.bold(`\n📘 ${label}`));
  const content = await fs.readFile(filePath, 'utf-8');
  const turns = splitConversation(content);
  console.log(chalk.gray(`   ${turns.length} turns`));

  for (const t of turns) t.hasNewCode = checkNewCode(t, fingerprints);

  const slug = label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const docDir = path.join(GROK_DOC_DIR, slug);
  await fs.ensureDir(docDir);

  for (const t of turns) {
    const pre = String(t.idx).padStart(3, '0');
    const spk = t.speaker.toLowerCase();
    const tag = t.topics.slice(0, 3).join('-') || 'general';
    const fname = `${pre}-${spk}-${tag}.md`;
    let hdr = `# Turn ${t.idx} (${t.speaker}) — Lines ${t.startLine}-${t.endLine}\n\n`;
    hdr += `**Summary**: ${t.summary}\n**Topics**: ${t.topics.join(', ')}\n`;
    hdr += `**Code**: ${t.codeBlocks} | **New**: ${t.hasNewCode ? 'YES' : 'no'} | **Design**: ${t.isDesign ? 'YES' : 'no'} | **Definitive**: ${t.isDefinitive ? 'YES' : 'no'}\n\n---\n\n`;
    await fs.writeFile(path.join(docDir, fname), hdr + t.content);
  }
  console.log(chalk.green(`   ✅ ${turns.length} turn files`));

  const defs = extractLatestNamedFiles(turns);
  for (const d of defs) {
    const out = path.join(DEFINITIVE_DIR, d.name);
    await fs.ensureDir(path.dirname(out));
    await fs.writeFile(out, d.code);
  }
  console.log(chalk.yellow(`   ⭐ ${defs.length} definitive files`));

  const designTurns = turns.filter(t => t.isDesign && t.content.length > 200);
  const proseDir = path.join(PROSE_DIR, slug);
  await fs.ensureDir(proseDir);
  for (const t of designTurns) {
    const pre = String(t.idx).padStart(3, '0');
    const tag = t.topics.slice(0, 2).join('-') || 'design';
    await fs.writeFile(path.join(proseDir, `${pre}-${tag}.md`),
      `# Design — Turn ${t.idx}\n\n**Topics**: ${t.topics.join(', ')}\n\n---\n\n${t.content}`);
  }
  console.log(chalk.cyan(`   📝 ${designTurns.length} prose files`));

  // INDEX
  let idx = `# Turn Index — ${label}\n\nTurns: ${turns.length} | New code: ${turns.filter(t => t.hasNewCode).length} | Design: ${designTurns.length} | Definitive: ${turns.filter(t => t.isDefinitive).length}\n\n`;
  const topicCounts = new Map<string, number>();
  for (const t of turns) for (const tp of t.topics) topicCounts.set(tp, (topicCounts.get(tp) || 0) + 1);
  idx += `## Topics\n\n`;
  for (const [tp, ct] of [...topicCounts.entries()].sort((a, b) => b[1] - a[1])) idx += `- **${tp}**: ${ct}\n`;
  idx += `\n## Turns\n\n| # | Who | Lines | Code | New | Design | Def | Topics | Summary |\n|---|-----|-------|------|-----|--------|-----|--------|---------|\n`;
  for (const t of turns) {
    idx += `| ${t.idx} | ${t.speaker} | ${t.startLine}-${t.endLine} | ${t.codeBlocks} | ${t.hasNewCode ? '**YES**' : ''} | ${t.isDesign ? 'Y' : ''} | ${t.isDefinitive ? '**Y**' : ''} | ${t.topics.slice(0, 3).join(', ')} | ${t.summary.substring(0, 60)} |\n`;
  }
  await fs.writeFile(path.join(docDir, 'INDEX.md'), idx);
  console.log(chalk.green(`   ✅ INDEX.md`));

  return { turns, defs, designTurns };
}

async function main() {
  console.log(chalk.bold.magenta('\n🔬 Deep Extraction Pass\n'));
  await fs.remove(GROK_DOC_DIR);
  await fs.ensureDir(GROK_DOC_DIR);
  await fs.ensureDir(DEFINITIVE_DIR);
  await fs.ensureDir(PROSE_DIR);

  console.log(chalk.gray('Loading existing fingerprints...'));
  const fp = await loadExistingFingerprints();
  console.log(chalk.gray(`   ${fp.size} fingerprints`));

  const r1 = await processDoc(MAIN_FILE, 'main-conversation', fp);
  const r2 = await processDoc(SHADER_FILE, 'shader-ports', fp);

  const allDefs = [...r1.defs, ...r2.defs];
  let dm = `# Definitive Files\n\n| File | Turn | Line |\n|------|------|------|\n`;
  for (const d of allDefs.sort((a, b) => a.name.localeCompare(b.name))) dm += `| \`${d.name}\` | ${d.turnIdx} | ${d.line} |\n`;
  await fs.writeFile(path.join(DEFINITIVE_DIR, 'MANIFEST.md'), dm);

  const total = r1.turns.length + r2.turns.length;
  const newCode = [...r1.turns, ...r2.turns].filter(t => t.hasNewCode).length;
  console.log(chalk.bold.green(`\n🎉 DONE — ${total} turns, ${allDefs.length} definitive files, ${newCode} turns with unextracted code`));
}

main().catch(err => { console.error(chalk.red('Error:'), err); process.exit(1); });
