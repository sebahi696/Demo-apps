import { useState } from 'react';
import { Check, Smartphone, Globe } from 'lucide-react';
import { PLATFORM } from '../platform.config';
import { useI18n } from '../lib/i18n';
import { cx } from './ui';

const fmt = (n: number) => new Intl.NumberFormat('en', { style: 'currency', currency: PLATFORM.plans.currency, maximumFractionDigits: 0 }).format(n);

/** The two offers side by side: native store apps vs an installable web app. */
export function PlanCards({ chosen, dark }: { chosen?: string; dark?: boolean }) {
  const { tr } = useI18n();
  const P = PLATFORM.plans;
  const plans = [
    {
      k: 'native', icon: <Smartphone />, price: P.native.price,
      title: tr('Option 1 · Your own app', 'الخيار 1 · تطبيقك الخاص'),
      sub: tr('On the App Store and Google Play, under your name', 'على App Store و Google Play باسمك'),
      points: [
        tr('Your logo on customers’ phones, found by searching your name', 'شعارك على هواتف الزبائن، ويجدونه بالبحث عن اسمك'),
        tr('Push notifications on every iPhone and Android', 'إشعارات على كل iPhone و Android'),
        tr('The strongest trust and loyalty', 'أعلى ثقة وولاء'),
        tr('Store developer fees and publishing handled for you', 'رسوم المطوّر والنشر علينا'),
      ],
      timing: tr('Live in about 2–4 weeks (store review)', 'جاهز خلال 2–4 أسابيع تقريباً (مراجعة المتاجر)'),
    },
    {
      k: 'pwa', icon: <Globe />, price: P.pwa.price,
      title: tr('Option 2 · Web app (PWA)', 'الخيار 2 · تطبيق ويب (PWA)'),
      sub: tr('Installs from a link, works like an app', 'يُثبَّت من رابط ويعمل كتطبيق'),
      points: [
        tr('Same ordering, loyalty and dashboard', 'نفس الطلبات والولاء ولوحة التحكم'),
        tr('Customers add it to their home screen from your link or QR', 'يضيفه الزبائن إلى الشاشة الرئيسية من رابطك أو QR'),
        tr('No app-store review: updates go live instantly', 'بدون مراجعة المتاجر: التحديثات فورية'),
        tr('Lower cost; upgrade to Option 1 any time', 'تكلفة أقل؛ يمكن الترقية للخيار 1 بأي وقت'),
      ],
      timing: tr('Live in a few days', 'جاهز خلال أيام'),
    },
  ];
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {plans.map((p) => (
        <div key={p.k} className={cx('rounded-3xl p-6 border-2 relative', dark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200', chosen === p.k && 'ring-4 ring-amber-400 border-amber-400')}>
          {chosen === p.k && <span className="absolute -top-3 start-6 rounded-full bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1">{tr('Your choice', 'اختيارك')}</span>}
          <div className={cx('h-11 w-11 rounded-2xl grid place-items-center', dark ? 'bg-amber-400 text-gray-900' : 'bg-gray-900 text-amber-400')}>{p.icon}</div>
          <div className="font-extrabold text-lg mt-4">{p.title}</div>
          <div className={cx('text-sm', dark ? 'text-white/60' : 'text-gray-500')}>{p.sub}</div>
          <div className="mt-4 flex items-end gap-1"><span className="text-4xl font-extrabold">{fmt(p.price)}</span><span className={cx('text-sm mb-1', dark ? 'text-white/60' : 'text-gray-500')}>/ {tr('branch / month', 'فرع / شهر')}</span></div>
          <div className={cx('text-xs font-semibold mt-1', dark ? 'text-emerald-300' : 'text-emerald-700')}>{tr('0% commission on your orders', '0% عمولة على طلباتك')}</div>
          <ul className="mt-4 space-y-2 text-sm">
            {p.points.map((x) => <li key={x} className="flex gap-2"><Check size={16} className="shrink-0 mt-0.5 text-emerald-500" />{x}</li>)}
          </ul>
          <div className={cx('mt-4 text-xs', dark ? 'text-white/50' : 'text-gray-500')}>⏱ {p.timing}</div>
        </div>
      ))}
    </div>
  );
}

/** "What is delivery-app commission costing you?" */
export function CommissionCalc() {
  const { tr } = useI18n();
  const [orders, setOrders] = useState(600);
  const [avg, setAvg] = useState(15);
  const [pct, setPct] = useState(25);
  const sales = orders * avg;
  const lost = (sales * pct) / 100;
  const keep = lost - PLATFORM.plans.pwa.price;
  const Slider = ({ label, value, set, min, max, step, show }: { label: string; value: number; set: (v: number) => void; min: number; max: number; step: number; show: string }) => (
    <label className="block">
      <div className="flex justify-between text-sm"><span className="text-gray-600">{label}</span><b>{show}</b></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(+e.target.value)} className="w-full accent-gray-900 mt-1" />
    </label>
  );
  return (
    <div className="grid lg:grid-cols-2 gap-6 items-center">
      <div className="space-y-5">
        <Slider label={tr('Online orders a month', 'الطلبات أونلاين شهرياً')} value={orders} set={setOrders} min={50} max={3000} step={50} show={String(orders)} />
        <Slider label={tr('Average order', 'متوسط الطلب')} value={avg} set={setAvg} min={5} max={60} step={1} show={fmt(avg)} />
        <Slider label={tr('Delivery app commission', 'عمولة تطبيق التوصيل')} value={pct} set={setPct} min={10} max={35} step={1} show={`${pct}%`} />
        <p className="text-xs text-gray-400">{tr('An estimate, not a promise. Your own riders and marketing still cost money.', 'تقدير وليس وعداً. السائقون والتسويق ما زالت لها تكلفة.')}</p>
      </div>
      <div className="rounded-3xl bg-gray-950 text-white p-6">
        <div className="text-sm text-white/60">{tr('Commission you pay every month', 'العمولة التي تدفعها شهرياً')}</div>
        <div className="text-5xl font-extrabold text-rose-400 mt-1">{fmt(lost)}</div>
        <div className="text-sm text-white/60 mt-1">{tr(`${fmt(lost * 12)} a year · ${fmt(lost / 30)} every day`, `${fmt(lost * 12)} سنوياً · ${fmt(lost / 30)} يومياً`)}</div>
        <div className="mt-5 pt-5 border-t border-white/10">
          <div className="text-sm text-white/60">{tr('With your own app you keep', 'مع تطبيقك الخاص تحتفظ بـ')}</div>
          <div className="text-4xl font-extrabold text-emerald-400 mt-1">{fmt(Math.max(0, keep))}<span className="text-base text-white/50 font-semibold"> / {tr('month', 'شهر')}</span></div>
          <div className="text-xs text-white/40 mt-1">{tr(`after a ${fmt(PLATFORM.plans.pwa.price)} monthly subscription`, `بعد اشتراك شهري ${fmt(PLATFORM.plans.pwa.price)}`)}</div>
        </div>
      </div>
    </div>
  );
}
