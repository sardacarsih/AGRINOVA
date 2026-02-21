'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { IndonesiaFlag, USFlag } from '@/components/icons/flags';

const languages = [
  { code: 'en', name: 'English', flag: USFlag },
  { code: 'id', name: 'Bahasa Indonesia', flag: IndonesiaFlag },
];

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');

  // Save language preference to localStorage and cookie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('agrinova-language', locale);
      // Set NEXT_LOCALE cookie for middleware access
      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
      console.log('LanguageSwitcher: Set locale to', locale);
    }
  }, [locale]);

  const handleLanguageChange = (newLocale: string) => {
    console.log('LanguageSwitcher: Changing from', locale, 'to', newLocale);

    startTransition(() => {
      // Save language preference to localStorage and cookie
      if (typeof window !== 'undefined') {
        localStorage.setItem('agrinova-language', newLocale);
        // Set NEXT_LOCALE cookie for middleware access (1 year expiry)
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        console.log('LanguageSwitcher: Set cookies and localStorage for', newLocale);
      }

      // Force page reload for immediate language change
      window.location.reload();
    });
  };

  const currentLanguage = languages.find(lang => lang.code === locale);
  const CurrentFlag = currentLanguage?.flag;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 border-slate-200 dark:border-slate-600"
          disabled={isPending}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline-flex items-center gap-2">
            {CurrentFlag && <CurrentFlag className="w-5 h-3.5" />}
            <span className="text-slate-700 dark:text-slate-300">{currentLanguage?.name}</span>
          </span>
          <span className="sm:hidden">
            {CurrentFlag && <CurrentFlag className="w-5 h-3.5" />}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
        {languages.map((language) => {
          const FlagIcon = language.flag;
          return (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 ${
                locale === language.code ? 'bg-slate-100 dark:bg-slate-700' : ''
              }`}
            >
              <FlagIcon className="w-5 h-3.5 mr-2" />
              <span className="text-slate-700 dark:text-slate-300">{language.name}</span>
              {locale === language.code && (
                <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400">
                  ✓
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple version for mobile or compact UI
export function CompactLanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageToggle = () => {
    const newLocale = locale === 'en' ? 'id' : 'en';
    console.log('CompactLanguageSwitcher: Toggling to', newLocale);

    startTransition(() => {
      // Set NEXT_LOCALE cookie for middleware access
      if (typeof window !== 'undefined') {
        localStorage.setItem('agrinova-language', newLocale);
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        console.log('CompactLanguageSwitcher: Set locale to', newLocale);
      }

      // Force page reload for immediate language change
      window.location.reload();
    });
  };

  const NextFlag = locale === 'en' ? IndonesiaFlag : USFlag;
  const nextLanguage = locale === 'en' ? 'Bahasa Indonesia' : 'English';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLanguageToggle}
      disabled={isPending}
      className="w-full justify-start gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
    >
      <Globe className="h-4 w-4" />
      <NextFlag className="w-5 h-3.5" />
      {nextLanguage}
    </Button>
  );
}