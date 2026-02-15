import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Game from './components/Game';
import Landing from './components/Landing';
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
        console.log('Capacitor platform initialized');
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
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#0a0a18',
          color: '#f1c40f',
          fontFamily: "'Space Mono', monospace",
          fontSize: '1.5rem',
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/game" element={<Game />} />
        <Route path="/psyduck-panic" element={<Game />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
