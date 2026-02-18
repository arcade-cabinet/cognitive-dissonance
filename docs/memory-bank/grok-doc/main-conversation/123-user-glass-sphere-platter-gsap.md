# Turn 123 (USER) — Lines 17243-19054

**Summary**: You're getting confused. I have five NEW variants. Here I'll just paste them all.
**Topics**: glass-sphere, platter, gsap, shaders, babylon, tension, seed, controls, r21dev, csp
**Code**: 0 | **New**: no | **Design**: no | **Definitive**: no

---

You're getting confused. I have five NEW variants. Here I'll just paste them all.
 
1:
import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [keyPressed, setKeyPressed] = useState(false);
  const [leverActive, setLeverActive] = useState(false);
  const [tensionLevel, setTensionLevel] = useState(0); // 0-1
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    // Create scene
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.08, 1);
    // Camera - 3/4 view slightly above
    const camera = new BABYLON.ArcRotateCamera(
      'camera',
      Math.PI / 4,
      Math.PI / 3,
      8,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 15;
    // Lighting
    const hemiLight = new BABYLON.HemisphericLight(
      'hemiLight',
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    hemiLight.intensity = 0.3;
    const dirLight = new BABYLON.DirectionalLight(
      'dirLight',
      new BABYLON.Vector3(-1, -2, -1),
      scene
    );
    dirLight.intensity = 0.5;
    // Rim light for dramatic effect
    const rimLight = new BABYLON.PointLight(
      'rimLight',
      new BABYLON.Vector3(0, 2, 3),
      scene
    );
    rimLight.intensity = 2;
    rimLight.diffuse = new BABYLON.Color3(0.3, 0.5, 0.8);
    // === MAIN PLATTER ===
    const platter = BABYLON.MeshBuilder.CreateCylinder(
      'platter',
      { diameter: 4, height: 0.1, tessellation: 64 },
      scene
    );
    platter.position.y = 0.05;
    const platterMat = new BABYLON.PBRMetallicRoughnessMaterial('platterMat', scene);
    platterMat.baseColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    platterMat.metallic = 0.95;
    platterMat.roughness = 0.3;
    platter.material = platterMat;
    // === THICK RIM ===
    const rim = BABYLON.MeshBuilder.CreateTorus(
      'rim',
      { diameter: 4.2, thickness: 0.18, tessellation: 64 },
      scene
    );
    rim.position.y = 0.05;
    rim.rotation.x = Math.PI / 2;
    const rimMat = new BABYLON.PBRMetallicRoughnessMaterial('rimMat', scene);
    rimMat.baseColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    rimMat.metallic = 1.0;
    rimMat.roughness = 0.2;
    rimMat.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.6);
    (rimMat as any).emissiveIntensity = 0.3;
    rim.material = rimMat;
    // RGB glow animation
    let time = 0;
    scene.registerBeforeRender(() => {
      time += 0.01;
      const pulse = Math.sin(time) * 0.5 + 0.5;
      (rimMat as any).emissiveIntensity = 0.2 + pulse * 0.3;
    });
    // === CENTER TRACK (recessed) ===
    const track = BABYLON.MeshBuilder.CreateTorus(
      'track',
      { diameter: 1.1, thickness: 0.03, tessellation: 32 },
      scene
    );
    track.position.y = 0.02;
    track.rotation.x = Math.PI / 2;
    const trackMat = new BABYLON.StandardMaterial('trackMat', scene);
    trackMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    trackMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    track.material = trackMat;
    // === GLASS SPHERE with Nebula Shader ===
    const sphere = BABYLON.MeshBuilder.CreateSphere(
      'glassSphere',
      { diameter: 0.52, segments: 64 },
      scene
    );
    sphere.position.y = 0.31;
    const sphereMat = new BABYLON.PBRMetallicRoughnessMaterial('sphereMat', scene);
    sphereMat.baseColor = new BABYLON.Color3(0.95, 0.95, 1.0);
    sphereMat.metallic = 0;
    sphereMat.roughness = 0;
    sphereMat.alpha = 0.15;
    sphereMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    sphere.material = sphereMat;
    // Inner nebula effect
    const nebula = BABYLON.MeshBuilder.CreateSphere(
      'nebula',
      { diameter: 0.45, segments: 32 },
      scene
    );
    nebula.position = sphere.position.clone();
    const nebulaMat = new BABYLON.StandardMaterial('nebulaMat', scene);
    nebulaMat.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.8);
    nebulaMat.alpha = 0.6;
    nebula.material = nebulaMat;
    // Nebula animation based on tension
    scene.registerBeforeRender(() => {
      // Color transition: blue -> yellow/green -> red
      const r = Math.min(tensionLevel * 2, 1);
      const g = tensionLevel < 0.5 ? tensionLevel : 1 - tensionLevel;
      const b = 1 - tensionLevel;
     
      nebulaMat.emissiveColor = new BABYLON.Color3(r * 0.8, g * 0.6, b * 0.8);
     
      // Jitter increases with tension
      if (tensionLevel > 0.3) {
        const jitter = (tensionLevel - 0.3) * 0.02;
        nebula.position.x = sphere.position.x + (Math.random() - 0.5) * jitter;
        nebula.position.z = sphere.position.z + (Math.random() - 0.5) * jitter;
      } else {
        nebula.position.x = sphere.position.x;
        nebula.position.z = sphere.position.z;
      }
     
      // Rotation
      nebula.rotation.y += 0.005 + tensionLevel * 0.01;
      nebula.rotation.x += 0.003;
    });
    // === GARAGE DOOR PANELS (for key) ===
    const panelTopKey = BABYLON.MeshBuilder.CreateBox(
      'panelTopKey',
      { width: 0.15, height: 0.09, depth: 0.2 },
      scene
    );
    panelTopKey.position = new BABYLON.Vector3(2, 0.1, 0);
    const panelBottomKey = BABYLON.MeshBuilder.CreateBox(
      'panelBottomKey',
      { width: 0.15, height: 0.09, depth: 0.2 },
      scene
    );
    panelBottomKey.position = new BABYLON.Vector3(2, 0, 0);
    const panelMat = new BABYLON.PBRMetallicRoughnessMaterial('panelMat', scene);
    panelMat.baseColor = new BABYLON.Color3(0.03, 0.03, 0.03);
    panelMat.metallic = 1.0;
    panelMat.roughness = 0.3;
    panelTopKey.material = panelMat;
    panelBottomKey.material = panelMat;
    // === KEY RECESS ===
    const keyRecess = BABYLON.MeshBuilder.CreateBox(
      'keyRecess',
      { width: 0.15, height: 0.18, depth: 0.18 },
      scene
    );
    keyRecess.position = new BABYLON.Vector3(2, 0.05, 0);
    const recessMat = new BABYLON.StandardMaterial('recessMat', scene);
    recessMat.diffuseColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    recessMat.emissiveColor = keyPressed
      ? new BABYLON.Color3(0.2, 0.8, 1.6)
      : new BABYLON.Color3(0, 0, 0);
    keyRecess.material = recessMat;
    keyRecess.isVisible = false;
    // === KEYCAP ===
    const keycap = BABYLON.MeshBuilder.CreateBox(
      'keycap',
      { width: 0.12, height: 0.1, depth: 0.12 },
      scene
    );
    keycap.position = new BABYLON.Vector3(2, 0.05, 0);
    const keycapMat = new BABYLON.PBRMetallicRoughnessMaterial('keycapMat', scene);
    keycapMat.baseColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    keycapMat.metallic = 0.9;
    keycapMat.roughness = 0.2;
    keycapMat.emissiveColor = keyPressed
      ? new BABYLON.Color3(0.6, 1.8, 3.0)
      : new BABYLON.Color3(0.1, 0.3, 0.5);
    keycap.material = keycapMat;
    keycap.isVisible = false;
    // === LEVER SECTION ===
    const panelTopLever = BABYLON.MeshBuilder.CreateBox(
      'panelTopLever',
      { width: 0.15, height: 0.09, depth: 0.2 },
      scene
    );
    panelTopLever.position = new BABYLON.Vector3(-2, 0.1, 0);
    const panelBottomLever = BABYLON.MeshBuilder.CreateBox(
      'panelBottomLever',
      { width: 0.15, height: 0.09, depth: 0.2 },
      scene
    );
    panelBottomLever.position = new BABYLON.Vector3(-2, 0, 0);
    panelTopLever.material = panelMat;
    panelBottomLever.material = panelMat;
    // === LEVER RECESS ===
    const leverRecess = BABYLON.MeshBuilder.CreateBox(
      'leverRecess',
      { width: 0.15, height: 0.18, depth: 0.18 },
      scene
    );
    leverRecess.position = new BABYLON.Vector3(-2, 0.05, 0);
    const leverRecessMat = new BABYLON.StandardMaterial('leverRecessMat', scene);
    leverRecessMat.diffuseColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    leverRecessMat.emissiveColor = leverActive
      ? new BABYLON.Color3(0.2, 0.8, 1.6)
      : new BABYLON.Color3(0, 0, 0);
    leverRecess.material = leverRecessMat;
    leverRecess.isVisible = false;
    // === LEVER ===
    const lever = BABYLON.MeshBuilder.CreateCylinder(
      'lever',
      { diameter: 0.04, height: 0.15 },
      scene
    );
    lever.position = new BABYLON.Vector3(-2, 0.05, 0);
    lever.rotation.z = leverActive ? Math.PI / 4 : -Math.PI / 4;
    const leverMat = new BABYLON.PBRMetallicRoughnessMaterial('leverMat', scene);
    leverMat.baseColor = new BABYLON.Color3(0.8, 0.3, 0.1);
    leverMat.metallic = 0.8;
    leverMat.roughness = 0.3;
    leverMat.emissiveColor = leverActive
      ? new BABYLON.Color3(0.8, 0.3, 0.1)
      : new BABYLON.Color3(0.16, 0.06, 0.02);
    lever.material = leverMat;
    lever.isVisible = false;
    // Animations for key mechanism
    let keyAnimating = false;
    let keyProgress = 0;
    const animateKey = (open: boolean) => {
      if (keyAnimating) return;
      keyAnimating = true;
     
      const targetProgress = open ? 1 : 0;
      const animateStep = () => {
        const step = 0.03;
        if (Math.abs(keyProgress - targetProgress) > step) {
          keyProgress += open ? step : -step;
         
          // Garage door effect
          panelTopKey.position.y = 0.1 + keyProgress * 0.12;
          panelBottomKey.position.y = 0 - keyProgress * 0.12;
         
          // Show recess
          keyRecess.isVisible = keyProgress > 0.3;
          recessMat.emissiveColor = new BABYLON.Color3(
            0.1 * keyProgress * 2,
            0.4 * keyProgress * 2,
            0.8 * keyProgress * 2
          );
         
          // Emerge key
          keycap.isVisible = keyProgress > 0.5;
          keycap.position.x = 2 - 0.08 + keyProgress * 0.08;
         
          requestAnimationFrame(animateStep);
        } else {
          keyProgress = targetProgress;
          keyAnimating = false;
        }
      };
      animateStep();
    };
    // Animations for lever mechanism
    let leverAnimating = false;
    let leverProgress = 0;
    const animateLever = (open: boolean) => {
      if (leverAnimating) return;
      leverAnimating = true;
     
      const targetProgress = open ? 1 : 0;
      const animateStep = () => {
        const step = 0.03;
        if (Math.abs(leverProgress - targetProgress) > step) {
          leverProgress += open ? step : -step;
         
          // Garage door effect
          panelTopLever.position.y = 0.1 + leverProgress * 0.12;
          panelBottomLever.position.y = 0 - leverProgress * 0.12;
         
          // Show recess
          leverRecess.isVisible = leverProgress > 0.3;
          leverRecessMat.emissiveColor = new BABYLON.Color3(
            0.1 * leverProgress * 2,
            0.4 * leverProgress * 2,
            0.8 * leverProgress * 2
          );
         
          // Emerge lever
          lever.isVisible = leverProgress > 0.5;
          lever.position.x = -2 + 0.08 - leverProgress * 0.08;
         
          requestAnimationFrame(animateStep);
        } else {
          leverProgress = targetProgress;
          leverAnimating = false;
        }
      };
      animateStep();
    };
    // Platter rotation
    scene.registerBeforeRender(() => {
      platter.rotation.y += 0.002;
      rim.rotation.y += 0.002;
      track.rotation.y += 0.002;
    });
    // Initial reveal animations
    setTimeout(() => animateKey(true), 500);
    setTimeout(() => animateLever(true), 800);
    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });
    // Resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, [tensionLevel]);
  return (
    <div className="w-screen h-screen bg-[#0d0d12] relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none"
        style={{ touchAction: 'none' }}
      />
     
      {/* Control Panel */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 items-center bg-black/50 backdrop-blur-md rounded-lg p-4 border border-cyan-900/30">
        <button
          onClick={() => setKeyPressed(!keyPressed)}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            keyPressed
              ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50'
              : 'bg-gray-800 text-cyan-400 border border-cyan-700'
          }`}
        >
          {keyPressed ? '■ Stop' : '▶ Play'}
        </button>
       
        <button
          onClick={() => setLeverActive(!leverActive)}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            leverActive
              ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/50'
              : 'bg-gray-800 text-orange-400 border border-orange-700'
          }`}
        >
          {leverActive ? 'ON' : 'OFF'}
        </button>
       
        <div className="flex flex-col gap-2 min-w-[200px]">
          <label className="text-cyan-300 text-sm font-medium">
            Tension: {Math.round(tensionLevel * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={tensionLevel * 100}
            onChange={(e) => setTensionLevel(Number(e.target.value) / 100)}
            className="w-full accent-cyan-500"
          />
        </div>
      </div>
     
      {/* Info */}
      <div className="absolute top-8 left-8 text-cyan-300/60 text-sm font-mono">
        <p>Drag to rotate camera</p>
        <p>Scroll to zoom</p>
        <p>Industrial platter always stays flat on ground</p>
      </div>
    </div>
  );
}
export default App;
 
2:
import React, { useEffect, useRef, useState } from 'react';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, Color3, Color4, Mesh, PBRMaterial, Texture, CubeTexture, GlowLayer, Animation, PointLight, ShadowGenerator, DirectionalLight, ShaderMaterial, Effect } from '@babylonjs/core';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Play, Pause, RotateCw, Zap } from 'lucide-react';
interface IndustrialPlatterProps {
  rimThickness?: number;
  recessDepth?: number;
  glassTransparency?: number;
  rgbIntensity?: number;
}
const IndustrialPlatter: React.FC<IndustrialPlatterProps> = ({
  rimThickness = 0.18,
  recessDepth = 0.08,
  glassTransparency = 0.15,
  rgbIntensity = 2.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isLeverVisible, setIsLeverVisible] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const [tensionLevel, setTensionLevel] = useState(0);
  const sceneRef = useRef<Scene | null>(null);
  const meshesRef = useRef<{
    platter?: Mesh;
    keycap?: Mesh;
    lever?: Mesh;
    sphere?: Mesh;
    topRimKey?: Mesh;
    bottomRimKey?: Mesh;
    topRimLever?: Mesh;
    bottomRimLever?: Mesh;
  }>({});
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new Engine(canvasRef.current, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.05, 0.05, 0.08, 1);
    sceneRef.current = scene;
    // Camera setup - 3/4 angle slightly above
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 4,
      Math.PI / 3,
      4,
      new Vector3(0, 0, 0),
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 8;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI / 2.2;
    // Lighting setup
    const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.3;
    const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -2, -1), scene);
    dirLight.position = new Vector3(2, 5, 2);
    dirLight.intensity = 0.5;
    // Glow layer for RGB effects
    const glowLayer = new GlowLayer('glow', scene);
    glowLayer.intensity = rgbIntensity;
    // Create main platter
    const platter = MeshBuilder.CreateCylinder('platter', {
      diameter: 2,
      height: 0.05,
      tessellation: 64,
    }, scene);
    platter.position.y = 0;
    meshesRef.current.platter = platter;
    const platterMaterial = new PBRMaterial('platterMat', scene);
    platterMaterial.albedoColor = new Color3(0.1, 0.1, 0.12);
    platterMaterial.metallic = 0.95;
    platterMaterial.roughness = 0.3;
    platterMaterial.environmentIntensity = 0.5;
    platter.material = platterMaterial;
    // Create thick rim
    const rim = MeshBuilder.CreateTorus('rim', {
      diameter: 2,
      thickness: rimThickness,
      tessellation: 64,
    }, scene);
    rim.position.y = 0;
    rim.rotation.x = Math.PI / 2;
    const rimMaterial = new PBRMaterial('rimMat', scene);
    rimMaterial.albedoColor = new Color3(0.08, 0.08, 0.1);
    rimMaterial.metallic = 1.0;
    rimMaterial.roughness = 0.2;
    rimMaterial.emissiveColor = new Color3(0.1, 0.3, 0.5);
    rimMaterial.emissiveIntensity = 0.3;
    rim.material = rimMaterial;
    glowLayer.addIncludedOnlyMesh(rim);
    // Create RGB rim lights
    const numLights = 16;
    for (let i = 0; i < numLights; i++) {
      const angle = (i / numLights) * Math.PI * 2;
      const x = Math.cos(angle) * 0.95;
      const z = Math.sin(angle) * 0.95;
     
      const light = new PointLight(`rimLight${i}`, new Vector3(x, 0, z), scene);
      light.diffuse = new Color3(0.2, 0.5, 1.0);
      light.intensity = 0.5;
      light.range = 0.5;
    }
    // Create center track
    const track = MeshBuilder.CreateTorus('track', {
      diameter: 0.6,
      thickness: 0.03,
      tessellation: 48,
    }, scene);
    track.position.y = -0.01;
    track.rotation.x = Math.PI / 2;
    const trackMaterial = new PBRMaterial('trackMat', scene);
    trackMaterial.albedoColor = new Color3(0.15, 0.15, 0.18);
    trackMaterial.metallic = 0.9;
    trackMaterial.roughness = 0.4;
    track.material = trackMaterial;
    // Create celestial sphere shader
    Effect.ShadersStore['celestialVertexShader'] = `
      precision highp float;
      attribute vec3 position;
      attribute vec3 normal;
      uniform mat4 worldViewProjection;
      uniform mat4 world;
      varying vec3 vPosition;
      varying vec3 vNormal;
      void main() {
        vec4 p = vec4(position, 1.0);
        vPosition = (world * p).xyz;
        vNormal = normalize((world * vec4(normal, 0.0)).xyz);
        gl_Position = worldViewProjection * p;
      }
    `;
    Effect.ShadersStore['celestialFragmentShader'] = `
      precision highp float;
      uniform float time;
      uniform float tension;
      varying vec3 vPosition;
      varying vec3 vNormal;
     
      vec3 hash3(vec3 p) {
        p = fract(p * vec3(0.1031, 0.1030, 0.0973));
        p += dot(p, p.yxz + 19.19);
        return fract((p.xxy + p.yxx) * p.zyx);
      }
     
      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash3(i).x, hash3(i + vec3(1,0,0)).x, f.x),
              mix(hash3(i + vec3(0,1,0)).x, hash3(i + vec3(1,1,0)).x, f.x), f.y),
          mix(mix(hash3(i + vec3(0,0,1)).x, hash3(i + vec3(1,0,1)).x, f.x),
              mix(hash3(i + vec3(0,1,1)).x, hash3(i + vec3(1,1,1)).x, f.x), f.y),
          f.z
        );
      }
     
      void main() {
        vec3 p = vPosition * 3.0 + time * 0.2;
        float n = noise(p);
        n += 0.5 * noise(p * 2.0);
        n += 0.25 * noise(p * 4.0);
       
        float jitter = tension * 0.3 * (noise(p * 10.0 + time * 5.0) - 0.5);
        n += jitter;
       
        vec3 blueColor = vec3(0.2, 0.4, 0.9);
        vec3 yellowColor = vec3(0.9, 0.8, 0.2);
        vec3 redColor = vec3(0.9, 0.2, 0.1);
       
        vec3 color = mix(blueColor, yellowColor, tension * 0.5);
        color = mix(color, redColor, max(0.0, tension - 0.5) * 2.0);
       
        color = mix(color, color * n, 0.8);
        color += vec3(0.3) * pow(n, 3.0);
       
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vPosition))), 2.0);
        color += fresnel * 0.3;
       
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const sphereMaterial = new ShaderMaterial('celestialMat', scene, {
      vertex: 'celestial',
      fragment: 'celestial',
    }, {
      attributes: ['position', 'normal'],
      uniforms: ['world', 'worldViewProjection', 'time', 'tension'],
    });
    sphereMaterial.setFloat('time', 0);
    sphereMaterial.setFloat('tension', 0);
    sphereMaterial.backFaceCulling = false;
    const innerSphere = MeshBuilder.CreateSphere('innerSphere', {
      diameter: 0.48,
      segments: 32,
    }, scene);
    innerSphere.position.y = 0;
    innerSphere.material = sphereMaterial;
    // Glass sphere
    const sphere = MeshBuilder.CreateSphere('sphere', {
      diameter: 0.52,
      segments: 48,
    }, scene);
    sphere.position.y = 0;
    meshesRef.current.sphere = sphere;
    const glassMaterial = new PBRMaterial('glassMat', scene);
    glassMaterial.albedoColor = new Color3(0.9, 0.95, 1.0);
    glassMaterial.metallic = 0;
    glassMaterial.roughness = 0;
    glassMaterial.alpha = glassTransparency;
    glassMaterial.indexOfRefraction = 1.5;
    glassMaterial.transparencyMode = 2;
    glassMaterial.subSurface.isRefractionEnabled = true;
    glassMaterial.subSurface.refractionIntensity = 0.8;
    sphere.material = glassMaterial;
    // Create key recess components
    const topRimKey = MeshBuilder.CreateBox('topRimKey', {
      width: 0.15,
      height: 0.08,
      depth: rimThickness,
    }, scene);
    topRimKey.position = new Vector3(0.925, 0.04, 0);
    topRimKey.material = rimMaterial;
    meshesRef.current.topRimKey = topRimKey;
    const bottomRimKey = MeshBuilder.CreateBox('bottomRimKey', {
      width: 0.15,
      height: 0.08,
      depth: rimThickness,
    }, scene);
    bottomRimKey.position = new Vector3(0.925, -0.04, 0);
    bottomRimKey.material = rimMaterial;
    meshesRef.current.bottomRimKey = bottomRimKey;
    // Create keycap
    const keycap = MeshBuilder.CreateBox('keycap', {
      width: 0.08,
      height: 0.08,
      depth: 0.08,
    }, scene);
    keycap.position = new Vector3(0.925, 0, -0.2);
    meshesRef.current.keycap = keycap;
    const keycapMaterial = new PBRMaterial('keycapMat', scene);
    keycapMaterial.albedoColor = new Color3(0.1, 0.1, 0.12);
    keycapMaterial.metallic = 0.8;
    keycapMaterial.roughness = 0.3;
    keycapMaterial.emissiveColor = new Color3(0.2, 0.6, 1.0);
    keycapMaterial.emissiveIntensity = 1.5;
    keycap.material = keycapMaterial;
    glowLayer.addIncludedOnlyMesh(keycap);
    // Create lever recess components
    const topRimLever = MeshBuilder.CreateBox('topRimLever', {
      width: 0.15,
      height: 0.08,
      depth: rimThickness,
    }, scene);
    topRimLever.position = new Vector3(-0.925, 0.04, 0);
    topRimLever.material = rimMaterial;
    meshesRef.current.topRimLever = topRimLever;
    const bottomRimLever = MeshBuilder.CreateBox('bottomRimLever', {
      width: 0.15,
      height: 0.08,
      depth: rimThickness,
    }, scene);
    bottomRimLever.position = new Vector3(-0.925, -0.04, 0);
    bottomRimLever.material = rimMaterial;
    meshesRef.current.bottomRimLever = bottomRimLever;
    // Create lever
    const leverBase = MeshBuilder.CreateBox('leverBase', {
      width: 0.04,
      height: 0.06,
      depth: 0.04,
    }, scene);
    leverBase.position = new Vector3(-0.925, 0, -0.2);
    const leverHandle = MeshBuilder.CreateCylinder('leverHandle', {
      diameter: 0.02,
      height: 0.1,
      tessellation: 16,
    }, scene);
    leverHandle.parent = leverBase;
    leverHandle.position.y = 0.05;
    leverHandle.rotation.z = Math.PI / 6;
    meshesRef.current.lever = leverBase;
    const leverMaterial = new PBRMaterial('leverMat', scene);
    leverMaterial.albedoColor = new Color3(0.8, 0.1, 0.1);
    leverMaterial.metallic = 0.9;
    leverMaterial.roughness = 0.2;
    leverMaterial.emissiveColor = new Color3(0.8, 0.2, 0.2);
    leverMaterial.emissiveIntensity = 0.8;
    leverBase.material = leverMaterial;
    leverHandle.material = leverMaterial;
    glowLayer.addIncludedOnlyMesh(leverBase);
    glowLayer.addIncludedOnlyMesh(leverHandle);
    // Animation loop
    let time = 0;
    scene.registerBeforeRender(() => {
      time += engine.getDeltaTime() / 1000;
     
      if (sphereMaterial) {
        sphereMaterial.setFloat('time', time);
        sphereMaterial.setFloat('tension', tensionLevel / 100);
      }
      if (isRotating && platter) {
        platter.rotation.y += 0.005;
        rim.rotation.y += 0.005;
        track.rotation.y += 0.005;
      }
    });
    engine.runRenderLoop(() => {
      scene.render();
    });
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, [rimThickness, recessDepth, glassTransparency, rgbIntensity]);
  useEffect(() => {
    if (!sceneRef.current) return;
    const animateKeyReveal = (show: boolean) => {
      const { topRimKey, bottomRimKey, keycap } = meshesRef.current;
      if (!topRimKey || !bottomRimKey || !keycap) return;
      const frameRate = 60;
      const duration = 1.0;
      const topAnim = new Animation(
        'topKeyAnim',
        'position.y',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      const bottomAnim = new Animation(
        'bottomKeyAnim',
        'position.y',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      const keycapAnim = new Animation(
        'keycapAnim',
        'position.z',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      if (show) {
        topAnim.setKeys([
          { frame: 0, value: 0.04 },
          { frame: frameRate * duration * 0.5, value: 0.12 },
        ]);
        bottomAnim.setKeys([
          { frame: 0, value: -0.04 },
          { frame: frameRate * duration * 0.5, value: -0.12 },
        ]);
        keycapAnim.setKeys([
          { frame: 0, value: -0.2 },
          { frame: frameRate * duration, value: 0 },
        ]);
      } else {
        topAnim.setKeys([
          { frame: 0, value: 0.12 },
          { frame: frameRate * duration * 0.5, value: 0.04 },
        ]);
        bottomAnim.setKeys([
          { frame: 0, value: -0.12 },
          { frame: frameRate * duration * 0.5, value: -0.04 },
        ]);
        keycapAnim.setKeys([
          { frame: 0, value: 0 },
          { frame: frameRate * duration, value: -0.2 },
        ]);
      }
      sceneRef.current?.beginDirectAnimation(topRimKey, [topAnim], 0, frameRate * duration, false);
      sceneRef.current?.beginDirectAnimation(bottomRimKey, [bottomAnim], 0, frameRate * duration, false);
      sceneRef.current?.beginDirectAnimation(keycap, [keycapAnim], 0, frameRate * duration, false);
    };
    animateKeyReveal(isKeyVisible);
  }, [isKeyVisible]);
  useEffect(() => {
    if (!sceneRef.current) return;
    const animateLeverReveal = (show: boolean) => {
      const { topRimLever, bottomRimLever, lever } = meshesRef.current;
      if (!topRimLever || !bottomRimLever || !lever) return;
      const frameRate = 60;
      const duration = 1.0;
      const topAnim = new Animation(
        'topLeverAnim',
        'position.y',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      const bottomAnim = new Animation(
        'bottomLeverAnim',
        'position.y',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      const leverAnim = new Animation(
        'leverAnim',
        'position.z',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      if (show) {
        topAnim.setKeys([
          { frame: 0, value: 0.04 },
          { frame: frameRate * duration * 0.5, value: 0.12 },
        ]);
        bottomAnim.setKeys([
          { frame: 0, value: -0.04 },
          { frame: frameRate * duration * 0.5, value: -0.12 },
        ]);
        leverAnim.setKeys([
          { frame: 0, value: -0.2 },
          { frame: frameRate * duration, value: 0 },
        ]);
      } else {
        topAnim.setKeys([
          { frame: 0, value: 0.12 },
          { frame: frameRate * duration * 0.5, value: 0.04 },
        ]);
        bottomAnim.setKeys([
          { frame: 0, value: -0.12 },
          { frame: frameRate * duration * 0.5, value: -0.04 },
        ]);
        leverAnim.setKeys([
          { frame: 0, value: 0 },
          { frame: frameRate * duration, value: -0.2 },
        ]);
      }
      sceneRef.current?.beginDirectAnimation(topRimLever, [topAnim], 0, frameRate * duration, false);
      sceneRef.current?.beginDirectAnimation(bottomRimLever, [bottomAnim], 0, frameRate * duration, false);
      sceneRef.current?.beginDirectAnimation(lever, [leverAnim], 0, frameRate * duration, false);
    };
    animateLeverReveal(isLeverVisible);
  }, [isLeverVisible]);
  return (
    <div className="relative w-full h-screen bg-background">
      <canvas ref={canvasRef} className="w-full h-full" />
     
      <Card className="absolute top-4 left-4 p-4 bg-background/90 backdrop-blur-sm border-border">
        <div className="space-y-4 w-64">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isKeyVisible ? "default" : "outline"}
              onClick={() => setIsKeyVisible(!isKeyVisible)}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Key
            </Button>
            <Button
              size="sm"
              variant={isLeverVisible ? "default" : "outline"}
              onClick={() => setIsLeverVisible(!isLeverVisible)}
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-2" />
              Lever
            </Button>
          </div>
          <Button
            size="sm"
            variant={isRotating ? "default" : "outline"}
            onClick={() => setIsRotating(!isRotating)}
            className="w-full"
          >
            <RotateCw className="w-4 h-4 mr-2" />
            {isRotating ? 'Stop' : 'Rotate'}
          </Button>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Tension: {tensionLevel}%
            </label>
            <Slider
              value={[tensionLevel]}
              onValueChange={(value) => setTensionLevel(value[0])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </Card>
      <Card className="absolute bottom-4 left-4 p-3 bg-background/90 backdrop-blur-sm border-border">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Platter rotates on central axis only</p>
          <p>• Garage-door mechanism reveals key/lever</p>
          <p>• Glass sphere contains celestial shader</p>
          <p>• Tension affects internal sphere effect</p>
        </div>
      </Card>
    </div>
  );
};
export default function IndustrialPlatterDemo() {
  return (
    <IndustrialPlatter
      rimThickness={0.18}
      recessDepth={0.08}
      glassTransparency={0.15}
      rgbIntensity={2.0}
    />
  );
}
 
3:
 
"use client";
import React, { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { Button } from './components/ui/button';
import { Slider } from './components/ui/slider';
interface IndustrialPlatterProps {
  rimThickness?: number;
  recessDepth?: number;
  glassTransparency?: number;
  rgbIntensity?: number;
}
const IndustrialPlatter: React.FC<IndustrialPlatterProps> = ({
  rimThickness = 0.18,
  recessDepth = 0.12,
  glassTransparency = 0.15,
  rgbIntensity = 1.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [keyEmergenceProgress, setKeyEmergenceProgress] = useState(0);
  const [leverEmergenceProgress, setLeverEmergenceProgress] = useState(0);
  const [sphereTension, setSphereTension] = useState(0);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    engineRef.current = engine;
    const createScene = () => {
      const scene = new BABYLON.Scene(engine);
      scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.08, 1);
      sceneRef.current = scene;
      const camera = new BABYLON.ArcRotateCamera(
        'camera',
        -Math.PI / 4,
        Math.PI / 3,
        8,
        new BABYLON.Vector3(0, 0, 0),
        scene
      );
      camera.attachControl(canvas, true);
      camera.lowerRadiusLimit = 5;
      camera.upperRadiusLimit = 15;
      camera.lowerBetaLimit = 0.1;
      camera.upperBetaLimit = Math.PI / 2.2;
      const hemiLight = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
      hemiLight.intensity = 0.3;
      const rimLight = new BABYLON.PointLight('rimLight', new BABYLON.Vector3(0, 0.5, 0), scene);
      rimLight.intensity = 2;
      rimLight.diffuse = new BABYLON.Color3(0.2, 0.6, 1);
      // Main platter base
      const platter = BABYLON.MeshBuilder.CreateCylinder('platter', {
        diameter: 3,
        height: 0.15,
        tessellation: 64,
      }, scene);
      platter.position.y = 0;
      const platterMat = new BABYLON.PBRMaterial('platterMat', scene);
      platterMat.albedoColor = new BABYLON.Color3(0.05, 0.05, 0.05);
      platterMat.metallic = 0.95;
      platterMat.roughness = 0.3;
      platterMat.environmentIntensity = 0.5;
      platter.material = platterMat;
      // Thick rim
      const rim = BABYLON.MeshBuilder.CreateTorus('rim', {
        diameter: 3.2,
        thickness: rimThickness,
        tessellation: 64,
      }, scene);
      rim.position.y = 0;
      rim.rotation.x = Math.PI / 2;
      const rimMat = new BABYLON.PBRMaterial('rimMat', scene);
      rimMat.albedoColor = new BABYLON.Color3(0.02, 0.02, 0.02);
      rimMat.metallic = 1;
      rimMat.roughness = 0.2;
      rimMat.emissiveColor = new BABYLON.Color3(0.1 * rgbIntensity, 0.3 * rgbIntensity, 0.6 * rgbIntensity);
      rim.material = rimMat;
      // Central recessed track
      const track = BABYLON.MeshBuilder.CreateTorus('track', {
        diameter: 0.6,
        thickness: 0.05,
        tessellation: 32,
      }, scene);
      track.position.y = -0.02;
      track.rotation.x = Math.PI / 2;
      const trackMat = new BABYLON.PBRMaterial('trackMat', scene);
      trackMat.albedoColor = new BABYLON.Color3(0.08, 0.08, 0.1);
      trackMat.metallic = 0.9;
      trackMat.roughness = 0.4;
      track.material = trackMat;
      // Glass sphere with celestial shader effect
      const sphere = BABYLON.MeshBuilder.CreateSphere('glassSphere', {
        diameter: 0.52,
        segments: 64,
      }, scene);
      sphere.position.y = 0.1;
      const sphereMat = new BABYLON.PBRMaterial('sphereMat', scene);
      sphereMat.albedoColor = new BABYLON.Color3(0.9, 0.95, 1);
      sphereMat.metallic = 0;
      sphereMat.roughness = 0;
      sphereMat.alpha = 1 - glassTransparency;
      sphereMat.indexOfRefraction = 1.5;
      sphereMat.subSurface.isRefractionEnabled = true;
      sphereMat.subSurface.indexOfRefraction = 1.5;
     
      const tensionColor = BABYLON.Color3.Lerp(
        new BABYLON.Color3(0.2, 0.4, 0.8),
        new BABYLON.Color3(0.8, 0.1, 0.1),
        sphereTension
      );
      sphereMat.emissiveColor = tensionColor.scale(0.3 + sphereTension * 0.5);
      sphere.material = sphereMat;
      // Key recess placeholder
      const keyRecess = BABYLON.MeshBuilder.CreateBox('keyRecess', {
        width: 0.15,
        height: recessDepth,
        depth: 0.08,
      }, scene);
      keyRecess.position = new BABYLON.Vector3(1.4, 0, 0);
      keyRecess.isVisible = false;
      // Key placeholder
      const keycap = BABYLON.MeshBuilder.CreateBox('keycap', {
        width: 0.12,
        height: 0.04,
        depth: 0.06,
      }, scene);
      keycap.position = new BABYLON.Vector3(1.4, -0.1 + keyEmergenceProgress * 0.15, 0);
      const keycapMat = new BABYLON.PBRMaterial('keycapMat', scene);
      keycapMat.albedoColor = new BABYLON.Color3(0.1, 0.1, 0.12);
      keycapMat.metallic = 0.8;
      keycapMat.roughness = 0.3;
      keycapMat.emissiveColor = new BABYLON.Color3(0.2 * rgbIntensity, 0.5 * rgbIntensity, 0.8 * rgbIntensity);
      keycap.material = keycapMat;
      // Lever recess placeholder
      const leverRecess = BABYLON.MeshBuilder.CreateBox('leverRecess', {
        width: 0.1,
        height: recessDepth,
        depth: 0.1,
      }, scene);
      leverRecess.position = new BABYLON.Vector3(-1.4, 0, 0);
      leverRecess.isVisible = false;
      // Lever placeholder
      const lever = BABYLON.MeshBuilder.CreateCylinder('lever', {
        diameter: 0.03,
        height: 0.15,
        tessellation: 16,
      }, scene);
      lever.position = new BABYLON.Vector3(-1.4, -0.1 + leverEmergenceProgress * 0.2, 0);
      const leverMat = new BABYLON.PBRMaterial('leverMat', scene);
      leverMat.albedoColor = new BABYLON.Color3(0.15, 0.15, 0.18);
      leverMat.metallic = 0.9;
      leverMat.roughness = 0.2;
      leverMat.emissiveColor = new BABYLON.Color3(0.1 * rgbIntensity, 0.4 * rgbIntensity, 0.7 * rgbIntensity);
      lever.material = leverMat;
      // Rotation animation
      scene.registerBeforeRender(() => {
        platter.rotation.y += 0.002;
        rim.rotation.z += 0.002;
        sphere.rotation.y += 0.005;
       
        keycap.position.y = -0.1 + keyEmergenceProgress * 0.15;
        lever.position.y = -0.1 + leverEmergenceProgress * 0.2;
       
        const currentTensionColor = BABYLON.Color3.Lerp(
          new BABYLON.Color3(0.2, 0.4, 0.8),
          new BABYLON.Color3(0.8, 0.1, 0.1),
          sphereTension
        );
        if (sphere.material instanceof BABYLON.PBRMaterial) {
          sphere.material.emissiveColor = currentTensionColor.scale(0.3 + sphereTension * 0.5);
        }
      });
      return scene;
    };
    const scene = createScene();
    engine.runRenderLoop(() => {
      scene.render();
    });
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, [rimThickness, recessDepth, glassTransparency, rgbIntensity, keyEmergenceProgress, leverEmergenceProgress, sphereTension]);
  return (
    <div className="relative w-full h-screen bg-black">
      <canvas ref={canvasRef} className="w-full h-full" />
     
      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-xl p-6 rounded-2xl text-white shadow-2xl w-96 border border-white/10 space-y-4">
        <h2 className="text-xl font-bold mb-4 text-cyan-400">Industrial Platter Controls</h2>
       
        <div className="space-y-3">
          <div>
            <label className="text-sm text-white/70 mb-2 block">Key Emergence: {keyEmergenceProgress.toFixed(2)}</label>
            <Slider
              value={[keyEmergenceProgress]}
              onValueChange={(v) => setKeyEmergenceProgress(v[0])}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-white/70 mb-2 block">Lever Emergence: {leverEmergenceProgress.toFixed(2)}</label>
            <Slider
              value={[leverEmergenceProgress]}
              onValueChange={(v) => setLeverEmergenceProgress(v[0])}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-white/70 mb-2 block">Sphere Tension: {sphereTension.toFixed(2)}</label>
            <Slider
              value={[sphereTension]}
              onValueChange={(v) => setSphereTension(v[0])}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
          </div>
        </div>
        <div className="pt-4 border-t border-white/10 space-y-2">
          <Button
            onClick={() => {
              setKeyEmergenceProgress(keyEmergenceProgress > 0.5 ? 0 : 1);
            }}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            Toggle Key
          </Button>
          <Button
            onClick={() => {
              setLeverEmergenceProgress(leverEmergenceProgress > 0.5 ? 0 : 1);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Toggle Lever
          </Button>
          <Button
            onClick={() => {
              setSphereTension(sphereTension > 0.5 ? 0 : 1);
            }}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Toggle Tension
          </Button>
        </div>
      </div>
    </div>
  );
};
export default function DemoIndustrialPlatter() {
  return (
    <IndustrialPlatter
      rimThickness={0.18}
      recessDepth={0.12}
      glassTransparency={0.15}
      rgbIntensity={1.5}
    />
  );
}
 
4:
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
interface CelestialSphereShaderProps {
  hue?: number;
  speed?: number;
  zoom?: number;
  particleSize?: number;
  className?: string;
}
const CelestialSphereShader: React.FC<CelestialSphereShaderProps> = ({
  hue = 200.0,
  speed = 0.3,
  zoom = 1.5,
  particleSize = 3.0,
  className = "",
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mountRef.current) return;
    const currentMount = mountRef.current;
    let scene: THREE.Scene,
      camera: THREE.OrthographicCamera,
      renderer: THREE.WebGLRenderer,
      material: THREE.ShaderMaterial,
      mesh: THREE.Mesh;
    let animationFrameId: number;
    const mouse = new THREE.Vector2(0.5, 0.5);
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
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_hue;
      uniform float u_zoom;
      uniform float u_particle_size;
      vec3 hsl2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
        return c.z * mix(vec3(1.0), rgb, c.y);
      }
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
      }
      float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 6; i++) {
          value += amplitude * noise(st);
          st *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        uv *= u_zoom;
        vec2 mouse_normalized = u_mouse / u_resolution;
        uv += (mouse_normalized - 0.5) * 0.8;
        float f = fbm(uv + vec2(u_time * 0.1, u_time * 0.05));
        float t = fbm(uv + f + vec2(u_time * 0.05, u_time * 0.02));
       
        float nebula = pow(t, 2.0);
        vec3 color = hsl2rgb(vec3(u_hue / 360.0 + nebula * 0.2, 0.7, 0.5));
        color *= nebula * 2.5;
        float star_val = random(vUv * 500.0);
        if (star_val > 0.998) {
            float star_brightness = (star_val - 0.998) / 0.002;
            color += vec3(star_brightness * u_particle_size);
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const init = () => {
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      currentMount.appendChild(renderer.domElement);
      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          u_time: { value: 0.0 },
          u_resolution: { value: new THREE.Vector2() },
          u_mouse: { value: new THREE.Vector2() },
          u_hue: { value: hue },
          u_zoom: { value: zoom },
          u_particle_size: { value: particleSize },
        },
      });
      const geometry = new THREE.PlaneGeometry(2, 2);
      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      addEventListeners();
      resize();
      animate();
    };
    const animate = () => {
      material.uniforms.u_time.value += 0.005 * speed;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    const resize = () => {
      const { clientWidth, clientHeight } = currentMount;
      renderer.setSize(clientWidth, clientHeight);
      material.uniforms.u_resolution.value.set(clientWidth, clientHeight);
      camera.updateProjectionMatrix();
    };
    const onMouseMove = (event: MouseEvent) => {
      const rect = currentMount.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      material.uniforms.u_mouse.value.set(mouse.x, currentMount.clientHeight - mouse.y);
    };
    const addEventListeners = () => {
      window.addEventListener("resize", resize);
      window.addEventListener("mousemove", onMouseMove);
    };
    const removeEventListeners = () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
    init();
    return () => {
      removeEventListeners();
      cancelAnimationFrame(animationFrameId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [hue, speed, zoom, particleSize]);
  return <div ref={mountRef} className={className || "w-full h-full"} />;
};
interface PlatterMesh {
  position: THREE.Vector3;
  rotation: THREE.Euler;
}
const IndustrialPlatter: React.FC = () => {
  const platterRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [leverVisible, setLeverVisible] = useState(false);
  const [tension, setTension] = useState(0);
  useFrame((state) => {
    if (platterRef.current) {
      platterRef.current.rotation.y += 0.002;
    }
    if (sphereRef.current) {
      const time = state.clock.getElapsedTime();
      sphereRef.current.rotation.y = time * 0.3;
      sphereRef.current.rotation.x = Math.sin(time * 0.2) * 0.1;
    }
  });
  const platterGeometry = new THREE.CylinderGeometry(3, 3, 0.3, 64);
  const rimGeometry = new THREE.TorusGeometry(3, 0.18, 32, 64);
  const trackGeometry = new THREE.TorusGeometry(0.52, 0.05, 32, 64);
  const sphereGeometry = new THREE.SphereGeometry(0.52, 64, 64);
  return (
    <group ref={platterRef} position={[0, 0, 0]}>
      <mesh geometry={platterGeometry} position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.9}
          roughness={0.3}
          envMapIntensity={1.5}
        />
      </mesh>
      <mesh geometry={rimGeometry} position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.95}
          roughness={0.2}
          emissive="#0088ff"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh geometry={trackGeometry} position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.8}
          roughness={0.4}
        />
      </mesh>
      <mesh ref={sphereRef} geometry={sphereGeometry} position={[0, 0.68, 0]}>
        <meshPhysicalMaterial
          color="#ffffff"
          metalness={0.1}
          roughness={0.05}
          transmission={0.95}
          thickness={0.5}
          ior={1.5}
          transparent={true}
          opacity={0.9}
        />
      </mesh>
      <pointLight position={[0, 0.68, 0]} intensity={0.5} color="#0088ff" distance={2} />
      <pointLight position={[3, 0.15, 0]} intensity={0.3} color="#0088ff" distance={1} />
    </group>
  );
};
const BabylonPlatterScene: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div className="absolute inset-0 z-0">
        <CelestialSphereShader
          hue={210}
          speed={0.4}
          zoom={1.2}
          particleSize={4.0}
          className="absolute top-0 left-0 w-full h-full opacity-30"
        />
      </div>
      <Canvas
        camera={{ position: [5, 3, 5], fov: 50 }}
        className="absolute inset-0 z-10"
      >
        <color attach="background" args={["#000000"]} />
       
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={0.5} color="#ffffff" />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} color="#0088ff" />
       
        <hemisphereLight args={["#0088ff", "#000000", 0.3]} />
       
        <IndustrialPlatter />
       
        <OrbitControls
          enableDamping={true}
          dampingFactor={0.05}
          minDistance={3}
          maxDistance={15}
          maxPolarAngle={Math.PI / 2}
          enablePan={false}
        />
       
        <fog attach="fog" args={["#000000", 5, 20]} />
      </Canvas>
      <div className="absolute bottom-8 left-8 z-20 text-white font-mono text-sm space-y-2">
        <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded border border-blue-500/30">
          <p className="text-blue-400">Industrial Heavy Metal Platter</p>
          <p className="text-gray-400 text-xs">Babylon.js Compatible • CSP-Safe</p>
        </div>
      </div>
    </div>
  );
};
export default BabylonPlatterScene;
 
5:
"use client"
import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Card } from '@/components/ui/card'
interface BabylonPlatterProps {
  className?: string
}
export function BabylonPlatter({ className = '' }: BabylonPlatterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    platter: THREE.Group
    sphere: THREE.Mesh
    keyButton: THREE.Group
    lever: THREE.Group
    animationId: number
    time: number
    keyPressed: boolean
    leverActive: boolean
    keySlitProgress: number
    leverSlitProgress: number
    keyEmergenceProgress: number
    leverEmergenceProgress: number
    sphereTension: number
  } | null>(null)
  const [keyPressed, setKeyPressed] = useState(false)
  const [leverActive, setLeverActive] = useState(false)
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.002)
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 80, 120)
    camera.lookAt(0, 0, 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
    scene.add(ambientLight)
    const topLight = new THREE.DirectionalLight(0xffffff, 0.8)
    topLight.position.set(0, 100, 0)
    scene.add(topLight)
    const rimLight1 = new THREE.PointLight(0x00d4ff, 2, 200)
    rimLight1.position.set(50, 5, 0)
    scene.add(rimLight1)
    const rimLight2 = new THREE.PointLight(0x0088ff, 2, 200)
    rimLight2.position.set(-50, 5, 0)
    scene.add(rimLight2)
    const platterGroup = new THREE.Group()
    scene.add(platterGroup)
    const platterGeometry = new THREE.CylinderGeometry(60, 60, 4, 64)
    const platterMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.3,
    })
    const platterMesh = new THREE.Mesh(platterGeometry, platterMaterial)
    platterMesh.position.y = 0
    platterGroup.add(platterMesh)
    const rimGeometry = new THREE.TorusGeometry(60, 9, 32, 64)
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d,
      metalness: 0.95,
      roughness: 0.2,
    })
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial)
    rimMesh.rotation.x = Math.PI / 2
    rimMesh.position.y = 0
    platterGroup.add(rimMesh)
    const rimLightGeometry = new THREE.TorusGeometry(60, 0.5, 16, 64)
    const rimLightMaterial = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 2,
    })
    const rimLightMesh = new THREE.Mesh(rimLightGeometry, rimLightMaterial)
    rimLightMesh.rotation.x = Math.PI / 2
    rimLightMesh.position.y = 0.5
    platterGroup.add(rimLightMesh)
    const trackGeometry = new THREE.TorusGeometry(26, 1, 16, 64)
    const trackMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.8,
      roughness: 0.4,
    })
    const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial)
    trackMesh.rotation.x = Math.PI / 2
    trackMesh.position.y = 2.5
    platterGroup.add(trackMesh)
    const sphereGeometry = new THREE.SphereGeometry(26, 64, 64)
    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        tension: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float tension;
        varying vec3 vPosition;
        varying vec3 vNormal;
       
        vec3 hash3(vec3 p) {
          p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
                   dot(p, vec3(269.5, 183.3, 246.1)),
                   dot(p, vec3(113.5, 271.9, 124.6)));
          return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
        }
       
        float noise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          vec3 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(dot(hash3(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0)),
                             dot(hash3(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
                         mix(dot(hash3(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)),
                             dot(hash3(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x), u.y),
                     mix(mix(dot(hash3(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)),
                             dot(hash3(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
                         mix(dot(hash3(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)),
                             dot(hash3(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x), u.y), u.z);
        }
       
        void main() {
          vec3 pos = vPosition * 0.5 + time * 0.1;
          float n = noise(pos * 2.0);
         
          vec3 blueColor = vec3(0.1, 0.4, 0.9);
          vec3 cyanColor = vec3(0.0, 0.8, 1.0);
          vec3 yellowColor = vec3(0.9, 0.9, 0.3);
          vec3 redColor = vec3(0.9, 0.1, 0.1);
         
          vec3 color = mix(blueColor, cyanColor, smoothstep(-0.5, 0.5, n));
          color = mix(color, yellowColor, tension * 0.5);
          color = mix(color, redColor, tension * tension);
         
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          color += fresnel * 0.3;
         
          float alpha = 0.6 + fresnel * 0.4;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    })
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
    sphereMesh.position.y = 2.5
    platterGroup.add(sphereMesh)
    const keyButtonGroup = new THREE.Group()
    keyButtonGroup.position.set(50, -5, 0)
    platterGroup.add(keyButtonGroup)
    const keyCapGeometry = new THREE.BoxGeometry(8, 8, 4)
    const keyCapMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.2,
    })
    const keyCapMesh = new THREE.Mesh(keyCapGeometry, keyCapMaterial)
    keyCapMesh.position.y = 0
    keyButtonGroup.add(keyCapMesh)
    const playGeometry = new THREE.BufferGeometry()
    const playVertices = new Float32Array([
      -2, -2, 2,
      2, 0, 2,
      -2, 2, 2,
    ])
    playGeometry.setAttribute('position', new THREE.BufferAttribute(playVertices, 3))
    const playMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      side: THREE.DoubleSide,
    })
    const playMesh = new THREE.Mesh(playGeometry, playMaterial)
    playMesh.position.z = 2.1
    keyCapMesh.add(playMesh)
    const keyGlowLight = new THREE.PointLight(0x00d4ff, 1, 20)
    keyGlowLight.position.set(0, 0, 0)
    keyButtonGroup.add(keyGlowLight)
    const leverGroup = new THREE.Group()
    leverGroup.position.set(-50, -5, 0)
    platterGroup.add(leverGroup)
    const leverBaseGeometry = new THREE.CylinderGeometry(3, 3, 2, 32)
    const leverBaseMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.2,
    })
    const leverBaseMesh = new THREE.Mesh(leverBaseGeometry, leverBaseMaterial)
    leverBaseMesh.position.y = 0
    leverGroup.add(leverBaseMesh)
    const leverHandleGeometry = new THREE.CylinderGeometry(1, 1, 12, 16)
    const leverHandleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.8,
      roughness: 0.3,
    })
    const leverHandleMesh = new THREE.Mesh(leverHandleGeometry, leverHandleMaterial)
    leverHandleMesh.position.y = 6
    leverGroup.add(leverHandleMesh)
    const leverGlowLight = new THREE.PointLight(0x00d4ff, 1, 20)
    leverGlowLight.position.set(0, 0, 0)
    leverGroup.add(leverGlowLight)
    sceneRef.current = {
      scene,
      camera,
      renderer,
      platter: platterGroup,
      sphere: sphereMesh,
      keyButton: keyButtonGroup,
      lever: leverGroup,
      animationId: 0,
      time: 0,
      keyPressed: false,
      leverActive: false,
      keySlitProgress: 0,
      leverSlitProgress: 0,
      keyEmergenceProgress: 0,
      leverEmergenceProgress: 0,
      sphereTension: 0,
    }
    const animate = () => {
      if (!sceneRef.current) return
      sceneRef.current.animationId = requestAnimationFrame(animate)
      sceneRef.current.time += 0.016
      sceneRef.current.platter.rotation.y += 0.002
      if (sphereMaterial.uniforms) {
        sphereMaterial.uniforms.time.value = sceneRef.current.time
        sphereMaterial.uniforms.tension.value = sceneRef.current.sphereTension
      }
      rimLightMesh.material.emissiveIntensity = 2 + Math.sin(sceneRef.current.time * 2) * 0.5
      if (sceneRef.current.keyPressed && sceneRef.current.keySlitProgress < 1) {
        sceneRef.current.keySlitProgress = Math.min(1, sceneRef.current.keySlitProgress + 0.02)
      }
      if (!sceneRef.current.keyPressed && sceneRef.current.keySlitProgress > 0) {
        sceneRef.current.keySlitProgress = Math.max(0, sceneRef.current.keySlitProgress - 0.02)
      }
      if (sceneRef.current.keySlitProgress > 0.8 && sceneRef.current.keyEmergenceProgress < 1) {
        sceneRef.current.keyEmergenceProgress = Math.min(1, sceneRef.current.keyEmergenceProgress + 0.015)
      }
      if (sceneRef.current.keySlitProgress < 0.2 && sceneRef.current.keyEmergenceProgress > 0) {
        sceneRef.current.keyEmergenceProgress = Math.max(0, sceneRef.current.keyEmergenceProgress - 0.015)
      }
      keyButtonGroup.position.y = -5 + sceneRef.current.keyEmergenceProgress * 10
      if (sceneRef.current.leverActive && sceneRef.current.leverSlitProgress < 1) {
        sceneRef.current.leverSlitProgress = Math.min(1, sceneRef.current.leverSlitProgress + 0.02)
      }
      if (!sceneRef.current.leverActive && sceneRef.current.leverSlitProgress > 0) {
        sceneRef.current.leverSlitProgress = Math.max(0, sceneRef.current.leverSlitProgress - 0.02)
      }
      if (sceneRef.current.leverSlitProgress > 0.8 && sceneRef.current.leverEmergenceProgress < 1) {
        sceneRef.current.leverEmergenceProgress = Math.min(1, sceneRef.current.leverEmergenceProgress + 0.015)
      }
      if (sceneRef.current.leverSlitProgress < 0.2 && sceneRef.current.leverEmergenceProgress > 0) {
        sceneRef.current.leverEmergenceProgress = Math.max(0, sceneRef.current.leverEmergenceProgress - 0.015)
      }
      leverGroup.position.y = -5 + sceneRef.current.leverEmergenceProgress * 10
      leverHandleMesh.rotation.z = sceneRef.current.leverActive ? Math.PI / 4 : 0
      sceneRef.current.sphereTension = (sceneRef.current.keyPressed ? 0.3 : 0) + (sceneRef.current.leverActive ? 0.7 : 0)
      renderer.render(scene, camera)
    }
    animate()
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      sceneRef.current.camera.aspect = width / height
      sceneRef.current.camera.updateProjectionMatrix()
      sceneRef.current.renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId)
        if (container && sceneRef.current.renderer.domElement) {
          container.removeChild(sceneRef.current.renderer.domElement)
        }
        sceneRef.current.renderer.dispose()
      }
    }
  }, [])
  const handleKeyPress = () => {
    if (sceneRef.current) {
      sceneRef.current.keyPressed = !sceneRef.current.keyPressed
      setKeyPressed(!keyPressed)
    }
  }
  const handleLeverToggle = () => {
    if (sceneRef.current) {
      sceneRef.current.leverActive = !sceneRef.current.leverActive
      setLeverActive(!leverActive)
    }
  }
  return (
    <Card className="relative w-full h-[600px] bg-black overflow-hidden border-border">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 flex gap-4 z-10">
        <button
          onClick={handleKeyPress}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            keyPressed
              ? 'bg-cyan-500 text-black'
              : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          {keyPressed ? 'Stop' : 'Play'}
        </button>
        <button
          onClick={handleLeverToggle}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            leverActive
              ? 'bg-red-500 text-white'
              : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          {leverActive ? 'Lever ON' : 'Lever OFF'}
        </button>
      </div>
    </Card>
  )
}
export default function IndustrialPlatterDemo() {
  return (
    <div className="w-full min-h-screen bg-background p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl">
        <BabylonPlatter />
      </div>
    </div>
  )
}