import React, { useState, useEffect, useRef } from 'react';
import ParticleCanvas from './components/ParticleCanvas';
import { ShapeType, HandGesture, HandData, ParticleSettings } from './types';
import { HandTracker } from './services/handTracking';

function App() {
  const [currentShape, setCurrentShape] = useState<ShapeType>(ShapeType.Sphere);
  const [handData, setHandData] = useState<HandData>({
    x: 0.5,
    y: 0.5,
    gesture: HandGesture.None,
    detected: false,
  });
  
  const [settings, setSettings] = useState<ParticleSettings>({
    particleCount: 20000,
    forceStrength: 2.5,
    interactionRadius: 25,
    damping: 0.96,
    returnSpeed: 0.04
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<HandTracker | null>(null);

  useEffect(() => {
    trackerRef.current = new HandTracker((data) => {
      setHandData(data);
    });

    if (videoRef.current) {
      trackerRef.current.start(videoRef.current);
    }

    return () => {
      trackerRef.current?.stop();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-sans text-white">
      
      {/* 3D Canvas */}
      <ParticleCanvas 
        shape={currentShape} 
        settings={settings}
        handData={handData}
      />

      {/* Header / Title */}
      <div className="absolute top-6 left-6 pointer-events-none select-none">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
          Particle Morph
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Interactive AI Gesture Control
        </p>
      </div>

      {/* Controls Panel */}
      <div className="absolute top-6 right-6 w-80 bg-gray-900/80 backdrop-blur-md rounded-xl p-6 border border-gray-700 shadow-2xl transition-all hover:bg-gray-900/90">
        <div className="flex flex-col gap-6">
          
          {/* Shape Selector */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
              Target Shape
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(ShapeType).map((shape) => (
                <button
                  key={shape}
                  onClick={() => setCurrentShape(shape)}
                  className={`p-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                    currentShape === shape
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  {shape}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Parameters
            </label>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Particles</span>
                <span>{settings.particleCount.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="5000"
                max="40000"
                step="1000"
                value={settings.particleCount}
                onChange={(e) => setSettings(s => ({ ...s, particleCount: Number(e.target.value) }))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Force Strength</span>
                <span>{settings.forceStrength.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.1"
                value={settings.forceStrength}
                onChange={(e) => setSettings(s => ({ ...s, forceStrength: Number(e.target.value) }))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Interaction Radius</span>
                <span>{settings.interactionRadius.toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="1"
                value={settings.interactionRadius}
                onChange={(e) => setSettings(s => ({ ...s, interactionRadius: Number(e.target.value) }))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400"
              />
            </div>
          </div>

          {/* Status Indicator */}
          <div className="pt-4 border-t border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${handData.detected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-400">
                {handData.detected ? 'Hand Tracking Active' : 'No Hand Detected'}
              </span>
            </div>
            {handData.detected && (
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                handData.gesture === HandGesture.Open ? 'bg-blue-500/20 text-blue-300' :
                handData.gesture === HandGesture.Fist ? 'bg-orange-500/20 text-orange-300' :
                'bg-gray-700 text-gray-300'
              }`}>
                {handData.gesture}
              </span>
            )}
          </div>

          {/* Webcam Preview */}
          <div className="relative rounded-lg overflow-hidden border border-gray-700 bg-black aspect-[4/3]">
             <video 
               ref={videoRef}
               className="w-full h-full object-cover opacity-70 transform scale-x-[-1]"
               playsInline
               muted
             />
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               {!handData.detected && <span className="text-xs text-gray-500">Show Hand</span>}
             </div>
          </div>
          
          <div className="text-[10px] text-gray-500 leading-tight">
             <p><strong>Open Hand:</strong> Push Particles</p>
             <p><strong>Fist:</strong> Pull Particles</p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;