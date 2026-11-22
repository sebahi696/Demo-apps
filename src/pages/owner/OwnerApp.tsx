import { useMemo, useState, type ReactNode } from 'react';
import { NavLink, Route, Routes, Link } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, Package, Users, Gift, Tag, Megaphone, CalendarDays, Palette, Settings as SettingsIcon, UserCog, FileText,
  TrendingUp, ShoppingCart, Wallet, Star, Download, Search, Plus, Minus,
} from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { addLedger, statusLabel, statusTone, tierOf } from '../../lib/ops';
import type { Customer, Order, OrderStatus } from '../../lib/types';
import { DAY, downloadCsv, fmtDate, fmtTime, timeAgo, ymd } from '../../lib/utils';
import { Badge, Button, Card, Input, Modal, Segmented, Stat, cx } from '../../components/ui';
import { OrderTicket } from '../staff/StaffApp';
import Catalog from './Catalog';
import { Loyalty, Deals, Campaigns } from './Marketing';
import { Branding, Settings, Staff, OwnerReservations, Plan } from './Settings';

export default function OwnerApp() {
  const { cfg, tr, tl, terms } = useDemo();
  const mod = cfg.modules;
  const nav: { to: string; icon: ReactNode; label: string; end?: boolean; show?: boolean }[] = [
    { to: '', end: true, icon: <LayoutDashboard size={18} />, label: tr('Dashboard', 'لوحة القيادة') },
    { to: 'orders', icon: <Receipt size={18} />, label: tr('Orders', 'الطلبات'), show: mod.ordering },
    { to: 'catalog', icon: <Package size={18} />, label: tl(terms.catalog), show: mod.ordering },
    { to: 'customers', icon: <Users size={18} />, label: tr('Customers', 'الزبائن') },
    { to: 'loyalty', icon: <Gift size={18} />, label: tr('Loyalty', 'الولاء'), show: mod.loyaltyPoints || mod.loyaltyStamps },
    { to: 'deals', icon: <Tag size={18} />, label: tr('Deals', 'العروض'), show: mod.deals },
    { to: 'campaigns', icon: <Megaphone size={18} />, label: tr('Notifications', 'الإشعارات'), show: mod.campaigns },
    { to: 'reservations', icon: <CalendarDays size={18} />, label: tr('Bookings', 'الحجوزات'), show: mod.reservations },
    { to: 'branding', icon: <Palette size={18} />, label: tr('Branding', 'الهوية') },
    { to: 'staff', icon: <UserCog size={18} />, label: tr('Staff', 'الموظفون') },
    { to: 'settings', icon: <SettingsIcon size={18} />, label: tr('Settings', 'الإعدادات') },
    { to: 'plan', icon: <FileText size={18} />, label: tr('My app plan', 'خطة تطبيقي') },
  ].filter((x) => x.show !== false);

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-50">
      <aside className="no-print shrink-0 md:w-60 bg-white border-b md:border-b-0 md:border-e border-gray-200 md:overflow-y-auto">
        <div className="hidden md:flex items-center gap-3 px-4 py-4">
          <div className="h-10 w-10 rounded-app bg-brand text-onbrand grid place-items-center text-xl overflow-hidden">
            {cfg.business.logo ? <img src={cfg.business.logo} className="h-full w-full object-cover" alt="" /> : cfg.business.logoEmoji}
          </div>
          <div className="min-w-0">
            <div className="font-bold truncate">{tl(cfg.business.name)}</div>
            <div className="text-xs text-gray-500">{tr('Admin panel', 'لوحة التحكم')}</div>
          </div>
        </div>
        <nav className="flex md:flex-col gap-0.5 overflow-x-auto no-scrollbar px-2 py-2 md:py-0">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition', isActive ? 'bg-brand text-onbrand' : 'text-gray-600 hover:bg-gray-100')}>
              {n.icon}{n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-24">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="customers" element={<Customers />} />
            <Route path="loyalty" element={<Loyalty />} />
            <Route path="deals" element={<Deals />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="reservations" element={<OwnerReservations />} />
            <Route path="branding" element={<Branding />} />
            <Route path="staff" element={<Staff />} />
            <Route path="settings" element={<Settings />} />
            <Route path="plan" element={<Plan />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-5">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="text-gray-500 text-sm mt-0.5">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

function Dashboard() {
  const { cfg, data, tr, tl, m, lang } = useDemo();
  const [range, setRange] = useState<'7' | '30'>('30');
  const days = Number(range);
  const since = Date.now() - days * DAY;
  const prevSince = since - days * DAY;
  const done = data.orders.filter((o) => o.status === 'completed');
  const cur = done.filter((o) => o.createdAt >= since);
  const prev = done.filter((o) => o.createdAt >= prevSince && o.createdAt < since);
  const revenue = cur.reduce((s, o) => s + o.total, 0);
  const prevRevenue = prev.reduce((s, o) => s + o.total, 0);
  const delta = prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 0;
  const members = data.customers.filter((c) => c.lifetimePoints > 0).length;
  const issued = data.ledger.filter((l) => l.at >= since && l.points > 0).reduce((s, l) => s + l.points, 0);
  const redeemed = data.ledger.filter((l) => l.at >= since && l.source === 'reward').length;
  const live = data.orders.filter((o) => !['completed', 'cancelled'].includes(o.status));
  const h = new Date().getHours();

  const series = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      const key = ymd(d);
      out.push({ label: fmtDate(d.getTime(), lang, { day: 'numeric', month: 'short' }), value: cur.filter((o) => ymd(new Date(o.createdAt)) === key).reduce((s, o) => s + o.total, 0) });
    }
    return out;
  }, [cur, days, lang]);

  const top = useMemo(() => {
    const map = new Map<string, { name: string; emoji: string; qty: number; rev: number }>();
    cur.forEach((o) => o.items.forEach((i) => {
      const x = map.get(i.productId) ?? { name: tl(i.name), emoji: i.emoji, qty: 0, rev: 0 };
      x.qty += i.qty;
      x.rev += i.qty * i.unitPrice;
      map.set(i.productId, x);
    }));
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);
  }, [cur, tl]);

  const channels = (['delivery', 'pickup', 'dineIn'] as const).map((f) => ({ f, n: cur.filter((o) => o.fulfillment === f).length })).filter((x) => x.n);
  const hours = Array.from({ length: 24 }, (_, hr) => cur.filter((o) => new Date(o.createdAt).getHours() === hr).length);
  const maxH = Math.max(...hours, 1);
  const chLabel = { delivery: tr('Delivery', 'توصيل'), pickup: tr('Pickup', 'استلام'), dineIn: tr('Dine-in', 'داخل المطعم') };

  return (
    <>
      <PageHead
        title={`${h < 12 ? tr('Good morning', 'صباح الخير') : tr('Good evening', 'مساء الخير')}${cfg.lead.ownerName ? ', ' + cfg.lead.ownerName.split(' ')[0] : ''} 👋`}
        sub={tr('Here is how your business is doing.', 'إليك أداء عملك.')}
        action={<Segmented value={range} onChange={setRange} options={[{ value: '7', label: tr('7 days', '7 أيام') }, { value: '30', label: tr('30 days', '30 يوماً') }]} />}
      />
      {live.length > 0 && (
        <Link to="../staff" className="flex items-center gap-3 rounded-app bg-amber-50 border border-amber-200 p-3.5 mb-4">
          <span className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
          <span className="flex-1 font-semibold text-amber-900">{tr(`${live.length} live orders right now`, `${live.length} طلبات نشطة الآن`)}</span>
          <span className="text-sm text-amber-800 font-semibold">{tr('Open board →', 'افتح اللوحة ←')}</span>
        </Link>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Wallet size={16} />} label={tr('Revenue', 'الإيرادات')} value={m(Math.round(revenue))} sub={delta ? <span className={delta > 0 ? 'text-emerald-600' : 'text-rose-600'}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)}% {tr('vs previous', 'عن الفترة السابقة')}</span> : undefined} />
        <Stat icon={<ShoppingCart size={16} />} label={tr('Orders', 'الطلبات')} value={cur.length} sub={tr(`Avg ${m(cur.length ? revenue / cur.length : 0)}`, `المتوسط ${m(cur.length ? revenue / cur.length : 0)}`)} />
        <Stat icon={<Users size={16} />} label={tr('Loyalty members', 'أعضاء الولاء')} value={members} sub={tr(`${data.customers.length} customers total`, `${data.customers.length} زبوناً إجمالاً`)} />
        <Stat icon={<Star size={16} />} label={tr('Points issued', 'النقاط الممنوحة')} value={issued.toLocaleString()} sub={tr(`${redeemed} rewards redeemed`, `${redeemed} مكافآت مستبدلة`)} />
      </div>

      <Card className="p-5 mt-4">
        <div className="flex items-center gap-2 font-bold"><TrendingUp size={18} /> {tr('Revenue', 'الإيرادات')}</div>
        <BarChart data={series} format={(v) => m(Math.round(v))} />
      </Card>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 lg:col-span-2">
          <div className="font-bold mb-3">{tr('Best sellers', 'الأكثر مبيعاً')}</div>
          <div className="space-y-2.5">
            {top.map((t) => (
              <div key={t.name} className="flex items-center gap-3">
                <span className="text-2xl w-8">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm"><span className="font-medium truncate">{t.name}</span><span className="text-gray-500">{t.qty} · {m(Math.round(t.rev))}</span></div>
                  <div className="h-2 rounded-full bg-gray-100 mt-1"><div className="h-full rounded-full bg-brand" style={{ width: `${(t.qty / (top[0]?.qty || 1)) * 100}%` }} /></div>
                </div>
              </div>
            ))}
            {!top.length && <div className="text-sm text-gray-400">{tr('No sales yet', 'لا مبيعات بعد')}</div>}
          </div>
        </Card>
        <Card className="p-5">
          <div className="font-bold mb-3">{tr('Order channels', 'قنوات الطلب')}</div>
          <div className="flex h-3 rounded-full overflow-hidden">
            {channels.map((c, i) => <div key={c.f} style={{ width: `${(c.n / cur.length) * 100}%`, opacity: 1 - i * 0.3 }} className="bg-brand" />)}
          </div>
          <div className="mt-3 space-y-1.5 text-sm">
            {channels.map((c, i) => (
              <div key={c.f} className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-brand" style={{ opacity: 1 - i * 0.3 }} /><span className="flex-1">{chLabel[c.f]}</span><span className="font-semibold">{Math.round((c.n / cur.length) * 100)}%</span></div>
            ))}
          </div>
          <div className="font-bold mt-6 mb-2">{tr('Busiest hours', 'أوقات الذروة')}</div>
          <div className="flex items-end gap-0.5 h-16" dir="ltr">
            {hours.map((v, i) => <div key={i} title={`${i}:00 · ${v}`} className="flex-1 rounded-t bg-brand2" style={{ height: `${(v / maxH) * 100}%`, minHeight: 2 }} />)}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1" dir="ltr"><span>0h</span><span>12h</span><span>23h</span></div>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="px-5 py-4 font-bold flex items-center justify-between">{tr('Recent orders', 'أحدث الطلبات')}<Link to="orders" className="text-sm text-brand">{tr('See all', 'عرض الكل')}</Link></div>
        <OrdersTable orders={data.orders.slice(0, 6)} />
      </Card>
    </>
  );
}

export function BarChart({ data, format }: { data: { label: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="mt-4">
      <div className="h-48 flex items-end gap-[3px]" dir="ltr" onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 h-full flex flex-col justify-end relative" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
            {hover === i && (
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 text-white text-xs px-2 py-1 z-10">
                {d.label}: <b>{format(d.value)}</b>
              </div>
            )}
            <div className={cx('rounded-t-[4px] transition-all', hover === i ? 'bg-brand' : 'bg-brand/70')} style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 1 }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-gray-400 mt-1.5" dir="ltr">
        <span>{data[0]?.label}</span><span>{data[Math.floor(data.length / 2)]?.label}</span><span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function OrdersTable({ orders, onOpen }: { orders: Order[]; onOpen?: (o: Order) => void }) {
  const { cfg, tr, tl, m, lang } = useDemo();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="text-start px-5 py-2.5 font-semibold">#</th>
            <th className="text-start px-3 py-2.5 font-semibold">{tr('Customer', 'الزبون')}</th>
            <th className="text-start px-3 py-2.5 font-semibold hidden sm:table-cell">{tr('Items', 'المنتجات')}</th>
            <th className="text-start px-3 py-2.5 font-semibold">{tr('Status', 'الحالة')}</th>
            <th className="text-start px-3 py-2.5 font-semibold hidden md:table-cell">{tr('Time', 'الوقت')}</th>
            <th className="text-end px-5 py-2.5 font-semibold">{tr('Total', 'الإجمالي')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((o) => (
            <tr key={o.id} onClick={() => onOpen?.(o)} className={cx(onOpen && 'cursor-pointer hover:bg-gray-50')}>
              <td className="px-5 py-3 font-bold">{o.number}</td>
              <td className="px-3 py-3">{o.customerName}</td>
              <td className="px-3 py-3 text-gray-500 hidden sm:table-cell max-w-[260px] truncate">{o.items.map((i) => `${i.qty}× ${tl(i.name)}`).join(', ')}</td>
              <td className="px-3 py-3"><Badge className={statusTone[o.status]}>{tl(statusLabel(o.status, cfg.industry, o.fulfillment))}</Badge></td>
              <td className="px-3 py-3 text-gray-500 hidden md:table-cell whitespace-nowrap">{fmtDate(o.createdAt, lang, { day: 'numeric', month: 'short' })} {fmtTime(o.createdAt, lang)}</td>
              <td className="px-5 py-3 text-end font-semibold tabular-nums">{m(o.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Orders() {
  const { data, tr, tl, cfg } = useDemo();
  const [status, setStatus] = useState<'all' | OrderStatus>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const list = data.orders.filter((o) => (status === 'all' || o.status === status) && (!q || String(o.number).includes(q) || o.customerName.toLowerCase().includes(q.toLowerCase())));
  const statuses: ('all' | OrderStatus)[] = ['all', 'pending', 'accepted', 'preparing', 'ready', ...(cfg.modules.delivery ? ['outForDelivery' as const] : []), 'completed', 'cancelled'];
  const o = data.orders.find((x) => x.id === open);
  return (
    <>
      <PageHead title={tr('Orders', 'الطلبات')} sub={tr(`${data.orders.length} orders`, `${data.orders.length} طلب`)} action={
        <Button variant="outline" icon={<Download size={16} />} onClick={() => downloadCsv('orders.csv', [
          ['Number', 'Date', 'Customer', 'Status', 'Fulfillment', 'Payment', 'Subtotal', 'Discount', 'Delivery', 'Total', 'Items'],
          ...data.orders.map((x) => [x.number, new Date(x.createdAt).toISOString(), x.customerName, x.status, x.fulfillment, x.payment, x.subtotal, x.discount, x.deliveryFee, x.total, x.items.map((i) => `${i.qty}x ${i.name.en}`).join('; ')]),
        ])}>CSV</Button>
      } />
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Search # or name', 'ابحث بالرقم أو الاسم')} className="ps-9 !h-10" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cx('rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap border', status === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600')}>
              {s === 'all' ? tr('All', 'الكل') : tl(statusLabel(s, cfg.industry))}
            </button>
          ))}
        </div>
      </div>
      <Card className="overflow-hidden">
        <OrdersTable orders={list.slice(0, 100)} onOpen={(x) => setOpen(x.id)} />
        {!list.length && <div className="text-center text-gray-400 py-10">{tr('No orders', 'لا طلبات')}</div>}
      </Card>
      <Modal open={!!o} onClose={() => setOpen(null)} title={o ? `${tr('Order', 'الطلب')} #${o.number}` : ''}>
        {o && <OrderTicket o={o} />}
      </Modal>
    </>
  );
}

function Customers() {
  const { demo, data, tr, tl, m, lang, cfg } = useDemo();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const stats = useMemo(() => {
    const s = new Map<string, { orders: number; spent: number }>();
    data.orders.forEach((o) => {
      if (o.status !== 'completed') return;
      const x = s.get(o.customerId) ?? { orders: 0, spent: 0 };
      x.orders++;
      x.spent += o.total;
      s.set(o.customerId, x);
    });
    return s;
  }, [data.orders]);
  const list = data.customers
    .filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')))
    .sort((a, b) => (stats.get(b.id)?.spent ?? 0) - (stats.get(a.id)?.spent ?? 0));
  const c = data.customers.find((x) => x.id === open);

  return (
    <>
      <PageHead title={tr('Customers', 'الزبائن')} sub={tr(`${data.customers.length} customers`, `${data.customers.length} زبوناً`)} action={
        <Button variant="outline" icon={<Download size={16} />} onClick={() => downloadCsv('customers.csv', [
          ['Name', 'Phone', 'Points', 'Lifetime points', 'Stamps', 'Orders', 'Spent', 'Joined', 'Last seen'],
          ...data.customers.map((x) => [x.name, x.phone, x.points, x.lifetimePoints, x.stamps, stats.get(x.id)?.orders ?? 0, (stats.get(x.id)?.spent ?? 0).toFixed(2), ymd(new Date(x.joinedAt)), ymd(new Date(x.lastSeenAt))]),
        ])}>CSV</Button>
      } />
      <div className="relative w-full sm:w-72 mb-3">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Search name or phone', 'ابحث بالاسم أو الهاتف')} className="ps-9 !h-10" />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-start px-5 py-2.5">{tr('Customer', 'الزبون')}</th>
              {cfg.modules.vipTiers && <th className="text-start px-3 py-2.5">{tr('Tier', 'المستوى')}</th>}
              <th className="text-end px-3 py-2.5">{tr('Points', 'النقاط')}</th>
              <th className="text-end px-3 py-2.5 hidden sm:table-cell">{tr('Orders', 'الطلبات')}</th>
              <th className="text-end px-3 py-2.5">{tr('Spent', 'الإنفاق')}</th>
              <th className="text-end px-5 py-2.5 hidden md:table-cell">{tr('Last visit', 'آخر زيارة')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((x) => {
              const t = tierOf(demo, x.lifetimePoints);
              return (
                <tr key={x.id} onClick={() => setOpen(x.id)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-semibold">{x.name}{x.id === data.meId && ' ⭐'}</div>
                    <div className="text-xs text-gray-500" dir="ltr" style={{ textAlign: 'start' }}>{x.phone}</div>
                  </td>
                  {cfg.modules.vipTiers && <td className="px-3 py-3">{t && <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: t.color }}>{tl(t.name)}</span>}</td>}
                  <td className="px-3 py-3 text-end tabular-nums font-semibold">{x.points}</td>
                  <td className="px-3 py-3 text-end tabular-nums hidden sm:table-cell">{stats.get(x.id)?.orders ?? 0}</td>
                  <td className="px-3 py-3 text-end tabular-nums">{m(Math.round(stats.get(x.id)?.spent ?? 0))}</td>
                  <td className="px-5 py-3 text-end text-gray-500 hidden md:table-cell">{timeAgo(x.lastSeenAt, lang)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Modal open={!!c} onClose={() => setOpen(null)} title={c?.name}>
        {c && <CustomerDetail c={c} />}
      </Modal>
    </>
  );
}

function CustomerDetail({ c }: { c: Customer }) {
  const { demo, data, tr, tl, lang, update, cfg } = useDemo();
  const [adj, setAdj] = useState('50');
  const t = tierOf(demo, c.lifetimePoints);
  const ledger = data.ledger.filter((l) => l.customerId === c.id).slice(0, 12);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-gray-50 p-3 text-center"><div className="text-xl font-extrabold">{c.points}</div><div className="text-xs text-gray-500">{tr('Points', 'نقاط')}</div></div>
        <div className="rounded-xl bg-gray-50 p-3 text-center"><div className="text-xl font-extrabold">{c.lifetimePoints}</div><div className="text-xs text-gray-500">{tr('Lifetime', 'إجمالي')}</div></div>
        <div className="rounded-xl bg-gray-50 p-3 text-center"><div className="text-xl font-extrabold">{cfg.modules.loyaltyStamps ? c.stamps : t ? tl(t.name) : '—'}</div><div className="text-xs text-gray-500">{cfg.modules.loyaltyStamps ? tr('Stamps', 'أختام') : tr('Tier', 'المستوى')}</div></div>
      </div>
      <div className="text-sm text-gray-500 mt-3"><span dir="ltr">{c.phone}</span> · {tr('Joined', 'انضم')} {fmtDate(c.joinedAt, lang)}</div>
      <div className="mt-4 flex items-center gap-2">
        <Input type="number" value={adj} onChange={(e) => setAdj(e.target.value)} className="!w-28" />
        <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => { update((d) => addLedger(d, c.id, Math.abs(+adj || 0), 0, 'manual', 'Owner adjustment')); toast(tr('Points added', 'تمت إضافة النقاط')); }}>{tr('Add', 'إضافة')}</Button>
        <Button size="sm" variant="outline" icon={<Minus size={14} />} onClick={() => { update((d) => addLedger(d, c.id, -Math.abs(+adj || 0), 0, 'manual', 'Owner adjustment')); toast(tr('Points removed', 'تم خصم النقاط'), 'info'); }}>{tr('Remove', 'خصم')}</Button>
      </div>
      <div className="font-bold mt-5 mb-2">{tr('Points history', 'سجل النقاط')}</div>
      <div className="divide-y divide-gray-100 text-sm">
        {ledger.map((l) => (
          <div key={l.id} className="flex justify-between py-2"><span>{l.note ?? l.source} <span className="text-gray-400 text-xs">· {timeAgo(l.at, lang)}</span></span><span className={cx('font-semibold tabular-nums', l.points >= 0 ? 'text-emerald-700' : 'text-rose-600')}>{l.points > 0 ? '+' : ''}{l.points}</span></div>
        ))}
        {!ledger.length && <div className="text-gray-400 py-2">—</div>}
      </div>
    </div>
  );
}
