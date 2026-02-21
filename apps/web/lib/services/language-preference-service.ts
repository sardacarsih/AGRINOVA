'use client';

import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface LanguagePreference {
  code: 'en' | 'id';
  displayName: string;
  nativeName: string;
  flag: string;
}

interface LanguagePreferenceState {
  currentLanguage: LanguagePreference;
  autoDetect: boolean;
  lastUpdated: string;
  setLanguage: (language: LanguagePreference) => void;
  toggleAutoDetect: () => void;
  resetToDefault: () => void;
}

const supportedLanguages: LanguagePreference[] = [
  {
    code: 'en',
    displayName: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  {
    code: 'id',
    displayName: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    flag: '🇮🇩',
  },
];

export const useLanguagePreferenceStore = create<LanguagePreferenceState>()(
  persist(
    (set, get) => ({
      currentLanguage: supportedLanguages[1], // Default to Indonesian
      autoDetect: true,
      lastUpdated: new Date().toISOString(),

      setLanguage: (language: LanguagePreference) => {
        set({
          currentLanguage: language,
          lastUpdated: new Date().toISOString(),
        });

        // Update HTML lang attribute
        if (typeof document !== 'undefined') {
          document.documentElement.lang = language.code;
        }

        // Store in localStorage for server-side rendering
        if (typeof window !== 'undefined') {
          localStorage.setItem('preferred-language', language.code);
        }
      },

      toggleAutoDetect: () => {
        set({ autoDetect: !get().autoDetect });
      },

      resetToDefault: () => {
        const defaultLanguage = supportedLanguages[1]; // Indonesian
        set({
          currentLanguage: defaultLanguage,
          autoDetect: true,
          lastUpdated: new Date().toISOString(),
        });
      },
    }),
    {
      name: 'language-preference-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentLanguage: state.currentLanguage,
        autoDetect: state.autoDetect,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);

/// Language preference service for backend synchronization
export class LanguagePreferenceService {
  private static instance: LanguagePreferenceService;
  private apiEndpoint: string;

  private constructor() {
    this.apiEndpoint = '/api/user/language-preference';
  }

  static getInstance(): LanguagePreferenceService {
    if (!LanguagePreferenceService.instance) {
      LanguagePreferenceService.instance = new LanguagePreferenceService();
    }
    return LanguagePreferenceService.instance;
  }

  /// Sync language preference with backend
  async syncLanguagePreference(languageCode: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
        body: JSON.stringify({
          language: languageCode,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Failed to sync language preference:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /// Get language preference from backend
  async getLanguagePreference(): Promise<string | null> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.language || null;

    } catch (error) {
      console.error('Failed to get language preference:', error);
      return null;
    }
  }

  /// Detect user's preferred language from browser
  detectUserLanguage(): string {
    if (typeof navigator === 'undefined') {
      return 'id'; // Default to Indonesian for SSR
    }

    // Get browser language
    const browserLang = navigator.language || navigator.languages?.[0];

    // Check if browser language is supported
    if (browserLang?.startsWith('en')) {
      return 'en';
    }

    if (browserLang?.startsWith('id')) {
      return 'id';
    }

    // Fallback to Indonesian
    return 'id';
  }

  /// Get language preference with fallback logic
  async getEffectiveLanguage(): Promise<string> {
    const store = useLanguagePreferenceStore.getState();

    // If auto-detect is enabled, try to detect from browser
    if (store.autoDetect) {
      const detectedLang = this.detectUserLanguage();
      return detectedLang;
    }

    // Use stored preference
    return store.currentLanguage.code;
  }

  /// Initialize language preference on app load
  async initialize(): Promise<void> {
    try {
      // Get preference from backend
      const backendLanguage = await this.getLanguagePreference();

      if (backendLanguage) {
        const language = supportedLanguages.find(lang => lang.code === backendLanguage);
        if (language) {
          useLanguagePreferenceStore.getState().setLanguage(language);
          return;
        }
      }

      // Fallback to stored preference or auto-detection
      const store = useLanguagePreferenceStore.getState();
      let effectiveLanguage: string;

      if (store.autoDetect) {
        effectiveLanguage = this.detectUserLanguage();
      } else {
        effectiveLanguage = store.currentLanguage.code;
      }

      const language = supportedLanguages.find(lang => lang.code === effectiveLanguage);
      if (language) {
        useLanguagePreferenceStore.getState().setLanguage(language);
      }

    } catch (error) {
      console.error('Failed to initialize language preference:', error);
      // Fallback to Indonesian
      const indonesian = supportedLanguages.find(lang => lang.code === 'id');
      if (indonesian) {
        useLanguagePreferenceStore.getState().setLanguage(indonesian);
      }
    }
  }
}

/// Utility functions for language management
export const LanguageUtils = {
  /// Get all supported languages
  getSupportedLanguages(): LanguagePreference[] {
    return supportedLanguages;
  },

  /// Get language by code
  getLanguageByCode(code: string): LanguagePreference | undefined {
    return supportedLanguages.find(lang => lang.code === code);
  },

  /// Format language display name
  formatLanguageName(language: LanguagePreference): string {
    return `${language.flag} ${language.nativeName}`;
  },

  /// Check if language code is valid
  isValidLanguageCode(code: string): boolean {
    return supportedLanguages.some(lang => lang.code === code);
  },

  /// Get language direction (for future RTL support)
  getLanguageDirection(code: string): 'ltr' | 'rtl' {
    // Currently all supported languages are LTR
    return 'ltr';
  },

  /// Get locale for date formatting
  getDateLocale(code: string): string {
    switch (code) {
      case 'en':
        return 'en-US';
      case 'id':
        return 'id-ID';
      default:
        return 'id-ID';
    }
  },

  /// Get locale for number formatting
  getNumberLocale(code: string): string {
    switch (code) {
      case 'en':
        return 'en-US';
      case 'id':
        return 'id-ID';
      default:
        return 'id-ID';
    }
  },
};

/// React hooks for language preferences
export const useLanguagePreferences = () => {
  const store = useLanguagePreferenceStore();
  const service = LanguagePreferenceService.getInstance();

  return {
    ...store,
    service,
    supportedLanguages: LanguageUtils.getSupportedLanguages(),
    detectLanguage: () => service.detectUserLanguage(),
    syncWithBackend: (languageCode: string) => service.syncLanguagePreference(languageCode),
    getEffectiveLanguage: () => service.getEffectiveLanguage(),
  };
};

/// Hook for language initialization
export const useLanguageInitialization = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const service = LanguagePreferenceService.getInstance();

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsInitializing(true);
        setError(null);
        await service.initialize();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Initialization failed');
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  return { isInitializing, error };
};