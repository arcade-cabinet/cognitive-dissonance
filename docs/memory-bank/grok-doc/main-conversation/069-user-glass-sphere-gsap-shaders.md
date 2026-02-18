# Turn 69 (USER) — Lines 9470-9722

**Summary**: I may have something here:
**Topics**: glass-sphere, gsap, shaders, seed, csp
**Code**: 0 | **New**: no | **Design**: no | **Definitive**: no

---

I may have something here:
import React, { useRef, useEffect, memo } from 'react';
import * as THREE from 'three';
// --- GLSL Shaders ---
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform float u_time;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform float u_cloud_density;
  uniform float u_glow_intensity;
  float random(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898,78.233,151.7182))) * 43758.5453);
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f*f*(3.0 - 2.0*f);
    return mix(
      mix(mix(random(i+vec3(0,0,0)), random(i+vec3(1,0,0)), u.x),
          mix(random(i+vec3(0,1,0)), random(i+vec3(1,1,0)), u.x), u.y),
      mix(mix(random(i+vec3(0,0,1)), random(i+vec3(1,0,1)), u.x),
          mix(random(i+vec3(0,1,1)), random(i+vec3(1,1,1)), u.x), u.y),
      u.z
    );
  }
  float fbm(vec3 p) {
    float v = 0.0, amp = 0.5;
    for (int i = 0; i < 6; i++) {
      v += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return v;
  }
  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float d = 1.0 - dot(uv, uv);
    if (d < 0.0) discard;
    // map UV onto sphere
    vec3 pos = vec3(uv, sqrt(d));
    // cloud / nebula
    vec3 coord = pos * u_cloud_density + u_time * 0.1;
    float c = fbm(coord);
    vec3 nebula = mix(u_color1, u_color2, smoothstep(0.4, 0.6, c));
    // Fresnel rim glow
    float fresnel = pow(1.0 - dot(normalize(pos), vec3(0,0,1)), 2.0)
                    * u_glow_intensity;
    vec3 glow = fresnel * u_color2;
    gl_FragColor = vec4(nebula + glow, 1.0);
  }
`;
export interface ShaderCanvasProps {
  color1?: THREE.Color | string | number;
  color2?: THREE.Color | string | number;
  cloudDensity?: number;
  glowIntensity?: number;
  rotationSpeed?: number;
}
const ShaderCanvas: React.FC<ShaderCanvasProps> = memo(({
  color1 = 0xff4444,
  color2 = 0x4444ff,
  cloudDensity = 2.0,
  glowIntensity = 1.0,
  rotationSpeed = 0.5,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const threeRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    uniforms?: {
      u_time: { value: number };
      u_color1: { value: THREE.Color };
      u_color2: { value: THREE.Color };
      u_cloud_density: { value: number };
      u_glow_intensity: { value: number };
    };
    sphere?: THREE.Mesh;
    clock?: THREE.Clock;
  }>({});
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    // 1. Scene + Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 1;
    // 2. Renderer (no alpha → we get a visible background color)
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1); // BLACK background
    container.appendChild(renderer.domElement);
    // 3. Uniforms
    const uniforms = {
      u_time: { value: 0.0 },
      u_color1: { value: new THREE.Color(color1) },
      u_color2: { value: new THREE.Color(color2) },
      u_cloud_density: { value: cloudDensity },
      u_glow_intensity: { value: glowIntensity },
    };
    // 4. Sphere mesh with ShaderMaterial
    const geo = new THREE.SphereGeometry(0.6, 64, 64);
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: false, // ensure the black clearColor shows through
    });
    const sphere = new THREE.Mesh(geo, mat);
    scene.add(sphere);
    const clock = new THREE.Clock();
    threeRef.current = { renderer, scene, camera, uniforms, sphere, clock };
    // 5. Handle resize
    function onResize() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    }
    window.addEventListener('resize', onResize);
    onResize();
    // 6. Animation loop
    let raf: number;
    const loop = () => {
      const { clock, sphere } = threeRef.current;
      const delta = clock!.getDelta();
      sphere!.rotation.y += delta * rotationSpeed;
      uniforms.u_time.value = clock!.getElapsedTime();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    // 7. Cleanup
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [color1, color2, cloudDensity, glowIntensity, rotationSpeed]);
  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000', // fallback CSS background
      }}
    />
  );
});
export default ShaderCanvas;
 
 
 
See usage:
 
import React, { useState, useCallback } from 'react';
import ShaderCanvas from "@/components/ui/celestial-sphere-shader";
// --- Constants ---
const DEFAULT_PROPS = {
  color1: "#082f49", // Dark Blue
  color2: "#7dd3fc", // Light Blue
  rotationSpeed: 0.1,
  cloudDensity: 2.5,
  glowIntensity: 1.5,
};
const PRESETS = [
    { name: "Orion Nebula", settings: { color1: "#431478", color2: "#e879f9", rotationSpeed: 0.05, cloudDensity: 3.0, glowIntensity: 1.8 } },
    { name: "Crimson Gas Giant", settings: { color1: "#4a044e", color2: "#be123c", rotationSpeed: 0.15, cloudDensity: 2.0, glowIntensity: 1.2 } },
    { name: "Ice Planet", settings: { color1: "#ffffff", color2: "#67e8f9", rotationSpeed: 0.1, cloudDensity: 4.0, glowIntensity: 2.0 } },
];
// --- Main App Component ---
export default function DemoOne() {
  const [props, setProps] = useState(DEFAULT_PROPS);
  const applyPreset = useCallback((preset) => setProps(preset.settings), []);
  const handleValueChange = useCallback((propName, value) => {
    setProps(prev => ({ ...prev, [propName]: value }));
  }, []);
  const randomize = useCallback(() => {
    setProps({
        color1: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        color2: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        rotationSpeed: Math.random() * 0.4,
        cloudDensity: 1.0 + Math.random() * 4.0,
        glowIntensity: 0.5 + Math.random() * 2.5,
    });
  }, []);
 
  return (
    <div className="relative w-screen h-screen bg-black font-sans overflow-hidden">
      {/* Background starfield texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
     
      {/* The main shader component */}
      <ShaderCanvas {...props} />
      {/* UI Controls Panel */}
      <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-xl p-6 rounded-2xl text-white shadow-2xl w-96 border border-white/10">
        <h1 className="text-2xl font-bold mb-2 tracking-wide text-white/90">Celestial Sphere Controls</h1>
       
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label className="block mb-2 text-sm text-white/70">Nebula Color A</label>
                <input type="color" value={props.color1} onChange={(e) => handleValueChange('color1', e.target.value)} className="w-full h-10 p-1 bg-gray-800 border-white/20 rounded-md"/>
            </div>
            <div>
                <label className="block mb-2 text-sm text-white/70">Nebula Color B</label>
                <input type="color" value={props.color2} onChange={(e) => handleValueChange('color2', e.target.value)} className="w-full h-10 p-1 bg-gray-800 border-white/20 rounded-md"/>
            </div>
        </div>
        <div className="space-y-4">
          <div><label className="text-sm">Rotation Speed: {props.rotationSpeed.toFixed(2)}</label><input type="range" min="0.0" max="0.5" step="0.01" value={props.rotationSpeed} onChange={(e) => handleValueChange('rotationSpeed', parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-500"/></div>
          <div><label className="text-sm">Cloud Density: {props.cloudDensity.toFixed(2)}</label><input type="range" min="1.0" max="8.0" step="0.1" value={props.cloudDensity} onChange={(e) => handleValueChange('cloudDensity', parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-500"/></div>
          <div><label className="text-sm">Glow Intensity: {props.glowIntensity.toFixed(2)}</label><input type="range" min="0.0" max="3.0" step="0.01" value={props.glowIntensity} onChange={(e) => handleValueChange('glowIntensity', parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-500"/></div>
        </div>
       
        <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
            <div className="grid grid-cols-3 gap-2">
                {PRESETS.map(p => <button key={p.name} onClick={() => applyPreset(p)} className="px-3 py-2 text-xs bg-white/10 rounded-md hover:bg-white/20 transition-colors">{p.name}</button>)}
            </div>
             <div className="grid grid-cols-2 gap-2">
                <button onClick={randomize} className="px-3 py-2 text-sm bg-purple-500/20 text-purple-300 rounded-md hover:bg-purple-500/40 transition-colors">Randomize</button>
                <button onClick={() => setProps(DEFAULT_PROPS)} className="px-3 py-2 text-sm bg-indigo-500/20 text-indigo-300 rounded-md hover:bg-indigo-500/40 transition-colors">Reset</button>
            </div>
        </div>
      </div>
    </div>
  );
}