import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HandData, HandGesture, ParticleSettings, ShapeType } from '../types';
import { generateShapePositions, MAX_PARTICLES } from '../utils/shapes';

interface ParticleCanvasProps {
  shape: ShapeType;
  settings: ParticleSettings;
  handData: HandData;
}

const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ shape, settings, handData }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Mutable references for Three.js objects to avoid re-creation on render
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const requestRef = useRef<number>(0);

  // Physics state buffers
  const velocitiesRef = useRef<Float32Array>(new Float32Array(MAX_PARTICLES * 3));
  const targetPositionsRef = useRef<Float32Array>(new Float32Array(MAX_PARTICLES * 3));
  
  // Hand state Ref to access latest data inside animation loop without stale closures
  const handDataRef = useRef<HandData>(handData);
  const settingsRef = useRef<ParticleSettings>(settings);

  // Update refs when props change
  useEffect(() => {
    handDataRef.current = handData;
  }, [handData]);

  useEffect(() => {
    settingsRef.current = settings;
    // Update Draw Range based on particle count
    if (geometryRef.current) {
        geometryRef.current.setDrawRange(0, settings.particleCount);
    }
  }, [settings]);

  // Handle Shape Change
  useEffect(() => {
    const newTargets = generateShapePositions(shape, MAX_PARTICLES);
    targetPositionsRef.current = newTargets;
    
    // If it's the first load (all zeros), snap positions to target
    if (geometryRef.current) {
      const positions = geometryRef.current.attributes.position.array as Float32Array;
      // If first point is 0,0,0, assume init.
      if (positions[0] === 0 && positions[1] === 0 && positions[2] === 0) {
        positions.set(newTargets);
        geometryRef.current.attributes.position.needsUpdate = true;
      }
    }
  }, [shape]);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.002);
    sceneRef.current = scene;

    // 2. Setup Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 60;
    cameraRef.current = camera;

    // 3. Setup Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Setup Particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3); // Start at 0,0,0
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Color attribute could be added for more fancy effects
    
    const sprite = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/disc.png');

    const material = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.5,
      map: sprite,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      opacity: 0.8
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    geometryRef.current = geometry;
    materialRef.current = material;
    pointsRef.current = points;

    // Initial shape generation
    const initialTargets = generateShapePositions(shape, MAX_PARTICLES);
    targetPositionsRef.current = initialTargets;
    positions.set(initialTargets);
    geometry.setDrawRange(0, settingsRef.current.particleCount);

    // 5. Animation Loop
    const animate = () => {
      const currentSettings = settingsRef.current;
      const currentHand = handDataRef.current;
      
      const positions = geometry.attributes.position.array as Float32Array;
      const velocities = velocitiesRef.current;
      const targets = targetPositionsRef.current;

      const activeCount = currentSettings.particleCount;
      const damp = currentSettings.damping;
      const returnSpeed = currentSettings.returnSpeed;
      const forceStrength = currentSettings.forceStrength;
      const interactionRadius = currentSettings.interactionRadius;

      // Map hand position to world space
      // Assume plane at z=0, view width at z=0 is approx dist * tan(fov/2) * 2 * aspect
      // For z=0 and camera z=60:
      const vFOV = THREE.MathUtils.degToRad(camera.fov);
      const height = 2 * Math.tan(vFOV / 2) * 60;
      const width = height * camera.aspect;

      const handX = (currentHand.x - 0.5) * width;
      const handY = -(currentHand.y - 0.5) * height; // Flip Y
      const handZ = 0; // Hand plane

      for (let i = 0; i < activeCount; i++) {
        const i3 = i * 3;
        
        const px = positions[i3];
        const py = positions[i3 + 1];
        const pz = positions[i3 + 2];

        const tx = targets[i3];
        const ty = targets[i3 + 1];
        const tz = targets[i3 + 2];

        let vx = velocities[i3];
        let vy = velocities[i3 + 1];
        let vz = velocities[i3 + 2];

        // 1. Return Force (Spring to target)
        vx += (tx - px) * returnSpeed;
        vy += (ty - py) * returnSpeed;
        vz += (tz - pz) * returnSpeed;

        // 2. Hand Interaction
        if (currentHand.detected) {
          const dx = px - handX;
          const dy = py - handY;
          const dz = pz - handZ;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < interactionRadius * interactionRadius) {
            const dist = Math.sqrt(distSq);
            // Normalized direction
            const nx = dx / dist;
            const ny = dy / dist;
            const nz = dz / dist;

            // Factor based on distance (stronger closer)
            const factor = (1 - dist / interactionRadius);
            
            if (currentHand.gesture === HandGesture.Open) {
              // Repel
              const force = forceStrength * factor * 2.0;
              vx += nx * force;
              vy += ny * force;
              vz += nz * force;
            } else if (currentHand.gesture === HandGesture.Fist) {
              // Attract
              const force = -forceStrength * factor * 3.0;
              vx += nx * force;
              vy += ny * force;
              vz += nz * force;
            }
          }
        }

        // 3. Damping
        vx *= damp;
        vy *= damp;
        vz *= damp;

        // 4. Update Position
        positions[i3] = px + vx;
        positions[i3 + 1] = py + vy;
        positions[i3 + 2] = pz + vz;

        // Store velocity
        velocities[i3] = vx;
        velocities[i3 + 1] = vy;
        velocities[i3 + 2] = vz;
      }

      geometry.attributes.position.needsUpdate = true;
      
      // Rotate entire system slowly
      if (pointsRef.current) {
        pointsRef.current.rotation.y += 0.001;
      }

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
      mountRef.current?.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []); // Run once on mount

  return <div ref={mountRef} className="absolute inset-0 -z-10" />;
};

export default ParticleCanvas;