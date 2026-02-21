'use client';

import * as React from 'react';
import { ElectricBorder, LightningBackground, SplashCursor } from '@/components/animations';

export default function ComponentTest() {
  return (
    <>
      {/* SplashCursor as full-screen overlay */}
      <SplashCursor 
        SPLAT_FORCE={5000}
        COLOR_UPDATE_SPEED={8}
        DENSITY_DISSIPATION={3}
        VELOCITY_DISSIPATION={1.8}
      />
      
      <div className="min-h-screen bg-background p-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Animation Components Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Electric Border</h2>
            <ElectricBorder 
              className="p-4 rounded-lg"
              color="#3b82f6"
              speed={1.2}
              chaos={0.7}
              thickness={2}
            >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <p>This component has an animated electric border effect.</p>
              </div>
            </ElectricBorder>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Lightning Background</h2>
            <LightningBackground 
              className="h-64 rounded-lg overflow-hidden"
              hue={220}
              xOffset={0.2}
              speed={0.8}
              intensity={0.6}
              size={0.9}
            >
              <div className="bg-white dark:bg-gray-800 h-full flex items-center justify-center p-6 rounded-lg shadow-lg">
                <p className="text-center">This component has an animated lightning background effect.</p>
              </div>
            </LightningBackground>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Splash Cursor</h2>
            <div className="bg-white dark:bg-gray-800 h-64 flex items-center justify-center p-6 rounded-lg shadow-lg cursor-pointer">
              <p className="text-center">Click anywhere to see splash cursor effect (full-screen overlay).</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}