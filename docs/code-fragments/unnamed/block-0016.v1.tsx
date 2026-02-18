// App.tsx
import React, { useState } from 'react';
import { Engine, Scene, ... } from 'reactylon';
import SonnyBust from './SonnyBust';

export default function App() {
  const [tension, setTension] = useState(12);
  return (
    <Engine>
      <Scene>
        <SonnyBust tension={tension} />
      </Scene>
      <Slider value={tension} onValueChange={setTension} ... />
    </Engine>
  );
}