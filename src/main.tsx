import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import GameBoard from '@/components/gameboard';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root element not found in index.html');

createRoot(container).render(
  <StrictMode>
    <GameBoard />
  </StrictMode>,
);
