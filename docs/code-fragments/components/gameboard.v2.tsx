// components/gameboard.tsx
"use client"

import ATCShader from "@/components/ui/atc-shader"
import { AISphere } from "@/components/ai-sphere"
import { Platter } from "@/components/platter"
import { PatternStabilizer } from "@/components/pattern-stabilizer"
import { EnemySpawner } from "@/components/enemy-spawner"
import { PostProcessCorruption } from "@/components/post-process-corruption"
import { SpatialAudio } from "@/components/spatial-audio"
import { PhysicsKeys } from "@/components/physics-keys"
import { SPSEnemies } from "@/components/sps-enemies"
import { DiegeticGUI } from "@/components/diegetic-gui"
import { AudioEngine } from "@/components/audio-engine"
import { useState, useEffect } from "react"
import { useLevelStore } from "@/store/level-store"

export default function GameBoard() {
  const [showTitle, setShowTitle] = useState(true)
  const [titleOpacity, setTitleOpacity] = useState(1)
  const [showGameOver, setShowGameOver] = useState(false)
  const [gameOverOpacity, setGameOverOpacity] = useState(0)

  const { coherence } = useLevelStore()

  // Opening title sizzle
  useEffect(() => {
    const timer = setTimeout(() => {
      setTitleOpacity(0)
      setTimeout(() => setShowTitle(false), 900)
    }, 2400)
    return () => clearTimeout(timer)
  }, [])

  // Game over listener
  useEffect(() => {
    const handleGameOver = () => {
      setShowGameOver(true)
      setGameOverOpacity(1)
    }
    window.addEventListener('gameOver', handleGameOver)
    return () => window.removeEventListener('gameOver', handleGameOver)
  }, [])

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <ATCShader className="z-0" />

      {/* Opening Title */}
      {showTitle && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 transition-opacity duration-900" style={{ opacity: titleOpacity }}>
          <div className="text-center">
            <h1 className="font-mono text-[92px] tracking-[12px] text-white">COGNITIVE</h1>
            <h1 className="font-mono text-[92px] tracking-[12px] text-red-500 -mt-6">DISSONANCE</h1>
          </div>
        </div>
      )}

      {/* Game Over - Symmetric Static Close */}
      {showGameOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 transition-opacity duration-1200" style={{ opacity: gameOverOpacity }}>
          <div className="text-center">
            <h1 className="font-mono text-[92px] tracking-[12px] text-red-500">COGNITION</h1>
            <h1 className="font-mono text-[92px] tracking-[12px] text-white -mt-6">SHATTERED</h1>
            <div className="mt-12 text-white/60 font-mono text-2xl">The sphere has broken.</div>
            <div className="mt-8 text-white/40 font-mono text-sm">Press Play to dream again</div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-10">
        <AISphere />
        <PostProcessCorruption tension={tension} />
        <SpatialAudio tension={tension} />
        <PhysicsKeys />
        <SPSEnemies tension={tension} />
        <DiegeticGUI coherence={coherence} />
        <AudioEngine />
      </div>
    </div>
  )
}