import en from './locales/en';
import zh from './locales/zh';
import es from './locales/es';

export type AppLanguage = 'en' | 'zh' | 'es';

export const APP_LANGUAGES: Array<{ code: AppLanguage; label: string; flag: string }> = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export function getLanguageLabel(code: AppLanguage): string {
  return APP_LANGUAGES.find((l) => l.code === code)?.label ?? 'English';
}

export function getLanguageNameForPrompt(code: AppLanguage): string {
  switch (code) {
    case 'zh':
      return 'Simplified Chinese';
    case 'es':
      return 'Spanish';
    case 'en':
    default:
      return 'English';
  }
}

type Dict = Record<string, string>;

export const TRANSLATIONS: Record<AppLanguage, Dict> = {
  en: en as Dict,
  zh: zh as Dict,
  es: es as Dict,
};

export function translate(
  lang: AppLanguage,
  key: string,
  vars?: Record<string, string | number>
): string {
  const dict = TRANSLATIONS[lang] ?? TRANSLATIONS.en;
  const template = dict[key] ?? TRANSLATIONS.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? `{${k}}`));
}
