import { HandGesture, HandData } from '../types';

export class HandTracker {
  private hands: any;
  private camera: any;
  private videoElement: HTMLVideoElement | null = null;
  private onHandUpdate: (data: HandData) => void;

  constructor(onHandUpdate: (data: HandData) => void) {
    this.onHandUpdate = onHandUpdate;
  }

  async start(videoRef: HTMLVideoElement) {
    this.videoElement = videoRef;

    if (!window.Hands) {
      console.error('MediaPipe Hands not loaded');
      return;
    }

    this.hands = new window.Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults(this.onResults.bind(this));

    if (this.videoElement && window.Camera) {
      this.camera = new window.Camera(this.videoElement, {
        onFrame: async () => {
          if (this.videoElement && this.hands) {
            await this.hands.send({ image: this.videoElement });
          }
        },
        width: 640,
        height: 480,
      });
      this.camera.start();
    }
  }

  private onResults(results: any) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const gesture = this.detectGesture(landmarks);
      
      // Calculate center of palm (approximate using wrist and middle finger base)
      // 0: wrist, 9: middle_finger_mcp
      const palmX = (landmarks[0].x + landmarks[9].x) / 2;
      const palmY = (landmarks[0].y + landmarks[9].y) / 2;

      this.onHandUpdate({
        x: 1 - palmX, // Mirror X for natural interaction
        y: palmY,
        gesture,
        detected: true,
      });
    } else {
      this.onHandUpdate({
        x: 0.5,
        y: 0.5,
        gesture: HandGesture.None,
        detected: false,
      });
    }
  }

  private detectGesture(landmarks: any[]): HandGesture {
    // Thumb is a bit special, check if tip is to the left/right of IP joint depending on hand side
    // Simplified: Check if fingertips are close to the palm base (wrist)
    
    // Landmarks:
    // 0: Wrist
    // 8: Index Tip
    // 12: Middle Tip
    // 16: Ring Tip
    // 20: Pinky Tip
    
    const wrist = landmarks[0];
    const fingers = [8, 12, 16, 20];
    let foldedCount = 0;

    // Threshold for "folded" - distance squared to wrist
    // Use the reference distance: Wrist to Middle Finger MCP (0 to 9)
    const refDx = landmarks[0].x - landmarks[9].x;
    const refDy = landmarks[0].y - landmarks[9].y;
    const refDistSq = refDx*refDx + refDy*refDy;

    for (const tipIdx of fingers) {
      const dx = landmarks[tipIdx].x - wrist.x;
      const dy = landmarks[tipIdx].y - wrist.y;
      const distSq = dx*dx + dy*dy;
      
      // If fingertip is closer to wrist than 1.0x the palm length, considered folded
      if (distSq < refDistSq * 1.5) { 
        foldedCount++;
      }
    }

    if (foldedCount >= 3) {
      return HandGesture.Fist;
    }
    
    return HandGesture.Open;
  }

  stop() {
    if (this.camera) {
      // this.camera.stop(); // MediaPipe camera utils doesn't always have a clean stop
    }
    if (this.hands) {
      this.hands.close();
    }
  }
}