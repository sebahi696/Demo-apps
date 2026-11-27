// Builds a complete, realistic demo (config + data) from questionnaire answers.
import type { AppUi, Customer, Demo, DemoConfig, DemoData, Fulfillment, Industry, Lang, Order, PaymentKey, Reservation } from './types';
import { DEFAULT_TIERS, PRESETS, COUNTRIES, BRANCH_NAMES, LEBANON_ZONES } from './presets';
import { DAY, code, round2, seeded, uid, ymd } from './utils';
import { PLATFORM } from '../platform.config';

const NAMES = [
  'Rami Haddad', 'Lina Khoury', 'Omar Saleh', 'Maya Aoun', 'Karim Nassar', 'Sara Fares', 'Jad Mansour', 'Nour Hamdan',
  'Hadi Zein', 'Yasmine Rizk', 'Ali Kassem', 'Rita Gemayel', 'Tony Matar', 'Dana Itani', 'Fadi Sleiman', 'Hiba Chami',
  'Marc Daher', 'Layal Saad', 'Ziad Bou Khalil', 'Joelle Abi Nader', 'Hassan Moussa', 'Carla Azar', 'Elie Karam', 'Reem Jaber',
  'Sami Kanaan', 'Tala Yassine', 'Georges Frem', 'Mira Habib', 'Bilal Ghandour', 'Christelle Salem', 'Ahmad Diab',
  'Nadine Saliba', 'Walid Harb', 'Lara Chahine', 'Rabih Atallah', 'Zeina Sabbagh',
];

const REVIEWS: [number, string][] = [
  [5, 'Amazing as always!'], [5, 'Fast and super friendly staff.'], [5, 'Best in town, highly recommend.'], [4, 'Very good, a bit late today.'],
  [4, 'Loved it. Packaging could be better.'], [5, 'Perfect 👌'], [3, 'Good but took longer than expected.'], [5, ''], [4, ''], [2, 'Order was missing an item.'],
];
const reviewFor = (r: (n: number) => number) => {
  const [rating, review] = REVIEWS[r(REVIEWS.length)];
  return { rating, review: review || undefined };
};

export interface WizardAnswers {
  industry: Industry;
  business: DemoConfig['business'];
  brand: DemoConfig['brand'];
  modules: DemoConfig['modules'];
  payments: DemoConfig['payments'];
  defaultLang: Lang;
  lead: DemoConfig['lead'];
  ui?: Partial<AppUi>;
}

export function defaultAnswers(industry: Industry): WizardAnswers {
  const pr = PRESETS[industry];
  return {
    industry,
    business: {
      name: { en: '', ar: '' }, tagline: { ...pr.sampleTagline }, logoEmoji: pr.logoEmoji, phone: '', email: '', address: '',
      city: '', country: 'Lebanon', currency: 'USD', openTime: pr.hours[0], closeTime: pr.hours[1],
      closedDays: [], ordersPaused: false, busyExtraMinutes: 0,
    },
    brand: { primary: pr.palette.primary, secondary: pr.palette.secondary, radius: pr.radius, font: pr.font, headerStyle: 'solid' },
    modules: { ...pr.modules },
    payments: { card: true, applePay: true, googlePay: true, cash: true, wallet: pr.modules.wallet },
    defaultLang: 'en',
    lead: { ownerName: '', email: '', phone: '', answers: {} },
  };
}

export function buildConfig(a: WizardAnswers): DemoConfig {
  const pr = PRESETS[a.industry];
  const now = Date.now();
  const name = a.business.name.en.trim() ? a.business.name : pr.sampleName;
  return {
    id: uid('d'),
    createdAt: now,
    expiresAt: now + PLATFORM.trialDays * DAY,
    industry: a.industry,
    origin: 'wizard',
    business: { ...a.business, name: { en: name.en.trim(), ar: (name.ar || '').trim() || undefined } },
    brand: a.brand,
    defaultLang: a.defaultLang,
    modules: a.modules,
    payments: { ...a.payments, wallet: a.modules.wallet },
    fulfillment: {
      zones: structuredClone(a.business.country === 'Lebanon' ? LEBANON_ZONES : pr.zones), minOrder: 8,
      freeDeliveryOver: a.industry === 'fastfood' ? 15 : a.industry === 'bakery' ? 20 : 25,
      prepMinutes: { cafe: 10, bakery: 15, fastfood: 20, restaurant: 25 }[a.industry] ?? 20,
      taxRate: 11, taxIncluded: true,
    },
    loyalty: {
      pointsPerUnit: pr.pointsPerUnit, stampsTarget: pr.stampsTarget, stampReward: pr.stampReward, stampRule: pr.stampRule,
      stampCategoryIds: [...pr.stampCategoryIds], signupBonus: 50, referralBonus: 100, birthdayReward: BIRTHDAY[a.industry],
      staticQr: { dailyLimit: 2, cooldownMinutes: 60, requirePin: false, pin: '4321' },
      tiers: structuredClone(DEFAULT_TIERS),
    },
    reservations: { ...pr.reservations, daysAhead: 14 },
    branches: makeBranches(a.lead.answers.branches, a.business.city, a.business.phone),
    wallet: { topUps: [10, 25, 50, 100], bonusPercent: 10 },
    tips: [0, 5, 10, 15],
    dual: defaultDual(a.business.country, a.business.currency),
    ui: { ...defaultUi(a.industry), ...(a.ui ?? {}) },
    lead: a.lead,
  };
}

export const defaultUi = (industry: Industry): AppUi => ({
  theme: 'light',
  header: industry === 'fastfood' ? 'gradient' : 'solid',
  menuLayout: industry === 'bakery' ? 'grid' : industry === 'fastfood' ? 'large' : 'list',
  cardStyle: 'elevated',
  sections: ['active', 'loyalty', 'quick', 'banners', 'deals', 'reorder', 'categories', 'favorites', 'popular', 'new', 'info'],
  coverEmoji: PRESETS[industry]?.emoji ?? '🍽️',
  showCalories: true,
});

const defaultDual = (country: string, currency: string) => ({
  enabled: country === 'Lebanon' && currency === 'USD', currency: 'LBP', rate: 89500, roundTo: 5000,
});

const RIDERS = [['Khaled M.', '1001'], ['Rami H.', '1002'], ['Ali S.', '1003']];

const BIRTHDAY: Record<string, { en: string; ar: string }> = {
  restaurant: { en: 'Free birthday dessert 🎂', ar: 'حلوى مجانية في عيد ميلادك 🎂' },
  cafe: { en: 'Free birthday drink 🎂', ar: 'مشروب مجاني في عيد ميلادك 🎂' },
  bakery: { en: 'Free birthday cupcake box 🎂', ar: 'علبة كب كيك مجانية في عيد ميلادك 🎂' },
  fastfood: { en: 'Free birthday meal 🎂', ar: 'وجبة مجانية في عيد ميلادك 🎂' },
};

function makeBranches(answer: string | undefined, city: string, phone: string) {
  const n = !answer || answer === '1' ? 1 : answer.startsWith('2') ? 3 : answer.startsWith('6') ? 4 : 5;
  return Array.from({ length: n }, (_, i) => ({
    id: 'br' + (i + 1),
    name: i === 0 && n === 1 ? { en: city || 'Main branch', ar: city || 'الفرع الرئيسي' } : BRANCH_NAMES[i % BRANCH_NAMES.length],
    address: `${BRANCH_NAMES[i % BRANCH_NAMES.length].en} street ${10 + i * 7}${city ? ', ' + city : ''}`,
    phone,
  }));
}

/** Fill fields added in later versions, so older saved demos keep working. */
export function migrateConfig(c: DemoConfig): DemoConfig {
  const m = c.modules as Record<string, boolean>;
  if (!PRESETS[c.industry]) c.industry = 'restaurant'; // older demos (e.g. retail) open as restaurants
  for (const k of ['wallet', 'tips', 'reviews', 'referrals', 'tableQr']) if (m[k] === undefined) m[k] = true;
  c.ui ??= defaultUi(c.industry);
  c.business.closedDays ??= [];
  c.business.ordersPaused ??= false;
  c.business.busyExtraMinutes ??= 0;
  c.branches ??= makeBranches(c.lead?.answers?.branches, c.business.city, c.business.phone);
  c.wallet ??= { topUps: [10, 25, 50, 100], bonusPercent: 10 };
  c.tips ??= [0, 5, 10, 15];
  c.loyalty.referralBonus ??= 100;
  c.loyalty.birthdayReward ??= BIRTHDAY[c.industry];
  (c.payments as Record<string, boolean>).wallet ??= m.wallet;
  c.dual ??= defaultDual(c.business.country, c.business.currency);
  return c;
}

/**
 * Gives a finished order a realistic timeline (accepted → preparing → ready → out → done) with the
 * staff member who handled each step, so staff, kitchen and rider reports have real durations.
 * Deterministic per order number, so older demos get the same timeline every time they load.
 */
export function fillTimeline(o: Order, c: DemoConfig, staff: DemoData['staff']) {
  if ((o.status !== 'completed' && o.status !== 'cancelled') || o.history.some((h) => h.status === 'accepted' || h.status === 'ready')) return;
  const rnd = seeded(o.number * 7919 + 13);
  const r = (n: number) => Math.floor(rnd() * n);
  const front = staff.filter((s) => s.role !== 'kitchen');
  const kitchen = staff.filter((s) => s.role === 'kitchen');
  const who = (list: typeof staff) => (list.length ? list[r(list.length)] : staff[0])?.id;
  const t0 = o.createdAt;
  const h: Order['history'] = [{ status: 'pending', at: t0 }];
  if (o.status === 'cancelled') {
    h.push({ status: 'cancelled', at: t0 + (1 + r(4)) * 60000, by: who(front) });
  } else {
    const prep = Math.max(5, Math.round((c.fulfillment.prepMinutes || 15) * (0.6 + rnd() * 0.9)));
    let t = t0 + (30 + r(240)) * 1000;
    h.push({ status: 'accepted', at: t, by: who(front) });
    t += (1 + r(3)) * 60000;
    h.push({ status: 'preparing', at: t, by: who(kitchen) });
    t += prep * 60000;
    h.push({ status: 'ready', at: t, by: who(kitchen) });
    if (o.fulfillment === 'delivery') {
      t += (2 + r(8)) * 60000;
      h.push({ status: 'outForDelivery', at: t, by: who(front) });
      const eta = c.fulfillment.zones.find((z) => z.id === o.zoneId)?.eta ?? 30;
      t += Math.round(eta * (0.55 + rnd() * 0.8)) * 60000;
    } else t += (3 + r(15)) * 60000;
    if (o.status === 'completed') h.push({ status: 'completed', at: t, by: o.fulfillment === 'delivery' ? undefined : who(front) });
  }
  // Never end in the future (orders placed minutes ago): slide the whole timeline back.
  const over = h[h.length - 1].at - Date.now();
  if (over > 0) {
    h.forEach((x) => (x.at -= over + 60000));
    o.createdAt = h[0].at;
  }
  o.history = h;
  o.updatedAt = h[h.length - 1].at;
}

export function migrateData(d: DemoData, c: DemoConfig): DemoData {
  d.favorites ??= [];
  d.stockAlerts ??= [];
  d.giftCards ??= [];
  d.walletTx ??= [];
  d.products.forEach((p) => (p.tags ??= []));
  d.customers.forEach((x) => {
    x.wallet ??= 0;
    x.referralCode ??= (x.name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'FRND') + code(3);
  });
  d.orders.forEach((o) => (o.tip ??= 0));
  d.riders ??= RIDERS.map(([name, pin], i) => ({ id: 'rd' + (i + 1), name, phone: '+961 76 ' + (300100 + i * 1111), pin, active: true, onShift: i < 2, shiftStart: Date.now() - 4 * 3600000 }));
  d.collections ??= [];
  d.serviceRequests ??= [];
  d.settlements ??= [];
  d.orders.forEach((o) => fillTimeline(o, c, d.staff));
  return d;
}

export function buildData(cfg: DemoConfig): DemoData {
  const pr = PRESETS[cfg.industry];
  const rnd = seeded(cfg.createdAt % 100000);
  const r = (n: number) => Math.floor(rnd() * n);
  const now = Date.now();
  const dial = COUNTRIES.find((c) => c.name.en === cfg.business.country)?.dial ?? '+961';
  const phone = () => `${dial} ${70 + r(20)} ${100 + r(900)} ${100 + r(900)}`;
  const products = structuredClone(pr.products);

  const meId = 'me';
  const customers: Customer[] = [
    { id: meId, name: cfg.defaultLang === 'ar' ? 'ضيف التجربة' : 'Demo Guest', phone: `${dial} 70 000 000`, points: 180, lifetimePoints: 620, stamps: Math.max(0, pr.stampsTarget - 2), joinedAt: now - 40 * DAY, lastSeenAt: now, wallet: cfg.modules.wallet ? 12 : 0, referralCode: 'GUEST' + code(3) },
    ...NAMES.map((name, i) => ({
      id: 'c' + i, name, phone: phone(), points: 0, lifetimePoints: 0, stamps: 0,
      joinedAt: i >= NAMES.length - 3 ? now - (2 + r(9)) * DAY : now - (20 + r(160)) * DAY, lastSeenAt: now - r(30) * DAY,
      wallet: cfg.modules.wallet && r(3) === 0 ? 5 * (1 + r(10)) : 0, referralCode: name.split(' ')[0].toUpperCase().slice(0, 5) + code(3),
      birthday: `${String(1 + r(12)).padStart(2, '0')}-${String(1 + r(28)).padStart(2, '0')}`,
    })),
  ];

  const fulfills: Fulfillment[] = (['delivery', 'pickup', 'dineIn'] as Fulfillment[]).filter((f) => cfg.modules[f]);
  if (!fulfills.length) fulfills.push('pickup');
  const pays: PaymentKey[] = (Object.keys(cfg.payments) as PaymentKey[]).filter((k) => cfg.payments[k]);
  if (!pays.length) pays.push('cash');

  const orders: Order[] = [];
  const ledger: DemoData['ledger'] = [];
  let num = 1001;
  const makeOrder = (custIdx: number, at: number, status: Order['status']): Order => {
    const c = customers[custIdx];
    const count = 1 + r(4);
    const items = Array.from({ length: count }, () => {
      const p = products[r(products.length)];
      return { productId: p.id, name: p.name, emoji: p.emoji, qty: 1 + (r(4) === 0 ? 1 : 0), unitPrice: p.price, options: [] };
    });
    const subtotal = round2(items.reduce((s, i) => s + i.qty * i.unitPrice, 0));
    const f = fulfills[r(fulfills.length)];
    const zone = cfg.fulfillment.zones[r(cfg.fulfillment.zones.length)];
    const deliveryFee = f === 'delivery' && subtotal < cfg.fulfillment.freeDeliveryOver ? zone.fee : 0;
    const discount = r(6) === 0 ? round2(subtotal * 0.15) : 0;
    const total = round2(subtotal - discount + deliveryFee);
    const pts = status === 'completed' && cfg.modules.loyaltyPoints ? Math.floor(total * cfg.loyalty.pointsPerUnit) : 0;
    const sts = status === 'completed' && cfg.modules.loyaltyStamps ? 1 : 0;
    return {
      id: uid('o'), number: num++, customerId: c.id, customerName: c.name, items, subtotal, discount, deliveryFee,
      tax: round2(((subtotal - discount) * cfg.fulfillment.taxRate) / (100 + cfg.fulfillment.taxRate)), total, fulfillment: f,
      zoneId: f === 'delivery' ? zone.id : undefined, address: f === 'delivery' ? 'Main street, building ' + (1 + r(40)) : undefined,
      table: f === 'dineIn' ? String(1 + r(20)) : undefined, payment: pays[r(pays.length)], paid: status === 'completed' || r(2) === 0,
      status, history: [{ status: 'pending', at }, ...(status !== 'pending' ? [{ status, at: at + 15 * 60000 }] : [])],
      createdAt: at, updatedAt: at + 15 * 60000, pointsEarned: pts, stampsEarned: sts,
      tip: f !== 'delivery' && cfg.modules.tips && r(3) === 0 ? round2(subtotal * 0.1) : 0,
      riderId: f === 'delivery' && status === 'completed' ? 'rd' + (1 + r(3)) : undefined,
      lostReason: status === 'cancelled' ? (['busy', 'busy', 'soldOut', 'outsideArea', 'customer', 'closed'] as const)[r(6)] : undefined,
      branchId: cfg.branches[r(cfg.branches.length)]?.id,
      ...(status === 'completed' && cfg.modules.reviews && r(5) < 2 ? reviewFor(r) : {}),
    };
  };

  // ~45 days of history, busier on weekends and in the evening
  for (let day = 62; day >= 1; day--) {
    const date = new Date(now - day * DAY);
    const weekend = [5, 6, 0].includes(date.getDay());
    const count = 2 + r(4) + (weekend ? 2 : 0) + Math.floor((62 - day) / 21);
    for (let k = 0; k < count; k++) {
      const hour = 9 + r(13);
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, r(60)).getTime();
      // A few loyal regulars order most; many customers order rarely (realistic audiences).
      const who = 1 + Math.min(NAMES.length - 1, Math.floor(Math.pow(rnd(), 2.2) * NAMES.length));
      const o = makeOrder(day > 25 || rnd() < 0.7 ? who : 1 + r(8), at, r(18) === 0 ? 'cancelled' : 'completed');
      orders.push(o);
      const c = customers.find((x) => x.id === o.customerId)!;
      c.lastSeenAt = Math.max(c.lastSeenAt, at);
      if (o.pointsEarned || o.stampsEarned) {
        c.points += o.pointsEarned;
        c.lifetimePoints += o.pointsEarned;
        c.stamps = (c.stamps + o.stampsEarned) % cfg.loyalty.stampsTarget;
        ledger.push({ id: uid('l'), customerId: c.id, points: o.pointsEarned, stamps: o.stampsEarned, source: 'order', note: `Order #${o.number}`, ref: o.id, at: o.updatedAt });
      }
    }
  }
  // Earlier today (for the live dashboard, riders' cash and the daily close)
  const nowD = new Date(now);
  const todayCount = Math.max(3, Math.min(9, nowD.getHours() - 9));
  for (let k = 0; k < todayCount; k++) {
    const at = now - (30 + r(Math.max(60, (nowD.getHours() - 9) * 60))) * 60000;
    if (at < new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate()).getTime()) continue;
    const o = makeOrder(1 + r(NAMES.length), at, r(9) === 0 ? 'cancelled' : 'completed');
    if (cfg.modules.delivery && o.status === 'completed' && k % 3 !== 2) {
      o.fulfillment = 'delivery';
      o.payment = cfg.payments.cash ? 'cash' : o.payment;
      o.riderId = 'rd' + (1 + (k % 2));
      o.zoneId = cfg.fulfillment.zones[0]?.id;
      o.address = o.address ?? 'Main street, building ' + (1 + r(40));
    }
    orders.push(o);
  }
  // An offer sent 20 days ago and the orders that used it
  const offerCode = 'MISSYOU15';
  orders.filter((o) => o.status === 'completed' && o.createdAt > now - 19 * DAY).filter(() => r(5) === 0).slice(0, 14).forEach((o) => {
    o.couponCode = offerCode;
    o.discount = round2(o.subtotal * 0.15);
    o.total = round2(o.subtotal - o.discount + o.deliveryFee);
  });
  // Cash riders collected today and haven't handed in yet
  const collections: DemoData['collections'] = [];
  const todayKey = ymd(nowD);
  orders.filter((o) => o.riderId && o.payment === 'cash' && ymd(new Date(o.createdAt)) === todayKey).forEach((o) => {
    o.collected = o.total;
    collections.push({ id: uid('cc'), riderId: o.riderId!, orderId: o.id, orderNumber: o.number, amount: o.total, at: o.updatedAt, settled: false });
  });
  const settlements: DemoData['settlements'] = [];
  // Past hand-ins match the cash orders each rider actually delivered that day.
  for (let day = 1; day <= 14; day++) {
    const key = ymd(new Date(now - day * DAY));
    RIDERS.forEach((_, i) => {
      const id = 'rd' + (i + 1);
      const cash = orders.filter((o) => o.riderId === id && o.status === 'completed' && o.payment === 'cash' && ymd(new Date(o.createdAt)) === key);
      if (!cash.length) return;
      const collected = round2(cash.reduce((a, o) => a + o.total, 0));
      cash.forEach((o) => (o.collected = o.total));
      const short = r(8) === 0 ? 5 * (1 + r(2)) : 0;
      settlements.push({ id: uid('st'), riderId: id, collected, counted: round2(collected - short), short, at: new Date(key + 'T23:30').getTime() });
    });
  }

  // Customers already redeemed real rewards (vouchers issued, most of them used).
  const vouchers: DemoData['vouchers'] = [];
  const rewardList = pr.rewards.filter((x) => x.active);
  customers.slice(1).forEach((c) => {
    for (let k = 0; k < 3 && rewardList.length; k++) {
      const rw = rewardList[r(rewardList.length)];
      if (c.points < rw.cost + 50 || r(3) === 0) break;
      const when = now - (1 + r(55)) * DAY;
      c.points -= rw.cost;
      ledger.push({ id: uid('l'), customerId: c.id, points: -rw.cost, stamps: 0, source: 'reward', note: rw.name.en, at: when });
      const used = r(5) !== 0;
      vouchers.push({ id: uid('v'), code: 'RW-' + code(5), customerId: c.id, rewardId: rw.id, name: rw.name, emoji: rw.emoji, kind: rw.kind, value: rw.value, productId: rw.productId, status: used ? 'used' : 'active', createdAt: when, usedAt: used ? Math.min(now - 3600000, when + (1 + r(48)) * 3600000) : undefined });
    }
  });
  // One past order for the demo guest, so "order again" works
  const mine = makeOrder(0, now - 3 * DAY, 'completed');
  mine.pointsEarned = 0;
  mine.stampsEarned = 0;
  orders.push(mine);
  ledger.push({ id: uid('l'), customerId: meId, points: 50, stamps: 0, source: 'signup', note: 'Welcome bonus', at: now - 40 * DAY });

  // Live orders waiting for staff
  orders.push(makeOrder(1 + r(NAMES.length), now - 4 * 60000, 'pending'));
  orders.push(makeOrder(1 + r(NAMES.length), now - 11 * 60000, 'preparing'));
  orders.sort((a, b) => b.createdAt - a.createdAt);

  const reservations: Reservation[] = [];
  if (cfg.modules.reservations) {
    const times = ['12:00', '13:00', '18:00', '19:00', '19:30', '20:00', '20:30', '21:00', '11:00', '16:00'];
    for (let k = 0; k < 9; k++) {
      const c = customers[1 + r(NAMES.length)];
      const date = ymd(new Date(now + (k < 4 ? 0 : 1 + r(5)) * DAY));
      reservations.push({
        id: uid('r'), customerId: c.id, name: c.name, phone: c.phone, date, time: times[r(times.length)], party: 2 + r(5),
        status: (['pending', 'confirmed', 'confirmed'] as const)[r(3)], createdAt: now - r(3) * DAY,
      });
    }
  }

  const data: DemoData = {
    categories: structuredClone(pr.categories),
    products,
    rewards: structuredClone(pr.rewards),
    deals: pr.deals.map(({ flashHours, ...d }) => ({ ...structuredClone(d), endsAt: flashHours ? now + flashHours * 3600000 : undefined })),
    banners: structuredClone(pr.banners),
    customers,
    meId,
    cart: { items: [] },
    orders,
    reservations,
    ledger: ledger.sort((a, b) => b.at - a.at).slice(0, 300),
    vouchers,
    notices: [
      {
        id: uid('n'), kind: 'system', at: now, read: false,
        title: { en: `Welcome to ${cfg.business.name.en}!`, ar: `أهلاً بك في ${cfg.business.name.ar || cfg.business.name.en}!` },
        body: { en: 'You have 180 points to start — try redeeming a reward.', ar: 'لديك 180 نقطة للبدء — جرّب استبدال مكافأة.' },
      },
    ],
    campaigns: [
      { id: uid('c'), title: { en: 'Weekend special 🎉', ar: 'عرض نهاية الأسبوع 🎉' }, body: { en: 'Double points all weekend long.', ar: 'نقاط مضاعفة طوال عطلة نهاية الأسبوع.' }, audience: 'all', reach: 34, sentAt: now - 9 * DAY },
      { id: uid('c'), title: { en: 'We miss you!', ar: 'اشتقنا لك!' }, body: { en: 'Here’s 15% off your next order.', ar: 'إليك خصم 15% على طلبك القادم.' }, audience: 'quiet', reach: 11, sentAt: now - 20 * DAY, code: 'MISSYOU15' },
    ],
    staff: [
      { id: 's1', name: 'Rami (Manager)', role: 'manager', pin: '1234', active: true },
      { id: 's2', name: 'Lina', role: 'cashier', pin: '1111', active: true },
      { id: 's3', name: 'Omar', role: 'kitchen', pin: '2222', active: true },
    ],
    favorites: [],
    stockAlerts: [],
    giftCards: [],
    riders: RIDERS.map(([name, pin], i) => ({ id: 'rd' + (i + 1), name, phone: '+961 76 ' + (300100 + i * 1111), pin, active: true, onShift: i < 2, shiftStart: now - 4 * 3600000, branchId: undefined })),
    collections,
    settlements,
    serviceRequests: [],
    walletTx: cfg.modules.wallet ? [{ id: uid('w'), customerId: meId, amount: 12, kind: 'gift', note: 'Welcome credit', at: now - 5 * DAY }] : [],
    usedTokens: [],
    staticScans: [],
    tour: {},
    activity: {},
    nextOrderNumber: num,
  };
  data.orders.forEach((o) => fillTimeline(o, cfg, data.staff));
  return data;
}

export function buildDemo(a: WizardAnswers): Demo {
  const config = buildConfig(a);
  return { config, data: buildData(config) };
}
