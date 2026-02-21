'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe, ChevronDown, Loader2 } from 'lucide-react';
import { IndonesiaFlag, USFlag } from '@/components/icons/flags';
import { useLanguage } from '@/contexts/LanguageContext';

const languages = [
  { code: 'en', name: 'English', flag: USFlag },
  { code: 'id', name: 'Bahasa Indonesia', flag: IndonesiaFlag },
];

export function TopbarLanguageSwitcher() {
  const locale = useLocale();
  const { changeLanguage, isChanging } = useLanguage();

  // Sync context locale with next-intl locale
  useEffect(() => {
    // Save language preference to localStorage and cookie
    if (typeof window !== 'undefined') {
      localStorage.setItem('agrinova-language', locale);
      // Set NEXT_LOCALE cookie for middleware access
      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [locale]);

  const handleLanguageChange = async (newLocale: string) => {
    // Use the context-based language change function
    await changeLanguage(newLocale);
  };

  const currentLanguage = languages.find(lang => lang.code === locale);
  const CurrentFlag = currentLanguage?.flag;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 hover:bg-accent/50 transition-colors duration-200"
            disabled={isChanging}
            title={`Language: ${currentLanguage?.name}`}
          >
            {isChanging ? (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="hidden lg:flex items-center gap-2">
              {CurrentFlag && <CurrentFlag className="w-5 h-3.5" />}
              <span className="text-sm font-medium text-muted-foreground">
                {currentLanguage?.code === 'id' ? 'ID' : 'EN'}
              </span>
            </span>
            <span className="lg:hidden">
              {CurrentFlag && <CurrentFlag className="w-5 h-3.5" />}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-background/95 backdrop-blur-sm border-border/80 shadow-lg min-w-[160px]"
      >
        {languages.map((language) => {
          const FlagIcon = language.flag;
          return (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                locale === language.code ? 'bg-accent/30' : ''
              }`}
            >
              <FlagIcon className="w-5 h-3.5 mr-3" />
              <span className="flex-1 text-sm font-medium">{language.name}</span>
              {locale === language.code && (
                <span className="text-xs text-primary font-semibold">
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