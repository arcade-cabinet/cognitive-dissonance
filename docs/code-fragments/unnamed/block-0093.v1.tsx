'use client';
import * as BABYLON from '@babylonjs/core';
import React from 'react';
import { useScene } from 'reactylon';

const VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main() { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }
`;

const FRAGMENT = `
precision highp float;
varying vec2 vUV;
uniform float u_time;
uniform float u_amount;
uniform vec3 u_positions[16];
uniform mat4 u_rotations[16];
uniform float u_tension;

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
mat3 rotate(float angle, vec3 axis) {
  float s = sin(angle), c = cos(angle);
  float oc = 1.0 - c;
  return mat3(oc*axis.x*axis.x+c, oc*axis.x*axis.y-axis.z*s, oc*axis.x*axis.z+axis.y*s,
              oc*axis.y*axis.x+axis.z*s, oc*axis.y*axis.y+c, oc*axis.y*axis.z-axis.x*s,
              oc*axis.z*axis.x-axis.y*s, oc*axis.z*axis.y+axis.x*s, oc*axis.z*axis.z+c);
}
vec3 opSmoothUnion(vec3 a, vec3 b, float k) {
  float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}
float map(vec3 p) {
  float d = 1e10;
  for(int i=0; i<16; i++) {
    if(float(i) >= u_amount) break;
    vec3 q = p - u_positions[i];
    q = rotate(u_time*0.5 + float(i), vec3(0,1,0)) * q; // simplified rotation
    d = min(d, sdBox(q, vec3(0.2)));
  }
  return d;
}
vec3 calcNormal(vec3 p) {
  const float eps = 0.001;
  return normalize(vec3(
    map(p+vec3(eps,0,0)) - map(p-vec3(eps,0,0)),
    map(p+vec3(0,eps,0)) - map(p-vec3(0,eps,0)),
    map(p+vec3(0,0,eps)) - map(p-vec3(0,0,eps))
  ));
}
vec3 getHolographic(vec3 p, vec3 n, float fresnel) {
  return vec3(0.0, 1.0, 0.6) * (0.8 + 0.2*sin(u_time*10.0 + p.x*20.0)) * (1.0 + fresnel*2.0);
}
void main() {
  vec2 uv = vUV * 2.0 - 1.0;
  vec3 ro = vec3(0,0,-5);
  vec3 rd = normalize(vec3(uv,1.0));
  float t = 0.0;
  for(int i=0; i<100; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);
    if(d<0.001 || t>50.0) break;
    t += d;
  }
  if(t>50.0) { gl_FragColor = vec4(0.0); return; }
  vec3 p = ro + rd * t;
  vec3 n = calcNormal(p);
  float fresnel = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
  vec3 col = getHolographic(p, n, fresnel);
  gl_FragColor = vec4(col * (1.0 + u_tension*0.5), 0.95);
}
`;

interface Props {
  tension: number;
  amount: number;
}

export function NeonRaymarcherEnemy({ tension, amount }: Props) {
  const scene = useScene();
  const planeRef = React.useRef<BABYLON.Mesh>(null!);
  const materialRef = React.useRef<BABYLON.ShaderMaterial | null>(null);
  const positions = React.useRef<BABYLON.Vector3[]>(Array.from({ length: 16 }, () => new BABYLON.Vector3()));

  React.useEffect(() => {
    BABYLON.Effect.ShadersStore["neonVertexShader"] = VERTEX;
    BABYLON.Effect.ShadersStore["neonFragmentShader"] = FRAGMENT;

    const mat = new BABYLON.ShaderMaterial("neonRaymarch", scene, { vertex: "neon", fragment: "neon" }, {
      attributes: ["position", "uv"],
      uniforms: ["worldViewProjection", "u_time", "u_amount", "u_positions", "u_tension"],
    });
    materialRef.current = mat;

    const plane = BABYLON.MeshBuilder.CreatePlane("neonPlane", { size: 10 }, scene);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    plane.material = mat;
    planeRef.current = plane;

    return () => { plane.dispose(); mat.dispose(); };
  }, [scene]);

  React.useEffect(() => {
    if (!materialRef.current) return;
    const mat = materialRef.current;
    const observer = scene.registerBeforeRender(() => {
      mat.setFloat("u_time", performance.now() / 1000);
      mat.setFloat("u_amount", Math.min(amount, 16));
      mat.setFloat("u_tension", tension);

      // update positions (example orbiting)
      for (let i = 0; i < amount; i++) {
        const angle = (performance.now() / 1000 + i) * 1.5;
        positions.current[i].set(Math.sin(angle) * 1.5, Math.cos(angle * 0.7) * 1.2, 0);
      }
      mat.setVector3Array("u_positions", positions.current.slice(0, amount));
    });
    return () => scene.unregisterBeforeRender(observer);
  }, [scene, tension, amount]);

  return null; // mesh created imperatively
}