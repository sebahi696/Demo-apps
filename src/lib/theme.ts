import type { DemoConfig, Lang } from './types';
import { contrastOn, hexToRgb } from './utils';

const FONTS = {
  modern: {
    en: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', system-ui, sans-serif",
    ar: "'IBM Plex Sans Arabic', 'Plus Jakarta Sans', system-ui, sans-serif",
    displayEn: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif",
    displayAr: "'IBM Plex Sans Arabic', sans-serif",
  },
  classic: {
    en: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', system-ui, sans-serif",
    ar: "'IBM Plex Sans Arabic', system-ui, sans-serif",
    displayEn: "'Playfair Display', 'Amiri', Georgia, serif",
    displayAr: "'Amiri', 'Playfair Display', serif",
  },
  friendly: {
    en: "'Nunito', 'Tajawal', system-ui, sans-serif",
    ar: "'Tajawal', 'Nunito', system-ui, sans-serif",
    displayEn: "'Nunito', 'Tajawal', sans-serif",
    displayAr: "'Tajawal', sans-serif",
  },
} as const;

const RADIUS = { sharp: '6px', soft: '14px', round: '22px' } as const;

export type ThemeInput = Pick<DemoConfig['brand'], 'primary' | 'secondary' | 'radius' | 'font'>;

export function themeVars(brand: ThemeInput, lang: Lang): Record<string, string> {
  const f = FONTS[brand.font] ?? FONTS.modern;
  const rgb = (h: string) => hexToRgb(h).join(' ');
  return {
    '--brand': rgb(brand.primary),
    '--brand2': rgb(brand.secondary),
    '--onbrand': rgb(contrastOn(brand.primary)),
    '--onbrand2': rgb(contrastOn(brand.secondary)),
    '--radius': RADIUS[brand.radius] ?? RADIUS.soft,
    '--font-sans': lang === 'ar' ? f.ar : f.en,
    '--font-display': lang === 'ar' ? f.displayAr : f.displayEn,
  };
}

export function applyTheme(brand: ThemeInput, lang: Lang) {
  const root = document.documentElement;
  Object.entries(themeVars(brand, lang)).forEach(([k, v]) => root.style.setProperty(k, v));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', brand.primary);
}

export const PLATFORM_THEME: ThemeInput = {
  primary: '#111827',
  secondary: '#f59e0b',
  radius: 'soft',
  font: 'modern',
};

export const PALETTES: { name: string; primary: string; secondary: string }[] = [
  { name: 'Espresso', primary: '#4a2c20', secondary: '#d9a066' },
  { name: 'Charcoal', primary: '#111827', secondary: '#f59e0b' },
  { name: 'Ember', primary: '#c2410c', secondary: '#fde68a' },
  { name: 'Tomato', primary: '#dc2626', secondary: '#facc15' },
  { name: 'Forest', primary: '#166534', secondary: '#bef264' },
  { name: 'Ocean', primary: '#0e7490', secondary: '#fcd34d' },
  { name: 'Royal', primary: '#4338ca', secondary: '#f9a8d4' },
  { name: 'Blush', primary: '#be185d', secondary: '#fbcfe8' },
  { name: 'Mono', primary: '#18181b', secondary: '#e4e4e7' },
  { name: 'Olive', primary: '#3f4a1f', secondary: '#e9c46a' },
];
