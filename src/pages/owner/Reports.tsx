import { useMemo, useState, type ReactNode } from 'react';
import {
  BarChart3, Receipt, Package, UserCog, Bike, Tag, Gift, Users, Download, Printer, Check, ChevronDown, Star, Clock, Timer, Wallet, AlertTriangle, CalendarDays,
} from 'lucide-react';
import { useDemo } from '../../lib/demo';
import type { Demo, Order } from '../../lib/types';
import * as R from '../../lib/reports';
import { statusLabel, statusTone } from '../../lib/ops';
import { downloadCsv, fmtDate, fmtTime, ymd } from '../../lib/utils';
import { Badge, Button, Card, Modal, cx } from '../../components/ui';
import { BarList, ColumnChart, LineChart, Meter, SegmentedBar, StatTile, compact } from '../../components/charts';
import { PageHead } from './OwnerApp';

type Tab = 'overview' | 'invoices' | 'products' | 'staff' | 'riders' | 'promos' | 'loyalty' | 'customers';
type Tr = (en: string, ar: string) => string;
const PAY_EN: Record<string, string> = { card: 'Card', applePay: 'Apple Pay', googlePay: 'Google Pay', cash: 'Cash', wallet: 'App wallet' };
const PAY_AR: Record<string, string> = { card: 'بطاقة', applePay: 'Apple Pay', googlePay: 'Google Pay', cash: 'نقداً', wallet: 'محفظة التطبيق' };

const fmtMin = (m: number | undefined, tr: Tr) => (m === undefined ? '—' : tr(`${m.toFixed(m < 10 ? 1 : 0)} min`, `${m.toFixed(m < 10 ? 1 : 0)} د`));
const pct = (n: number | undefined) => (n === undefined ? '—' : `${n.toFixed(0)}%`);

/** Everything the owner measures, in one place: one filter row scopes every tab. */
export default function Reports() {
  const { demo, cfg, tr, tl, m, lang } = useDemo();
  const [tab, setTab] = useState<Tab>('overview');
  const [range, setRange] = useState<R.RangeKey>('30d');
  const [custom, setCustom] = useState({ from: ymd(new Date(Date.now() - 13 * 86400000)), to: ymd(new Date()) });
  const [branch, setBranch] = useState('all');
  const [pick, setPick] = useState(false);
  const scope = useMemo(() => R.scopeFor(range, branch, custom), [range, branch, custom]);
  const prev = R.previous(scope);
  const mod = cfg.modules;

  const ranges: { k: R.RangeKey; label: string }[] = [
    { k: 'today', label: tr('Today', 'اليوم') },
    { k: 'yesterday', label: tr('Yesterday', 'أمس') },
    { k: '7d', label: tr('Last 7 days', 'آخر 7 أيام') },
    { k: '30d', label: tr('Last 30 days', 'آخر 30 يوماً') },
    { k: '90d', label: tr('Last 90 days', 'آخر 90 يوماً') },
    { k: 'mtd', label: tr('This month', 'هذا الشهر') },
  ];
  const rangeLabel = range === 'custom' ? `${fmtDate(custom.from, lang, { day: 'numeric', month: 'short' })} – ${fmtDate(custom.to, lang, { day: 'numeric', month: 'short' })}` : ranges.find((x) => x.k === range)!.label;

  const tabs: { k: Tab; icon: ReactNode; label: string; show?: boolean }[] = [
    { k: 'overview', icon: <BarChart3 size={16} />, label: tr('Sales', 'المبيعات') },
    { k: 'invoices', icon: <Receipt size={16} />, label: tr('Invoices', 'الفواتير'), show: mod.ordering },
    { k: 'products', icon: <Package size={16} />, label: tr('Products', 'المنتجات'), show: mod.ordering },
    { k: 'staff', icon: <UserCog size={16} />, label: tr('Staff & kitchen', 'الموظفون والمطبخ') },
    { k: 'riders', icon: <Bike size={16} />, label: tr('Riders', 'السائقون'), show: mod.delivery },
    { k: 'promos', icon: <Tag size={16} />, label: tr('Deals & promos', 'العروض والرموز'), show: mod.deals || mod.campaigns },
    { k: 'loyalty', icon: <Gift size={16} />, label: tr('Loyalty & wallet', 'الولاء والمحفظة'), show: mod.loyaltyPoints || mod.loyaltyStamps || mod.wallet },
    { k: 'customers', icon: <Users size={16} />, label: tr('Customers', 'الزبائن') },
  ].filter((x) => x.show !== false) as { k: Tab; icon: ReactNode; label: string }[];

  const ctx: Ctx = { demo, scope, prev, tr, tl, m, lang, rangeLabel };

  return (
    <div>
      <PageHead title={tr('Reports', 'التقارير')} sub={tr('Sales, invoices, staff, riders, promotions and loyalty — all for the same period.', 'المبيعات والفواتير والموظفون والسائقون والعروض والولاء — لنفس الفترة.')}
        action={<>
          <Button variant="outline" size="sm" icon={<Download size={15} />} onClick={() => exportTab(tab, ctx)}>{tr('Export CSV', 'تصدير CSV')}</Button>
          <Button variant="outline" size="sm" icon={<Printer size={15} />} onClick={() => window.print()}>{tr('Print', 'طباعة')}</Button>
        </>} />

      {/* One filter row scopes everything below it. */}
      <div className="no-print flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <button onClick={() => setPick((v) => !v)} className="h-10 ps-3 pe-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold flex items-center gap-2 hover:border-gray-300">
            <CalendarDays size={16} className="text-gray-500" />{rangeLabel}<ChevronDown size={15} className="text-gray-400" />
          </button>
          {pick && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setPick(false)} />
              <div className="absolute z-40 top-11 start-0 w-64 rounded-2xl bg-white shadow-2xl border border-gray-100 p-1.5">
                {ranges.map((x) => (
                  <button key={x.k} onClick={() => { setRange(x.k); setPick(false); }} className="w-full flex items-center gap-2 rounded-xl px-3 h-10 text-sm text-start hover:bg-gray-50">
                    <span className="w-4">{range === x.k && <Check size={16} strokeWidth={3} />}</span>{x.label}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-2 px-2 pb-1">
                  <div className="text-xs font-semibold text-gray-500 mb-1.5">{tr('Custom range', 'فترة مخصصة')}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="date" value={custom.from} max={custom.to} onChange={(e) => e.target.value && (setCustom({ ...custom, from: e.target.value }), setRange('custom'))} className="h-9 rounded-lg border border-gray-200 px-2 text-xs" />
                    <input type="date" value={custom.to} min={custom.from} max={ymd(new Date())} onChange={(e) => e.target.value && (setCustom({ ...custom, to: e.target.value }), setRange('custom'))} className="h-9 rounded-lg border border-gray-200 px-2 text-xs" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {cfg.branches.length > 1 && (
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold">
            <option value="all">{tr('All branches', 'كل الفروع')}</option>
            {cfg.branches.map((b) => <option key={b.id} value={b.id}>{tl(b.name)}</option>)}
          </select>
        )}
        <span className="text-xs text-gray-500">{tr('Compared with the previous period of the same length', 'مقارنة بالفترة السابقة بنفس الطول')}</span>
      </div>

      <div className="no-print flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 mb-5 border-b border-gray-200">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={cx('shrink-0 flex items-center gap-1.5 px-3 h-10 text-sm font-semibold border-b-2 -mb-px transition', tab === t.k ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      <div className="hidden print:block mb-4 text-sm text-gray-600">{tl(cfg.business.name)} · {tabs.find((t) => t.k === tab)?.label} · {rangeLabel}</div>

      {tab === 'overview' && <Overview {...ctx} />}
      {tab === 'invoices' && <Invoices {...ctx} />}
      {tab === 'products' && <Products {...ctx} />}
      {tab === 'staff' && <StaffReport {...ctx} />}
      {tab === 'riders' && <RidersReport {...ctx} />}
      {tab === 'promos' && <Promos {...ctx} />}
      {tab === 'loyalty' && <LoyaltyReport {...ctx} />}
      {tab === 'customers' && <CustomersReport {...ctx} />}
    </div>
  );
}

interface Ctx {
  demo: Demo; scope: R.Scope; prev: R.Scope; tr: Tr; tl: (x: { en: string; ar?: string } | undefined) => string; m: (n: number) => string; lang: 'en' | 'ar'; rangeLabel: string;
}

function Panel({ title, sub, children, className, action }: { title: ReactNode; sub?: ReactNode; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <Card className={cx('p-5 break-inside-avoid', className)}>
      <div className="flex items-start gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900">{title}</div>
          {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Table({ head, rows, empty, align }: { head: ReactNode[]; rows: ReactNode[][]; empty?: string; align?: ('s' | 'e')[] }) {
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            {head.map((h, i) => <th key={i} className={cx('px-5 py-2 font-medium whitespace-nowrap', align?.[i] === 'e' ? 'text-end' : 'text-start')}>{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.length ? rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50/60">
              {r.map((c, j) => <td key={j} className={cx('px-5 py-2.5 whitespace-nowrap', align?.[j] === 'e' ? 'text-end tabular-nums' : 'text-start')}>{c}</td>)}
            </tr>
          )) : <tr><td colSpan={head.length} className="px-5 py-8 text-center text-gray-500">{empty ?? '—'}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

const dayLabel = (t: number, lang: 'en' | 'ar', long: boolean) => fmtDate(t, lang, long ? { day: 'numeric', month: 'short' } : { weekday: 'short' });

// ── Sales overview ─────────────────────────────────────────────
function Overview({ demo, scope, prev, tr, tl, m, lang }: Ctx) {
  const s = R.sales(demo, scope);
  const p = R.sales(demo, prev);
  const k = R.kitchen(demo, scope);
  const rv = R.reviews(demo, scope);
  const vs = tr('vs previous', 'مقارنة بالسابق');
  const long = s.days.length > 7;
  const daily = s.days.map((d, i) => ({ label: dayLabel(d.t, lang, long), tip: fmtDate(d.t, lang, { weekday: 'long', day: 'numeric', month: 'short' }), value: d.revenue, prev: p.days[i]?.revenue }));
  const fl: Record<string, string> = { delivery: tr('Delivery', 'توصيل'), pickup: tr('Pickup', 'استلام'), dineIn: tr('Dine-in', 'في المطعم') };
  const pl: Record<string, string> = { card: tr('Card', 'بطاقة'), applePay: 'Apple Pay', googlePay: 'Google Pay', cash: tr('Cash', 'نقداً'), wallet: tr('Wallet', 'المحفظة') };
  const wk = [tr('Sun', 'أحد'), tr('Mon', 'اثنين'), tr('Tue', 'ثلاثاء'), tr('Wed', 'أربعاء'), tr('Thu', 'خميس'), tr('Fri', 'جمعة'), tr('Sat', 'سبت')];
  const openHours = s.hours.filter((h, i) => h.orders > 0 || (i >= 8 && i <= 23));
  const busiest = [...s.hours].sort((a, b) => b.orders - a.orders)[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile hero label={tr('Revenue', 'الإيرادات')} value={m(s.revenue)} delta={R.pctChange(s.revenue, p.revenue)} deltaLabel={vs} />
        <StatTile label={tr('Completed orders', 'الطلبات المكتملة')} value={s.orders.toLocaleString()} delta={R.pctChange(s.orders, p.orders)} deltaLabel={vs} />
        <StatTile label={tr('Average order', 'متوسط الطلب')} value={m(s.aov)} delta={R.pctChange(s.aov, p.aov)} deltaLabel={vs} />
        <StatTile label={tr('Customers who ordered', 'زبائن طلبوا')} value={s.customers.toLocaleString()} delta={R.pctChange(s.customers, p.customers)} deltaLabel={vs} />
      </div>

      <Panel title={tr('Revenue by day', 'الإيرادات حسب اليوم')} sub={tr('Completed orders, before tips', 'الطلبات المكتملة، بدون الإكراميات')}>
        {long
          ? <LineChart data={daily} format={compact} tipFormat={m} valueName={tr('This period', 'هذه الفترة')} prevName={tr('Previous period', 'الفترة السابقة')} />
          : <ColumnChart data={daily} format={compact} tipFormat={m} valueName={tr('This period', 'هذه الفترة')} prevName={tr('Previous period', 'الفترة السابقة')} />}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title={tr('Money breakdown', 'تفصيل المبالغ')} sub={tr('What the takings are made of', 'مما تتكوّن المبيعات')}>
          <dl className="text-sm divide-y divide-gray-100">
            {([
              [tr('Item sales (gross)', 'مبيعات الأصناف (إجمالي)'), m(s.gross), ''],
              [tr('Discounts & promos', 'الخصومات والعروض'), s.discounts ? '−' + m(s.discounts) : m(0), 'text-rose-700'],
              [tr('Delivery fees', 'رسوم التوصيل'), m(s.delivery), ''],
              [tr('Revenue', 'الإيرادات'), m(s.revenue), 'font-bold'],
              [tr(`VAT included (${demo.config.fulfillment.taxRate}%)`, `الضريبة ضمناً (${demo.config.fulfillment.taxRate}%)`), m(s.tax), 'text-gray-500'],
              [tr('Net of VAT', 'الصافي بعد الضريبة'), m(s.net), 'font-semibold'],
              [tr('Tips (paid to the team)', 'الإكراميات (للفريق)'), m(s.tips), 'text-gray-500'],
            ] as [string, string, string][]).map(([a, b, c]) => (
              <div key={a} className={cx('flex justify-between py-2', c)}><dt>{a}</dt><dd className="tabular-nums">{b}</dd></div>
            ))}
          </dl>
        </Panel>
        <div className="space-y-4">
          <Panel title={tr('How customers order', 'كيف يطلب الزبائن')}>
            <SegmentedBar format={(n) => m(n)} parts={s.byFulfillment.map((x) => ({ key: x.key, label: fl[x.key], value: x.revenue }))} />
          </Panel>
          <Panel title={tr('How customers pay', 'كيف يدفع الزبائن')}>
            <SegmentedBar format={(n) => m(n)} parts={s.byPayment.map((x) => ({ key: x.key, label: pl[x.key] ?? x.key, value: x.revenue }))} />
          </Panel>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title={tr('Busiest hours', 'أوقات الذروة')} sub={busiest?.orders ? tr(`Peak at ${busiest.h}:00 — plan staff around it`, `الذروة عند ${busiest.h}:00 — نظّم الموظفين حولها`) : undefined}>
          <ColumnChart data={openHours.map((h) => ({ label: String(h.h), tip: `${h.h}:00–${h.h + 1}:00 · ${m(h.revenue)}`, value: h.orders }))} format={(n) => compact(n)} valueName={tr('Orders', 'الطلبات')} every={2} height={170} />
        </Panel>
        <Panel title={tr('By day of the week', 'حسب يوم الأسبوع')}>
          <ColumnChart data={s.weekdays.map((w) => ({ label: wk[w.w], tip: `${wk[w.w]} · ${w.orders} ${tr('orders', 'طلب')}`, value: w.revenue }))} format={compact} tipFormat={m} valueName={tr('Revenue', 'الإيرادات')} height={170} every={1} />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title={tr('Lost orders', 'الطلبات المفقودة')} sub={tr(`${s.cancelledCount} cancelled · ${m(s.cancelledValue)} not earned`, `${s.cancelledCount} ملغى · ${m(s.cancelledValue)} لم تُكسب`)}>
          <div className="flex items-baseline gap-2 mb-3"><span className="text-2xl font-semibold">{s.cancelRate.toFixed(1)}%</span><span className="text-xs text-gray-500">{tr('of all orders', 'من كل الطلبات')}</span></div>
          <BarList color="#ec4647" empty={tr('No lost orders 🎉', 'لا طلبات مفقودة 🎉')} rows={s.lost.map((x) => ({ key: x.reason.en, label: tl(x.reason), value: x.orders, display: x.orders, sub: m(x.value) }))} />
        </Panel>
        <Panel title={tr('Speed of service', 'سرعة الخدمة')} sub={tr(`Target prep time ${k.target} min`, `وقت التحضير المستهدف ${k.target} د`)}>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3"><Clock size={18} className="text-gray-400" /><span className="flex-1">{tr('Time to accept', 'وقت القبول')}</span><b>{fmtMin(k.acceptAvg, tr)}</b></div>
            <div className="flex items-center gap-3"><Timer size={18} className="text-gray-400" /><span className="flex-1">{tr('Average prep', 'متوسط التحضير')}</span><b>{fmtMin(k.prepAvg, tr)}</b></div>
            <div>
              <div className="flex justify-between mb-1.5"><span>{tr('Ready on time', 'جاهز في الوقت')}</span><b>{pct(k.onTime)}</b></div>
              <Meter value={k.onTime ?? 0} tone={(k.onTime ?? 0) >= 85 ? 'good' : (k.onTime ?? 0) >= 65 ? 'warn' : 'bad'} />
            </div>
          </div>
        </Panel>
        <Panel title={tr('Ratings', 'التقييمات')} sub={rv.count ? tr(`${rv.count} reviews · ${rv.replied} replied`, `${rv.count} تقييم · ${rv.replied} تم الرد`) : undefined}>
          <div className="flex items-center gap-2 mb-3"><span className="text-3xl font-semibold">{rv.avg ? rv.avg.toFixed(1) : '—'}</span><Star size={20} className="fill-amber-400 text-amber-400" /></div>
          <BarList color="#f2a600" rows={rv.dist.map((x) => ({ key: String(x.n), label: '★'.repeat(x.n), value: x.count, display: x.count }))} />
          {rv.low > 0 && <div className="mt-3 text-xs text-rose-700 flex items-center gap-1.5"><AlertTriangle size={13} />{tr(`${rv.low} low ratings need attention`, `${rv.low} تقييمات منخفضة تحتاج متابعة`)}</div>}
        </Panel>
      </div>

      {s.byBranch.length > 1 && (
        <Panel title={tr('Branches', 'الفروع')}>
          <BarList rows={s.byBranch.map((x) => ({ key: x.key, label: tl(demo.config.branches.find((b) => b.id === x.key)?.name), value: x.revenue, display: m(x.revenue), sub: tr(`${x.orders} orders`, `${x.orders} طلب`) }))} />
        </Panel>
      )}
      {demo.config.modules.reservations && <BookingsPanel {...{ demo, scope, prev, tr, tl, m, lang, rangeLabel: '' }} />}
    </div>
  );
}

function BookingsPanel({ demo, scope, tr }: Ctx) {
  const b = R.bookings(demo, scope);
  return (
    <Panel title={tr('Bookings', 'الحجوزات')}>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
        {([[tr('Requests', 'طلبات'), b.total], [tr('Guests served', 'ضيوف خُدموا'), b.covers], [tr('Waiting to confirm', 'بانتظار التأكيد'), b.pending], [tr('No-shows', 'لم يحضروا'), `${b.noShow} (${b.noShowRate.toFixed(0)}%)`], [tr('Average party', 'متوسط العدد'), b.avgParty.toFixed(1)]] as [string, ReactNode][]).map(([a, v]) => (
          <div key={a} className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-500">{a}</div><div className="text-lg font-semibold mt-0.5">{v}</div></div>
        ))}
      </div>
    </Panel>
  );
}

// ── Invoices ───────────────────────────────────────────────────
function Invoices({ demo, scope, tr, tl, m, lang }: Ctx) {
  const all = R.invoices(demo, scope);
  const [status, setStatus] = useState<'all' | 'paid' | 'unpaid' | 'cancelled'>('all');
  const [open, setOpen] = useState<Order | null>(null);
  const [limit, setLimit] = useState(50);
  const list = all.filter((o) => status === 'all' || (status === 'cancelled' ? o.status === 'cancelled' : o.status !== 'cancelled' && (status === 'paid') === (o.paid || o.status === 'completed')));
  const ok = all.filter((o) => o.status === 'completed');
  const pl: Record<string, string> = { card: tr('Card', 'بطاقة'), applePay: 'Apple Pay', googlePay: 'Google Pay', cash: tr('Cash', 'نقداً'), wallet: tr('Wallet', 'المحفظة') };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label={tr('Invoices issued', 'فواتير صادرة')} value={ok.length.toLocaleString()} />
        <StatTile label={tr('Invoiced total', 'إجمالي الفواتير')} value={m(ok.reduce((a, o) => a + o.total, 0))} />
        <StatTile label={tr('VAT collected', 'الضريبة المحصّلة')} value={m(ok.reduce((a, o) => a + o.tax, 0))} />
        <StatTile label={tr('Still to collect', 'غير محصّل بعد')} value={m(all.filter((o) => !o.paid && o.status !== 'cancelled' && o.status !== 'completed').reduce((a, o) => a + o.total, 0))} />
      </div>
      <Panel title={tr('Invoices', 'الفواتير')} sub={tr('Tap a row to view or print the invoice', 'اضغط على سطر لعرض الفاتورة أو طباعتها')}
        action={
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="no-print h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm">
            <option value="all">{tr('All', 'الكل')}</option><option value="paid">{tr('Paid', 'مدفوعة')}</option><option value="unpaid">{tr('Unpaid', 'غير مدفوعة')}</option><option value="cancelled">{tr('Cancelled', 'ملغاة')}</option>
          </select>
        }>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 border-b border-gray-100">
              {[tr('Invoice', 'الفاتورة'), tr('Date', 'التاريخ'), tr('Customer', 'الزبون'), tr('Payment', 'الدفع'), tr('VAT', 'الضريبة'), tr('Total', 'الإجمالي'), tr('Status', 'الحالة')].map((h, i) => <th key={i} className={cx('px-5 py-2 font-medium whitespace-nowrap', i >= 4 && i <= 5 ? 'text-end' : 'text-start')}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {list.slice(0, limit).map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(o)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(o)}>
                  <td className="px-5 py-2.5 font-mono text-xs whitespace-nowrap" dir="ltr">{R.invoiceNo(o)}</td>
                  <td className="px-5 py-2.5 whitespace-nowrap text-gray-600">{fmtDate(o.createdAt, lang, { day: 'numeric', month: 'short' })} · {fmtTime(o.createdAt, lang)}</td>
                  <td className="px-5 py-2.5 whitespace-nowrap">{o.customerName}</td>
                  <td className="px-5 py-2.5 whitespace-nowrap text-gray-600">{pl[o.payment] ?? o.payment}</td>
                  <td className="px-5 py-2.5 text-end tabular-nums text-gray-600">{m(o.tax)}</td>
                  <td className="px-5 py-2.5 text-end tabular-nums font-semibold">{m(o.total)}</td>
                  <td className="px-5 py-2.5"><Badge className={statusTone[o.status]}>{tl(statusLabel(o.status, demo.config.industry, o.fulfillment))}</Badge></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-500">{tr('No invoices in this period', 'لا فواتير في هذه الفترة')}</td></tr>}
            </tbody>
          </table>
        </div>
        {list.length > limit && <Button variant="ghost" block className="mt-2 no-print" onClick={() => setLimit((x) => x + 100)}>{tr(`Show more (${list.length - limit})`, `عرض المزيد (${list.length - limit})`)}</Button>}
      </Panel>
      {open && <InvoiceModal o={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function InvoiceModal({ o, onClose }: { o: Order; onClose: () => void }) {
  const { cfg, tr, tl, m, lang } = useDemo();
  const b = cfg.business;
  const print = () => {
    const el = document.getElementById('invoice-doc');
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!el || !w) return;
    w.document.write(`<!doctype html><html dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><title>${R.invoiceNo(o)}</title><style>body{font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;color:#191919;margin:32px;font-size:13px}table{width:100%;border-collapse:collapse}th,td{padding:8px 4px;border-bottom:1px solid #eee;text-align:start}td.e,th.e{text-align:end}.muted{color:#666}.tot td{border:0;padding:4px}.big td{font-size:16px;font-weight:700;border-top:2px solid #191919}h1{margin:0;font-size:22px}</style></head><body>${el.innerHTML}<script>setTimeout(()=>print(),300)</script></body></html>`);
    w.document.close();
  };
  return (
    <Modal open onClose={onClose} size="lg" title={tr('Invoice', 'فاتورة')} footer={<><Button variant="ghost" onClick={onClose}>{tr('Close', 'إغلاق')}</Button><Button icon={<Printer size={16} />} onClick={print}>{tr('Print / save PDF', 'طباعة / حفظ PDF')}</Button></>}>
      <div id="invoice-doc" className="text-sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div>
            <h1 className="text-xl font-bold">{tl(b.name)}</h1>
            <div className="muted text-gray-500">{[b.address, b.city, b.country].filter(Boolean).join(', ')}</div>
            <div className="muted text-gray-500" dir="ltr">{[b.phone, b.email].filter(Boolean).join(' · ')}</div>
          </div>
          <div style={{ textAlign: 'end' }}>
            <div className="font-bold">{tr('TAX INVOICE', 'فاتورة ضريبية')}</div>
            <div className="font-mono" dir="ltr">{R.invoiceNo(o)}</div>
            <div className="muted text-gray-500">{fmtDate(o.createdAt, lang)} · {fmtTime(o.createdAt, lang)}</div>
          </div>
        </div>
        <div className="mt-4 mb-3 text-gray-600 muted">
          {tr('Bill to', 'إلى')}: <b className="text-gray-900">{o.customerName}</b>{o.phone && <span dir="ltr"> · {o.phone}</span>}{o.address && <> · {o.address}</>}
          <br />{tr('Order', 'الطلب')} #{o.number} · {o.fulfillment === 'dineIn' ? tr(`Table ${o.table ?? ''}`, `طاولة ${o.table ?? ''}`) : o.fulfillment === 'delivery' ? tr('Delivery', 'توصيل') : tr('Pickup', 'استلام')}
        </div>
        <table className="w-full">
          <thead><tr className="text-xs text-gray-500 border-b"><th className="py-2 text-start">{tr('Item', 'الصنف')}</th><th className="py-2 text-end e">{tr('Qty', 'الكمية')}</th><th className="py-2 text-end e">{tr('Price', 'السعر')}</th><th className="py-2 text-end e">{tr('Amount', 'المبلغ')}</th></tr></thead>
          <tbody>
            {o.items.map((i, k) => (
              <tr key={k} className="border-b border-gray-100">
                <td className="py-2">{tl(i.name)}{i.options.length > 0 && <div className="text-xs text-gray-500 muted">{i.options.map((x) => tl(x)).join(', ')}</div>}</td>
                <td className="py-2 text-end e tabular-nums">{i.qty}</td><td className="py-2 text-end e tabular-nums">{m(i.unitPrice)}</td><td className="py-2 text-end e tabular-nums">{m(i.unitPrice * i.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full mt-3 tot" style={{ maxWidth: 320, marginInlineStart: 'auto' }}>
          <tbody>
            <tr><td>{tr('Subtotal', 'المجموع الفرعي')}</td><td className="text-end e tabular-nums">{m(o.subtotal)}</td></tr>
            {o.discount > 0 && <tr><td>{tr('Discount', 'الخصم')}{o.couponCode && ` (${o.couponCode})`}</td><td className="text-end e tabular-nums">−{m(o.discount)}</td></tr>}
            {o.deliveryFee > 0 && <tr><td>{tr('Delivery', 'التوصيل')}</td><td className="text-end e tabular-nums">{m(o.deliveryFee)}</td></tr>}
            <tr className="text-gray-500 muted"><td>{tr(`Incl. VAT ${cfg.fulfillment.taxRate}%`, `تشمل الضريبة ${cfg.fulfillment.taxRate}%`)}</td><td className="text-end e tabular-nums">{m(o.tax)}</td></tr>
            <tr className="big font-bold text-base border-t-2 border-gray-900"><td className="pt-2">{tr('Total', 'الإجمالي')}</td><td className="pt-2 text-end e tabular-nums">{m(o.total)}</td></tr>
            {o.tip > 0 && <tr className="text-gray-500 muted"><td>{tr('Tip', 'إكرامية')}</td><td className="text-end e tabular-nums">{m(o.tip)}</td></tr>}
          </tbody>
        </table>
        <div className="mt-4 text-xs text-gray-500 muted">{o.status === 'cancelled' ? tr('CANCELLED — not payable', 'ملغاة — غير مستحقة') : o.paid || o.status === 'completed' ? tr(`Paid · ${PAY_EN[o.payment] ?? o.payment}`, `مدفوعة · ${PAY_AR[o.payment] ?? o.payment}`) : tr('Payment due', 'الدفع مستحق')}</div>
      </div>
    </Modal>
  );
}

// ── Products ───────────────────────────────────────────────────
function Products({ demo, scope, tr, tl, m }: Ctx) {
  const p = R.products(demo, scope);
  const [by, setBy] = useState<'revenue' | 'qty'>('revenue');
  const top = [...p.list].sort((a, b) => b[by] - a[by]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label={tr('Items sold', 'أصناف مباعة')} value={p.itemsTotal.toLocaleString()} />
        <StatTile label={tr('Items per order', 'أصناف لكل طلب')} value={p.perOrder.toFixed(1)} />
        <StatTile label={tr('Best seller', 'الأكثر مبيعاً')} value={<span className="text-lg">{top[0] ? `${top[0].emoji} ${tl(top[0].name)}` : '—'}</span>} />
        <StatTile label={tr('Not sold this period', 'لم تُبع في هذه الفترة')} value={p.notSold.length} />
      </div>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <Panel title={tr('Top items', 'الأصناف الأعلى')} action={
          <div className="no-print flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
            {(['revenue', 'qty'] as const).map((k) => <button key={k} onClick={() => setBy(k)} className={cx('px-2.5 h-7 rounded-md', by === k ? 'bg-white shadow-sm' : 'text-gray-500')}>{k === 'revenue' ? tr('Sales', 'المبيعات') : tr('Quantity', 'الكمية')}</button>)}
          </div>}>
          <BarList rows={top.slice(0, 12).map((x) => ({ key: x.id, lead: <span className="text-lg w-6 text-center">{x.emoji}</span>, label: tl(x.name), value: x[by], display: by === 'revenue' ? m(x.revenue) : `×${x.qty}`, sub: by === 'revenue' ? `×${x.qty}` : m(x.revenue) }))} empty={tr('No sales in this period', 'لا مبيعات في هذه الفترة')} />
        </Panel>
        <div className="space-y-4">
          <Panel title={tr('Sales by category', 'المبيعات حسب الفئة')}>
            <BarList color="#00b894" rows={p.cats.map((c) => ({ key: c.id, lead: <span className="w-6 text-center">{c.emoji}</span>, label: tl(c.name), value: c.revenue, display: m(c.revenue), sub: `×${c.qty}` }))} />
          </Panel>
          <Panel title={tr('Slow movers', 'الأصناف البطيئة')} sub={tr('Active items nobody ordered — consider a deal or removing them', 'أصناف نشطة لم يطلبها أحد — فكّر بعرض أو إزالتها')}>
            {p.notSold.length ? (
              <div className="flex flex-wrap gap-1.5">{p.notSold.slice(0, 20).map((x) => <span key={x.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs">{x.emoji} {tl(x.name)}</span>)}</div>
            ) : <div className="text-sm text-emerald-700">{tr('Every item sold at least once 👏', 'كل صنف بيع مرة واحدة على الأقل 👏')}</div>}
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ── Staff & kitchen ────────────────────────────────────────────
function StaffReport({ demo, scope, tr, m }: Ctx) {
  const rows = R.staff(demo, scope);
  const k = R.kitchen(demo, scope);
  const role: Record<string, string> = { manager: tr('Manager', 'مدير'), cashier: tr('Cashier', 'كاشير'), kitchen: tr('Kitchen', 'المطبخ') };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label={tr('Avg. time to accept', 'متوسط وقت القبول')} value={fmtMin(k.acceptAvg, tr)} upIsGood={false} />
        <StatTile label={tr('Avg. prep time', 'متوسط التحضير')} value={fmtMin(k.prepAvg, tr)} hint={tr(`target ${k.target} min`, `الهدف ${k.target} د`)} />
        <StatTile label={tr('Ready on time', 'جاهز في الوقت')} value={pct(k.onTime)} />
        <StatTile label={tr('Orders measured', 'طلبات مقاسة')} value={k.measured.toLocaleString()} />
      </div>
      <Panel title={tr('Team performance', 'أداء الفريق')} sub={tr('Who accepted, cooked and declined orders in this period', 'من قبل وحضّر ورفض الطلبات في هذه الفترة')}>
        <Table align={['s', 's', 'e', 'e', 'e', 'e', 'e', 'e', 'e']}
          head={[tr('Name', 'الاسم'), tr('Role', 'الدور'), tr('Accepted', 'قبِل'), tr('Avg. accept', 'متوسط القبول'), tr('Prepared', 'حضّر'), tr('Avg. prep', 'متوسط التحضير'), tr('Declined', 'رفض'), tr('Sales handled', 'مبيعات'), tr('Tips', 'إكراميات')]}
          rows={rows.map((r) => [
            <span className="font-semibold">{r.name}{!r.active && <span className="text-xs text-gray-400 ms-1">({tr('inactive', 'غير نشط')})</span>}</span>,
            <span className="text-gray-600">{role[r.role]}</span>, r.accepted, fmtMin(r.acceptMin, tr), r.cooked, fmtMin(r.prepMin, tr),
            <span className={r.rejected ? 'text-rose-700 font-semibold' : ''}>{r.rejected}</span>, m(r.sales), m(r.tips),
          ])} />
      </Panel>
      <Panel title={tr('Orders handled per person', 'الطلبات لكل شخص')}>
        <BarList rows={[...rows].sort((a, b) => b.handled - a.handled).map((r) => ({ key: r.id, label: r.name, value: r.handled, display: r.handled, sub: role[r.role] }))} />
      </Panel>
    </div>
  );
}

// ── Riders ─────────────────────────────────────────────────────
function RidersReport({ demo, scope, tr, m }: Ctx) {
  const rows = R.riders(demo, scope);
  const tot = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  const times = rows.filter((r) => r.avgMin !== undefined);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label={tr('Deliveries', 'التوصيلات')} value={tot((r) => r.deliveries).toLocaleString()} />
        <StatTile label={tr('Avg. delivery time', 'متوسط وقت التوصيل')} value={fmtMin(times.length ? times.reduce((a, r) => a + r.avgMin! * r.deliveries, 0) / Math.max(1, times.reduce((a, r) => a + r.deliveries, 0)) : undefined, tr)} />
        <StatTile label={tr('Cash collected', 'نقد محصّل')} value={m(tot((r) => r.cashCollected))} />
        <StatTile label={tr('Cash still with riders', 'نقد مع السائقين')} value={m(tot((r) => r.holding))} hint={tot((r) => r.short) > 0 ? tr(`${m(tot((r) => r.short))} short at hand-in`, `نقص ${m(tot((r) => r.short))} عند التسليم`) : undefined} />
      </div>
      <Panel title={tr('Rider performance', 'أداء السائقين')}>
        <Table align={['s', 'e', 'e', 'e', 'e', 'e', 'e', 'e']}
          head={[tr('Rider', 'السائق'), tr('Deliveries', 'توصيلات'), tr('Avg. time', 'متوسط الوقت'), tr('On time', 'في الوقت'), tr('Order value', 'قيمة الطلبات'), tr('Cash collected', 'نقد محصّل'), tr('Short', 'نقص'), tr('Holding now', 'معه الآن')]}
          rows={rows.map((r) => [
            <span className="font-semibold">{r.name}{r.onShift && <span className="ms-1.5 text-[10px] rounded-full bg-emerald-50 text-emerald-700 px-1.5 py-0.5">{tr('on shift', 'في المناوبة')}</span>}</span>,
            r.deliveries, fmtMin(r.avgMin, tr), pct(r.onTime), m(r.value), m(r.cashCollected),
            <span className={r.short ? 'text-rose-700 font-semibold' : ''}>{m(r.short)}</span>, <b>{m(r.holding)}</b>,
          ])} />
      </Panel>
      <Panel title={tr('On-time deliveries', 'التوصيل في الوقت')} sub={tr('Delivered within the zone’s promised time', 'سُلّمت ضمن الوقت الموعود للمنطقة')}>
        <BarList color="#00b894" rows={rows.filter((r) => r.onTime !== undefined).map((r) => ({ key: r.id, label: r.name, value: r.onTime!, display: pct(r.onTime), sub: fmtMin(r.avgMin, tr) }))} empty={tr('No deliveries in this period', 'لا توصيلات في هذه الفترة')} />
      </Panel>
    </div>
  );
}

// ── Deals & promos ─────────────────────────────────────────────
function Promos({ demo, scope, tr, tl, m, lang }: Ctx) {
  const p = R.promos(demo, scope);
  const aud: Record<string, string> = { all: tr('Everyone', 'الجميع'), regular: tr('Regulars', 'الدائمون'), quiet: tr('Quiet', 'المنقطعون'), new: tr('New', 'الجدد'), occasional: tr('Occasional', 'العرضيون'), birthday: tr('Birthdays', 'أعياد الميلاد') };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label={tr('Discounts given', 'خصومات ممنوحة')} value={m(p.discountTotal)} upIsGood={false} />
        <StatTile label={tr('Sales with a promo', 'مبيعات بعرض')} value={m(p.promoSales)} />
        <StatTile label={tr('Orders using a promo', 'طلبات استخدمت عرضاً')} value={`${p.promoShare.toFixed(0)}%`} />
        <StatTile label={tr('Return per 1 discounted', 'العائد لكل 1 خصم')} value={p.discountTotal ? `×${(p.promoSales / p.discountTotal).toFixed(1)}` : '—'} hint={tr('sales ÷ discount', 'المبيعات ÷ الخصم')} />
      </div>
      <Panel title={tr('Codes & deals', 'الرموز والعروض')} sub={tr('Every promo code used in this period, and active deals nobody used', 'كل رمز استُخدم في هذه الفترة، والعروض النشطة غير المستخدمة')}>
        <Table align={['s', 's', 'e', 'e', 'e', 'e', 'e', 'e']}
          head={[tr('Code', 'الرمز'), tr('Offer', 'العرض'), tr('Uses', 'الاستخدام'), tr('Customers', 'زبائن'), tr('New customers', 'زبائن جدد'), tr('Sales', 'المبيعات'), tr('Discount', 'الخصم'), tr('Return', 'العائد')]}
          rows={p.rows.map((r) => [
            <span className="font-mono text-xs rounded bg-gray-100 px-1.5 py-0.5" dir="ltr">{r.code}</span>,
            <span className="text-gray-600">{r.title ? tl(r.title) : '—'} <span className="text-[10px] text-gray-400">{r.source === 'campaign' ? tr('campaign', 'حملة') : r.source === 'deal' ? tr('deal', 'عرض') : ''}</span></span>,
            r.uses, r.customers, r.newCustomers, m(r.sales), m(r.discount), r.roi ? `×${r.roi.toFixed(1)}` : <span className="text-gray-400">{tr('unused', 'غير مستخدم')}</span>,
          ])} empty={tr('No promo codes used in this period', 'لم تُستخدم رموز في هذه الفترة')} />
      </Panel>
      {demo.config.modules.campaigns && (
        <Panel title={tr('Push campaigns', 'حملات الإشعارات')}>
          <Table align={['s', 's', 'e', 'e', 'e', 'e']}
            head={[tr('Message', 'الرسالة'), tr('Sent to', 'أُرسلت إلى'), tr('Reached', 'وصلت'), tr('Converted', 'تحويل'), tr('Orders', 'الطلبات'), tr('Sales', 'المبيعات')]}
            rows={p.campaigns.map((c) => [
              <span><span className="font-semibold">{tl(c.title)}</span><span className="block text-xs text-gray-500">{fmtDate(c.sentAt, lang, { day: 'numeric', month: 'short' })}{c.code && ` · ${c.code}`}</span></span>,
              aud[c.audience] ?? c.audience, c.reach, c.code ? pct(c.conv) : '—', c.code ? c.uses : '—', c.code ? m(c.sales) : '—',
            ])} empty={tr('No campaigns in this period', 'لا حملات في هذه الفترة')} />
        </Panel>
      )}
    </div>
  );
}

// ── Loyalty & wallet ───────────────────────────────────────────
function LoyaltyReport({ demo, scope, tr, tl, m }: Ctx) {
  const l = R.loyalty(demo, scope);
  const mod = demo.config.modules;
  const src: Record<string, string> = { order: tr('Orders', 'الطلبات'), qrStaff: tr('Staff QR', 'رمز الموظف'), qrStatic: tr('Counter QR', 'رمز الكاشير'), signup: tr('Sign-up bonus', 'هدية التسجيل'), referral: tr('Referrals', 'الإحالات'), review: tr('Reviews', 'التقييمات'), manual: tr('Manual', 'يدوي'), reservation: tr('Bookings', 'الحجوزات'), reward: tr('Rewards', 'المكافآت') };
  return (
    <div className="space-y-4">
      {(mod.loyaltyPoints || mod.loyaltyStamps) && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label={tr('Points given', 'نقاط ممنوحة')} value={l.earned.toLocaleString()} />
            <StatTile label={tr('Points redeemed', 'نقاط مستبدلة')} value={l.redeemed.toLocaleString()} hint={tr(`${l.redemptionRate.toFixed(0)}% of given`, `${l.redemptionRate.toFixed(0)}% من الممنوح`)} />
            <StatTile label={tr('Active members', 'أعضاء نشطون')} value={<span dir="ltr">{l.activeMembers} / {l.members}</span>} hint={tr('ordered in this period', 'طلبوا في هذه الفترة')} />
            <StatTile label={tr('Points liability', 'التزام النقاط')} value={m(l.liability)} hint={tr(`${l.outstanding.toLocaleString()} unspent points`, `${l.outstanding.toLocaleString()} نقطة غير مستخدمة`)} upIsGood={false} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title={tr('Where points come from', 'مصدر النقاط')}>
              <BarList rows={l.bySource.map((x) => ({ key: x.source, label: src[x.source] ?? x.source, value: x.points, display: x.points.toLocaleString() }))} empty={tr('No points given in this period', 'لا نقاط في هذه الفترة')} />
            </Panel>
            <Panel title={tr('Rewards claimed', 'المكافآت المستبدلة')} sub={tr(`${l.vouchersIssued} vouchers issued · ${l.vouchersUsed} used${mod.loyaltyStamps ? ` · ${l.stamps} stamps given` : ''}`, `${l.vouchersIssued} قسيمة صادرة · ${l.vouchersUsed} مستخدمة${mod.loyaltyStamps ? ` · ${l.stamps} ختم` : ''}`)}>
              <BarList color="#6a4ce2" rows={l.rewards.map((x) => ({ key: x.name.en, lead: <span className="w-6 text-center">{x.emoji}</span>, label: tl(x.name), value: x.issued, display: x.issued, sub: tr(`${x.used} used`, `${x.used} مستخدمة`) }))} empty={tr('No rewards claimed in this period', 'لا مكافآت في هذه الفترة')} />
            </Panel>
          </div>
          {l.tiers.length > 0 && (
            <Panel title={tr('Members by VIP tier', 'الأعضاء حسب المستوى')}>
              <SegmentedBar format={(n) => String(n)} parts={l.tiers.map((t) => ({ key: t.name.en, label: tl(t.name), value: t.count }))} />
            </Panel>
          )}
        </>
      )}
      {mod.wallet && (
        <Panel title={tr('Wallet & gift cards', 'المحفظة وبطاقات الهدايا')} sub={tr('Money customers keep in the app is a liability until spent', 'المال في محافظ الزبائن التزام حتى يُصرف')}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            {([[tr('Top-ups', 'الشحن'), m(l.wallet.topups)], [tr('Bonus given', 'المكافآت'), m(l.wallet.bonus)], [tr('Spent from wallet', 'المصروف'), m(l.wallet.spent)], [tr('Balances held', 'الأرصدة'), m(l.wallet.balance)], [tr('Gift cards sold', 'بطاقات مباعة'), `${l.wallet.giftsSold} · ${m(l.wallet.giftsValue)}`], [tr('Gift cards redeemed', 'بطاقات مستخدمة'), l.wallet.giftsRedeemed]] as [string, ReactNode][]).map(([a, v]) => (
              <div key={a} className="rounded-xl bg-gray-50 p-3"><div className="text-xs text-gray-500 flex items-center gap-1"><Wallet size={12} />{a}</div><div className="font-semibold mt-0.5">{v}</div></div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ── Customers ──────────────────────────────────────────────────
function CustomersReport({ demo, scope, prev, tr, m, lang }: Ctx) {
  const c = R.customers(demo, scope);
  const p = R.customers(demo, prev);
  const vs = tr('vs previous', 'مقارنة بالسابق');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label={tr('Customers who ordered', 'زبائن طلبوا')} value={c.buyers} delta={R.pctChange(c.buyers, p.buyers)} deltaLabel={vs} />
        <StatTile label={tr('First-time customers', 'زبائن لأول مرة')} value={c.newBuyers} delta={R.pctChange(c.newBuyers, p.newBuyers)} deltaLabel={vs} />
        <StatTile label={tr('Came back (2+ orders)', 'عادوا (طلبان+)')} value={`${c.repeatRate.toFixed(0)}%`} />
        <StatTile label={tr('New app sign-ups', 'تسجيلات جديدة')} value={c.signups} />
      </div>
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4">
        <Panel title={tr('Customer groups', 'فئات الزبائن')} sub={tr(`${c.total} customers in total`, `${c.total} زبوناً إجمالاً`)}>
          <SegmentedBar format={(n) => String(n)} parts={[
            { key: 'regular', label: tr('Regulars', 'الدائمون'), value: c.segments.regular },
            { key: 'occasional', label: tr('Occasional', 'العرضيون'), value: c.segments.occasional },
            { key: 'new', label: tr('New', 'الجدد'), value: c.segments.new },
            { key: 'quiet', label: tr('Gone quiet', 'المنقطعون'), value: c.segments.quiet },
          ]} />
          <p className="text-xs text-gray-500 mt-3">{tr('Send “Gone quiet” customers a we-miss-you offer from Notifications.', 'أرسل للمنقطعين عرض "اشتقنا لك" من الإشعارات.')}</p>
        </Panel>
        <Panel title={tr('Top customers', 'أفضل الزبائن')}>
          <Table align={['s', 'e', 'e', 'e']} head={[tr('Customer', 'الزبون'), tr('Orders', 'الطلبات'), tr('Spent', 'الإنفاق'), tr('Last order', 'آخر طلب')]}
            rows={c.top.map((x) => [<span><span className="font-semibold">{x.name}</span><span className="block text-xs text-gray-500" dir="ltr">{x.phone}</span></span>, x.orders, m(x.spent), fmtDate(x.last, lang, { day: 'numeric', month: 'short' })])} />
        </Panel>
      </div>
    </div>
  );
}

// ── CSV export of the open tab ─────────────────────────────────
function exportTab(tab: Tab, { demo, scope, tr, tl, rangeLabel }: Ctx) {
  const name = `${tl(demo.config.business.name)}-${tab}-${ymd(new Date(scope.from))}_${ymd(new Date(scope.to - 1))}.csv`;
  const r2 = (n: number | undefined) => (n === undefined ? '' : Math.round(n * 100) / 100);
  switch (tab) {
    case 'overview': {
      const s = R.sales(demo, scope);
      return downloadCsv(name, [['Report', 'Sales', rangeLabel], [], ['Date', 'Orders', 'Revenue'], ...s.days.map((d) => [d.day, d.orders, d.revenue]), [],
        ['Gross', s.gross], ['Discounts', s.discounts], ['Delivery fees', s.delivery], ['Revenue', s.revenue], ['VAT', s.tax], ['Net of VAT', s.net], ['Tips', s.tips], ['Cancelled orders', s.cancelledCount], ['Cancelled value', s.cancelledValue]]);
    }
    case 'invoices':
      return downloadCsv(name, [['Invoice', 'Order', 'Date', 'Customer', 'Phone', 'Type', 'Payment', 'Paid', 'Status', 'Subtotal', 'Discount', 'Code', 'Delivery', 'VAT', 'Total', 'Tip'],
        ...R.invoices(demo, scope).map((o) => [R.invoiceNo(o), o.number, new Date(o.createdAt).toISOString(), o.customerName, o.phone ?? '', o.fulfillment, o.payment, o.paid || o.status === 'completed' ? 'yes' : 'no', o.status, o.subtotal, o.discount, o.couponCode ?? '', o.deliveryFee, o.tax, o.total, o.tip])]);
    case 'products':
      return downloadCsv(name, [['Item', 'Quantity', 'Sales', 'Orders'], ...R.products(demo, scope).list.map((p) => [p.name.en, p.qty, p.revenue, p.orders])]);
    case 'staff':
      return downloadCsv(name, [['Name', 'Role', 'Accepted', 'Avg accept (min)', 'Prepared', 'Avg prep (min)', 'Declined', 'Sales handled', 'Tips'],
        ...R.staff(demo, scope).map((r) => [r.name, r.role, r.accepted, r2(r.acceptMin), r.cooked, r2(r.prepMin), r.rejected, r.sales, r.tips])]);
    case 'riders':
      return downloadCsv(name, [['Rider', 'Deliveries', 'Avg time (min)', 'On time %', 'Order value', 'Cash collected', 'Short', 'Holding now', 'Tips'],
        ...R.riders(demo, scope).map((r) => [r.name, r.deliveries, r2(r.avgMin), r2(r.onTime), r.value, r.cashCollected, r.short, r.holding, r.tips])]);
    case 'promos':
      return downloadCsv(name, [['Code', 'Offer', 'Uses', 'Customers', 'New customers', 'Sales', 'Discount', 'Return x'],
        ...R.promos(demo, scope).rows.map((r) => [r.code, r.title?.en ?? '', r.uses, r.customers, r.newCustomers, r.sales, r.discount, r2(r.roi)])]);
    case 'loyalty': {
      const l = R.loyalty(demo, scope);
      return downloadCsv(name, [['Points given', l.earned], ['Points redeemed', l.redeemed], ['Stamps given', l.stamps], ['Members', l.members], ['Active members', l.activeMembers], ['Unspent points', l.outstanding], ['Liability', l.liability], [],
        ['Reward', 'Issued', 'Used'], ...l.rewards.map((x) => [x.name.en, x.issued, x.used]), [], ['Wallet top-ups', l.wallet.topups], ['Wallet balances', l.wallet.balance], ['Gift cards sold', l.wallet.giftsSold, l.wallet.giftsValue]]);
    }
    case 'customers':
      return downloadCsv(name, [['Customer', 'Phone', 'Orders', 'Spent', 'Last order'], ...R.customers(demo, scope).top.map((x) => [x.name, x.phone, x.orders, x.spent, new Date(x.last).toISOString()])]);
  }
  void tr;
}
