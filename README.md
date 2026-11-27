# Demo Studio — try-before-you-buy app machine

A restaurant, café, bakery or fast-food owner answers a short questionnaire and gets a **working, branded ordering app**: customer PWA, staff & kitchen screen, rider app and owner panel. They use it like it's theirs. When they sign, their demo is exported and built into their own app — see **[CLIENTS.md](CLIENTS.md)**.

Business types (F&B only): **Restaurant & grill · Café · Bakery & desserts · Pizzeria & fast food**.
Languages: **English + Arabic** (full RTL).
Hosting: **GitHub Pages, free**. Business data stays in each visitor's browser. Only a lead summary goes to a small Supabase table, so sales can see every demo.

---

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the build
```

## Put it online (GitHub Pages)

1. Create a GitHub repo and push this folder to the `main` branch.
2. In the repo, go to **Settings → Pages → Source** and choose **GitHub Actions**.
3. Every push to `main` builds and publishes to `https://<user>.github.io/<repo>/`.

The workflow is in `.github/workflows/deploy.yml`. It sets the base path to the repo name automatically.

## Make it yours

Edit **`src/platform.config.ts`**:

| Setting | What it does |
|---|---|
| `name`, `tagline` | Your agency / product name on the landing page |
| `salesWhatsApp`, `salesEmail` | "Talk to us" buttons in the demo, the plan page and the expired screen |
| `trialDays` | How long a demo stays open (default 14) |
| `cloud` | Supabase URL + publishable key. Every demo reports a summary (business, contact, answers, what was tried) so the Sales console sees demos from **all devices** |
| `leadWebhook` | Optional Formspree / Make / Zapier / Google Apps Script URL. Every questionnaire is POSTed there as JSON, so you get leads by email or in a sheet |

Replace `public/icon.svg` and the PNGs with your own logo.

---

## How it works

```
Landing (#/)  →  Questionnaire (#/start)  →  Demo (#/d/<id>/app | staff | owner)
                                               ↑
Sales console (#/sales)  —  share links (#/i/<config>) open a fresh copy on any phone
```

* **Everything runs in the browser.** Each demo is stored in the device's IndexedDB. Tabs on the same device sync live, so you can have the Owner panel in one tab and the Customer app in another.
* **Share links** carry the demo's configuration (brand, features, settings) inside the URL. Opening one on a phone creates that client's own copy with sample data.
* **Role switcher** (top bar): Customer / Staff (PIN `1234`) / Owner. One person can play every part.
* **Guided tour** (checklist icon): 10 tasks covering every feature. What the client actually used shows up in **My app plan** and in the Sales console.
* **Simulate store activity** (⋯ menu): orders move through the statuses by themselves.

### New in v4.0 — F&B edition
F&B only (retail removed; old retail demos open as restaurants) · new **bakery** and **pizzeria/fast-food** presets · **meal deals/combos** · **allergens**, calories, prep time, “order ahead” · option limits (“up to 3 toppings”) · **breakfast/time-limited categories** · **schedule orders** (today/tomorrow slots) · **Lebanese delivery areas** with per-area minimum order · **table service** (call waiter, ask for bill, water) · **kitchen display screen** with timers · **App design** page with live preview: light/dark theme, header style, menu layout (list / grid / big photos), card style, home sections order · **client template**: export a client package and `npm run build:client -- <slug>` builds their own PWA (no demo chrome, owner/staff/rider PIN gates), plus a GitHub Action and a Capacitor config for the native app.

### New in v3.0
**Rider app** (4th role): deliveries, navigate/call, collect cash on delivery, mark delivered · **dispatch** from the counter with a suggested rider · **live tracking map** for the customer · **Riders & cash** page: cash each rider holds, end-of-shift count with shortfall recorded per rider · **order chime** repeats every 20 s until accepted · **sold out per branch** in one tap · **lira/dollar** prices at the owner's rate + change calculator · **automatic audiences** (regulars, went quiet, new, birthdays) with offer codes and **results per campaign** (uses, sales, cost) · **lost orders with reasons** · weekly **heatmap** · **daily close** to WhatsApp · **Instagram order link** · landing **commission calculator** and **two launch options** (native app vs PWA, prices in `platform.config.ts`).

### New in v2.1
Opening days, **pause orders** and **busy mode** · **multi-branch** (branch picker, orders tagged by branch) · **dietary/label filters** (vegan, gluten-free, spicy, kids…) · **sale prices** with % badges · **favorites** · **back-in-stock alerts** · **wallet** (top-up with bonus, pay with wallet, refunds on cancel) · **gift cards** (buy, send, redeem) · **tips** at checkout · **ratings & reviews** with owner replies · **referral codes** and **birthday rewards** · **table QR codes** (print a sheet; scanning starts a dine-in order) · printable **kitchen/receipt tickets** · new owner pages: Reviews, Wallet & gifts. All switchable per business in Settings and in the questionnaire.

### Features in the demo

**Customer app (PWA):** home with banners, deals with countdowns, loyalty card · menu/shop with search, option groups (sizes, add-ons, colors), stock · cart, promo codes, reward vouchers · checkout with delivery zones, fees, minimum order, pickup time, dine-in table, VAT, fake card / Apple Pay / Google Pay / cash · live order tracking · points, stamp card, VIP tiers, rewards catalog, voucher QR · scan-to-earn (staff dynamic QR + counter static QR with daily limit, cooldown and PIN) · table / visit booking · notifications inbox · language switch · install guide · account deletion.

**Staff mode:** live order board with a sound for new orders · award points via a single-use 90-second QR, or by customer search · scan or validate vouchers · bookings (confirm / arrived / no-show).

**Owner panel:** dashboard (revenue chart, best sellers, channels, peak hours) · orders + CSV · catalog editor (photos, AR/EN, options, stock, categories) · customers + points adjustments + CSV · loyalty rules, tiers, rewards, printable counter QR · deals & flash deals · push campaigns with audience targeting · bookings rules · branding (logo, colors, fonts, corners, banners) with live preview · staff PINs · settings with **feature flags for every module** · "My app plan" summary to print or PDF.

---

## Code map

```
src/
  platform.config.ts     ← your settings
  lib/
    types.ts             data model (Demo = config + data)
    presets.ts           industries: modules, wording, sample catalog  ← add industries here
    seed.ts              builds a demo from questionnaire answers (+ 45 days of history)
    ops.ts               business logic: orders, loyalty, QR tokens, vouchers, bookings, campaigns
    store.ts             zustand + IndexedDB + cross-tab sync
    theme.ts / i18n.ts   per-demo colors and fonts, EN/AR
  pages/
    Landing, Wizard, Sales, ImportDemo, DemoLayout
    customer/  staff/  owner/
```

### Add a new industry (e.g. salon)
1. Add `'salon'` to `Industry` in `lib/types.ts`.
2. Copy the café block in `lib/presets.ts`, change the wording (`terms`), modules, categories, products, rewards and deals.
3. Add it to `PRESETS` and remove it from `COMING_SOON`.

Bookings already work. For per-staff calendars (salon/clinic), extend `reservations` in `ops.ts`.

### When a client signs
The demo code is the starting point for the real app:
* Move `ops.ts` into a real backend (each function becomes an API endpoint) with PostgreSQL + tenant isolation, or a hosted backend like Supabase/Firebase.
* Replace the store's IndexedDB storage with API calls.
* Wrap the customer app with Capacitor for the App Store / Google Play, or rebuild native screens on the same backend.
* Connect real payments (Stripe Connect or a local gateway) and real push notifications (FCM).

## Known limits (by design, it's a demo)
* Data lives on one device. A share link creates a copy, not a synced account.
* Payments are simulated. No money moves.
* The Sales passcode is checked on the server. To change it, run this in the Supabase SQL editor:
  `update demo_studio.settings set value = extensions.crypt('NEW-CODE', extensions.gen_salt('bf')) where key = 'sales_passcode_hash';`

## Cloud lead database (Supabase)
Schema `demo_studio` (table `leads`, locked with RLS) plus RPC functions `demo_studio_upsert` (public: a demo reports itself), and `demo_studio_list / _extend / _delete / _check` (need the sales passcode).
* Extending a trial (+7) in the Sales console reaches the client's phone the next time they open the app.
* "Preview" opens a private copy of a client's demo on your device, and that copy is never reported back.
* On iPhone, PWA push notifications only work after "Add to Home Screen" (iOS 16.4+). In-app notifications always work.

## v4.1 — audit fixes
- One smart input for the whole app: phone fields accept only digits, `+`, spaces and dashes (Arabic digits converted), 7–15 digits required; emails checked; PINs digits-only; number fields block letters/negatives, clamp to min/max, ignore the mouse wheel.
- Inline red errors on the wizard, reservation and checkout. Checkout now asks name + phone for delivery/pickup; staff and riders see the phone and can tap to call.
- Fixed: editing a product duplicated it in the menu. Deals reject duplicate codes and percent > 100. Campaigns can't be sent to an empty audience. Duplicate staff PINs are flagged.
- Money in Arabic no longer flips ("$US"); LBP shows as "LBP"/"ل.ل".
- Mobile demo bar no longer overflows; the checklist closes when you change screens on a phone. Switches no longer stretch rows. Printed tickets are HTML-escaped.

## v4.2 — reports, live preview, polish
- **Reports** (Owner → Reports): one date filter (today, yesterday, 7/30/90 days, this month, custom) and branch filter for every tab, compared with the previous period; CSV export and print on each tab.
  - Sales: revenue, orders, average order, money breakdown (gross, discounts, delivery, VAT, net, tips), daily trend vs previous period, channel and payment mix, busiest hours and weekdays, lost orders, speed of service, ratings, branches, bookings.
  - Invoices: numbered tax invoices (INV-YYYY-#####), filter paid/unpaid/cancelled, printable invoice / save as PDF.
  - Products: top items by sales or quantity, categories, slow movers.
  - Staff & kitchen: who accepted, prepared and declined orders, average accept and prep time, on-time rate, sales and tips per person (every status change now records the staff member).
  - Riders: deliveries, average time, on-time %, cash collected, short at hand-in, cash still held.
  - Deals & promos: every code with uses, customers, new customers, sales, discount and return; push campaigns with conversion.
  - Loyalty & wallet: points given/redeemed, active members, points liability, where points come from, rewards claimed, VIP tiers, wallet and gift cards.
  - Customers: first-time vs returning, repeat rate, groups, top customers.
- Charts follow a colour-blind-checked palette with hover tooltips; the dashboard uses the same charts.
- Wizard live preview now follows menu style (list/grid/big photos), light/dark, header, cards, fonts and corners, and shows on phones too.
- Dark mode keeps brand-coloured text readable; product sheet has quantity next to Add; delivery ASAP time includes travel; more room above the cart bar.

## v4.2.1 — live preview fix
- App design: every change now shows in the preview phone immediately. Two open screens no longer overwrite each other: settings and data are saved with their own revision, the newest wins, and screens that changed nothing don't re-save.
- The preview phone no longer runs the activity simulation, shows scrollbars or selects text when tapped.
