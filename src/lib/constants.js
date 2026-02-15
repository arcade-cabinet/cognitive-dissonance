export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const TYPES = {
    REALITY: {
        words: ['FEB 2020', 'VIRUS', 'PANDEMIC', 'HYPE TRAIN', 'VAPORWARE', 'TRUST ME', 'JUST WAIT'],
        color: '#e67e22',
        icon: '🦠',
        counter: 'reality',
    },
    HISTORY: {
        words: [
            'EXPONENTIAL',
            'VERTICAL',
            'SINGULARITY',
            'MOORES LAW',
            '10X',
            'HOCKEY STICK',
            'TO THE MOON',
        ],
        color: '#2ecc71',
        icon: '📈',
        counter: 'history',
    },
    LOGIC: {
        words: ['SNAKE DEMO', 'DEVIN', 'AGENTS', 'WRAPPER', 'GPT CAN', 'JUST PROMPT', 'ITS OVER'],
        color: '#9b59b6',
        icon: '🤖',
        counter: 'logic',
    },
};
export const WAVES = [
    {
        name: 'CASUAL SCROLLING',
        sub: '"Just checking Twitter..."',
        dur: 28,
        spawn: 1800,
        max: 4,
        spd: 1.0,
    },
    {
        name: 'RABBIT HOLE',
        sub: '"Did you see this thread?"',
        dur: 26,
        spawn: 1400,
        max: 6,
        spd: 1.15,
    },
    {
        name: 'DOOM LOOP',
        sub: '"It\'s different this time!"',
        dur: 24,
        spawn: 1050,
        max: 8,
        spd: 1.3,
        boss: { name: 'THE HYPE TRAIN 🚂', hp: 12, pats: ['burst', 'sweep'] },
    },
    {
        name: 'FULL COPE',
        sub: '"We\'re all gonna make it"',
        dur: 24,
        spawn: 800,
        max: 10,
        spd: 1.5,
    },
    {
        name: 'FINAL FORM',
        sub: '"I AM THE SINGULARITY"',
        dur: 35,
        spawn: 550,
        max: 14,
        spd: 1.7,
        boss: { name: 'THE SINGULARITY 🧠', hp: 20, pats: ['burst', 'sweep', 'spiral'] },
    },
];
export const POWERUPS = [
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
