import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { DemoConfig } from './types';
import { buildData } from './seed';
import { uid, DAY } from './utils';
import { PLATFORM } from '../platform.config';

/**
 * A share link carries the demo's *configuration* (branding, modules,
 * settings) inside the URL. Whoever opens it gets their own fresh copy
 * with sample data — no server needed.
 */
export function shareLink(cfg: DemoConfig) {
  const payload = compressToEncodedURIComponent(JSON.stringify(cfg));
  return `${location.origin}${location.pathname}#/i/${payload}`;
}

export function importFromPayload(payload: string) {
  const json = decompressFromEncodedURIComponent(payload);
  if (!json) throw new Error('bad link');
  const src = JSON.parse(json) as DemoConfig;
  const now = Date.now();
  const config: DemoConfig = { ...src, id: uid('d'), createdAt: now, expiresAt: Math.max(src.expiresAt, now + PLATFORM.trialDays * DAY) };
  return { config, data: buildData(config) };
}
