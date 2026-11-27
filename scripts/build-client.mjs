#!/usr/bin/env node
// Build a client's own PWA from clients/<slug>.json
//   node scripts/build-client.mjs <slug> [--base=/path/] [--domain=order.example.com]
// Output: dist-clients/<slug>/  → upload to any static host (Netlify, Cloudflare Pages, Vercel, cPanel, GitHub Pages).
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const [slug, ...flags] = process.argv.slice(2);
const opt = Object.fromEntries(flags.map((f) => f.replace(/^--/, '').split('=')));
if (!slug) {
  console.error('Usage: npm run build:client -- <slug> [--base=/] [--domain=order.example.com]');
  process.exit(1);
}
const file = resolve('clients', `${slug}.json`);
if (!existsSync(file)) {
  console.error(`✗ clients/${slug}.json not found. Export it from the demo (Owner → My app plan → Export client package).`);
  process.exit(1);
}
const pkg = JSON.parse(readFileSync(file, 'utf8'));
const out = resolve('dist-clients', slug);
const env = { ...process.env, CLIENT: slug, OUT_DIR: out, BASE_PATH: opt.base ?? '/' };

console.log(`▶ Building ${pkg.config.business.name.en} (${slug}) → dist-clients/${slug}`);
execSync('npx tsc --noEmit', { stdio: 'inherit', env });
execSync('npx vite build', { stdio: 'inherit', env });

const domain = opt.domain ?? pkg.domain;
if (domain) writeFileSync(resolve(out, 'CNAME'), domain + '\n');
// SPA fallback for hosts that need it (hash routing works without it, this is just friendlier)
writeFileSync(resolve(out, '_redirects'), '/* /index.html 200\n');

// Ready-made config for the native (App Store / Google Play) version with Capacitor
mkdirSync(resolve('dist-clients'), { recursive: true });
const appId = 'app.' + slug.replace(/[^a-z0-9]/g, '');
writeFileSync(resolve('dist-clients', `${slug}.capacitor.config.json`), JSON.stringify({
  appId, appName: pkg.config.business.name.en, webDir: `dist-clients/${slug}`,
  backgroundColor: pkg.config.brand.primary, android: { allowMixedContent: false },
}, null, 2));

console.log(`
✓ Done: dist-clients/${slug}/
  • Upload that folder to the client's host${domain ? ` (CNAME set to ${domain})` : ''}.
  • Owner panel: <site>/#/owner   PIN ${pkg.ownerPin}   (change it in clients/${slug}.json → ownerPin)
  • Staff: <site>/#/staff   Riders: <site>/#/rider   (PINs from the package)
  • Native app: see CLIENTS.md → "Option 1" (Capacitor config written to dist-clients/${slug}.capacitor.config.json)
`);
