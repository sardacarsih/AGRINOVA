'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/src/i18n/navigation';
import { useTransition, useState, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const languages = [
  {
    code: 'id',
    name: 'Bahasa Indonesia',
    flag: '🇮🇩',
  },
  {
    code: 'en',
    name: 'English',
    flag: '🇬🇧',
  },
];

type LanguageSwitcherProps = {
  className?: string;
  variant?: 'dropdown' | 'toggle';
  showFlag?: boolean;
  showName?: boolean;
};

export default function LanguageSwitcher({
  className = '',
  variant = 'dropdown',
  showFlag = true,
  showName = false
}: LanguageSwitcherProps) {
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === locale);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.language-switcher')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLanguageChange = (newLocale: string) => {
    startTransition(() => {
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferred-language', newLocale);
      }

      // Use next-intl navigation for proper locale switching
      router.replace(pathname, { locale: newLocale });
      setIsOpen(false);
    });
  };

  if (variant === 'toggle') {
    return (
      <div className={`language-switcher ${className}`}>
        <button
          onClick={() => handleLanguageChange(locale === 'id' ? 'en' : 'id')}
          disabled={isPending}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={locale === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
        >
          {showFlag && <span className="text-lg">{locale === 'id' ? '🇬🇧' : '🇮🇩'}</span>}
          {showName && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {locale === 'id' ? 'English' : 'Indonesia'}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`language-switcher relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {showFlag && currentLanguage && (
          <span className="text-lg flex-shrink-0">{currentLanguage.flag}</span>
        )}
        {showName && currentLanguage && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {currentLanguage.name}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                disabled={isPending}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  locale === language.code
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="text-lg">{language.flag}</span>
                <span className="text-sm font-medium flex-1">{language.name}</span>
                {locale === language.code && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}