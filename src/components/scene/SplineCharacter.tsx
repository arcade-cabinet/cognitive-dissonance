/**
 * Spline Character Bust — Photorealistic Base Layer
 *
 * Renders a Spline 3D scene as the character bust model.
 * This provides photorealistic quality for hair, skin, and fabric
 * that pure procedural Three.js can't match.
 *
 * Architecture:
 * - SplineCharacter renders in a separate canvas (Spline's own WebGL context)
 * - Positioned as a CSS layer BEHIND the main R3F canvas
 * - R3F canvas has transparent background so the Spline bust shows through
 * - Dynamic effects (sweat, crackling, tremor) are Three.js overlays in R3F
 *
 * To use: set SPLINE_BUST_URL to your Spline scene URL.
 * Create the bust in Spline: rear view, back of head with brown hair,
 * shoulders in a dark t-shirt, neck visible. Export as splinecode.
 */

import { lazy, Suspense } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

/**
 * Set this to your Spline scene URL once you've created the bust model.
 * The scene should show the back of a person's head and shoulders.
 *
 * To create:
 * 1. Open spline.design
 * 2. Model a bust: back of head with brown textured hair, shoulders in t-shirt
 * 3. Set camera behind/above, looking at the back of the head
 * 4. Publish and copy the scene URL
 */
export const SPLINE_BUST_URL: string | null = null;

interface SplineCharacterProps {
  className?: string;
}

export function SplineCharacter({ className }: SplineCharacterProps) {
  if (!SPLINE_BUST_URL) {
    // No Spline scene configured — falls through to the procedural Three.js bust
    return null;
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#666' }}>Loading bust...</span>
        </div>
      }
    >
      <Spline scene={SPLINE_BUST_URL} className={className} />
    </Suspense>
  );
}
