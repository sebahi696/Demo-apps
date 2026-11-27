import { useState } from 'react';
import { Bike, Phone, Navigation, Banknote, Check, PackageCheck, LogOut, Power } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { assignRider, collectCash, riderActive, riderHolding, setOrderStatus } from '../../lib/ops';
import { fmtTime, timeAgo, ymd } from '../../lib/utils';
import { Button, Empty, Segmented, cx } from '../../components/ui';
import { LiveMap, etaMinutes } from '../../components/LiveMap';

/** The rider's phone app: deliveries, cash collected, shift. */
export default function RiderApp() {
  const { data, tr, id } = useDemo();
  const [riderId, setRiderId] = useState(() => sessionStorage.getItem('rider-' + id) ?? '');
  const rider = data.riders.find((r) => r.id === riderId);
  return (
    <div className="h-full w-full flex items-center justify-center md:p-4 bg-[radial-gradient(circle_at_30%_20%,#e5e7eb,#d1d5db)]">
      <div className="relative h-full w-full md:h-[min(844px,100%)] md:w-[400px] md:rounded-[44px] md:border-[10px] md:border-gray-900 md:shadow-2xl overflow-hidden bg-gray-50 flex flex-col">
        {rider ? <RiderHome riderId={rider.id} onLogout={() => { sessionStorage.removeItem('rider-' + id); setRiderId(''); }} /> : (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="text-center pt-8">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-brand text-onbrand grid place-items-center"><Bike size={30} /></div>
              <h1 className="font-display text-2xl font-bold mt-3">{tr('Rider app', 'تطبيق السائق')}</h1>
              <p className="text-gray-500 text-sm mt-1">{tr('Who is riding today?', 'من يقود اليوم؟')}</p>
            </div>
            <div className="mt-6 space-y-2">
              {data.riders.filter((r) => r.active).map((r) => (
                <button key={r.id} onClick={() => { sessionStorage.setItem('rider-' + id, r.id); setRiderId(r.id); }}
                  className="w-full flex items-center gap-3 rounded-app bg-white border border-gray-100 p-3 text-start shadow-sm">
                  <span className="h-11 w-11 rounded-full bg-brand text-onbrand grid place-items-center font-bold">{r.name[0]}</span>
                  <span className="flex-1"><span className="block font-semibold">{r.name}</span><span className="block text-xs text-gray-500">{r.onShift ? tr('On shift', 'في المناوبة') : tr('Off shift', 'خارج المناوبة')}</span></span>
                  <span className="text-xs text-gray-400">PIN {r.pin}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RiderHome({ riderId, onLogout }: { riderId: string; onLogout: () => void }) {
  const { demo, cfg, data, tr, tl, m, update, lang } = useDemo();
  const [tab, setTab] = useState<'jobs' | 'cash'>('jobs');
  const r = data.riders.find((x) => x.id === riderId)!;
  const mine = riderActive(demo, riderId);
  const waiting = data.orders.filter((o) => o.fulfillment === 'delivery' && o.status === 'ready' && !o.riderId);
  const holding = riderHolding(demo, riderId);
  const today = ymd(new Date());
  const cols = data.collections.filter((c) => c.riderId === riderId && (!c.settled || ymd(new Date(c.at)) === today));
  const doneToday = data.orders.filter((o) => o.riderId === riderId && o.status === 'completed' && ymd(new Date(o.updatedAt)) === today).length;
  const zoneEta = (zid?: string) => cfg.fulfillment.zones.find((z) => z.id === zid)?.eta ?? 30;

  return (
    <>
      <div className="bg-gray-900 text-white px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-full bg-brand text-onbrand grid place-items-center font-bold">{r.name[0]}</span>
          <div className="flex-1">
            <div className="font-bold">{r.name}</div>
            <div className="text-xs text-white/60">{tl(cfg.business.name)} · {doneToday} {tr('delivered today', 'سلّمت اليوم')}</div>
          </div>
          <button onClick={onLogout} className="h-9 w-9 grid place-items-center rounded-full bg-white/10" aria-label="Log out"><LogOut size={16} /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-app bg-white/10 p-3">
            <div className="text-xs text-white/60">{tr('Cash you are holding', 'النقود التي بحوزتك')}</div>
            <div className="text-2xl font-extrabold tabular-nums">{m(holding)}</div>
          </div>
          <button onClick={() => update((d) => { const x = d.data.riders.find((y) => y.id === riderId)!; x.onShift = !x.onShift; if (x.onShift) x.shiftStart = Date.now(); })}
            className={cx('rounded-app p-3 text-start', r.onShift ? 'bg-emerald-500/20' : 'bg-white/10')}>
            <div className="text-xs text-white/60 flex items-center gap-1"><Power size={12} /> {tr('Shift', 'المناوبة')}</div>
            <div className="font-bold">{r.onShift ? tr('On shift · tap to end', 'في المناوبة · اضغط للإنهاء') : tr('Off · tap to start', 'متوقف · اضغط للبدء')}</div>
          </button>
        </div>
      </div>
      <div className="px-4 pt-3"><Segmented value={tab} onChange={setTab} options={[{ value: 'jobs', label: tr(`Deliveries (${mine.length})`, `التوصيلات (${mine.length})`) }, { value: 'cash', label: tr('My cash', 'نقودي') }]} /></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-10">
        {tab === 'jobs' && (
          <>
            {mine.length > 0 && <LiveMap orders={mine} riders={data.riders} height={170} storeLabel={tl(cfg.business.name)} />}
            {mine.map((o) => {
              const needCash = o.payment === 'cash' && !o.collected;
              return (
                <div key={o.id} className="rounded-app bg-white border-2 border-brand/30 p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-lg">#{o.number}</span>
                    <span className="text-xs rounded-full bg-cyan-100 text-cyan-800 px-2 py-0.5 font-bold">{tr(`~${etaMinutes(o, zoneEta(o.zoneId))} min`, `~${etaMinutes(o, zoneEta(o.zoneId))} د`)}</span>
                    <span className="ms-auto font-bold tabular-nums">{m(o.total)}</span>
                  </div>
                  <div className="mt-1 font-semibold">{o.customerName}{o.phone && <span dir="ltr" className="ms-2 text-sm font-normal text-gray-500">{o.phone}</span>}</div>
                  <div className="text-sm text-gray-500">📍 {o.address || '—'}</div>
                  <div className="text-xs text-gray-500 mt-1">{o.items.map((i) => `${i.qty}× ${tl(i.name)}`).join(', ')}</div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <a href={`https://www.google.com/maps/search/${encodeURIComponent(o.address ?? '')}`} target="_blank" rel="noreferrer"><Button block size="sm" variant="outline" icon={<Navigation size={14} />}>{tr('Navigate', 'الاتجاهات')}</Button></a>
                    {o.phone ? <a href={`tel:${o.phone.replace(/[^\d+]/g, '')}`}><Button block size="sm" variant="outline" icon={<Phone size={14} />}>{tr('Call', 'اتصال')}</Button></a> : <Button size="sm" variant="outline" disabled icon={<Phone size={14} />}>{tr('No phone', 'لا هاتف')}</Button>}
                  </div>
                  {needCash ? (
                    <Button block className="mt-2" icon={<Banknote size={16} />} onClick={() => { update((d) => collectCash(d, o.id)); toast(tr(`${m(o.total)} collected`, `تم استلام ${m(o.total)}`)); }}>
                      {tr(`Collect ${m(o.total)} cash`, `استلم ${m(o.total)} نقداً`)}
                    </Button>
                  ) : (
                    <Button block className="mt-2" variant="dark" icon={<PackageCheck size={16} />} onClick={() => { update((d) => setOrderStatus(d, o.id, 'completed')); toast(tr('Delivered ✅', 'تم التسليم ✅')); }}>
                      {o.payment === 'cash' ? tr('Collected ✓ · Mark delivered', 'تم الاستلام ✓ · تم التسليم') : tr('Paid online · Mark delivered', 'مدفوع أونلاين · تم التسليم')}
                    </Button>
                  )}
                </div>
              );
            })}
            {waiting.length > 0 && (
              <>
                <div className="font-bold pt-2">{tr('Ready at the counter', 'جاهزة على الكاونتر')}</div>
                {waiting.map((o) => (
                  <div key={o.id} className="rounded-app bg-white border border-gray-100 p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-bold">#{o.number} · {m(o.total)}</div>
                      <div className="text-xs text-gray-500">📍 {o.address}</div>
                    </div>
                    <Button size="sm" disabled={!r.onShift} onClick={() => update((d) => assignRider(d, o.id, riderId))}>{tr('Take it', 'خذه')}</Button>
                  </div>
                ))}
              </>
            )}
            {!mine.length && !waiting.length && <Empty icon="🛵" title={tr('No deliveries right now', 'لا توصيلات حالياً')} text={tr('New delivery orders appear here when the counter sends you.', 'تظهر طلبات التوصيل هنا عندما يرسلك الكاونتر.')} />}
          </>
        )}
        {tab === 'cash' && (
          <>
            <div className="rounded-app bg-white border border-gray-100 p-4">
              <div className="text-sm text-gray-500">{tr('To hand in at the counter', 'للتسليم في الكاونتر')}</div>
              <div className="text-3xl font-extrabold tabular-nums">{m(holding)}</div>
              <div className="text-xs text-gray-400 mt-1">{tr('The cashier counts it when your shift ends.', 'يعدّها الكاشير عند انتهاء مناوبتك.')}</div>
            </div>
            <div className="rounded-app bg-white border border-gray-100 divide-y divide-gray-100">
              {cols.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className={cx('h-8 w-8 rounded-full grid place-items-center', c.settled ? 'bg-gray-100 text-gray-400' : 'bg-emerald-50 text-emerald-700')}>{c.settled ? <Check size={15} /> : <Banknote size={15} />}</span>
                  <div className="flex-1"><div className="font-medium">#{c.orderNumber}</div><div className="text-xs text-gray-400">{fmtTime(c.at, lang)} · {timeAgo(c.at, lang)}</div></div>
                  <div className="font-bold tabular-nums">{m(c.amount)}</div>
                </div>
              ))}
              {!cols.length && <div className="p-6 text-center text-sm text-gray-400">{tr('No cash collected yet', 'لم تستلم نقوداً بعد')}</div>}
            </div>
          </>
        )}
      </div>
    </>
  );
}
