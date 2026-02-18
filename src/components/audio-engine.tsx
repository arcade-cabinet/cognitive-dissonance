'use client';

import { useEffect } from 'react';
import { useAudioStore } from '@/store/audio-store';
import { useLevelStore } from '@/store/level-store';

export default function AudioEngineSystem() {
  const _initialize = useAudioStore((s) => s.initialize);
  const updateTension = useAudioStore((s) => s.updateTension);
  const shutdown = useAudioStore((s) => s.shutdown);

  useEffect(() => {
    // Audio init deferred until user interaction (handled in gameboard)
    return () => {
      shutdown();
    };
  }, [shutdown]);

  // Sync tension from game state to audio
  useEffect(() => {
    const unsub = useLevelStore.subscribe((state) => {
      updateTension(state.tension);
    });
    return unsub;
  }, [updateTension]);

  return null;
}
