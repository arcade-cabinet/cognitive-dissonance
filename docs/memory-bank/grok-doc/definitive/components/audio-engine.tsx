// components/audio-engine.tsx
"use client"

import { useEffect } from 'react'
import { useAudioStore } from '@/store/audio-store'
import { useEntity } from 'miniplex-react'
import { world } from '@/game/world'

export function AudioEngine() {
  const { initialize, updateTension, shutdown } = useAudioStore()

  useEffect(() => {
    initialize()

    return () => shutdown()
  }, [initialize, shutdown])

  // Sync tension from any entity (sphere or global)
  useEffect(() => {
    const unsub = world.subscribe((entities) => {
      entities.forEach(e => {
        if (e.tension !== undefined) {
          updateTension(e.tension)
        }
      })
    })
    return unsub
  }, [updateTension])

  return null
}