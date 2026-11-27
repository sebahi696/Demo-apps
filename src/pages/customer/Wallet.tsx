import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Wallet as WalletIcon, Gift, Plus, ArrowDownLeft, ArrowUpRight, Copy } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { CLIENT_MODE } from '../../lib/client';
import { toast } from '../../lib/store';
import { buyGiftCard, me, redeemGiftCard, topUp, track } from '../../lib/ops';
import type { GiftCard } from '../../lib/types';
import { timeAgo } from '../../lib/utils';
import { Button, Field, Input, Modal, Segmented, Textarea, cx } from '../../components/ui';
import { Screen } from './CustomerApp';

/** Stored-value wallet: top-ups with bonus, gift cards to send and redeem. */
export function Wallet() {
  const { demo, cfg, data, tr, tl, m, update, lang } = useDemo();
  const c = me(demo);
  const [tab, setTab] = useState<'topup' | 'gift' | 'redeem'>('topup');
  const [amount, setAmount] = useState(cfg.wallet.topUps[1] ?? 25);
  const [confirm, setConfirm] = useState(false);
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState('');
  const [codeIn, setCodeIn] = useState('');
  const [card, setCard] = useState<GiftCard | null>(null);
  const tx = data.walletTx.filter((t) => t.customerId === c.id).slice(0, 15);
  const bonus = (amount * cfg.wallet.bonusPercent) / 100;
  const txLabel = { topup: tr('Top-up', 'شحن'), bonus: tr('Bonus', 'مكافأة'), payment: tr('Payment', 'دفع'), gift: tr('Gift card', 'بطاقة هدية'), refund: tr('Refund', 'استرداد') };

  return (
    <Screen title={tr('Wallet', 'المحفظة')} back>
      <div className="rounded-app-lg bg-gradient-to-br from-brand to-gray-900 text-white p-5 relative overflow-hidden">
        <div className="flex items-center gap-2 text-sm opacity-80"><WalletIcon size={16} /> {tl(cfg.business.name)}</div>
        <div className="text-4xl font-extrabold mt-3 tabular-nums">{m(c.wallet)}</div>
        <div className="text-sm opacity-70 mt-1">{tr('Pay in one tap at checkout or in store', 'ادفع بلمسة عند الدفع أو في المتجر')}</div>
        <div className="absolute -end-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      </div>

      <Segmented className="mt-4" value={tab} onChange={setTab} options={[
        { value: 'topup', label: tr('Top up', 'شحن') },
        { value: 'gift', label: tr('Send a gift', 'أرسل هدية') },
        { value: 'redeem', label: tr('Redeem', 'استرداد') },
      ]} />

      {tab === 'topup' && (
        <div className="mt-4">
          <div className="grid grid-cols-4 gap-2">
            {cfg.wallet.topUps.map((v) => (
              <button key={v} onClick={() => setAmount(v)} className={cx('rounded-app border-2 py-3 font-bold', amount === v ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200 bg-white')}>{m(v)}</button>
            ))}
          </div>
          {cfg.wallet.bonusPercent > 0 && (
            <div className="mt-3 rounded-app bg-emerald-50 text-emerald-800 text-sm font-medium p-3">🎁 {tr(`Get ${cfg.wallet.bonusPercent}% extra: +${m(bonus)} free`, `احصل على ${cfg.wallet.bonusPercent}% إضافية: +${m(bonus)} مجاناً`)}</div>
          )}
          <Button block size="lg" className="mt-3" icon={<Plus size={18} />} onClick={() => setConfirm(true)}>{tr(`Add ${m(amount)}`, `أضف ${m(amount)}`)}</Button>
        </div>
      )}

      {tab === 'gift' && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {cfg.wallet.topUps.map((v) => (
              <button key={v} onClick={() => setAmount(v)} className={cx('rounded-app border-2 py-3 font-bold', amount === v ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200 bg-white')}>{m(v)}</button>
            ))}
          </div>
          <Field label={tr('To', 'إلى')}><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder={tr('Friend’s name', 'اسم الصديق')} /></Field>
          <Field label={tr('Message', 'الرسالة')}><Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={tr('Happy birthday! ☕', 'عيد ميلاد سعيد! ☕')} className="!min-h-[64px]" /></Field>
          <Button block size="lg" icon={<Gift size={18} />} disabled={!to.trim()} onClick={() => {
            let g: GiftCard | null = null;
            update((d) => void (g = buyGiftCard(d, amount, to.trim(), msg.trim())));
            setCard(g);
            setTo('');
            setMsg('');
          }}>{tr(`Buy ${m(amount)} gift card`, `اشترِ بطاقة هدية ${m(amount)}`)}</Button>
          <p className="text-xs text-gray-500 text-center">{tr('Demo mode — no real payment is made.', 'وضع تجريبي — لا يتم أي دفع حقيقي.')}</p>
        </div>
      )}

      {tab === 'redeem' && (
        <form className="mt-4" onSubmit={(e) => {
          e.preventDefault();
          let res: ReturnType<typeof redeemGiftCard> = { ok: false };
          update((d) => void (res = redeemGiftCard(d, codeIn)));
          if (res.ok) { toast(tr(`${m(res.amount!)} added to your wallet 🎉`, `تمت إضافة ${m(res.amount!)} إلى محفظتك 🎉`)); setCodeIn(''); }
          else toast(tl(res.error), 'error');
        }}>
          <Field label={tr('Gift card code', 'رمز بطاقة الهدية')}><Input value={codeIn} onChange={(e) => setCodeIn(e.target.value.toUpperCase())} placeholder="GIFT-XXXXXX" className="font-mono" dir="ltr" /></Field>
          <Button block size="lg" className="mt-3">{tr('Redeem', 'استرداد')}</Button>
          {!CLIENT_MODE && data.giftCards.filter((g) => !g.redeemedBy).length > 0 && (
            <div className="mt-3 text-xs text-gray-500">{tr('Demo shortcut:', 'اختصار التجربة:')} {data.giftCards.filter((g) => !g.redeemedBy).slice(0, 3).map((g) => (
              <button type="button" key={g.code} onClick={() => setCodeIn(g.code)} className="font-mono font-bold text-brand me-2" dir="ltr">{g.code}</button>
            ))}</div>
          )}
        </form>
      )}

      {tx.length > 0 && (
        <>
          <h2 className="font-display font-bold text-lg mt-6 mb-2">{tr('Activity', 'الحركات')}</h2>
          <div className="rounded-app bg-white border border-gray-100 divide-y divide-gray-100">
            {tx.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 text-sm">
                <span className={cx('h-8 w-8 rounded-full grid place-items-center', t.amount >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>
                  {t.amount >= 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </span>
                <div className="flex-1"><div className="font-medium">{txLabel[t.kind]}{t.note && <span className="text-gray-400"> · {t.note}</span>}</div><div className="text-xs text-gray-400">{timeAgo(t.at, lang)}</div></div>
                <div className={cx('font-bold tabular-nums', t.amount >= 0 ? 'text-emerald-700' : '')}>{t.amount >= 0 ? '+' : '−'}{m(Math.abs(t.amount))}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} contained title={tr('Confirm top-up', 'تأكيد الشحن')}
        footer={<Button block size="lg" onClick={() => {
          let b = 0;
          update((d) => void (b = topUp(d, amount)));
          setConfirm(false);
          toast(tr(`${m(amount + b)} added to your wallet`, `تمت إضافة ${m(amount + b)} إلى محفظتك`));
        }}>{tr(`Pay ${m(amount)}`, `ادفع ${m(amount)}`)}</Button>}>
        <div className="text-center py-2">
          <div className="text-sm text-gray-500" dir="ltr">Visa •••• 4242</div>
          <div className="text-3xl font-extrabold mt-1">{m(amount)}</div>
          {bonus > 0 && <div className="text-emerald-700 font-semibold mt-1">+ {m(bonus)} {tr('bonus', 'مكافأة')}</div>}
        </div>
      </Modal>

      <Modal open={!!card} onClose={() => setCard(null)} contained title={tr('Gift card ready 🎁', 'بطاقة الهدية جاهزة 🎁')}>
        {card && (
          <div>
            <div className="rounded-app-lg bg-gradient-to-br from-brand2 to-brand p-5 text-white">
              <div className="text-sm opacity-80">{tl(cfg.business.name)}</div>
              <div className="text-3xl font-extrabold mt-2">{m(card.amount)}</div>
              <div className="mt-3 text-sm">{tr('For', 'إلى')} <b>{card.toName}</b> · {tr('from', 'من')} {card.fromName}</div>
              {card.message && <div className="mt-1 text-sm italic opacity-90">“{card.message}”</div>}
              <div className="mt-4 font-mono text-xl font-bold tracking-widest" dir="ltr">{card.code}</div>
            </div>
            <Button block variant="outline" className="mt-3" icon={<Copy size={16} />} onClick={async () => {
              await navigator.clipboard?.writeText(`🎁 ${card.toName}, here's a ${m(card.amount)} gift card for ${cfg.business.name.en}! Code: ${card.code}`).catch(() => {});
              toast(tr('Copied — paste it in WhatsApp', 'تم النسخ — الصقه في واتساب'));
            }}>{tr('Copy to send', 'انسخ للإرسال')}</Button>
          </div>
        )}
      </Modal>
    </Screen>
  );
}

/** Opened from a printed table QR: sets the table and starts a dine-in order. */
export function TableEntry() {
  const { table = '' } = useParams();
  const { update, tr } = useDemo();
  const nav = useNavigate();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    update((d) => {
      d.data.cart.table = table;
      track(d, 'tableQr');
    });
    toast(tr(`Welcome! Ordering for table ${table}`, `أهلاً! الطلب للطاولة ${table}`), 'info');
    nav('../menu', { replace: true });
  }, [table, update, nav, tr]);
  return null;
}
