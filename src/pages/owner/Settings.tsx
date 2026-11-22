import { useState } from 'react';
import { Upload, Plus, Trash2, RotateCcw } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { tourDone, track } from '../../lib/ops';
import { buildData } from '../../lib/seed';
import { PALETTES } from '../../lib/theme';
import { COUNTRIES, CURRENCIES } from '../../lib/presets';
import type { Demo, ModuleKey, PaymentKey, StaffMember } from '../../lib/types';
import { resizeImage, uid } from '../../lib/utils';
import { Button, Card, Field, Input, Select, Toggle, cx } from '../../components/ui';
import { MiniPreview } from '../../components/MiniPreview';
import { PlanSummary, MODULE_LABELS, PAY_LABEL } from '../../components/PlanSummary';
import { PageHead } from './OwnerApp';
import { Bookings } from '../staff/StaffApp';

const BANNER_BGS = ['#111827', '#7c2d12', '#92400e', '#3f6212', '#0e7490', '#4338ca', '#be185d', '#57534e', '#4a2c20', '#18181b'];

export function Branding() {
  const { cfg, data, tr, tl, update } = useDemo();
  const edit = (fn: (d: Demo) => void) => update((d) => { fn(d); if (!d.data.tour.branding) tourDone(d, 'branding'); });
  const b = cfg.business;
  return (
    <>
      <PageHead title={tr('Branding', 'الهوية')} sub={tr('Changes apply instantly across the app.', 'تُطبّق التغييرات فوراً في كل التطبيق.')} />
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="font-bold">{tr('Name & logo', 'الاسم والشعار')}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={tr('Name (English)', 'الاسم (إنجليزي)')}><Input value={b.name.en} onChange={(e) => edit((d) => void (d.config.business.name.en = e.target.value))} /></Field>
              <Field label={tr('Name (Arabic)', 'الاسم (عربي)')}><Input dir="rtl" value={b.name.ar ?? ''} onChange={(e) => edit((d) => void (d.config.business.name.ar = e.target.value))} /></Field>
              <Field label={tr('Tagline (English)', 'الشعار النصي (إنجليزي)')}><Input value={b.tagline.en} onChange={(e) => edit((d) => void (d.config.business.tagline.en = e.target.value))} /></Field>
              <Field label={tr('Tagline (Arabic)', 'الشعار النصي (عربي)')}><Input dir="rtl" value={b.tagline.ar ?? ''} onChange={(e) => edit((d) => void (d.config.business.tagline.ar = e.target.value))} /></Field>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-2xl grid place-items-center text-3xl overflow-hidden" style={{ background: cfg.brand.primary }}>
                {b.logo ? <img src={b.logo} className="h-full w-full object-cover" alt="" /> : b.logoEmoji}
              </div>
              <label className="inline-flex items-center gap-2 h-10 px-4 rounded-app border border-gray-300 font-semibold cursor-pointer hover:bg-gray-50">
                <Upload size={16} /> {tr('Upload logo', 'رفع الشعار')}
                <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await resizeImage(f, 256, 'image/png'); edit((d) => void (d.config.business.logo = url)); } }} />
              </label>
              {b.logo && <Button variant="ghost" size="sm" onClick={() => edit((d) => void (d.config.business.logo = undefined))}>{tr('Remove', 'إزالة')}</Button>}
              {!b.logo && <Input value={b.logoEmoji} onChange={(e) => edit((d) => void (d.config.business.logoEmoji = e.target.value))} className="!w-14 text-center text-xl" />}
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="font-bold">{tr('Colors & style', 'الألوان والأسلوب')}</div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {PALETTES.map((p) => (
                <button key={p.name} title={p.name} onClick={() => edit((d) => void Object.assign(d.config.brand, { primary: p.primary, secondary: p.secondary }))}
                  className={cx('aspect-square rounded-xl overflow-hidden', cfg.brand.primary === p.primary && 'ring-2 ring-gray-900 ring-offset-2')}>
                  <div className="h-2/3" style={{ background: p.primary }} /><div className="h-1/3" style={{ background: p.secondary }} />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {(['primary', 'secondary'] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 cursor-pointer">
                  <input type="color" value={cfg.brand[k]} onChange={(e) => edit((d) => void (d.config.brand[k] = e.target.value))} className="h-8 w-8" />
                  <span className="text-sm font-medium">{k === 'primary' ? tr('Main', 'الرئيسي') : tr('Accent', 'الثانوي')} <span className="text-gray-400 uppercase text-xs" dir="ltr">{cfg.brand[k]}</span></span>
                </label>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={tr('Font', 'الخط')}>
                <Select value={cfg.brand.font} onChange={(e) => edit((d) => void (d.config.brand.font = e.target.value as 'modern'))}>
                  <option value="modern">{tr('Modern', 'عصري')}</option><option value="classic">{tr('Elegant', 'أنيق')}</option><option value="friendly">{tr('Friendly', 'ودود')}</option>
                </Select>
              </Field>
              <Field label={tr('Corners', 'الزوايا')}>
                <Select value={cfg.brand.radius} onChange={(e) => edit((d) => void (d.config.brand.radius = e.target.value as 'soft'))}>
                  <option value="sharp">{tr('Sharp', 'حادة')}</option><option value="soft">{tr('Soft', 'ناعمة')}</option><option value="round">{tr('Round', 'دائرية')}</option>
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">{tr('Home banners', 'لافتات الرئيسية')}</div>
              <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => edit((d) => void d.data.banners.push({ id: 'b' + uid(), title: { en: 'New banner', ar: 'لافتة جديدة' }, subtitle: { en: '', ar: '' }, emoji: '✨', bg: BANNER_BGS[0] }))}>{tr('Add', 'إضافة')}</Button>
            </div>
            <div className="space-y-3">
              {data.banners.map((bn, i) => (
                <div key={bn.id} className="rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center">
                  <div className="h-12 w-20 rounded-lg grid place-items-center text-2xl" style={{ background: bn.bg }}>{bn.emoji}</div>
                  <div className="flex-1 min-w-[200px] grid grid-cols-2 gap-2">
                    <Input value={bn.title.en} onChange={(e) => edit((d) => void (d.data.banners[i].title.en = e.target.value))} className="!h-9" />
                    <Input dir="rtl" value={bn.title.ar ?? ''} onChange={(e) => edit((d) => void (d.data.banners[i].title.ar = e.target.value))} className="!h-9" />
                    <Input value={bn.subtitle.en} onChange={(e) => edit((d) => void (d.data.banners[i].subtitle.en = e.target.value))} className="!h-9" placeholder="Subtitle" />
                    <Input dir="rtl" value={bn.subtitle.ar ?? ''} onChange={(e) => edit((d) => void (d.data.banners[i].subtitle.ar = e.target.value))} className="!h-9" placeholder="العنوان الفرعي" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1 w-full">
                    <Input value={bn.emoji} onChange={(e) => edit((d) => void (d.data.banners[i].emoji = e.target.value))} className="!w-12 !h-8 !px-1 text-center" />
                    {BANNER_BGS.map((c) => <button key={c} onClick={() => edit((d) => void (d.data.banners[i].bg = c))} className={cx('h-6 w-6 rounded-full', bn.bg === c && 'ring-2 ring-offset-1 ring-gray-900')} style={{ background: c }} />)}
                    <button className="ms-auto text-rose-600" onClick={() => edit((d) => void (d.data.banners = d.data.banners.filter((x) => x.id !== bn.id)))}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <aside className="hidden lg:block"><div className="sticky top-6"><MiniPreview cfg={cfg} /><p className="text-center text-xs text-gray-500 mt-3">{tl(cfg.business.name)}</p></div></aside>
      </div>
    </>
  );
}

export function Settings() {
  const { cfg, tr, tl, update, terms } = useDemo();
  const set = (fn: (d: Demo) => void) => update((d) => { fn(d); track(d, 'editSettings'); });
  const f = cfg.fulfillment;
  const modules: ModuleKey[] = ['ordering', 'delivery', 'pickup', ...(cfg.industry !== 'retail' ? ['dineIn' as const] : []), 'loyaltyPoints', 'loyaltyStamps', 'vipTiers', 'staticQr', 'deals', 'campaigns', 'reservations'];
  return (
    <>
      <PageHead title={tr('Settings', 'الإعدادات')} />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <div className="font-bold">{tr('Features (on / off)', 'الميزات (تشغيل / إيقاف)')}</div>
          <p className="text-sm text-gray-500 -mt-1">{tr('Every feature can be switched per business — try turning one off and look at the customer app.', 'يمكن تشغيل أو إيقاف كل ميزة — جرّب إيقاف واحدة وانظر إلى تطبيق الزبون.')}</p>
          {modules.map((k) => <Toggle key={k} checked={cfg.modules[k]} onChange={(v) => set((d) => void (d.config.modules[k] = v))} label={k === 'reservations' ? tl(terms.reserve) : tl(MODULE_LABELS[k])} />)}
        </Card>

        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <div className="font-bold">{tr('Business', 'العمل')}</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr('Phone', 'الهاتف')}><Input dir="ltr" value={cfg.business.phone} onChange={(e) => set((d) => void (d.config.business.phone = e.target.value))} /></Field>
              <Field label={tr('Email', 'البريد')}><Input dir="ltr" value={cfg.business.email} onChange={(e) => set((d) => void (d.config.business.email = e.target.value))} /></Field>
              <Field label={tr('Address', 'العنوان')}><Input value={cfg.business.address} onChange={(e) => set((d) => void (d.config.business.address = e.target.value))} /></Field>
              <Field label={tr('City', 'المدينة')}><Input value={cfg.business.city} onChange={(e) => set((d) => void (d.config.business.city = e.target.value))} /></Field>
              <Field label={tr('Country', 'الدولة')}>
                <Select value={cfg.business.country} onChange={(e) => set((d) => void (d.config.business.country = e.target.value))}>{COUNTRIES.map((c) => <option key={c.name.en} value={c.name.en}>{tl(c.name)}</option>)}</Select>
              </Field>
              <Field label={tr('Currency', 'العملة')}>
                <Select value={cfg.business.currency} onChange={(e) => set((d) => void (d.config.business.currency = e.target.value))}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
              </Field>
              <Field label={tr('Opens', 'يفتح')}><Input type="time" value={cfg.business.openTime} onChange={(e) => set((d) => void (d.config.business.openTime = e.target.value))} /></Field>
              <Field label={tr('Closes', 'يغلق')}><Input type="time" value={cfg.business.closeTime} onChange={(e) => set((d) => void (d.config.business.closeTime = e.target.value))} /></Field>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="font-bold">{tr('Payments', 'الدفع')}</div>
            <p className="text-sm text-gray-500 -mt-1">{tr('In the real app, payments go straight to your own account (Stripe or a local gateway).', 'في التطبيق الحقيقي، تذهب المدفوعات مباشرة إلى حسابك (Stripe أو بوابة محلية).')}</p>
            {(Object.keys(cfg.payments) as PaymentKey[]).map((k) => <Toggle key={k} checked={cfg.payments[k]} onChange={(v) => set((d) => void (d.config.payments[k] = v))} label={tl(PAY_LABEL[k])} />)}
          </Card>
        </div>

        {cfg.modules.ordering && (
          <Card className="p-5 space-y-3">
            <div className="font-bold">{tr('Ordering & delivery', 'الطلبات والتوصيل')}</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr('Prep time (min)', 'وقت التحضير (د)')}><Input type="number" value={f.prepMinutes} onChange={(e) => set((d) => void (d.config.fulfillment.prepMinutes = Math.max(0, +e.target.value)))} /></Field>
              <Field label={tr('Min. order for delivery', 'الحد الأدنى للتوصيل')}><Input type="number" value={f.minOrder} onChange={(e) => set((d) => void (d.config.fulfillment.minOrder = Math.max(0, +e.target.value)))} /></Field>
              <Field label={tr('Free delivery over', 'توصيل مجاني فوق')} hint={tr('0 = never', '0 = أبداً')}><Input type="number" value={f.freeDeliveryOver} onChange={(e) => set((d) => void (d.config.fulfillment.freeDeliveryOver = Math.max(0, +e.target.value)))} /></Field>
              <Field label={tr('VAT %', 'الضريبة %')}><Input type="number" value={f.taxRate} onChange={(e) => set((d) => void (d.config.fulfillment.taxRate = Math.max(0, +e.target.value)))} /></Field>
            </div>
            <Toggle checked={f.taxIncluded} onChange={(v) => set((d) => void (d.config.fulfillment.taxIncluded = v))} label={tr('Prices include VAT', 'الأسعار تشمل الضريبة')} />
            <div className="pt-2">
              <div className="text-sm font-semibold mb-2">{tr('Delivery zones', 'مناطق التوصيل')}</div>
              <div className="space-y-2">
                {f.zones.map((z, i) => (
                  <div key={z.id} className="flex items-center gap-2">
                    <Input value={z.name.en} onChange={(e) => set((d) => void (d.config.fulfillment.zones[i].name.en = e.target.value))} className="!h-9" />
                    <Input type="number" step="0.5" value={z.fee} onChange={(e) => set((d) => void (d.config.fulfillment.zones[i].fee = Math.max(0, +e.target.value)))} className="!h-9 !w-20" title="fee" />
                    <Input type="number" value={z.eta} onChange={(e) => set((d) => void (d.config.fulfillment.zones[i].eta = Math.max(0, +e.target.value)))} className="!h-9 !w-20" title="minutes" />
                    <button className="text-rose-600" onClick={() => set((d) => void (d.config.fulfillment.zones = d.config.fulfillment.zones.filter((x) => x.id !== z.id)))}><Trash2 size={16} /></button>
                  </div>
                ))}
                <div className="text-xs text-gray-500">{tr('Zone name · fee · minutes', 'اسم المنطقة · الرسوم · الدقائق')}</div>
                <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => set((d) => void d.config.fulfillment.zones.push({ id: 'z' + uid(), name: { en: 'New zone', ar: 'منطقة جديدة' }, fee: 2, eta: 30 }))}>{tr('Add zone', 'إضافة منطقة')}</Button>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-5 space-y-3">
          <div className="font-bold">{tr('App language', 'لغة التطبيق')}</div>
          <Select value={cfg.defaultLang} onChange={(e) => set((d) => void (d.config.defaultLang = e.target.value as 'en'))}>
            <option value="en">English (+ العربية)</option>
            <option value="ar">العربية (+ English)</option>
          </Select>
          <div className="pt-4 border-t border-gray-100">
            <div className="font-bold text-rose-700">{tr('Reset demo data', 'إعادة ضبط البيانات')}</div>
            <p className="text-sm text-gray-500 mt-1">{tr('Restores sample products, customers and orders. Branding and settings stay.', 'يعيد المنتجات والزبائن والطلبات التجريبية. تبقى الهوية والإعدادات.')}</p>
            <Button variant="outline" className="mt-2 !text-rose-600" icon={<RotateCcw size={16} />} onClick={() => {
              if (confirm(tr('Reset all demo data?', 'إعادة ضبط كل البيانات؟'))) { update((d) => void (d.data = buildData(d.config))); toast(tr('Demo data reset', 'تمت إعادة الضبط'), 'info'); }
            }}>{tr('Reset', 'إعادة ضبط')}</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

export function Staff() {
  const { data, tr, update } = useDemo();
  const roles: Record<StaffMember['role'], string> = { manager: tr('Manager', 'مدير'), cashier: tr('Cashier', 'كاشير'), kitchen: tr('Kitchen / store', 'المطبخ / المتجر') };
  return (
    <>
      <PageHead title={tr('Staff accounts', 'حسابات الموظفين')} sub={tr('Staff log in to the app with a 4-digit PIN to manage orders, award points and scan vouchers.', 'يدخل الموظفون إلى التطبيق برمز من 4 أرقام لإدارة الطلبات ومنح النقاط ومسح القسائم.')} action={
        <Button icon={<Plus size={16} />} onClick={() => update((d) => void d.data.staff.push({ id: 's' + uid(), name: tr('New staff', 'موظف جديد'), role: 'cashier', pin: String(1000 + Math.floor(Math.random() * 9000)), active: true }))}>{tr('Add staff', 'إضافة موظف')}</Button>
      } />
      <Card className="divide-y divide-gray-100">
        {data.staff.map((s, i) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
            <span className="h-10 w-10 rounded-full bg-brand text-onbrand grid place-items-center font-bold">{s.name[0]}</span>
            <Input value={s.name} onChange={(e) => update((d) => void (d.data.staff[i].name = e.target.value))} className="!h-10 !w-48" />
            <Select value={s.role} onChange={(e) => update((d) => void (d.data.staff[i].role = e.target.value as StaffMember['role']))} className="!h-10 !w-40">
              {Object.entries(roles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <div className="flex items-center gap-2"><span className="text-sm text-gray-500">PIN</span><Input value={s.pin} inputMode="numeric" onChange={(e) => update((d) => void (d.data.staff[i].pin = e.target.value.replace(/\D/g, '').slice(0, 4)))} className="!h-10 !w-20 font-mono text-center" /></div>
            <div className="ms-auto flex items-center gap-3">
              <Toggle checked={s.active} onChange={(v) => update((d) => void (d.data.staff[i].active = v))} />
              <button className="text-rose-600" onClick={() => update((d) => void (d.data.staff = d.data.staff.filter((x) => x.id !== s.id)))}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}

export function OwnerReservations() {
  const { cfg, tr, tl, terms, update } = useDemo();
  const r = cfg.reservations;
  const set = (k: keyof typeof r, v: number) => update((d) => void (d.config.reservations[k] = v));
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead title={tl(terms.reserve)} action={<Button variant="outline" onClick={() => setOpen((v) => !v)}>{tr('Booking rules', 'قواعد الحجز')}</Button>} />
      {open && (
        <Card className="p-5 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label={tr('Slot length (min)', 'مدة الموعد (د)')}><Input type="number" value={r.slotMinutes} onChange={(e) => set('slotMinutes', Math.max(15, +e.target.value))} /></Field>
          <Field label={tr('Bookings per slot', 'حجوزات لكل موعد')}><Input type="number" value={r.capacityPerSlot} onChange={(e) => set('capacityPerSlot', Math.max(1, +e.target.value))} /></Field>
          <Field label={tr('Max party size', 'أقصى عدد')}><Input type="number" value={r.maxParty} onChange={(e) => set('maxParty', Math.max(1, +e.target.value))} /></Field>
          <Field label={tr('Days ahead', 'أيام مسبقة')}><Input type="number" value={r.daysAhead} onChange={(e) => set('daysAhead', Math.min(60, Math.max(1, +e.target.value)))} /></Field>
        </Card>
      )}
      <Bookings />
    </>
  );
}

export function Plan() {
  const { demo, tr } = useDemo();
  return (
    <>
      <PageHead title={tr('My app plan', 'خطة تطبيقي')} sub={tr('A summary of what you chose and tried — we use it to build your final app.', 'ملخص لما اخترته وجرّبته — نستخدمه لبناء تطبيقك النهائي.')} />
      <PlanSummary demo={demo} />
    </>
  );
}
