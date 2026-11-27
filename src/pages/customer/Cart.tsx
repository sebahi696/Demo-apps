import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Ticket, Truck, Store, UtensilsCrossed, CreditCard, Banknote, Check, ShieldCheck, Trash2, Wallet, Clock, PauseCircle, HeartHandshake } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { lineFor, totals, placeOrder, pointsFor, stampsFor, me, describeEarn, storeStatus } from '../../lib/ops';
import type { Fulfillment, PaymentKey } from '../../lib/types';
import { Button, Empty, Input, Stepper, Thumb, cx, Modal } from '../../components/ui';
import { Screen } from './CustomerApp';

export function Cart() {
  const { demo, data, tr, tl, m, update, terms } = useDemo();
  const nav = useNavigate();
  const [code, setCode] = useState(data.cart.couponCode ?? '');
  const t = totals(demo, 'pickup');
  const vouchers = data.vouchers.filter((v) => v.customerId === data.meId && v.status === 'active');

  if (!data.cart.items.length)
    return (
      <Screen title={tr('Your cart', 'سلتك')} back>
        <Empty icon="🛒" title={tr('Your cart is empty', 'سلتك فارغة')} text={tr('Add something tasty to get started.', 'أضف شيئاً لتبدأ.')}
          action={<Button onClick={() => nav('../menu')}>{tr(`Browse ${tl(terms.catalog).toLowerCase()}`, `تصفّح ${tl(terms.catalog)}`)}</Button>} />
      </Screen>
    );

  return (
    <Screen title={tr('Your cart', 'سلتك')} back right={
      <button className="h-10 px-3 text-sm font-semibold text-rose-600" onClick={() => update((d) => void (d.data.cart = { items: [] }))}>{tr('Clear', 'إفراغ')}</button>
    }>
      <div className="space-y-2.5">
        {data.cart.items.map((i) => {
          const l = lineFor(demo, i.productId, i.optionIds);
          if (!l) return null;
          return (
            <div key={i.key} className="flex gap-3 rounded-app bg-white border border-gray-100 p-2.5">
              <Thumb emoji={l.product.emoji} image={l.product.image} bg={l.product.bg} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold leading-tight">{tl(l.product.name)}</div>
                {l.options.length > 0 && <div className="text-xs text-gray-500 mt-0.5">{l.options.map((o) => tl(o)).join(' · ')}</div>}
                {i.note && <div className="text-xs text-gray-500 italic">“{i.note}”</div>}
                <div className="flex items-center justify-between mt-1.5">
                  <span className="font-bold text-sm tabular-nums">{m(l.unit * i.qty)}</span>
                  <Stepper value={i.qty} min={0} onChange={(v) => update((d) => {
                    const it = d.data.cart.items.find((x) => x.key === i.key)!;
                    if (v <= 0) d.data.cart.items = d.data.cart.items.filter((x) => x.key !== i.key);
                    else it.qty = v;
                  })} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {demo.config.modules.deals && (
        <div className="mt-5">
          <div className="font-bold mb-2 flex items-center gap-2"><Tag size={17} /> {tr('Promo code', 'رمز الخصم')}</div>
          <form className="flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            update((d) => void (d.data.cart.couponCode = code.trim().toUpperCase() || undefined));
          }}>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME20" className="font-mono uppercase" dir="ltr" />
            {data.cart.couponCode ? (
              <Button type="button" variant="outline" onClick={() => { setCode(''); update((d) => void (d.data.cart.couponCode = undefined)); }}>{tr('Remove', 'إزالة')}</Button>
            ) : (
              <Button type="submit" variant="dark">{tr('Apply', 'تطبيق')}</Button>
            )}
          </form>
          {data.cart.couponCode && (t.couponError
            ? <div className="text-sm text-rose-600 mt-1.5">{tl(t.couponError)}</div>
            : <div className="text-sm text-emerald-700 mt-1.5 font-medium">✓ {tl(t.couponLabel)}</div>)}
        </div>
      )}

      {vouchers.length > 0 && (
        <div className="mt-5">
          <div className="font-bold mb-2 flex items-center gap-2"><Ticket size={17} /> {tr('Use a reward', 'استخدم مكافأة')}</div>
          <div className="space-y-2">
            {vouchers.map((v) => {
              const on = data.cart.voucherId === v.id;
              return (
                <button key={v.id} onClick={() => update((d) => void (d.data.cart.voucherId = on ? undefined : v.id))}
                  className={cx('w-full flex items-center gap-3 rounded-app border-2 p-3 text-start', on ? 'border-brand bg-brand/5' : 'border-dashed border-gray-300 bg-white')}>
                  <span className="text-2xl">{v.emoji}</span>
                  <span className="flex-1 font-semibold">{tl(v.name)}</span>
                  <span className={cx('h-6 w-6 rounded-full grid place-items-center', on ? 'bg-brand text-onbrand' : 'border-2 border-gray-300')}>{on && <Check size={14} />}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-app bg-white border border-gray-100 p-4 space-y-1.5 text-sm">
        <Row k={tr('Subtotal', 'المجموع الفرعي')} v={m(t.subtotal)} />
        {t.discount > 0 && <Row k={tr('Discount', 'الخصم')} v={'−' + m(t.discount)} green />}
        <div className="text-xs text-gray-400 pt-1">{tr('Delivery fee and taxes are calculated at checkout.', 'تُحسب رسوم التوصيل والضرائب عند الدفع.')}</div>
      </div>
      <Button block size="lg" className="mt-5 justify-between" onClick={() => nav('../checkout')}>
        <span>{tr('Checkout', 'إتمام الطلب')}</span><span className="tabular-nums">{m(t.subtotal - t.discount)}</span>
      </Button>
    </Screen>
  );
}

const Row = ({ k, v, green, bold }: { k: string; v: string; green?: boolean; bold?: boolean }) => (
  <div className={cx('flex justify-between', green && 'text-emerald-700', bold && 'font-extrabold text-base pt-2 border-t border-gray-100 mt-2')}>
    <span>{k}</span><span className="tabular-nums">{v}</span>
  </div>
);

export function Checkout() {
  const { demo, cfg, data, tr, tl, m, m2, update, terms, lang } = useDemo();
  const nav = useNavigate();
  const options = (['delivery', 'pickup', 'dineIn'] as Fulfillment[]).filter((f) => cfg.modules[f]);
  const [f, setF] = useState<Fulfillment>(data.cart.table && cfg.modules.dineIn ? 'dineIn' : options[0] ?? 'pickup');
  const [tipPct, setTipPct] = useState(0);
  const status = storeStatus(demo);
  const [zone, setZone] = useState(cfg.fulfillment.zones[0]?.id);
  const [address, setAddress] = useState('');
  const [table, setTable] = useState(data.cart.table ?? '');
  const [when, setWhen] = useState('asap');
  const pays = (Object.keys(cfg.payments) as PaymentKey[]).filter((k) => cfg.payments[k] && (k !== 'wallet' || cfg.modules.wallet));
  const [pay, setPay] = useState<PaymentKey>(pays[0] ?? 'cash');
  const [note, setNote] = useState('');
  const [paying, setPaying] = useState(false);
  const t = totals(demo, f, zone, tipPct);
  const c = me(demo);
  const earnPts = pointsFor(demo, t.total, c);
  const earnSt = stampsFor(demo, data.cart.items);
  const placed = useRef(false);

  if (!data.cart.items.length && !placed.current) {
    setTimeout(() => nav('../menu', { replace: true }));
    return null;
  }

  const fIcon = { delivery: <Truck size={18} />, pickup: <Store size={18} />, dineIn: <UtensilsCrossed size={18} /> };
  const fLabel = { delivery: tl(terms.delivery), pickup: cfg.industry === 'retail' ? tr('Click & collect', 'استلام من المتجر') : tr('Pickup', 'استلام'), dineIn: tr('Dine-in', 'في المطعم') };
  const payLabel: Record<PaymentKey, string> = { card: tr('Card', 'بطاقة'), applePay: 'Apple Pay', googlePay: 'Google Pay', cash: f === 'delivery' ? tr('Cash on delivery', 'الدفع عند الاستلام') : tr('Pay at store', 'الدفع في المتجر'), wallet: tr('App wallet', 'محفظة التطبيق') };
  const payIcon: Record<PaymentKey, JSX.Element> = { card: <CreditCard size={18} />, applePay: <span className="text-[9px] font-extrabold bg-black text-white rounded px-1">Pay</span>, googlePay: <span className="font-bold">G</span>, cash: <Banknote size={18} />, wallet: <Wallet size={18} /> };

  const submit = () => {
    if (status.paused) return toast(tr('The store is not taking orders right now', 'المتجر لا يستقبل الطلبات حالياً'), 'error');
    if (pay === 'wallet' && c.wallet < t.total) return toast(tr('Not enough wallet balance — top up first', 'رصيد المحفظة غير كافٍ — اشحنها أولاً'), 'error');
    if (t.minOrderError) return toast(tl(t.minOrderError), 'error');
    if (f === 'delivery' && address.trim().length < 4) return toast(tr('Please enter your address', 'يرجى إدخال عنوانك'), 'error');
    if (f === 'dineIn' && !table.trim()) return toast(tr('Please enter your table number', 'يرجى إدخال رقم الطاولة'), 'error');
    setPaying(true);
  };

  const finish = () => {
    let id = '';
    placed.current = true;
    const whenNote = f === 'pickup' && when !== 'asap' ? `Pickup in ${when} min` : '';
    const preNote = !status.open ? `Pre-order for opening (${status.opensAt})` : '';
    update((d) => void (id = placeOrder(d, { fulfillment: f, zoneId: f === 'delivery' ? zone : undefined, address, table, payment: pay, tipPct, note: [note, whenNote, preNote].filter(Boolean).join(' · ') || undefined }).id));
    setPaying(false);
    nav(`../orders/${id}?new=1`, { replace: true });
  };

  return (
    <Screen title={tr('Checkout', 'إتمام الطلب')} back>
      {status.paused ? (
        <div className="mb-4 rounded-app bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800 flex gap-2"><PauseCircle size={18} className="shrink-0" />{tr('We’re not taking online orders right now. Please check back soon.', 'لا نستقبل طلبات أونلاين حالياً. يرجى المحاولة لاحقاً.')}</div>
      ) : !status.open ? (
        <div className="mb-4 rounded-app bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 flex gap-2"><Clock size={18} className="shrink-0" />{tr(`We’re closed now. Your order will be prepared when we open at ${status.opensAt}.`, `نحن مغلقون الآن. سيتم تحضير طلبك عند الافتتاح الساعة ${status.opensAt}.`)}</div>
      ) : status.extra > 0 ? (
        <div className="mb-4 rounded-app bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 flex gap-2"><Clock size={18} className="shrink-0" />{tr(`We’re busy — expect about ${status.extra} extra minutes.`, `لدينا ضغط — توقع حوالي ${status.extra} دقيقة إضافية.`)}</div>
      ) : null}
      {options.length > 1 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
          {options.map((o) => (
            <button key={o} onClick={() => setF(o)} className={cx('rounded-app border-2 py-3 flex flex-col items-center gap-1 text-sm font-semibold', f === o ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200 bg-white text-gray-600')}>
              {fIcon[o]}{fLabel[o]}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-app bg-white border border-gray-100 p-4 space-y-3">
        {f === 'delivery' && (
          <>
            <div className="font-bold">{tr('Deliver to', 'التوصيل إلى')}</div>
            <div className="space-y-1.5">
              {cfg.fulfillment.zones.map((z) => (
                <button key={z.id} onClick={() => setZone(z.id)} className={cx('w-full flex items-center gap-3 rounded-app border px-3 py-2.5 text-start', zone === z.id ? 'border-brand bg-brand/5' : 'border-gray-200')}>
                  <span className={cx('h-5 w-5 rounded-full grid place-items-center', zone === z.id ? 'bg-brand text-onbrand' : 'border-2 border-gray-300')}>{zone === z.id && <Check size={12} />}</span>
                  <span className="flex-1">
                    <span className="block font-medium">{tl(z.name)}</span>
                    <span className="block text-xs text-gray-500">{z.eta >= 1440 ? tr(`${Math.round(z.eta / 1440)}–${Math.round(z.eta / 1440) + 1} days`, `${Math.round(z.eta / 1440)}–${Math.round(z.eta / 1440) + 1} أيام`) : tr(`~${z.eta} min`, `~${z.eta} دقيقة`)}</span>
                  </span>
                  <span className="text-sm font-semibold">{m(z.fee)}</span>
                </button>
              ))}
            </div>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={tr('Street, building, floor', 'الشارع، المبنى، الطابق')} />
            {cfg.fulfillment.freeDeliveryOver > 0 && t.subtotal < cfg.fulfillment.freeDeliveryOver && (
              <div className="text-xs text-emerald-700">{tr(`Add ${m(cfg.fulfillment.freeDeliveryOver - t.subtotal)} more for free ${tl(terms.delivery).toLowerCase()}`, `أضف ${m(cfg.fulfillment.freeDeliveryOver - t.subtotal)} لتحصل على ${tl(terms.delivery)} مجاني`)}</div>
            )}
          </>
        )}
        {f === 'pickup' && (
          <>
            <div className="font-bold">{tr('When?', 'متى؟')}</div>
            <div className="flex gap-2">
              {[['asap', tr(`ASAP (~${cfg.fulfillment.prepMinutes} min)`, `بأسرع وقت (~${cfg.fulfillment.prepMinutes} د)`)], ['30', tr('In 30 min', 'بعد 30 د')], ['60', tr('In 1 hour', 'بعد ساعة')]].map(([k, l]) => (
                <button key={k} onClick={() => setWhen(k)} className={cx('flex-1 rounded-app border py-2 text-xs font-semibold', when === k ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200')}>{l}</button>
              ))}
            </div>
            <div className="text-xs text-gray-500">{[cfg.business.address, cfg.business.city].filter(Boolean).join(', ') || tl(cfg.business.name)}</div>
          </>
        )}
        {f === 'dineIn' && (
          <>
            <div className="font-bold">{tr('Table number', 'رقم الطاولة')}</div>
            <Input inputMode="numeric" value={table} onChange={(e) => setTable(e.target.value)} placeholder="12" />
          </>
        )}
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr('Note for the store (optional)', 'ملاحظة للمتجر (اختياري)')} />
      </div>

      {cfg.modules.tips && (
        <div className="mt-4 rounded-app bg-white border border-gray-100 p-4">
          <div className="font-bold mb-2 flex items-center gap-2"><HeartHandshake size={17} /> {f === 'delivery' ? tr('Tip your driver', 'إكرامية للسائق') : tr('Add a tip for the team', 'أضف إكرامية للفريق')}</div>
          <div className="flex gap-2">
            {cfg.tips.map((p) => (
              <button key={p} onClick={() => setTipPct(p)} className={cx('flex-1 rounded-app border py-2 text-sm font-semibold', tipPct === p ? 'border-brand bg-brand text-onbrand' : 'border-gray-200')}>
                {p === 0 ? tr('No tip', 'بدون') : `${p}%`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-app bg-white border border-gray-100 p-4">
        <div className="font-bold mb-2">{tr('Payment', 'الدفع')}</div>
        <div className="space-y-1.5">
          {pays.map((p) => (
            <button key={p} onClick={() => setPay(p)} className={cx('w-full flex items-center gap-3 rounded-app border px-3 py-3 text-start', pay === p ? 'border-brand bg-brand/5' : 'border-gray-200')}>
              <span className="h-8 w-8 rounded-lg bg-gray-100 grid place-items-center">{payIcon[p]}</span>
              <span className="flex-1 font-medium">{payLabel[p]}{p === 'card' && <span className="block text-xs text-gray-500" dir="ltr">Visa •••• 4242</span>}{p === 'wallet' && <span className={cx('block text-xs', c.wallet >= t.total ? 'text-gray-500' : 'text-rose-600')}>{tr('Balance', 'الرصيد')} {m(c.wallet)}</span>}</span>
              <span className={cx('h-5 w-5 rounded-full grid place-items-center', pay === p ? 'bg-brand text-onbrand' : 'border-2 border-gray-300')}>{pay === p && <Check size={12} />}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500"><ShieldCheck size={14} /> {tr('Demo mode — no real payment is made.', 'وضع تجريبي — لا يتم أي دفع حقيقي.')}</div>
      </div>

      <div className="mt-4 rounded-app bg-white border border-gray-100 p-4 space-y-1.5 text-sm">
        <Row k={tr('Subtotal', 'المجموع الفرعي')} v={m(t.subtotal)} />
        {t.discount > 0 && <Row k={tr('Discount', 'الخصم')} v={'−' + m(t.discount)} green />}
        {f === 'delivery' && <Row k={tl(terms.delivery)} v={t.deliveryFee ? m(t.deliveryFee) : tr('Free', 'مجاني')} />}
        {t.tax > 0 && <Row k={cfg.fulfillment.taxIncluded ? tr(`VAT ${cfg.fulfillment.taxRate}% (included)`, `ضريبة ${cfg.fulfillment.taxRate}% (مشمولة)`) : tr(`VAT ${cfg.fulfillment.taxRate}%`, `ضريبة ${cfg.fulfillment.taxRate}%`)} v={m(t.tax)} />}
        {t.tip > 0 && <Row k={tr('Tip', 'الإكرامية')} v={m(t.tip)} />}
        <Row k={tr('Total', 'الإجمالي')} v={m(t.total)} bold />
        {m2(t.total) && <div className="text-end text-xs text-gray-400">≈ {m2(t.total)}</div>}
        {(earnPts > 0 || earnSt > 0) && <div className="mt-2 rounded-lg bg-brand2/20 px-3 py-2 text-xs font-semibold">⭐ {describeEarn(earnPts, earnSt, lang)} {tr('when your order is completed', 'عند إتمام طلبك')}</div>}
      </div>

      <Button block size="lg" className="mt-5 justify-between" onClick={submit} disabled={status.paused}>
        <span>{pay === 'applePay' ? tr('Pay with Apple Pay', 'ادفع عبر Apple Pay') : pay === 'cash' ? tr('Place order', 'تأكيد الطلب') : tr('Pay now', 'ادفع الآن')}</span>
        <span className="tabular-nums">{m(t.total)}</span>
      </Button>

      {paying && <PaySheet method={pay} amount={m(t.total)} onDone={finish} onCancel={() => setPaying(false)} />}
    </Screen>
  );
}

function PaySheet({ method, amount, onDone, onCancel }: { method: PaymentKey; amount: string; onDone: () => void; onCancel: () => void }) {
  const { tr, tl, cfg } = useDemo();
  const [stage, setStage] = useState<'confirm' | 'processing' | 'done'>(method === 'cash' ? 'processing' : 'confirm');
  const started = useRef(false);
  const run = () => {
    if (started.current) return;
    started.current = true;
    setStage('processing');
    setTimeout(() => setStage('done'), 1100);
    setTimeout(onDone, 1800);
  };
  useEffect(() => {
    if (method === 'cash') run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Modal open onClose={stage === 'confirm' ? onCancel : () => {}} contained>
      <div className="text-center py-2">
        {stage === 'confirm' && (
          <>
            <div className={cx('mx-auto h-14 w-24 rounded-xl grid place-items-center text-white text-base font-bold', method === 'applePay' ? 'bg-black' : method === 'googlePay' ? 'bg-white border text-gray-900' : 'bg-gradient-to-br from-indigo-600 to-sky-500')}>
              {method === 'applePay' ? 'Apple Pay' : method === 'googlePay' ? 'G Pay' : 'VISA'}
            </div>
            <div className="mt-4 text-gray-500 text-sm">{tl(cfg.business.name)}</div>
            <div className="text-3xl font-extrabold mt-1 tabular-nums">{amount}</div>
            {method === 'card' && <div className="text-sm text-gray-500 mt-1" dir="ltr">Visa •••• 4242</div>}
            <Button block size="lg" variant="dark" className="mt-6" onClick={run}>
              {method === 'applePay' ? tr('Confirm with Face ID', 'التأكيد عبر Face ID') : tr('Confirm payment', 'تأكيد الدفع')}
            </Button>
            <button onClick={onCancel} className="mt-3 text-sm text-gray-500">{tr('Cancel', 'إلغاء')}</button>
          </>
        )}
        {stage !== 'confirm' && (
          <div className="py-8">
            <div className={cx('mx-auto h-20 w-20 rounded-full grid place-items-center transition', stage === 'done' ? 'bg-emerald-500 text-white animate-[pop_.35s_ease]' : 'border-4 border-gray-200 border-t-brand animate-spin')}>
              {stage === 'done' && <Check size={40} />}
            </div>
            <div className="mt-4 font-bold">{stage === 'done' ? tr('Order placed!', 'تم تقديم الطلب!') : tr('Processing…', 'جارٍ المعالجة…')}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function TrashBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="h-8 w-8 grid place-items-center text-gray-400"><Trash2 size={16} /></button>;
}
