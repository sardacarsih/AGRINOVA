'use client';

import { useAppearance } from '@/components/providers/theme-provider';

// Re-export the useAppearance hook as useTheme for convenience
// This provides the comprehensive theme management functionality
export const useTheme = useAppearance;

// Export for backward compatibility and easier imports
export { useAppearance } from '@/components/providers/theme-provider';

// Helper hook for getting only basic theme info (mode and resolved theme)
export function useThemeMode() {
  const { settings, currentTheme, setThemeMode } = useTheme();
  
  return {
    mode: settings.mode,
    resolvedTheme: currentTheme,
    setTheme: setThemeMode,
    isDark: currentTheme === 'dark',
    isLight: currentTheme === 'light',
    isSystem: settings.mode === 'system',
  };
}

// Helper hook for color scheme management
export function useColorScheme() {
  const { settings, setColorScheme, currentColorScheme } = useTheme();
  
  return {
    colorScheme: settings.colorScheme,
    currentColorScheme,
    setColorScheme,
  };
}

// Helper hook for layout preferences
export function useLayoutPreferences() {
  const { 
    settings, 
    setDensity, 
    setFontSize, 
    setBorderRadius,
    setSidebarBehavior,
    setCompactMode
  } = useTheme();
  
  return {
    density: settings.density,
    fontSize: settings.fontSize,
    borderRadius: settings.borderRadius,
    sidebarBehavior: settings.sidebarBehavior,
    compactMode: settings.compactMode,
    setDensity,
    setFontSize,
    setBorderRadius,
    setSidebarBehavior,
    setCompactMode,
  };
}

// Helper hook for accessibility preferences
export function useAccessibilityPreferences() {
  const { 
    settings, 
    setReducedMotion, 
    setAnimations 
  } = useTheme();
  
  return {
    reducedMotion: settings.reducedMotion,
    animations: settings.animations,
    setReducedMotion,
    setAnimations,
  };
}