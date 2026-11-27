import { useState } from 'react';
import QRCodeLib from 'qrcode';
import { Plus, Trash2, Printer, Send, Bell } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { audienceOf, sendCampaign, staticCode, track, campaignResults } from '../../lib/ops';
import type { Deal, DealKind, Reward, Audience } from '../../lib/types';
import { fmtDate, timeAgo, uid } from '../../lib/utils';
import { Badge, Button, Card, Field, Input, Modal, Select, Stat, Textarea, Toggle, cx, Segmented } from '../../components/ui';
import { QRCode } from '../../components/qr';
import { PageHead } from './OwnerApp';
import { Countdown } from '../customer/Home';

export function Loyalty() {
  const { cfg, data, tr, tl, update, id } = useDemo();
  const L = cfg.loyalty;
  const setL = (fn: (l: typeof L) => void) => update((d) => { fn(d.config.loyalty); track(d, 'editSettings'); });
  const members = data.customers.filter((c) => c.lifetimePoints > 0).length;
  const issued = data.ledger.filter((l) => l.points > 0).reduce((s, l) => s + l.points, 0);
  const redeemed = data.ledger.filter((l) => l.source === 'reward').length;

  const printQr = async () => {
    const url = await QRCodeLib.toDataURL(staticCode(id), { width: 800, margin: 1 });
    const w = window.open('', '_blank');
    if (!w) return toast(tr('Allow pop-ups to print', 'اسمح بالنوافذ المنبثقة للطباعة'), 'error');
    w.document.write(`<!doctype html><html><head><title>QR</title><style>body{font-family:system-ui;text-align:center;padding:40px}h1{margin:0 0 6px}p{color:#555;font-size:20px}img{width:420px;margin:24px auto;display:block}.b{display:inline-block;padding:14px 28px;border-radius:999px;background:${cfg.brand.primary};color:#fff;font-weight:700;font-size:22px}</style></head><body><div style="font-size:64px">${cfg.business.logoEmoji}</div><h1>${tl(cfg.business.name)}</h1><p>Scan with our app to earn points · امسح بتطبيقنا لكسب النقاط</p><img src="${url}"/><div class="b">${L.pointsPerUnit} points per ${cfg.business.currency} 1</div><script>setTimeout(()=>print(),300)</script></body></html>`);
    w.document.close();
  };

  return (
    <>
      <PageHead title={tr('Loyalty program', 'برنامج الولاء')} sub={tr('How customers earn and what they can redeem.', 'كيف يكسب الزبائن وما يمكنهم استبداله.')} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={tr('Members', 'الأعضاء')} value={members} />
        <Stat label={tr('Points issued', 'النقاط الممنوحة')} value={issued.toLocaleString()} />
        <Stat label={tr('Rewards redeemed', 'المكافآت المستبدلة')} value={redeemed} />
        <Stat label={tr('Active vouchers', 'القسائم الفعّالة')} value={data.vouchers.filter((v) => v.status === 'active').length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-5 space-y-4">
          <Toggle checked={cfg.modules.loyaltyPoints} onChange={(v) => update((d) => void (d.config.modules.loyaltyPoints = v))} label={tr('Points program', 'برنامج النقاط')} desc={tr('Customers earn points on every purchase', 'يكسب الزبائن نقاطاً مع كل عملية شراء')} />
          {cfg.modules.loyaltyPoints && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr(`Points per ${cfg.business.currency} 1`, `نقاط لكل 1 ${cfg.business.currency}`)}><Input type="number" value={L.pointsPerUnit} onChange={(e) => setL((l) => void (l.pointsPerUnit = Math.max(0, +e.target.value)))} /></Field>
              <Field label={tr('Sign-up bonus', 'هدية التسجيل')}><Input type="number" value={L.signupBonus} onChange={(e) => setL((l) => void (l.signupBonus = Math.max(0, +e.target.value)))} /></Field>
            </div>
          )}
          <div className="border-t border-gray-100 pt-4">
            <Toggle checked={cfg.modules.referrals} onChange={(v) => update((d) => void (d.config.modules.referrals = v))} label={tr('Referrals & birthday rewards', 'الإحالات وهدايا عيد الميلاد')} desc={tr('Invite-a-friend codes and an automatic birthday gift', 'رموز دعوة الأصدقاء وهدية تلقائية في عيد الميلاد')} />
          </div>
          {cfg.modules.referrals && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr('Referral bonus (points each)', 'مكافأة الإحالة (نقاط لكل طرف)')}><Input type="number" value={L.referralBonus} onChange={(e) => setL((l) => void (l.referralBonus = Math.max(0, +e.target.value)))} /></Field>
              <Field label={tr('Birthday gift (English)', 'هدية عيد الميلاد (إنجليزي)')}><Input value={L.birthdayReward.en} onChange={(e) => setL((l) => void (l.birthdayReward.en = e.target.value))} /></Field>
              <Field label={tr('Birthday gift (Arabic)', 'هدية عيد الميلاد (عربي)')} className="col-span-2"><Input dir="rtl" value={L.birthdayReward.ar ?? ''} onChange={(e) => setL((l) => void (l.birthdayReward.ar = e.target.value))} /></Field>
            </div>
          )}
          <div className="border-t border-gray-100 pt-4">
            <Toggle checked={cfg.modules.loyaltyStamps} onChange={(v) => update((d) => void (d.config.modules.loyaltyStamps = v))} label={tr('Digital stamp card', 'بطاقة الأختام الرقمية')} desc={tr('Buy X, get one free', 'اشترِ عدداً واحصل على واحد مجاناً')} />
          </div>
          {cfg.modules.loyaltyStamps && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={tr('Stamps needed', 'الأختام المطلوبة')}><Input type="number" min={3} max={12} value={L.stampsTarget} onChange={(e) => setL((l) => void (l.stampsTarget = Math.min(12, Math.max(3, +e.target.value))))} /></Field>
                <Field label={tr('One stamp per', 'ختم واحد لكل')}>
                  <Select value={L.stampRule} onChange={(e) => setL((l) => void (l.stampRule = e.target.value as 'perOrder'))}>
                    <option value="perOrder">{tr('Order', 'طلب')}</option>
                    <option value="perItem">{tr('Eligible item', 'منتج مؤهل')}</option>
                  </Select>
                </Field>
                <Field label={tr('Reward (English)', 'المكافأة (إنجليزي)')}><Input value={L.stampReward.en} onChange={(e) => setL((l) => void (l.stampReward.en = e.target.value))} /></Field>
                <Field label={tr('Reward (Arabic)', 'المكافأة (عربي)')}><Input dir="rtl" value={L.stampReward.ar ?? ''} onChange={(e) => setL((l) => void (l.stampReward.ar = e.target.value))} /></Field>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1.5">{tr('Categories that earn stamps', 'الفئات التي تمنح أختاماً')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.categories.map((c) => {
                    const on = L.stampCategoryIds.includes(c.id);
                    return <button key={c.id} onClick={() => setL((l) => void (l.stampCategoryIds = on ? l.stampCategoryIds.filter((x) => x !== c.id) : [...l.stampCategoryIds, c.id]))}
                      className={cx('rounded-full px-3 py-1 text-sm font-semibold border', on ? 'bg-brand text-onbrand border-brand' : 'bg-white border-gray-200')}>{c.emoji} {tl(c.name)}</button>;
                  })}
                </div>
                <div className="text-xs text-gray-500 mt-1">{tr('None selected = everything counts.', 'إن لم تختر شيئاً = كل المنتجات تُحتسب.')}</div>
              </div>
            </>
          )}
          <div className="border-t border-gray-100 pt-4">
            <Toggle checked={cfg.modules.vipTiers} onChange={(v) => update((d) => void (d.config.modules.vipTiers = v))} label={tr('VIP tiers', 'مستويات VIP')} desc={tr('Bonus points for your best customers', 'نقاط إضافية لأفضل زبائنك')} />
          </div>
          {cfg.modules.vipTiers && (
            <div className="space-y-2">
              {L.tiers.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2">
                  <input type="color" value={t.color} onChange={(e) => setL((l) => void (l.tiers[i].color = e.target.value))} className="h-9 w-9 rounded-lg" />
                  <Input value={t.name.en} onChange={(e) => setL((l) => void (l.tiers[i].name.en = e.target.value))} className="!h-9" />
                  <Input type="number" value={t.minPoints} onChange={(e) => setL((l) => void (l.tiers[i].minPoints = +e.target.value))} className="!h-9 !w-24" title="min points" />
                  <Input type="number" step="0.25" value={t.multiplier} onChange={(e) => setL((l) => void (l.tiers[i].multiplier = +e.target.value))} className="!h-9 !w-20" title="multiplier" />
                </div>
              ))}
              <div className="text-xs text-gray-500">{tr('Name · lifetime points needed · points multiplier', 'الاسم · النقاط الإجمالية المطلوبة · مضاعف النقاط')}</div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <Toggle checked={cfg.modules.staticQr} onChange={(v) => update((d) => void (d.config.modules.staticQr = v))} label={tr('Counter QR code', 'رمز QR على الكاشير')} desc={tr('A printed code customers scan after paying', 'رمز مطبوع يمسحه الزبائن بعد الدفع')} />
            {cfg.modules.staticQr && (
              <div className="mt-4 flex gap-4">
                <div className="text-center">
                  <div className="rounded-xl border p-2 bg-white inline-block"><QRCode value={staticCode(id)} size={130} /></div>
                  <Button size="sm" variant="outline" className="mt-2" icon={<Printer size={14} />} onClick={printQr}>{tr('Print', 'طباعة')}</Button>
                </div>
                <div className="flex-1 space-y-2.5">
                  <div className="text-sm font-semibold">{tr('Fraud protection', 'الحماية من الاحتيال')}</div>
                  <Field label={tr('Max scans per day', 'الحد الأقصى يومياً')}><Input type="number" value={L.staticQr.dailyLimit} onChange={(e) => setL((l) => void (l.staticQr.dailyLimit = Math.max(1, +e.target.value)))} className="!h-9" /></Field>
                  <Field label={tr('Minutes between scans', 'دقائق بين كل مسح')}><Input type="number" value={L.staticQr.cooldownMinutes} onChange={(e) => setL((l) => void (l.staticQr.cooldownMinutes = Math.max(0, +e.target.value)))} className="!h-9" /></Field>
                  <Toggle checked={L.staticQr.requirePin} onChange={(v) => setL((l) => void (l.staticQr.requirePin = v))} label={tr('Require staff PIN', 'يتطلب رمز الموظف')} />
                  {L.staticQr.requirePin && <Input value={L.staticQr.pin} onChange={(e) => setL((l) => void (l.staticQr.pin = e.target.value.slice(0, 6)))} className="!h-9 !w-28" />}
                </div>
              </div>
            )}
          </Card>
          {cfg.modules.loyaltyPoints && <RewardsEditor />}
        </div>
      </div>
    </>
  );
}

function RewardsEditor() {
  const { data, tr, tl, update } = useDemo();
  const add = () => update((d) => void d.data.rewards.push({ id: 'rw' + uid(), name: { en: 'New reward', ar: 'مكافأة جديدة' }, cost: 200, kind: 'discount', value: 3, emoji: '🎁', active: true }));
  const set = (i: number, v: Partial<Reward>) => update((d) => void Object.assign(d.data.rewards[i], v));
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold">{tr('Rewards catalog', 'كتالوج المكافآت')}</div>
        <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={add}>{tr('Add', 'إضافة')}</Button>
      </div>
      <div className="space-y-3">
        {data.rewards.map((r, i) => (
          <div key={r.id} className={cx('rounded-xl border border-gray-200 p-3', !r.active && 'opacity-60')}>
            <div className="flex items-center gap-2">
              <Input value={r.emoji} onChange={(e) => set(i, { emoji: e.target.value })} className="!w-12 !h-9 !px-1 text-center" />
              <Input value={r.name.en} onChange={(e) => set(i, { name: { ...r.name, en: e.target.value } })} className="!h-9" />
              <Input dir="rtl" value={r.name.ar ?? ''} onChange={(e) => set(i, { name: { ...r.name, ar: e.target.value } })} className="!h-9" />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Input type="number" value={r.cost} onChange={(e) => set(i, { cost: Math.max(1, +e.target.value) })} className="!h-9 !w-24" />
              <span className="text-xs text-gray-500">{tr('pts', 'نقطة')}</span>
              <Select value={r.kind} onChange={(e) => set(i, { kind: e.target.value as Reward['kind'] })} className="!h-9 !w-32">
                <option value="discount">{tr('Discount', 'خصم')}</option>
                <option value="item">{tr('Free item', 'منتج مجاني')}</option>
              </Select>
              {r.kind === 'discount' ? (
                <Input type="number" value={r.value} onChange={(e) => set(i, { value: Math.max(0, +e.target.value) })} className="!h-9 !w-20" />
              ) : (
                <Select value={r.productId ?? ''} onChange={(e) => set(i, { productId: e.target.value })} className="!h-9 flex-1 min-w-32">
                  {data.products.map((p) => <option key={p.id} value={p.id}>{tl(p.name)}</option>)}
                </Select>
              )}
              <div className="ms-auto flex items-center gap-2">
                <Toggle checked={r.active} onChange={(v) => set(i, { active: v })} />
                <button className="text-rose-600" onClick={() => update((d) => void (d.data.rewards = d.data.rewards.filter((x) => x.id !== r.id)))}><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const DEAL_BGS = ['#fde68a', '#d9f99d', '#fecaca', '#bfdbfe', '#e9d5ff', '#fbcfe8', '#fed7aa', '#a7f3d0'];

export function Deals() {
  const { data, tr, tl, m, update, lang } = useDemo();
  const [edit, setEdit] = useState<Deal | null>(null);
  const kindLabel = (d: Deal) => (d.kind === 'percent' ? `${d.value}%` : d.kind === 'fixed' ? m(d.value) : tr('Free delivery', 'توصيل مجاني'));
  return (
    <>
      <PageHead title={tr('Deals & coupons', 'العروض والقسائم')} sub={tr('Shown on the app home screen. Customers apply codes at checkout.', 'تظهر في الصفحة الرئيسية للتطبيق. يستخدم الزبائن الرموز عند الدفع.')} action={
        <Button icon={<Plus size={16} />} onClick={() => setEdit({ id: 'd' + uid(), title: { en: '', ar: '' }, desc: { en: '', ar: '' }, code: '', kind: 'percent', value: 10, minOrder: 0, emoji: '🎉', bg: DEAL_BGS[0], active: true })}>{tr('New deal', 'عرض جديد')}</Button>
      } />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.deals.map((d) => {
          const ended = d.endsAt && d.endsAt < Date.now();
          return (
            <Card key={d.id} className={cx('overflow-hidden', (!d.active || ended) && 'opacity-60')} onClick={() => setEdit(structuredClone(d))}>
              <div className="p-4" style={{ background: d.bg }}>
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{d.emoji}</span>
                  {d.endsAt && !ended && <Countdown to={d.endsAt} />}
                </div>
                <div className="font-bold mt-2 text-gray-900">{tl(d.title)}</div>
              </div>
              <div className="p-3 flex items-center gap-2 text-sm">
                <span className="font-mono font-bold">{d.code}</span>
                <Badge>{kindLabel(d)}</Badge>
                {d.minOrder > 0 && <span className="text-xs text-gray-500">{tr('min', 'حد أدنى')} {m(d.minOrder)}</span>}
                <span className="ms-auto text-xs">{ended ? tr('Ended', 'انتهى') : d.active ? tr('Live', 'نشط') : tr('Off', 'متوقف')}</span>
              </div>
            </Card>
          );
        })}
      </div>
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={tr('Deal', 'العرض')} footer={
          <div className="flex gap-2">
            {data.deals.some((x) => x.id === edit.id) && <Button variant="ghost" className="!text-rose-600" icon={<Trash2 size={16} />} onClick={() => { update((d) => void (d.data.deals = d.data.deals.filter((x) => x.id !== edit.id))); setEdit(null); }}>{tr('Delete', 'حذف')}</Button>}
            <div className="flex-1" />
            <Button onClick={() => {
              if (!edit.title.en.trim() || !edit.code.trim()) return toast(tr('Add a title and a code', 'أضف عنواناً ورمزاً'), 'error');
              update((d) => {
                const i = d.data.deals.findIndex((x) => x.id === edit.id);
                if (i >= 0) d.data.deals[i] = edit;
                else d.data.deals.unshift(edit);
                track(d, 'editSettings');
              });
              setEdit(null);
              toast(tr('Deal saved', 'تم حفظ العرض'));
            }}>{tr('Save', 'حفظ')}</Button>
          </div>
        }>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={tr('Title (English)', 'العنوان (إنجليزي)')}><Input value={edit.title.en} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, en: e.target.value } })} /></Field>
            <Field label={tr('Title (Arabic)', 'العنوان (عربي)')}><Input dir="rtl" value={edit.title.ar ?? ''} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, ar: e.target.value } })} /></Field>
            <Field label={tr('Description (English)', 'الوصف (إنجليزي)')}><Input value={edit.desc.en} onChange={(e) => setEdit({ ...edit, desc: { ...edit.desc, en: e.target.value } })} /></Field>
            <Field label={tr('Description (Arabic)', 'الوصف (عربي)')}><Input dir="rtl" value={edit.desc.ar ?? ''} onChange={(e) => setEdit({ ...edit, desc: { ...edit.desc, ar: e.target.value } })} /></Field>
            <Field label={tr('Code', 'الرمز')}><Input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase().replace(/\s/g, '') })} className="font-mono" dir="ltr" /></Field>
            <Field label={tr('Type', 'النوع')}>
              <Select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as DealKind })}>
                <option value="percent">{tr('% off', 'خصم %')}</option>
                <option value="fixed">{tr('Amount off', 'خصم مبلغ')}</option>
                <option value="freeDelivery">{tr('Free delivery', 'توصيل مجاني')}</option>
              </Select>
            </Field>
            {edit.kind !== 'freeDelivery' && <Field label={edit.kind === 'percent' ? '%' : tr('Amount', 'المبلغ')}><Input type="number" value={edit.value} onChange={(e) => setEdit({ ...edit, value: Math.max(0, +e.target.value) })} /></Field>}
            <Field label={tr('Minimum order', 'الحد الأدنى للطلب')}><Input type="number" value={edit.minOrder} onChange={(e) => setEdit({ ...edit, minOrder: Math.max(0, +e.target.value) })} /></Field>
            <Field label={tr('Flash deal (ends in)', 'عرض سريع (ينتهي خلال)')}>
              <Select value={edit.endsAt ? 'keep' : '0'} onChange={(e) => setEdit({ ...edit, endsAt: e.target.value === '0' ? undefined : e.target.value === 'keep' ? edit.endsAt : Date.now() + +e.target.value * 3600000 })}>
                <option value="0">{tr('No end', 'بدون نهاية')}</option>
                {edit.endsAt && <option value="keep">{fmtDate(edit.endsAt, lang, { dateStyle: 'short', timeStyle: 'short' })}</option>}
                <option value="2">2h</option><option value="6">6h</option><option value="24">24h</option><option value="72">3d</option>
              </Select>
            </Field>
            <Field label={tr('Look', 'الشكل')}>
              <div className="flex items-center gap-2">
                <Input value={edit.emoji} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} className="!w-14 text-center" />
                {DEAL_BGS.map((b) => <button key={b} onClick={() => setEdit({ ...edit, bg: b })} className={cx('h-7 w-7 rounded-full border', edit.bg === b && 'ring-2 ring-gray-900 ring-offset-1')} style={{ background: b }} />)}
              </div>
            </Field>
          </div>
          <div className="mt-4"><Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label={tr('Active', 'نشط')} /></div>
        </Modal>
      )}
    </>
  );
}

export function Campaigns() {
  const { demo, cfg, data, tr, tl, update, lang, m } = useDemo();
  const [title, setTitle] = useState({ en: '', ar: '' });
  const [body, setBody] = useState({ en: '', ar: '' });
  const [aud, setAud] = useState<Audience>('all');
  const [offer, setOffer] = useState(0);
  const templates = [
    { t: { en: '☀️ Weekend special', ar: '☀️ عرض نهاية الأسبوع' }, b: { en: 'Double points on every order this weekend!', ar: 'نقاط مضاعفة على كل طلب هذا الأسبوع!' } },
    { t: { en: 'We miss you 💛', ar: 'اشتقنا لك 💛' }, b: { en: 'Come back today and get 15% off with code BACK15.', ar: 'عُد اليوم واحصل على خصم 15% مع الرمز BACK15.' } },
    { t: { en: '🆕 Just landed', ar: '🆕 وصل حديثاً' }, b: { en: 'Our new arrivals are here — be the first to try them.', ar: 'وصلت منتجاتنا الجديدة — كن أول من يجرّبها.' } },
  ];
  const AUD: { k: Audience; en: string; ar: string; hint: [string, string]; show?: boolean }[] = [
    { k: 'all', en: 'Everyone', ar: 'الجميع', hint: ['All customers', 'كل الزبائن'] },
    { k: 'regulars', en: 'Regulars', ar: 'الدائمون', hint: ['5+ orders in the last 30 days', '5 طلبات أو أكثر في آخر 30 يوماً'] },
    { k: 'quiet', en: 'Went quiet', ar: 'انقطعوا', hint: ['Used to order, nothing for 21+ days', 'كانوا يطلبون، لا شيء منذ 21 يوماً+'] },
    { k: 'new', en: 'New', ar: 'جدد', hint: ['Joined in the last 14 days', 'انضموا خلال 14 يوماً'] },
    { k: 'birthdays', en: 'Birthdays this week', ar: 'أعياد ميلاد هذا الأسبوع', hint: ['Birthday in the next 7 days', 'عيد ميلادهم خلال 7 أيام'] },
    { k: 'vip', en: 'VIP', ar: 'VIP', hint: ['Silver tier and above', 'المستوى الفضي وما فوق'], show: cfg.modules.vipTiers },
  ];
  const counts = Object.fromEntries(AUD.map((a) => [a.k, audienceOf(demo, a.k).length])) as Record<Audience, number>;
  return (
    <>
      <PageHead title={tr('Push notifications', 'الإشعارات الفورية')} sub={tr('Reach every customer’s phone in one tap.', 'صل إلى هاتف كل زبون بضغطة واحدة.')} />
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <Card className="p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {templates.map((x) => <button key={x.t.en} onClick={() => { setTitle({ en: x.t.en, ar: x.t.ar }); setBody({ en: x.b.en, ar: x.b.ar }); }} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium">{tl(x.t)}</button>)}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={tr('Title (English)', 'العنوان (إنجليزي)')}><Input value={title.en} onChange={(e) => setTitle({ ...title, en: e.target.value })} /></Field>
            <Field label={tr('Title (Arabic)', 'العنوان (عربي)')}><Input dir="rtl" value={title.ar} onChange={(e) => setTitle({ ...title, ar: e.target.value })} /></Field>
            <Field label={tr('Message (English)', 'الرسالة (إنجليزي)')}><Textarea value={body.en} onChange={(e) => setBody({ ...body, en: e.target.value })} /></Field>
            <Field label={tr('Message (Arabic)', 'الرسالة (عربي)')}><Textarea dir="rtl" value={body.ar} onChange={(e) => setBody({ ...body, ar: e.target.value })} /></Field>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1.5">{tr('Send to', 'إرسال إلى')}</div>
            <div className="grid sm:grid-cols-3 gap-2">
              {AUD.filter((a) => a.show !== false).map((a) => (
                <button key={a.k} type="button" onClick={() => setAud(a.k)} className={cx('rounded-xl border-2 p-2.5 text-start', aud === a.k ? 'border-gray-900' : 'border-gray-200')}>
                  <div className="flex justify-between font-semibold text-sm"><span>{tr(a.en, a.ar)}</span><span className="tabular-nums">{counts[a.k]}</span></div>
                  <div className="text-[11px] text-gray-500">{tr(a.hint[0], a.hint[1])}</div>
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1.5">{tr('Audiences update by themselves every night from each customer’s orders.', 'تتحدّث الفئات تلقائياً كل ليلة حسب طلبات كل زبون.')}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1.5">{tr('Attach an offer', 'أرفق عرضاً')}</div>
            <div className="flex gap-1.5">
              {[0, 10, 15, 20, 25].map((v) => (
                <button key={v} type="button" onClick={() => setOffer(v)} className={cx('flex-1 rounded-lg border py-2 text-sm font-semibold', offer === v ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200')}>{v ? `${v}% off` : tr('None', 'بدون')}</button>
              ))}
            </div>
            {offer > 0 && <div className="text-xs text-gray-500 mt-1">{tr('Creates a personal code valid 14 days, and tracks every order that uses it.', 'ينشئ رمزاً صالحاً 14 يوماً ويتتبع كل طلب يستخدمه.')}</div>}
          </div>
          <Button size="lg" block icon={<Send size={18} />} disabled={!title.en.trim()} onClick={() => {
            let n = 0;
            update((d) => void (n = sendCampaign(d, { en: title.en, ar: title.ar || undefined }, { en: body.en, ar: body.ar || undefined }, aud, offer)));
            setOffer(0);
            toast(tr(`Sent to ${n} customers 🚀 — switch to Customer to see it`, `أُرسل إلى ${n} زبوناً 🚀 — انتقل إلى الزبون لتراه`));
            setTitle({ en: '', ar: '' });
            setBody({ en: '', ar: '' });
          }}>{tr('Send now', 'أرسل الآن')}</Button>
        </Card>
        <div>
          <div className="text-sm font-semibold text-gray-500 mb-2">{tr('Preview', 'معاينة')}</div>
          <div className="rounded-[28px] bg-gradient-to-b from-sky-200 to-indigo-300 p-4 h-56">
            <div className="rounded-2xl bg-white/85 backdrop-blur p-3 shadow-lg flex gap-3">
              <span className="h-10 w-10 rounded-xl bg-brand text-onbrand grid place-items-center text-xl shrink-0">{cfg.business.logoEmoji}</span>
              <div className="min-w-0">
                <div className="flex justify-between text-[11px] text-gray-500"><span className="font-semibold uppercase">{tl(cfg.business.name)}</span><span>{tr('now', 'الآن')}</span></div>
                <div className="font-semibold text-sm">{(lang === 'ar' ? title.ar || title.en : title.en) || tr('Your title', 'عنوانك')}</div>
                <div className="text-sm text-gray-700 line-clamp-3">{(lang === 'ar' ? body.ar || body.en : body.en) || tr('Your message…', 'رسالتك…')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <h2 className="font-bold text-lg mt-8 mb-3">{tr('Sent', 'المُرسلة')}</h2>
      <Card className="divide-y divide-gray-100">
        {data.campaigns.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-4">
            <span className="h-9 w-9 rounded-full bg-gray-100 grid place-items-center"><Bell size={16} /></span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{tl(c.title)}</div>
              <div className="text-sm text-gray-500 truncate">{tl(c.body)}</div>
            </div>
            {(() => {
              const res = campaignResults(demo, c.code);
              return res ? (
                <div className="hidden sm:grid grid-cols-3 gap-4 text-center text-sm">
                  <div><div className="font-bold">{res.uses}</div><div className="text-[11px] text-gray-500">{tr('used', 'استخدام')}</div></div>
                  <div><div className="font-bold text-emerald-700">{m(Math.round(res.sales))}</div><div className="text-[11px] text-gray-500">{tr('sales', 'مبيعات')}</div></div>
                  <div><div className="font-bold text-rose-600">{m(Math.round(res.cost))}</div><div className="text-[11px] text-gray-500">{tr('cost', 'تكلفة')}</div></div>
                </div>
              ) : null;
            })()}
            <div className="text-end text-sm min-w-[90px]">
              <div className="font-semibold">{c.reach} {tr('reached', 'وصلت')}</div>
              <div className="text-xs text-gray-400">{timeAgo(c.sentAt, lang)}{c.code && <span className="ms-1 font-mono">· {c.code}</span>}</div>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
