// ───────────────────────────────────────────────────────────────
// Cloud lead sync. Each demo reports a summary (config, answers,
// what was tried) to Supabase, so the Sales console can see demos
// made on any device. Business data (orders, customers) stays local.
// ───────────────────────────────────────────────────────────────
import { PLATFORM } from '../platform.config';
import { useStore } from './store';
import type { Demo, DemoConfig } from './types';

export const cloudOn = () => !!PLATFORM.cloud?.url && !!PLATFORM.cloud?.key;

async function rpc<T>(fn: string, body: unknown): Promise<T> {
  const r = await fetch(`${PLATFORM.cloud.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: PLATFORM.cloud.key, Authorization: `Bearer ${PLATFORM.cloud.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

export interface CloudLead {
  id: string;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
  expires_at: string | null;
  industry: string;
  business_name: string;
  owner_name: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  origin: string | null;
  parent_id: string | null;
  config: DemoConfig;
  activity: Record<string, number>;
  tour: Record<string, boolean>;
  stats: { productsAdded?: number; tourDone?: number };
}

const summary = (d: Demo) => {
  const c = d.config;
  return {
    id: c.id,
    expires_at: new Date(c.expiresAt).toISOString(),
    industry: c.industry,
    business_name: c.business.name.en,
    owner_name: c.lead.ownerName,
    phone: c.lead.phone,
    email: c.lead.email,
    country: c.business.country,
    city: c.business.city,
    origin: c.origin ?? 'wizard',
    parent_id: c.parentId ?? null,
    config: c,
    activity: d.data.activity,
    tour: d.data.tour,
    stats: {
      productsAdded: d.data.products.filter((p) => !/^p\d+$/.test(p.id)).length,
      tourDone: Object.keys(d.data.tour).length,
    },
  };
};

/** Report one demo now. Picks up a trial extension made in the Sales console. */
export async function reportDemo(d: Demo) {
  if (!cloudOn() || d.config.noSync) return;
  try {
    const exp = await rpc<string | null>('demo_studio_upsert', { p: summary(d) });
    if (exp) {
      const t = new Date(exp).getTime();
      if (t > d.config.expiresAt + 1000) useStore.getState().update(d.config.id, (x) => void (x.config.expiresAt = t));
    }
  } catch {
    /* offline — will retry on the next change or app start */
  }
}

// Watch the store and report demos whose config / activity changed (debounced).
const sig = (d: Demo) => JSON.stringify([d.config, d.data.activity, d.data.tour, d.data.products.length]);
const lastSig = new Map<string, string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

let started = false;
export function startCloudSync() {
  if (!cloudOn() || started) return;
  started = true;
  const check = (initial: boolean) => {
    const demos = useStore.getState().demos;
    for (const d of Object.values(demos)) {
      if (d.config.noSync) continue;
      const s = sig(d);
      if (lastSig.get(d.config.id) === s) continue;
      const first = !lastSig.has(d.config.id);
      lastSig.set(d.config.id, s);
      clearTimeout(timers.get(d.config.id));
      const id = d.config.id;
      timers.set(id, setTimeout(() => {
        const cur = useStore.getState().demos[id];
        if (cur) reportDemo(cur);
      }, initial || first ? 300 : 4000));
    }
  };
  check(true);
  useStore.subscribe(() => check(false));
}

export const checkPasscode = (passcode: string) => rpc<boolean>('demo_studio_check', { passcode });
export const listLeads = (passcode: string) => rpc<CloudLead[]>('demo_studio_list', { passcode });
export const extendLead = (passcode: string, id: string, days: number) => rpc<string>('demo_studio_extend', { passcode, demo_id: id, days });
export const deleteLead = (passcode: string, id: string) => rpc<null>('demo_studio_delete', { passcode, demo_id: id });
