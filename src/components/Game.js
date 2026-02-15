import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { SFX } from '../lib/audio';
import { GAME_HEIGHT, GAME_WIDTH, WAVES } from '../lib/constants';
import { calculateViewport, createResizeObserver, detectDevice, } from '../lib/device-utils';
import { PixiRenderer } from '../lib/pixi-renderer';
import { saveScore } from '../lib/storage';
import '../styles/game.css';
// Worker type definition
import GameWorker from '../worker/game.worker.ts?worker';
const initialState = {
    screen: 'start',
    score: 0,
    wave: 0,
    panic: 0,
    combo: 0,
    maxCombo: 0,
    time: 0,
    win: false,
    nukeCd: 0,
    nukeMax: 1,
    abilityCd: { reality: 0, history: 0, logic: 0 },
    abilityMax: { reality: 1, history: 1, logic: 1 },
    pu: { slow: 0, shield: 0, double: 0 },
    waveTitle: '',
    waveSub: '',
    showWave: false,
    boss: null,
    feed: [],
};
function uiReducer(state, action) {
    switch (action.type) {
        case 'UPDATE_STATE':
            return {
                ...state,
                score: action.state.score,
                wave: action.state.wave,
                panic: action.state.panic,
                combo: action.state.combo,
                time: action.state.waveTime,
                nukeCd: action.state.nukeCd,
                nukeMax: action.state.nukeMax,
                abilityCd: action.state.abilityCd,
                abilityMax: action.state.abilityMax,
                pu: action.state.pu,
            };
        case 'GAME_OVER':
            return { ...state, screen: 'gameover', win: action.win, score: action.score };
        case 'START_GAME':
            return { ...initialState, screen: 'playing' };
        case 'START_ENDLESS':
            return { ...state, screen: 'playing' };
        case 'WAVE_START':
            return { ...state, showWave: true, waveTitle: action.title, waveSub: action.sub };
        case 'HIDE_WAVE':
            return { ...state, showWave: false };
        case 'ADD_FEED':
            return {
                ...state,
                feed: [{ ...action.item, id: Date.now() + Math.random() }, ...state.feed.slice(0, 2)],
            };
        case 'BOSS_START':
            return { ...state, boss: { name: action.name, hp: action.hp, maxHp: action.hp } };
        case 'BOSS_HIT':
            return {
                ...state,
                boss: state.boss ? { ...state.boss, hp: action.hp, maxHp: action.maxHp } : null,
            };
        case 'BOSS_DIE':
            return { ...state, boss: null };
        default:
            return state;
    }
}
export default function Game() {
    const canvasRef = useRef(null);
    const workerRef = useRef(null);
    const rendererRef = useRef(null);
    const sfxRef = useRef(null);
    const [ui, dispatch] = useReducer(uiReducer, initialState);
    const [viewport, setViewport] = useState({
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        aspectRatio: GAME_WIDTH / GAME_HEIGHT,
    });
    // Ref to hold the latest UI state for event handlers
    const uiRef = useRef(ui);
    useEffect(() => {
        uiRef.current = ui;
    }, [ui]);
    // Ref to hold the latest viewport for pointer events
    const viewportRef = useRef(viewport);
    useEffect(() => {
        viewportRef.current = viewport;
    }, [viewport]);
    // Initialize responsive viewport
    useEffect(() => {
        const deviceInfo = detectDevice();
        const initialViewport = calculateViewport(GAME_WIDTH, GAME_HEIGHT, deviceInfo);
        setViewport(initialViewport);
        // Set up resize observer
        const cleanup = createResizeObserver((newViewport) => {
            setViewport(newViewport);
        });
        return cleanup;
    }, []);
    // Initialize SFX
    useEffect(() => {
        sfxRef.current = new SFX();
        sfxRef.current.init();
    }, []);
    // Consolidate start logic
    // This logic works for both Spacebar (via listener) and Click (via button)
    // `currentState` arg allows the event listener to pass the ref value
    const handleStartLogic = useCallback((currentState) => {
        sfxRef.current?.resume();
        if (currentState.win && currentState.screen === 'gameover') {
            dispatch({ type: 'START_ENDLESS' });
            workerRef.current?.postMessage({ type: 'START', endless: true });
        }
        else {
            dispatch({ type: 'START_GAME' });
            workerRef.current?.postMessage({ type: 'START', endless: false });
        }
    }, []);
    // Button click handler - uses current state from closure
    const handleStartButton = () => {
        handleStartLogic(ui);
    };
    // Initialize Game (Renderer & Worker)
    useEffect(() => {
        if (!canvasRef.current)
            return;
        // Initialize Renderer
        const renderer = new PixiRenderer();
        renderer.init(canvasRef.current).then(() => {
            rendererRef.current = renderer;
        });
        // Initialize Worker
        const worker = new GameWorker();
        workerRef.current = worker;
        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.type === 'STATE') {
                const state = msg.state;
                // Sync Renderer
                rendererRef.current?.update(state);
                // Sync UI
                dispatch({ type: 'UPDATE_STATE', state });
                // Handle Events from Worker
                for (const event of state.events) {
                    switch (event.type) {
                        case 'SFX':
                            // @ts-expect-error
                            sfxRef.current?.[event.name]?.(...(event.args || []));
                            break;
                        case 'PARTICLE':
                            rendererRef.current?.spawnParticles(event.x, event.y, event.color);
                            break;
                        case 'CONFETTI':
                            rendererRef.current?.spawnConfetti(event.x, event.y);
                            break;
                        case 'GAME_OVER':
                            dispatch({ type: 'GAME_OVER', score: event.score, win: event.win });
                            saveScore(event.score);
                            break;
                        case 'WAVE_START':
                            dispatch({ type: 'WAVE_START', title: event.title, sub: event.sub });
                            setTimeout(() => dispatch({ type: 'HIDE_WAVE' }), 3000);
                            break;
                        case 'FEED':
                            dispatch({
                                type: 'ADD_FEED',
                                item: { handle: event.handle, text: event.text, stat: event.stat },
                            });
                            break;
                        case 'BOSS_START':
                            dispatch({ type: 'BOSS_START', name: event.name, hp: event.hp });
                            break;
                        case 'BOSS_HIT':
                            dispatch({ type: 'BOSS_HIT', hp: event.hp, maxHp: event.maxHp });
                            break;
                        case 'BOSS_DIE':
                            dispatch({ type: 'BOSS_DIE' });
                            break;
                    }
                }
            }
        };
        // Keyboard controls
        const handleKeyDown = (e) => {
            // Use uiRef to access latest state
            const currentUI = uiRef.current;
            if (e.key === ' ') {
                e.preventDefault();
                if (currentUI.screen === 'start' || currentUI.screen === 'gameover') {
                    handleStartLogic(currentUI);
                }
            }
            else {
                worker.postMessage({ type: 'INPUT', key: e.key });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        // Resize handler
        const resizeGame = () => {
            const scaler = document.getElementById('game-scaler');
            if (scaler) {
                // Enforce contain logic for mobile
                const winW = window.innerWidth;
                const winH = window.innerHeight;
                const scale = Math.min(winW / 800, winH / 600);
                scaler.style.transform = `scale(${scale})`;
                // Center the game on larger screens
                if (winW > 800 * scale) {
                    scaler.style.left = `${(winW - 800 * scale) / 2}px`;
                }
                else {
                    scaler.style.left = '0px';
                }
            }
        };
        window.addEventListener('resize', resizeGame);
        resizeGame();
        return () => {
            worker.terminate();
            rendererRef.current?.destroy();
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', resizeGame);
        };
    }, [handleStartLogic]);
    const handleAbility = (type) => {
        workerRef.current?.postMessage({ type: 'ABILITY', ability: type });
    };
    const handleNuke = () => {
        workerRef.current?.postMessage({ type: 'NUKE' });
    };
    const handleCanvasPointerDown = (e) => {
        if (!canvasRef.current)
            return;
        const rect = canvasRef.current.getBoundingClientRect();
        // Get current viewport from ref to avoid closure issues
        const currentViewport = viewportRef.current;
        // Convert viewport coordinates to game coordinates using responsive viewport
        const x = (e.clientX - rect.left) / currentViewport.scale;
        const y = (e.clientY - rect.top) / currentViewport.scale;
        workerRef.current?.postMessage({ type: 'CLICK', x, y });
    };
    return (_jsx("div", { id: "game-scaler", style: { touchAction: 'none' }, children: _jsxs("div", { id: "game-container", style: {
                width: `${viewport.width}px`,
                height: `${viewport.height}px`,
                position: 'relative',
                margin: '0 auto',
            }, children: [_jsx("canvas", { ref: canvasRef, id: "gameCanvas", width: GAME_WIDTH, height: GAME_HEIGHT, onPointerDown: handleCanvasPointerDown, style: {
                        touchAction: 'none',
                        width: '100%',
                        height: '100%',
                        display: 'block',
                    }, tabIndex: 0, "aria-label": "Game Area: Tap enemies to counter them" }), _jsxs("div", { id: "ui-layer", className: ui.screen === 'playing' ? '' : 'hidden', children: [_jsxs("div", { id: "wave-announce", className: ui.showWave ? 'show' : '', children: [_jsx("div", { className: "wt", id: "wa-title", children: ui.waveTitle }), _jsx("div", { className: "ws", id: "wa-sub", children: ui.waveSub })] }), ui.boss && (_jsxs("div", { id: "boss-hp-container", style: { display: 'block' }, children: [_jsx("div", { className: "boss-name", id: "boss-name", children: ui.boss.name }), _jsx("div", { id: "boss-hp-outer", children: _jsx("div", { id: "boss-hp-bar", style: { width: `${(ui.boss.hp / ui.boss.maxHp) * 100}%` } }) })] })), _jsx("div", { id: "hype-feed", children: ui.feed.map((item) => (_jsxs("div", { className: "feed-item show", children: [_jsx("span", { className: "feed-handle", children: item.handle }), _jsx("span", { className: "feed-text", children: item.text }), _jsx("span", { className: "feed-stat", children: item.stat })] }, item.id))) }), _jsxs("div", { id: "powerup-hud", children: [_jsx("div", { className: "pu-icon", id: "pu-slow", style: { opacity: ui.pu.slow > 0 ? 1 : 0.15 }, children: "\u23F3" }), _jsx("div", { className: "pu-icon", id: "pu-shield", style: { opacity: ui.pu.shield > 0 ? 1 : 0.15 }, children: "\uD83D\uDEE1\uFE0F" }), _jsx("div", { className: "pu-icon", id: "pu-double", style: { opacity: ui.pu.double > 0 ? 1 : 0.15 }, children: "\u2B50" })] }), _jsxs("div", { className: "hud-top", children: [_jsxs("div", { className: "hud-left", children: [_jsx("div", { children: "PANIC" }), _jsxs("div", { className: "meter-container", children: [_jsx("div", { className: "marker", style: { left: '33%' } }), _jsx("div", { className: "marker", style: { left: '66%' } }), _jsx("div", { id: "panic-bar", style: { width: `${ui.panic}%` } })] }), _jsxs("div", { id: "combo-display", children: ["COMBO: x", ui.combo] })] }), _jsx("div", { className: "hud-center", children: _jsx("div", { id: "wave-display", children: ui.wave >= WAVES.length
                                            ? `ENDLESS ${ui.wave - (WAVES.length - 1)}`
                                            : `WAVE ${ui.wave + 1}` }) }), _jsxs("div", { className: "hud-right", children: [_jsxs("div", { children: ["TIME: ", _jsx("span", { id: "time-display", children: Math.ceil(ui.time) }), "s"] }), _jsxs("div", { children: ["SCORE: ", _jsx("span", { id: "score-display", children: ui.score })] })] })] }), _jsxs("div", { id: "controls", children: [_jsxs("button", { type: "button", className: "btn reality", id: "btn-reality", onClick: () => handleAbility('reality'), "aria-label": "Counter Reality (Shortcut: 1)", "aria-keyshortcuts": "1", style: { touchAction: 'manipulation' }, children: [_jsx("div", { className: "key-hint", children: "1" }), "REALITY", _jsx("span", { children: "\uD83E\uDDA0 HYPE" }), _jsx("div", { className: "cooldown-bar", id: "cd-reality", style: { width: `${(ui.abilityCd.reality / ui.abilityMax.reality) * 100}%` } })] }), _jsxs("button", { type: "button", className: "btn history", id: "btn-history", onClick: () => handleAbility('history'), "aria-label": "Counter History (Shortcut: 2)", "aria-keyshortcuts": "2", style: { touchAction: 'manipulation' }, children: [_jsx("div", { className: "key-hint", children: "2" }), "HISTORY", _jsx("span", { children: "\uD83D\uDCC8 GROWTH" }), _jsx("div", { className: "cooldown-bar", id: "cd-history", style: { width: `${(ui.abilityCd.history / ui.abilityMax.history) * 100}%` } })] }), _jsxs("button", { type: "button", className: "btn logic", id: "btn-logic", onClick: () => handleAbility('logic'), "aria-label": "Counter Logic (Shortcut: 3)", "aria-keyshortcuts": "3", style: { touchAction: 'manipulation' }, children: [_jsx("div", { className: "key-hint", children: "3" }), "LOGIC", _jsx("span", { children: "\uD83E\uDD16 DEMOS" }), _jsx("div", { className: "cooldown-bar", id: "cd-logic", style: { width: `${(ui.abilityCd.logic / ui.abilityMax.logic) * 100}%` } })] }), _jsxs("button", { type: "button", className: "btn special", id: "btn-special", onClick: handleNuke, "aria-label": "Trigger Nuke (Shortcut: Q)", "aria-keyshortcuts": "q", style: { touchAction: 'manipulation' }, children: [_jsx("div", { className: "key-hint", children: "Q" }), "NUKE", _jsx("span", { children: "\uD83D\uDCA5 ALL" }), _jsx("div", { className: "cooldown-bar", id: "cd-special", style: { width: `${(ui.nukeCd / ui.nukeMax) * 100}%` } })] })] })] }), _jsxs("div", { id: "overlay", className: ui.screen !== 'playing' ? '' : 'hidden', children: [_jsxs("h1", { id: "overlay-title", children: [ui.screen === 'gameover'
                                    ? ui.win
                                        ? 'CRISIS AVERTED'
                                        : 'FULL PSYCHOSIS'
                                    : 'PSYDUCK PANIC', _jsx("br", {}), ui.screen === 'gameover' ? '' : 'EVOLUTION'] }), _jsx("div", { className: "subtitle", children: ui.screen === 'gameover' ? '' : 'D E L U X E' }), _jsxs("p", { id: "overlay-desc", children: [ui.screen === 'start' && (_jsxs(_Fragment, { children: ["Your brother is doomscrolling AI hype.", _jsx("br", {}), "Counter thought bubbles before PANIC hits 100%.", _jsx("br", {}), "Survive 5 waves + bosses to save his brain."] })), ui.screen === 'gameover' && ui.win && (_jsxs(_Fragment, { children: ["His brain is safe... for now.", _jsx("br", {}), _jsx("br", {}), "Press SPACE to continue into ENDLESS MODE"] })), ui.screen === 'gameover' && !ui.win && (_jsxs(_Fragment, { children: ["His brain melted. Game over.", _jsx("br", {}), _jsx("br", {}), "Press SPACE to retry"] }))] }), ui.screen === 'start' && (_jsxs("p", { children: [_jsx("b", { style: { color: '#e67e22' }, children: "1" }), " Reality \u00A0", _jsx("b", { style: { color: '#2ecc71' }, children: "2" }), " History \u00A0", _jsx("b", { style: { color: '#9b59b6' }, children: "3" }), " Logic \u00A0", _jsx("b", { style: { color: '#e74c3c' }, children: "Q" }), " Nuke"] })), ui.screen === 'gameover' && (_jsxs("div", { id: "end-stats", children: ["SCORE: ", ui.score, _jsx("br", {}), "MAX COMBO: x", ui.maxCombo] })), _jsx("button", { type: "button", className: "start-btn", id: "start-btn", onClick: handleStartButton, "aria-label": ui.screen === 'start'
                                ? 'Start Debate'
                                : ui.win
                                    ? 'Continue to Endless Mode'
                                    : 'Retry Game', children: ui.screen === 'start' ? 'START DEBATE' : ui.win ? 'CONTINUE ENDLESS' : 'RETRY' })] })] }) }));
}
