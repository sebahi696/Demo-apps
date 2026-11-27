# Launching a client — from signed deal to live app

The demo the client played with **is** the starting point. Their branding, menu, prices, photos, delivery areas,
loyalty rules, staff and riders are exported as one file and built into their own app.

> ⚠️ **Until the live backend is connected**, a client build keeps orders on each device (like the demo).
> Use client builds for the client's review / staging. Connect the backend before taking real orders.

---

## 1. Export the client package (2 min)

Either:
- **Owner panel → My app plan → Export client package** (on the device the client used), or
- **Sales console → Package** on the client's row (uses the latest settings they reported).

You get `<slug>.json` (e.g. `latavola.json`). Put it in the **`clients/`** folder of this repo and commit it.

Open the file to check/adjust:
| Field | What it is |
|---|---|
| `ownerPin` | PIN for `/#/owner` (random on export, change it) |
| `domain` | Optional, e.g. `order.latavola.com` — writes a CNAME |
| `config.business` | Name, logo, hours, address, currency |
| `config.ui` | Theme, header, menu layout, home sections |
| `catalog` | Categories, dishes, prices, rewards, deals, banners, staff (PINs), riders (PINs) |

## 2. Build their app (3 min)

**Without installing anything:** GitHub → **Actions → Build client app → Run workflow**, enter the slug
(and domain if any). Download the zip from the run's *Artifacts*.

**Or locally:**
```bash
npm install
npm run build:client -- latavola                       # for a domain or subdomain
npm run build:client -- latavola --base=/latavola/     # for a sub-path
npm run build:client -- latavola --domain=order.latavola.com
```
Output: `dist-clients/latavola/`

## 3. Put it online — Option 2 (PWA)

Upload the folder to any static host:
- **Netlify / Cloudflare Pages / Vercel:** drag-and-drop the folder, then add the client's domain.
- **The client's own hosting (cPanel):** upload into `public_html` or a subdomain folder.
- **Your domain:** e.g. `latavola.yourbrand.app` on Cloudflare Pages.

Then share:
- Customers: `https://<domain>/` — "Add to Home Screen" installs it with their logo.
- Counter / kitchen: `https://<domain>/#/staff` (staff PIN)
- Riders: `https://<domain>/#/rider` (rider PIN)
- Owner: `https://<domain>/#/owner` (owner PIN)
- Print the table QR codes and the counter QR from the owner panel.

## 4. Option 1 — App Store & Google Play (native)

The same build is wrapped with [Capacitor](https://capacitorjs.com):
```bash
npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/android @capacitor/ios
cp dist-clients/latavola.capacitor.config.json capacitor.config.json
npx cap add android && npx cap add ios
npx cap sync && npx cap open android     # Android Studio → build → upload to Play Console
npx cap open ios                         # Xcode (Mac) → Archive → App Store Connect
```
Needs the client's **Apple Developer** ($99/yr) and **Google Play** ($25 once) accounts, app icons and
store screenshots. Native push notifications come with the backend step.

## 5. Customising beyond the template

Everything visual is in **Owner → App design / Branding / Settings** — change it in the client's demo and
re-export. For code changes only this client needs, create a branch `client/<slug>` and build from it.
