import { MessageCircle, Mail, Printer } from 'lucide-react';
import type { Demo, ModuleKey, PaymentKey } from '../lib/types';
import { useI18n } from '../lib/i18n';
import { PRESETS } from '../lib/presets';
import { fmtDate } from '../lib/utils';
import { PLATFORM } from '../platform.config';
import { Button, Card } from './ui';

export const MODULE_LABELS: Record<ModuleKey, { en: string; ar: string }> = {
  ordering: { en: 'Online ordering', ar: 'الطلب أونلاين' },
  delivery: { en: 'Delivery / shipping', ar: 'التوصيل / الشحن' },
  pickup: { en: 'Pickup', ar: 'الاستلام' },
  dineIn: { en: 'Dine-in ordering', ar: 'الطلب من الطاولة' },
  loyaltyPoints: { en: 'Points program', ar: 'برنامج النقاط' },
  loyaltyStamps: { en: 'Stamp card', ar: 'بطاقة الأختام' },
  vipTiers: { en: 'VIP tiers', ar: 'مستويات VIP' },
  staticQr: { en: 'Counter QR', ar: 'رمز QR على الكاشير' },
  deals: { en: 'Deals & coupons', ar: 'العروض والقسائم' },
  campaigns: { en: 'Push campaigns', ar: 'حملات الإشعارات' },
  reservations: { en: 'Bookings', ar: 'الحجوزات' },
};

const ACTIVITY: Record<string, { en: string; ar: string }> = {
  addToCart: { en: 'Added to cart', ar: 'إضافة إلى السلة' },
  placeOrder: { en: 'Placed orders', ar: 'تقديم طلبات' },
  staffAccept: { en: 'Accepted orders as staff', ar: 'قبول الطلبات كموظف' },
  claimQr: { en: 'Earned points by QR', ar: 'كسب النقاط عبر QR' },
  redeemReward: { en: 'Redeemed rewards', ar: 'استبدال المكافآت' },
  staffVoucher: { en: 'Scanned vouchers', ar: 'مسح القسائم' },
  reservation: { en: 'Made bookings', ar: 'إجراء حجوزات' },
  campaign: { en: 'Sent campaigns', ar: 'إرسال حملات' },
  branding: { en: 'Edited branding', ar: 'تعديل الهوية' },
  addProduct: { en: 'Added own products', ar: 'إضافة منتجات خاصة' },
  editSettings: { en: 'Changed settings', ar: 'تعديل الإعدادات' },
};

export const PAY_LABEL: Record<PaymentKey, { en: string; ar: string }> = {
  card: { en: 'Card', ar: 'بطاقة' },
  applePay: { en: 'Apple Pay', ar: 'Apple Pay' },
  googlePay: { en: 'Google Pay', ar: 'Google Pay' },
  cash: { en: 'Cash', ar: 'نقداً' },
};

/** The "requirements" one-pager: what they asked for + what they actually tried. */
export function PlanSummary({ demo, showCta = true }: { demo: Demo; showCta?: boolean }) {
  const { tr, tl, lang } = useI18n();
  const c = demo.config;
  const on = (Object.keys(c.modules) as ModuleKey[]).filter((k) => c.modules[k]);
  const used = Object.entries(demo.data.activity).sort((a, b) => b[1] - a[1]);
  const ownProducts = demo.data.products.filter((p) => !/^p\d+$/.test(p.id)).length;
  const msg = encodeURIComponent(`Hi! I tried the ${c.business.name.en} demo app and I'd like to talk about building it.`);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl grid place-items-center text-3xl overflow-hidden" style={{ background: c.brand.primary }}>
            {c.business.logo ? <img src={c.business.logo} className="h-full w-full object-cover" alt="" /> : c.business.logoEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-extrabold">{tl(c.business.name)}</div>
            <div className="text-gray-500 text-sm">{tl(PRESETS[c.industry].label)} · {[c.business.city, c.business.country].filter(Boolean).join(', ')} · {c.business.currency}</div>
          </div>
          <div className="flex gap-1.5">
            <span className="h-8 w-8 rounded-lg border" style={{ background: c.brand.primary }} />
            <span className="h-8 w-8 rounded-lg border" style={{ background: c.brand.secondary }} />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-5 text-sm">
          <Info k={tr('Contact', 'جهة الاتصال')} v={c.lead.ownerName || '—'} />
          <Info k={tr('Phone', 'الهاتف')} v={c.lead.phone || '—'} ltr />
          <Info k={tr('Email', 'البريد')} v={c.lead.email || '—'} ltr />
          <Info k={tr('Demo created', 'تاريخ الإنشاء')} v={fmtDate(c.createdAt, lang)} />
          <Info k={tr('Demo expires', 'ينتهي في')} v={fmtDate(c.expiresAt, lang)} />
          <Info k={tr('Font / corners', 'الخط / الزوايا')} v={`${c.brand.font} / ${c.brand.radius}`} />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="font-bold mb-3">{tr('Features requested', 'الميزات المطلوبة')}</div>
          <div className="flex flex-wrap gap-2">
            {on.map((k) => <span key={k} className="rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 text-sm font-medium">✓ {tl(MODULE_LABELS[k])}</span>)}
          </div>
          <div className="font-bold mt-5 mb-2">{tr('Payments', 'طرق الدفع')}</div>
          <div className="text-sm text-gray-600">{(Object.keys(c.payments) as PaymentKey[]).filter((k) => c.payments[k]).map((k) => tl(PAY_LABEL[k])).join(' · ')}</div>
        </Card>
        <Card className="p-5">
          <div className="font-bold mb-3">{tr('What they tried in the demo', 'ما جرّبوه في النسخة التجريبية')}</div>
          {used.length === 0 ? (
            <div className="text-sm text-gray-500">{tr('Nothing yet.', 'لا شيء بعد.')}</div>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {used.map(([k, v]) => (
                <li key={k} className="flex justify-between"><span>{ACTIVITY[k] ? tl(ACTIVITY[k]) : k}</span><span className="font-bold tabular-nums">{v}×</span></li>
              ))}
            </ul>
          )}
          {ownProducts > 0 && <div className="mt-3 text-sm text-emerald-700 font-medium">{tr(`Added ${ownProducts} of their own products`, `أضاف ${ownProducts} من منتجاته الخاصة`)}</div>}
        </Card>
      </div>

      {Object.keys(c.lead.answers).length > 0 && (
        <Card className="p-5">
          <div className="font-bold mb-3">{tr('Questionnaire answers', 'إجابات الاستبيان')}</div>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {Object.entries(c.lead.answers).map(([k, v]) => (
              <div key={k} className="flex gap-2"><dt className="text-gray-500 capitalize min-w-24">{k}</dt><dd className="font-medium whitespace-pre-wrap">{v}</dd></div>
            ))}
          </dl>
        </Card>
      )}

      {showCta && (
        <Card className="p-5 bg-gray-900 text-white border-0 no-print">
          <div className="text-lg font-bold">{tr('Ready for your real app?', 'جاهز لتطبيقك الحقيقي؟')}</div>
          <p className="text-white/70 text-sm mt-1">{tr('We will redesign the UI around your brand, adjust every feature to how you work, and publish it on the App Store and Google Play under your name.', 'سنعيد تصميم الواجهة حول علامتك، ونعدّل كل ميزة حسب طريقة عملك، وننشره على App Store و Google Play باسمك.')}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <a href={`https://wa.me/${PLATFORM.salesWhatsApp}?text=${msg}`} target="_blank" rel="noreferrer"><Button variant="accent" icon={<MessageCircle size={18} />}>WhatsApp</Button></a>
            <a href={`mailto:${PLATFORM.salesEmail}?subject=${encodeURIComponent(c.business.name.en + ' app')}&body=${msg}`}><Button variant="secondary" icon={<Mail size={18} />}>{tr('Email us', 'راسلنا')}</Button></a>
            <Button variant="ghost" className="!text-white hover:!bg-white/10" icon={<Printer size={18} />} onClick={() => window.print()}>{tr('Print / PDF', 'طباعة / PDF')}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

const Info = ({ k, v, ltr }: { k: string; v: string; ltr?: boolean }) => (
  <div className="rounded-xl bg-gray-50 px-3 py-2">
    <div className="text-xs text-gray-500">{k}</div>
    <div className="font-medium truncate" dir={ltr ? 'ltr' : undefined}>{v}</div>
  </div>
);
