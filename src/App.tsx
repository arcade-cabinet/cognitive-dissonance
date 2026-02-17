import { useEffect, useState } from 'react';
import Game from './components/Game';
import LoadingScreen from './components/LoadingScreen';
import { initializePlatform } from './lib/capacitor-device';

function App() {
  const [platformReady, setPlatformReady] = useState(false);

  useEffect(() => {
    // Initialize Capacitor platform with timeout fallback
    const timeoutId = setTimeout(() => {
      console.warn('Platform initialization timeout - forcing ready state');
      setPlatformReady(true);
    }, 5000);

    initializePlatform()
      .then(() => {
        clearTimeout(timeoutId);
        setPlatformReady(true);
        console.info('Capacitor platform initialized');
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.warn('Platform initialization failed (web mode):', error);
        // Still allow web mode to work
        setPlatformReady(true);
      });

    return () => clearTimeout(timeoutId);
  }, []);

  if (!platformReady) {
    return <LoadingScreen />;
  }

  return <Game />;
}

export default App;
