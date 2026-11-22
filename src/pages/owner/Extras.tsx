import { useState } from 'react';
import QRCodeLib from 'qrcode';
import { Star, Printer, Plus, Trash2, PauseCircle, MessageSquare } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { track } from '../../lib/ops';
import type { Demo } from '../../lib/types';
import { timeAgo, uid } from '../../lib/utils';
import { Button, Card, Field, Input, Stat, Toggle, cx } from '../../components/ui';
import { PageHead } from './OwnerApp';

export function Reviews() {
  const { data, tr, tl, lang, update } = useDemo();
  const [filter, setFilter] = useState(0);
  const [reply, setReply] = useState<Record<string, string>>({});
  const rated = data.orders.filter((o) => o.rating);
  const avg = rated.length ? rated.reduce((s, o) => s + o.rating!, 0) / rated.length : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: rated.filter((o) => o.rating === n).length }));
  const list = rated.filter((o) => !filter || o.rating === filter).slice(0, 60);
  return (
    <>
      <PageHead title={tr('Ratings & reviews', 'التقييمات والمراجعات')} sub={tr('Customers rate every completed order. Reply to show you care.', 'يقيّم الزبائن كل طلب مكتمل. ردّ عليهم لتُظهر اهتمامك.')} />
      <div className="grid lg:grid-cols-[300px_1fr] gap-4">
        <Card className="p-5 h-fit">
          <div className="text-5xl font-extrabold">{avg.toFixed(1)}</div>
          <div className="flex gap-0.5 mt-1">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={18} className={i <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />)}</div>
          <div className="text-sm text-gray-500 mt-1">{tr(`${rated.length} ratings`, `${rated.length} تقييم`)}</div>
          <div className="mt-4 space-y-1.5">
            {dist.map((d) => (
              <button key={d.n} onClick={() => setFilter(filter === d.n ? 0 : d.n)} className={cx('w-full flex items-center gap-2 text-sm rounded-lg px-1', filter === d.n && 'bg-gray-100')}>
                <span className="w-3">{d.n}</span><Star size={12} className="fill-amber-400 text-amber-400" />
                <span className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden"><span className="block h-full bg-amber-400" style={{ width: `${rated.length ? (d.c / rated.length) * 100 : 0}%` }} /></span>
                <span className="w-6 text-end text-gray-500">{d.c}</span>
              </button>
            ))}
          </div>
        </Card>
        <div className="space-y-3">
          {list.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{o.customerName}</span>
                <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} className={i <= o.rating! ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />)}</span>
                <span className="ms-auto text-xs text-gray-400">#{o.number} · {timeAgo(o.updatedAt, lang)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{o.items.map((i) => tl(i.name)).join(', ')}</div>
              {o.review ? <p className="mt-2">“{o.review}”</p> : <p className="mt-2 text-sm text-gray-400">{tr('No comment', 'بدون تعليق')}</p>}
              {o.reply ? (
                <div className="mt-2 rounded-lg bg-gray-50 p-2.5 text-sm"><b>{tr('Your reply', 'ردّك')}:</b> {o.reply}</div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Input value={reply[o.id] ?? ''} onChange={(e) => setReply({ ...reply, [o.id]: e.target.value })} placeholder={tr('Write a reply…', 'اكتب رداً…')} className="!h-9" />
                  <Button size="sm" icon={<MessageSquare size={14} />} disabled={!reply[o.id]?.trim()} onClick={() => {
                    update((d) => {
                      const x = d.data.orders.find((y) => y.id === o.id)!;
                      x.reply = reply[o.id].trim();
                      track(d, 'editSettings');
                    });
                    toast(tr('Reply sent', 'تم إرسال الرد'));
                  }}>{tr('Reply', 'رد')}</Button>
                </div>
              )}
            </Card>
          ))}
          {!list.length && <Card className="p-10 text-center text-gray-400">{tr('No reviews yet', 'لا مراجعات بعد')}</Card>}
        </div>
      </div>
    </>
  );
}

export function WalletAdmin() {
  const { cfg, data, tr, m, update } = useDemo();
  const balances = data.customers.reduce((s, c) => s + (c.wallet || 0), 0);
  const topups = data.walletTx.filter((t) => t.kind === 'topup').reduce((s, t) => s + t.amount, 0);
  const sold = data.giftCards.reduce((s, g) => s + g.amount, 0);
  const holders = data.customers.filter((c) => c.wallet > 0).length;
  const set = (fn: (d: Demo) => void) => update((d) => { fn(d); track(d, 'editSettings'); });
  return (
    <>
      <PageHead title={tr('Wallet & gift cards', 'المحفظة وبطاقات الهدايا')} sub={tr('Customers pre-pay into their app wallet — money in your account before they order.', 'يدفع الزبائن مسبقاً في محفظة التطبيق — المال في حسابك قبل أن يطلبوا.')} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={tr('Wallet balances', 'أرصدة المحافظ')} value={m(Math.round(balances))} sub={tr(`${holders} customers`, `${holders} زبون`)} />
        <Stat label={tr('Top-ups', 'عمليات الشحن')} value={m(Math.round(topups))} />
        <Stat label={tr('Gift cards sold', 'بطاقات الهدايا المباعة')} value={m(sold)} sub={tr(`${data.giftCards.length} cards`, `${data.giftCards.length} بطاقة`)} />
        <Stat label={tr('Redeemed', 'المستردة')} value={data.giftCards.filter((g) => g.redeemedBy).length} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-5 space-y-3">
          <div className="font-bold">{tr('Top-up options', 'خيارات الشحن')}</div>
          <Field label={tr('Amounts (comma separated)', 'المبالغ (مفصولة بفواصل)')}>
            <Input defaultValue={cfg.wallet.topUps.join(', ')} onBlur={(e) => {
              const v = e.target.value.split(',').map((x) => parseFloat(x)).filter((x) => x > 0).slice(0, 4);
              if (v.length) set((d) => void (d.config.wallet.topUps = v));
            }} />
          </Field>
          <Field label={tr('Bonus on top-ups (%)', 'مكافأة الشحن (%)')} hint={tr('e.g. top up 50, get 55', 'مثلاً: اشحن 50 واحصل على 55')}>
            <Input type="number" value={cfg.wallet.bonusPercent} onChange={(e) => set((d) => void (d.config.wallet.bonusPercent = Math.max(0, +e.target.value)))} className="!w-28" />
          </Field>
          <Toggle checked={cfg.payments.wallet} onChange={(v) => set((d) => void (d.config.payments.wallet = v))} label={tr('Accept wallet at checkout', 'قبول المحفظة عند الدفع')} />
        </Card>
        <Card className="p-5">
          <div className="font-bold mb-2">{tr('Recent gift cards', 'أحدث بطاقات الهدايا')}</div>
          {data.giftCards.length === 0 && <div className="text-sm text-gray-400">{tr('None yet — buy one in the customer app.', 'لا شيء بعد — اشترِ واحدة من تطبيق الزبون.')}</div>}
          <div className="divide-y divide-gray-100">
            {data.giftCards.slice(0, 8).map((g) => (
              <div key={g.code} className="flex items-center gap-3 py-2 text-sm">
                <span className="font-mono font-semibold" dir="ltr">{g.code}</span>
                <span className="flex-1 text-gray-500 truncate">{g.fromName} → {g.toName}</span>
                <span className="font-bold">{m(g.amount)}</span>
                <span className={cx('text-xs rounded-full px-2 py-0.5', g.redeemedBy ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-800')}>{g.redeemedBy ? tr('Redeemed', 'مستردة') : tr('Active', 'فعّالة')}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

const DAYS = [
  { en: 'Sun', ar: 'أحد' }, { en: 'Mon', ar: 'إثنين' }, { en: 'Tue', ar: 'ثلاثاء' }, { en: 'Wed', ar: 'أربعاء' },
  { en: 'Thu', ar: 'خميس' }, { en: 'Fri', ar: 'جمعة' }, { en: 'Sat', ar: 'سبت' },
];

/** Opening days, pause orders and busy mode. */
export function HoursCard() {
  const { cfg, tr, tl, update } = useDemo();
  const b = cfg.business;
  const set = (fn: (d: Demo) => void) => update((d) => { fn(d); track(d, 'editSettings'); });
  return (
    <Card className="p-5 space-y-3">
      <div className="font-bold">{tr('Opening hours & availability', 'ساعات العمل والتوفر')}</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={tr('Opens', 'يفتح')}><Input type="time" value={b.openTime} onChange={(e) => set((d) => void (d.config.business.openTime = e.target.value))} /></Field>
        <Field label={tr('Closes', 'يغلق')}><Input type="time" value={b.closeTime} onChange={(e) => set((d) => void (d.config.business.closeTime = e.target.value))} /></Field>
      </div>
      <div>
        <div className="text-sm font-medium text-gray-700 mb-1.5">{tr('Open on', 'مفتوح في')}</div>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d, i) => {
            const open = !b.closedDays.includes(i);
            return <button key={i} onClick={() => set((x) => void (x.config.business.closedDays = open ? [...b.closedDays, i] : b.closedDays.filter((y) => y !== i)))}
              className={cx('rounded-full px-3 py-1.5 text-sm font-semibold border', open ? 'bg-brand text-onbrand border-brand' : 'bg-white border-gray-200 text-gray-400 line-through')}>{tl(d)}</button>;
          })}
        </div>
      </div>
      <div className="pt-3 border-t border-gray-100 space-y-3">
        <Toggle checked={b.ordersPaused} onChange={(v) => set((d) => void (d.config.business.ordersPaused = v))}
          label={<span className="flex items-center gap-1.5"><PauseCircle size={16} className="text-rose-600" />{tr('Pause online orders', 'إيقاف الطلبات مؤقتاً')}</span>}
          desc={tr('For rush hours or when the kitchen is full', 'لأوقات الذروة أو عند امتلاء المطبخ')} />
        <Field label={tr('Busy mode: extra minutes on every order', 'وضع الضغط: دقائق إضافية لكل طلب')}>
          <div className="flex gap-1.5">
            {[0, 10, 20, 30, 45].map((v) => <button key={v} onClick={() => set((d) => void (d.config.business.busyExtraMinutes = v))}
              className={cx('flex-1 rounded-lg border py-2 text-sm font-semibold', b.busyExtraMinutes === v ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200')}>{v ? `+${v}` : tr('Off', 'لا')}</button>)}
          </div>
        </Field>
      </div>
    </Card>
  );
}

export function BranchesCard() {
  const { cfg, tr, update } = useDemo();
  const set = (fn: (d: Demo) => void) => update((d) => { fn(d); track(d, 'editSettings'); });
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-bold">{tr('Branches', 'الفروع')}</div>
        <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => set((d) => void d.config.branches.push({ id: 'br' + uid(), name: { en: 'New branch', ar: 'فرع جديد' }, address: '', phone: d.config.business.phone }))}>{tr('Add', 'إضافة')}</Button>
      </div>
      <p className="text-sm text-gray-500 -mt-1">{tr('With 2+ branches, customers pick their branch and orders are tagged by branch.', 'مع فرعين أو أكثر، يختار الزبائن فرعهم وتُصنّف الطلبات حسب الفرع.')}</p>
      {cfg.branches.map((br, i) => (
        <div key={br.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input value={br.name.en} onChange={(e) => set((d) => void (d.config.branches[i].name.en = e.target.value))} className="!h-9" />
          <Input dir="rtl" value={br.name.ar ?? ''} onChange={(e) => set((d) => void (d.config.branches[i].name.ar = e.target.value))} className="!h-9" />
          <button disabled={cfg.branches.length <= 1} className="text-rose-600 disabled:text-gray-300" onClick={() => set((d) => void (d.config.branches = d.config.branches.filter((x) => x.id !== br.id)))}><Trash2 size={16} /></button>
          <Input value={br.address} placeholder={tr('Address', 'العنوان')} onChange={(e) => set((d) => void (d.config.branches[i].address = e.target.value))} className="!h-9 col-span-2" />
        </div>
      ))}
    </Card>
  );
}

export function TableQrCard() {
  const { cfg, id, tr, tl } = useDemo();
  const [n, setN] = useState(12);
  const print = async () => {
    const base = `${location.origin}${location.pathname}#/d/${id}/app/table/`;
    const imgs = await Promise.all(Array.from({ length: n }, (_, i) => QRCodeLib.toDataURL(base + (i + 1), { width: 360, margin: 1 })));
    const w = window.open('', '_blank');
    if (!w) return toast(tr('Allow pop-ups to print', 'اسمح بالنوافذ المنبثقة للطباعة'), 'error');
    w.document.write(`<!doctype html><html><head><title>Table QR codes</title><style>body{font-family:system-ui;margin:0}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px}.c{border:2px dashed #ccc;border-radius:16px;padding:14px;text-align:center;break-inside:avoid}.c img{width:160px}.t{font-size:30px;font-weight:800;color:${cfg.brand.primary}}.n{font-weight:700}</style></head><body><div class="g">${imgs.map((src, i) => `<div class="c"><div class="n">${cfg.business.logoEmoji} ${tl(cfg.business.name)}</div><img src="${src}"/><div class="t">${i + 1}</div><div>Scan to order · امسح للطلب</div></div>`).join('')}</div><script>setTimeout(()=>print(),400)</script></body></html>`);
    w.document.close();
  };
  return (
    <Card className="p-5 space-y-3">
      <div className="font-bold">{tr('Table QR codes', 'رموز QR للطاولات')}</div>
      <p className="text-sm text-gray-500 -mt-1">{tr('Guests scan the code on their table, order and pay — the order arrives with the table number.', 'يمسح الضيوف الرمز على طاولتهم ويطلبون ويدفعون — يصل الطلب مع رقم الطاولة.')}</p>
      <div className="flex items-center gap-2">
        <Input type="number" min={1} max={60} value={n} onChange={(e) => setN(Math.min(60, Math.max(1, +e.target.value)))} className="!w-24" />
        <span className="text-sm text-gray-500">{tr('tables', 'طاولة')}</span>
        <Button className="ms-auto" icon={<Printer size={16} />} onClick={print}>{tr('Print QR sheet', 'اطبع رموز QR')}</Button>
      </div>
      <a href={`#/d/${id}/app/table/5`} className="text-sm text-brand underline">{tr('Try it: open as table 5', 'جرّب: افتح كطاولة 5')}</a>
    </Card>
  );
}
