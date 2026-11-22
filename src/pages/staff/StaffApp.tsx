import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { ClipboardList, QrCode, ScanLine, CalendarDays, Truck, Store, UtensilsCrossed, Banknote, Check, X, RefreshCw, Smartphone, Search } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { addLedger, claimToken, claimUrl, findVoucher, makeToken, nextStatus, parseScan, pointsFor, setOrderStatus, setReservationStatus, statusLabel, statusTone, useVoucher } from '../../lib/ops';
import type { Order, OrderStatus } from '../../lib/types';
import { fmtDate, timeAgo, ymd } from '../../lib/utils';
import { Badge, Button, Card, Empty, Input, Segmented, Stepper, cx } from '../../components/ui';
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

  const titles = { new: tr('New', 'جديدة'), progress: tr('In progress', 'قيد التنفيذ'), ready: tr('Ready / out', 'جاهزة / بالطريق'), done: tr('Done today', 'أُنجزت اليوم') };
  const keys = Object.keys(titles) as (keyof typeof titles)[];
  return (
    <>
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

export function OrderTicket({ o, compact }: { o: Order; compact?: boolean }) {
  const { cfg, tr, tl, m, lang, update, terms, data } = useDemo();
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
        <span className="font-bold tabular-nums">{m(o.total)}</span>
        {o.paid ? <Badge className="bg-emerald-100 text-emerald-800">{tr('Paid', 'مدفوع')}</Badge> : <Badge className="bg-amber-100 text-amber-800"><Banknote size={12} /> {tr('Collect', 'تحصيل')}</Badge>}
      </div>
      {nx && o.status !== 'cancelled' && (
        <div className="flex gap-2 mt-3">
          {o.status === 'pending' && (
            <Button size="sm" variant="outline" className="!text-rose-600" icon={<X size={15} />} onClick={() => update((d) => setOrderStatus(d, o.id, 'cancelled'))}>{tr('Reject', 'رفض')}</Button>
          )}
          <Button size="sm" block icon={<Check size={15} />} onClick={() => {
            update((d) => setOrderStatus(d, o.id, nx));
            if (nx === 'completed' && isMe && (cfg.modules.loyaltyPoints || cfg.modules.loyaltyStamps)) toast(tr('Done — loyalty points sent to the customer', 'تم — أُرسلت نقاط الولاء للزبون'));
          }}>{actionLabel[nx]}</Button>
        </div>
      )}
    </Card>
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
