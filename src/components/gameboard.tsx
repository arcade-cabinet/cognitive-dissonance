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
  const reducedMotion = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    useGameStore.getState().setPhase('playing');
    setShowGameOver(false);
    setGameOverOpacity(0);
    setSeedCopied(false);
  }, []);

  const handleShareSeed = useCallback(async () => {
    const seed = useSeedStore.getState().lastSeedUsed;
    if (seed && navigator.clipboard) {
      await navigator.clipboard.writeText(seed);
      setSeedCopied(true);
      setTimeout(() => setSeedCopied(false), 2000);
    }
  }, []);

  // ── Loading → Title sequence ──
  useEffect(() => {
    // Loading screen holds for 2s, then fades → title sizzle
    const loadTimer = setTimeout(() => {
      setLoadingOpacity(0);
      setTimeout(() => {
        setShowLoading(false);
        setShowTitle(true);
        setTitleOpacity(1);
        // Title fades after 2.4s
        setTimeout(() => {
          setTitleOpacity(0);
          setTimeout(() => setShowTitle(false), 900);
        }, 2400);
      }, 600);
    }, 2000);
    return () => clearTimeout(loadTimer);
  }, []);

  // Initialize audio on first interaction
  useEffect(() => {
    const handleClick = () => {
      initialize();
      window.removeEventListener('click', handleClick);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [initialize]);

  // Game over listener — save high score
  useEffect(() => {
    const handleGameOver = () => {
      const state = useLevelStore.getState();
      const seed = useSeedStore.getState().lastSeedUsed;
      const stats = { peakCoherence: state.peakCoherence, levelsSurvived: state.currentLevel };
      setRunStats(stats);

      // Save high score if better
      const current = loadHighScore();
      if (stats.peakCoherence > current.peakCoherence || stats.levelsSurvived > current.levelsSurvived) {
        const newHigh = { ...stats, seed };
        saveHighScore(newHigh);
        setHighScore(newHigh);
      }

      setShowGameOver(true);
      setGameOverOpacity(1);
      setSrAnnouncement('Cognition shattered. The sphere has broken.');
    };
    window.addEventListener('gameOver', handleGameOver);
    return () => window.removeEventListener('gameOver', handleGameOver);
  }, []);

  // Moment of clarity listener
  useEffect(() => {
    const handleClarity = () => {
      setShowClarity(true);
      setClarityOpacity(1);
      setSrAnnouncement('Coherence maintained. A moment of clarity.');
      const fadeTimer = setTimeout(() => {
        setClarityOpacity(0);
        setTimeout(() => setShowClarity(false), 900);
      }, 2000);
      return () => clearTimeout(fadeTimer);
    };
    window.addEventListener('coherenceMaintained', handleClarity);
    return () => window.removeEventListener('coherenceMaintained', handleClarity);
  }, []);

  // Sync tension to audio store + screen reader announcements
  useEffect(() => {
    useAudioStore.getState().updateTension(tension);
    // Announce tension changes at 10% increments
    const tensionPct = Math.round(tension * 10) * 10;
    if (tensionPct !== lastAnnouncedTension.current && tensionPct > 0) {
      lastAnnouncedTension.current = tensionPct;
      setSrAnnouncement(`Tension at ${tensionPct} percent`);
    }
  }, [tension]);

  // Expose Zustand stores on window for E2E test bridge
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
          className="absolute inset-0 z-40 flex items-center justify-center bg-black transition-opacity duration-600"
          style={{ opacity: loadingOpacity }}
        >
          <h1 className="font-mono text-[32px] tracking-[16px] text-white/60 animate-pulse">INITIALIZING CORE</h1>
        </div>
      )}

      {/* Opening Title Sizzle */}
      {showTitle && (
        <div
          data-testid="title-overlay"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 transition-opacity duration-900"
          style={{ opacity: titleOpacity }}
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
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-900"
          style={{ opacity: clarityOpacity }}
        >
          <h1 className="font-mono text-[48px] tracking-[8px] text-blue-400/80">COHERENCE MAINTAINED</h1>
        </div>
      )}

      {/* Game Over — Symmetric Static Close */}
      {showGameOver && (
        <div
          data-testid="gameover-overlay"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 transition-opacity duration-1200 cursor-pointer"
          style={{ opacity: gameOverOpacity }}
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
        <GameScene coherence={coherence} />
      </div>
    </div>
  );
}
