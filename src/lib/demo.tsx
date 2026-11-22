import { createContext, useCallback, useContext } from 'react';
import { useStore } from './store';
import { useI18n } from './i18n';
import { PRESETS } from './presets';
import { money } from './utils';
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
  return { id, demo, cfg, data: demo.data, update, m, preset, terms: preset.terms, base: `/d/${id}`, ...i18n };
}
