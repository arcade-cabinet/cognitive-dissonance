# Turn 113 (USER) — Lines 14284-16113

**Summary**: Oh man we are not off to a promising start. Haha. Here's variant 5:
**Topics**: glass-sphere, platter, gsap, shaders, babylon, tension, seed, controls, r21dev
**Code**: 0 | **New**: no | **Design**: no | **Definitive**: no

---

Oh man we are not off to a promising start. Haha. Here's variant 5:
"use client";
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
// Babylon.js Industrial Platter Component
const IndustrialPlatter = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    platter: THREE.Group;
    sphere: THREE.Mesh;
    rimLights: THREE.Mesh[];
    animationId: number;
  } | null>(null);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isLeverVisible, setIsLeverVisible] = useState(false);
  const [sphereIntensity, setSphereIntensity] = useState(0);
  const keyY = useMotionValue(0);
  const leverRotation = useMotionValue(0);
  const springKeyY = useSpring(keyY, { stiffness: 300, damping: 25 });
  const springLeverRotation = useSpring(leverRotation, { stiffness: 400, damping: 30 });
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.002);
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 80, 120);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.3);
    scene.add(ambientLight);
    const rimLight1 = new THREE.PointLight(0x00bfff, 2, 200);
    rimLight1.position.set(50, 20, 50);
    scene.add(rimLight1);
    const rimLight2 = new THREE.PointLight(0x0088ff, 2, 200);
    rimLight2.position.set(-50, 20, -50);
    scene.add(rimLight2);
    // Main platter group
    const platterGroup = new THREE.Group();
    scene.add(platterGroup);
    // Platter base
    const platterGeometry = new THREE.CylinderGeometry(60, 60, 4, 64);
    const platterMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.3,
      envMapIntensity: 1,
    });
    const platter = new THREE.Mesh(platterGeometry, platterMaterial);
    platter.rotation.x = 0;
    platter.castShadow = true;
    platter.receiveShadow = true;
    platterGroup.add(platter);
    // Thick rim with RGB lighting
    const rimGeometry = new THREE.TorusGeometry(60, 9, 32, 64);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      metalness: 0.95,
      roughness: 0.2,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    platterGroup.add(rim);
    // RGB rim lights
    const rimLights: THREE.Mesh[] = [];
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const lightGeometry = new THREE.SphereGeometry(0.5, 8, 8);
      const lightMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8,
      });
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.set(
        Math.cos(angle) * 60,
        2,
        Math.sin(angle) * 60
      );
      platterGroup.add(light);
      rimLights.push(light);
    }
    // Central track
    const trackGeometry = new THREE.TorusGeometry(26, 2, 16, 64);
    const trackMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      metalness: 0.8,
      roughness: 0.4,
    });
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.rotation.x = Math.PI / 2;
    track.position.y = 2;
    platterGroup.add(track);
    // Glass sphere with shader
    const sphereGeometry = new THREE.SphereGeometry(26, 64, 64);
    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: 0 },
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
        uniform float intensity;
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
          vec3 p = vPosition * 0.5 + time * 0.1;
          float n = noise(p) * 0.5 + 0.5;
         
          vec3 blueColor = vec3(0.2, 0.6, 1.0);
          vec3 yellowColor = vec3(1.0, 0.9, 0.3);
          vec3 redColor = vec3(1.0, 0.2, 0.2);
         
          vec3 color = mix(blueColor, yellowColor, intensity * 0.5);
          color = mix(color, redColor, max(0.0, intensity - 0.5) * 2.0);
         
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          color = mix(color * n, color, fresnel * 0.5);
         
          float jitter = intensity * 0.1 * sin(time * 10.0 + vPosition.x * 5.0);
          color += vec3(jitter);
         
          float alpha = 0.3 + fresnel * 0.4;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.y = 2;
    platterGroup.add(sphere);
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x050505,
      metalness: 0.5,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);
    sceneRef.current = {
      scene,
      camera,
      renderer,
      platter: platterGroup,
      sphere,
      rimLights,
      animationId: 0,
    };
    // Animation loop
    let time = 0;
    const animate = () => {
      const refs = sceneRef.current;
      if (!refs) return;
      refs.animationId = requestAnimationFrame(animate);
      time += 0.016;
      // Rotate platter
      refs.platter.rotation.y += 0.002;
      // Update sphere shader
      if (refs.sphere.material instanceof THREE.ShaderMaterial) {
        refs.sphere.material.uniforms.time.value = time;
        refs.sphere.material.uniforms.intensity.value = sphereIntensity;
      }
      // Pulse rim lights
      refs.rimLights.forEach((light, i) => {
        const offset = (i / refs.rimLights.length) * Math.PI * 2;
        const pulse = Math.sin(time * 2 + offset) * 0.5 + 0.5;
        if (light.material instanceof THREE.MeshBasicMaterial) {
          light.material.opacity = 0.5 + pulse * 0.3;
        }
      });
      refs.renderer.render(refs.scene, refs.camera);
    };
    animate();
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        sceneRef.current.renderer.dispose();
        if (container.contains(sceneRef.current.renderer.domElement)) {
          container.removeChild(sceneRef.current.renderer.domElement);
        }
      }
    };
  }, [sphereIntensity]);
  const toggleKey = () => {
    setIsKeyVisible(!isKeyVisible);
    keyY.set(isKeyVisible ? 0 : -50);
  };
  const toggleLever = () => {
    setIsLeverVisible(!isLeverVisible);
    leverRotation.set(isLeverVisible ? 0 : -45);
  };
  const increaseTension = () => {
    setSphereIntensity(Math.min(sphereIntensity + 0.2, 1));
  };
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
     
      {/* Control Panel */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-10">
        <motion.button
          onClick={toggleKey}
          className="px-6 py-3 bg-gradient-to-br from-gray-700 to-gray-900 text-cyan-400 rounded-lg font-bold tracking-wider shadow-lg border border-cyan-500/30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isKeyVisible ? 'HIDE' : 'SHOW'} KEY
        </motion.button>
       
        <motion.button
          onClick={toggleLever}
          className="px-6 py-3 bg-gradient-to-br from-gray-700 to-gray-900 text-purple-400 rounded-lg font-bold tracking-wider shadow-lg border border-purple-500/30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isLeverVisible ? 'HIDE' : 'SHOW'} LEVER
        </motion.button>
       
        <motion.button
          onClick={increaseTension}
          className="px-6 py-3 bg-gradient-to-br from-gray-700 to-gray-900 text-red-400 rounded-lg font-bold tracking-wider shadow-lg border border-red-500/30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          INCREASE TENSION
        </motion.button>
      </div>
      {/* Key Component */}
      <motion.div
        className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2"
        style={{ y: springKeyY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isKeyVisible ? 1 : 0 }}
      >
        <div className="relative w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-950 rounded-xl shadow-2xl border-2 border-cyan-500/50 flex items-center justify-center">
          <div className="absolute inset-0 rounded-xl bg-cyan-500/20 blur-xl" />
          <svg className="w-10 h-10 text-cyan-400 relative z-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </motion.div>
      {/* Lever Component */}
      <motion.div
        className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLeverVisible ? 1 : 0 }}
      >
        <div className="relative w-24 h-32 bg-gradient-to-br from-gray-800 to-gray-950 rounded-2xl shadow-2xl border-2 border-purple-500/50 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-xl" />
          <motion.div
            className="w-4 h-20 bg-gradient-to-b from-gray-600 to-gray-800 rounded-full relative z-10 origin-bottom"
            style={{ rotate: springLeverRotation }}
          >
            <div className="absolute top-0 w-8 h-8 bg-purple-500 rounded-full -left-2 shadow-lg shadow-purple-500/50" />
          </motion.div>
        </div>
      </motion.div>
      {/* Info Panel */}
      <div className="absolute top-8 left-8 text-white/60 font-mono text-sm space-y-2">
        <div>PLATTER STATUS: ONLINE</div>
        <div>ROTATION: ACTIVE</div>
        <div>SPHERE INTENSITY: {Math.round(sphereIntensity * 100)}%</div>
        <div>RGB LIGHTING: ENABLED</div>
      </div>
    </div>
  );
};
export default function IndustrialPlatterDemo() {
  return <IndustrialPlatter />;
}
 
 
Varant 4:
import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
// ============================================================================
// CELESTIAL SPHERE SHADER (for glass sphere interior)
// ============================================================================
interface CelestialSphereShaderProps {
  hue?: number;
  speed?: number;
  zoom?: number;
  particleSize?: number;
  tension?: number;
}
const CelestialSphereShader: React.FC<CelestialSphereShaderProps> = ({
  hue = 200.0,
  speed = 0.3,
  zoom = 1.5,
  particleSize = 3.0,
  tension = 0,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
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
    uniform float u_hue;
    uniform float u_zoom;
    uniform float u_particle_size;
    uniform float u_tension;
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
      vec2 uv = (vUv - 0.5) * 2.0;
      uv *= u_zoom;
      float f = fbm(uv + vec2(u_time * 0.1, u_time * 0.05));
      float t = fbm(uv + f + vec2(u_time * 0.05, u_time * 0.02));
     
      float nebula = pow(t, 2.0);
     
      float hueShift = u_hue / 360.0 + nebula * 0.2 + u_tension * 0.3;
      vec3 color = hsl2rgb(vec3(hueShift, 0.7, 0.5));
      color *= nebula * 2.5;
      float jitter = u_tension * random(vUv + u_time) * 0.3;
      color += vec3(jitter);
      float star_val = random(vUv * 500.0);
      if (star_val > 0.998) {
        float star_brightness = (star_val - 0.998) / 0.002;
        color += vec3(star_brightness * u_particle_size);
      }
      gl_FragColor = vec4(color, 1.0);
    }
  `;
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          u_time: { value: 0.0 },
          u_hue: { value: hue },
          u_zoom: { value: zoom },
          u_particle_size: { value: particleSize },
          u_tension: { value: tension },
        },
        side: THREE.BackSide,
      }),
    [hue, zoom, particleSize, tension]
  );
  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value += delta * speed;
      materialRef.current.uniforms.u_tension.value = tension;
    }
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.25, 64, 64]} />
      <shaderMaterial ref={materialRef} attach="material" {...material} />
    </mesh>
  );
};
// ============================================================================
// MAIN PLATTER COMPONENT
// ============================================================================
const IndustrialPlatter: React.FC = () => {
  const platterRef = useRef<THREE.Group>(null);
  const [tension, setTension] = React.useState(0);
  const [keyVisible, setKeyVisible] = React.useState(false);
  const [leverVisible, setLeverVisible] = React.useState(false);
  useFrame(() => {
    if (platterRef.current) {
      platterRef.current.rotation.y += 0.002;
    }
  });
  const handleKeyToggle = () => {
    setKeyVisible(!keyVisible);
  };
  const handleLeverToggle = () => {
    setLeverVisible(!leverVisible);
  };
  const handleTensionChange = (value: number) => {
    setTension(value);
  };
  return (
    <group ref={platterRef} position={[0, 0, 0]}>
      {/* Main Platter Base */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2, 2, 0.15, 64]} />
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.9}
          roughness={0.2}
          envMapIntensity={1.5}
        />
      </mesh>
      {/* Thick Rim with RGB Lighting */}
      <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.1, 2.1, 0.18, 64]} />
        <meshStandardMaterial
          color="#050505"
          metalness={0.95}
          roughness={0.15}
          emissive="#0088ff"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Center Recessed Track */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.05, 64]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      {/* Glass Sphere with Celestial Interior */}
      <group position={[0, 0.26, 0]}>
        <mesh>
          <sphereGeometry args={[0.26, 64, 64]} />
          <meshPhysicalMaterial
            color="#ffffff"
            metalness={0}
            roughness={0}
            transmission={0.95}
            thickness={0.5}
            ior={1.5}
            transparent
            opacity={0.9}
          />
        </mesh>
        <CelestialSphereShader
          hue={200 + tension * 160}
          speed={0.4 + tension * 0.6}
          zoom={1.2}
          particleSize={4.0}
          tension={tension}
        />
      </group>
      {/* Key Component Placeholder */}
      {keyVisible && (
        <group position={[1.5, 0.15, 0]}>
          <mesh>
            <boxGeometry args={[0.15, 0.15, 0.1]} />
            <meshStandardMaterial
              color="#0a0a0a"
              metalness={0.9}
              roughness={0.2}
              emissive="#00ffff"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      )}
      {/* Lever Component Placeholder */}
      {leverVisible && (
        <group position={[-1.5, 0.15, 0]}>
          <mesh>
            <boxGeometry args={[0.1, 0.3, 0.1]} />
            <meshStandardMaterial
              color="#0a0a0a"
              metalness={0.9}
              roughness={0.2}
              emissive="#00ffff"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      )}
      {/* RGB Rim Lights */}
      <pointLight position={[2, 0.1, 0]} color="#0088ff" intensity={2} distance={3} />
      <pointLight position={[-2, 0.1, 0]} color="#0088ff" intensity={2} distance={3} />
      <pointLight position={[0, 0.1, 2]} color="#00ffff" intensity={2} distance={3} />
      <pointLight position={[0, 0.1, -2]} color="#00ffff" intensity={2} distance={3} />
    </group>
  );
};
// ============================================================================
// SCENE WRAPPER
// ============================================================================
const Scene: React.FC = () => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[3, 3, 3]} fov={50} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.5} />
      <IndustrialPlatter />
      <color attach="background" args={['#000000']} />
    </>
  );
};
// ============================================================================
// MAIN EXPORT
// ============================================================================
export default function IndustrialPlatterDemo() {
  return (
    <div className="relative w-full h-screen bg-black">
      <Canvas shadows>
        <Scene />
      </Canvas>
      <div className="absolute top-4 left-4 text-white font-mono text-sm bg-black/50 p-4 rounded">
        <p>Heavy Industrial Platter</p>
        <p className="text-xs text-gray-400 mt-2">
          Rotating platter with glass sphere and RGB rim lighting
        </p>
      </div>
    </div>
  );
}
 
Variant 1:
import React, { useEffect, useRef, useState } from 'react';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, Color3, Color4, Texture, PBRMaterial, GlowLayer, PointLight, Animation, CubicEase, EasingFunction, DynamicTexture, Mesh, AbstractMesh } from '@babylonjs/core';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Play, Pause, RotateCw } from 'lucide-react';
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
  rgbIntensity = 2.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [keyEmergence, setKeyEmergence] = useState(0);
  const [leverEmergence, setLeverEmergence] = useState(0);
  const [sphereIntensity, setSphereIntensity] = useState(0);
  const [isKeyPressed, setIsKeyPressed] = useState(false);
  const [isLeverActive, setIsLeverActive] = useState(false);
  const sceneRef = useRef<Scene | null>(null);
  const meshesRef = useRef<{
    platter?: Mesh;
    rim?: Mesh;
    keycap?: Mesh;
    lever?: Mesh;
    sphere?: Mesh;
    keyTopHalf?: Mesh;
    keyBottomHalf?: Mesh;
    leverTopHalf?: Mesh;
    leverBottomHalf?: Mesh;
  }>({});
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new Engine(canvasRef.current, true);
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
    // Lighting
    const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.3;
    const rimLight1 = new PointLight('rimLight1', new Vector3(2, 0.5, 2), scene);
    rimLight1.diffuse = new Color3(0.2, 0.4, 0.8);
    rimLight1.intensity = rgbIntensity;
    const rimLight2 = new PointLight('rimLight2', new Vector3(-2, 0.5, -2), scene);
    rimLight2.diffuse = new Color3(0.3, 0.6, 1);
    rimLight2.intensity = rgbIntensity;
    // Glow layer for emissive effects
    const glowLayer = new GlowLayer('glow', scene);
    glowLayer.intensity = 0.8;
    // Main platter base
    const platter = MeshBuilder.CreateCylinder('platter', {
      diameter: 2,
      height: 0.05,
      tessellation: 64,
    }, scene);
    platter.position.y = 0.025;
    meshesRef.current.platter = platter;
    const platterMat = new PBRMaterial('platterMat', scene);
    platterMat.albedoColor = new Color3(0.08, 0.08, 0.1);
    platterMat.metallic = 0.95;
    platterMat.roughness = 0.3;
    platterMat.environmentIntensity = 0.5;
    platter.material = platterMat;
    // Thick rim
    const rim = MeshBuilder.CreateTorus('rim', {
      diameter: 2,
      thickness: rimThickness,
      tessellation: 64,
    }, scene);
    rim.position.y = 0.05;
    rim.rotation.x = Math.PI / 2;
    meshesRef.current.rim = rim;
    const rimMat = new PBRMaterial('rimMat', scene);
    rimMat.albedoColor = new Color3(0.05, 0.05, 0.08);
    rimMat.metallic = 1;
    rimMat.roughness = 0.2;
    rimMat.emissiveColor = new Color3(0.1, 0.3, 0.6);
    rimMat.emissiveIntensity = 0.3;
    rim.material = rimMat;
    // Central recessed track
    const track = MeshBuilder.CreateCylinder('track', {
      diameter: 0.56,
      height: 0.03,
      tessellation: 64,
    }, scene);
    track.position.y = 0.015;
    const trackMat = new PBRMaterial('trackMat', scene);
    trackMat.albedoColor = new Color3(0.06, 0.06, 0.08);
    trackMat.metallic = 0.9;
    trackMat.roughness = 0.4;
    track.material = trackMat;
    // Glass sphere with shader effect
    const sphere = MeshBuilder.CreateSphere('sphere', {
      diameter: 0.52,
      segments: 64,
    }, scene);
    sphere.position.y = 0.26;
    meshesRef.current.sphere = sphere;
    const sphereMat = new PBRMaterial('sphereMat', scene);
    sphereMat.albedoColor = new Color3(1, 1, 1);
    sphereMat.metallic = 0;
    sphereMat.roughness = 0;
    sphereMat.alpha = glassTransparency;
    sphereMat.indexOfRefraction = 1.5;
    sphereMat.subSurface.isRefractionEnabled = true;
    sphereMat.subSurface.indexOfRefraction = 1.5;
    sphere.material = sphereMat;
    // Inner nebula effect
    const innerSphere = MeshBuilder.CreateSphere('innerSphere', {
      diameter: 0.45,
      segments: 32,
    }, scene);
    innerSphere.position.y = 0.26;
    const innerMat = new StandardMaterial('innerMat', scene);
    const dynamicTexture = new DynamicTexture('dynamicTexture', 512, scene);
    const ctx = dynamicTexture.getContext();
   
    const updateNebula = () => {
      const intensity = sphereIntensity;
      ctx.fillStyle = `rgb(${20 + intensity * 100}, ${40 + intensity * 80}, ${100 - intensity * 50})`;
      ctx.fillRect(0, 0, 512, 512);
     
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 20 + 5;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
       
        if (intensity < 0.3) {
          gradient.addColorStop(0, `rgba(100, 150, 255, ${0.8 - intensity})`);
          gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
        } else if (intensity < 0.6) {
          gradient.addColorStop(0, `rgba(150, 200, 100, ${0.8})`);
          gradient.addColorStop(1, 'rgba(150, 200, 100, 0)');
        } else {
          gradient.addColorStop(0, `rgba(255, 100, 50, ${0.9})`);
          gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
        }
       
        ctx.fillStyle = gradient;
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
      }
     
      dynamicTexture.update();
    };
    updateNebula();
    innerMat.diffuseTexture = dynamicTexture;
    innerMat.emissiveTexture = dynamicTexture;
    innerMat.emissiveColor = new Color3(1, 1, 1);
    innerSphere.material = innerMat;
    // Key recess and mechanism
    const keyRecess = MeshBuilder.CreateBox('keyRecess', {
      width: 0.15,
      height: 0.08,
      depth: recessDepth,
    }, scene);
    keyRecess.position = new Vector3(0.92, 0.05, 0);
    keyRecess.isVisible = false;
    const keyTopHalf = MeshBuilder.CreateBox('keyTopHalf', {
      width: 0.15,
      height: 0.04,
      depth: 0.02,
    }, scene);
    keyTopHalf.position = new Vector3(0.92, 0.09, 0);
    meshesRef.current.keyTopHalf = keyTopHalf;
    const keyBottomHalf = MeshBuilder.CreateBox('keyBottomHalf', {
      width: 0.15,
      height: 0.04,
      depth: 0.02,
    }, scene);
    keyBottomHalf.position = new Vector3(0.92, 0.01, 0);
    meshesRef.current.keyBottomHalf = keyBottomHalf;
    const halfMat = new PBRMaterial('halfMat', scene);
    halfMat.albedoColor = new Color3(0.05, 0.05, 0.08);
    halfMat.metallic = 1;
    halfMat.roughness = 0.2;
    keyTopHalf.material = halfMat;
    keyBottomHalf.material = halfMat;
    // Keycap
    const keycap = MeshBuilder.CreateBox('keycap', {
      width: 0.08,
      height: 0.08,
      depth: 0.04,
    }, scene);
    keycap.position = new Vector3(0.92, 0.05, -0.1);
    meshesRef.current.keycap = keycap;
    const keycapMat = new PBRMaterial('keycapMat', scene);
    keycapMat.albedoColor = new Color3(0.1, 0.1, 0.12);
    keycapMat.metallic = 0.8;
    keycapMat.roughness = 0.3;
    keycapMat.emissiveColor = new Color3(0.2, 0.5, 1);
    keycapMat.emissiveIntensity = 0.5;
    keycap.material = keycapMat;
    // Lever recess and mechanism
    const leverTopHalf = MeshBuilder.CreateBox('leverTopHalf', {
      width: 0.15,
      height: 0.04,
      depth: 0.02,
    }, scene);
    leverTopHalf.position = new Vector3(-0.92, 0.09, 0);
    meshesRef.current.leverTopHalf = leverTopHalf;
    const leverBottomHalf = MeshBuilder.CreateBox('leverBottomHalf', {
      width: 0.15,
      height: 0.04,
      depth: 0.02,
    }, scene);
    leverBottomHalf.position = new Vector3(-0.92, 0.01, 0);
    meshesRef.current.leverBottomHalf = leverBottomHalf;
    leverTopHalf.material = halfMat;
    leverBottomHalf.material = halfMat;
    // Lever
    const leverBase = MeshBuilder.CreateBox('leverBase', {
      width: 0.04,
      height: 0.06,
      depth: 0.04,
    }, scene);
    leverBase.position = new Vector3(-0.92, 0.05, -0.1);
    const leverHandle = MeshBuilder.CreateBox('leverHandle', {
      width: 0.02,
      height: 0.08,
      depth: 0.02,
    }, scene);
    leverHandle.position = new Vector3(-0.92, 0.12, -0.1);
    leverHandle.parent = leverBase;
    meshesRef.current.lever = leverBase;
    const leverMat = new PBRMaterial('leverMat', scene);
    leverMat.albedoColor = new Color3(0.15, 0.15, 0.18);
    leverMat.metallic = 0.9;
    leverMat.roughness = 0.2;
    leverMat.emissiveColor = new Color3(0.2, 0.5, 1);
    leverMat.emissiveIntensity = 0.3;
    leverBase.material = leverMat;
    leverHandle.material = leverMat;
    // Rotation animation for platter
    let angle = 0;
    scene.registerBeforeRender(() => {
      angle += 0.002;
      if (platter) platter.rotation.y = angle;
      if (rim) rim.rotation.y = angle;
      if (track) track.rotation.y = angle;
     
      updateNebula();
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
      engine.dispose();
    };
  }, [rimThickness, recessDepth, glassTransparency, rgbIntensity]);
  useEffect(() => {
    const meshes = meshesRef.current;
    if (!meshes.keyTopHalf || !meshes.keyBottomHalf || !meshes.keycap) return;
    const topTarget = 0.09 + keyEmergence * 0.04;
    const bottomTarget = 0.01 - keyEmergence * 0.04;
    const keycapTarget = -0.1 + keyEmergence * 0.12;
    meshes.keyTopHalf.position.y = topTarget;
    meshes.keyBottomHalf.position.y = bottomTarget;
    meshes.keycap.position.z = keycapTarget;
  }, [keyEmergence]);
  useEffect(() => {
    const meshes = meshesRef.current;
    if (!meshes.leverTopHalf || !meshes.leverBottomHalf || !meshes.lever) return;
    const topTarget = 0.09 + leverEmergence * 0.04;
    const bottomTarget = 0.01 - leverEmergence * 0.04;
    const leverTarget = -0.1 + leverEmergence * 0.12;
    meshes.leverTopHalf.position.y = topTarget;
    meshes.leverBottomHalf.position.y = bottomTarget;
    meshes.lever.position.z = leverTarget;
  }, [leverEmergence]);
  const handleKeyPress = () => {
    setIsKeyPressed(!isKeyPressed);
    const meshes = meshesRef.current;
    if (meshes.keycap) {
      const currentY = meshes.keycap.position.y;
      meshes.keycap.position.y = isKeyPressed ? 0.05 : 0.03;
      setTimeout(() => {
        if (meshes.keycap) meshes.keycap.position.y = currentY;
      }, 100);
    }
  };
  const handleLeverToggle = () => {
    setIsLeverActive(!isLeverActive);
    const meshes = meshesRef.current;
    if (meshes.lever) {
      meshes.lever.rotation.x = isLeverActive ? 0 : -Math.PI / 6;
    }
  };
  return (
    <div className="w-full h-screen bg-background flex flex-col">
      <canvas ref={canvasRef} className="flex-1 w-full" />
     
      <Card className="absolute bottom-4 left-4 right-4 p-4 bg-background/95 backdrop-blur border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Key Emergence</label>
            <Slider
              value={[keyEmergence]}
              onValueChange={(v) => setKeyEmergence(v[0])}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
            <Button
              onClick={handleKeyPress}
              className="w-full"
              variant={isKeyPressed ? "default" : "outline"}
            >
              <Play className="w-4 h-4 mr-2" />
              Press Key
            </Button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Lever Emergence</label>
            <Slider
              value={[leverEmergence]}
              onValueChange={(v) => setLeverEmergence(v[0])}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
            <Button
              onClick={handleLeverToggle}
              className="w-full"
              variant={isLeverActive ? "default" : "outline"}
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Toggle Lever
            </Button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Sphere Intensity</label>
            <Slider
              value={[sphereIntensity]}
              onValueChange={(v) => setSphereIntensity(v[0])}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              {sphereIntensity < 0.3 ? 'Calm Blue' : sphereIntensity < 0.6 ? 'Yellow/Green' : 'Violent Red'}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Controls</label>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Left click + drag to rotate</div>
              <div>• Scroll to zoom</div>
              <div>• Platter rotates continuously</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
export default function IndustrialPlatterDemo() {
  return <IndustrialPlatter rimThickness={0.18} recessDepth={0.12} glassTransparency={0.15} rgbIntensity={2.0} />;
}
 
 
Variant 2:
"use client"
import * as React from "react"
import { motion, HTMLMotionProps, Variants } from "framer-motion"
import { Play, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"
// Babylon.js imports
import * as BABYLON from "@babylonjs/core"
import "@babylonjs/loaders"
interface IndustrialPlatterProps {
  className?: string
}
const IndustrialPlatter: React.FC<IndustrialPlatterProps> = ({ className = "" }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const engineRef = React.useRef<BABYLON.Engine | null>(null)
  const sceneRef = React.useRef<BABYLON.Scene | null>(null)
  const [keyActive, setKeyActive] = React.useState(false)
  const [leverActive, setLeverActive] = React.useState(false)
  const [rimOpen, setRimOpen] = React.useState(false)
  const [leverRimOpen, setLeverRimOpen] = React.useState(false)
  const [sphereIntensity, setSphereIntensity] = React.useState(0)
  React.useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    })
    engineRef.current = engine
    const scene = new BABYLON.Scene(engine)
    sceneRef.current = scene
    scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.08, 1)
    // Camera setup - 3/4 angle slightly above
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      Math.PI / 4,
      Math.PI / 3,
      8,
      new BABYLON.Vector3(0, 0, 0),
      scene
    )
    camera.attachControl(canvas, true)
    camera.lowerRadiusLimit = 5
    camera.upperRadiusLimit = 15
    camera.lowerBetaLimit = 0.1
    camera.upperBetaLimit = Math.PI / 2.2
    // Lighting setup
    const hemiLight = new BABYLON.HemisphericLight(
      "hemiLight",
      new BABYLON.Vector3(0, 1, 0),
      scene
    )
    hemiLight.intensity = 0.3
    const dirLight = new BABYLON.DirectionalLight(
      "dirLight",
      new BABYLON.Vector3(-1, -2, -1),
      scene
    )
    dirLight.intensity = 0.5
    // Rim light for dramatic effect
    const rimLight = new BABYLON.PointLight(
      "rimLight",
      new BABYLON.Vector3(0, 2, 0),
      scene
    )
    rimLight.intensity = 2
    rimLight.diffuse = new BABYLON.Color3(0.2, 0.4, 0.8)
    // Ground plane (invisible)
    const ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: 20, height: 20 },
      scene
    )
    ground.position.y = -0.01
    ground.isVisible = false
    // Main platter base
    const platter = BABYLON.MeshBuilder.CreateCylinder(
      "platter",
      { diameter: 4, height: 0.15, tessellation: 64 },
      scene
    )
    platter.position.y = 0.075
    const platterMaterial = new BABYLON.PBRMaterial("platterMat", scene)
    platterMaterial.albedoColor = new BABYLON.Color3(0.08, 0.08, 0.1)
    platterMaterial.metallic = 0.95
    platterMaterial.roughness = 0.3
    platterMaterial.environmentIntensity = 0.5
    platter.material = platterMaterial
    // Thick rim with emissive glow
    const rim = BABYLON.MeshBuilder.CreateTorus(
      "rim",
      { diameter: 4.3, thickness: 0.18, tessellation: 64 },
      scene
    )
    rim.position.y = 0.075
    const rimMaterial = new BABYLON.PBRMaterial("rimMat", scene)
    rimMaterial.albedoColor = new BABYLON.Color3(0.05, 0.05, 0.08)
    rimMaterial.metallic = 1
    rimMaterial.roughness = 0.2
    rimMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.6)
    rimMaterial.emissiveIntensity = 0.5
    rim.material = rimMaterial
    // Central recessed track
    const track = BABYLON.MeshBuilder.CreateCylinder(
      "track",
      { diameter: 0.6, height: 0.05, tessellation: 64 },
      scene
    )
    track.position.y = 0.025
    const trackMaterial = new BABYLON.PBRMaterial("trackMat", scene)
    trackMaterial.albedoColor = new BABYLON.Color3(0.06, 0.06, 0.08)
    trackMaterial.metallic = 0.9
    trackMaterial.roughness = 0.4
    track.material = trackMaterial
    // Glass sphere with celestial shader effect
    const sphere = BABYLON.MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 0.52, segments: 64 },
      scene
    )
    sphere.position.y = 0.26
    const sphereMaterial = new BABYLON.PBRMaterial("sphereMat", scene)
    sphereMaterial.albedoColor = new BABYLON.Color3(0.9, 0.95, 1)
    sphereMaterial.metallic = 0
    sphereMaterial.roughness = 0
    sphereMaterial.alpha = 0.15
    sphereMaterial.indexOfRefraction = 1.5
    sphereMaterial.subSurface.isRefractionEnabled = true
    sphereMaterial.subSurface.indexOfRefraction = 1.5
    sphere.material = sphereMaterial
    // Inner glow sphere for celestial effect
    const innerSphere = BABYLON.MeshBuilder.CreateSphere(
      "innerSphere",
      { diameter: 0.45, segments: 32 },
      scene
    )
    innerSphere.position.y = 0.26
    const innerMaterial = new BABYLON.PBRMaterial("innerMat", scene)
    innerMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.8)
    innerMaterial.emissiveIntensity = 1
    innerMaterial.alpha = 0.6
    innerMaterial.alphaMode = BABYLON.Engine.ALPHA_ADD
    innerSphere.material = innerMaterial
    // Key recess components
    const keyRecessTop = BABYLON.MeshBuilder.CreateBox(
      "keyRecessTop",
      { width: 0.15, height: 0.09, depth: 0.3 },
      scene
    )
    keyRecessTop.position = new BABYLON.Vector3(2, 0.12, 0)
    const keyRecessBottom = BABYLON.MeshBuilder.CreateBox(
      "keyRecessBottom",
      { width: 0.15, height: 0.09, depth: 0.3 },
      scene
    )
    keyRecessBottom.position = new BABYLON.Vector3(2, 0.03, 0)
    const recessMaterial = new BABYLON.PBRMaterial("recessMat", scene)
    recessMaterial.albedoColor = new BABYLON.Color3(0.05, 0.05, 0.08)
    recessMaterial.metallic = 1
    recessMaterial.roughness = 0.3
    recessMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.7)
    recessMaterial.emissiveIntensity = 0.3
    keyRecessTop.material = recessMaterial
    keyRecessBottom.material = recessMaterial
    // Key button
    const keyButton = BABYLON.MeshBuilder.CreateBox(
      "keyButton",
      { width: 0.12, height: 0.12, depth: 0.12 },
      scene
    )
    keyButton.position = new BABYLON.Vector3(2, 0.075, 0)
    const keyMaterial = new BABYLON.PBRMaterial("keyMat", scene)
    keyMaterial.albedoColor = new BABYLON.Color3(0.1, 0.1, 0.12)
    keyMaterial.metallic = 0.8
    keyMaterial.roughness = 0.2
    keyMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.5, 0.9)
    keyMaterial.emissiveIntensity = 0.8
    keyButton.material = keyMaterial
    // Lever recess components
    const leverRecessTop = BABYLON.MeshBuilder.CreateBox(
      "leverRecessTop",
      { width: 0.15, height: 0.09, depth: 0.3 },
      scene
    )
    leverRecessTop.position = new BABYLON.Vector3(-2, 0.12, 0)
    const leverRecessBottom = BABYLON.MeshBuilder.CreateBox(
      "leverRecessBottom",
      { width: 0.15, height: 0.09, depth: 0.3 },
      scene
    )
    leverRecessBottom.position = new BABYLON.Vector3(-2, 0.03, 0)
    leverRecessTop.material = recessMaterial
    leverRecessBottom.material = recessMaterial
    // Lever base
    const leverBase = BABYLON.MeshBuilder.CreateCylinder(
      "leverBase",
      { diameter: 0.08, height: 0.05, tessellation: 32 },
      scene
    )
    leverBase.position = new BABYLON.Vector3(-2, 0.075, 0)
    const leverHandle = BABYLON.MeshBuilder.CreateCylinder(
      "leverHandle",
      { diameter: 0.03, height: 0.25, tessellation: 16 },
      scene
    )
    leverHandle.position = new BABYLON.Vector3(-2, 0.2, 0)
    const leverMaterial = new BABYLON.PBRMaterial("leverMat", scene)
    leverMaterial.albedoColor = new BABYLON.Color3(0.1, 0.1, 0.12)
    leverMaterial.metallic = 0.9
    leverMaterial.roughness = 0.2
    leverMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.5, 0.9)
    leverMaterial.emissiveIntensity = 0.5
    leverBase.material = leverMaterial
    leverHandle.material = leverMaterial
    // Animation loop
    let rotationSpeed = 0.002
    scene.registerBeforeRender(() => {
      platter.rotation.y += rotationSpeed
      rim.rotation.y += rotationSpeed
      track.rotation.y += rotationSpeed
      // Animate inner sphere for celestial effect
      const time = performance.now() * 0.001
      const intensity = sphereIntensity
     
      if (innerMaterial.emissiveColor) {
        if (intensity < 0.3) {
          innerMaterial.emissiveColor = new BABYLON.Color3(
            0.2 + Math.sin(time) * 0.1,
            0.4 + Math.sin(time * 1.3) * 0.1,
            0.8 + Math.sin(time * 0.7) * 0.1
          )
        } else if (intensity < 0.6) {
          innerMaterial.emissiveColor = new BABYLON.Color3(
            0.4 + Math.sin(time * 2) * 0.2,
            0.6 + Math.sin(time * 1.5) * 0.2,
            0.3 + Math.sin(time) * 0.1
          )
        } else {
          innerMaterial.emissiveColor = new BABYLON.Color3(
            0.8 + Math.sin(time * 3) * 0.2,
            0.3 + Math.sin(time * 2) * 0.2,
            0.1
          )
        }
      }
      innerSphere.position.y = 0.26 + Math.sin(time * 2) * 0.01 * intensity
      innerSphere.scaling.setAll(1 + Math.sin(time * 3) * 0.05 * intensity)
    })
    engine.runRenderLoop(() => {
      scene.render()
    })
    const handleResize = () => {
      engine.resize()
    }
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      engine.dispose()
    }
  }, [])
  const handleKeyClick = () => {
    setRimOpen(!rimOpen)
    setTimeout(() => setKeyActive(!keyActive), 300)
  }
  const handleLeverClick = () => {
    setLeverRimOpen(!leverRimOpen)
    setTimeout(() => setLeverActive(!leverActive), 300)
  }
  const handleSphereIntensityChange = (value: number) => {
    setSphereIntensity(value)
  }
  return (
    <div className={cn("relative w-full h-screen bg-background", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
     
      {/* Control Panel */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 items-center bg-background/80 backdrop-blur-sm border border-border rounded-lg p-4">
        <KeyButton active={keyActive} onClick={handleKeyClick} />
        <LeverSwitch active={leverActive} onClick={handleLeverClick} />
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Sphere Intensity</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sphereIntensity}
            onChange={(e) => handleSphereIntensityChange(parseFloat(e.target.value))}
            className="w-32"
          />
        </div>
      </div>
    </div>
  )
}
interface KeyButtonProps {
  active?: boolean
  onClick?: () => void
}
const KeyButton: React.FC<KeyButtonProps> = ({ active = false, onClick }) => {
  return (
    <motion.button
      className="relative w-16 h-16 bg-zinc-900 border-2 border-zinc-700 rounded-lg overflow-hidden"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
        animate={{
          opacity: active ? 1 : 0.3,
        }}
        transition={{ duration: 0.3 }}
      />
     
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{
          y: active ? 4 : 0,
        }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <Play className="w-6 h-6 text-blue-400" fill="currentColor" />
      </motion.div>
      <motion.div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
        animate={{
          opacity: active ? 1 : 0,
          scaleX: active ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  )
}
interface LeverSwitchProps {
  active?: boolean
  onClick?: () => void
}
const LeverSwitch: React.FC<LeverSwitchProps> = ({ active = false, onClick }) => {
  return (
    <motion.button
      className="relative w-16 h-20 bg-zinc-900 border-2 border-zinc-700 rounded-lg overflow-hidden"
      onClick={onClick}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
        animate={{
          opacity: active ? 1 : 0.3,
        }}
        transition={{ duration: 0.3 }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-8 h-12">
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-3 bg-zinc-700 rounded-sm"
          />
         
          <motion.div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-8 bg-gradient-to-t from-blue-400 to-cyan-400 rounded-full origin-bottom"
            animate={{
              rotateZ: active ? -30 : 30,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50"
            animate={{
              x: active ? -8 : 8,
              y: active ? -2 : 2,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
        animate={{
          opacity: active ? 1 : 0,
          scaleX: active ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  )
}
export default function IndustrialPlatterDemo() {
  return (
    <div className="w-full h-screen bg-zinc-950">
      <IndustrialPlatter />
    </div>
  )
}
 
 
Variant 3:
import React, { useRef, useEffect, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { Play } from 'lucide-react';
interface MechanicalButtonProps {
  isPressed: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  glowColor: string;
}
const MechanicalButton: React.FC<MechanicalButtonProps> = ({ isPressed, onPress, icon, glowColor }) => {
  return (
    <button
      onClick={onPress}
      className="relative w-16 h-16 rounded-lg bg-zinc-900 border-2 border-zinc-700 transition-all duration-200 overflow-hidden group"
      style={{
        transform: isPressed ? 'translateY(4px)' : 'translateY(0)',
        boxShadow: isPressed
          ? `inset 0 2px 8px rgba(0,0,0,0.8), 0 0 20px ${glowColor}40`
          : `0 4px 0 #27272a, 0 0 30px ${glowColor}60`,
      }}
    >
      <div
        className="absolute inset-0 opacity-20 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at center, ${glowColor}, transparent 70%)`,
          opacity: isPressed ? 0.6 : 0.3,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="transition-all duration-200"
          style={{
            color: glowColor,
            filter: `drop-shadow(0 0 8px ${glowColor})`,
            transform: isPressed ? 'scale(0.9)' : 'scale(1)',
          }}
        >
          {icon}
        </div>
      </div>
      <div className="absolute inset-0 border border-zinc-600 rounded-lg pointer-events-none" />
      <div
        className="absolute bottom-0 left-0 right-0 h-1 transition-all duration-200"
        style={{
          background: `linear-gradient(to right, transparent, ${glowColor}, transparent)`,
          opacity: isPressed ? 1 : 0.5,
        }}
      />
    </button>
  );
};
interface MechanicalLeverProps {
  isActive: boolean;
  onToggle: () => void;
  glowColor: string;
}
const MechanicalLever: React.FC<MechanicalLeverProps> = ({ isActive, onToggle, glowColor }) => {
  return (
    <button
      onClick={onToggle}
      className="relative w-20 h-32 rounded-lg bg-zinc-900 border-2 border-zinc-700 overflow-hidden"
      style={{
        boxShadow: `0 4px 0 #27272a, 0 0 30px ${glowColor}40`,
      }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at center, ${glowColor}, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="w-4 h-16 bg-zinc-700 rounded-full transition-all duration-500 ease-out"
          style={{
            transform: isActive ? 'rotate(-30deg)' : 'rotate(30deg)',
            transformOrigin: 'bottom center',
            boxShadow: `0 0 10px ${glowColor}80`,
          }}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full transition-all duration-500"
            style={{
              background: isActive ? glowColor : '#52525b',
              boxShadow: isActive ? `0 0 20px ${glowColor}` : 'none',
            }}
          />
        </div>
      </div>
      <div
        className="absolute bottom-2 left-0 right-0 h-1 transition-all duration-500"
        style={{
          background: `linear-gradient(to right, transparent, ${glowColor}, transparent)`,
          opacity: isActive ? 1 : 0.3,
        }}
      />
    </button>
  );
};
interface IndustrialPlatterProps {
  tension?: number;
}
const IndustrialPlatter: React.FC<IndustrialPlatterProps> = ({ tension = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [leverActive, setLeverActive] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);
  const [leverVisible, setLeverVisible] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.04, 0.04, 0.04, 1);
    const camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 6, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 4;
    camera.upperRadiusLimit = 10;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI / 2;
    const light = new BABYLON.HemisphericLight('hemiLight', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.3;
    const dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.position = new BABYLON.Vector3(5, 10, 5);
    dirLight.intensity = 0.5;
    const platter = BABYLON.MeshBuilder.CreateCylinder('platter', {
      diameter: 4,
      height: 0.15,
      tessellation: 64
    }, scene);
    platter.position.y = 0;
    const platterMaterial = new BABYLON.PBRMetallicRoughnessMaterial('platterMat', scene);
    platterMaterial.baseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    platterMaterial.metallic = 0.9;
    platterMaterial.roughness = 0.3;
    platter.material = platterMaterial;
    const rim = BABYLON.MeshBuilder.CreateTorus('rim', {
      diameter: 4,
      thickness: 0.18,
      tessellation: 64
    }, scene);
    rim.position.y = 0.075;
    const rimMaterial = new BABYLON.PBRMetallicRoughnessMaterial('rimMat', scene);
    rimMaterial.baseColor = new BABYLON.Color3(0.04, 0.04, 0.04);
    rimMaterial.metallic = 0.95;
    rimMaterial.roughness = 0.2;
    rimMaterial.emissiveColor = new BABYLON.Color3(0, 0.4, 1);
    rim.material = rimMaterial;
    const rimLights: BABYLON.PointLight[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const light = new BABYLON.PointLight(`rimLight${i}`, new BABYLON.Vector3(
        Math.cos(angle) * 2,
        0.1,
        Math.sin(angle) * 2
      ), scene);
      light.intensity = 0.5;
      light.diffuse = new BABYLON.Color3(0, 0.67, 1);
      light.range = 3;
      rimLights.push(light);
    }
    const track = BABYLON.MeshBuilder.CreateCylinder('track', {
      diameter: 0.6,
      height: 0.05,
      tessellation: 64
    }, scene);
    track.position.y = 0.1;
    const trackMaterial = new BABYLON.PBRMetallicRoughnessMaterial('trackMat', scene);
    trackMaterial.baseColor = new BABYLON.Color3(0.04, 0.04, 0.04);
    trackMaterial.metallic = 0.8;
    trackMaterial.roughness = 0.4;
    track.material = trackMaterial;
    const nebulaShader = `
      precision highp float;
      varying vec2 vUV;
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform float cloudDensity;
      uniform float glowIntensity;
      uniform float tensionLevel;
      float random(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 151.7182))) * 43758.5453);
      }
      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(random(i + vec3(0, 0, 0)), random(i + vec3(1, 0, 0)), u.x),
              mix(random(i + vec3(0, 1, 0)), random(i + vec3(1, 1, 0)), u.x), u.y),
          mix(mix(random(i + vec3(0, 0, 1)), random(i + vec3(1, 0, 1)), u.x),
              mix(random(i + vec3(0, 1, 1)), random(i + vec3(1, 1, 1)), u.x), u.y),
          u.z
        );
      }
      float fbm(vec3 p) {
        float v = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 6; i++) {
          v += amp * noise(p);
          p *= 2.0;
          amp *= 0.5;
        }
        return v;
      }
      void main() {
        vec2 uv = vUV * 2.0 - 1.0;
        float d = 1.0 - dot(uv, uv);
        if (d < 0.0) discard;
        vec3 pos = vec3(uv, sqrt(d));
        float jitter = tensionLevel * 0.05 * sin(time * 20.0);
        vec3 coord = pos * cloudDensity + time * 0.1 + jitter;
        float c = fbm(coord);
       
        vec3 nebula = mix(color1, color2, smoothstep(0.4, 0.6, c));
        float fresnel = pow(1.0 - dot(normalize(pos), vec3(0, 0, 1)), 2.0) * glowIntensity;
        vec3 glow = fresnel * color2;
        gl_FragColor = vec4(nebula + glow, 1.0);
      }
    `;
    BABYLON.Effect.ShadersStore['nebulaFragmentShader'] = nebulaShader;
    const sphere = BABYLON.MeshBuilder.CreateSphere('sphere', {
      diameter: 0.52,
      segments: 64
    }, scene);
    sphere.position.y = 0.4;
    const shaderMaterial = new BABYLON.ShaderMaterial('nebulaShader', scene, {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        varying vec2 vUV;
        void main() {
          vUV = uv;
          gl_Position = worldViewProjection * vec4(position, 1.0);
        }
      `,
      fragmentSource: nebulaShader,
    }, {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'time', 'color1', 'color2', 'cloudDensity', 'glowIntensity', 'tensionLevel']
    });
    shaderMaterial.setFloat('time', 0);
    shaderMaterial.setColor3('color1', new BABYLON.Color3(0.03, 0.18, 0.29));
    shaderMaterial.setColor3('color2', new BABYLON.Color3(0.49, 0.83, 0.99));
    shaderMaterial.setFloat('cloudDensity', 2.5);
    shaderMaterial.setFloat('glowIntensity', 1.5);
    shaderMaterial.setFloat('tensionLevel', 0);
    shaderMaterial.backFaceCulling = false;
    const innerSphere = BABYLON.MeshBuilder.CreateSphere('innerSphere', {
      diameter: 0.50,
      segments: 64
    }, scene);
    innerSphere.position.y = 0.4;
    innerSphere.material = shaderMaterial;
    const glassMaterial = new BABYLON.PBRMaterial('glassMat', scene);
    glassMaterial.albedoColor = new BABYLON.Color3(1, 1, 1);
    glassMaterial.metallic = 0;
    glassMaterial.roughness = 0.05;
    glassMaterial.alpha = 0.3;
    glassMaterial.indexOfRefraction = 1.5;
    glassMaterial.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
    sphere.material = glassMaterial;
    const ground = BABYLON.MeshBuilder.CreateGround('ground', {
      width: 20,
      height: 20
    }, scene);
    ground.position.y = -0.075;
    const groundMaterial = new BABYLON.PBRMetallicRoughnessMaterial('groundMat', scene);
    groundMaterial.baseColor = new BABYLON.Color3(0.04, 0.04, 0.04);
    groundMaterial.metallic = 0.5;
    groundMaterial.roughness = 0.8;
    ground.material = groundMaterial;
    let time = 0;
    engine.runRenderLoop(() => {
      time += 0.016;
     
      platter.rotation.y += 0.003;
      rim.rotation.y += 0.003;
      track.rotation.y += 0.003;
      shaderMaterial.setFloat('time', time);
      shaderMaterial.setFloat('tensionLevel', tension);
      const tensionNormalized = Math.min(tension, 1);
      if (tensionNormalized < 0.5) {
        const t = tensionNormalized * 2;
        shaderMaterial.setColor3('color1',
          BABYLON.Color3.Lerp(
            new BABYLON.Color3(0.03, 0.18, 0.29),
            new BABYLON.Color3(0.98, 0.75, 0.14),
            t
          )
        );
        shaderMaterial.setColor3('color2',
          BABYLON.Color3.Lerp(
            new BABYLON.Color3(0.49, 0.83, 0.99),
            new BABYLON.Color3(0.99, 0.88, 0.28),
            t
          )
        );
      } else {
        const t = (tensionNormalized - 0.5) * 2;
        shaderMaterial.setColor3('color1',
          BABYLON.Color3.Lerp(
            new BABYLON.Color3(0.98, 0.75, 0.14),
            new BABYLON.Color3(0.86, 0.15, 0.15),
            t
          )
        );
        shaderMaterial.setColor3('color2',
          BABYLON.Color3.Lerp(
            new BABYLON.Color3(0.99, 0.88, 0.28),
            new BABYLON.Color3(0.94, 0.27, 0.27),
            t
          )
        );
      }
      rimLights.forEach((light, i) => {
        const offset = (i / rimLights.length) * Math.PI * 2;
        light.intensity = 0.5 + Math.sin(time * 2 + offset) * 0.3;
      });
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
  }, [tension]);
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
     
      <div className="absolute top-8 left-8 space-y-4">
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium">Button Recess</span>
            <button
              onClick={() => setButtonVisible(!buttonVisible)}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded transition-colors"
            >
              {buttonVisible ? 'Close' : 'Open'}
            </button>
          </div>
          <div
            className="overflow-hidden transition-all duration-500 ease-out"
            style={{
              maxHeight: buttonVisible ? '100px' : '0px',
              opacity: buttonVisible ? 1 : 0,
            }}
          >
            <div className="pt-2 flex justify-center">
              <MechanicalButton
                isPressed={buttonPressed}
                onPress={() => setButtonPressed(!buttonPressed)}
                icon={<Play size={24} fill="currentColor" />}
                glowColor="#00aaff"
              />
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium">Lever Recess</span>
            <button
              onClick={() => setLeverVisible(!leverVisible)}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded transition-colors"
            >
              {leverVisible ? 'Close' : 'Open'}
            </button>
          </div>
          <div
            className="overflow-hidden transition-all duration-500 ease-out"
            style={{
              maxHeight: leverVisible ? '150px' : '0px',
              opacity: leverVisible ? 1 : 0,
            }}
          >
            <div className="pt-2 flex justify-center">
              <MechanicalLever
                isActive={leverActive}
                onToggle={() => setLeverActive(!leverActive)}
                glowColor="#00aaff"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-8 right-8 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-lg p-6 w-80">
        <h2 className="text-white text-lg font-bold mb-4">Industrial Platter</h2>
        <div className="space-y-4 text-white text-sm">
          <div>
            <p className="text-zinc-400 mb-2">Heavy black metal construction</p>
            <p className="text-zinc-400 mb-2">Thick rim with RGB lighting</p>
            <p className="text-zinc-400 mb-2">Central glass sphere with nebula shader</p>
          </div>
          <div className="pt-4 border-t border-zinc-700">
            <p className="text-xs text-zinc-500">
              Mechanical button and lever controls emerge from rim recesses with garage-door split mechanism
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default function Demo() {
  const [tension, setTension] = useState(0);
  return (
    <div className="relative w-full h-screen">
      <IndustrialPlatter tension={tension} />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-lg p-4 w-96">
        <label className="text-white text-sm font-medium block mb-2">
          Tension Level: {tension.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={tension}
          onChange={(e) => setTension(parseFloat(e.target.value))}
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
        <p className="text-xs text-zinc-400 mt-2">
          Adjust tension to see the sphere transition from blue → yellow → red with increasing chaos
        </p>
      </div>
    </div>
  );
}
 
 
 
Are any. ofthese in any way... Good? Variant 3 looks like. ithas some real potential