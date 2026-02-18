'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import ATCShader from '@/components/ui/atc-shader';
import { useAudioStore } from '@/store/audio-store';
import { useGameStore } from '@/store/game-store';
import { useLevelStore } from '@/store/level-store';
import { useSeedStore } from '@/store/seed-store';

const GameScene = dynamic(() => import('@/components/game-scene'), { ssr: false });

export default function GameBoard() {
  const [showTitle, setShowTitle] = useState(true);
  const [titleOpacity, setTitleOpacity] = useState(1);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverOpacity, setGameOverOpacity] = useState(0);

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
  }, []);

  // Opening title sizzle
  useEffect(() => {
    const timer = setTimeout(() => {
      setTitleOpacity(0);
      setTimeout(() => setShowTitle(false), 900);
    }, 2400);
    return () => clearTimeout(timer);
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

  // Game over listener
  useEffect(() => {
    const handleGameOver = () => {
      setShowGameOver(true);
      setGameOverOpacity(1);
    };
    window.addEventListener('gameOver', handleGameOver);
    return () => window.removeEventListener('gameOver', handleGameOver);
  }, []);

  // Sync tension to audio store
  useEffect(() => {
    useAudioStore.getState().updateTension(tension);
  }, [tension]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* ATC Shader Background */}
      <ATCShader className="z-0" />

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

      {/* Game Over — Symmetric Static Close (click to restart) */}
      {showGameOver && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 transition-opacity duration-1200 cursor-pointer"
          style={{ opacity: gameOverOpacity }}
          onClick={handleRestart}
        >
          <div className="text-center">
            <h1 className="font-mono text-[92px] tracking-[12px] text-red-500">COGNITION</h1>
            <h1 className="font-mono text-[92px] tracking-[12px] text-white -mt-6">SHATTERED</h1>
            <div className="mt-12 text-white/60 font-mono text-2xl">The sphere has broken.</div>
            <div className="mt-8 text-white/40 font-mono text-sm">Click anywhere to dream again</div>
          </div>
        </div>
      )}

      {/* 3D Game Layer */}
      <div className="absolute inset-0 z-10">
        <GameScene tension={tension} coherence={coherence} />
      </div>
    </div>
  );
}
