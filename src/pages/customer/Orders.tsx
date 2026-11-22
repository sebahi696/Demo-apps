import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Phone, RotateCcw, Truck, Store, UtensilsCrossed, ChevronRight, Star } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { addToCart, flowFor, productAvailable, setOrderStatus, statusLabel, statusTone, rateOrder } from '../../lib/ops';
import { fmtDate, fmtTime, timeAgo } from '../../lib/utils';
import { Button, Empty, Thumb, cx, Input } from '../../components/ui';
import { Screen } from './CustomerApp';

export function Orders() {
  const { data, tr, tl, m, cfg, lang, terms } = useDemo();
  const nav = useNavigate();
  const mine = data.orders.filter((o) => o.customerId === data.meId);
  const active = mine.filter((o) => !['completed', 'cancelled'].includes(o.status));
  const past = mine.filter((o) => ['completed', 'cancelled'].includes(o.status));
  if (!mine.length)
    return (
      <Screen title={tr('Orders', 'الطلبات')}>
        <Empty icon="🧾" title={tr('No orders yet', 'لا طلبات بعد')} action={<Button onClick={() => nav('../menu')}>{tr(`Open ${tl(terms.catalog).toLowerCase()}`, `افتح ${tl(terms.catalog)}`)}</Button>} />
      </Screen>
    );
  const Card = ({ o }: { o: (typeof mine)[number] }) => (
    <Link to={o.id} className="flex items-center gap-3 rounded-app bg-white border border-gray-100 p-3.5">
      <div className="h-11 w-11 rounded-full bg-gray-100 grid place-items-center text-xl">{o.items[0]?.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold">#{o.number}</span>
          <span className={cx('text-[11px] rounded-full px-2 py-0.5 font-bold', statusTone[o.status])}>{tl(statusLabel(o.status, cfg.industry, o.fulfillment))}</span>
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5">{o.items.map((i) => `${i.qty}× ${tl(i.name)}`).join(', ')}</div>
        <div className="text-xs text-gray-400 mt-0.5">{fmtDate(o.createdAt, lang)} · {fmtTime(o.createdAt, lang)}</div>
      </div>
      <div className="text-end">
        <div className="font-bold tabular-nums">{m(o.total)}</div>
        <ChevronRight size={16} className="text-gray-300 ms-auto rtl:rotate-180" />
      </div>
    </Link>
  );
  return (
    <Screen title={tr('Orders', 'الطلبات')}>
      {active.length > 0 && <div className="font-bold mb-2">{tr('In progress', 'قيد التنفيذ')}</div>}
      <div className="space-y-2.5">{active.map((o) => <Card key={o.id} o={o} />)}</div>
      {past.length > 0 && <div className="font-bold mb-2 mt-5">{tr('Past orders', 'الطلبات السابقة')}</div>}
      <div className="space-y-2.5">{past.map((o) => <Card key={o.id} o={o} />)}</div>
    </Screen>
  );
}

export function OrderDetail() {
  const { oid } = useParams();
  const [params, setParams] = useSearchParams();
  const { data, tr, tl, m, cfg, lang, update, terms } = useDemo();
  const nav = useNavigate();
  const o = data.orders.find((x) => x.id === oid);

  useEffect(() => {
    if (params.get('new')) {
      toast(tr('Order sent to the store!', 'تم إرسال الطلب إلى المتجر!'));
      params.delete('new');
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!o) return <Screen title="" back="../orders"><Empty icon="🤷" title={tr('Order not found', 'الطلب غير موجود')} /></Screen>;
  const flow = flowFor(o.fulfillment);
  const idx = flow.indexOf(o.status);
  const cancelled = o.status === 'cancelled';
  const fIcon = { delivery: <Truck size={16} />, pickup: <Store size={16} />, dineIn: <UtensilsCrossed size={16} /> }[o.fulfillment];
  const fText = { delivery: tl(terms.delivery), pickup: tr('Pickup', 'استلام'), dineIn: tr(`Table ${o.table}`, `طاولة ${o.table}`) }[o.fulfillment];

  return (
    <Screen title={`${tr('Order', 'الطلب')} #${o.number}`} back="../orders">
      <div className="rounded-app-lg bg-brand text-onbrand p-5 relative overflow-hidden">
        <div className="text-sm opacity-80">{cancelled ? '' : o.status === 'completed' ? tr('All done', 'تم') : tr('Status', 'الحالة')}</div>
        <div className="font-display font-bold text-2xl mt-0.5">{tl(statusLabel(o.status, cfg.industry, o.fulfillment))}</div>
        {!cancelled && o.status !== 'completed' && (
          <div className="text-sm opacity-80 mt-1">{tr(`Estimated ${cfg.fulfillment.prepMinutes + (o.fulfillment === 'delivery' ? 20 : 0)} min`, `الوقت المتوقع ${cfg.fulfillment.prepMinutes + (o.fulfillment === 'delivery' ? 20 : 0)} دقيقة`)}</div>
        )}
        <div className="absolute -end-4 -bottom-6 text-8xl opacity-20">{o.items[0]?.emoji}</div>
      </div>

      {!cancelled && (
        <div className="mt-4 rounded-app bg-white border border-gray-100 p-4">
          {flow.map((s, i) => {
            const at = o.history.find((h) => h.status === s)?.at;
            const done = i <= idx;
            return (
              <div key={s} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cx('h-7 w-7 rounded-full grid place-items-center shrink-0 transition', done ? 'bg-brand text-onbrand' : 'bg-gray-100 text-gray-300', i === idx && o.status !== 'completed' && 'animate-[pulse-ring_1.6s_infinite]')}>
                    {done ? <Check size={15} /> : <span className="h-2 w-2 rounded-full bg-gray-300" />}
                  </span>
                  {i < flow.length - 1 && <span className={cx('w-0.5 flex-1 min-h-5', i < idx ? 'bg-brand' : 'bg-gray-200')} />}
                </div>
                <div className="pb-4 pt-0.5 flex-1 flex justify-between">
                  <span className={cx('font-medium', !done && 'text-gray-400')}>{tl(statusLabel(s, cfg.industry, o.fulfillment))}</span>
                  {at && <span className="text-xs text-gray-400">{fmtTime(at, lang)}</span>}
                </div>
              </div>
            );
          })}
          {o.status === 'pending' && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5">
              💡 {tr('Tip: switch to Staff (top bar) to accept this order — or turn on “Simulate store activity” in the ⋯ menu.', 'نصيحة: انتقل إلى الموظف (الشريط العلوي) لقبول هذا الطلب — أو فعّل "محاكاة نشاط المتجر" من القائمة ⋯.')}
            </div>
          )}
        </div>
      )}

      {(o.pointsEarned > 0 || o.stampsEarned > 0) && (
        <div className="mt-4 rounded-app bg-brand2/25 p-4 flex items-center gap-3 animate-[pop_.4s_ease]">
          <span className="text-3xl">⭐</span>
          <div className="font-semibold">{tr(`You earned ${o.pointsEarned} points${o.stampsEarned ? ` and ${o.stampsEarned} stamp(s)` : ''}!`, `حصلت على ${o.pointsEarned} نقطة${o.stampsEarned ? ` و ${o.stampsEarned} ختم` : ''}!`)}</div>
        </div>
      )}

      <div className="mt-4 rounded-app bg-white border border-gray-100 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">{fIcon} {fText}{o.address && ` · ${o.address}`}</div>
        <div className="space-y-2.5">
          {o.items.map((i, k) => (
            <div key={k} className="flex items-center gap-3">
              <Thumb emoji={i.emoji} size="sm" className="!h-10 !w-10 !text-xl" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{i.qty}× {tl(i.name)}</div>
                {i.options.length > 0 && <div className="text-xs text-gray-500">{i.options.map((x) => tl(x)).join(' · ')}</div>}
              </div>
              <div className="text-sm tabular-nums">{m(i.unitPrice * i.qty)}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-1 text-sm">
          <div className="flex justify-between"><span>{tr('Subtotal', 'المجموع الفرعي')}</span><span>{m(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="flex justify-between text-emerald-700"><span>{tr('Discount', 'الخصم')}</span><span>−{m(o.discount)}</span></div>}
          {o.fulfillment === 'delivery' && <div className="flex justify-between"><span>{tl(terms.delivery)}</span><span>{o.deliveryFee ? m(o.deliveryFee) : tr('Free', 'مجاني')}</span></div>}
          {o.tip > 0 && <div className="flex justify-between"><span>{tr('Tip', 'الإكرامية')}</span><span>{m(o.tip)}</span></div>}
          <div className="flex justify-between font-extrabold text-base pt-1"><span>{tr('Total', 'الإجمالي')}</span><span>{m(o.total)}</span></div>
          <div className="text-xs text-gray-500">{o.paid ? tr('Paid', 'مدفوع') : tr('To pay on collection', 'الدفع عند الاستلام')} · {o.payment}</div>
        </div>
      </div>

      {cfg.modules.reviews && o.status === 'completed' && <RateBox orderId={o.id} />}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {cfg.business.phone ? (
          <a href={`tel:${cfg.business.phone}`}><Button block variant="outline" icon={<Phone size={16} />}>{tr('Call store', 'اتصل بالمتجر')}</Button></a>
        ) : <span />}
        {o.status === 'pending' ? (
          <Button variant="outline" className="!text-rose-600" onClick={() => { update((d) => setOrderStatus(d, o.id, 'cancelled')); toast(tr('Order cancelled', 'تم إلغاء الطلب'), 'info'); }}>{tr('Cancel order', 'إلغاء الطلب')}</Button>
        ) : (
          <Button variant="outline" icon={<RotateCcw size={16} />} onClick={() => {
            update((d) => o.items.filter((i) => d.data.products.some((p) => p.id === i.productId && productAvailable(p))).forEach((i) => addToCart(d, i.productId, i.qty, [])));
            nav('../cart');
          }}>{tr('Order again', 'اطلب مجدداً')}</Button>
        )}
      </div>
      <div className="text-center text-xs text-gray-400 mt-4">{tr('Placed', 'تم الطلب')} {timeAgo(o.createdAt, lang)}</div>
    </Screen>
  );
}

function RateBox({ orderId }: { orderId: string }) {
  const { data, tr, update } = useDemo();
  const o = data.orders.find((x) => x.id === orderId)!;
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  if (o.rating)
    return (
      <div className="mt-4 rounded-app bg-white border border-gray-100 p-4">
        <div className="text-sm text-gray-500">{tr('Your rating', 'تقييمك')}</div>
        <div className="flex gap-0.5 mt-1">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={20} className={i <= o.rating! ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />)}</div>
        {o.review && <div className="text-sm mt-2">“{o.review}”</div>}
        {o.reply && <div className="mt-3 rounded-lg bg-gray-50 p-2.5 text-sm"><b>{tr('Reply from the store', 'رد المتجر')}:</b> {o.reply}</div>}
      </div>
    );
  return (
    <div className="mt-4 rounded-app border-2 border-brand/30 bg-white p-4">
      <div className="font-bold">{tr('How was your order?', 'كيف كان طلبك؟')}</div>
      <div className="flex gap-1 mt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} onClick={() => setStars(i)} aria-label={`${i}`}><Star size={32} className={i <= stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} /></button>
        ))}
      </div>
      {stars > 0 && (
        <>
          <Input className="mt-3" value={text} onChange={(e) => setText(e.target.value)} placeholder={tr('Tell us more (optional)', 'أخبرنا المزيد (اختياري)')} />
          <Button block className="mt-2" onClick={() => {
            let b = 0;
            update((d) => void (b = rateOrder(d, orderId, stars, text)));
            toast(b ? tr(`Thanks! +${b} points`, `شكراً! +${b} نقطة`) : tr('Thanks for your feedback!', 'شكراً لرأيك!'));
          }}>{tr('Send rating', 'أرسل التقييم')}</Button>
        </>
      )}
    </div>
  );
}
