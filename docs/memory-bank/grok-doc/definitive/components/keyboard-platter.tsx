// components/keyboard-platter.tsx
"use client"

import React from 'react';
import { TransformNode, Box } from 'reactylon';
import * as BABYLON from 'babylonjs';

export function KeyboardPlatter({ tension, onHoldChange }: { 
  tension: number; 
  onHoldChange: (index: number, isHeld: boolean) => void 
}) {
  return (
    <TransformNode name="keyboardPlatter" positionY={-1.1}>
      {Array.from({ length: 13 }, (_, i) => {
        const angle = (i - 6) * 0.175;
        return (
          <TransformNode key={i} position={new BABYLON.Vector3(Math.sin(angle) * 0.58, 0, Math.cos(angle) * 0.58 - 0.35)} rotationY={angle}>
            <Box 
              name={`keyBody${i}`} 
              width={0.11} 
              height={0.08} 
              depth={0.11}
              onPointerDown={() => onHoldChange(i, true)}
              onPointerUp={() => onHoldChange(i, false)}
            >
              <StandardMaterial 
                diffuseColor={new BABYLON.Color3(0.25,0.25,0.28)}
                emissiveColor={new BABYLON.Color3(0.4,0.7,1.0).scale(tension * 0.8 + 0.2)}
              />
            </Box>
          </TransformNode>
        );
      })}
    </TransformNode>
  );
}