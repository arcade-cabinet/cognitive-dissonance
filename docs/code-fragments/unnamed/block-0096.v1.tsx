// store.ts (Zustand bridge optional)
import { create } from 'zustand';
export const useGameStore = create<{ tension: number; setTension: (v: number) => void }>((set) => ({
  tension: 0,
  setTension: (v) => set({ tension: v }),
}));

// Component
export function TensionEntityExample() {
  const { tension, setTension } = useGameStore();
  const scene = useScene();
  const entityRef = React.useRef<any>(null); // Miniplex entity

  React.useEffect(() => {
    const entity = world.create({ tension: 0 }); // Miniplex world
    entityRef.current = entity;

    const obs = scene.registerBeforeRender(() => {
      entity.tension = Math.sin(performance.now() / 500) * 50 + 50;
      setTension(entity.tension);
    });
    return () => { world.remove(entity); scene.unregisterBeforeRender(obs); };
  }, [scene]);

  return <div>Tension: {tension}</div>; // sibling reads via store
}