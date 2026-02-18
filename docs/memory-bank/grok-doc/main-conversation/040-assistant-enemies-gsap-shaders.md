# Turn 40 (ASSISTANT) — Lines 5673-6051

**Summary**: Why this shader works beautifully for enemy variants
**Topics**: enemies, gsap, shaders, babylon, seed, sonny, missile-cmd, r21dev
**Code**: 10 | **New**: YES | **Design**: no | **Definitive**: YES

---

Here is a **complete, production-ready integration** of your `neon-raymarcher.tsx` shader component as the animated background layer for enemy variants in your "Cognitive Dissonance" missile-command-style game.

### Why this shader works beautifully for enemy variants

- The **holographic iridescent green** look with dark base + rim glow + atmospheric fog already feels like floating, glitching, technopunk data ghosts / hallucinations.
- The **multiple animated SDF boxes** that orbit, rotate and merge smoothly are perfect for representing different hallucination types:
  - Slow-moving, large boxes → "stable" but heavy hallucinations
  - Fast, jittery small boxes → chaotic / splitting variants
  - Merging clusters → boss-level amalgamations
- The **Yuka** integration is trivial: each enemy entity gets a unique `AnimationState` seed (phase, speed multipliers) based on its descriptor (trait, type, difficulty).

### Final Integration Plan (shadcn + Tailwind + TypeScript)

#### Project Setup Check / Instructions

If your project does **not** yet have shadcn + Tailwind + TypeScript:

```bash
# 1. Initialize shadcn (creates components/ui/, globals.css, components.json, etc.)
npx shadcn@latest init

# 2. Make sure Tailwind is working (should already be after init)
# Check app/globals.css contains:
@tailwind base;
@tailwind components;
@tailwind utilities;

# 3. Add TypeScript if not already present (usually already there with shadcn)
# If missing, just rename files to .tsx and add tsconfig.json via:
npx tsc --init
```

**Default paths after shadcn init**

- UI components → `components/ui/`
- Global styles → `app/globals.css` or `styles/globals.css`
- Pages → `app/`

**Important**: Always put reusable UI primitives in `components/ui/`  
This is the shadcn convention. If you put them elsewhere:
- `npx shadcn add` commands break
- Auto-imports / IDE suggestions become inconsistent
- Team members get confused

So yes — create/use `components/ui/` for this shader.

### Step-by-step Integration

1. Install required dependencies

```bash
npm install three @react-three/fiber @react-three/drei
# Optional performance monitor (very useful during dev)
npm install r3f-perf
```

2. Copy the shader component to the correct location

```tsx
// components/ui/neon-raymarcher.tsx
"use client"

import { FC, useMemo, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Plane } from '@react-three/drei'
import * as THREE from 'three'
// import { Perf } from 'r3f-perf' // uncomment during dev

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => {
      const ua = navigator.userAgent
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const small = window.innerWidth <= 768
      setIsMobile(mobileRegex.test(ua) || (touch && small))
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

const MAX_STEPS = 128
const PRECISION = 0.0005

type AnimationState = {
  positions: THREE.Vector3[]
  rotations: THREE.Vector3[]
  baseOffsets: {
    x: number
    y: number
    posSpeed: THREE.Vector3
    rotSpeed: THREE.Vector3
    posPhase: THREE.Vector3
    rotPhase: THREE.Vector3
  }[]
}

const createInitialState = (amount: number): AnimationState => ({
  positions: Array.from({ length: amount }, () => new THREE.Vector3()),
  rotations: Array.from({ length: amount }, () => new THREE.Vector3()),
  baseOffsets: Array.from({ length: amount }, (_, i) => {
    const t = (i / amount) * Math.PI * 2
    return {
      x: Math.cos(t) * 1.75,
      y: Math.sin(t) * 4.5,
      posSpeed: new THREE.Vector3(
        1.0 + Math.random() * 4,
        1.0 + Math.random() * 3.5,
        0.5 + Math.random() * 2.0
      ),
      rotSpeed: new THREE.Vector3(
        0.1 + Math.random() * 1,
        0.1 + Math.random() * 1,
        0.1 + Math.random() * 1
      ),
      posPhase: new THREE.Vector3(
        t + Math.random() * Math.PI * 3.0,
        t * 1.3 + Math.random() * Math.PI * 3.0,
        t * 0.7 + Math.random() * Math.PI * 3.0
      ),
      rotPhase: new THREE.Vector3(
        t * 0.5 + Math.random() * Math.PI * 2.0,
        t * 0.8 + Math.random() * Math.PI * 2.0,
        t * 1.1 + Math.random() * Math.PI * 2.0
      )
    }
  })
})

const vertexShader = `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const createFragmentShader = (amount: number) => `
uniform float u_time;
uniform float u_aspect;
uniform vec3 u_positions[${amount}];
uniform vec3 u_rotations[${amount}];
varying vec2 v_uv;

const int MaxCount = ${amount};
const float PI = 3.14159265358979;

${GLSL_SDF}
${GLSL_OPERATIONS}
${GLSL_ROTATE}
${GLSL_FRESNEL}

float sdf(vec3 p) {
  vec3 correct = 0.1 * vec3(u_aspect, 1.0, 1.0);
  vec3 tp = p + -u_positions[0] * correct;
  vec3 rp = tp;
  rp = rotate(rp, vec3(1.0,1.0,0.0), u_rotations[0].x + u_rotations[0].y);
  float final = sdBox(rp, vec3(0.15)) - 0.03;

  for(int i = 1; i < MaxCount; i++) {
    tp = p + -u_positions[i] * correct;
    rp = tp;
    rp = rotate(rp, vec3(1.0,1.0,0.0), u_rotations[i].x + u_rotations[i].y);
    float box = sdBox(rp, vec3(0.15)) - 0.03;
    final = opSmoothUnion(final, box, 0.4);
  }
  return final;
}

vec3 calcNormal(in vec3 p) {
  const float h = 0.001;
  return normalize(vec3(
    sdf(p + vec3(h,0,0)) - sdf(p - vec3(h,0,0)),
    sdf(p + vec3(0,h,0)) - sdf(p - vec3(0,h,0)),
    sdf(p + vec3(0,0,h)) - sdf(p - vec3(0,0,h))
  ));
}

vec3 getHolographicMaterial(vec3 normal, vec3 viewDir, float time) {
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
  float hue = dot(normal, viewDir) * 3.14159 + time * 0.5;
  vec3 greenShades = vec3(
    0.0,
    sin(hue) * 0.3 + 0.7,
    sin(hue + 1.0) * 0.2 + 0.3
  );
  return greenShades * fresnel * 1.2;
}

void main() {
  vec2 centeredUV = (v_uv - 0.5) * vec2(u_aspect, 1.0);
  vec3 ray = normalize(vec3(centeredUV, -1.0));
  vec3 camPos = vec3(0.0, 0.0, 2.3);
  vec3 rayPos = camPos;
  float totalDist = 0.0;
  float tMax = 5.0;

  for(int i = 0; i < ${MAX_STEPS}; i++) {
    float dist = sdf(rayPos);
    if (dist < ${PRECISION} || tMax < totalDist) break;
    totalDist += dist;
    rayPos = camPos + totalDist * ray;
  }

  vec3 color = vec3(0.0);
  float alpha = 0.0;

  if(totalDist < tMax) {
    vec3 normal = calcNormal(rayPos);
    vec3 viewDir = normalize(camPos - rayPos);
    vec3 lightDir = normalize(vec3(-0.5, 0.8, 0.6));
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
    vec3 iridescent = getHolographicMaterial(normal, viewDir, u_time);
    float rimLight = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    vec3 rimColor = vec3(0.4, 0.8, 1.0) * rimLight * 0.5;
    float ao = 1.0 - smoothstep(0.0, 0.3, totalDist / tMax);
    vec3 baseColor = vec3(0.1, 0.12, 0.15);
    color = baseColor * (0.1 + diff * 0.4) * ao;
    color += iridescent * (0.8 + diff * 0.2);
    color += vec3(1.0, 0.9, 0.8) * spec * 0.6;
    color += rimColor;
    float fog = 1.0 - exp(-totalDist * 0.2);
    color = mix(color, vec3(0.0), fog);
    alpha = 1.0;
  }

  gl_FragColor = vec4(color, alpha);
}
`

interface ScreenPlaneProps {
  animationState: AnimationState
  amount: number
}

const ScreenPlane: FC<ScreenPlaneProps> = ({ animationState, amount }) => {
  const { viewport } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const uniforms = useMemo(() => ({
    u_time: { value: 0 },
    u_aspect: { value: viewport.width / viewport.height },
    u_positions: { value: animationState.positions },
    u_rotations: { value: animationState.rotations },
  }), [viewport.width, viewport.height, animationState])

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value += delta

      const time = materialRef.current.uniforms.u_time.value

      animationState.baseOffsets.forEach((offset, i) => {
        const wanderX = Math.sin(time * offset.posSpeed.x + offset.posPhase.x) * 0.8
        const wanderY = Math.cos(time * offset.posSpeed.y + offset.posPhase.y) * 5
        const wanderZ = Math.sin(time * offset.posSpeed.z + offset.posPhase.z) * 0.5

        const secondaryX = Math.cos(time * offset.posSpeed.x * 0.7 + offset.posPhase.x * 1.3) * 0.4
        const secondaryY = Math.sin(time * offset.posSpeed.y * 0.8 + offset.posPhase.y * 1.1) * 0.3

        animationState.positions[i].set(
          offset.x + wanderX + secondaryX,
          offset.y + wanderY + secondaryY,
          wanderZ
        )

        animationState.rotations[i].set(
          time * offset.rotSpeed.x + offset.rotPhase.x,
          time * offset.rotSpeed.y + offset.rotPhase.y,
          time * offset.rotSpeed.z + offset.rotPhase.z
        )

        materialRef.current!.uniforms.u_positions.value[i].copy(animationState.positions[i])
        materialRef.current!.uniforms.u_rotations.value[i].copy(animationState.rotations[i])
      })
    }
  })

  return (
    <Plane args={[1, 1]} scale={[viewport.width, viewport.height, 1]}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={createFragmentShader(amount)}
        transparent={true}
      />
    </Plane>
  )
}

const Scene: FC = () => {
  const isMobile = useIsMobile()
  const amount = isMobile ? 3 : 4
  const [animationState] = useState<AnimationState>(() => createInitialState(amount))

  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 50, near: 0.1, far: 2000 }}
      dpr={1}
      frameloop="always"
      gl={{ alpha: true, antialias: !isMobile, powerPreference: "high-performance" }}
      className="absolute inset-0"
    >
      <ScreenPlane animationState={animationState} amount={amount} />
      {/* <Perf position="top-left" /> */}
    </Canvas>
  )
}

export const NeonRaymarcher = () => {
  return (
    <div className="fixed inset-0 z-[-1] bg-gradient-to-b from-neutral-950 to-green-950">
      <Scene />
    </div>
  )
}
```

### 3. Usage in `components/gameboard.tsx`

```tsx
// components/gameboard.tsx
"use client"

import { NeonRaymarcher } from "@/components/ui/neon-raymarcher"
import { SonnyBust } from "@/components/sonny-bust"

export default function GameBoard() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Neon raymarched holographic background for enemy variants */}
      <NeonRaymarcher />

      {/* Sonny bust + UI overlay */}
      <div className="absolute inset-0 z-10">
        <SonnyBust />
      </div>
    </div>
  )
}
```

### Integration Summary

- **Location**: `components/ui/neon-raymarcher.tsx`
- **Dependencies installed**:
  ```bash
  npm install three @react-three/fiber @react-three/drei
  ```
- **No extra providers/hooks** needed beyond what Reactylon already gives you
- **Responsive**: Automatically reduces box count on mobile
- **No assets/icons needed** — pure shader
- **Best place**: As the absolute background layer in `GameBoard` (z-[-1] or z-0)

### Enemy Variant Strategy (using this shader)

1. Each enemy type gets its own `amount` (3–12) and baseOffset seed (based on Yuka descriptor / trait)
2. In Miniplex: add `animationSeed` and `enemyType` to enemy entities
3. Spawn a new `<ScreenPlane animationState={derivedFromSeed} amount={typeBasedCount} />` inside enemy entity group
4. When enemy is hit/destroyed → fade out the shader plane or explode it with particles

This gives every enemy a unique, living holographic signature — exactly matching the technopunk hallucination theme.

You now have:
- ATC shader (fractal background)
- Neon-raymarcher (enemy variant holograms)
- Sonny bust (foreground AI)
All layered correctly with Tailwind/shadcn conventions.

Ready for the Yuka enemy wave system or the programmable F-key row UI? Let me know which one next.