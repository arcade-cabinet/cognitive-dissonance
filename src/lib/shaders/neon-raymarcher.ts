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
uniform float u_amount;
uniform vec3 u_positions[16];
uniform float u_tension;

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0);
  return mix(d2, d1, h) - k*h*(1.0-h);
}
mat3 rotateY(float angle) {
  float s = sin(angle), c = cos(angle);
  return mat3(c,0,s, 0,1,0, -s,0,c);
}
mat3 rotateXZ(float a, float b) {
  float sa = sin(a), ca = cos(a), sb = sin(b), cb = cos(b);
  return mat3(cb,0,sb, sa*sb,ca,-sa*cb, -ca*sb,sa,ca*cb);
}
float map(vec3 p) {
  float d = 1e10;
  for(int i = 0; i < 16; i++) {
    if(float(i) >= u_amount) break;
    vec3 q = p - u_positions[i];
    q = rotateXZ(u_time * 0.5 + float(i), u_time * 0.3 + float(i) * 0.7) * q;
    float box = sdBox(q, vec3(0.15)) - 0.03;
    d = opSmoothUnion(d, box, 0.4);
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
vec3 getHolographic(vec3 p, vec3 n, vec3 viewDir, float t) {
  float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 2.0);
  float hue = dot(n, viewDir) * 3.14159 + t * 0.5;
  vec3 greenShades = vec3(0.0, sin(hue) * 0.3 + 0.7, sin(hue + 1.0) * 0.2 + 0.3);
  return greenShades * fresnel * 1.2;
}
void main() {
  vec2 uv = vUV * 2.0 - 1.0;
  vec3 ro = vec3(0, 0, 2.3);
  vec3 rd = normalize(vec3(uv, -1.0));
  float t = 0.0;
  for(int i = 0; i < 128; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);
    if(d < 0.0005 || t > 5.0) break;
    t += d;
  }
  vec3 color = vec3(0.0);
  float alpha = 0.0;
  if(t < 5.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    vec3 viewDir = normalize(ro - p);
    vec3 lightDir = normalize(vec3(-0.5, 0.8, 0.6));
    float diff = max(dot(n, lightDir), 0.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfDir), 0.0), 32.0);
    vec3 iridescent = getHolographic(p, n, viewDir, u_time);
    float rimLight = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    vec3 rimColor = vec3(0.4, 0.8, 1.0) * rimLight * 0.5;
    float ao = 1.0 - smoothstep(0.0, 0.3, t / 5.0);
    vec3 baseColor = vec3(0.1, 0.12, 0.15);
    color = baseColor * (0.1 + diff * 0.4) * ao;
    color += iridescent * (0.8 + diff * 0.2);
    color += vec3(1.0, 0.9, 0.8) * spec * 0.6;
    color += rimColor;
    float fog = 1.0 - exp(-t * 0.2);
    color = mix(color, vec3(0.0), fog);
    color *= (1.0 + u_tension * 0.5);
    alpha = 1.0;
  }
  gl_FragColor = vec4(color, alpha);
}
`;

export function createNeonRaymarcherMaterial(scene: BABYLON.Scene): BABYLON.ShaderMaterial {
  BABYLON.Effect.ShadersStore['neonVertexShader'] = VERTEX;
  BABYLON.Effect.ShadersStore['neonFragmentShader'] = FRAGMENT;

  const material = new BABYLON.ShaderMaterial(
    'neonRaymarcher',
    scene,
    { vertex: 'neon', fragment: 'neon' },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'u_time', 'u_amount', 'u_positions', 'u_tension'],
    },
  );

  material.setFloat('u_time', 0);
  material.setFloat('u_amount', 4);
  material.setFloat('u_tension', 0);
  material.needDepthPrePass = true;
  material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  material.backFaceCulling = false;

  return material;
}
