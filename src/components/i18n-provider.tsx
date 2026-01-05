'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppLanguage, translate } from '@/lib/i18n';

const STORAGE_KEY = 'hera_language';

type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function normalizeLanguage(value: string | null | undefined): AppLanguage | null {
  if (!value) return null;
  if (value === 'en' || value === 'zh' || value === 'es') return value;
  return null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === 'undefined') return 'en';
    return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY)) ?? 'en';
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    // Keep html lang aligned for accessibility/IME.
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
  }, [language]);

  const setLanguage = useCallback((lang: AppLanguage) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
