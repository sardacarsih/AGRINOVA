'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export const useLanguageChange = (namespace?: string) => {
  const [, forceUpdate] = useState({});
  const t = useTranslations(namespace);

  useEffect(() => {
    const handleLanguageChange = () => {
      forceUpdate({});
    };

    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, [namespace]);

  return { t };
};