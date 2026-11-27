import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Ticket, History, Crown, Store } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { CLIENT_MODE } from '../../lib/client';
import { toast } from '../../lib/store';
import { claimStatic, claimToken, me, parseScan, redeemReward, tierOf } from '../../lib/ops';
import type { Voucher } from '../../lib/types';
import { fmtDate, timeAgo } from '../../lib/utils';
import { Button, Input, Modal, cx, Field } from '../../components/ui';
import { QRCode, Scanner } from '../../components/qr';
import { Screen } from './CustomerApp';
import { LoyaltyCard, StampDots } from './Home';

export function Rewards() {
  const { demo, cfg, data, tr, tl, update, lang } = useDemo();
  const nav = useNavigate();
  const c = me(demo);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [show, setShow] = useState<Voucher | null>(null);
  const mine = data.vouchers.filter((v) => v.customerId === c.id);
  const ledger = data.ledger.filter((l) => l.customerId === c.id).slice(0, 15);
  const tier = tierOf(demo, c.lifetimePoints);
  const reward = data.rewards.find((r) => r.id === confirm);

  return (
    <Screen title={tr('Rewards', 'المكافآت')}>
      <LoyaltyCard hideStamps />
      <Button block size="lg" className="mt-3" icon={<QrCode size={20} />} onClick={() => nav('../scan')}>{tr('Scan to earn points', 'امسح لكسب النقاط')}</Button>

      {cfg.modules.loyaltyStamps && (
        <div className="mt-5 rounded-app-lg bg-white border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-bold text-lg">{tr('Stamp card', 'بطاقة الأختام')}</div>
            <span className="text-sm font-semibold">{c.stamps}/{cfg.loyalty.stampsTarget}</span>
          </div>
          <StampDots n={c.stamps} target={cfg.loyalty.stampsTarget} size="lg" />
          <div className="text-sm text-gray-500 mt-3">{tr(`Collect ${cfg.loyalty.stampsTarget} stamps → ${tl(cfg.loyalty.stampReward)}`, `اجمع ${cfg.loyalty.stampsTarget} أختام ← ${tl(cfg.loyalty.stampReward)}`)}</div>
        </div>
      )}

      {cfg.modules.loyaltyPoints && (
        <>
          <h2 className="font-display font-bold text-lg mt-6 mb-2.5">{tr('Redeem your points', 'استبدل نقاطك')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {data.rewards.filter((r) => r.active).map((r) => {
              const ok = c.points >= r.cost;
              return (
                <div key={r.id} className={cx('rounded-app bg-white border p-3 flex flex-col', ok ? 'border-brand/40' : 'border-gray-100')}>
                  <div className="text-4xl">{r.emoji}</div>
                  <div className="font-semibold mt-2 leading-tight flex-1">{tl(r.name)}</div>
                  <div className="text-sm font-bold text-brand mt-1">{r.cost} {tr('pts', 'نقطة')}</div>
                  <Button size="sm" className="mt-2" disabled={!ok} onClick={() => setConfirm(r.id)}>{ok ? tr('Redeem', 'استبدل') : tr(`${r.cost - c.points} pts to go`, `ينقصك ${r.cost - c.points}`)}</Button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {mine.length > 0 && (
        <>
          <h2 className="font-display font-bold text-lg mt-6 mb-2.5 flex items-center gap-2"><Ticket size={18} /> {tr('My vouchers', 'قسائمي')}</h2>
          <div className="space-y-2">
            {mine.map((v) => (
              <button key={v.id} onClick={() => setShow(v)} disabled={v.status === 'used'}
                className={cx('w-full flex items-center gap-3 rounded-app border-2 border-dashed p-3 text-start bg-white', v.status === 'used' ? 'opacity-50 border-gray-200' : 'border-brand/50')}>
                <span className="text-3xl">{v.emoji}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{tl(v.name)}</span>
                  <span className="block text-xs text-gray-500 font-mono" dir="ltr">{v.code}</span>
                </span>
                <span className={cx('text-xs font-bold rounded-full px-2 py-1', v.status === 'used' ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-800')}>
                  {v.status === 'used' ? tr('Used', 'مستخدمة') : tr('Show', 'عرض')}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {cfg.modules.vipTiers && (
        <>
          <h2 className="font-display font-bold text-lg mt-6 mb-2.5 flex items-center gap-2"><Crown size={18} /> {tr('Membership levels', 'مستويات العضوية')}</h2>
          <div className="rounded-app bg-white border border-gray-100 divide-y divide-gray-100">
            {cfg.loyalty.tiers.map((t) => (
              <div key={t.id} className={cx('flex items-center gap-3 p-3', tier?.id === t.id && 'bg-brand/5')}>
                <span className="h-9 w-9 rounded-full grid place-items-center text-white font-bold text-sm" style={{ background: t.color }}>{tl(t.name)[0]}</span>
                <div className="flex-1">
                  <div className="font-semibold">{tl(t.name)} {tier?.id === t.id && <span className="text-xs text-brand">· {tr('You', 'أنت')}</span>}</div>
                  <div className="text-xs text-gray-500">{t.minPoints.toLocaleString()} {tr('lifetime points', 'نقطة إجمالية')}</div>
                </div>
                <div className="text-sm font-bold">×{t.multiplier}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {ledger.length > 0 && (
        <>
          <h2 className="font-display font-bold text-lg mt-6 mb-2.5 flex items-center gap-2"><History size={18} /> {tr('History', 'السجل')}</h2>
          <div className="rounded-app bg-white border border-gray-100 divide-y divide-gray-100">
            {ledger.map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-3 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{sourceLabel(l.source, tr)}{l.note && l.source !== 'reward' ? ` · ${l.note}` : l.source === 'reward' ? ` · ${l.note}` : ''}</div>
                  <div className="text-xs text-gray-400">{timeAgo(l.at, lang)}</div>
                </div>
                <div className={cx('font-bold tabular-nums', l.points >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                  {l.points !== 0 && `${l.points > 0 ? '+' : ''}${l.points}`}{l.stamps ? ` ${l.points ? '· ' : ''}+${l.stamps}★` : ''}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={!!reward} onClose={() => setConfirm(null)} contained title={tr('Redeem reward?', 'استبدال المكافأة؟')}
        footer={<Button block size="lg" onClick={() => {
          let res: ReturnType<typeof redeemReward> = { ok: false };
          update((d) => void (res = redeemReward(d, reward!.id)));
          setConfirm(null);
          if (res.ok && res.voucher) { setShow(res.voucher); toast(tr('Reward unlocked! 🎉', 'تم فتح المكافأة! 🎉')); }
          else toast(tl(res.error), 'error');
        }}>{tr(`Use ${reward?.cost} points`, `استخدم ${reward?.cost} نقطة`)}</Button>}>
        {reward && (
          <div className="text-center py-3">
            <div className="text-6xl">{reward.emoji}</div>
            <div className="font-bold text-xl mt-3">{tl(reward.name)}</div>
            <div className="text-gray-500 mt-1">{tr(`You'll have ${c.points - reward.cost} points left.`, `سيتبقى لديك ${c.points - reward.cost} نقطة.`)}</div>
          </div>
        )}
      </Modal>

      <Modal open={!!show} onClose={() => setShow(null)} contained title={tr('Your voucher', 'قسيمتك')}>
        {show && (
          <div className="text-center pb-2">
            <div className="text-5xl">{show.emoji}</div>
            <div className="font-bold text-xl mt-2">{tl(show.name)}</div>
            <div className="mt-4 inline-block rounded-2xl border-2 border-gray-100 p-3 bg-white"><QRCode value={'DS-V:' + show.code} size={200} /></div>
            <div className="font-mono text-2xl font-extrabold tracking-widest mt-2" dir="ltr">{show.code}</div>
            <p className="text-sm text-gray-500 mt-3">{tr('Show this to the cashier — or apply it at checkout.', 'أظهرها للكاشير — أو استخدمها عند الدفع.')}</p>
            <p className="text-xs text-gray-400 mt-1">{tr('Issued', 'صدرت')} {fmtDate(show.createdAt, lang)}</p>
          </div>
        )}
      </Modal>
    </Screen>
  );
}

const sourceLabel = (s: string, tr: (a: string, b: string) => string) =>
  ({
    order: tr('Order', 'طلب'), qrStaff: tr('In-store QR', 'QR في المتجر'), qrStatic: tr('Counter QR', 'QR الكاشير'), reward: tr('Reward', 'مكافأة'),
    manual: tr('Adjustment', 'تعديل'), signup: tr('Welcome bonus', 'هدية الترحيب'), reservation: tr('Booking', 'حجز'),
    referral: tr('Referral', 'إحالة'), review: tr('Review', 'تقييم'),
  })[s] ?? s;

export function ScanEarn() {
  const { cfg, tr, tl, update, id } = useDemo();
  const nav = useNavigate();
  const [staticOpen, setStaticOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [result, setResult] = useState<{ points?: number; stamps?: number } | null>(null);

  const handle = (raw: string) => {
    const s = parseScan(raw);
    if (s.type === 'token') {
      let res: ReturnType<typeof claimToken> = { ok: false };
      update((d) => void (res = claimToken(d, s.value)));
      if (res.ok) setResult({ points: res.points, stamps: res.stamps });
      else toast(tl(res.error), 'error');
    } else if (s.type === 'static') {
      if (s.value !== id) return toast(tr('This QR belongs to another store', 'رمز QR هذا لمتجر آخر'), 'error');
      if (!cfg.modules.staticQr) return toast(tr('Counter QR is turned off', 'رمز QR الكاشير معطّل'), 'error');
      setStaticOpen(true);
    } else if (s.type === 'voucher') {
      toast(tr('That is a reward voucher — show it to the cashier.', 'هذه قسيمة مكافأة — أظهرها للكاشير.'), 'info');
    } else toast(tr('Unknown code', 'رمز غير معروف'), 'error');
  };

  return (
    <Screen title={tr('Scan & earn', 'امسح واكسب')} back>
      {result ? (
        <div className="text-center py-10 animate-[pop_.35s_ease]">
          <div className="text-7xl">🎉</div>
          <div className="text-3xl font-extrabold mt-4 text-brand">
            {result.points ? `+${result.points} ${tr('points', 'نقطة')}` : ''}{result.stamps ? ` +${result.stamps} ★` : ''}
          </div>
          <div className="text-gray-500 mt-1">{tr('Added to your balance', 'تمت الإضافة إلى رصيدك')}</div>
          <Button className="mt-6" onClick={() => nav('../rewards')}>{tr('See my rewards', 'عرض مكافآتي')}</Button>
        </div>
      ) : (
        <>
          <p className="text-gray-600 mb-3">{tr('Scan the QR code shown by the staff, or the one at the counter.', 'امسح رمز QR الذي يعرضه الموظف، أو الموجود على الكاشير.')}</p>
          <Scanner onResult={handle} />
          {!CLIENT_MODE && <div className="mt-4 rounded-app bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
            💡 {tr('Testing on one device? Switch to Staff → “Award points” to create a code, then tap “Simulate customer scan”.', 'تجرّب على جهاز واحد؟ انتقل إلى الموظف ← "منح النقاط" لإنشاء رمز، ثم اضغط "محاكاة مسح الزبون".')}
          </div>}
          {cfg.modules.staticQr && (
            <Button block variant="outline" className="mt-3" icon={<Store size={18} />} onClick={() => setStaticOpen(true)}>{tr('I scanned the counter QR', 'مسحت رمز QR على الكاشير')}</Button>
          )}
        </>
      )}
      <Modal open={staticOpen} onClose={() => setStaticOpen(false)} contained title={tr('How much did you spend?', 'كم دفعت؟')}
        footer={<Button block size="lg" onClick={() => {
          let res: ReturnType<typeof claimStatic> = { ok: false };
          update((d) => void (res = claimStatic(d, parseFloat(amount), pin)));
          if (res.ok) { setStaticOpen(false); setResult({ points: res.points, stamps: res.stamps }); setAmount(''); setPin(''); }
          else toast(tl(res.error), 'error');
        }}>{tr('Claim points', 'احصل على النقاط')}</Button>}>
        <div className="space-y-4">
          <Field label={tr(`Amount (${cfg.business.currency})`, `المبلغ (${cfg.business.currency})`)}>
            <Input type="number" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="12.50" />
          </Field>
          {cfg.loyalty.staticQr.requirePin && (
            <Field label={tr('Staff PIN', 'رمز الموظف')} hint={tr(`Ask the cashier. Demo PIN: ${cfg.loyalty.staticQr.pin}`, `اطلبه من الكاشير. رمز التجربة: ${cfg.loyalty.staticQr.pin}`)}>
              <Input kind="pin" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} />
            </Field>
          )}
          <p className="text-xs text-gray-500">{tr(`Limits: ${cfg.loyalty.staticQr.dailyLimit} scans per day, ${cfg.loyalty.staticQr.cooldownMinutes} min apart.`, `الحدود: ${cfg.loyalty.staticQr.dailyLimit} مسح يومياً، بفاصل ${cfg.loyalty.staticQr.cooldownMinutes} دقيقة.`)}</p>
        </div>
      </Modal>
    </Screen>
  );
}
