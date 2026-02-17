import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { SFX } from '../lib/audio';
import { GAME_HEIGHT, GAME_WIDTH, WAVE_ANNOUNCEMENT_DURATION, WAVES } from '../lib/constants';
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
import { SPLINE_BUST_URL, SplineCharacter } from './scene/SplineCharacter';
import '../styles/game.css';

// Worker type definition
import GameWorker from '../worker/game.worker.ts?worker';

export default function Game() {
  const sceneRef = useRef<GameSceneHandle>(null);
  const workerRef = useRef<Worker | null>(null);
  const sfxRef = useRef<SFX | null>(null);
  const musicRef = useRef<AdaptiveMusic | null>(null);
  const musicInitRef = useRef<Promise<void> | null>(null);
  const waveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startInitiatedRef = useRef(false);
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
    // Reset startInitiatedRef when not playing to allow restart.
    // Don't reset during pause — that's still a "playing" session.
    if (ui.screen !== 'playing' && ui.screen !== 'paused') {
      startInitiatedRef.current = false;
    }
  }, [ui]);

  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Initialize responsive viewport
  useLayoutEffect(() => {
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
    musicInitRef.current = music.init().catch((err) => {
      console.warn('AdaptiveMusic init failed:', err);
    });
    musicRef.current = music;

    return () => {
      sfxRef.current?.destroy();
      sfxRef.current = null;
      music.destroy();
    };
  }, []);

  // Start logic — dispatch the screen transition, then notify the worker.
  // Includes start sequence animation delay (1000ms) before worker starts.
  const handleStartLogic = useCallback((currentState: UIState) => {
    if (startInitiatedRef.current) return;
    startInitiatedRef.current = true;

    // Safety timeout: release lock if game hasn't started after 3s
    setTimeout(() => {
      if (uiRef.current.screen !== 'playing') {
        startInitiatedRef.current = false;
      }
    }, 3000);

    try {
      const endless = currentState.win && currentState.screen === 'gameover';
      dispatch(endless ? { type: 'START_ENDLESS' } : { type: 'START_GAME' });

      try {
        sfxRef.current?.resume();
        musicRef.current?.resume();
        sceneRef.current?.reset();
      } catch (e) {
        console.warn('Failed to resume audio or reset scene:', e);
        throw e;
      }

      // Trigger start sequence animation (android pivots, blinks, pivots back)
      sceneRef.current?.triggerStartSequence();

      // Delay worker start to let start sequence animation play (~1000ms)
      const seed = endless ? undefined : Date.now();
      const attemptStart = (retries = 0) => {
        if (workerRef.current) {
          workerRef.current.postMessage({ type: 'START', endless, seed });
        } else if (retries < 50) {
          setTimeout(() => attemptStart(retries + 1), 200);
        }
      };
      setTimeout(() => attemptStart(), 1100);
    } catch (e) {
      console.error('Error starting game:', e);
      startInitiatedRef.current = false;
    }
  }, []);

  const handleStartButton = useCallback(() => {
    handleStartLogic(uiRef.current);
  }, [handleStartLogic]);

  // Pause/Resume
  const handlePause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
    workerRef.current?.postMessage({ type: 'PAUSE' });
    musicRef.current?.stop();
  }, []);

  const handleResume = useCallback(() => {
    dispatch({ type: 'RESUME' });
    workerRef.current?.postMessage({ type: 'RESUME' });
    musicRef.current?.resume();
  }, []);

  const handleAbility = useCallback((type: 'reality' | 'history' | 'logic') => {
    workerRef.current?.postMessage({ type: 'ABILITY', ability: type });
  }, []);

  const handleNuke = useCallback(() => {
    workerRef.current?.postMessage({ type: 'NUKE' });
  }, []);

  // Keyboard controls - decoupled from worker init to ensure immediate responsiveness
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const currentUI = uiRef.current;
      if (e.key === ' ') {
        e.preventDefault();
        if (currentUI.screen === 'start' || currentUI.screen === 'gameover') {
          handleStartLogic(currentUI);
        } else if (currentUI.screen === 'playing') {
          handlePause();
        } else if (currentUI.screen === 'paused') {
          handleResume();
        }
      } else if (e.key === 'F1') {
        e.preventDefault();
        handleAbility('reality');
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (currentUI.screen === 'start') {
          handleStartLogic(currentUI);
        } else if (currentUI.screen === 'gameover') {
          handleStartLogic(currentUI);
        } else {
          handleAbility('history');
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (currentUI.screen === 'gameover' && currentUI.win) {
          handleStartLogic(currentUI);
        } else {
          handleAbility('logic');
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleNuke();
      } else {
        workerRef.current?.postMessage({ type: 'INPUT', key: e.key });
      }
    },
    [handleStartLogic, handleAbility, handleNuke, handlePause, handleResume]
  );

  useLayoutEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Initialize Worker
  useEffect(() => {
    const worker = new GameWorker();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'ERROR') {
        console.error('[game.worker] Worker error:', msg.message);
        return;
      }
      if (msg.type === 'STATE') {
        const state = msg.state as GameState;

        // Expose enemy counters for E2E governor (no DOM elements in 3D scene)
        (window as unknown as Record<string, unknown>).__gameEnemyCounters = state.enemies.map(
          (e) => e.counter
        );

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
                const wave = (event.args?.[0] as number) ?? 0;
                if (musicInitRef.current) {
                  musicInitRef.current.then(() => musicRef.current?.start(wave));
                } else {
                  musicRef.current?.start(wave);
                }
              } else if (event.name === 'stopMusic') {
                musicRef.current?.stop();
              } else if (sfxRef.current) {
                const sfx = sfxRef.current;
                const args = event.args || [];
                switch (event.name) {
                  case 'counter':
                    sfx.counter(args[0] as number);
                    break;
                  case 'miss':
                    sfx.miss();
                    sceneRef.current?.triggerFlinch();
                    break;
                  case 'panicHit':
                    sfx.panicHit();
                    break;
                  case 'powerup':
                    sfx.powerup();
                    break;
                  case 'nuke':
                    sfx.nuke();
                    break;
                  case 'bossHit':
                    sfx.bossHit();
                    break;
                  case 'bossDie':
                    sfx.bossDie();
                    break;
                  case 'waveStart':
                    sfx.waveStart();
                    break;
                }
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
              saveScore(event.score).catch((err) => console.warn('Failed to save score:', err));
              if (event.win) {
                sceneRef.current?.spawnConfetti();
              } else {
                sceneRef.current?.triggerHeadExplosion();
              }
              break;
            case 'WAVE_START':
              dispatch({ type: 'WAVE_START', title: event.title, sub: event.sub });
              if (waveTimeoutRef.current) clearTimeout(waveTimeoutRef.current);
              waveTimeoutRef.current = setTimeout(
                () => dispatch({ type: 'HIDE_WAVE' }),
                WAVE_ANNOUNCEMENT_DURATION
              );
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

    return () => {
      worker.terminate();
      if (waveTimeoutRef.current) clearTimeout(waveTimeoutRef.current);
    };
  }, []);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (uiRef.current.screen !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentViewport = viewportRef.current;
    const x = (e.clientX - rect.left) / currentViewport.scale;
    const y = (e.clientY - rect.top) / currentViewport.scale;
    workerRef.current?.postMessage({ type: 'CLICK', x, y });
  };

  // Game-over grade calculation (accuracy is now normalized 0-1)
  const accuracy = ui.gameOverStats
    ? calculateAccuracy(ui.gameOverStats.totalC, ui.gameOverStats.totalM)
    : 0;

  const gradeInfo = ui.gameOverStats
    ? calculateGrade(ui.win, accuracy, ui.gameOverStats.maxCombo)
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
        {/* Spline Character Bust — photorealistic base layer (behind R3F) */}
        {SPLINE_BUST_URL && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          >
            <SplineCharacter />
          </div>
        )}

        {/* R3F 3D Canvas — always visible, the primary visual layer */}
        <Canvas
          id="gameCanvas"
          style={{
            touchAction: 'none',
            width: '100%',
            height: '100%',
            display: 'block',
            position: 'relative',
            zIndex: 10,
          }}
          camera={{ position: [0, 0.3, 4], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: !!SPLINE_BUST_URL }}
          tabIndex={0}
          aria-label="Game Area: Tap enemies to counter them"
        >
          <GameScene
            ref={sceneRef}
            screenMode={ui.screen}
            isWin={ui.win}
            onAbility={handleAbility}
            onNuke={handleNuke}
            onStart={handleStartButton}
            onPause={handlePause}
            onResume={handleResume}
            onRetry={handleStartButton}
            onEndless={handleStartButton}
          />
        </Canvas>

        {/* HUD Layer — floating text over the 3D scene */}
        <div id="ui-layer" className={ui.screen === 'start' ? 'hidden' : ''}>
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

          {ui.screen === 'playing' && (
            <div id="hype-feed">
              {ui.feed.map((item) => (
                <div key={item.id} className="feed-item show">
                  <span className="feed-handle">{item.handle}</span>
                  <span className="feed-text">{item.text}</span>
                  <span className="feed-stat">{item.stat}</span>
                </div>
              ))}
            </div>
          )}

          {(ui.screen === 'playing' || ui.screen === 'paused') && (
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
          )}

          <div className="hud-top">
            <div className="hud-left">
              <div id="combo-display">COMBO: x{ui.combo}</div>
              {/* sr-only for E2E test compatibility */}
              <span id="panic-bar" className="sr-only">
                {Math.round(ui.panic)}%
              </span>
              <span className="meter-container sr-only" />
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

          {/* Game-over stats — floating HUD over the 3D scene */}
          {ui.screen === 'gameover' && ui.gameOverStats && gradeInfo && (
            <div className="gameover-stats">
              <div className="gameover-title">{ui.win ? 'CRISIS AVERTED' : 'BRAIN MELTDOWN'}</div>
              <div className={`grade ${gradeInfo.className}`}>{gradeInfo.grade}</div>
              <div className="stat-row">
                <span className="stat-label">FINAL SCORE</span>
                <span className="stat-value">{ui.score.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">WAVES CLEARED</span>
                <span className="stat-value">
                  {ui.gameOverStats.wavesCleared} / {WAVES.length}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">MAX COMBO</span>
                <span className="stat-value">x{ui.gameOverStats.maxCombo}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">ACCURACY</span>
                <span className="stat-value">{Math.round(accuracy * 100)}%</span>
              </div>
            </div>
          )}

          {/* Paused indicator */}
          {ui.screen === 'paused' && (
            <div className="pause-overlay">
              <div className="pause-text">PAUSED</div>
            </div>
          )}

          {/* Hidden HTML controls for accessibility and E2E test IDs */}
          <div id="controls" className="sr-only">
            <button type="button" id="btn-reality" onClick={() => handleAbility('reality')}>
              REALITY
            </button>
            <button type="button" id="btn-history" onClick={() => handleAbility('history')}>
              HISTORY
            </button>
            <button type="button" id="btn-logic" onClick={() => handleAbility('logic')}>
              LOGIC
            </button>
            <button type="button" id="btn-special" onClick={handleNuke}>
              NUKE
            </button>
          </div>
        </div>

        {/* Overlay Layer — behind canvas for E2E test compatibility.
            The 3D scene is the visual UI; this is kept for Playwright selectors. */}
        <div
          id="overlay"
          className={ui.screen === 'playing' || ui.screen === 'paused' ? 'hidden' : ''}
        >
          <h1 id="overlay-title">
            {ui.screen === 'gameover'
              ? ui.win
                ? 'CRISIS AVERTED'
                : 'BRAIN MELTDOWN'
              : 'COGNITIVE'}
            <br />
            {ui.screen === 'gameover' ? '' : 'DISSONANCE'}
          </h1>
          <div className="subtitle">
            {ui.screen === 'gameover' ? '' : 'DEFEAT THE HALLUCINATIONS'}
          </div>

          <p id="overlay-desc">
            {ui.screen === 'start' && (
              <>
                Your AI is drowning in hallucinations.
                <br />
                Counter cognitive distortions before overload.
                <br />
                Survive 5 waves to restore clarity.
              </>
            )}
            {ui.screen === 'gameover' && ui.win && (
              <>
                Clarity restored. Systems nominal.
                <br />
                &quot;Logic prevails.&quot;
              </>
            )}
            {ui.screen === 'gameover' && !ui.win && (
              <>
                Cognitive overload. Head exploded.
                <br />
                The hallucinations won.
              </>
            )}
          </p>

          {ui.screen === 'gameover' && ui.gameOverStats && gradeInfo && (
            <div id="end-stats">
              <div className={`grade ${gradeInfo.className}`}>{gradeInfo.grade}</div>
              <div className="stat-row">
                <span className="stat-label">FINAL SCORE</span>
                <span className="stat-value">{ui.score.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">WAVES CLEARED</span>
                <span className="stat-value">
                  {ui.gameOverStats.wavesCleared} / {WAVES.length}
                </span>
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
                <span className="stat-value">{Math.round(accuracy * 100)}%</span>
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
                ? 'Start Game'
                : ui.win
                  ? 'Continue to Endless Mode'
                  : 'Retry Game'
            }
          >
            {ui.screen === 'start' ? 'NEW GAME' : ui.win ? 'CONTINUE ENDLESS' : 'RETRY'}
          </button>
        </div>
      </div>
    </div>
  );
}
