import * as BABYLON from '@babylonjs/core';

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
uniform float u_complexity;
uniform float u_colorShift;
uniform float u_lightIntensity;
uniform float u_tension;

vec3 palette(float t) {
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 0.5);
  vec3 d = vec3(0.8, 0.9, 0.3);
  return a + b * cos(6.28318 * (c * t + d));
}
mat3 rotate(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle), c = cos(angle), oc = 1.0 - c;
  return mat3(
    oc*axis.x*axis.x+c, oc*axis.x*axis.y-axis.z*s, oc*axis.z*axis.x+axis.y*s,
    oc*axis.x*axis.y+axis.z*s, oc*axis.y*axis.y+c, oc*axis.y*axis.z-axis.x*s,
    oc*axis.z*axis.x-axis.y*s, oc*axis.y*axis.z+axis.x*s, oc*axis.z*axis.z+c
  );
}
float getDist(vec3 p) {
  p = rotate(normalize(vec3(1.0, 1.0, 1.0)), u_time * 0.2) * p;
  vec3 b = vec3(1.0);
  float box = length(max(abs(p) - b, 0.0));
  float displacement = sin(u_complexity * p.x) * sin(u_complexity * p.y) * sin(u_complexity * p.z);
  return box - displacement * 0.1;
}
vec3 getNormal(vec3 p) {
  vec2 e = vec2(0.001, 0);
  float d = getDist(p);
  return normalize(d - vec3(getDist(p-e.xyy), getDist(p-e.yxy), getDist(p-e.yyx)));
}
float rayMarch(vec3 ro, vec3 rd) {
  float dO = 0.0;
  for(int i = 0; i < 64; i++) {
    vec3 p = ro + rd * dO;
    float dS = getDist(p);
    dO += dS;
    if(dO > 100.0 || dS < 0.001) break;
  }
  return dO;
}
void main() {
  vec2 uv = (vUV - 0.5) * 2.0;
  vec3 ro = vec3(0, 0, -3.0);
  vec3 rd = normalize(vec3(uv, 1.0));
  float d = rayMarch(ro, rd);
  vec3 col = vec3(0);
  if (d < 100.0) {
    vec3 p = ro + rd * d;
    vec3 n = getNormal(p);
    vec3 lightPos = vec3(2.0, 2.0, -3.0);
    vec3 l = normalize(lightPos - p);
    float dif = clamp(dot(n, l), 0.0, 1.0);
    vec3 v = normalize(ro - p);
    vec3 h = normalize(l + v);
    float spec = pow(clamp(dot(n, h), 0.0, 1.0), 32.0);
    vec3 baseColor = palette(length(p) * 0.2 + u_time * u_colorShift);
    col = (dif * baseColor + spec * vec3(1.0)) * u_lightIntensity;
    col *= (1.0 + u_tension * 0.8);
  }
  col += palette(length(uv) * 0.5 - u_time * u_colorShift * 0.2) * 0.2;
  gl_FragColor = vec4(col, d < 100.0 ? 1.0 : 0.0);
}
`;

export function createCrystallineCubeMaterial(scene: BABYLON.Scene): BABYLON.ShaderMaterial {
  BABYLON.Effect.ShadersStore['crystallineVertexShader'] = VERTEX;
  BABYLON.Effect.ShadersStore['crystallineFragmentShader'] = FRAGMENT;

  const material = new BABYLON.ShaderMaterial(
    'crystallineCube',
    scene,
    { vertex: 'crystalline', fragment: 'crystalline' },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'u_time', 'u_complexity', 'u_colorShift', 'u_lightIntensity', 'u_tension'],
    },
  );

  material.setFloat('u_time', 0);
  material.setFloat('u_complexity', 4.0);
  material.setFloat('u_colorShift', 0.3);
  material.setFloat('u_lightIntensity', 1.5);
  material.setFloat('u_tension', 0);
  material.needDepthPrePass = true;
  material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  material.backFaceCulling = false;

  return material;
}
