import { WorldProvider } from 'koota/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import GameBoard from '@/components/gameboard';
import { world } from '@/sim/world';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root element not found in index.html');

createRoot(container).render(
  <StrictMode>
    <WorldProvider world={world}>
      <GameBoard />
    </WorldProvider>
  </StrictMode>,
);
