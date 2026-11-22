// ───────────────────────────────────────────────────────────────
// Business logic. Every function mutates a Demo draft (immer), so
// call them inside `update(id, d => op(d, ...))`.
// When this moves to a real backend, these become API endpoints.
// ───────────────────────────────────────────────────────────────
import type {
  Demo, Fulfillment, L, LedgerSource, Notice, Order, OrderStatus, PaymentKey, Product, Reservation, Tier, Voucher, Customer, Industry,
} from './types';
import { code, round2, uid, ymd, DAY } from './utils';

export const me = (d: Demo) => d.data.customers.find((c) => c.id === d.data.meId)!;

export const track = (d: Demo, key: string) => {
  d.data.activity[key] = (d.data.activity[key] || 0) + 1;
};
export const tourDone = (d: Demo, key: string) => {
  d.data.tour[key] = true;
  track(d, key);
};

export function notify(d: Demo, title: L, body: L, kind: Notice['kind'], link?: string) {
  d.data.notices.unshift({ id: uid('n'), title, body, kind, link, at: Date.now(), read: false });
  if (d.data.notices.length > 60) d.data.notices.length = 60;
}

// ── Loyalty ────────────────────────────────────────────────────
export const loyaltyOn = (d: Demo) => d.config.modules.loyaltyPoints || d.config.modules.loyaltyStamps;

export function tierOf(d: Demo, lifetime: number): Tier | undefined {
  if (!d.config.modules.vipTiers) return undefined;
  return [...d.config.loyalty.tiers].sort((a, b) => b.minPoints - a.minPoints).find((t) => lifetime >= t.minPoints);
}
export function nextTierOf(d: Demo, lifetime: number): Tier | undefined {
  if (!d.config.modules.vipTiers) return undefined;
  return [...d.config.loyalty.tiers].sort((a, b) => a.minPoints - b.minPoints).find((t) => lifetime < t.minPoints);
}

export function pointsFor(d: Demo, amount: number, c?: Customer) {
  if (!d.config.modules.loyaltyPoints) return 0;
  const mult = c ? tierOf(d, c.lifetimePoints)?.multiplier ?? 1 : 1;
  return Math.floor(amount * d.config.loyalty.pointsPerUnit * mult);
}

export function stampsFor(d: Demo, items: { productId: string; qty: number }[]) {
  if (!d.config.modules.loyaltyStamps) return 0;
  const cats = d.config.loyalty.stampCategoryIds;
  const eligible = items.filter((i) => {
    if (!cats.length) return true;
    const p = d.data.products.find((x) => x.id === i.productId);
    return p && cats.includes(p.categoryId);
  });
  if (!eligible.length) return 0;
  return d.config.loyalty.stampRule === 'perOrder' ? 1 : eligible.reduce((s, i) => s + i.qty, 0);
}

export function addLedger(
  d: Demo, customerId: string, points: number, stamps: number, source: LedgerSource, note?: string, ref?: string,
) {
  const c = d.data.customers.find((x) => x.id === customerId);
  if (!c) return;
  c.points = Math.max(0, c.points + points);
  if (points > 0) c.lifetimePoints += points;
  c.lastSeenAt = Date.now();
  d.data.ledger.unshift({ id: uid('l'), customerId, points, stamps, source, note, ref, at: Date.now() });
  if (stamps) {
    c.stamps += stamps;
    const target = d.config.loyalty.stampsTarget;
    while (c.stamps >= target) {
      c.stamps -= target;
      const v: Voucher = {
        id: uid('v'), code: 'ST-' + code(5), customerId, rewardId: 'stamp-card', name: d.config.loyalty.stampReward,
        emoji: '🎁', kind: 'stampCard', value: 0, status: 'active', createdAt: Date.now(),
      };
      d.data.vouchers.unshift(v);
      if (customerId === d.data.meId)
        notify(d, { en: 'Stamp card complete! 🎉', ar: 'اكتملت بطاقة الأختام! 🎉' },
          { en: `Your reward is ready: ${d.config.loyalty.stampReward.en}`, ar: `مكافأتك جاهزة: ${d.config.loyalty.stampReward.ar || d.config.loyalty.stampReward.en}` },
          'loyalty', 'rewards');
    }
  }
}

export function redeemReward(d: Demo, rewardId: string): { ok: boolean; voucher?: Voucher; error?: L } {
  const r = d.data.rewards.find((x) => x.id === rewardId);
  const c = me(d);
  if (!r || !r.active) return { ok: false, error: { en: 'Reward unavailable', ar: 'المكافأة غير متاحة' } };
  if (c.points < r.cost) return { ok: false, error: { en: 'Not enough points yet', ar: 'نقاطك غير كافية بعد' } };
  addLedger(d, c.id, -r.cost, 0, 'reward', r.name.en, r.id);
  const v: Voucher = {
    id: uid('v'), code: 'RW-' + code(5), customerId: c.id, rewardId: r.id, name: r.name, emoji: r.emoji,
    kind: r.kind, value: r.value, productId: r.productId, status: 'active', createdAt: Date.now(),
  };
  d.data.vouchers.unshift(v);
  tourDone(d, 'redeemReward');
  return { ok: true, voucher: v };
}

export function findVoucher(d: Demo, raw: string) {
  const c = raw.trim().toUpperCase().replace(/^DS-V:/, '');
  return d.data.vouchers.find((v) => v.code === c);
}

export function useVoucher(d: Demo, raw: string): { ok: boolean; voucher?: Voucher; error?: L } {
  const v = findVoucher(d, raw);
  if (!v) return { ok: false, error: { en: 'Code not found', ar: 'الرمز غير موجود' } };
  if (v.status === 'used') return { ok: false, voucher: v, error: { en: 'Already used', ar: 'تم استخدامه مسبقاً' } };
  v.status = 'used';
  v.usedAt = Date.now();
  if (v.customerId === d.data.meId)
    notify(d, { en: 'Reward used', ar: 'تم استخدام المكافأة' }, { en: `${v.name.en} — enjoy!`, ar: `${v.name.ar || v.name.en} — بالهناء!` }, 'loyalty');
  tourDone(d, 'staffVoucher');
  return { ok: true, voucher: v };
}

// ── QR tokens (signed, single-use, expiring) ───────────────────
const hash = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
};
const b64 = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

export function makeToken(d: Demo, points: number, stamps: number, ttlSec = 90) {
  const body = b64(JSON.stringify({ i: d.config.id, p: points, s: stamps, n: code(8), e: Date.now() + ttlSec * 1000 }));
  return `DS1.${body}.${hash(body + d.config.id)}`;
}

export const claimUrl = (demoId: string, token: string) =>
  `${location.origin}${location.pathname}#/d/${demoId}/claim/${token}`;

export const staticCode = (demoId: string) => `DS-STATIC:${demoId}`;

/** Accepts a raw token, a claim URL, a static code or a voucher code and says what it is. */
export function parseScan(raw: string): { type: 'token' | 'static' | 'voucher' | 'unknown'; value: string } {
  const s = raw.trim();
  const m = s.match(/\/claim\/(DS1\.[\w-]+\.[\w]+)/);
  if (m) return { type: 'token', value: m[1] };
  if (s.startsWith('DS1.')) return { type: 'token', value: s };
  if (s.startsWith('DS-STATIC:')) return { type: 'static', value: s.slice(10) };
  if (/^(DS-V:)?(RW|ST)-[A-Z0-9]{5}$/i.test(s)) return { type: 'voucher', value: s };
  return { type: 'unknown', value: s };
}

export function claimToken(d: Demo, token: string): { ok: boolean; points?: number; stamps?: number; error?: L } {
  const [v, body, sig] = token.split('.');
  if (v !== 'DS1' || !body || hash(body + d.config.id) !== sig)
    return { ok: false, error: { en: 'This code is not valid for this store', ar: 'هذا الرمز غير صالح لهذا المتجر' } };
  let p: { p: number; s: number; n: string; e: number };
  try {
    p = JSON.parse(unb64(body));
  } catch {
    return { ok: false, error: { en: 'Unreadable code', ar: 'رمز غير مقروء' } };
  }
  if (Date.now() > p.e) return { ok: false, error: { en: 'This code has expired', ar: 'انتهت صلاحية هذا الرمز' } };
  if (d.data.usedTokens.includes(p.n)) return { ok: false, error: { en: 'This code was already used', ar: 'تم استخدام هذا الرمز مسبقاً' } };
  d.data.usedTokens.push(p.n);
  if (d.data.usedTokens.length > 200) d.data.usedTokens.shift();
  addLedger(d, d.data.meId, p.p, p.s, 'qrStaff', 'In-store purchase');
  notify(d, { en: 'Points added ✨', ar: 'تمت إضافة النقاط ✨' },
    { en: describeEarn(p.p, p.s, 'en'), ar: describeEarn(p.p, p.s, 'ar') }, 'loyalty', 'rewards');
  tourDone(d, 'claimQr');
  return { ok: true, points: p.p, stamps: p.s };
}

export const describeEarn = (p: number, s: number, lang: 'en' | 'ar') => {
  const parts: string[] = [];
  if (p) parts.push(lang === 'ar' ? `${p} نقطة` : `${p} points`);
  if (s) parts.push(lang === 'ar' ? `${s} ختم` : `${s} stamp${s > 1 ? 's' : ''}`);
  return (lang === 'ar' ? 'حصلت على ' : 'You earned ') + parts.join(lang === 'ar' ? ' و ' : ' + ');
};

export function claimStatic(d: Demo, amount: number, pin?: string): { ok: boolean; points?: number; stamps?: number; error?: L } {
  const cfg = d.config.loyalty.staticQr;
  const now = Date.now();
  const today = d.data.staticScans.filter((t) => ymd(new Date(t)) === ymd(new Date()));
  if (cfg.requirePin && pin !== cfg.pin) return { ok: false, error: { en: 'Wrong staff PIN', ar: 'رمز الموظف غير صحيح' } };
  if (today.length >= cfg.dailyLimit)
    return { ok: false, error: { en: `Daily limit reached (${cfg.dailyLimit} per day)`, ar: `تم بلوغ الحد اليومي (${cfg.dailyLimit} يومياً)` } };
  const last = d.data.staticScans[d.data.staticScans.length - 1];
  if (last && now - last < cfg.cooldownMinutes * 60000) {
    const mins = Math.ceil((cfg.cooldownMinutes * 60000 - (now - last)) / 60000);
    return { ok: false, error: { en: `Please wait ${mins} min before scanning again`, ar: `يرجى الانتظار ${mins} دقيقة قبل المسح مجدداً` } };
  }
  if (!(amount > 0)) return { ok: false, error: { en: 'Enter the amount you spent', ar: 'أدخل المبلغ الذي دفعته' } };
  const pts = pointsFor(d, amount, me(d));
  const st = d.config.modules.loyaltyStamps ? 1 : 0;
  d.data.staticScans.push(now);
  addLedger(d, d.data.meId, pts, st, 'qrStatic', 'Counter QR');
  notify(d, { en: 'Points added ✨', ar: 'تمت إضافة النقاط ✨' }, { en: describeEarn(pts, st, 'en'), ar: describeEarn(pts, st, 'ar') }, 'loyalty', 'rewards');
  tourDone(d, 'claimQr');
  return { ok: true, points: pts, stamps: st };
}

// ── Cart & checkout ────────────────────────────────────────────
export function lineFor(d: Demo, productId: string, optionIds: string[]) {
  const p = d.data.products.find((x) => x.id === productId);
  if (!p) return null;
  const opts = p.groups.flatMap((g) => g.options).filter((o) => optionIds.includes(o.id));
  const unit = round2(p.price + opts.reduce((s, o) => s + o.priceDelta, 0));
  return { product: p, unit, options: opts.map((o) => o.name) };
}

export function addToCart(d: Demo, productId: string, qty: number, optionIds: string[], note?: string) {
  const key = productId + '|' + [...optionIds].sort().join(',') + '|' + (note || '');
  const ex = d.data.cart.items.find((i) => i.key === key);
  if (ex) ex.qty += qty;
  else d.data.cart.items.push({ key, productId, qty, optionIds, note });
  tourDone(d, 'addToCart');
}

export interface Totals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  couponError?: L;
  minOrderError?: L;
  voucher?: Voucher;
  couponLabel?: L;
}

export function totals(d: Demo, fulfillment: Fulfillment, zoneId?: string): Totals {
  const f = d.config.fulfillment;
  let subtotal = 0;
  for (const i of d.data.cart.items) {
    const l = lineFor(d, i.productId, i.optionIds);
    if (l) subtotal += l.unit * i.qty;
  }
  subtotal = round2(subtotal);
  const zone = f.zones.find((z) => z.id === zoneId) ?? f.zones[0];
  let deliveryFee = fulfillment === 'delivery' && zone ? zone.fee : 0;
  if (fulfillment === 'delivery' && f.freeDeliveryOver > 0 && subtotal >= f.freeDeliveryOver) deliveryFee = 0;
  let discount = 0;
  let couponError: L | undefined;
  let couponLabel: L | undefined;
  const cc = d.data.cart.couponCode;
  if (cc) {
    const deal = d.data.deals.find((x) => x.code.toUpperCase() === cc.toUpperCase() && x.active);
    if (!deal) couponError = { en: 'Invalid code', ar: 'رمز غير صالح' };
    else if (deal.endsAt && deal.endsAt < Date.now()) couponError = { en: 'This deal has ended', ar: 'انتهى هذا العرض' };
    else if (subtotal < deal.minOrder) couponError = { en: `Minimum order ${deal.minOrder}`, ar: `الحد الأدنى للطلب ${deal.minOrder}` };
    else {
      couponLabel = deal.title;
      if (deal.kind === 'percent') discount += round2((subtotal * deal.value) / 100);
      if (deal.kind === 'fixed') discount += deal.value;
      if (deal.kind === 'freeDelivery') deliveryFee = 0;
    }
  }
  const voucher = d.data.cart.voucherId ? d.data.vouchers.find((v) => v.id === d.data.cart.voucherId && v.status === 'active') : undefined;
  if (voucher) {
    if (voucher.kind === 'discount') discount += voucher.value;
    else {
      const pid = voucher.productId;
      const inCart = pid ? d.data.cart.items.find((i) => i.productId === pid) : undefined;
      const price = inCart ? lineFor(d, inCart.productId, inCart.optionIds)!.unit
        : Math.min(...d.data.cart.items.map((i) => lineFor(d, i.productId, i.optionIds)?.unit ?? Infinity));
      if (isFinite(price)) discount += price;
    }
  }
  discount = round2(Math.min(discount, subtotal));
  const taxable = subtotal - discount;
  const tax = f.taxRate ? round2(f.taxIncluded ? (taxable * f.taxRate) / (100 + f.taxRate) : (taxable * f.taxRate) / 100) : 0;
  const total = round2(taxable + deliveryFee + (f.taxIncluded ? 0 : tax));
  const minOrderError =
    fulfillment === 'delivery' && f.minOrder > 0 && subtotal < f.minOrder
      ? { en: `Minimum for delivery is ${f.minOrder}`, ar: `الحد الأدنى للتوصيل ${f.minOrder}` }
      : undefined;
  return { subtotal, discount, deliveryFee, tax, total, couponError, couponLabel, voucher, minOrderError };
}

export function placeOrder(
  d: Demo,
  input: { fulfillment: Fulfillment; zoneId?: string; address?: string; table?: string; payment: PaymentKey; note?: string },
): Order {
  const t = totals(d, input.fulfillment, input.zoneId);
  const c = me(d);
  const items = d.data.cart.items.map((i) => {
    const l = lineFor(d, i.productId, i.optionIds)!;
    return { productId: i.productId, name: l.product.name, emoji: l.product.emoji, qty: i.qty, unitPrice: l.unit, options: l.options };
  });
  for (const i of d.data.cart.items) {
    const p = d.data.products.find((x) => x.id === i.productId);
    if (p && p.stock !== null) p.stock = Math.max(0, p.stock - i.qty);
  }
  if (t.voucher) {
    const v = d.data.vouchers.find((x) => x.id === t.voucher!.id)!;
    v.status = 'used';
    v.usedAt = Date.now();
  }
  const now = Date.now();
  const o: Order = {
    id: uid('o'), number: d.data.nextOrderNumber++, customerId: c.id, customerName: c.name, items,
    subtotal: t.subtotal, discount: t.discount, deliveryFee: t.deliveryFee, tax: t.tax, total: t.total,
    fulfillment: input.fulfillment, zoneId: input.zoneId, address: input.address, table: input.table,
    payment: input.payment, paid: input.payment !== 'cash', status: 'pending', history: [{ status: 'pending', at: now }],
    createdAt: now, updatedAt: now, couponCode: t.couponLabel ? d.data.cart.couponCode : undefined, voucherId: t.voucher?.id,
    note: input.note, pointsEarned: 0, stampsEarned: 0,
  };
  d.data.orders.unshift(o);
  d.data.cart = { items: [] };
  notify(d, { en: `Order #${o.number} received`, ar: `تم استلام الطلب #${o.number}` },
    { en: 'We’ll let you know as soon as the store accepts it.', ar: 'سنُعلمك فور قبول المتجر للطلب.' }, 'order', `orders/${o.id}`);
  tourDone(d, 'placeOrder');
  return o;
}

export const flowFor = (f: Fulfillment): OrderStatus[] =>
  f === 'delivery'
    ? ['pending', 'accepted', 'preparing', 'ready', 'outForDelivery', 'completed']
    : ['pending', 'accepted', 'preparing', 'ready', 'completed'];

export const nextStatus = (o: Order): OrderStatus | undefined => {
  const f = flowFor(o.fulfillment);
  const i = f.indexOf(o.status);
  return i >= 0 && i < f.length - 1 ? f[i + 1] : undefined;
};

export function statusLabel(s: OrderStatus, industry: Industry, f?: Fulfillment): L {
  const retail = industry === 'retail';
  switch (s) {
    case 'pending': return { en: 'Waiting', ar: 'بانتظار القبول' };
    case 'accepted': return { en: 'Accepted', ar: 'تم القبول' };
    case 'preparing': return retail ? { en: 'Packing', ar: 'قيد التجهيز' } : { en: 'Preparing', ar: 'قيد التحضير' };
    case 'ready':
      return f === 'delivery' ? { en: 'Ready', ar: 'جاهز' } : f === 'dineIn' ? { en: 'Served', ar: 'تم التقديم' } : { en: 'Ready for pickup', ar: 'جاهز للاستلام' };
    case 'outForDelivery': return retail ? { en: 'Shipped', ar: 'تم الشحن' } : { en: 'On the way', ar: 'في الطريق' };
    case 'completed': return { en: 'Completed', ar: 'مكتمل' };
    case 'cancelled': return { en: 'Cancelled', ar: 'ملغى' };
  }
}

export const statusTone: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-sky-100 text-sky-800',
  preparing: 'bg-indigo-100 text-indigo-800',
  ready: 'bg-violet-100 text-violet-800',
  outForDelivery: 'bg-cyan-100 text-cyan-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

export function setOrderStatus(d: Demo, orderId: string, status: OrderStatus) {
  const o = d.data.orders.find((x) => x.id === orderId);
  if (!o || o.status === status) return;
  o.status = status;
  o.updatedAt = Date.now();
  o.history.push({ status, at: Date.now() });
  if (status === 'accepted') tourDone(d, 'staffAccept');
  if (status === 'completed') {
    o.paid = true;
    const c = d.data.customers.find((x) => x.id === o.customerId);
    if (c && loyaltyOn(d)) {
      o.pointsEarned = pointsFor(d, o.total, c);
      o.stampsEarned = stampsFor(d, o.items);
      if (o.pointsEarned || o.stampsEarned) addLedger(d, c.id, o.pointsEarned, o.stampsEarned, 'order', `Order #${o.number}`, o.id);
    }
  }
  if (o.customerId !== d.data.meId) return;
  const lbl = statusLabel(status, d.config.industry, o.fulfillment);
  const bodies: Partial<Record<OrderStatus, L>> = {
    accepted: { en: `Estimated time: ${d.config.fulfillment.prepMinutes} min`, ar: `الوقت المتوقع: ${d.config.fulfillment.prepMinutes} دقيقة` },
    preparing: { en: 'Your order is being prepared right now.', ar: 'يتم تحضير طلبك الآن.' },
    ready: o.fulfillment === 'pickup' ? { en: 'Come and collect it — show your order number.', ar: 'تفضّل لاستلامه — أظهر رقم الطلب.' } : { en: 'Almost there!', ar: 'اقتربنا!' },
    outForDelivery: { en: 'Your order is on its way to you.', ar: 'طلبك في الطريق إليك.' },
    completed: o.pointsEarned || o.stampsEarned
      ? { en: describeEarn(o.pointsEarned, o.stampsEarned, 'en') + ' 🎉', ar: describeEarn(o.pointsEarned, o.stampsEarned, 'ar') + ' 🎉' }
      : { en: 'Thanks for your order!', ar: 'شكراً لطلبك!' },
    cancelled: { en: 'Sorry, the store cancelled this order.', ar: 'عذراً، قام المتجر بإلغاء هذا الطلب.' },
  };
  notify(d, { en: `#${o.number}: ${lbl.en}`, ar: `#${o.number}: ${lbl.ar}` }, bodies[status] ?? { en: '' }, 'order', `orders/${o.id}`);
}

// ── Reservations ───────────────────────────────────────────────
export function slotsFor(d: Demo, date: string) {
  const { openTime, closeTime } = d.config.business;
  const { slotMinutes, capacityPerSlot } = d.config.reservations;
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  const start = oh * 60 + om;
  let end = ch * 60 + cm;
  if (end <= start) end += 24 * 60;
  const out: { time: string; left: number; past: boolean }[] = [];
  const now = new Date();
  const isToday = date === ymd(now);
  for (let m = start; m + slotMinutes <= end && m < 24 * 60; m += slotMinutes) {
    const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const taken = d.data.reservations.filter((r) => r.date === date && r.time === time && !['cancelled', 'noShow'].includes(r.status)).length;
    out.push({ time, left: Math.max(0, capacityPerSlot - taken), past: isToday && m <= now.getHours() * 60 + now.getMinutes() + 30 });
  }
  return out;
}

export function createReservation(d: Demo, r: Omit<Reservation, 'id' | 'status' | 'createdAt' | 'customerId'>) {
  const slot = slotsFor(d, r.date).find((s) => s.time === r.time);
  if (!slot || slot.left <= 0) return { ok: false as const, error: { en: 'That time was just taken — pick another', ar: 'تم حجز هذا الوقت للتو — اختر وقتاً آخر' } };
  const res: Reservation = { ...r, id: uid('r'), customerId: d.data.meId, status: 'pending', createdAt: Date.now() };
  d.data.reservations.unshift(res);
  notify(d, { en: 'Booking request sent', ar: 'تم إرسال طلب الحجز' },
    { en: `${r.date} at ${r.time} for ${r.party}`, ar: `${r.date} الساعة ${r.time} لـ ${r.party}` }, 'reservation', 'reserve');
  tourDone(d, 'reservation');
  return { ok: true as const, reservation: res };
}

export function setReservationStatus(d: Demo, id: string, status: Reservation['status']) {
  const r = d.data.reservations.find((x) => x.id === id);
  if (!r) return;
  r.status = status;
  if (r.customerId === d.data.meId && (status === 'confirmed' || status === 'cancelled'))
    notify(d,
      status === 'confirmed' ? { en: 'Booking confirmed ✅', ar: 'تم تأكيد الحجز ✅' } : { en: 'Booking cancelled', ar: 'تم إلغاء الحجز' },
      { en: `${r.date} at ${r.time} · ${r.party} guests`, ar: `${r.date} الساعة ${r.time} · ${r.party} أشخاص` }, 'reservation', 'reserve');
}

// ── Campaigns ──────────────────────────────────────────────────
export function audienceOf(d: Demo, a: 'all' | 'vip' | 'inactive') {
  const cs = d.data.customers;
  if (a === 'vip') return cs.filter((c) => (tierOf(d, c.lifetimePoints)?.minPoints ?? 0) > 0);
  if (a === 'inactive') return cs.filter((c) => Date.now() - c.lastSeenAt > 14 * DAY);
  return cs;
}

export function sendCampaign(d: Demo, title: L, body: L, audience: 'all' | 'vip' | 'inactive') {
  const list = audienceOf(d, audience);
  d.data.campaigns.unshift({ id: uid('c'), title, body, audience, reach: list.length, sentAt: Date.now() });
  // The demo user always receives it so the owner can see how it looks.
  notify(d, title, body, 'campaign');
  tourDone(d, 'campaign');
  return list.length;
}

export const productAvailable = (p: Product) => p.active && (p.stock === null || p.stock > 0);
