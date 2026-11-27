import { createContext, useCallback, useContext } from 'react';
import { useStore } from './store';
import { useI18n } from './i18n';
import { PRESETS } from './presets';
import { money } from './utils';
import { dualPrice } from './ops';
import type { Demo } from './types';

export const DemoIdContext = createContext<string>('');

/** Everything a demo screen needs: data, an updater, money formatting and the industry words. */
export function useDemo() {
  const id = useContext(DemoIdContext);
  const demo = useStore((s) => s.demos[id]);
  const updateRaw = useStore((s) => s.update);
  const i18n = useI18n();
  const update = useCallback((fn: (d: Demo) => void) => updateRaw(id, fn), [id, updateRaw]);
  const cfg = demo.config;
  const m = (n: number) => money(n, cfg.business.currency, i18n.lang);
  const preset = PRESETS[cfg.industry];
  /** Second-currency price, e.g. "1,430,000 LL", or '' when off */
  const m2 = (n: number) => {
    const v = dualPrice(demo, n);
    return v === null ? '' : `${v.toLocaleString('en')} ${cfg.dual.currency === 'LBP' ? (i18n.lang === 'ar' ? 'ل.ل' : 'LL') : cfg.dual.currency}`;
  };
  const branchId = demo.data.branchId ?? cfg.branches[0]?.id;
  return { id, demo, cfg, data: demo.data, update, m, m2, branchId, preset, terms: preset.terms, base: `/d/${id}`, ...i18n };
}
