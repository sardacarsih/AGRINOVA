'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from 'next-themes';
import {
  AppearanceSettings,
  DEFAULT_APPEARANCE_SETTINGS,
  THEME_CONFIGS,
  generateThemeVariables,
  getSystemTheme,
  STORAGE_KEYS,
  type ColorScheme,
  type ThemeMode,
} from '@/lib/theme/theme-config';

interface ThemeContextValue {
  // Current settings
  settings: AppearanceSettings;
  
  // Theme controls
  setThemeMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setFontSize: (size: AppearanceSettings['fontSize']) => void;
  setDensity: (density: AppearanceSettings['density']) => void;
  setBorderRadius: (radius: AppearanceSettings['borderRadius']) => void;
  setReducedMotion: (enabled: boolean) => void;
  setSidebarBehavior: (behavior: AppearanceSettings['sidebarBehavior']) => void;
  setAnimations: (enabled: boolean) => void;
  setCompactMode: (enabled: boolean) => void;
  
  // Bulk operations
  updateSettings: (updates: Partial<AppearanceSettings>) => void;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settings: string) => boolean;
  
  // Current resolved values
  currentTheme: 'light' | 'dark';
  currentColorScheme: ColorScheme;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultSettings?: Partial<AppearanceSettings>;
}

function ThemeProviderInner({ children, defaultSettings }: ThemeProviderProps) {
  const { theme, setTheme, systemTheme } = useNextTheme();
  const [settings, setSettings] = useState<AppearanceSettings>(() => {
    // Start with defaults, will be overwritten by useEffect
    return { ...DEFAULT_APPEARANCE_SETTINGS, ...defaultSettings };
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.APPEARANCE_SETTINGS);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      }
    } catch (error) {
      console.warn('Failed to load appearance settings:', error);
    }
    setIsLoading(false);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEYS.APPEARANCE_SETTINGS, JSON.stringify(settings));
      } catch (error) {
        console.warn('Failed to save appearance settings:', error);
      }
    }
  }, [settings, isLoading]);

  // Update CSS variables when color scheme or theme changes
  useEffect(() => {
    if (isLoading) return;

    const resolvedTheme = theme === 'system' 
      ? (systemTheme as 'light' | 'dark') || getSystemTheme()
      : (theme as 'light' | 'dark') || 'light';

    // Apply theme class to root element (Tailwind v3 approach)
    const root = document.documentElement;
    
    // Apply theme variables dynamically
    const variables = generateThemeVariables(settings.colorScheme, resolvedTheme);
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply appearance-related CSS classes
    const body = document.body;
    
    // Font size
    body.classList.remove('text-sm', 'text-base', 'text-lg');
    if (settings.fontSize === 'small') body.classList.add('text-sm');
    else if (settings.fontSize === 'large') body.classList.add('text-lg');
    else body.classList.add('text-base');

    // Density
    body.setAttribute('data-density', settings.density);
    
    // Border radius
    body.setAttribute('data-border-radius', settings.borderRadius);
    
    // Reduced motion
    if (settings.reducedMotion) {
      body.classList.add('motion-reduce');
    } else {
      body.classList.remove('motion-reduce');
    }

    // Compact mode
    if (settings.compactMode) {
      body.classList.add('compact-mode');
    } else {
      body.classList.remove('compact-mode');
    }

    // Animations
    if (!settings.animations) {
      body.classList.add('no-animations');
    } else {
      body.classList.remove('no-animations');
    }

  }, [settings, theme, systemTheme, isLoading]);

  // Sync theme mode with next-themes
  useEffect(() => {
    if (settings.mode !== theme) {
      setTheme(settings.mode);
    }
  }, [settings.mode, setTheme, theme]);

  // Theme control functions
  const setThemeMode = (mode: ThemeMode) => {
    setSettings(prev => ({ ...prev, mode }));
  };

  const setColorScheme = (colorScheme: ColorScheme) => {
    setSettings(prev => ({ ...prev, colorScheme }));
  };

  const setFontSize = (fontSize: AppearanceSettings['fontSize']) => {
    setSettings(prev => ({ ...prev, fontSize }));
  };

  const setDensity = (density: AppearanceSettings['density']) => {
    setSettings(prev => ({ ...prev, density }));
  };

  const setBorderRadius = (borderRadius: AppearanceSettings['borderRadius']) => {
    setSettings(prev => ({ ...prev, borderRadius }));
  };

  const setReducedMotion = (reducedMotion: boolean) => {
    setSettings(prev => ({ ...prev, reducedMotion }));
  };

  const setSidebarBehavior = (sidebarBehavior: AppearanceSettings['sidebarBehavior']) => {
    setSettings(prev => ({ ...prev, sidebarBehavior }));
  };

  const setAnimations = (animations: boolean) => {
    setSettings(prev => ({ ...prev, animations }));
  };

  const setCompactMode = (compactMode: boolean) => {
    setSettings(prev => ({ ...prev, compactMode }));
  };

  const updateSettings = (updates: Partial<AppearanceSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_APPEARANCE_SETTINGS);
  };

  const exportSettings = (): string => {
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = (settingsJson: string): boolean => {
    try {
      const imported = JSON.parse(settingsJson);
      // Validate that it contains valid settings
      const validSettings = {
        ...DEFAULT_APPEARANCE_SETTINGS,
        ...imported,
      };
      setSettings(validSettings);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  };

  // Calculate current resolved theme
  const currentTheme: 'light' | 'dark' = 
    theme === 'system' 
      ? (systemTheme as 'light' | 'dark') || getSystemTheme()
      : (theme as 'light' | 'dark') || 'light';

  const value: ThemeContextValue = {
    settings,
    setThemeMode,
    setColorScheme,
    setFontSize,
    setDensity,
    setBorderRadius,
    setReducedMotion,
    setSidebarBehavior,
    setAnimations,
    setCompactMode,
    updateSettings,
    resetToDefaults,
    exportSettings,
    importSettings,
    currentTheme,
    currentColorScheme: settings.colorScheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      themes={['light', 'dark', 'system']}
      storageKey={STORAGE_KEYS.THEME_MODE}
      enableColorScheme={false}
    >
      <ThemeProviderInner {...props}>
        {children}
      </ThemeProviderInner>
    </NextThemeProvider>
  );
}

export function useAppearance(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppearance must be used within a ThemeProvider');
  }
  return context;
}

// Re-export for backward compatibility
export { useAppearance as useTheme };

// Theme preview component for settings
interface ThemePreviewProps {
  colorScheme: ColorScheme;
  mode: 'light' | 'dark';
  className?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

export function ThemePreview({ 
  colorScheme, 
  mode, 
  className = '', 
  onClick,
  isSelected = false 
}: ThemePreviewProps) {
  const theme = THEME_CONFIGS[colorScheme];
  if (!theme) return null;

  const variables = generateThemeVariables(colorScheme, mode);
  
  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border-2 transition-all cursor-pointer
        ${isSelected 
          ? 'border-primary ring-2 ring-primary/20' 
          : 'border-border hover:border-primary/50'
        }
        ${className}
      `}
      style={variables}
      onClick={onClick}
    >
      {/* Preview content */}
      <div className="p-3 space-y-2 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <div className="text-xs font-medium text-foreground">{theme.name}</div>
          </div>
          <div className="w-4 h-2 bg-muted rounded"></div>
        </div>
        
        {/* Content area */}
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded w-full"></div>
          <div className="h-2 bg-muted rounded w-3/4"></div>
        </div>
        
        {/* Action area */}
        <div className="flex space-x-1">
          <div className="flex-1 h-2 bg-primary rounded"></div>
          <div className="flex-1 h-2 bg-secondary rounded"></div>
        </div>
      </div>
    </div>
  );
}