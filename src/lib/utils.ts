import type { L, Lang } from './types';

export const uid = (prefix = '') =>
  prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const code = (len = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

export const tl = (text: L | undefined, lang: Lang) => (text ? (lang === 'ar' && text.ar ? text.ar : text.en) : '');

export const round2 = (n: number) => Math.round(n * 100) / 100;

const zeroDecimal = new Set(['LBP', 'IQD', 'SYP', 'JPY', 'KRW']);
export function money(amount: number, currency: string, lang: Lang) {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en', {
      style: 'currency',
      currency,
      maximumFractionDigits: zeroDecimal.has(currency) ? 0 : 2,
      minimumFractionDigits: zeroDecimal.has(currency) ? 0 : amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function timeAgo(ts: number, lang: Lang) {
  const s = Math.round((Date.now() - ts) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en', { numeric: 'auto' });
  if (s < 45) return lang === 'ar' ? 'الآن' : 'just now';
  if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
  return rtf.format(-Math.round(s / 86400), 'day');
}

export function fmtDate(ts: number | string, lang: Lang, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  const d = typeof ts === 'string' ? new Date(ts + (ts.length === 10 ? 'T00:00:00' : '')) : new Date(ts);
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en', opts).format(d);
}

export function fmtTime(ts: number, lang: Lang) {
  return fmtDate(ts, lang, { hour: 'numeric', minute: '2-digit' });
}

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const DAY = 86400000;

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function contrastOn(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? '#111827' : '#ffffff';
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export async function resizeImage(file: File, max = 640, type = 'image/jpeg', quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL(type, quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
