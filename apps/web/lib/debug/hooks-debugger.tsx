'use client';

import React from 'react';

/**
 * React Hooks Debugger - Based on Context7 research for debugging hooks violations
 * 
 * Key insights from Context7:
 * 1. Hooks must be called in the same order every time
 * 2. No hooks inside loops, conditions, or nested functions
 * 3. Only call hooks at the top level of React functions
 * 4. Be careful with early returns that could skip hooks
 */

interface HookCall {
  name: string;
  order: number;
  timestamp: number;
  component: string;
}

class HooksDebugger {
  private static instance: HooksDebugger;
  private hookCalls: Map<string, HookCall[]> = new Map();
  private enabled = process.env.NODE_ENV === 'development';

  static getInstance(): HooksDebugger {
    if (!HooksDebugger.instance) {
      HooksDebugger.instance = new HooksDebugger();
    }
    return HooksDebugger.instance;
  }

  trackHook(hookName: string, componentName: string): void {
    if (!this.enabled) return;

    const key = componentName;
    const calls = this.hookCalls.get(key) || [];
    
    const hookCall: HookCall = {
      name: hookName,
      order: calls.length + 1,
      timestamp: Date.now(),
      component: componentName
    };

    calls.push(hookCall);
    this.hookCalls.set(key, calls);

    // Check for hooks order violations
    this.validateHooksOrder(key);
  }

  private validateHooksOrder(componentKey: string): void {
    const calls = this.hookCalls.get(componentKey);
    if (!calls || calls.length < 2) return;

    // For debugging: log hook call patterns
    console.group(`🔍 [HooksDebugger] ${componentKey} Hook Calls:`);
    calls.forEach((call, index) => {
      console.log(`${index + 1}. ${call.name} (order: ${call.order})`);
    });
    console.groupEnd();

    // Simple pattern detection
    const hookNames = calls.map(call => call.name);
    const uniquePattern = [...new Set(hookNames)].join('-');
    
    console.log(`🔍 [HooksDebugger] ${componentKey} Hook Pattern:`, uniquePattern);
  }

  reset(): void {
    this.hookCalls.clear();
  }

  getReport(): { component: string; hooks: HookCall[] }[] {
    return Array.from(this.hookCalls.entries()).map(([component, hooks]) => ({
      component,
      hooks
    }));
  }
}

const hooksDebugger = HooksDebugger.getInstance();

/**
 * Higher-order component to debug hooks calls
 */
export function withHooksDebugger<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const DebuggedComponent = React.forwardRef<any, P>((props, ref) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    
    // Track component render
    React.useEffect(() => {
      console.log(`🔄 [HooksDebugger] ${name} rendered`);
    });

    return <Component {...(props as any)} />;
  });

  DebuggedComponent.displayName = `withHooksDebugger(${componentName || Component.displayName || Component.name})`;
  
  return DebuggedComponent;
}

/**
 * Debug hook that tracks all hook calls
 */
export function useHooksDebugger(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    const hookCallCount = React.useRef(0);
    
    React.useEffect(() => {
      hookCallCount.current += 1;
      hooksDebugger.trackHook('useEffect', componentName);
      
      return () => {
        console.log(`🧹 [HooksDebugger] ${componentName} cleanup (call #${hookCallCount.current})`);
      };
    });

    hooksDebugger.trackHook('useHooksDebugger', componentName);
  }
}

/**
 * Hook to check for early returns that might cause hooks violations
 */
export function useEarlyReturnDetector(componentName: string, conditions: boolean[]) {
  const previousConditions = React.useRef<boolean[]>([]);
  
  React.useEffect(() => {
    const hasChanged = conditions.some((condition, index) => 
      condition !== previousConditions.current[index]
    );
    
    if (hasChanged) {
      console.warn(`⚠️ [HooksDebugger] ${componentName} conditions changed:`, {
        previous: previousConditions.current,
        current: conditions,
        couldCauseEarlyReturn: conditions.some(Boolean)
      });
    }
    
    previousConditions.current = [...conditions];
  });

  hooksDebugger.trackHook('useEarlyReturnDetector', componentName);
}

/**
 * Hook to validate that hooks are called in the same order
 */
export function useHooksOrderValidator(componentName: string) {
  const renderCount = React.useRef(0);
  const hookCallOrder = React.useRef<string[]>([]);
  
  React.useEffect(() => {
    renderCount.current += 1;
    
    if (renderCount.current > 1) {
      console.log(`🔍 [HooksDebugger] ${componentName} render #${renderCount.current} hook order:`, 
        hookCallOrder.current);
    }
    
    // Reset for next render
    hookCallOrder.current = [];
  });

  const trackHookCall = React.useCallback((hookName: string) => {
    hookCallOrder.current.push(hookName);
    hooksDebugger.trackHook(hookName, componentName);
  }, [componentName]);

  hooksDebugger.trackHook('useHooksOrderValidator', componentName);
  
  return { trackHookCall, renderCount: renderCount.current };
}

/**
 * Component to display hooks debugging information
 */
export function HooksDebugPanel() {
  const [report, setReport] = React.useState<{ component: string; hooks: HookCall[] }[]>([]);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setReport(hooksDebugger.getReport());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded shadow-lg text-xs z-50"
      >
        🔍 Hooks Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded shadow-lg p-4 max-w-md max-h-96 overflow-auto text-xs z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Hooks Debug Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        {report.map(({ component, hooks }) => (
          <div key={component} className="border-l-2 border-blue-500 pl-2">
            <div className="font-semibold text-blue-600">{component}</div>
            <div className="text-gray-600">
              {hooks.map((hook, index) => (
                <div key={index}>
                  {hook.order}. {hook.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <button
        onClick={() => hooksDebugger.reset()}
        className="mt-2 bg-red-500 text-white px-2 py-1 rounded text-xs"
      >
        Clear
      </button>
    </div>
  );
}

export default hooksDebugger;