import { ShapeType } from '../types';

export const MAX_PARTICLES = 40000;

const getRandomPointInSphere = (r: number) => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const radius = Math.cbrt(Math.random()) * r; // Uniform distribution in volume
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi)
  };
};

const getPointOnSphereSurface = (r: number) => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi)
  };
};

export const generateShapePositions = (type: ShapeType, count: number): Float32Array => {
  const positions = new Float32Array(MAX_PARTICLES * 3);
  
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, z = 0;
    const idx = i * 3;

    switch (type) {
      case ShapeType.Sphere: {
        const p = getPointOnSphereSurface(25);
        x = p.x;
        y = p.y;
        z = p.z;
        break;
      }
      case ShapeType.Cube: {
        const size = 35;
        x = (Math.random() - 0.5) * size;
        y = (Math.random() - 0.5) * size;
        z = (Math.random() - 0.5) * size;
        break;
      }
      case ShapeType.Heart: {
        // Parametric heart
        // x = 16sin^3(t)
        // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        const t = Math.random() * Math.PI * 2;
        const scale = 1.2;
        
        // Add some volume
        const r = Math.random();
        // Spread particles slightly inside
        const vol = Math.sqrt(r); 
        
        x = scale * 16 * Math.pow(Math.sin(t), 3) * vol;
        y = scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * vol;
        z = (Math.random() - 0.5) * 10 * vol;
        
        // Rotate to stand upright
        // y is currently up/down in equation, but let's shift it up a bit
        y += 5; 
        break;
      }
      case ShapeType.Spiral: {
        const angle = i * 0.1;
        const radius = i * 0.005; // Expanding radius
        const height = (i / count) * 60 - 30;
        
        // Re-map to nice galaxy spiral
        const arm = i % 3; // 3 arms
        const spin = i * 0.002;
        const r = 2 + (i / count) * 30;
        
        x = r * Math.cos(spin + arm * (Math.PI * 2 / 3));
        y = (Math.random() - 0.5) * 10; // Thickness
        z = r * Math.sin(spin + arm * (Math.PI * 2 / 3));
        
        // Or simple helix
        x = 20 * Math.cos(i * 0.05);
        z = 20 * Math.sin(i * 0.05);
        y = (i / count) * 60 - 30;
        break;
      }
    }

    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
  }
  
  // Fill the rest with hidden points (at 0,0,0 or far away)
  for (let i = count; i < MAX_PARTICLES; i++) {
    positions[i * 3] = 9999;
    positions[i * 3 + 1] = 9999;
    positions[i * 3 + 2] = 9999;
  }

  return positions;
};