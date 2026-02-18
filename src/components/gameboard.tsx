'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import ATCShader from '@/components/ui/atc-shader';
import { loadHighScore, saveHighScore } from '@/lib/high-score';
import { useAudioStore } from '@/store/audio-store';
import { useGameStore } from '@/store/game-store';
import { useInputStore } from '@/store/input-store';
import { useLevelStore } from '@/store/level-store';
import { useSeedStore } from '@/store/seed-store';

const GameScene = dynamic(() => import('@/components/game-scene'), { ssr: false });

export default function GameBoard() {
  // ── Overlay states ──
  const [showLoading, setShowLoading] = useState(true);
  const [loadingOpacity, setLoadingOpacity] = useState(1);
  const [showTitle, setShowTitle] = useState(false);
  const [titleOpacity, setTitleOpacity] = useState(0);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverOpacity, setGameOverOpacity] = useState(0);
  const [showClarity, setShowClarity] = useState(false);
  const [clarityOpacity, setClarityOpacity] = useState(0);
  const [seedCopied, setSeedCopied] = useState(false);

  // ── High score state ──
  const [highScore, setHighScore] = useState(loadHighScore());
  const [runStats, setRunStats] = useState({ peakCoherence: 0, levelsSurvived: 1 });

  // ── Accessibility: reduced motion ──
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    if (mq.addEventListener) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, []);

  // ── Screen reader live region ──
  const [srAnnouncement, setSrAnnouncement] = useState('');
  const lastAnnouncedTension = useRef(0);

  const tension = useLevelStore((s) => s.tension);
  const coherence = useLevelStore((s) => s.coherence);
  const initialize = useAudioStore((s) => s.initialize);
  const _phase = useGameStore((s) => s.phase);

  const handleRestart = useCallback(() => {
    useLevelStore.getState().reset();
    useSeedStore.getState().generateNewSeed();
    useGameStore.getState().triggerRestart();
    setShowGameOver(false);
    setGameOverOpacity(0);
    setSeedCopied(false);
  }, []);

  const handleShareSeed = useCallback(async () => {
    const seed = useSeedStore.getState().lastSeedUsed;
    if (!seed) return;
    try {
      await navigator.clipboard.writeText(seed);
      setSeedCopied(true);
      setTimeout(() => setSeedCopied(false), 2000);
    } catch (err) {
      console.error('[Clipboard] Failed to copy seed:', err);
    }
  }, []);

  // ── Loading → Title sequence with proper cleanup ──
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (reducedMotion) {
      setShowLoading(false);
      setLoadingOpacity(0);
      setShowTitle(true);
      setTitleOpacity(1);
      timers.push(
        setTimeout(() => {
          setTitleOpacity(0);
          timers.push(setTimeout(() => setShowTitle(false), 120));
        }, 500),
      );
    } else {
      // Loading screen holds for 2s, then fades → title sizzle
      timers.push(
        setTimeout(() => {
          setLoadingOpacity(0);
          timers.push(
            setTimeout(() => {
              setShowLoading(false);
              setShowTitle(true);
              setTitleOpacity(1);
              timers.push(
                setTimeout(() => {
                  setTitleOpacity(0);
                  timers.push(setTimeout(() => setShowTitle(false), 900));
                }, 2400),
              );
            }, 600),
          );
        }, 2000),
      );
    }

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [reducedMotion]);

  // Initialize audio on first interaction
  useEffect(() => {
    const handleClick = () => {
      initialize();
      window.removeEventListener('click', handleClick);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [initialize]);

  // Game over listener — save high score with per-field max
  useEffect(() => {
    const handleGameOver = () => {
      const state = useLevelStore.getState();
      const seed = useSeedStore.getState().lastSeedUsed;
      const stats = { peakCoherence: state.peakCoherence, levelsSurvived: state.currentLevel };
      setRunStats(stats);

      // Per-field max to never regress either metric
      // Update seed whenever either metric sets a new personal best
      const current = loadHighScore();
      const isNewBest = stats.peakCoherence > current.peakCoherence || stats.levelsSurvived > current.levelsSurvived;
      const newHigh = {
        peakCoherence: Math.max(stats.peakCoherence, current.peakCoherence),
        levelsSurvived: Math.max(stats.levelsSurvived, current.levelsSurvived),
        seed: isNewBest ? seed : current.seed,
      };
      saveHighScore(newHigh);
      setHighScore(newHigh);

      useGameStore.getState().setPhase('gameover');
      setShowGameOver(true);
      setGameOverOpacity(1);
      setSrAnnouncement('Cognition shattered. The sphere has broken.');
    };
    window.addEventListener('gameOver', handleGameOver);
    return () => window.removeEventListener('gameOver', handleGameOver);
  }, []);

  // Moment of clarity listener
  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;
    const handleClarity = () => {
      setShowClarity(true);
      setClarityOpacity(1);
      setSrAnnouncement('Coherence maintained. A moment of clarity.');
      fadeTimer = setTimeout(
        () => {
          setClarityOpacity(0);
          hideTimer = setTimeout(() => setShowClarity(false), reducedMotion ? 120 : 900);
        },
        reducedMotion ? 400 : 2000,
      );
    };
    window.addEventListener('coherenceMaintained', handleClarity);
    return () => {
      window.removeEventListener('coherenceMaintained', handleClarity);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [reducedMotion]);

  // Sync tension to audio store + screen reader announcements
  useEffect(() => {
    useAudioStore.getState().updateTension(tension);
    const tensionPct = Math.round(tension * 10) * 10;
    if (tensionPct !== lastAnnouncedTension.current && tensionPct > 0) {
      lastAnnouncedTension.current = tensionPct;
      setSrAnnouncement(`Tension at ${tensionPct} percent`);
    }
  }, [tension]);

  // Expose Zustand stores on window for E2E test bridge + debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window as Window & {
        __zustand_level?: typeof useLevelStore;
        __zustand_input?: typeof useInputStore;
        __zustand_game?: typeof useGameStore;
        __zustand_seed?: typeof useSeedStore;
      };
      w.__zustand_level = useLevelStore;
      w.__zustand_input = useInputStore;
      w.__zustand_game = useGameStore;
      w.__zustand_seed = useSeedStore;
    }
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* ATC Shader Background */}
      <ATCShader className="z-0" />

      {/* Screen reader live region (invisible) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {srAnnouncement}
      </div>

      {/* Loading Screen — "INITIALIZING CORE" */}
      {showLoading && (
        <div
          data-testid="loading-overlay"
          className="absolute inset-0 z-40 flex items-center justify-center bg-black transition-opacity duration-[var(--ovl)]"
          style={{ opacity: loadingOpacity, ['--ovl' as string]: reducedMotion ? '120ms' : '600ms' }}
        >
          <h1 className="font-mono text-[32px] tracking-[16px] text-white/60 animate-pulse">INITIALIZING CORE</h1>
        </div>
      )}

      {/* Opening Title Sizzle */}
      {showTitle && (
        <div
          data-testid="title-overlay"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 transition-opacity duration-[var(--title)]"
          style={{ opacity: titleOpacity, ['--title' as string]: reducedMotion ? '120ms' : '900ms' }}
        >
          <div className="text-center">
            <h1 className="font-mono text-[92px] tracking-[12px] text-white">COGNITIVE</h1>
            <h1 className="font-mono text-[92px] tracking-[12px] text-red-500 -mt-6">DISSONANCE</h1>
          </div>
        </div>
      )}

      {/* Moment of Clarity — brief flash when coherence hits 100 */}
      {showClarity && (
        <div
          data-testid="clarity-overlay"
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-[var(--clarity)]"
          style={{ opacity: clarityOpacity, ['--clarity' as string]: reducedMotion ? '120ms' : '900ms' }}
        >
          <h1 className="font-mono text-[48px] tracking-[8px] text-blue-400/80">COHERENCE MAINTAINED</h1>
        </div>
      )}

      {/* Game Over — Symmetric Static Close */}
      {showGameOver && (
        <div
          data-testid="gameover-overlay"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 transition-opacity duration-[var(--go)] cursor-pointer"
          style={{ opacity: gameOverOpacity, ['--go' as string]: reducedMotion ? '120ms' : '1200ms' }}
          onClick={handleRestart}
          role="dialog"
          aria-label="Game over. Cognition shattered."
        >
          <div className="text-center">
            <h1 className="font-mono text-[92px] tracking-[12px] text-red-500">COGNITION</h1>
            <h1 className="font-mono text-[92px] tracking-[12px] text-white -mt-6">SHATTERED</h1>
            <div className="mt-8 text-white/60 font-mono text-lg">
              Peak coherence: {runStats.peakCoherence}% · Levels survived: {runStats.levelsSurvived}
            </div>
            {highScore.peakCoherence > 0 && (
              <div className="mt-2 text-white/40 font-mono text-sm">
                Best: {highScore.peakCoherence}% coherence · {highScore.levelsSurvived} levels
              </div>
            )}
            <div className="mt-8 flex items-center justify-center gap-6">
              <button
                type="button"
                className="text-white/40 font-mono text-sm hover:text-white/70 transition-colors border border-white/20 px-4 py-2 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareSeed();
                }}
                aria-label="Copy dream seed to clipboard"
              >
                {seedCopied ? 'Dream copied' : 'Share this dream'}
              </button>
            </div>
            <div className="mt-6 text-white/40 font-mono text-sm">Click anywhere to dream again</div>
          </div>
        </div>
      )}

      {/* 3D Game Layer */}
      <div className="absolute inset-0 z-10" style={{ touchAction: 'none' }}>
        <GameScene coherence={coherence} reducedMotion={reducedMotion} />
      </div>
    </div>
  );
}
