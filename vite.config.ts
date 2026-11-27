import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Client build: CLIENT=<slug> bundles clients/<slug>.json and brands the PWA for that business.
const CLIENT = process.env.CLIENT;
const clientFile = resolve(__dirname, 'clients', CLIENT ? `${CLIENT}.json` : '_none.json');
const pkg = CLIENT ? JSON.parse(readFileSync(clientFile, 'utf8')) : null;
const appName: string = pkg?.config?.business?.name?.en ?? 'Demo Studio';
const appColor: string = pkg?.config?.brand?.primary ?? '#111827';
const logo: string | undefined = pkg?.config?.business?.logo;

// On GitHub Pages the site lives under /<repo-name>/ — the deploy workflow sets BASE_PATH.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  build: { chunkSizeWarningLimit: 900, outDir: process.env.OUT_DIR || 'dist' },
  resolve: { alias: { '@client': clientFile } },
  define: { __APP_VERSION__: JSON.stringify('4.0') },
  plugins: [
    react(),
    {
      name: 'client-branding',
      transformIndexHtml: (html) =>
        html.replace(/<title>.*<\/title>/, `<title>${appName}</title>`).replace(/content="#111827"/, `content="${appColor}"`).replace(/content="Demo Studio"/, `content="${appName}"`),
      generateBundle() {
        // A client's uploaded logo becomes the install icon
        if (logo?.startsWith('data:image/png;base64,')) {
          const source = Buffer.from(logo.split(',')[1], 'base64');
          this.emitFile({ type: 'asset', fileName: 'client-icon.png', source });
        }
      },
    },
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: appName,
        short_name: appName.slice(0, 12),
        description: pkg ? `Order from ${appName}` : 'Try your business app before it is built',
        theme_color: appColor,
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: logo?.startsWith('data:image/png') ? [
          { src: 'client-icon.png', sizes: '256x256', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ] : [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
