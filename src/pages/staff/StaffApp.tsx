import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { ClipboardList, QrCode, ScanLine, CalendarDays, Truck, Store, UtensilsCrossed, Banknote, Check, X, RefreshCw, Smartphone, Search, Printer, PauseCircle, Bike, Volume2, VolumeX, Ban, Calculator } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { assignRider, suggestRider, riderActive, rejectOrder, LOST_REASONS, dualPrice, productAvailable, addLedger, claimToken, claimUrl, findVoucher, makeToken, nextStatus, parseScan, pointsFor, setOrderStatus, setReservationStatus, statusLabel, statusTone, useVoucher } from '../../lib/ops';
import type { Order, OrderStatus, LostReason } from '../../lib/types';
import { fmtDate, timeAgo, ymd } from '../../lib/utils';
import { Badge, Button, Card, Empty, Input, Segmented, Stepper, cx, Modal, Thumb, Toggle } from '../../components/ui';
import { QRCode, Scanner } from '../../components/qr';
import { resLabel, resTone } from '../customer/Reserve';

export default function StaffApp() {
  const { cfg, tr, tl, terms, data } = useDemo();
  const loyalty = cfg.modules.loyaltyPoints || cfg.modules.loyaltyStamps;
  const pending = data.orders.filter((o) => o.status === 'pending').length;
  const tabs = [
    cfg.modules.ordering && { to: '', end: true, icon: <ClipboardList size={18} />, label: tr('Orders', 'الطلبات'), badge: pending },
    loyalty && { to: 'award', icon: <QrCode size={18} />, label: tr('Award points', 'منح النقاط') },
    loyalty && { to: 'scan', icon: <ScanLine size={18} />, label: tr('Scan voucher', 'مسح قسيمة') },
    cfg.modules.reservations && { to: 'bookings', icon: <CalendarDays size={18} />, label: tr('Bookings', 'الحجوزات') },
    cfg.modules.ordering && { to: 'menu', icon: <Ban size={18} />, label: tr('Sold out', 'نفد') },
  ].filter(Boolean) as { to: string; end?: boolean; icon: JSX.Element; label: string; badge?: number }[];

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-3 flex items-center gap-1 overflow-x-auto no-scrollbar">
          <div className="hidden md:flex items-center gap-2 pe-4 me-2 border-e border-gray-200 py-3">
            <span className="h-8 w-8 rounded-lg bg-brand text-onbrand grid place-items-center">{cfg.business.logoEmoji}</span>
            <span className="font-bold whitespace-nowrap">{tl(terms.kitchen)}</span>
          </div>
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cx('relative flex items-center gap-2 px-3.5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition', isActive ? 'border-brand text-brand' : 'border-transparent text-gray-500')}>
              {t.icon}{t.label}
              {!!t.badge && <span className="h-5 min-w-5 px-1 rounded-full bg-rose-500 text-white text-[11px] grid place-items-center animate-pulse">{t.badge}</span>}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-3 sm:p-5">
          <Routes>
            <Route index element={cfg.modules.ordering ? <Board /> : <AwardPoints />} />
            <Route path="award" element={<AwardPoints />} />
            <Route path="scan" element={<ScanVoucher />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="menu" element={<SoldOut />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.16);
    });
  } catch { /* no audio */ }
}

function Board() {
  const { data, tr } = useDemo();
  const [tab, setTab] = useState<'new' | 'progress' | 'ready' | 'done'>('new');
  const today = ymd(new Date());
  const cols = useMemo(() => ({
    new: data.orders.filter((o) => o.status === 'pending'),
    progress: data.orders.filter((o) => o.status === 'accepted' || o.status === 'preparing'),
    ready: data.orders.filter((o) => o.status === 'ready' || o.status === 'outForDelivery'),
    done: data.orders.filter((o) => (o.status === 'completed' || o.status === 'cancelled') && ymd(new Date(o.updatedAt)) === today).slice(0, 12),
  }), [data.orders, today]);
  const seen = useRef(new Set(cols.new.map((o) => o.id)));
  useEffect(() => {
    const fresh = cols.new.filter((o) => !seen.current.has(o.id));
    if (fresh.length) {
      beep();
      toast(tr(`New order #${fresh[0].number}!`, `طلب جديد #${fresh[0].number}!`), 'info');
      fresh.forEach((o) => seen.current.add(o.id));
    }
  }, [cols.new, tr]);
  const [muted, setMuted] = useState(() => sessionStorage.getItem('chime-muted') === '1');
  useEffect(() => {
    if (muted || !cols.new.length) return;
    const t = setInterval(beep, 20000);
    return () => clearInterval(t);
  }, [muted, cols.new.length]);

  const { cfg, update } = useDemo();
  const paused = cfg.business.ordersPaused;
  const titles = { new: tr('New', 'جديدة'), progress: tr('In progress', 'قيد التنفيذ'), ready: tr('Ready / out', 'جاهزة / بالطريق'), done: tr('Done today', 'أُنجزت اليوم') };
  const keys = Object.keys(titles) as (keyof typeof titles)[];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => { const v = !muted; setMuted(v); sessionStorage.setItem('chime-muted', v ? '1' : '0'); }}
          className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border', muted ? 'bg-white border-gray-200 text-gray-500' : 'bg-amber-100 border-amber-200 text-amber-900')}
          title={tr('New orders chime every 20 seconds until accepted', 'ترن الطلبات الجديدة كل 20 ثانية حتى قبولها')}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />} {muted ? tr('Chime off', 'الرنين متوقف') : tr('Chime on', 'الرنين يعمل')}
        </button>
        <button onClick={() => update((d) => void (d.config.business.ordersPaused = !paused))}
          className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border', paused ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-gray-200')}>
          <PauseCircle size={15} /> {paused ? tr('Orders paused — tap to resume', 'الطلبات متوقفة — اضغط للاستئناف') : tr('Pause new orders', 'أوقف الطلبات الجديدة')}
        </button>
        {[0, 15, 30].map((v) => (
          <button key={v} onClick={() => update((d) => void (d.config.business.busyExtraMinutes = v))}
            className={cx('rounded-full px-3 py-1.5 text-sm font-semibold border', cfg.business.busyExtraMinutes === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200')}>
            {v ? tr(`Busy +${v}m`, `ضغط +${v}د`) : tr('Normal', 'عادي')}
          </button>
        ))}
      </div>
      <Segmented className="lg:hidden mb-3" value={tab} onChange={setTab} options={keys.map((k) => ({ value: k, label: <span>{titles[k]} <span className="opacity-60">{cols[k].length}</span></span> }))} />
      <div className="grid lg:grid-cols-4 gap-4">
        {keys.map((k) => (
          <div key={k} className={cx(tab !== k && 'hidden lg:block')}>
            <div className="hidden lg:flex items-center justify-between mb-2 px-1">
              <span className="font-bold">{titles[k]}</span>
              <span className="text-sm text-gray-500 font-semibold">{cols[k].length}</span>
            </div>
            <div className="space-y-3">
              {cols[k].length === 0 && <div className="rounded-app border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">{tr('Nothing here', 'لا شيء هنا')}</div>}
              {cols[k].map((o) => <OrderTicket key={o.id} o={o} />)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function printTicket(o: Order, cfg: { business: { name: { en: string; ar?: string } } }, tl: (x: { en: string; ar?: string } | undefined) => string, m: (n: number) => string) {
  const w = window.open('', '_blank', 'width=380,height=640');
  if (!w) return;
  const rows = o.items.map((i) => `<tr><td>${i.qty}×</td><td>${tl(i.name)}${i.options.length ? `<br><small>${i.options.map((x) => tl(x)).join(', ')}</small>` : ''}</td><td style="text-align:right">${m(i.unitPrice * i.qty)}</td></tr>`).join('');
  w.document.write(`<!doctype html><html><head><title>#${o.number}</title><style>body{font-family:ui-monospace,monospace;width:280px;margin:8px auto;font-size:13px}h1{font-size:18px;text-align:center;margin:4px 0}table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}hr{border:0;border-top:1px dashed #000}.c{text-align:center}</style></head><body><h1>${tl(cfg.business.name)}</h1><div class="c">#${o.number} · ${new Date(o.createdAt).toLocaleString()}</div><div class="c"><b>${o.fulfillment.toUpperCase()}${o.table ? ' · TABLE ' + o.table : ''}</b></div><div class="c">${o.customerName}</div><hr><table>${rows}</table><hr><table><tr><td>Subtotal</td><td style="text-align:right">${m(o.subtotal)}</td></tr>${o.discount ? `<tr><td>Discount</td><td style="text-align:right">-${m(o.discount)}</td></tr>` : ''}${o.deliveryFee ? `<tr><td>Delivery</td><td style="text-align:right">${m(o.deliveryFee)}</td></tr>` : ''}${o.tip ? `<tr><td>Tip</td><td style="text-align:right">${m(o.tip)}</td></tr>` : ''}<tr><td><b>TOTAL</b></td><td style="text-align:right"><b>${m(o.total)}</b></td></tr></table><hr><div class="c">${o.paid ? 'PAID' : 'TO COLLECT'} · ${o.payment}</div>${o.note ? `<p>Note: ${o.note}</p>` : ''}<script>setTimeout(()=>print(),300)</script></body></html>`);
  w.document.close();
}

export function OrderTicket({ o, compact }: { o: Order; compact?: boolean }) {
  const { demo, cfg, tr, tl, m, lang, update, terms, data } = useDemo();
  const [rejecting, setRejecting] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const suggested = o.fulfillment === 'delivery' ? suggestRider(demo, o.branchId) : undefined;
  const nx = nextStatus(o);
  const isMe = o.customerId === data.meId;
  const actionLabel: Partial<Record<OrderStatus, string>> = {
    accepted: tr('Accept', 'قبول'),
    preparing: cfg.industry === 'retail' ? tr('Start packing', 'ابدأ التجهيز') : tr('Start preparing', 'ابدأ التحضير'),
    ready: tr('Mark ready', 'جاهز'),
    outForDelivery: cfg.industry === 'retail' ? tr('Mark shipped', 'تم الشحن') : tr('Out for delivery', 'خرج للتوصيل'),
    completed: o.fulfillment === 'delivery' ? tr('Delivered', 'تم التسليم') : tr('Complete', 'إتمام'),
  };
  const fIcon = { delivery: <Truck size={14} />, pickup: <Store size={14} />, dineIn: <UtensilsCrossed size={14} /> }[o.fulfillment];
  const fText = { delivery: tl(terms.delivery), pickup: tr('Pickup', 'استلام'), dineIn: tr(`Table ${o.table}`, `طاولة ${o.table}`) }[o.fulfillment];
  return (
    <Card className={cx('p-3.5', o.status === 'pending' && 'ring-2 ring-amber-400 animate-[up_.25s_ease]')}>
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-lg">#{o.number}</span>
        <Badge className={statusTone[o.status]}>{tl(statusLabel(o.status, cfg.industry, o.fulfillment))}</Badge>
        <span className="ms-auto text-xs text-gray-400">{timeAgo(o.createdAt, lang)}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1.5">
        {fIcon}<span>{fText}</span><span>·</span><span className="font-medium">{o.customerName}{isMe && ' ⭐'}</span>
        {cfg.branches.length > 1 && <span className="ms-auto text-gray-400">{tl(cfg.branches.find((b) => b.id === o.branchId)?.name)}</span>}
      </div>
      {!compact && (
        <ul className="mt-2.5 space-y-1 text-sm">
          {o.items.map((i, k) => (
            <li key={k}>
              <span className="font-bold">{i.qty}×</span> {tl(i.name)}
              {i.options.length > 0 && <span className="block text-xs text-gray-500 ps-5">{i.options.map((x) => tl(x)).join(', ')}</span>}
            </li>
          ))}
        </ul>
      )}
      {o.note && <div className="mt-2 text-xs bg-amber-50 text-amber-900 rounded-lg px-2 py-1.5">📝 {o.note}</div>}
      {o.address && !compact && <div className="mt-1.5 text-xs text-gray-500">📍 {o.address}</div>}
      <div className="flex items-center justify-between mt-3">
        <span className="font-bold tabular-nums">{m(o.total)}{o.tip > 0 && <span className="ms-1.5 text-xs font-normal text-emerald-700">{tr(`incl. ${m(o.tip)} tip`, `منها ${m(o.tip)} إكرامية`)}</span>}</span>
        <button onClick={() => printTicket(o, cfg, tl, m)} className="ms-auto me-2 h-8 w-8 grid place-items-center rounded-full hover:bg-gray-100 text-gray-500" title="Print"><Printer size={15} /></button>
        {o.paid ? <Badge className="bg-emerald-100 text-emerald-800">{tr('Paid', 'مدفوع')}</Badge> : <Badge className="bg-amber-100 text-amber-800"><Banknote size={12} /> {tr('Collect', 'تحصيل')}</Badge>}
      </div>
      {o.riderId && o.status === 'outForDelivery' && (
        <div className="mt-2 text-xs flex items-center gap-1.5 text-cyan-800"><Bike size={13} /> {data.riders.find((r) => r.id === o.riderId)?.name} {o.payment === 'cash' && (o.collected ? tr('· cash collected', '· تم استلام النقود') : tr('· to collect', '· للتحصيل'))}</div>
      )}
      {!o.paid && o.payment === 'cash' && o.fulfillment !== 'delivery' && <ChangeCalc total={o.total} />}
      {nx && o.status !== 'cancelled' && (
        <div className="flex gap-2 mt-3">
          {o.status === 'pending' && (
            <Button size="sm" variant="outline" className="!text-rose-600" icon={<X size={15} />} onClick={() => setRejecting(true)}>{tr('Reject', 'رفض')}</Button>
          )}
          {nx === 'outForDelivery' && o.fulfillment === 'delivery' ? (
            <Button size="sm" block icon={<Bike size={15} />} onClick={() => setDispatching(true)}>{tr('Send rider', 'أرسل سائقاً')}</Button>
          ) : (
            <Button size="sm" block icon={<Check size={15} />} onClick={() => {
              update((d) => setOrderStatus(d, o.id, nx));
              if (nx === 'completed' && isMe && (cfg.modules.loyaltyPoints || cfg.modules.loyaltyStamps)) toast(tr('Done — loyalty points sent to the customer', 'تم — أُرسلت نقاط الولاء للزبون'));
            }}>{actionLabel[nx]}</Button>
          )}
        </div>
      )}
      <Modal open={rejecting} onClose={() => setRejecting(false)} title={tr(`Reject #${o.number}: why?`, `رفض #${o.number}: لماذا؟`)} size="sm">
        <p className="text-sm text-gray-500 mb-3">{tr('The reason is saved, so the owner sees why orders are lost.', 'يُحفظ السبب ليرى المالك لماذا تضيع الطلبات.')}</p>
        <div className="grid gap-2">
          {(Object.keys(LOST_REASONS) as LostReason[]).filter((k) => k !== 'customer').map((k) => (
            <Button key={k} variant="outline" onClick={() => { update((d) => rejectOrder(d, o.id, k)); setRejecting(false); }}>{tl(LOST_REASONS[k])}</Button>
          ))}
        </div>
      </Modal>
      <Modal open={dispatching} onClose={() => setDispatching(false)} title={tr(`Send #${o.number} with…`, `أرسل #${o.number} مع…`)} size="sm">
        <div className="space-y-2">
          {data.riders.filter((r) => r.active).map((r) => {
            const busy = riderActive(demo, r.id).length;
            const best = suggested?.id === r.id;
            return (
              <button key={r.id} disabled={!r.onShift} onClick={() => { update((d) => assignRider(d, o.id, r.id)); setDispatching(false); toast(tr(`${r.name} is on the way`, `${r.name} في الطريق`)); }}
                className={cx('w-full flex items-center gap-3 rounded-app border p-3 text-start disabled:opacity-40', best ? 'border-brand bg-brand/5' : 'border-gray-200')}>
                <span className="h-10 w-10 rounded-full bg-brand text-onbrand grid place-items-center font-bold">{r.name[0]}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{r.name} {best && <Badge className="bg-emerald-100 text-emerald-800 ms-1">{tr('Suggested', 'مقترح')}</Badge>}</span>
                  <span className="block text-xs text-gray-500">{!r.onShift ? tr('Off shift', 'خارج المناوبة') : busy ? tr(`${busy} on the way`, `${busy} في الطريق`) : tr('Free now', 'متاح الآن')}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Modal>
    </Card>
  );
}

/** Cash at the counter: type what the customer hands over, see the change. */
function ChangeCalc({ total }: { total: number }) {
  const { demo, cfg, tr, m } = useDemo();
  const [open, setOpen] = useState(false);
  const [given, setGiven] = useState('');
  const g = parseFloat(given) || 0;
  const lbp = dualPrice(demo, total);
  if (!open) return <button onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-600"><Calculator size={13} /> {tr('Change calculator', 'حاسبة الباقي')}</button>;
  return (
    <div className="mt-2 rounded-lg bg-gray-50 p-2.5 text-sm">
      <div className="flex items-center justify-between"><span>{tr('To pay', 'المطلوب')}</span><b>{m(total)}{lbp ? ` · ${lbp.toLocaleString()} ${cfg.dual.currency}` : ''}</b></div>
      <div className="flex gap-1.5 mt-2">
        {[total, 20, 50, 100].filter((v, i, a) => a.indexOf(v) === i && v >= total).map((v) => <button key={v} onClick={() => setGiven(String(v))} className="flex-1 rounded-md bg-white border px-2 py-1 text-xs font-semibold">{m(v)}</button>)}
      </div>
      <Input type="number" value={given} onChange={(e) => setGiven(e.target.value)} placeholder={tr('Cash received', 'المبلغ المستلم')} className="!h-9 mt-2" />
      {g >= total && <div className="mt-1.5 font-bold text-emerald-700">{tr('Change to give', 'الباقي')}: {m(Math.round((g - total) * 100) / 100)}</div>}
    </div>
  );
}

/** One tap to mark a dish sold out at this branch for today. */
function SoldOut() {
  const { data, cfg, tr, tl, update } = useDemo();
  const [branch, setBranch] = useState(cfg.branches[0]?.id ?? '');
  const [q, setQ] = useState('');
  const list = data.products.filter((p) => p.active && (!q || tl(p.name).toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-wrap gap-2 mb-3">
        {cfg.branches.length > 1 && (
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="h-10 rounded-app border border-gray-200 bg-white px-3 text-sm">
            {cfg.branches.map((b) => <option key={b.id} value={b.id}>{tl(b.name)}</option>)}
          </select>
        )}
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Search', 'ابحث')} className="!h-10 flex-1" />
      </div>
      <Card className="divide-y divide-gray-100">
        {list.map((p) => {
          const out = !productAvailable(p, branch);
          return (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <Thumb emoji={p.emoji} image={p.image} bg={p.bg} size="sm" className="!h-10 !w-10 !text-xl" />
              <span className={cx('flex-1 font-medium', out && 'text-gray-400 line-through')}>{tl(p.name)}</span>
              <span className={cx('text-xs font-semibold', out ? 'text-rose-600' : 'text-emerald-700')}>{out ? tr('Sold out', 'نفد') : tr('Available', 'متوفر')}</span>
              <Toggle checked={!out} onChange={(v) => update((d) => {
                const x = d.data.products.find((y) => y.id === p.id)!;
                x.soldOutAt = v ? (x.soldOutAt ?? []).filter((b) => b !== branch) : [...(x.soldOutAt ?? []), branch];
              })} />
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function AwardPoints() {
  const { demo, cfg, data, tr, tl, update, id, m } = useDemo();
  const [mode, setMode] = useState<'qr' | 'customer'>('qr');
  const [amount, setAmount] = useState('');
  const [stamps, setStamps] = useState(cfg.modules.loyaltyStamps ? 1 : 0);
  const [token, setToken] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const pts = pointsFor(demo, parseFloat(amount) || 0);
  const TTL = 90;

  useEffect(() => {
    if (!token) return;
    const end = Date.now() + TTL * 1000;
    setLeft(TTL);
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [token]);

  const generate = () => {
    if (!pts && !stamps) return toast(tr('Enter the amount spent', 'أدخل المبلغ المدفوع'), 'error');
    setToken(makeToken(demo, pts, stamps, TTL));
  };

  const customers = data.customers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))).slice(0, 8);

  return (
    <div className="max-w-xl mx-auto">
      <Segmented value={mode} onChange={(v) => { setMode(v); setToken(null); }} options={[{ value: 'qr', label: tr('Show QR to customer', 'اعرض QR للزبون') }, { value: 'customer', label: tr('Find customer', 'ابحث عن زبون') }]} />
      <Card className="p-5 mt-4">
        {cfg.modules.loyaltyPoints && (
          <>
            <div className="text-sm font-semibold text-gray-600">{tr(`Amount spent (${cfg.business.currency})`, `المبلغ المدفوع (${cfg.business.currency})`)}</div>
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setToken(null); }} placeholder="0.00" className="!h-16 !text-3xl font-extrabold text-center mt-2" />
            <div className="flex gap-2 mt-2">
              {[5, 10, 20, 50].map((v) => <button key={v} onClick={() => { setAmount(String(v)); setToken(null); }} className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-semibold">{m(v)}</button>)}
            </div>
            <div className="text-center mt-3 text-lg">= <b className="text-brand">{pts}</b> {tr('points', 'نقطة')} <span className="text-xs text-gray-400">({cfg.loyalty.pointsPerUnit}/{cfg.business.currency})</span></div>
          </>
        )}
        {cfg.modules.loyaltyStamps && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <span className="font-semibold">{tr('Stamps', 'الأختام')}</span>
            <Stepper value={stamps} onChange={(v) => { setStamps(v); setToken(null); }} min={0} max={10} />
          </div>
        )}
      </Card>

      {mode === 'qr' ? (
        token ? (
          <Card className="p-5 mt-4 text-center">
            <div className="inline-block rounded-2xl border-2 border-gray-100 p-3 bg-white relative">
              <QRCode value={claimUrl(id, token)} size={230} className={cx(left === 0 && 'opacity-10')} />
              {left === 0 && <div className="absolute inset-0 grid place-items-center font-bold text-rose-600">{tr('Expired', 'انتهت الصلاحية')}</div>}
            </div>
            <div className="mt-2 font-semibold">{tr('Customer scans with the app', 'يمسحه الزبون بالتطبيق')}</div>
            <div className="text-sm text-gray-500">{left > 0 ? tr(`Single-use · expires in ${left}s`, `لمرة واحدة · تنتهي خلال ${left} ث`) : ''}</div>
            <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden"><div className="h-full bg-brand transition-all" style={{ width: `${(left / TTL) * 100}%` }} /></div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" icon={<RefreshCw size={16} />} onClick={generate}>{tr('New code', 'رمز جديد')}</Button>
              <Button icon={<Smartphone size={16} />} disabled={left === 0} onClick={() => {
                let res: ReturnType<typeof claimToken> = { ok: false };
                update((d) => void (res = claimToken(d, token)));
                if (res.ok) { toast(tr(`Demo customer received ${res.points} points ✨`, `حصل زبون التجربة على ${res.points} نقطة ✨`)); setToken(null); setAmount(''); }
                else toast(tl(res.error), 'error');
              }}>{tr('Simulate customer scan', 'محاكاة مسح الزبون')}</Button>
            </div>
          </Card>
        ) : (
          <Button block size="lg" className="mt-4" icon={<QrCode size={20} />} onClick={generate}>{tr('Generate QR code', 'أنشئ رمز QR')}</Button>
        )
      ) : (
        <Card className="p-4 mt-4">
          <div className="relative">
            <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Name or phone', 'الاسم أو الهاتف')} className="ps-10" />
          </div>
          <div className="mt-3 divide-y divide-gray-100">
            {customers.map((c) => (
              <button key={c.id} onClick={() => setPicked(c.id)} className={cx('w-full flex items-center gap-3 py-2.5 px-2 rounded-lg text-start', picked === c.id && 'bg-brand/5')}>
                <span className="h-9 w-9 rounded-full bg-gray-100 grid place-items-center font-bold">{c.name[0]}</span>
                <span className="flex-1"><span className="block font-medium">{c.name}{c.id === data.meId && ' ⭐'}</span><span className="block text-xs text-gray-500" dir="ltr">{c.phone}</span></span>
                <span className="text-sm font-semibold">{c.points} {tr('pts', 'ن')}</span>
              </button>
            ))}
          </div>
          <Button block className="mt-3" disabled={!picked || (!pts && !stamps)} onClick={() => {
            update((d) => {
              addLedger(d, picked!, pts, stamps, 'manual', 'Awarded by staff');
              if (picked === d.data.meId) d.data.notices.unshift({ id: 'n' + Date.now(), kind: 'loyalty', at: Date.now(), read: false, title: { en: 'Points added ✨', ar: 'تمت إضافة النقاط ✨' }, body: { en: `+${pts} points from the store`, ar: `+${pts} نقطة من المتجر` }, link: 'rewards' });
              d.data.tour.claimQr = true;
            });
            toast(tr('Points awarded', 'تم منح النقاط'));
            setAmount('');
            setPicked(null);
          }}>{tr(`Award ${pts} points`, `امنح ${pts} نقطة`)}{stamps ? ` + ${stamps}★` : ''}</Button>
        </Card>
      )}
    </div>
  );
}

function ScanVoucher() {
  const { demo, data, tr, tl, update, lang } = useDemo();
  const [code, setCode] = useState<string | null>(null);
  const v = code ? findVoucher(demo, code) : undefined;
  const active = data.vouchers.filter((x) => x.status === 'active').slice(0, 6);
  const owner = v && data.customers.find((c) => c.id === v.customerId);

  return (
    <div className="max-w-xl mx-auto">
      {!code ? (
        <>
          <Card className="p-4">
            <div className="font-bold mb-3">{tr('Scan the customer’s reward voucher', 'امسح قسيمة مكافأة الزبون')}</div>
            <Scanner onResult={(r) => {
              const s = parseScan(r);
              if (s.type === 'voucher') setCode(s.value);
              else toast(tr('That is not a voucher code', 'هذا ليس رمز قسيمة'), 'error');
            }} placeholder="RW-XXXXX" />
          </Card>
          {active.length > 0 && (
            <Card className="p-4 mt-4">
              <div className="text-sm font-semibold text-gray-600 mb-2">{tr('Active vouchers (demo shortcut)', 'قسائم فعّالة (اختصار التجربة)')}</div>
              <div className="flex flex-wrap gap-2">
                {active.map((x) => <button key={x.id} onClick={() => setCode(x.code)} className="rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-sm font-bold" dir="ltr">{x.emoji} {x.code}</button>)}
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-6 text-center">
          {!v ? (
            <Empty icon="❌" title={tr('Voucher not found', 'القسيمة غير موجودة')} />
          ) : (
            <>
              <div className="text-6xl">{v.emoji}</div>
              <div className="text-2xl font-extrabold mt-3">{tl(v.name)}</div>
              <div className="font-mono text-gray-500 mt-1" dir="ltr">{v.code}</div>
              <div className="text-sm mt-1">{owner?.name}</div>
              {v.status === 'used' ? (
                <div className="mt-5 rounded-xl bg-rose-50 text-rose-700 font-semibold py-3">{tr('Already used', 'مستخدمة مسبقاً')} · {v.usedAt && fmtDate(v.usedAt, lang, { dateStyle: 'short', timeStyle: 'short' })}</div>
              ) : (
                <Button block size="lg" className="mt-5" icon={<Check size={20} />} onClick={() => {
                  update((d) => void useVoucher(d, v.code));
                  toast(tr('Voucher redeemed ✅', 'تم استخدام القسيمة ✅'));
                }}>{tr('Confirm & mark as used', 'تأكيد وتعليمها كمستخدمة')}</Button>
              )}
            </>
          )}
          <Button variant="ghost" className="mt-3" onClick={() => setCode(null)}>{tr('Scan another', 'امسح أخرى')}</Button>
        </Card>
      )}
    </div>
  );
}

export function Bookings() {
  const { data, tr, lang, update, terms, tl } = useDemo();
  const today = ymd(new Date());
  const list = data.reservations.filter((r) => r.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const groups = list.reduce<Record<string, typeof list>>((acc, r) => ((acc[r.date] ||= []).push(r), acc), {});
  if (!list.length) return <Empty icon="📅" title={tr('No upcoming bookings', 'لا حجوزات قادمة')} />;
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {Object.entries(groups).map(([date, rs]) => (
        <div key={date}>
          <div className="font-bold mb-2">{date === today ? tr('Today', 'اليوم') : fmtDate(date, lang, { weekday: 'long', day: 'numeric', month: 'short' })}</div>
          <div className="space-y-2">
            {rs.map((r) => (
              <Card key={r.id} className="p-3.5 flex flex-wrap items-center gap-3">
                <div className="text-xl font-extrabold w-16 tabular-nums" dir="ltr">{r.time}</div>
                <div className="flex-1 min-w-[140px]">
                  <div className="font-semibold">{r.name}{r.customerId === data.meId && ' ⭐'}</div>
                  <div className="text-xs text-gray-500">{r.party} {tl(terms.party).toLowerCase()} · <span dir="ltr">{r.phone}</span>{r.note && ` · ${r.note}`}</div>
                </div>
                <Badge className={resTone[r.status]}>{resLabel(r.status, tr)}</Badge>
                <div className="flex gap-1.5">
                  {r.status === 'pending' && <Button size="sm" onClick={() => update((d) => setReservationStatus(d, r.id, 'confirmed'))}>{tr('Confirm', 'تأكيد')}</Button>}
                  {r.status === 'confirmed' && <Button size="sm" variant="outline" onClick={() => update((d) => setReservationStatus(d, r.id, 'seated'))}>{tr('Arrived', 'وصل')}</Button>}
                  {r.status === 'seated' && <Button size="sm" variant="outline" onClick={() => update((d) => setReservationStatus(d, r.id, 'completed'))}>{tr('Done', 'تم')}</Button>}
                  {['pending', 'confirmed'].includes(r.status) && <Button size="sm" variant="ghost" className="!text-rose-600" onClick={() => update((d) => setReservationStatus(d, r.id, r.status === 'confirmed' ? 'noShow' : 'cancelled'))}>{r.status === 'confirmed' ? tr('No-show', 'لم يحضر') : tr('Decline', 'رفض')}</Button>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
