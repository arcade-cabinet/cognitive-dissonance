import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { initializePlatform } from './lib/capacitor-device';
import Game from './components/Game';
import Landing from './components/Landing';

function App() {
  const [platformReady, setPlatformReady] = useState(false);

  useEffect(() => {
    // Initialize Capacitor platform
    initializePlatform()
      .then(() => {
        setPlatformReady(true);
        console.log('Capacitor platform initialized');
      })
      .catch((error) => {
        console.warn('Platform initialization failed (web mode):', error);
        // Still allow web mode to work
        setPlatformReady(true);
      });
  }, []);

  if (!platformReady) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0a0a18',
        color: '#f1c40f',
        fontFamily: "'Space Mono', monospace",
        fontSize: '1.5rem',
      }}>
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
