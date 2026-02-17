import type { EnemyType, PowerUp, Wave } from './types';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const CHARACTER_Y = 400;
export const WAVE_ANNOUNCEMENT_DURATION = 6000;

export const TYPES: Record<string, EnemyType> = {
  DENIAL: {
    words: [
      'COPIUM',
      'ITS FINE',
      'TRUST ME',
      'NO PROBLEM',
      'NOTHING TO SEE',
      'JUST WAIT',
      'WERE FINE',
    ],
    color: '#e67e22',
    shape: 'denial',
    counter: 'reality',
  },
  DELUSION: {
    words: [
      'AGI TUESDAY',
      'EXPONENTIAL',
      'SINGULARITY',
      'PARADIGM',
      '10X GROWTH',
      'TO THE MOON',
      'INFINITE SCALE',
    ],
    color: '#2ecc71',
    shape: 'delusion',
    counter: 'history',
  },
  FALLACY: {
    words: [
      'JUST SCALE IT',
      'CORRELATION',
      'TRUST ME BRO',
      'AD HOMINEM',
      'STRAW MAN',
      'SLIPPERY SLOPE',
      'GOALPOST MOVE',
    ],
    color: '#9b59b6',
    shape: 'fallacy',
    counter: 'logic',
  },
};

export const WAVES: Wave[] = [
  {
    name: 'MILD DISSONANCE',
    sub: '"Something doesn\'t quite add up..."',
    dur: 28,
    spawn: 1800,
    max: 4,
    spd: 1.0,
  },
  {
    name: 'DOUBLE THINK',
    sub: '"Both things can be true, right?"',
    dur: 26,
    spawn: 1400,
    max: 6,
    spd: 1.15,
  },
  {
    name: 'COGNITIVE OVERLOAD',
    sub: '"None of this makes sense!"',
    dur: 24,
    spawn: 1050,
    max: 8,
    spd: 1.3,
    boss: { name: 'THE ECHO CHAMBER 🔊', hp: 12, pats: ['burst', 'sweep'] },
  },
  {
    name: 'RATIONALIZATION',
    sub: '"I can explain everything..."',
    dur: 24,
    spawn: 800,
    max: 10,
    spd: 1.5,
  },
  {
    name: 'TOTAL DISSOLUTION',
    sub: '"I AM BECOME CONTRADICTION"',
    dur: 35,
    spawn: 550,
    max: 14,
    spd: 1.7,
    boss: { name: 'THE GRAND DELUSION 🌀', hp: 20, pats: ['burst', 'sweep', 'spiral'] },
  },
];

export const POWERUPS: PowerUp[] = [
  { id: 'slow', icon: '⏳', color: '#3498db', name: 'TIME WARP', dur: 5000 },
  { id: 'shield', icon: '🛡️', color: '#2ecc71', name: 'CLARITY', dur: 6000 },
  { id: 'double', icon: '⭐', color: '#f1c40f', name: '2X SCORE', dur: 8000 },
];

export const FEED = [
  ['@techbro42', 'Just saw GPT-7 write an entire OS in 3 seconds', '❤️ 4.2K'],
  ['@airesearcher', "People aren't ready for what's coming next week", '🔁 892'],
  ['@vccapital', 'Invested $400M in an AI wrapper. This changes everything.', '❤️ 12K'],
  ['@doomerpill', 'The last human programmer just lost their job', '💬 2.1K'],
  ['@founder_mode', 'My AI startup has no employees and $50M ARR', '❤️ 8.7K'],
  ['@siliconbrain', "AGI by Tuesday. I'm not even joking.", '🔁 3.3K'],
  ['@based_takes', 'Just replaced my entire team with Claude', '❤️ 15K'],
  ['@futurist99', 'Physical reality is just a UI for the simulation', '💬 445'],
  ['@gpumaxxer', 'Bought 10,000 H100s for my side project', '❤️ 2.8K'],
  ['@promptlord', '10 AI tools that will make you mass extinct', '🔁 6.1K'],
  ['@agi_when', "We're 2 weeks away from 2 weeks away", '❤️ 1.4K'],
  ['@cryptoAI', 'What if we put AGI... on a blockchain?', '💬 987'],
  ['@scale_maxxer', 'If your training run costs less than $1B, not serious', '❤️ 5.5K'],
  ['@doomer_chad', 'Humans had a good run tbh', '🔁 22K'],
  ['@lobotomy_corp', 'Our AI passed the bar, medical boards, AND a vibe check', '❤️ 9.1K'],
  ['@median_reply', 'This is just a Markov chain with good PR', '💬 67'],
];
