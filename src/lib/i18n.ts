import { useCallback } from 'react';
import { useStore } from './store';
import type { L, Lang } from './types';
import { tl as tlRaw } from './utils';

/**
 * Bilingual helper. UI strings are written inline as tr('English', 'العربية')
 * so a screen and its translation always stay together.
 * Data (products, deals…) uses L objects: { en, ar }.
 */
export function useI18n() {
  const lang = useStore((s) => s.lang);
  const tr = useCallback((en: string, ar: string) => (lang === 'ar' ? ar : en), [lang]);
  const tl = useCallback((t: L | undefined) => tlRaw(t, lang), [lang]);
  return { lang, dir: (lang === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr', tr, tl, isAr: lang === 'ar' };
}

export const applyDocLang = (lang: Lang) => {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
};
