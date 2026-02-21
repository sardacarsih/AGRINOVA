'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { locales, defaultLocale } from '@/src/i18n/settings';

interface LanguageContextType {
  locale: string;
  changeLanguage: (newLocale: string) => Promise<void>;
  isChanging: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState(defaultLocale);
  const [isChanging, setIsChanging] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize locale from cookie/localStorage
  useEffect(() => {
    const savedLocale =
      localStorage.getItem('agrinova-language') ||
      document.cookie
        .split('; ')
        .find(row => row.startsWith('NEXT_LOCALE='))
        ?.split('=')[1] ||
      defaultLocale;

    if (savedLocale !== locale && locales.includes(savedLocale as any)) {
      setLocale(savedLocale);
    }
  }, []);

  const changeLanguage = async (newLocale: string) => {
    if (!locales.includes(newLocale as any) || newLocale === locale) return;

    setIsChanging(true);

    try {
      // Update state
      setLocale(newLocale);

      // Update localStorage
      localStorage.setItem('agrinova-language', newLocale);

      // Update cookie
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

      // Navigate to same path with new locale
      router.replace(pathname);

      // Trigger a re-render for components using useTranslations
      window.dispatchEvent(new Event('languageChange'));
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, isChanging }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};