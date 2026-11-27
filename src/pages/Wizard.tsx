import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Upload, Sparkles, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useI18n } from '../lib/i18n';
import { PRESETS, COMING_SOON, COUNTRIES, CURRENCIES } from '../lib/presets';
import { PALETTES } from '../lib/theme';
import { buildDemo, defaultAnswers, defaultUi, type WizardAnswers } from '../lib/seed';
import { resizeImage } from '../lib/utils';
import type { Industry, ModuleKey, PaymentKey } from '../lib/types';
import { PLATFORM } from '../platform.config';
import { Button, Field, Input, Select, Textarea, cx } from '../components/ui';
import { MiniPreview } from '../components/MiniPreview';
import { LangToggle } from '../components/LangToggle';

const EMOJIS = ['🔥', '🍔', '🍕', '🌮', '🥙', '🍣', '🍜', '☕', '🧋', '🥐', '🍰', '🍦', '🛍️', '✨', '👗', '👟', '💎', '🌿', '🌸', '⭐'];

export default function Wizard() {
  const { tr, tl, lang } = useI18n();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const addDemo = useStore((s) => s.addDemo);
  const initial = (params.get('industry') as Industry) || undefined;
  const [step, setStep] = useState(initial ? 1 : 0);
  const [a, setA] = useState<WizardAnswers>(() => defaultAnswers(initial ?? 'restaurant'));
  const [generating, setGenerating] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => setA((x) => ({ ...x, defaultLang: lang })), [lang]);

  const pickIndustry = (i: Industry) => {
    const d = defaultAnswers(i);
    setA((x) => ({ ...d, business: { ...d.business, name: x.business.name, logo: x.business.logo, country: x.business.country, currency: x.business.currency, city: x.business.city, phone: x.business.phone }, lead: x.lead, defaultLang: lang }));
    setStep(1);
  };

  const set = <K extends keyof WizardAnswers>(k: K, v: Partial<WizardAnswers[K]>) =>
    setA((x) => ({ ...x, [k]: { ...(x[k] as object), ...v } }));

  const pr = PRESETS[a.industry];
  const steps = [
    tr('Business type', 'نوع العمل'),
    tr('Your business', 'عملك'),
    tr('Look & feel', 'الشكل والهوية'),
    tr('Features', 'الميزات'),
    tr('A few questions', 'بعض الأسئلة'),
    tr('Your details', 'بياناتك'),
  ];

  const valid = useMemo(() => {
    if (step === 1) return a.business.name.en.trim().length > 1;
    if (step === 3) return a.modules.ordering || a.modules.loyaltyPoints || a.modules.loyaltyStamps || a.modules.reservations;
    if (step === 5) return a.lead.ownerName.trim().length > 1 && (a.lead.phone.trim().length > 5 || /\S+@\S+\.\S+/.test(a.lead.email));
    return true;
  }, [step, a]);

  const next = () => {
    setTouched(true);
    if (!valid) return;
    setTouched(false);
    if (step < steps.length - 1) setStep(step + 1);
    else generate();
  };

  const generate = () => {
    setGenerating(true);
    const demo = buildDemo(a);
    if (PLATFORM.leadWebhook) {
      fetch(PLATFORM.leadWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          business: demo.config.business.name.en, industry: a.industry, owner: a.lead.ownerName, email: a.lead.email, phone: a.lead.phone,
          country: a.business.country, city: a.business.city, modules: Object.entries(a.modules).filter(([, v]) => v).map(([k]) => k).join(', '),
          ...a.lead.answers,
        }),
      }).catch(() => {});
    }
    setTimeout(() => {
      addDemo(demo);
      nav(`/d/${demo.config.id}/app?welcome=1`, { replace: true });
    }, 2200);
  };

  if (generating) return <Generating name={tl(a.business.name) || tl(pr.sampleName)} color={a.brand.primary} />;

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => nav('/')} className="h-10 w-10 grid place-items-center rounded-full hover:bg-gray-100"><X size={20} /></button>
          <div className="flex-1">
            <div className="text-xs text-gray-500">{tr('Step', 'الخطوة')} {step + 1} / {steps.length}</div>
            <div className="font-bold">{steps[step]}</div>
          </div>
          <LangToggle />
        </div>
        <div className="h-1 bg-gray-100"><div className="h-full bg-amber-400 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_320px] gap-10">
        <main className="min-w-0 pb-28">
          {step === 0 && (
            <div>
              <h1 className="text-2xl font-extrabold">{tr('What kind of business is it?', 'ما نوع عملك؟')}</h1>
              <p className="text-gray-500 mt-1">{tr('We will set up the right features and sample data.', 'سنجهّز الميزات المناسبة وبيانات تجريبية.')}</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                {Object.values(PRESETS).map((p) => (
                  <button key={p.industry} onClick={() => pickIndustry(p.industry)}
                    className={cx('rounded-3xl border-2 bg-white p-5 text-start transition hover:shadow-lg', a.industry === p.industry ? 'border-gray-900' : 'border-transparent')}>
                    <div className="text-5xl">{p.emoji}</div>
                    <div className="font-bold text-lg mt-4">{tl(p.label)}</div>
                    <div className="text-sm text-gray-500 mt-1">{tl(p.blurb)}</div>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {COMING_SOON.map((c) => (
                  <span key={c.emoji} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-500">{c.emoji} {tl(c.label)} · {tr('soon', 'قريباً')}</span>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 max-w-xl">
              <H title={tr('Tell us about your business', 'أخبرنا عن عملك')} sub={tr('This is how your app will introduce itself.', 'هكذا سيعرّف تطبيقك بنفسه.')} />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={tr('Business name (English) *', 'اسم العمل (بالإنجليزية) *')}>
                  <Input autoFocus value={a.business.name.en} placeholder={pr.sampleName.en} onChange={(e) => set('business', { name: { ...a.business.name, en: e.target.value } })}
                    className={cx(touched && !valid && 'border-rose-400')} />
                </Field>
                <Field label={tr('Business name (Arabic)', 'اسم العمل (بالعربية)')}>
                  <Input dir="rtl" value={a.business.name.ar ?? ''} placeholder={pr.sampleName.ar} onChange={(e) => set('business', { name: { ...a.business.name, ar: e.target.value } })} />
                </Field>
              </div>
              <Field label={tr('Tagline', 'الشعار النصي')}>
                <Input value={lang === 'ar' ? a.business.tagline.ar ?? '' : a.business.tagline.en}
                  onChange={(e) => set('business', { tagline: { ...a.business.tagline, [lang]: e.target.value } })} />
              </Field>
              <Field label={tr('Logo', 'الشعار')} hint={tr('Upload your logo, or pick an icon for now.', 'ارفع شعارك، أو اختر رمزاً مؤقتاً.')}>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-2xl grid place-items-center text-3xl overflow-hidden shrink-0" style={{ background: a.brand.primary }}>
                    {a.business.logo ? <img src={a.business.logo} className="h-full w-full object-cover" alt="" /> : a.business.logoEmoji}
                  </div>
                  <label className="inline-flex items-center gap-2 h-11 px-4 rounded-app border border-gray-300 bg-white font-semibold cursor-pointer hover:bg-gray-50">
                    <Upload size={16} /> {tr('Upload', 'رفع')}
                    <input type="file" accept="image/*" hidden onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) set('business', { logo: await resizeImage(f, 256, 'image/png') });
                    }} />
                  </label>
                  {a.business.logo && <Button variant="ghost" size="sm" onClick={() => set('business', { logo: undefined })}>{tr('Remove', 'إزالة')}</Button>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {EMOJIS.map((e) => (
                    <button key={e} type="button" onClick={() => set('business', { logoEmoji: e, logo: undefined })}
                      className={cx('h-10 w-10 rounded-xl text-xl', a.business.logoEmoji === e && !a.business.logo ? 'bg-gray-900' : 'bg-white border border-gray-200')}>{e}</button>
                  ))}
                </div>
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={tr('Country', 'الدولة')}>
                  <Select value={a.business.country} onChange={(e) => {
                    const c = COUNTRIES.find((x) => x.name.en === e.target.value)!;
                    set('business', { country: c.name.en, currency: c.currency });
                  }}>
                    {COUNTRIES.map((c) => <option key={c.name.en} value={c.name.en}>{tl(c.name)}</option>)}
                  </Select>
                </Field>
                <Field label={tr('Currency', 'العملة')}>
                  <Select value={a.business.currency} onChange={(e) => set('business', { currency: e.target.value })}>
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label={tr('City / area', 'المدينة / المنطقة')}>
                  <Input value={a.business.city} onChange={(e) => set('business', { city: e.target.value })} />
                </Field>
                <Field label={tr('Opening hours', 'ساعات العمل')}>
                  <div className="flex items-center gap-2">
                    <Input type="time" value={a.business.openTime} onChange={(e) => set('business', { openTime: e.target.value })} />
                    <span className="text-gray-400">–</span>
                    <Input type="time" value={a.business.closeTime} onChange={(e) => set('business', { closeTime: e.target.value })} />
                  </div>
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-7">
              <H title={tr('Pick your colors and style', 'اختر ألوانك وأسلوبك')} sub={tr('You can change all of this later from the admin panel.', 'يمكنك تغيير كل ذلك لاحقاً من لوحة التحكم.')} />
              <div>
                <Label>{tr('Color palette', 'لوحة الألوان')}</Label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {PALETTES.map((p) => (
                    <button key={p.name} title={p.name} onClick={() => set('brand', { primary: p.primary, secondary: p.secondary })}
                      className={cx('aspect-square rounded-2xl overflow-hidden ring-offset-2 transition', a.brand.primary === p.primary && a.brand.secondary === p.secondary ? 'ring-2 ring-gray-900' : 'hover:scale-105')}>
                      <div className="h-2/3" style={{ background: p.primary }} />
                      <div className="h-1/3" style={{ background: p.secondary }} />
                    </button>
                  ))}
                </div>
                <div className="flex gap-4 mt-4">
                  <ColorInput label={tr('Main color', 'اللون الرئيسي')} value={a.brand.primary} onChange={(v) => set('brand', { primary: v })} />
                  <ColorInput label={tr('Accent', 'اللون الثانوي')} value={a.brand.secondary} onChange={(v) => set('brand', { secondary: v })} />
                </div>
              </div>
              <div>
                <Label>{tr('Menu style', 'شكل القائمة')}</Label>
                <div className="grid grid-cols-3 gap-3">
                  {([['list', tr('List', 'قائمة'), '☰'], ['grid', tr('Grid', 'شبكة'), '▦'], ['large', tr('Big photos', 'صور كبيرة'), '▭']] as const).map(([k, l, icon]) => (
                    <Choice key={k} on={(a.ui?.menuLayout ?? defaultUi(a.industry).menuLayout) === k} onClick={() => setA((x) => ({ ...x, ui: { ...(x.ui ?? {}), menuLayout: k } }))}>
                      <div className="text-2xl">{icon}</div>
                      <div className="text-sm text-gray-500 mt-1">{l}</div>
                    </Choice>
                  ))}
                </div>
              </div>
              <div>
                <Label>{tr('Theme', 'المظهر')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {([['light', tr('Light', 'فاتح')], ['dark', tr('Dark', 'داكن')]] as const).map(([k, l]) => (
                    <Choice key={k} on={(a.ui?.theme ?? 'light') === k} onClick={() => setA((x) => ({ ...x, ui: { ...(x.ui ?? {}), theme: k } }))}>
                      <div className={cx('h-8 rounded-lg mx-auto w-20', k === 'dark' ? 'bg-gray-900' : 'bg-gray-100 border')} />
                      <div className="text-sm text-gray-500 mt-1">{l}</div>
                    </Choice>
                  ))}
                </div>
              </div>
              <div>
                <Label>{tr('Font style', 'نمط الخط')}</Label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    ['modern', tr('Modern', 'عصري'), "'Plus Jakarta Sans','IBM Plex Sans Arabic'"],
                    ['classic', tr('Elegant', 'أنيق'), "'Playfair Display','Amiri'"],
                    ['friendly', tr('Friendly', 'ودود'), "'Nunito','Tajawal'"],
                  ] as const).map(([k, l, f]) => (
                    <Choice key={k} on={a.brand.font === k} onClick={() => set('brand', { font: k })}>
                      <div className="text-2xl font-bold" style={{ fontFamily: f }}>Aa أب</div>
                      <div className="text-sm text-gray-500 mt-1">{l}</div>
                    </Choice>
                  ))}
                </div>
              </div>
              <div>
                <Label>{tr('Corners', 'الزوايا')}</Label>
                <div className="grid grid-cols-3 gap-3">
                  {([['sharp', tr('Sharp', 'حادة'), 6], ['soft', tr('Soft', 'ناعمة'), 14], ['round', tr('Round', 'دائرية'), 24]] as const).map(([k, l, r]) => (
                    <Choice key={k} on={a.brand.radius === k} onClick={() => set('brand', { radius: k })}>
                      <div className="h-10 w-16 mx-auto border-2 border-gray-800" style={{ borderRadius: r }} />
                      <div className="text-sm text-gray-500 mt-2">{l}</div>
                    </Choice>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <H title={tr('Which features do you want?', 'ما الميزات التي تريدها؟')} sub={tr('We pre-selected what works best for your business. Everything can be tested in the demo.', 'اخترنا مسبقاً ما يناسب عملك. يمكنك تجربة كل شيء في النسخة التجريبية.')} />
              <FeatureGroup title={tr('Online ordering', 'الطلب أونلاين')} items={[
                ['ordering', tr('Online ordering & cart', 'الطلب أونلاين وسلة التسوق'), tr('Customers browse and order from the app', 'الزبائن يتصفحون ويطلبون من التطبيق')],
                ['delivery', tl(pr.terms.delivery), tr('Zones, fees, minimum order, tracking', 'مناطق، رسوم، حد أدنى، تتبع الطلب')],
                ['pickup', tr('Pickup / click & collect', 'الاستلام من المتجر'), tr('Order ahead, skip the line', 'اطلب مسبقاً وتجاوز الطابور')],
                ...(true ? [
                  ['dineIn', tr('Dine-in ordering', 'الطلب داخل المطعم'), tr('Guests order from their table', 'يطلب الضيوف من طاولتهم')] as [ModuleKey, string, string],
                  ['tableQr', tr('Table QR codes', 'رموز QR للطاولات'), tr('Print a QR per table: scan, order, pay', 'رمز QR لكل طاولة: امسح، اطلب، ادفع')] as [ModuleKey, string, string],
                  ['tips', tr('Tips at checkout', 'الإكرامية عند الدفع'), tr('Customers can tip the team or driver', 'يمكن للزبائن منح إكرامية للفريق أو السائق')] as [ModuleKey, string, string],
                ] : []),
              ]} a={a} setA={setA} />
              <FeatureGroup title={tr('Loyalty & rewards', 'الولاء والمكافآت')} items={[
                ['loyaltyPoints', tr('Points program', 'برنامج النقاط'), tr('Earn points on every purchase, redeem rewards', 'اجمع النقاط مع كل عملية شراء واستبدلها بمكافآت')],
                ['loyaltyStamps', tr('Digital stamp card', 'بطاقة أختام رقمية'), tr('e.g. buy 7, get the 8th free', 'مثلاً: اشترِ 7 واحصل على الثامنة مجاناً')],
                ['vipTiers', tr('VIP tiers', 'مستويات VIP'), tr('Silver, Gold, Platinum with bonus points', 'فضي، ذهبي، بلاتيني مع نقاط إضافية')],
                ['staticQr', tr('Counter QR code', 'رمز QR على الكاشير'), tr('Printable QR customers scan in store', 'رمز QR مطبوع يمسحه الزبائن في المتجر')],
                ['wallet', tr('Wallet & gift cards', 'المحفظة وبطاقات الهدايا'), tr('Pre-paid balance with top-up bonus, send gift cards', 'رصيد مسبق الدفع مع مكافأة شحن، وإرسال بطاقات هدايا')],
                ['referrals', tr('Referrals & birthdays', 'الإحالات وأعياد الميلاد'), tr('Invite-a-friend codes and birthday gifts', 'رموز دعوة الأصدقاء وهدايا أعياد الميلاد')],
              ]} a={a} setA={setA} />
              <FeatureGroup title={tr('Marketing', 'التسويق')} items={[
                ['deals', tr('Deals & coupons', 'العروض والقسائم'), tr('Discount codes and flash deals', 'رموز خصم وعروض سريعة')],
                ['campaigns', tr('Push notification campaigns', 'حملات الإشعارات'), tr('Message all your customers in one tap', 'راسل جميع زبائنك بضغطة واحدة')],
                ['reviews', tr('Ratings & reviews', 'التقييمات والمراجعات'), tr('Customers rate orders, you reply', 'يقيّم الزبائن الطلبات وتردّ عليهم')],
              ]} a={a} setA={setA} />
              <FeatureGroup title={tr('Bookings', 'الحجوزات')} items={[
                ['reservations', tl(pr.terms.reserve), tr('Time slots, capacity and confirmations', 'مواعيد، سعة وتأكيدات')],
              ]} a={a} setA={setA} />
              <div>
                <Label>{tr('Payment methods', 'طرق الدفع')}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([['card', tr('Card', 'بطاقة')], ['applePay', 'Apple Pay'], ['googlePay', 'Google Pay'], ['cash', tr('Cash', 'نقداً')]] as [PaymentKey, string][]).map(([k, l]) => (
                    <Choice key={k} on={a.payments[k]} onClick={() => set('payments', { [k]: !a.payments[k] })}>
                      <div className="font-semibold">{l}</div>
                    </Choice>
                  ))}
                </div>
              </div>
              {touched && !valid && <p className="text-rose-600 text-sm">{tr('Pick at least one main feature.', 'اختر ميزة رئيسية واحدة على الأقل.')}</p>}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 max-w-xl">
              <H title={tr('Help us understand your needs', 'ساعدنا على فهم احتياجاتك')} sub={tr('Optional — it helps us prepare your final app.', 'اختياري — يساعدنا على تجهيز تطبيقك النهائي.')} />
              <Q a={a} setA={setA} k="branches" label={tr('How many branches do you have?', 'كم فرعاً لديك؟')} options={['1', '2–5', '6–20', '20+']} />
              <Q a={a} setA={setA} k="customers" label={tr('Customers per day (approx.)', 'عدد الزبائن يومياً (تقريباً)')} options={['< 50', '50–200', '200–500', '500+']} />
              <Q a={a} setA={setA} k="delivery" label={tr('How do you deliver today?', 'كيف توصّل الطلبات حالياً؟')} options={[tr('Own drivers', 'سائقون خاصون'), tr('Delivery apps', 'تطبيقات توصيل'), tr('Both', 'كلاهما'), tr('No delivery', 'لا يوجد توصيل')]} />
              <Q a={a} setA={setA} k="pos" label={tr('Do you use a POS / cashier system?', 'هل تستخدم نظام كاشير؟')} options={[tr('Yes', 'نعم'), tr('No', 'لا'), tr('Not sure', 'غير متأكد')]} />
              <Q a={a} setA={setA} k="appType" label={tr('Which kind of app do you prefer?', 'أي نوع من التطبيقات تفضّل؟')} options={[tr('App Store & Google Play', 'App Store و Google Play'), tr('Web app (PWA)', 'تطبيق ويب (PWA)'), tr('Not sure yet', 'لست متأكداً بعد')]} />
              <Q a={a} setA={setA} k="launch" label={tr('When would you like to launch?', 'متى تريد الإطلاق؟')} options={[tr('ASAP', 'في أقرب وقت'), tr('1–2 months', 'شهر إلى شهرين'), tr('3+ months', '3 أشهر أو أكثر'), tr('Just exploring', 'أستكشف فقط')]} />
              <Field label={tr('Anything else we should know?', 'هل هناك شيء آخر يجب أن نعرفه؟')}>
                <Textarea value={a.lead.answers.notes ?? ''} onChange={(e) => set('lead', { answers: { ...a.lead.answers, notes: e.target.value } })}
                  placeholder={tr('Features you dream of, apps you like, your POS name…', 'ميزات تحلم بها، تطبيقات تعجبك، اسم نظام الكاشير…')} />
              </Field>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5 max-w-xl">
              <H title={tr('Last step — where can we reach you?', 'الخطوة الأخيرة — كيف نتواصل معك؟')} sub={tr('Your demo is ready right after this.', 'تطبيقك التجريبي جاهز مباشرة بعد هذه الخطوة.')} />
              <Field label={tr('Your name *', 'اسمك *')}>
                <Input value={a.lead.ownerName} onChange={(e) => set('lead', { ownerName: e.target.value })} className={cx(touched && a.lead.ownerName.trim().length < 2 && 'border-rose-400')} />
              </Field>
              <Field label={tr('WhatsApp / phone *', 'واتساب / هاتف *')}>
                <Input type="tel" dir="ltr" value={a.lead.phone} placeholder={COUNTRIES.find((c) => c.name.en === a.business.country)?.dial + ' …'}
                  onChange={(e) => { set('lead', { phone: e.target.value }); set('business', { phone: e.target.value }); }} />
              </Field>
              <Field label={tr('Email', 'البريد الإلكتروني')}>
                <Input type="email" dir="ltr" value={a.lead.email} onChange={(e) => { set('lead', { email: e.target.value }); set('business', { email: e.target.value }); }} />
              </Field>
              {touched && !valid && <p className="text-rose-600 text-sm">{tr('Please add your name and a phone number or email.', 'يرجى إدخال اسمك ورقم هاتف أو بريد إلكتروني.')}</p>}
              <p className="text-xs text-gray-500">{tr(`Your demo stays open for ${PLATFORM.trialDays} days. Data is saved on this device only.`, `يبقى تطبيقك التجريبي متاحاً لمدة ${PLATFORM.trialDays} يوماً. تُحفظ البيانات على هذا الجهاز فقط.`)}</p>
            </div>
          )}
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <MiniPreview cfg={a} />
            <p className="text-center text-xs text-gray-500 mt-4">{tr('Live preview', 'معاينة مباشرة')}</p>
          </div>
        </aside>
      </div>

      {step > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-gray-100 z-20">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <Button variant="outline" onClick={() => setStep(step - 1)} icon={<ArrowLeft size={18} className="rtl:rotate-180" />}>{tr('Back', 'رجوع')}</Button>
            <div className="flex-1" />
            <Button variant="dark" size="lg" onClick={next} className="!rounded-full px-6">
              {step === steps.length - 1 ? <><Sparkles size={18} /> {tr('Create my app', 'أنشئ تطبيقي')}</> : <>{tr('Continue', 'متابعة')} <ArrowRight size={18} className="rtl:rotate-180" /></>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const H = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="mb-2">
    <h1 className="text-2xl font-extrabold">{title}</h1>
    {sub && <p className="text-gray-500 mt-1">{sub}</p>}
  </div>
);
const Label = ({ children }: { children: ReactNode }) => <div className="font-semibold text-gray-800 mb-2">{children}</div>;
const Choice = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button type="button" onClick={onClick} className={cx('relative rounded-2xl border-2 bg-white p-3 text-center transition', on ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300')}>
    {on && <span className="absolute top-1.5 end-1.5 h-5 w-5 rounded-full bg-gray-900 text-white grid place-items-center"><Check size={12} /></span>}
    {children}
  </button>
);

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 cursor-pointer">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-8 rounded-lg border-0 bg-transparent p-0" />
      <span className="text-sm"><span className="block font-medium">{label}</span><span className="text-gray-500 uppercase text-xs" dir="ltr">{value}</span></span>
    </label>
  );
}

function FeatureGroup({ title, items, a, setA }: { title: string; items: [ModuleKey, string, string][]; a: WizardAnswers; setA: (fn: (x: WizardAnswers) => WizardAnswers) => void }) {
  return (
    <div>
      <Label>{title}</Label>
      <div className="grid sm:grid-cols-2 gap-2">
        {items.map(([k, l, d]) => {
          const on = a.modules[k];
          return (
            <button key={k} type="button" onClick={() => setA((x) => ({ ...x, modules: { ...x.modules, [k]: !on } }))}
              className={cx('flex items-start gap-3 rounded-2xl border-2 bg-white p-3.5 text-start transition', on ? 'border-gray-900' : 'border-gray-200')}>
              <span className={cx('mt-0.5 h-5 w-5 shrink-0 rounded-md grid place-items-center', on ? 'bg-gray-900 text-white' : 'border-2 border-gray-300')}>{on && <Check size={13} />}</span>
              <span>
                <span className="block font-semibold">{l}</span>
                <span className="block text-sm text-gray-500">{d}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Q({ a, setA, k, label, options }: { a: WizardAnswers; setA: (fn: (x: WizardAnswers) => WizardAnswers) => void; k: string; label: string; options: string[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => setA((x) => ({ ...x, lead: { ...x.lead, answers: { ...x.lead.answers, [k]: o } } }))}
            className={cx('rounded-full border-2 px-4 py-2 text-sm font-semibold transition', a.lead.answers[k] === o ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white')}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Generating({ name, color }: { name: string; color: string }) {
  const { tr } = useI18n();
  const items = [
    tr('Setting up your brand', 'تجهيز هويتك'),
    tr('Creating your menu & catalog', 'إنشاء القائمة والمنتجات'),
    tr('Turning on loyalty & rewards', 'تفعيل الولاء والمكافآت'),
    tr('Building your admin panel', 'بناء لوحة التحكم'),
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, items.length)), 500);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <div className="min-h-full grid place-items-center p-6" style={{ background: color }}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
        <div className="text-sm text-gray-500">{tr('Building', 'جارٍ بناء')}</div>
        <div className="text-2xl font-extrabold">{name}</div>
        <ul className="mt-6 space-y-3">
          {items.map((t, k) => (
            <li key={t} className="flex items-center gap-3">
              <span className={cx('h-6 w-6 rounded-full grid place-items-center transition', k < i ? 'bg-emerald-500 text-white' : 'bg-gray-100')}>
                {k < i ? <Check size={14} /> : <span className="h-2 w-2 rounded-full bg-gray-300 animate-pulse" />}
              </span>
              <span className={k < i ? 'text-gray-900' : 'text-gray-400'}>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
