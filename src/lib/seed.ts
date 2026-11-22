// Builds a complete, realistic demo (config + data) from questionnaire answers.
import type { Customer, Demo, DemoConfig, DemoData, Fulfillment, Industry, Lang, Order, PaymentKey, Reservation } from './types';
import { DEFAULT_TIERS, PRESETS, COUNTRIES } from './presets';
import { DAY, round2, seeded, uid, ymd } from './utils';
import { PLATFORM } from '../platform.config';

const NAMES = [
  'Rami Haddad', 'Lina Khoury', 'Omar Saleh', 'Maya Aoun', 'Karim Nassar', 'Sara Fares', 'Jad Mansour', 'Nour Hamdan',
  'Hadi Zein', 'Yasmine Rizk', 'Ali Kassem', 'Rita Gemayel', 'Tony Matar', 'Dana Itani', 'Fadi Sleiman', 'Hiba Chami',
  'Marc Daher', 'Layal Saad', 'Ziad Bou Khalil', 'Joelle Abi Nader', 'Hassan Moussa', 'Carla Azar', 'Elie Karam', 'Reem Jaber',
  'Sami Kanaan', 'Tala Yassine', 'Georges Frem', 'Mira Habib', 'Bilal Ghandour', 'Christelle Salem', 'Ahmad Diab',
  'Nadine Saliba', 'Walid Harb', 'Lara Chahine', 'Rabih Atallah', 'Zeina Sabbagh',
];

export interface WizardAnswers {
  industry: Industry;
  business: DemoConfig['business'];
  brand: DemoConfig['brand'];
  modules: DemoConfig['modules'];
  payments: DemoConfig['payments'];
  defaultLang: Lang;
  lead: DemoConfig['lead'];
}

export function defaultAnswers(industry: Industry): WizardAnswers {
  const pr = PRESETS[industry];
  return {
    industry,
    business: {
      name: { en: '', ar: '' }, tagline: { ...pr.sampleTagline }, logoEmoji: pr.logoEmoji, phone: '', email: '', address: '',
      city: '', country: 'Lebanon', currency: 'USD', openTime: pr.hours[0], closeTime: pr.hours[1],
    },
    brand: { primary: pr.palette.primary, secondary: pr.palette.secondary, radius: pr.radius, font: pr.font, headerStyle: 'solid' },
    modules: { ...pr.modules },
    payments: { card: true, applePay: true, googlePay: true, cash: true },
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
    payments: a.payments,
    fulfillment: {
      zones: structuredClone(pr.zones), minOrder: a.industry === 'retail' ? 0 : 8,
      freeDeliveryOver: a.industry === 'retail' ? 60 : 25, prepMinutes: a.industry === 'cafe' ? 10 : a.industry === 'restaurant' ? 25 : 30,
      taxRate: 11, taxIncluded: true,
    },
    loyalty: {
      pointsPerUnit: pr.pointsPerUnit, stampsTarget: pr.stampsTarget, stampReward: pr.stampReward, stampRule: pr.stampRule,
      stampCategoryIds: [...pr.stampCategoryIds], signupBonus: 50,
      staticQr: { dailyLimit: 2, cooldownMinutes: 60, requirePin: false, pin: '4321' },
      tiers: structuredClone(DEFAULT_TIERS),
    },
    reservations: { ...pr.reservations, daysAhead: 14 },
    lead: a.lead,
  };
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
    { id: meId, name: cfg.defaultLang === 'ar' ? 'ضيف التجربة' : 'Demo Guest', phone: `${dial} 70 000 000`, points: 180, lifetimePoints: 620, stamps: Math.max(0, pr.stampsTarget - 2), joinedAt: now - 40 * DAY, lastSeenAt: now },
    ...NAMES.map((name, i) => ({
      id: 'c' + i, name, phone: phone(), points: 0, lifetimePoints: 0, stamps: 0,
      joinedAt: now - (10 + r(170)) * DAY, lastSeenAt: now - r(30) * DAY,
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
    const count = 1 + r(cfg.industry === 'retail' ? 2 : 4);
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
    };
  };

  // ~45 days of history, busier on weekends and in the evening
  for (let day = 45; day >= 1; day--) {
    const date = new Date(now - day * DAY);
    const weekend = [5, 6, 0].includes(date.getDay());
    const count = 2 + r(4) + (weekend ? 2 : 0) + Math.floor((45 - day) / 15);
    for (let k = 0; k < count; k++) {
      const hour = 9 + r(13);
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, r(60)).getTime();
      const o = makeOrder(1 + r(NAMES.length), at, r(18) === 0 ? 'cancelled' : 'completed');
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
  // Some customers already redeemed points
  customers.slice(1).forEach((c) => {
    if (c.points > 400 && r(2) === 0) {
      const spent = 100 * (1 + r(3));
      c.points -= spent;
      ledger.push({ id: uid('l'), customerId: c.id, points: -spent, stamps: 0, source: 'reward', note: 'Reward', at: now - r(20) * DAY });
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

  return {
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
    vouchers: [],
    notices: [
      {
        id: uid('n'), kind: 'system', at: now, read: false,
        title: { en: `Welcome to ${cfg.business.name.en}!`, ar: `أهلاً بك في ${cfg.business.name.ar || cfg.business.name.en}!` },
        body: { en: 'You have 180 points to start — try redeeming a reward.', ar: 'لديك 180 نقطة للبدء — جرّب استبدال مكافأة.' },
      },
    ],
    campaigns: [
      { id: uid('c'), title: { en: 'Weekend special 🎉', ar: 'عرض نهاية الأسبوع 🎉' }, body: { en: 'Double points all weekend long.', ar: 'نقاط مضاعفة طوال عطلة نهاية الأسبوع.' }, audience: 'all', reach: 34, sentAt: now - 9 * DAY },
      { id: uid('c'), title: { en: 'We miss you!', ar: 'اشتقنا لك!' }, body: { en: 'Here’s 15% off your next order.', ar: 'إليك خصم 15% على طلبك القادم.' }, audience: 'inactive', reach: 11, sentAt: now - 20 * DAY },
    ],
    staff: [
      { id: 's1', name: 'Rami (Manager)', role: 'manager', pin: '1234', active: true },
      { id: 's2', name: 'Lina', role: 'cashier', pin: '1111', active: true },
      { id: 's3', name: 'Omar', role: 'kitchen', pin: '2222', active: true },
    ],
    usedTokens: [],
    staticScans: [],
    tour: {},
    activity: {},
    nextOrderNumber: num,
  };
}

export function buildDemo(a: WizardAnswers): Demo {
  const config = buildConfig(a);
  return { config, data: buildData(config) };
}
