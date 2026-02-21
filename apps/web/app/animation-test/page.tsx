'use client';

import * as React from 'react';
import { ElectricBorder, LightningBackground, SplashCursor } from '@/components/animations';

export default function AnimationTestPage() {
  return (
    <>
      {/* SplashCursor creates a full-screen overlay, so it should be separate */}
      <SplashCursor 
        SPLAT_FORCE={6000}
        COLOR_UPDATE_SPEED={10}
        DENSITY_DISSIPATION={3.5}
        VELOCITY_DISSIPATION={2}
      />
      
      {/* Main content with other animations */}
      <LightningBackground 
        className="min-h-screen bg-background flex items-center justify-center"
        hue={220}
        xOffset={0}
        speed={1.2}
        intensity={0.8}
        size={1.1}
      >
        <div className="p-8">
          <ElectricBorder 
            className="p-6 rounded-lg"
            color="#3b82f6"
            speed={1.5}
            chaos={0.9}
            thickness={2}
          >
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
              <h1 className="text-3xl font-bold text-center mb-4">Animation Test Page</h1>
              <p className="text-center mb-6">Click anywhere to see splash cursor effect</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <h2 className="font-semibold mb-2">Electric Border</h2>
                  <p>Animated border effect</p>
                </div>
                <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <h2 className="font-semibold mb-2">Lightning Background</h2>
                  <p>Animated lightning strikes</p>
                </div>
                <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                  <h2 className="font-semibold mb-2">Splash Cursor</h2>
                  <p>Particle effects on click</p>
                </div>
              </div>
            </div>
          </ElectricBorder>
        </div>
      </LightningBackground>
    </>
  );
}