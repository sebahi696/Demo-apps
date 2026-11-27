// ───────────────────────────────────────────────────────────────
// Business logic. Every function mutates a Demo draft (immer), so
// call them inside `update(id, d => op(d, ...))`.
// When this moves to a real backend, these become API endpoints.
// ───────────────────────────────────────────────────────────────
import type {
  Demo, Fulfillment, L, LedgerSource, Notice, Order, OrderStatus, PaymentKey, Product, Reservation, Tier, Voucher, Customer, Industry, Audience, LostReason,
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
  tip: number;
  total: number;
  couponError?: L;
  minOrderError?: L;
  voucher?: Voucher;
  couponLabel?: L;
}

export function totals(d: Demo, fulfillment: Fulfillment, zoneId?: string, tipPct = 0): Totals {
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
  const tip = d.config.modules.tips ? round2((taxable * tipPct) / 100) : 0;
  const total = round2(taxable + deliveryFee + (f.taxIncluded ? 0 : tax) + tip);
  const minDel = zone?.minOrder ?? f.minOrder;
  const minOrderError =
    fulfillment === 'delivery' && minDel > 0 && subtotal < minDel
      ? { en: `Minimum for delivery to this area is ${minDel}`, ar: `الحد الأدنى للتوصيل لهذه المنطقة ${minDel}` }
      : undefined;
  return { subtotal, discount, deliveryFee, tax, tip, total, couponError, couponLabel, voucher, minOrderError };
}

export function placeOrder(
  d: Demo,
  input: { fulfillment: Fulfillment; zoneId?: string; address?: string; table?: string; payment: PaymentKey; note?: string; tipPct?: number; scheduledFor?: number },
): Order {
  const t = totals(d, input.fulfillment, input.zoneId, input.tipPct ?? 0);
  const c = me(d);
  if (input.payment === 'wallet') {
    c.wallet = round2(c.wallet - t.total);
    d.data.walletTx.unshift({ id: uid('w'), customerId: c.id, amount: -t.total, kind: 'payment', note: `Order #${d.data.nextOrderNumber}`, at: Date.now() });
  }
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
    note: input.note, pointsEarned: 0, stampsEarned: 0, tip: t.tip, scheduledFor: input.scheduledFor, branchId: d.data.branchId ?? d.config.branches[0]?.id,
  };
  d.data.orders.unshift(o);
  d.data.cart = { items: [], table: d.data.cart.table };
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
  switch (s) {
    case 'pending': return { en: 'Waiting', ar: 'بانتظار القبول' };
    case 'accepted': return { en: 'Accepted', ar: 'تم القبول' };
    case 'preparing': return industry === 'bakery' ? { en: 'Packing', ar: 'قيد التجهيز' } : { en: 'Preparing', ar: 'قيد التحضير' };
    case 'ready':
      return f === 'delivery' ? { en: 'Ready', ar: 'جاهز' } : f === 'dineIn' ? { en: 'Served', ar: 'تم التقديم' } : { en: 'Ready for pickup', ar: 'جاهز للاستلام' };
    case 'outForDelivery': return { en: 'On the way', ar: 'في الطريق' };
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
  if (status === 'outForDelivery' && !o.riderId && o.fulfillment === 'delivery') {
    const r = suggestRider(d, o.branchId);
    if (r) { o.riderId = r.id; o.assignedAt = Date.now(); }
  }
  if (status === 'completed' && o.riderId && o.payment === 'cash' && !o.collected) {
    o.collected = o.total;
    d.data.collections.unshift({ id: uid('cc'), riderId: o.riderId, orderId: o.id, orderNumber: o.number, amount: o.total, at: Date.now(), settled: false });
  }
  if (status === 'cancelled' && o.payment === 'wallet') {
    const c = d.data.customers.find((x) => x.id === o.customerId);
    if (c) {
      c.wallet = round2(c.wallet + o.total);
      d.data.walletTx.unshift({ id: uid('w'), customerId: c.id, amount: o.total, kind: 'refund', note: `Order #${o.number}`, at: Date.now() });
    }
  }
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
    outForDelivery: (() => {
      const r = d.data.riders.find((x) => x.id === o.riderId);
      return r ? { en: `${r.name.split(' ')[0]} is on the way with your order.`, ar: `${r.name.split(' ')[0]} في الطريق مع طلبك.` } : { en: 'Your order is on its way to you.', ar: 'طلبك في الطريق إليك.' };
    })(),
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

export function createReservation(d: Demo, r: Omit<Reservation, 'id' | 'status' | 'createdAt' | 'customerId' | 'branchId'>) {
  const slot = slotsFor(d, r.date).find((s) => s.time === r.time);
  if (!slot || slot.left <= 0) return { ok: false as const, error: { en: 'That time was just taken — pick another', ar: 'تم حجز هذا الوقت للتو — اختر وقتاً آخر' } };
  const res: Reservation = { ...r, id: uid('r'), customerId: d.data.meId, status: 'pending', createdAt: Date.now(), branchId: d.data.branchId ?? d.config.branches[0]?.id };
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
/** Per-customer order habits, used for automatic audiences. */
export function customerStats(d: Demo) {
  const m = new Map<string, { orders: number; last: number; recent: number; spent: number }>();
  const now = Date.now();
  for (const o of d.data.orders) {
    if (o.status !== 'completed') continue;
    const x = m.get(o.customerId) ?? { orders: 0, last: 0, recent: 0, spent: 0 };
    x.orders++;
    x.spent += o.total;
    x.last = Math.max(x.last, o.createdAt);
    if (now - o.createdAt < 30 * DAY) x.recent++;
    m.set(o.customerId, x);
  }
  return m;
}

export function segmentOf(d: Demo, c: Customer, st = customerStats(d).get(c.id)) {
  const now = Date.now();
  if (st && st.recent >= 5) return 'regular' as const;
  if (st && st.orders >= 2 && now - st.last > 21 * DAY) return 'quiet' as const;
  if (now - c.joinedAt < 14 * DAY) return 'new' as const;
  return 'occasional' as const;
}

export function audienceOf(d: Demo, a: Audience) {
  const cs = d.data.customers;
  const stats = customerStats(d);
  const now = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(now.getTime() + i * DAY);
    return `${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  });
  switch (a) {
    case 'vip': return cs.filter((c) => (tierOf(d, c.lifetimePoints)?.minPoints ?? 0) > 0);
    case 'inactive': return cs.filter((c) => Date.now() - c.lastSeenAt > 14 * DAY);
    case 'regulars': return cs.filter((c) => segmentOf(d, c, stats.get(c.id)) === 'regular');
    case 'quiet': return cs.filter((c) => segmentOf(d, c, stats.get(c.id)) === 'quiet');
    case 'new': return cs.filter((c) => segmentOf(d, c, stats.get(c.id)) === 'new');
    case 'birthdays': return cs.filter((c) => c.birthday && week.includes(c.birthday));
    default: return cs;
  }
}

export function sendCampaign(d: Demo, title: L, body: L, audience: Audience, offerPercent = 0) {
  const list = audienceOf(d, audience);
  let codeStr: string | undefined;
  if (offerPercent > 0) {
    codeStr = (audience === 'quiet' ? 'MISSYOU' : audience === 'birthdays' ? 'BDAY' : 'APP') + offerPercent + code(2);
    d.data.deals.unshift({
      id: uid('d'), title, desc: body, code: codeStr, kind: 'percent', value: offerPercent, minOrder: 0, emoji: '💌', bg: '#fde68a', active: true,
      endsAt: Date.now() + 14 * DAY,
    });
  }
  d.data.campaigns.unshift({ id: uid('c'), title, body, audience, reach: list.length, sentAt: Date.now(), code: codeStr });
  // The demo user always receives it so the owner can see how it looks.
  notify(d, title, body, 'campaign');
  tourDone(d, 'campaign');
  return list.length;
}

export const productAvailable = (p: Product, branchId?: string) =>
  p.active && (p.stock === null || p.stock > 0) && !(branchId && p.soldOutAt?.includes(branchId));

/** Is a time-limited category (e.g. breakfast) open right now? */
export function categoryOpen(c: { availableFrom?: string; availableTo?: string } | undefined, at = new Date()) {
  if (!c?.availableFrom || !c.availableTo) return true;
  const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const now = at.getHours() * 60 + at.getMinutes();
  const a = mins(c.availableFrom);
  const b = mins(c.availableTo);
  return a <= b ? now >= a && now < b : now >= a || now < b;
}

// ── Table service ──────────────────────────────────────────────
export function requestService(d: Demo, table: string, kind: 'waiter' | 'bill' | 'water' | 'cutlery') {
  d.data.serviceRequests.unshift({ id: uid('sr'), table, kind, at: Date.now(), done: false });
  if (d.data.serviceRequests.length > 40) d.data.serviceRequests.length = 40;
  track(d, 'tableService');
}

/** Results of an offer: how many used it, the sales it brought and what it cost. */
export function campaignResults(d: Demo, codeStr?: string) {
  if (!codeStr) return null;
  const os = d.data.orders.filter((o) => o.couponCode === codeStr && o.status !== 'cancelled');
  return { uses: os.length, sales: round2(os.reduce((s, o) => s + o.total, 0)), cost: round2(os.reduce((s, o) => s + o.discount, 0)) };
}

// ── Lost orders ────────────────────────────────────────────────
export const LOST_REASONS: Record<LostReason, L> = {
  busy: { en: 'Too busy', ar: 'ضغط كبير' },
  soldOut: { en: 'Item sold out', ar: 'نفد صنف' },
  outsideArea: { en: 'Outside delivery area', ar: 'خارج منطقة التوصيل' },
  closed: { en: 'Closing / closed', ar: 'وقت الإغلاق' },
  customer: { en: 'Customer cancelled', ar: 'ألغى الزبون' },
  other: { en: 'Other', ar: 'أخرى' },
};
export function rejectOrder(d: Demo, orderId: string, reason: LostReason) {
  const o = d.data.orders.find((x) => x.id === orderId);
  if (!o) return;
  o.lostReason = reason;
  setOrderStatus(d, orderId, 'cancelled');
}

// ── Riders & cash on delivery ──────────────────────────────────
export function riderHolding(d: Demo, riderId: string) {
  return round2(d.data.collections.filter((c) => c.riderId === riderId && !c.settled).reduce((s, c) => s + c.amount, 0));
}
export function riderActive(d: Demo, riderId: string) {
  return d.data.orders.filter((o) => o.riderId === riderId && o.status === 'outForDelivery');
}
export function suggestRider(d: Demo, branchId?: string) {
  const pool = d.data.riders.filter((r) => r.active && r.onShift && (!branchId || !r.branchId || r.branchId === branchId));
  return [...pool].sort((a, b) => riderActive(d, a.id).length - riderActive(d, b.id).length)[0];
}
export function assignRider(d: Demo, orderId: string, riderId: string) {
  const o = d.data.orders.find((x) => x.id === orderId);
  const r = d.data.riders.find((x) => x.id === riderId);
  if (!o || !r) return;
  o.riderId = riderId;
  o.assignedAt = Date.now();
  if (o.status !== 'outForDelivery') setOrderStatus(d, orderId, 'outForDelivery');
  tourDone(d, 'dispatch');
}
export function collectCash(d: Demo, orderId: string) {
  const o = d.data.orders.find((x) => x.id === orderId);
  if (!o || !o.riderId || o.collected) return;
  o.collected = o.total;
  o.paid = true;
  d.data.collections.unshift({ id: uid('cc'), riderId: o.riderId, orderId: o.id, orderNumber: o.number, amount: o.total, at: Date.now(), settled: false });
  tourDone(d, 'riderCash');
}
export function settleRider(d: Demo, riderId: string, counted: number) {
  const collected = riderHolding(d, riderId);
  d.data.collections.forEach((c) => c.riderId === riderId && (c.settled = true));
  const st = { id: uid('st'), riderId, collected, counted, short: round2(collected - counted), at: Date.now() };
  d.data.settlements.unshift(st);
  const r = d.data.riders.find((x) => x.id === riderId);
  if (r) r.onShift = false;
  track(d, 'settle');
  return st;
}

/** Second-currency price (e.g. lira), rounded to real banknotes. */
export function dualPrice(d: Demo, amount: number) {
  const x = d.config.dual;
  if (!x?.enabled || !x.rate) return null;
  const v = amount * x.rate;
  return x.roundTo ? Math.round(v / x.roundTo) * x.roundTo : Math.round(v);
}

/** The day's figures, as a message the owner can send to WhatsApp. */
export function dailyClose(d: Demo, day = new Date()) {
  const key = ymd(day);
  const os = d.data.orders.filter((o) => ymd(new Date(o.createdAt)) === key);
  const done = os.filter((o) => o.status === 'completed');
  const lost = os.filter((o) => o.status === 'cancelled');
  const sales = round2(done.reduce((s, o) => s + o.total, 0));
  const riders = d.data.riders.map((r) => ({ r, holding: riderHolding(d, r.id) })).filter((x) => x.holding > 0);
  const withRiders = round2(riders.reduce((s, x) => s + x.holding, 0));
  const reasons: Partial<Record<LostReason, number>> = {};
  lost.forEach((o) => { const k = o.lostReason ?? 'other'; reasons[k] = (reasons[k] ?? 0) + 1; });
  return { key, orders: os.length, delivered: done.length, lost: lost.length, sales, withRiders, riders, reasons, avg: done.length ? round2(sales / done.length) : 0 };
}

// ── Store status (hours, closed days, paused) ──────────────────
export function storeStatus(d: Demo, at = new Date()) {
  const b = d.config.business;
  const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const open = mins(b.openTime);
  let close = mins(b.closeTime);
  if (close <= open) close += 24 * 60;
  let now = at.getHours() * 60 + at.getMinutes();
  if (now < open && now + 24 * 60 < close) now += 24 * 60; // after midnight, still open from yesterday
  const dayClosed = b.closedDays.includes(at.getDay());
  const inHours = !dayClosed && now >= open && now < close;
  return { open: inHours && !b.ordersPaused, paused: b.ordersPaused, dayClosed, inHours, opensAt: b.openTime, closesAt: b.closeTime, extra: b.busyExtraMinutes };
}

// ── Favorites & stock alerts ───────────────────────────────────
export function toggleFavorite(d: Demo, productId: string) {
  const f = d.data.favorites;
  const i = f.indexOf(productId);
  if (i >= 0) f.splice(i, 1);
  else { f.push(productId); track(d, 'favorite'); }
}
export function toggleStockAlert(d: Demo, productId: string) {
  const f = d.data.stockAlerts;
  const i = f.indexOf(productId);
  if (i >= 0) f.splice(i, 1);
  else f.push(productId);
}
export function restocked(d: Demo, productId: string) {
  if (!d.data.stockAlerts.includes(productId)) return;
  const p = d.data.products.find((x) => x.id === productId);
  if (!p) return;
  d.data.stockAlerts = d.data.stockAlerts.filter((x) => x !== productId);
  notify(d, { en: 'Back in stock! 🎉', ar: 'عاد إلى المخزون! 🎉' }, { en: `${p.name.en} is available again.`, ar: `${p.name.ar || p.name.en} متوفر من جديد.` }, 'system', `menu?product=${p.id}`);
}

// ── Wallet & gift cards ────────────────────────────────────────
export function topUp(d: Demo, amount: number) {
  const c = me(d);
  const bonus = round2((amount * d.config.wallet.bonusPercent) / 100);
  c.wallet = round2(c.wallet + amount + bonus);
  d.data.walletTx.unshift({ id: uid('w'), customerId: c.id, amount, kind: 'topup', at: Date.now() });
  if (bonus) d.data.walletTx.unshift({ id: uid('w'), customerId: c.id, amount: bonus, kind: 'bonus', note: `${d.config.wallet.bonusPercent}%`, at: Date.now() });
  tourDone(d, 'wallet');
  return bonus;
}
export function buyGiftCard(d: Demo, amount: number, toName: string, message: string) {
  const g = { code: 'GIFT-' + code(6), amount, fromName: me(d).name, toName, message, createdAt: Date.now() };
  d.data.giftCards.unshift(g);
  track(d, 'giftCard');
  return g;
}
export function redeemGiftCard(d: Demo, raw: string): { ok: boolean; amount?: number; error?: L } {
  const g = d.data.giftCards.find((x) => x.code === raw.trim().toUpperCase());
  if (!g) return { ok: false, error: { en: 'Gift card not found', ar: 'بطاقة الهدية غير موجودة' } };
  if (g.redeemedBy) return { ok: false, error: { en: 'Already redeemed', ar: 'تم استخدامها مسبقاً' } };
  const c = me(d);
  g.redeemedBy = c.id;
  g.redeemedAt = Date.now();
  c.wallet = round2(c.wallet + g.amount);
  d.data.walletTx.unshift({ id: uid('w'), customerId: c.id, amount: g.amount, kind: 'gift', note: g.code, at: Date.now() });
  return { ok: true, amount: g.amount };
}

// ── Reviews ────────────────────────────────────────────────────
export function rateOrder(d: Demo, orderId: string, rating: number, review?: string) {
  const o = d.data.orders.find((x) => x.id === orderId);
  if (!o || o.rating) return 0;
  o.rating = rating;
  o.review = review?.trim() || undefined;
  tourDone(d, 'review');
  const bonus = d.config.modules.loyaltyPoints ? 20 : 0;
  if (bonus) addLedger(d, o.customerId, bonus, 0, 'review', 'Thanks for your review');
  return bonus;
}

// ── Referrals & birthday ───────────────────────────────────────
export function applyReferral(d: Demo, raw: string): { ok: boolean; error?: L } {
  const c = me(d);
  const codeIn = raw.trim().toUpperCase();
  if (c.referredBy) return { ok: false, error: { en: 'You already used a referral code', ar: 'لقد استخدمت رمز إحالة مسبقاً' } };
  const friend = d.data.customers.find((x) => x.referralCode === codeIn && x.id !== c.id);
  if (!friend) return { ok: false, error: { en: 'Code not found', ar: 'الرمز غير موجود' } };
  c.referredBy = friend.id;
  const b = d.config.loyalty.referralBonus;
  addLedger(d, c.id, b, 0, 'referral', `Referred by ${friend.name}`);
  addLedger(d, friend.id, b, 0, 'referral', `Invited ${c.name}`);
  track(d, 'referral');
  return { ok: true };
}
/** Demo helper: a friend signs up with your code. */
export function simulateFriendJoin(d: Demo) {
  const c = me(d);
  const names = ['Yara Haddad', 'Karim Aoun', 'Lea Nasr', 'Fouad Khalil', 'Rana Saab'];
  const name = names[Math.floor(Math.random() * names.length)];
  const f: Customer = { id: uid('c'), name, phone: '+961 71 ' + Math.floor(100000 + Math.random() * 899999), points: 0, lifetimePoints: 0, stamps: 0, joinedAt: Date.now(), lastSeenAt: Date.now(), wallet: 0, referralCode: name.split(' ')[0].toUpperCase() + code(3), referredBy: c.id };
  d.data.customers.push(f);
  const b = d.config.loyalty.referralBonus;
  addLedger(d, f.id, b, 0, 'referral', `Referred by ${c.name}`);
  addLedger(d, c.id, b, 0, 'referral', `Invited ${name}`);
  notify(d, { en: `${name} joined with your code! 🎉`, ar: `انضم ${name} باستخدام رمزك! 🎉` }, { en: `You both earned ${b} points.`, ar: `حصل كل منكما على ${b} نقطة.` }, 'loyalty', 'rewards');
  track(d, 'referral');
  return name;
}
export function setBirthday(d: Demo, mmdd: string) {
  const c = me(d);
  c.birthday = mmdd;
  const now = new Date();
  const today = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const year = String(now.getFullYear());
  if (mmdd === today && !d.data.vouchers.some((v) => v.customerId === c.id && v.rewardId === 'birthday-' + year)) {
    d.data.vouchers.unshift({ id: uid('v'), code: 'RW-' + code(5), customerId: c.id, rewardId: 'birthday-' + year, name: d.config.loyalty.birthdayReward, emoji: '🎂', kind: 'birthday', value: 0, status: 'active', createdAt: Date.now() });
    notify(d, { en: 'Happy birthday! 🎂', ar: 'عيد ميلاد سعيد! 🎂' }, d.config.loyalty.birthdayReward, 'loyalty', 'rewards');
    return true;
  }
  return false;
}
