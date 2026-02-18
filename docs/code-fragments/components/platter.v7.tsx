// components/platter.tsx
"use client"

import React, { useRef, useEffect } from 'react';
import { TransformNode, Cylinder, Box, useBeforeRender, useScene } from 'reactylon';
import * as BABYLON from 'babylonjs';
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(MorphSVGPlugin, CustomEase);

// Advanced mechanical eases
CustomEase.create("heavyMechanical", "M0,0 C0.05,0 0.18,0.12 0.35,0.68 C0.52,0.95 0.72,1 1,1");

interface PlatterProps {
  tension: number;
  onPlayPress: () => void;
  onContinuePress: () => void;
  onPausePress: () => void;
}

export function Platter({ tension, onPlayPress, onContinuePress, onPausePress }: PlatterProps) {
  const scene = useScene();

  const platterRef = useRef<BABYLON.TransformNode>(null);
  const playKeycapRef = useRef<BABYLON.Mesh>(null);

  // SVG overlay for keycap symbol (MorphSVG works on SVG)
  const keycapSymbolRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // MorphSVG for Play → Pause on press
    const morphPlayToPause = () => {
      gsap.to(keycapSymbolRef.current?.querySelector('#playPath') as any, {
        morphSVG: "#pausePath",
        duration: 0.45,
        ease: "power2.inOut"
      });
    };

    const morphPauseToPlay = () => {
      gsap.to(keycapSymbolRef.current?.querySelector('#pausePath') as any, {
        morphSVG: "#playPath",
        duration: 0.45,
        ease: "power2.inOut"
      });
    };

    // Attach to click
    const keycapElement = playKeycapRef.current;
    if (keycapElement) {
      keycapElement.onPointerDown = () => {
        onPlayPress();
        morphPlayToPause();
      };
    }
  }, []);

  // Garage door + other animations (from previous refined version)
  const openGarageDoor = (type: 'play' | 'continue') => {
    // ... your existing refined garage door code with heavyMechanical, stagger, dust, etc.
  };

  return (
    <TransformNode ref={platterRef} name="platterRoot" positionY={-1.6}>
      {/* All your existing platter geometry (base, rim, track, etc.) */}

      {/* Play Key with MorphSVG Symbol */}
      <TransformNode position={new BABYLON.Vector3(-0.58, 0, -0.35)} rotationY={-1.05}>
        <Box ref={playKeycapRef} name="playKeycap" width={0.09} height={0.06} depth={0.09} positionY={0.05} onPointerDown={onPlayPress}>
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.2, 1.0, 0.4)} />
        </Box>

        {/* SVG Overlay for MorphSVG (placed as HTML overlay or as texture if needed) */}
        <foreignObject x="-0.045" y="0.02" width="0.09" height="0.06">
          <svg ref={keycapSymbolRef} width="100%" height="100%" viewBox="0 0 24 24" fill="none">
            <path id="playPath" d="M8 5v14l11-7z" fill="#00ccff" />
            <path id="pausePath" d="M6 4h4v16H6zM14 4h4v16h-4z" fill="#00ccff" style={{ display: 'none' }} />
          </svg>
        </foreignObject>
      </TransformNode>

      {/* Rest of your platter (rim, track, lever, decorative keys, etc.) */}
    </TransformNode>
  );
}