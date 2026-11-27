// Owner reports: pure functions over a demo, scoped by a date range and a branch.
// Every screen in Reports reads from here, so totals always agree between tabs.
import type { Demo, Fulfillment, L, Order, OrderStatus, PaymentKey } from './types';
import { customerStats, LOST_REASONS, segmentOf, tierOf } from './ops';
import { DAY, round2, ymd } from './utils';

export type RangeKey = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'mtd' | 'custom';
export interface Scope {
  from: number; // inclusive
  to: number; // exclusive
  branch: string; // 'all' or branch id
}

const startOfDay = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export function scopeFor(key: RangeKey, branch = 'all', custom?: { from: string; to: string }): Scope {
  const today = startOfDay(Date.now());
  const end = today + DAY;
  switch (key) {
    case 'today': return { from: today, to: end, branch };
    case 'yesterday': return { from: today - DAY, to: today, branch };
    case '7d': return { from: today - 6 * DAY, to: end, branch };
    case '30d': return { from: today - 29 * DAY, to: end, branch };
    case '90d': return { from: today - 89 * DAY, to: end, branch };
    case 'mtd': {
      const d = new Date();
      return { from: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), to: end, branch };
    }
    case 'custom': {
      const f = custom?.from ? new Date(custom.from + 'T00:00').getTime() : today - 6 * DAY;
      const t = custom?.to ? new Date(custom.to + 'T00:00').getTime() + DAY : end;
      return { from: Math.min(f, t - DAY), to: t, branch };
    }
  }
}

/** Same length, immediately before — for "vs previous period". */
export const previous = (s: Scope): Scope => ({ from: s.from - (s.to - s.from), to: s.from, branch: s.branch });

const inScope = (s: Scope, t: number) => t >= s.from && t < s.to;
export const ordersIn = (d: Demo, s: Scope) =>
  d.data.orders.filter((o) => inScope(s, o.createdAt) && (s.branch === 'all' || o.branchId === s.branch));

const done = (o: Order) => o.status === 'completed';
const sum = <T,>(xs: T[], f: (x: T) => number) => round2(xs.reduce((a, x) => a + f(x), 0));
const at = (o: Order, st: OrderStatus) => o.history.find((h) => h.status === st);
const mins = (a?: number, b?: number) => (a !== undefined && b !== undefined && b >= a ? (b - a) / 60000 : undefined);
const avg = (xs: (number | undefined)[]) => {
  const v = xs.filter((x): x is number => x !== undefined);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
};
export const pctChange = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : now > 0 ? null : 0);

// ── Sales ──────────────────────────────────────────────────────
export function sales(d: Demo, s: Scope) {
  const all = ordersIn(d, s);
  const ok = all.filter(done);
  const cancelled = all.filter((o) => o.status === 'cancelled');
  const open = all.filter((o) => !done(o) && o.status !== 'cancelled');
  const gross = sum(ok, (o) => o.subtotal);
  const discounts = sum(ok, (o) => o.discount);
  const delivery = sum(ok, (o) => o.deliveryFee);
  const tax = sum(ok, (o) => o.tax);
  const tips = sum(ok, (o) => o.tip ?? 0);
  const total = sum(ok, (o) => o.total + (o.tip ?? 0));
  const revenue = sum(ok, (o) => o.total); // what the business keeps before tax (tips go to staff)
  const net = round2(revenue - tax);
  const customers = new Set(ok.map((o) => o.customerId)).size;

  // Daily series across the whole range (no gaps).
  const days: { day: string; t: number; revenue: number; orders: number }[] = [];
  for (let t = s.from; t < s.to; t += DAY) days.push({ day: ymd(new Date(t)), t, revenue: 0, orders: 0 });
  const byDay = new Map(days.map((x) => [x.day, x]));
  ok.forEach((o) => {
    const x = byDay.get(ymd(new Date(o.createdAt)));
    if (x) {
      x.revenue = round2(x.revenue + o.total);
      x.orders++;
    }
  });
  const hours = Array.from({ length: 24 }, (_, h) => ({ h, orders: 0, revenue: 0 }));
  ok.forEach((o) => {
    const x = hours[new Date(o.createdAt).getHours()];
    x.orders++;
    x.revenue = round2(x.revenue + o.total);
  });
  const weekdays = Array.from({ length: 7 }, (_, w) => ({ w, orders: 0, revenue: 0 }));
  ok.forEach((o) => {
    const x = weekdays[new Date(o.createdAt).getDay()];
    x.orders++;
    x.revenue = round2(x.revenue + o.total);
  });

  const group = <K extends string>(key: (o: Order) => K | undefined) => {
    const m = new Map<K, { key: K; orders: number; revenue: number }>();
    ok.forEach((o) => {
      const k = key(o);
      if (k === undefined) return;
      const x = m.get(k) ?? { key: k, orders: 0, revenue: 0 };
      x.orders++;
      x.revenue = round2(x.revenue + o.total);
      m.set(k, x);
    });
    return [...m.values()].sort((a, b) => b.revenue - a.revenue);
  };

  const lost = new Map<string, { reason: L; orders: number; value: number }>();
  cancelled.forEach((o) => {
    const k = o.lostReason ?? 'other';
    const x = lost.get(k) ?? { reason: LOST_REASONS[o.lostReason ?? 'other'], orders: 0, value: 0 };
    x.orders++;
    x.value = round2(x.value + o.total);
    lost.set(k, x);
  });

  return {
    orders: ok.length, all: all.length, cancelledCount: cancelled.length, cancelledValue: sum(cancelled, (o) => o.total), openCount: open.length,
    gross, discounts, delivery, tax, tips, revenue, net, total, customers,
    aov: ok.length ? round2(revenue / ok.length) : 0,
    cancelRate: all.length ? (cancelled.length / all.length) * 100 : 0,
    days, hours, weekdays,
    byFulfillment: group<Fulfillment>((o) => o.fulfillment),
    byPayment: group<PaymentKey>((o) => o.payment),
    byBranch: group<string>((o) => o.branchId),
    lost: [...lost.values()].sort((a, b) => b.orders - a.orders),
    unpaid: sum(open.filter((o) => !o.paid), (o) => o.total),
  };
}

// ── Products ───────────────────────────────────────────────────
export function products(d: Demo, s: Scope) {
  const ok = ordersIn(d, s).filter(done);
  const m = new Map<string, { id: string; name: L; emoji: string; qty: number; revenue: number; orders: number; category?: string }>();
  ok.forEach((o) =>
    o.items.forEach((i) => {
      const x = m.get(i.productId) ?? { id: i.productId, name: i.name, emoji: i.emoji, qty: 0, revenue: 0, orders: 0, category: d.data.products.find((p) => p.id === i.productId)?.categoryId };
      x.qty += i.qty;
      x.revenue = round2(x.revenue + i.qty * i.unitPrice);
      x.orders++;
      m.set(i.productId, x);
    }),
  );
  const list = [...m.values()].sort((a, b) => b.revenue - a.revenue);
  const cats = d.data.categories
    .map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, qty: list.filter((p) => p.category === c.id).reduce((a, p) => a + p.qty, 0), revenue: round2(list.filter((p) => p.category === c.id).reduce((a, p) => a + p.revenue, 0)) }))
    .filter((c) => c.qty > 0)
    .sort((a, b) => b.revenue - a.revenue);
  const sold = new Set(list.map((p) => p.id));
  const notSold = d.data.products.filter((p) => p.active && !sold.has(p.id));
  const itemsTotal = list.reduce((a, p) => a + p.qty, 0);
  return { list, cats, notSold, itemsTotal, perOrder: ok.length ? itemsTotal / ok.length : 0 };
}

// ── Staff ──────────────────────────────────────────────────────
export function staff(d: Demo, s: Scope) {
  const all = ordersIn(d, s);
  return d.data.staff.map((m) => {
    const accepted = all.filter((o) => at(o, 'accepted')?.by === m.id);
    const cooked = all.filter((o) => at(o, 'ready')?.by === m.id);
    const rejected = all.filter((o) => o.status === 'cancelled' && at(o, 'cancelled')?.by === m.id && o.lostReason !== 'customer');
    const handled = new Set([...accepted, ...cooked].map((o) => o.id));
    return {
      id: m.id, name: m.name, role: m.role, active: m.active,
      accepted: accepted.length, cooked: cooked.length, rejected: rejected.length, handled: handled.size,
      acceptMin: avg(accepted.map((o) => mins(o.createdAt, at(o, 'accepted')?.at))),
      prepMin: avg(cooked.map((o) => mins(at(o, 'preparing')?.at ?? at(o, 'accepted')?.at, at(o, 'ready')?.at))),
      sales: sum(accepted.filter(done), (o) => o.total),
      tips: sum(accepted.filter((o) => done(o) && o.fulfillment !== 'delivery'), (o) => o.tip ?? 0),
    };
  });
}

export function kitchen(d: Demo, s: Scope) {
  const ok = ordersIn(d, s).filter(done);
  const target = d.config.fulfillment.prepMinutes || 15;
  const preps = ok.map((o) => mins(at(o, 'preparing')?.at ?? at(o, 'accepted')?.at, at(o, 'ready')?.at)).filter((x): x is number => x !== undefined);
  const accepts = ok.map((o) => mins(o.createdAt, at(o, 'accepted')?.at)).filter((x): x is number => x !== undefined);
  return {
    target,
    prepAvg: avg(preps), acceptAvg: avg(accepts),
    onTime: preps.length ? (preps.filter((x) => x <= target).length / preps.length) * 100 : undefined,
    measured: preps.length,
  };
}

// ── Riders ─────────────────────────────────────────────────────
export function riders(d: Demo, s: Scope) {
  const all = ordersIn(d, s);
  return d.data.riders.map((r) => {
    const mine = all.filter((o) => o.riderId === r.id && done(o));
    const times = mine.map((o) => ({ o, m: mins(at(o, 'outForDelivery')?.at, at(o, 'completed')?.at) }));
    const measured = times.filter((x) => x.m !== undefined) as { o: Order; m: number }[];
    const onTime = measured.filter((x) => x.m <= (d.config.fulfillment.zones.find((z) => z.id === x.o.zoneId)?.eta ?? 30));
    const cashOrders = mine.filter((o) => o.payment === 'cash');
    const sett = d.data.settlements.filter((c) => c.riderId === r.id && inScope(s, c.at));
    return {
      id: r.id, name: r.name, phone: r.phone, active: r.active, onShift: r.onShift,
      deliveries: mine.length,
      avgMin: avg(measured.map((x) => x.m)),
      onTime: measured.length ? (onTime.length / measured.length) * 100 : undefined,
      value: sum(mine, (o) => o.total),
      cashCollected: sum(cashOrders, (o) => o.total),
      settled: sum(sett, (x) => x.counted),
      short: sum(sett, (x) => x.short),
      holding: sum(d.data.collections.filter((c) => c.riderId === r.id && !c.settled), (c) => c.amount),
      tips: sum(mine, (o) => o.tip ?? 0),
      fees: sum(mine, (o) => o.deliveryFee),
    };
  });
}

// ── Deals, promo codes & campaigns ─────────────────────────────
export function promos(d: Demo, s: Scope) {
  const ok = ordersIn(d, s).filter(done);
  const codes = new Map<string, { code: string; uses: number; discount: number; sales: number; customers: Set<string>; newCustomers: number }>();
  const firstOrder = new Map<string, number>();
  [...d.data.orders].filter(done).sort((a, b) => a.createdAt - b.createdAt).forEach((o) => firstOrder.has(o.customerId) || firstOrder.set(o.customerId, o.createdAt));
  ok.filter((o) => o.couponCode).forEach((o) => {
    const x = codes.get(o.couponCode!) ?? { code: o.couponCode!, uses: 0, discount: 0, sales: 0, customers: new Set(), newCustomers: 0 };
    x.uses++;
    x.discount = round2(x.discount + o.discount);
    x.sales = round2(x.sales + o.total);
    x.customers.add(o.customerId);
    if (firstOrder.get(o.customerId) === o.createdAt) x.newCustomers++;
    codes.set(o.couponCode!, x);
  });
  const rows = [...codes.values()].map((x) => {
    const deal = d.data.deals.find((dl) => dl.code === x.code);
    const camp = d.data.campaigns.find((c) => c.code === x.code);
    return { ...x, customers: x.customers.size, title: deal?.title ?? camp?.title, source: deal ? 'deal' : camp ? 'campaign' : 'code', roi: x.discount > 0 ? x.sales / x.discount : undefined, aov: x.uses ? x.sales / x.uses : 0 };
  });
  // Active deals with no use are worth seeing too.
  d.data.deals.filter((dl) => dl.active && !codes.has(dl.code)).forEach((dl) => rows.push({ code: dl.code, uses: 0, discount: 0, sales: 0, customers: 0, newCustomers: 0, title: dl.title, source: 'deal', roi: undefined, aov: 0 }));
  rows.sort((a, b) => b.sales - a.sales);
  const campaigns = d.data.campaigns
    .filter((c) => inScope(s, c.sentAt) || (c.code && rows.some((r) => r.code === c.code && r.uses)))
    .map((c) => {
      const r = rows.find((x) => x.code === c.code);
      return { id: c.id, title: c.title, audience: c.audience, reach: c.reach, sentAt: c.sentAt, code: c.code, uses: r?.uses ?? 0, sales: r?.sales ?? 0, discount: r?.discount ?? 0, conv: c.reach && r ? (r.customers / c.reach) * 100 : undefined };
    })
    .sort((a, b) => b.sentAt - a.sentAt);
  const promoOrders = ok.filter((o) => o.couponCode || o.voucherId);
  return {
    rows, campaigns,
    discountTotal: sum(ok, (o) => o.discount),
    promoShare: ok.length ? (promoOrders.length / ok.length) * 100 : 0,
    promoSales: sum(promoOrders, (o) => o.total),
  };
}

// ── Loyalty, wallet & gift cards ───────────────────────────────
export function loyalty(d: Demo, s: Scope) {
  const led = d.data.ledger.filter((l) => inScope(s, l.at));
  const earned = led.filter((l) => l.points > 0).reduce((a, l) => a + l.points, 0);
  const redeemed = -led.filter((l) => l.points < 0).reduce((a, l) => a + l.points, 0);
  const stamps = led.reduce((a, l) => a + Math.max(0, l.stamps), 0);
  const bySource = new Map<string, number>();
  led.filter((l) => l.points > 0).forEach((l) => bySource.set(l.source, (bySource.get(l.source) ?? 0) + l.points));
  const members = d.data.customers.filter((c) => c.id !== d.data.meId || c.lifetimePoints > 0);
  const outstanding = members.reduce((a, c) => a + c.points, 0);
  // What a point is worth: the cheapest-per-point discount reward, else 1% of a currency unit.
  const disc = d.data.rewards.filter((r) => r.kind === 'discount' && r.cost > 0 && r.value > 0);
  const pointValue = disc.length ? Math.min(...disc.map((r) => r.value / r.cost)) : 0.01;
  const vouchers = d.data.vouchers.filter((v) => inScope(s, v.createdAt));
  const used = d.data.vouchers.filter((v) => v.usedAt && inScope(s, v.usedAt));
  const rewardsUse = new Map<string, { name: L; emoji: string; issued: number; used: number }>();
  vouchers.forEach((v) => {
    const x = rewardsUse.get(v.rewardId) ?? { name: v.name, emoji: v.emoji, issued: 0, used: 0 };
    x.issued++;
    rewardsUse.set(v.rewardId, x);
  });
  used.forEach((v) => {
    const x = rewardsUse.get(v.rewardId) ?? { name: v.name, emoji: v.emoji, issued: 0, used: 0 };
    x.used++;
    rewardsUse.set(v.rewardId, x);
  });
  const tiers = new Map<string, { name: L; color: string; count: number; min: number }>();
  members.forEach((c) => {
    const t = tierOf(d, c.lifetimePoints);
    if (!t) return;
    const x = tiers.get(t.id) ?? { name: t.name, color: t.color, count: 0, min: t.minPoints };
    x.count++;
    tiers.set(t.id, x);
  });
  const ok = ordersIn(d, s).filter(done);
  const active = new Set(ok.map((o) => o.customerId));
  const wtx = d.data.walletTx.filter((w) => inScope(s, w.at));
  const gifts = d.data.giftCards.filter((g) => inScope(s, g.createdAt));
  return {
    earned, redeemed, stamps, members: members.length, activeMembers: [...active].filter((id) => members.some((m) => m.id === id)).length,
    outstanding, pointValue, liability: round2(outstanding * pointValue),
    redemptionRate: earned ? (redeemed / earned) * 100 : 0,
    bySource: [...bySource.entries()].map(([source, points]) => ({ source, points })).sort((a, b) => b.points - a.points),
    rewards: [...rewardsUse.values()].sort((a, b) => b.issued - a.issued),
    vouchersIssued: vouchers.length, vouchersUsed: used.length,
    tiers: [...tiers.values()].sort((a, b) => a.min - b.min),
    wallet: {
      topups: sum(wtx.filter((w) => w.kind === 'topup'), (w) => w.amount),
      bonus: sum(wtx.filter((w) => w.kind === 'bonus'), (w) => w.amount),
      spent: -sum(wtx.filter((w) => w.kind === 'payment'), (w) => w.amount),
      balance: sum(d.data.customers, (c) => c.wallet),
      giftsSold: gifts.length, giftsValue: sum(gifts, (g) => g.amount), giftsRedeemed: gifts.filter((g) => g.redeemedAt).length,
    },
  };
}

// ── Customers ──────────────────────────────────────────────────
export function customers(d: Demo, s: Scope) {
  const ok = ordersIn(d, s).filter(done);
  const stats = customerStats(d);
  const first = new Map<string, number>();
  [...d.data.orders].filter(done).sort((a, b) => a.createdAt - b.createdAt).forEach((o) => first.has(o.customerId) || first.set(o.customerId, o.createdAt));
  const buyers = new Map<string, { id: string; name: string; phone: string; orders: number; spent: number; last: number }>();
  ok.forEach((o) => {
    const c = d.data.customers.find((x) => x.id === o.customerId);
    const x = buyers.get(o.customerId) ?? { id: o.customerId, name: c?.name ?? o.customerName, phone: c?.phone ?? '', orders: 0, spent: 0, last: 0 };
    x.orders++;
    x.spent = round2(x.spent + o.total);
    x.last = Math.max(x.last, o.createdAt);
    buyers.set(o.customerId, x);
  });
  const list = [...buyers.values()];
  const newOnes = list.filter((b) => inScope(s, first.get(b.id) ?? 0)).length;
  const segments = { regular: 0, occasional: 0, new: 0, quiet: 0 };
  d.data.customers.forEach((c) => segments[segmentOf(d, c, stats.get(c.id))]++);
  return {
    buyers: list.length, newBuyers: newOnes, returning: list.length - newOnes,
    repeatRate: list.length ? (list.filter((b) => b.orders > 1).length / list.length) * 100 : 0,
    signups: d.data.customers.filter((c) => inScope(s, c.joinedAt)).length,
    top: list.sort((a, b) => b.spent - a.spent).slice(0, 10),
    segments, total: d.data.customers.length,
  };
}

// ── Reviews ────────────────────────────────────────────────────
export function reviews(d: Demo, s: Scope) {
  const rated = ordersIn(d, s).filter((o) => o.rating);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: rated.filter((o) => o.rating === n).length }));
  return {
    count: rated.length,
    avg: rated.length ? rated.reduce((a, o) => a + (o.rating ?? 0), 0) / rated.length : undefined,
    dist, replied: rated.filter((o) => o.reply).length,
    low: rated.filter((o) => (o.rating ?? 5) <= 2).length,
  };
}

// ── Bookings ───────────────────────────────────────────────────
export function bookings(d: Demo, s: Scope) {
  const rs = d.data.reservations.filter((r) => {
    const t = new Date(r.date + 'T' + r.time).getTime();
    return inScope(s, t) && (s.branch === 'all' || !r.branchId || r.branchId === s.branch);
  });
  const by = (st: string) => rs.filter((r) => r.status === st).length;
  const showed = rs.filter((r) => r.status === 'seated' || r.status === 'completed');
  return {
    total: rs.length, covers: showed.reduce((a, r) => a + r.party, 0), pending: by('pending'), confirmed: by('confirmed'),
    completed: showed.length, cancelled: by('cancelled'), noShow: by('noShow'),
    noShowRate: rs.length ? (by('noShow') / rs.length) * 100 : 0,
    avgParty: rs.length ? rs.reduce((a, r) => a + r.party, 0) / rs.length : 0,
  };
}

// ── Invoices ───────────────────────────────────────────────────
export const invoiceNo = (o: Order) => `INV-${new Date(o.createdAt).getFullYear()}-${String(o.number).padStart(5, '0')}`;
export function invoices(d: Demo, s: Scope) {
  return ordersIn(d, s).filter((o) => o.status !== 'pending').sort((a, b) => b.createdAt - a.createdAt);
}
