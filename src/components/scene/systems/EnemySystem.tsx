/**
 * Enemy Rendering System — Raymarched SDF Shapes
 *
 * Each cognitive distortion type has a distinct procedural SDF shape,
 * rendered via per-object raymarching on billboard quads:
 *
 *   DENIAL  (counter: reality) — Sphere with smooth-subtracted lid
 *     The thing that refuses to see. An orb closing itself off.
 *
 *   DELUSION (counter: history) — Octahedral crystal
 *     The thing that sees what isn't there. A refracting prism.
 *
 *   FALLACY (counter: logic) — Torus knot
 *     Logic that loops back on itself. An impossible ring.
 *
 * Material: Holographic iridescent with fresnel rim glow,
 * adapted from the neon-raymarcher SDF shader aesthetic.
 *
 * Encrypted enemies: dark opaque shell, no iridescence.
 * Uses miniplex ECS to iterate enemy entities.
 */

import { Billboard, Line, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ECS } from '../../../ecs/react';
import { enemies } from '../../../ecs/world';
import { CHARACTER_Y } from '../../../lib/constants';
import { gx, gy } from '../coordinates';

// ─── Shared Shader Code ─────────────────────────────────────

const VERTEX_SHADER = `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform float u_time;
uniform int u_shape; // 0=denial, 1=delusion, 2=fallacy
uniform vec3 u_color;
uniform float u_encrypted;

varying vec2 v_uv;

const int MAX_STEPS = 48;
const float MAX_DIST = 5.0;
const float SURF_DIST = 0.002;

// ── SDF Primitives ──

float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  float m = p.x + p.y + p.z - s;
  vec3 q;
  if (3.0 * p.x < m) q = p.xyz;
  else if (3.0 * p.y < m) q = p.yzx;
  else if (3.0 * p.z < m) q = p.zxy;
  else return m * 0.57735027;
  float k = clamp(0.5 * (q.z - q.y + s), 0.0, s);
  return length(vec3(q.x, q.y - s + k, q.z - k));
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

// ── SDF Operations ──

float opSmoothSubtraction(float d1, float d2, float k) {
  float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
  return mix(d2, -d1, h) + k * h * (1.0 - h);
}

// ── Rotation ──

mat3 rotY(float a) {
  float s = sin(a), c = cos(a);
  return mat3(c, 0, s, 0, 1, 0, -s, 0, c);
}

mat3 rotX(float a) {
  float s = sin(a), c = cos(a);
  return mat3(1, 0, 0, 0, c, -s, 0, s, c);
}

// ── Shape Selector ──

float getSDF(vec3 p) {
  // Animate rotation
  p = rotY(u_time * 0.8) * rotX(u_time * 0.3) * p;

  if (u_shape == 0) {
    // DENIAL: Sphere with lid closing over it
    float sphere = sdSphere(p, 0.7);
    float lid = p.y - 0.15;
    return opSmoothSubtraction(lid, sphere, 0.15);
  } else if (u_shape == 1) {
    // DELUSION: Octahedral crystal
    return sdOctahedron(p, 0.65);
  } else {
    // FALLACY: Twisted torus
    vec3 tp = rotX(u_time * 0.5) * p;
    return sdTorus(tp, vec2(0.45, 0.18));
  }
}

// ── Normal Calculation ──

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    getSDF(p + e.xyy) - getSDF(p - e.xyy),
    getSDF(p + e.yxy) - getSDF(p - e.yxy),
    getSDF(p + e.yyx) - getSDF(p - e.yyx)
  ));
}

// ── Holographic Material ──

vec3 getIridescence(vec3 normal, vec3 viewDir, float time, vec3 baseColor) {
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
  float hue = dot(normal, viewDir) * 3.14159 + time * 0.6;

  // Type-colored iridescence with hue variation
  vec3 iriColor = baseColor * (0.6 + sin(hue) * 0.4);
  iriColor += vec3(0.1, 0.2, 0.3) * sin(hue + 2.0) * 0.3;

  return iriColor * fresnel * 1.5;
}

// ── Raymarching ──

void main() {
  vec2 uv = (v_uv - 0.5) * 2.0;
  vec3 ro = vec3(0.0, 0.0, 2.0);
  vec3 rd = normalize(vec3(uv, -1.0));

  float totalDist = 0.0;
  vec3 rayPos = ro;

  for (int i = 0; i < MAX_STEPS; i++) {
    float dist = getSDF(rayPos);
    if (dist < SURF_DIST || totalDist > MAX_DIST) break;
    totalDist += dist;
    rayPos = ro + totalDist * rd;
  }

  if (totalDist >= MAX_DIST) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }

  vec3 normal = calcNormal(rayPos);
  vec3 viewDir = normalize(ro - rayPos);

  // Lighting
  vec3 lightDir = normalize(vec3(-0.4, 0.8, 0.6));
  float diff = max(dot(normal, lightDir), 0.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);

  // Rim lighting
  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

  vec3 color;

  if (u_encrypted > 0.5) {
    // Encrypted: dark metallic, no iridescence
    vec3 darkBase = vec3(0.12, 0.12, 0.15);
    color = darkBase * (0.3 + diff * 0.5);
    color += vec3(0.5) * spec * 0.3;
    color += vec3(0.2, 0.2, 0.25) * rim * 0.4;
  } else {
    // Holographic iridescent material
    vec3 iridescent = getIridescence(normal, viewDir, u_time, u_color);
    vec3 darkBase = vec3(0.05, 0.06, 0.08);
    color = darkBase * (0.15 + diff * 0.35);
    color += iridescent * (0.9 + diff * 0.1);
    color += vec3(1.0, 0.95, 0.9) * spec * 0.5;
    color += u_color * rim * 0.6;
  }

  // Atmospheric fog
  float fog = 1.0 - exp(-totalDist * 0.15);
  color = mix(color, vec3(0.0), fog);

  // Alpha: solid where shape exists, soft edge
  float alpha = smoothstep(MAX_DIST, MAX_DIST * 0.3, totalDist);

  gl_FragColor = vec4(color, alpha);
}
`;

// ─── Shape Index Mapping ────────────────────────────────────

function shapeToIndex(shape: string): number {
  switch (shape) {
    case 'denial':
      return 0;
    case 'delusion':
      return 1;
    case 'fallacy':
      return 2;
    default:
      return 0;
  }
}

function hexToVec3(hex: string): [number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

// ─── Main System ────────────────────────────────────────────

export function EnemySystem() {
  return (
    <ECS.Entities in={enemies}>
      {(entity) => <EnemyMesh key={entity.enemy.gameId} entity={entity} />}
    </ECS.Entities>
  );
}

// ─── Per-Entity Raymarched Mesh ─────────────────────────────

function EnemyMesh({ entity }: { entity: (typeof enemies.entities)[number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { position, enemy } = entity;
  const isEncrypted = enemy.encrypted;

  const [r, g, b] = hexToVec3(isEncrypted ? '#444444' : enemy.color);
  const shapeIdx = shapeToIndex(enemy.shape);
  const scale = enemy.variant === 'child' ? 0.5 : 0.8;

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_shape: { value: shapeIdx },
      u_color: { value: new THREE.Vector3(r, g, b) },
      u_encrypted: { value: isEncrypted ? 1.0 : 0.0 },
    }),
    [shapeIdx, r, g, b, isEncrypted]
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    // Smooth position update
    groupRef.current.position.x = gx(position.x);
    groupRef.current.position.y = gy(position.y);
    groupRef.current.position.z = position.z;

    // Gentle float bob
    groupRef.current.position.y += Math.sin(t * 2 + entity.enemy.gameId) * 0.02;

    // Update shader time
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = t + entity.enemy.gameId * 0.7;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Raymarched SDF shape on a billboard quad */}
      <Billboard>
        <mesh scale={[scale, scale, 1]}>
          <planeGeometry args={[1.2, 1.2]} />
          <shaderMaterial
            ref={materialRef}
            uniforms={uniforms}
            vertexShader={VERTEX_SHADER}
            fragmentShader={FRAGMENT_SHADER}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>

      {/* Point light for local glow */}
      <pointLight
        color={isEncrypted ? '#444444' : enemy.color}
        intensity={0.3}
        distance={1.5}
        decay={2}
      />

      {/* Word label */}
      {!isEncrypted && (
        <Billboard position={[0, -0.45 * (scale / 0.8), 0]}>
          <Text
            fontSize={0.06}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.005}
            outlineColor="black"
          >
            {enemy.word}
          </Text>
        </Billboard>
      )}

      {/* Encrypted indicator */}
      {isEncrypted && (
        <Billboard position={[0, 0, 0.01]}>
          <Text fontSize={0.2} color="#888888" anchorX="center" anchorY="middle">
            ?
          </Text>
        </Billboard>
      )}

      {/* Connection line to character */}
      {!isEncrypted && (
        <Line
          points={[
            [0, 0, 0],
            [-gx(position.x), -gy(position.y) + gy(CHARACTER_Y), 0],
          ]}
          color="white"
          lineWidth={0.5}
          transparent
          opacity={0.04}
          dashed
          dashSize={0.1}
          gapSize={0.15}
        />
      )}
    </group>
  );
}
