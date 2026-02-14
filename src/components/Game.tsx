import { useEffect, useRef } from 'react';
import { GameEngine } from '../lib/game-engine';
import '../styles/game.css';

/**
 * Mounts the game's React UI and initializes the GameEngine for the canvas-based game.
 *
 * Sets up responsive scaling and input bindings (keyboard, control buttons, pointer, and touch)
 * for the game canvas and renders the HUD, controls, and overlay UI.
 *
 * @returns The React element tree for the game interface, including the canvas, HUD, controls, and overlay.
 */
export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameInstanceRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    // Initialize game resize handler
    const resizeGame = () => {
      const scaler = document.getElementById('game-scaler');
      if (scaler) {
        const scale =
          window.innerWidth / window.innerHeight < 800 / 600
            ? window.innerWidth / 800
            : window.innerHeight / 600;
        scaler.style.transform = `scale(${scale})`;
      }
    };

    window.addEventListener('resize', resizeGame);
    resizeGame();

    // Initialize game engine
    if (canvasRef.current && !gameInstanceRef.current) {
      gameInstanceRef.current = new GameEngine(canvasRef.current);
    }

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      const gameInstance = gameInstanceRef.current;
      if (!gameInstance) return;
      if (e.key === '1') gameInstance.triggerAbility('reality');
      else if (e.key === '2') gameInstance.triggerAbility('history');
      else if (e.key === '3') gameInstance.triggerAbility('logic');
      else if (e.key === 'q' || e.key === 'Q') gameInstance.triggerNuke();
      else if (e.key === ' ') {
        e.preventDefault();
        if (!gameInstance.running) {
          const title = document.getElementById('overlay-title')?.textContent;
          if (title === 'CRISIS AVERTED') {
            gameInstance.endless = true;
            const overlay = document.getElementById('overlay');
            if (overlay) overlay.classList.add('hidden');
            gameInstance.running = true;
            if (!gameInstance.sfx.ctx) gameInstance.sfx.init();
            gameInstance.sfx.resume();
            gameInstance.startWave(gameInstance.wave + 1);
            gameInstance.lastFrame = performance.now();
            requestAnimationFrame(gameInstance.loop.bind(gameInstance));
          } else {
            gameInstance.start();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Prevent multi-touch
    const preventMultiTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    document.addEventListener('touchstart', preventMultiTouch, { passive: false });

    return () => {
      window.removeEventListener('resize', resizeGame);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchstart', preventMultiTouch);
    };
  }, []);

  const handleStart = () => {
    gameInstanceRef.current?.start();
  };

  const handleAbility = (type: 'reality' | 'history' | 'logic') => {
    gameInstanceRef.current?.triggerAbility(type);
  };

  const handleNuke = () => {
    gameInstanceRef.current?.triggerNuke();
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const gameInstance = gameInstanceRef.current;
    if (!gameInstance || !gameInstance.running || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 600;
    const enemy = gameInstance.findEnemyAt(x, y);
    if (enemy && !enemy.encrypted) {
      gameInstance.triggerAbility(enemy.type.counter);
    }
  };

  return (
    <div id="game-scaler">
      <div id="game-container">
        <canvas
          ref={canvasRef}
          id="gameCanvas"
          width="800"
          height="600"
          onPointerDown={handleCanvasPointerDown}
        ></canvas>
        <div id="wave-announce">
          <div className="wt" id="wa-title"></div>
          <div className="ws" id="wa-sub"></div>
        </div>
        <div id="boss-hp-container">
          <div className="boss-name" id="boss-name">
            BOSS
          </div>
          <div id="boss-hp-outer">
            <div id="boss-hp-bar"></div>
          </div>
        </div>
        <div id="hype-feed"></div>
        <div id="powerup-hud">
          <div className="pu-icon" id="pu-slow">
            ⏳
          </div>
          <div className="pu-icon" id="pu-shield">
            🛡️
          </div>
          <div className="pu-icon" id="pu-double">
            ⭐
          </div>
        </div>
        <div id="ui-layer">
          <div className="hud-top">
            <div className="hud-left">
              <div>PANIC</div>
              <div className="meter-container">
                <div className="marker" style={{ left: '33%' }}></div>
                <div className="marker" style={{ left: '66%' }}></div>
                <div id="panic-bar"></div>
              </div>
              <div id="combo-display">COMBO: x1</div>
            </div>
            <div className="hud-center">
              <div id="wave-display">WAVE 1</div>
            </div>
            <div className="hud-right">
              <div>
                TIME: <span id="time-display">30</span>s
              </div>
              <div>
                SCORE: <span id="score-display">0</span>
              </div>
            </div>
          </div>
          <div id="controls">
            <button
              type="button"
              className="btn reality"
              id="btn-reality"
              onClick={() => handleAbility('reality')}
            >
              <div className="key-hint">1</div>REALITY<span>🦠 HYPE</span>
              <div className="cooldown-bar" id="cd-reality"></div>
            </button>
            <button
              type="button"
              className="btn history"
              id="btn-history"
              onClick={() => handleAbility('history')}
            >
              <div className="key-hint">2</div>HISTORY<span>📈 GROWTH</span>
              <div className="cooldown-bar" id="cd-history"></div>
            </button>
            <button
              type="button"
              className="btn logic"
              id="btn-logic"
              onClick={() => handleAbility('logic')}
            >
              <div className="key-hint">3</div>LOGIC<span>🤖 DEMOS</span>
              <div className="cooldown-bar" id="cd-logic"></div>
            </button>
            <button type="button" className="btn special" id="btn-special" onClick={handleNuke}>
              <div className="key-hint">Q</div>NUKE<span>💥 ALL</span>
              <div className="cooldown-bar" id="cd-special"></div>
            </button>
          </div>
        </div>
        <div id="overlay">
          <h1 id="overlay-title">
            PSYDUCK PANIC
            <br />
            EVOLUTION
          </h1>
          <div className="subtitle">D E L U X E</div>
          <p id="overlay-desc">
            Your brother is doomscrolling AI hype.
            <br />
            Counter thought bubbles before PANIC hits 100%.
            <br />
            Survive 5 waves + bosses to save his brain.
            <br />
            <br />
            <b style={{ color: '#e67e22' }}>1</b> Reality &nbsp;
            <b style={{ color: '#2ecc71' }}>2</b> History &nbsp;
            <b style={{ color: '#9b59b6' }}>3</b> Logic &nbsp;
            <b style={{ color: '#e74c3c' }}>Q</b> Nuke
          </p>
          <div id="end-stats" className="hidden"></div>
          <button type="button" className="start-btn" id="start-btn" onClick={handleStart}>
            START DEBATE
          </button>
        </div>
      </div>
    </div>
  );
}
