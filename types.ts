export enum ShapeType {
  Sphere = 'Sphere',
  Cube = 'Cube',
  Heart = 'Heart',
  Spiral = 'Spiral'
}

export enum HandGesture {
  None = 'None',
  Open = 'Open',
  Fist = 'Fist'
}

export interface ParticleSettings {
  particleCount: number;
  forceStrength: number;
  interactionRadius: number;
  damping: number;
  returnSpeed: number;
}

export interface HandData {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  gesture: HandGesture;
  detected: boolean;
}

// MediaPipe Types for global window access
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}