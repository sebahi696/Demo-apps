// ───────────────────────────────────────────────────────────────
// Client mode. When the site is built with CLIENT=<slug>, the file
// clients/<slug>.json is bundled in and the app runs as THAT
// business's own app: no landing page, questionnaire, demo bar,
// tour or trial. Built normally, CLIENT_PKG is null (demo machine).
// ───────────────────────────────────────────────────────────────
import pkg from '@client';
import type { Demo, DemoConfig, DemoData } from './types';
import { buildData, migrateConfig, migrateData } from './seed';
import { DAY } from './utils';

export interface ClientPackage {
  format: 'demo-studio-client';
  version: 1;
  exportedAt: string;
  slug: string;
  domain?: string;
  ownerPin: string;
  config: DemoConfig;
  catalog: Pick<DemoData, 'categories' | 'products' | 'rewards' | 'deals' | 'banners' | 'staff' | 'riders'>;
}

export const CLIENT_PKG = (pkg as unknown as ClientPackage | null) ?? null;
export const CLIENT_MODE = !!CLIENT_PKG;

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 40) || 'client';

/** Everything the client set up in their demo, as one JSON file for the build. */
export function exportPackage(d: Demo, ownerPin = String(1000 + Math.floor(Math.random() * 9000))): ClientPackage {
  const c = structuredClone(d.config);
  c.expiresAt = Date.now() + 3650 * DAY;
  c.noSync = true;
  const { categories, products, rewards, deals, banners, staff, riders } = structuredClone(d.data);
  return {
    format: 'demo-studio-client', version: 1, exportedAt: new Date().toISOString(),
    slug: slugify(c.business.name.en), ownerPin, config: c,
    catalog: { categories, products, rewards, deals, banners, staff, riders },
  };
}

export function downloadPackage(d: Demo) {
  const p = exportPackage(d);
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${p.slug}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return p.slug;
}

/** A clean store for a real launch: the client's menu, no sample customers or orders. */
export function clientDemo(p: ClientPackage): Demo {
  const config = migrateConfig(structuredClone(p.config));
  config.expiresAt = Date.now() + 3650 * DAY;
  config.noSync = true;
  const base = buildData(config);
  const me = { ...base.customers[0], name: config.defaultLang === 'ar' ? 'ضيف' : 'Guest', phone: '', points: 0, lifetimePoints: 0, stamps: 0, wallet: 0 };
  const data: DemoData = migrateData({
    ...base,
    ...structuredClone(p.catalog),
    customers: [me],
    orders: [], reservations: [], ledger: [], vouchers: [], campaigns: [], collections: [], settlements: [], walletTx: [], giftCards: [],
    notices: [], serviceRequests: [], tour: {}, activity: {}, nextOrderNumber: 1001,
  }, config);
  return { config, data };
}
