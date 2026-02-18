// lib/shaders/celestial.ts
import * as BABYLON from '@babylonjs/core';

const VERTEX = `precision highp float; attribute vec3 position; attribute vec2 uv; uniform mat4 worldViewProjection; varying vec2 vUV; void main() { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;

const FRAGMENT = `precision highp float; varying vec2 vUV; uniform float u_time; uniform vec3 u_color1; uniform vec3 u_color2; uniform float u_cloud_density; uniform float u_glow_intensity; float random(vec3 p) { return fract(sin(dot(p, vec3(12.9898,78.233,151.7182))) * 43758.5453); } float noise(vec3 p) { /* full noise/fbm from original */ } float fbm(vec3 p) { /* full fbm */ } void main() { /* full original fragment */ }`;

export function createCelestialShaderMaterial(scene: BABYLON.Scene): BABYLON.ShaderMaterial {
  BABYLON.Effect.ShadersStore["celestialVertexShader"] = VERTEX;
  BABYLON.Effect.ShadersStore["celestialFragmentShader"] = FRAGMENT;

  const mat = new BABYLON.ShaderMaterial("celestial", scene, { vertex: "celestial", fragment: "celestial" }, {
    attributes: ["position", "uv"],
    uniforms: ["worldViewProjection", "u_time", "u_color1", "u_color2", "u_cloud_density", "u_glow_intensity"],
    storeEffectOnSubMeshes: true,
  });

  mat.setFloat("u_cloud_density", 4.5);
  mat.setFloat("u_glow_intensity", 1.2);
  mat.setColor3("u_color1", BABYLON.Color3.FromHexString("#4400ff"));
  mat.setColor3("u_color2", BABYLON.Color3.FromHexString("#00ffff"));
  mat.needDepthPrePass = true;
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  mat.alphaMode = BABYLON.Constants.ALPHA_ADD;
  mat.backFaceCulling = false;

  return mat;
}