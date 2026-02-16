import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { SFX } from '../lib/audio';
import { GAME_HEIGHT, GAME_WIDTH, WAVES } from '../lib/constants';
import {
  calculateViewport,
  createResizeObserver,
  detectDevice,
  type ViewportDimensions,
} from '../lib/device-utils';
import type { GameState } from '../lib/events';
import { PixiRenderer } from '../lib/pixi-renderer';
import { saveScore } from '../lib/storage';
import '../styles/game.css';

// Worker type definition
import GameWorker from '../worker/game.worker.ts?worker';

type UIState = {
  screen: 'start' | 'playing' | 'gameover' | 'endless_transition';
  score: number;
  wave: number;
  panic: number;
  combo: number;
  maxCombo: number;
  time: number;
  win: boolean;
  nukeCd: number;
  nukeMax: number;
  abilityCd: { reality: number; history: number; logic: number };
  abilityMax: { reality: number; history: number; logic: number };
  pu: { slow: number; shield: number; double: number };
  waveTitle: string;
  waveSub: string;
  showWave: boolean;
  boss: { name: string; hp: number; maxHp: number } | null;
  feed: { handle: string; text: string; stat: string; id: number }[];
};

const initialState: UIState = {
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

type Action =
  | { type: 'UPDATE_STATE'; state: GameState }
  | { type: 'GAME_OVER'; score: number; win: boolean }
  | { type: 'START_GAME' }
  | { type: 'START_ENDLESS' }
  | { type: 'WAVE_START'; title: string; sub: string }
  | { type: 'HIDE_WAVE' }
  | { type: 'ADD_FEED'; item: { handle: string; text: string; stat: string } }
  | { type: 'BOSS_START'; name: string; hp: number }
  | { type: 'BOSS_HIT'; hp: number; maxHp: number }
  | { type: 'BOSS_DIE' };

function uiReducer(state: UIState, action: Action): UIState {
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const rendererRef = useRef<PixiRenderer | null>(null);
  const sfxRef = useRef<SFX | null>(null);
  const [ui, dispatch] = useReducer(uiReducer, initialState);
  const [viewport, setViewport] = useState<ViewportDimensions>({
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
  const handleStartLogic = useCallback((currentState: UIState) => {
    sfxRef.current?.resume();
    if (currentState.win && currentState.screen === 'gameover') {
      dispatch({ type: 'START_ENDLESS' });
      workerRef.current?.postMessage({ type: 'START', endless: true });
    } else {
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
    if (!canvasRef.current) return;

    // Initialize Renderer
    const renderer = new PixiRenderer();
    renderer.init(canvasRef.current).then(() => {
      rendererRef.current = renderer;
    });

    // Initialize Worker
    const worker = new GameWorker();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'STATE') {
        const state = msg.state as GameState;

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
    const handleKeyDown = (e: KeyboardEvent) => {
      // Use uiRef to access latest state
      const currentUI = uiRef.current;

      if (e.key === ' ') {
        e.preventDefault();

        if (currentUI.screen === 'start' || currentUI.screen === 'gameover') {
          handleStartLogic(currentUI);
        }
      } else {
        worker.postMessage({ type: 'INPUT', key: e.key });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      worker.terminate();
      rendererRef.current?.destroy();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleStartLogic]);

  const handleAbility = (type: 'reality' | 'history' | 'logic') => {
    workerRef.current?.postMessage({ type: 'ABILITY', ability: type });
  };

  const handleNuke = () => {
    workerRef.current?.postMessage({ type: 'NUKE' });
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    // Get current viewport from ref to avoid closure issues
    const currentViewport = viewportRef.current;

    // Convert viewport coordinates to game coordinates using responsive viewport
    const x = (e.clientX - rect.left) / currentViewport.scale;
    const y = (e.clientY - rect.top) / currentViewport.scale;

    workerRef.current?.postMessage({ type: 'CLICK', x, y });
  };

  return (
    <div id="game-scaler" style={{ touchAction: 'none' }}>
      <div
        id="game-container"
        style={{
          width: `${viewport.width}px`,
          height: `${viewport.height}px`,
          position: 'relative',
          margin: '0 auto',
        }}
      >
        <canvas
          ref={canvasRef}
          id="gameCanvas"
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          onPointerDown={handleCanvasPointerDown}
          style={{
            touchAction: 'none',
            width: '100%',
            height: '100%',
            display: 'block',
          }}
          tabIndex={0}
          aria-label="Game Area: Tap enemies to counter them"
        ></canvas>

        {/* HUD Layer */}
        <div id="ui-layer" className={ui.screen === 'playing' ? '' : 'hidden'}>
          <div id="wave-announce" className={ui.showWave ? 'show' : ''}>
            <div className="wt" id="wa-title">
              {ui.waveTitle}
            </div>
            <div className="ws" id="wa-sub">
              {ui.waveSub}
            </div>
          </div>

          {ui.boss && (
            <div id="boss-hp-container" style={{ display: 'block' }}>
              <div className="boss-name" id="boss-name">
                {ui.boss.name}
              </div>
              <div id="boss-hp-outer">
                <div
                  id="boss-hp-bar"
                  style={{ width: `${(ui.boss.hp / ui.boss.maxHp) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <div id="hype-feed">
            {ui.feed.map((item) => (
              <div key={item.id} className="feed-item show">
                <span className="feed-handle">{item.handle}</span>
                <span className="feed-text">{item.text}</span>
                <span className="feed-stat">{item.stat}</span>
              </div>
            ))}
          </div>

          <div id="powerup-hud">
            <div className="pu-icon" id="pu-slow" style={{ opacity: ui.pu.slow > 0 ? 1 : 0.15 }}>
              ⏳
            </div>
            <div
              className="pu-icon"
              id="pu-shield"
              style={{ opacity: ui.pu.shield > 0 ? 1 : 0.15 }}
            >
              🛡️
            </div>
            <div
              className="pu-icon"
              id="pu-double"
              style={{ opacity: ui.pu.double > 0 ? 1 : 0.15 }}
            >
              ⭐
            </div>
          </div>

          <div className="hud-top">
            <div className="hud-left">
              <div>PANIC</div>
              <div className="meter-container">
                <div className="marker" style={{ left: '33%' }}></div>
                <div className="marker" style={{ left: '66%' }}></div>
                <div id="panic-bar" style={{ width: `${ui.panic}%` }}></div>
              </div>
              <div id="combo-display">COMBO: x{ui.combo}</div>
            </div>
            <div className="hud-center">
              <div id="wave-display">
                {ui.wave >= WAVES.length
                  ? `ENDLESS ${ui.wave - (WAVES.length - 1)}`
                  : `WAVE ${ui.wave + 1}`}
              </div>
            </div>
            <div className="hud-right">
              <div>
                TIME: <span id="time-display">{Math.ceil(ui.time)}</span>s
              </div>
              <div>
                SCORE: <span id="score-display">{ui.score}</span>
              </div>
            </div>
          </div>

          <div id="controls">
            <button
              type="button"
              className="btn reality"
              id="btn-reality"
              onClick={() => handleAbility('reality')}
              aria-label="Counter Reality (Shortcut: 1)"
              aria-keyshortcuts="1"
              style={{ touchAction: 'manipulation' }}
            >
              <div className="key-hint">1</div>REALITY<span>🦠 HYPE</span>
              <div
                className="cooldown-bar"
                id="cd-reality"
                style={{ width: `${(ui.abilityCd.reality / ui.abilityMax.reality) * 100}%` }}
              ></div>
            </button>
            <button
              type="button"
              className="btn history"
              id="btn-history"
              onClick={() => handleAbility('history')}
              aria-label="Counter History (Shortcut: 2)"
              aria-keyshortcuts="2"
              style={{ touchAction: 'manipulation' }}
            >
              <div className="key-hint">2</div>HISTORY<span>📈 GROWTH</span>
              <div
                className="cooldown-bar"
                id="cd-history"
                style={{ width: `${(ui.abilityCd.history / ui.abilityMax.history) * 100}%` }}
              ></div>
            </button>
            <button
              type="button"
              className="btn logic"
              id="btn-logic"
              onClick={() => handleAbility('logic')}
              aria-label="Counter Logic (Shortcut: 3)"
              aria-keyshortcuts="3"
              style={{ touchAction: 'manipulation' }}
            >
              <div className="key-hint">3</div>LOGIC<span>🤖 DEMOS</span>
              <div
                className="cooldown-bar"
                id="cd-logic"
                style={{ width: `${(ui.abilityCd.logic / ui.abilityMax.logic) * 100}%` }}
              ></div>
            </button>
            <button
              type="button"
              className="btn special"
              id="btn-special"
              onClick={handleNuke}
              aria-label="Trigger Nuke (Shortcut: Q)"
              aria-keyshortcuts="q"
              style={{ touchAction: 'manipulation' }}
            >
              <div className="key-hint">Q</div>NUKE<span>💥 ALL</span>
              <div
                className="cooldown-bar"
                id="cd-special"
                style={{ width: `${(ui.nukeCd / ui.nukeMax) * 100}%` }}
              ></div>
            </button>
          </div>
        </div>

        {/* Overlay Layer */}
        <div id="overlay" className={ui.screen !== 'playing' ? '' : 'hidden'}>
          <h1 id="overlay-title">
            {ui.screen === 'gameover'
              ? ui.win
                ? 'CRISIS AVERTED'
                : 'FULL PSYCHOSIS'
              : 'PSYDUCK PANIC'}
            <br />
            {ui.screen === 'gameover' ? '' : 'EVOLUTION'}
          </h1>
          <div className="subtitle">{ui.screen === 'gameover' ? '' : 'D E L U X E'}</div>

          <p id="overlay-desc">
            {ui.screen === 'start' && (
              <>
                Your brother is doomscrolling AI hype.
                <br />
                Counter thought bubbles before PANIC hits 100%.
                <br />
                Survive 5 waves + bosses to save his brain.
              </>
            )}
            {ui.screen === 'gameover' && ui.win && (
              <>
                His brain is safe... for now.
                <br />
                <br />
                Press SPACE to continue into ENDLESS MODE
              </>
            )}
            {ui.screen === 'gameover' && !ui.win && (
              <>
                His brain melted. Game over.
                <br />
                <br />
                Press SPACE to retry
              </>
            )}
          </p>

          {ui.screen === 'start' && (
            <p>
              <b style={{ color: '#e67e22' }}>1</b> Reality &nbsp;
              <b style={{ color: '#2ecc71' }}>2</b> History &nbsp;
              <b style={{ color: '#9b59b6' }}>3</b> Logic &nbsp;
              <b style={{ color: '#e74c3c' }}>Q</b> Nuke
            </p>
          )}

          {ui.screen === 'gameover' && (
            <div id="end-stats">
              SCORE: {ui.score}
              <br />
              {/* Accuracy calculation omitted for brevity unless tracked in state */}
              MAX COMBO: x{ui.maxCombo}
            </div>
          )}

          <button
            type="button"
            className="start-btn"
            id="start-btn"
            onClick={handleStartButton}
            aria-label={
              ui.screen === 'start'
                ? 'Start Debate'
                : ui.win
                  ? 'Continue to Endless Mode'
                  : 'Retry Game'
            }
          >
            {ui.screen === 'start' ? 'START DEBATE' : ui.win ? 'CONTINUE ENDLESS' : 'RETRY'}
          </button>
        </div>
      </div>
    </div>
  );
}
