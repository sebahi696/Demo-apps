import { useState } from 'react';
import { Bike, Plus, Banknote, Trash2, MessageCircle } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { dailyClose, riderActive, riderHolding, settleRider, LOST_REASONS } from '../../lib/ops';
import type { LostReason } from '../../lib/types';
import { fmtDate, fmtTime, timeAgo, uid } from '../../lib/utils';
import { Badge, Button, Card, Input, Modal, Stat, Toggle, cx } from '../../components/ui';
import { LiveMap } from '../../components/LiveMap';
import { PageHead } from './OwnerApp';

/** Riders on the map, the cash each one holds, and the end-of-shift count. */
export function Riders() {
  const { demo, data, tr, tl, m, update, lang, cfg } = useDemo();
  const [settle, setSettle] = useState<string | null>(null);
  const [counted, setCounted] = useState('');
  const onRoad = data.orders.filter((o) => o.status === 'outForDelivery' && o.riderId);
  const holdingAll = data.riders.reduce((s, r) => s + riderHolding(demo, r.id), 0);
  const r = data.riders.find((x) => x.id === settle);
  const due = r ? riderHolding(demo, r.id) : 0;

  return (
    <>
      <PageHead title={tr('Riders & cash', 'السائقون والنقود')} sub={tr('Where every rider is, and exactly how much cash each one is holding.', 'أين كل سائق، وكم يحمل من النقود بالضبط.')} action={
        <Button icon={<Plus size={16} />} onClick={() => update((d) => void d.data.riders.push({ id: 'rd' + uid(), name: tr('New rider', 'سائق جديد'), phone: '', pin: String(1000 + Math.floor(Math.random() * 9000)), active: true, onShift: false }))}>{tr('Add rider', 'إضافة سائق')}</Button>
      } />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={tr('On shift', 'في المناوبة')} value={data.riders.filter((x) => x.onShift).length} />
        <Stat label={tr('On the road', 'في الطريق')} value={onRoad.length} />
        <Stat label={tr('Cash with riders', 'النقود مع السائقين')} value={m(Math.round(holdingAll * 100) / 100)} />
        <Stat label={tr('Short this week', 'العجز هذا الأسبوع')} value={m(data.settlements.filter((s) => Date.now() - s.at < 7 * 86400000).reduce((a, s) => a + s.short, 0))} />
      </div>
      <Card className="mt-4 overflow-hidden">
        <LiveMap orders={onRoad} riders={data.riders} height={260} storeLabel={tl(cfg.business.name)} />
        {!onRoad.length && <div className="px-4 py-2 text-sm text-gray-500">{tr('No rider on the road right now. Send one from the Staff order board.', 'لا يوجد سائق في الطريق الآن. أرسل واحداً من لوحة طلبات الموظفين.')}</div>}
      </Card>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {data.riders.map((x, i) => {
          const hold = riderHolding(demo, x.id);
          const act = riderActive(demo, x.id).length;
          return (
            <Card key={x.id} className={cx('p-4', !x.active && 'opacity-50')}>
              <div className="flex items-center gap-3">
                <span className="h-11 w-11 rounded-full bg-brand text-onbrand grid place-items-center font-bold">{x.name[0]}</span>
                <div className="flex-1 min-w-0">
                  <Input value={x.name} onChange={(e) => update((d) => void (d.data.riders[i].name = e.target.value))} className="!h-8 !px-2 font-semibold" />
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <Badge className={x.onShift ? 'bg-emerald-100 text-emerald-800' : ''}>{x.onShift ? tr('On shift', 'في المناوبة') : tr('Off', 'خارج')}</Badge>
                    {act > 0 && <Badge className="bg-cyan-100 text-cyan-800"><Bike size={11} /> {act}</Badge>}
                    <span>PIN {x.pin}</span>
                  </div>
                </div>
                <button className="text-gray-300 hover:text-rose-600" onClick={() => update((d) => void (d.data.riders = d.data.riders.filter((y) => y.id !== x.id)))}><Trash2 size={16} /></button>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-xs text-gray-500">{tr('Holding now', 'معه الآن')}</div>
                  <div className="text-2xl font-extrabold tabular-nums">{m(hold)}</div>
                </div>
                <Button size="sm" variant={hold ? 'primary' : 'outline'} icon={<Banknote size={14} />} disabled={!hold} onClick={() => { setSettle(x.id); setCounted(String(hold)); }}>{tr('Count & settle', 'عدّ وتسوية')}</Button>
              </div>
              <div className="mt-3"><Toggle checked={x.active} onChange={(v) => update((d) => void (d.data.riders[i].active = v))} label={<span className="text-sm">{tr('Active rider', 'سائق فعّال')}</span>} /></div>
            </Card>
          );
        })}
      </div>

      <h2 className="font-bold text-lg mt-8 mb-3">{tr('Shift settlements', 'تسويات المناوبات')}</h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>
            <th className="text-start px-4 py-2.5">{tr('Rider', 'السائق')}</th><th className="text-start px-3 py-2.5">{tr('When', 'متى')}</th>
            <th className="text-end px-3 py-2.5">{tr('Collected', 'المحصّل')}</th><th className="text-end px-3 py-2.5">{tr('Counted', 'المعدود')}</th><th className="text-end px-4 py-2.5">{tr('Short', 'العجز')}</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {data.settlements.slice(0, 20).map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2.5 font-medium">{data.riders.find((x) => x.id === s.riderId)?.name ?? '—'}</td>
                <td className="px-3 py-2.5 text-gray-500">{fmtDate(s.at, lang, { day: 'numeric', month: 'short' })} {fmtTime(s.at, lang)}</td>
                <td className="px-3 py-2.5 text-end tabular-nums">{m(s.collected)}</td>
                <td className="px-3 py-2.5 text-end tabular-nums">{m(s.counted)}</td>
                <td className={cx('px-4 py-2.5 text-end tabular-nums font-semibold', s.short > 0 ? 'text-rose-600' : s.short < 0 ? 'text-amber-600' : 'text-emerald-700')}>{s.short ? m(s.short) : '✓'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!r} onClose={() => setSettle(null)} title={r ? tr(`Settle ${r.name}`, `تسوية ${r.name}`) : ''} size="sm"
        footer={<Button block onClick={() => {
          const c = parseFloat(counted) || 0;
          let short = 0;
          update((d) => void (short = settleRider(d, r!.id, c).short));
          setSettle(null);
          toast(short > 0 ? tr(`Settled — ${m(short)} short, recorded against ${r!.name}`, `تمت التسوية — عجز ${m(short)} مسجّل على ${r!.name}`) : tr('Settled — all cash accounted for ✅', 'تمت التسوية — كل النقود موجودة ✅'), short > 0 ? 'error' : 'ok');
        }}>{tr('Confirm count', 'تأكيد العدّ')}</Button>}>
        {r && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span>{tr('Collected in the app', 'المحصّل في التطبيق')}</span><b>{m(due)}</b></div>
            <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 text-sm rounded-lg border">
              {data.collections.filter((c) => c.riderId === r.id && !c.settled).map((c) => (
                <div key={c.id} className="flex justify-between px-3 py-1.5"><span>#{c.orderNumber} · {timeAgo(c.at, lang)}</span><span className="tabular-nums">{m(c.amount)}</span></div>
              ))}
            </div>
            <label className="block text-sm font-medium">{tr('Cash counted at the counter', 'النقود المعدودة في الكاونتر')}</label>
            <Input type="number" value={counted} onChange={(e) => setCounted(e.target.value)} className="!text-xl font-bold" />
            {(parseFloat(counted) || 0) < due && <div className="text-sm text-rose-600 font-semibold">{tr(`Short by ${m(Math.round((due - (parseFloat(counted) || 0)) * 100) / 100)}`, `عجز ${m(Math.round((due - (parseFloat(counted) || 0)) * 100) / 100)}`)}</div>}
          </div>
        )}
      </Modal>
    </>
  );
}

/** Today's figures, ready to send to the owner's WhatsApp at closing time. */
export function DailyClose() {
  const { demo, cfg, tr, m } = useDemo();
  const c = dailyClose(demo);
  const lines = [
    `📊 ${cfg.business.name.en} — ${new Date().toDateString()}`,
    `Sales: ${m(c.sales)}`,
    `Orders: ${c.delivered} completed of ${c.orders}${c.lost ? ` · ${c.lost} lost` : ''}`,
    `Average order: ${m(c.avg)}`,
    ...(c.withRiders ? [`Cash still with riders: ${m(c.withRiders)}`, ...c.riders.map((x) => `  • ${x.r.name}: ${m(x.holding)}`)] : []),
    ...(c.lost ? [`Lost: ${Object.entries(c.reasons).map(([k, v]) => `${v} ${LOST_REASONS[k as LostReason].en.toLowerCase()}`).join(', ')}`] : []),
  ];
  const phone = (cfg.lead.phone || cfg.business.phone).replace(/\D/g, '');
  return (
    <Card className="p-5 !bg-gray-900 text-white !border-0">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider text-white/50 font-bold">{tr('Today’s close', 'إغلاق اليوم')}</div>
          <div className="text-3xl font-extrabold mt-1 tabular-nums">{m(c.sales)}</div>
          <div className="text-sm text-white/70 mt-1">{tr(`${c.delivered} of ${c.orders} orders completed`, `${c.delivered} من ${c.orders} طلب مكتمل`)}{c.lost ? tr(` · ${c.lost} lost`, ` · ${c.lost} ضائع`) : ''}</div>
          {c.withRiders > 0 && <div className="text-sm text-amber-300 mt-1">{tr(`${m(c.withRiders)} still with riders`, `${m(c.withRiders)} ما زالت مع السائقين`)}</div>}
        </div>
        <a href={`https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`} target="_blank" rel="noreferrer">
          <Button variant="accent" icon={<MessageCircle size={16} />}>{tr('Send to WhatsApp', 'أرسل إلى واتساب')}</Button>
        </a>
      </div>
      <div className="text-xs text-white/40 mt-3">{tr('In the live product this arrives on your WhatsApp automatically when the last branch closes.', 'في المنتج الفعلي تصلك هذه الرسالة تلقائياً على واتساب عند إغلاق آخر فرع.')}</div>
    </Card>
  );
}
