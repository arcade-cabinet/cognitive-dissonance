import { Canvas } from '@react-three/fiber';
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
import { calculateAccuracy, calculateGrade } from '../lib/grading';
import { AdaptiveMusic } from '../lib/music';
import { saveScore } from '../lib/storage';
import { initialUIState, type UIState, uiReducer } from '../lib/ui-state';
import { GameScene, type GameSceneHandle } from './scene/GameScene';
import '../styles/game.css';

// Worker type definition
import GameWorker from '../worker/game.worker.ts?worker';

export default function Game() {
  const sceneRef = useRef<GameSceneHandle>(null);
  const workerRef = useRef<Worker | null>(null);
  const sfxRef = useRef<SFX | null>(null);
  const musicRef = useRef<AdaptiveMusic | null>(null);
  const [ui, dispatch] = useReducer(uiReducer, initialUIState);
  const [viewport, setViewport] = useState<ViewportDimensions>(() => {
    if (typeof window !== 'undefined') {
      const deviceInfo = detectDevice();
      return calculateViewport(GAME_WIDTH, GAME_HEIGHT, deviceInfo);
    }
    return {
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      aspectRatio: GAME_WIDTH / GAME_HEIGHT,
    };
  });

  const uiRef = useRef(ui);
  useEffect(() => {
    uiRef.current = ui;
  }, [ui]);

  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Initialize responsive viewport
  useEffect(() => {
    const deviceInfo = detectDevice();
    const initialViewport = calculateViewport(GAME_WIDTH, GAME_HEIGHT, deviceInfo);
    setViewport(initialViewport);
    const cleanup = createResizeObserver((newViewport) => {
      setViewport(newViewport);
    });
    return cleanup;
  }, []);

  // Initialize SFX + Music
  useEffect(() => {
    sfxRef.current = new SFX();
    sfxRef.current.init();

    const music = new AdaptiveMusic();
    music.init();
    musicRef.current = music;

    return () => {
      music.destroy();
    };
  }, []);

  // Start logic
  const handleStartLogic = useCallback((currentState: UIState) => {
    sfxRef.current?.resume();
    musicRef.current?.resume();
    sceneRef.current?.reset();

    if (currentState.win && currentState.screen === 'gameover') {
      dispatch({ type: 'START_ENDLESS' });
      workerRef.current?.postMessage({ type: 'START', endless: true });
    } else {
      dispatch({ type: 'START_GAME' });
      workerRef.current?.postMessage({ type: 'START', endless: false });
    }
  }, []);

  const handleStartButton = () => {
    handleStartLogic(ui);
  };

  // Initialize Worker
  useEffect(() => {
    const worker = new GameWorker();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'STATE') {
        const state = msg.state as GameState;

        // Update 3D scene via ref
        sceneRef.current?.updateState(state);

        // Update adaptive music panic level
        musicRef.current?.setPanic(state.panic);

        // Sync UI
        dispatch({ type: 'UPDATE_STATE', state });

        // Handle Events from Worker
        for (const event of state.events) {
          switch (event.type) {
            case 'SFX':
              if (event.name === 'startMusic') {
                // Use Tone.js adaptive music instead of SFX music
                musicRef.current?.start((event.args?.[0] as number) ?? 0);
              } else if (event.name === 'stopMusic') {
                musicRef.current?.stop();
              } else {
                // @ts-expect-error dynamic SFX method call
                sfxRef.current?.[event.name]?.(...(event.args || []));
              }
              break;
            case 'PARTICLE':
              sceneRef.current?.spawnParticles(event.x, event.y, event.color);
              break;
            case 'CONFETTI':
              sceneRef.current?.spawnConfetti();
              break;
            case 'GAME_OVER':
              dispatch({
                type: 'GAME_OVER',
                score: event.score,
                win: event.win,
                stats: {
                  totalC: event.totalC,
                  totalM: event.totalM,
                  maxCombo: event.maxCombo,
                  nukesUsed: event.nukesUsed,
                  wavesCleared: event.wavesCleared,
                },
              });
              saveScore(event.score);
              if (event.win) {
                sceneRef.current?.spawnConfetti();
              }
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
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleStartLogic]);

  const handleAbility = (type: 'reality' | 'history' | 'logic') => {
    workerRef.current?.postMessage({ type: 'ABILITY', ability: type });
  };

  const handleNuke = () => {
    workerRef.current?.postMessage({ type: 'NUKE' });
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const currentViewport = viewportRef.current;
    const x = (e.clientX - rect.left) / currentViewport.scale;
    const y = (e.clientY - rect.top) / currentViewport.scale;
    workerRef.current?.postMessage({ type: 'CLICK', x, y });
  };

  // Game-over grade calculation
  const accuracy = ui.gameOverStats
    ? calculateAccuracy(ui.gameOverStats.totalC, ui.gameOverStats.totalM)
    : 0;

  const gradeInfo = ui.gameOverStats
    ? calculateGrade(ui.win, accuracy / 100, ui.gameOverStats.maxCombo)
    : null;

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
        onPointerDown={handleCanvasPointerDown}
      >
        {/* R3F 3D Canvas */}
        <Canvas
          id="gameCanvas"
          style={{
            touchAction: 'none',
            width: '100%',
            height: '100%',
            display: 'block',
          }}
          camera={{ position: [0, 0.5, 6], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
          tabIndex={0}
          aria-label="Game Area: Tap enemies to counter them"
        >
          <GameScene ref={sceneRef} />
        </Canvas>

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
                : 'BRAIN MELTDOWN'
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
                He closes the laptop. Sunlight enters the room.
                <br />
                &quot;Maybe I should touch grass.&quot;
                <br />
                <br />
                <span style={{ color: '#00ffff' }}>
                  Press <b>SPACE</b> for ENDLESS MODE.
                </span>
              </>
            )}
            {ui.screen === 'gameover' && !ui.win && (
              <>
                Full Psyduck transformation complete.
                <br />
                He just pre-ordered 5,000 H100s.
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

          {ui.screen === 'gameover' && ui.gameOverStats && gradeInfo && (
            <div id="end-stats">
              <div className={`grade ${gradeInfo.className}`}>{gradeInfo.grade}</div>
              <div className="stat-row">
                <span className="stat-label">FINAL SCORE</span>
                <span className="stat-value">{ui.score.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">WAVES CLEARED</span>
                <span className="stat-value">{ui.gameOverStats.wavesCleared} / 5</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">MAX COMBO</span>
                <span className="stat-value">x{ui.gameOverStats.maxCombo}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">COUNTERED</span>
                <span className="stat-value">{ui.gameOverStats.totalC}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">ACCURACY</span>
                <span className="stat-value">{accuracy}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">NUKES USED</span>
                <span className="stat-value">{ui.gameOverStats.nukesUsed}</span>
              </div>
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
