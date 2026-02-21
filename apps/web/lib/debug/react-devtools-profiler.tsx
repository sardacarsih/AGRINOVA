'use client';

import React from 'react';

/**
 * React DevTools Profiler Integration
 * Based on Context7 research for advanced React debugging
 */

interface ProfilerProps {
  id: string;
  children: React.ReactNode;
  enabled?: boolean;
}

// Profiler callback to track component performance
function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔍 [React Profiler] ${id} - ${phase}`);
    console.log('Actual Duration:', actualDuration);
    console.log('Base Duration:', baseDuration);
    console.log('Start Time:', startTime);
    console.log('Commit Time:', commitTime);
    
    if (actualDuration > baseDuration * 1.5) {
      console.warn('⚠️ Performance issue detected: component took longer than expected');
    }
    
    console.groupEnd();
  }
}

/**
 * Development-only profiler wrapper
 */
export function DevProfiler({ id, children, enabled = true }: ProfilerProps) {
  if (process.env.NODE_ENV !== 'development' || !enabled) {
    return <>{children}</>;
  }

  return (
    <React.Profiler id={id} onRender={onRenderCallback}>
      {children}
    </React.Profiler>
  );
}

/**
 * Hook to profile component render cycles
 */
export function useRenderProfiler(componentName: string) {
  const renderCount = React.useRef(0);
  const lastRenderTime = React.useRef(Date.now());

  React.useEffect(() => {
    renderCount.current += 1;
    const currentTime = Date.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    lastRenderTime.current = currentTime;

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [Render Profiler] ${componentName} render #${renderCount.current} (${timeSinceLastRender}ms since last)`);
      
      if (timeSinceLastRender < 100 && renderCount.current > 1) {
        console.warn(`⚠️ [Render Profiler] ${componentName} may be re-rendering too frequently`);
      }
    }
  });

  return { renderCount: renderCount.current };
}

/**
 * Hook to detect unnecessary re-renders
 */
export function useWhyDidYouUpdate(componentName: string, props: Record<string, any>) {
  const previousProps = React.useRef<Record<string, any> | undefined>(undefined);

  React.useEffect(() => {
    if (previousProps.current && process.env.NODE_ENV === 'development') {
      const changedProps: Record<string, { from: any; to: any }> = {};
      
      Object.keys(props).forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key]
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.group(`🔍 [Why Did You Update] ${componentName}`);
        console.log('Changed props:', changedProps);
        console.groupEnd();
      }
    }
    
    previousProps.current = props;
  });
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(componentName: string) {
  const mountTime = React.useRef(Date.now());
  const renderTimes = React.useRef<number[]>([]);

  React.useLayoutEffect(() => {
    const renderTime = Date.now() - mountTime.current;
    renderTimes.current.push(renderTime);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ [Performance Monitor] ${componentName} render time: ${renderTime}ms`);
      
      if (renderTimes.current.length > 10) {
        const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
        console.log(`📊 [Performance Monitor] ${componentName} average render time: ${avgRenderTime.toFixed(2)}ms`);
      }
    }
    
    mountTime.current = Date.now();
  });
}

export default DevProfiler;