import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, Smartphone, Rocket, Lock } from 'lucide-react';
import { useStore } from '../lib/store';
import { useI18n } from '../lib/i18n';
import { PRESETS, COMING_SOON } from '../lib/presets';
import { PLATFORM } from '../platform.config';
import { LangToggle } from '../components/LangToggle';
import { Button } from '../components/ui';
import { fmtDate } from '../lib/utils';

export default function Landing() {
  const { tr, tl, lang } = useI18n();
  const demosMap = useStore((s) => s.demos);
  const demos = Object.values(demosMap).sort((a, b) => b.config.createdAt - a.config.createdAt);
  const nav = useNavigate();

  return (
    <div className="min-h-full bg-white">
      <header className="bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center gap-3">
          <img src="./icon.svg" className="h-9 w-9" alt="" />
          <div className="font-extrabold text-lg flex-1">{PLATFORM.name}</div>
          <LangToggle dark />
        </div>
        <div className="max-w-6xl mx-auto px-5 pt-10 pb-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 text-amber-300 px-3 py-1 text-sm font-semibold">
              {tr('Free interactive demo · ready in 2 minutes', 'تجربة تفاعلية مجانية · جاهزة خلال دقيقتين')}
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight">
              {tr('Your own branded app.', 'تطبيقك الخاص بعلامتك.')}
              <br />
              <span className="text-amber-400">{tr('Try it before you buy it.', 'جرّبه قبل أن تشتريه.')}</span>
            </h1>
            <p className="mt-5 text-lg text-gray-300 max-w-xl">{tl(PLATFORM.tagline)} {tr('Ordering, loyalty points, QR rewards, bookings and a full admin panel — with your name, logo and colors.', 'الطلبات، نقاط الولاء، مكافآت QR، الحجوزات ولوحة تحكم كاملة — باسمك وشعارك وألوانك.')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="accent" onClick={() => nav('/start')} className="!rounded-full px-7">
                {tr('Build my demo app', 'أنشئ تطبيقي التجريبي')} <ArrowRight size={18} className="rtl:rotate-180" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(Object.values(PRESETS)).map((p) => (
              <button
                key={p.industry}
                onClick={() => nav('/start?industry=' + p.industry)}
                className="group rounded-3xl p-4 text-start transition hover:-translate-y-1"
                style={{ background: p.palette.primary }}
              >
                <div className="text-4xl">{p.emoji}</div>
                <div className="mt-6 font-bold" style={{ color: '#fff' }}>{tl(p.label)}</div>
                <div className="text-xs mt-1 text-white/70 leading-snug">{tl(p.blurb)}</div>
              </button>
            ))}
            {COMING_SOON.map((c) => (
              <div key={c.emoji} className="rounded-3xl p-4 bg-white/5 border border-white/10">
                <div className="text-4xl opacity-60">{c.emoji}</div>
                <div className="mt-6 font-bold text-white/70">{tl(c.label)}</div>
                <div className="text-xs mt-1 text-white/40">{tr('Coming soon', 'قريباً')}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 py-16">
        <h2 className="text-2xl font-extrabold text-center">{tr('How it works', 'كيف تعمل')}</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {[
            { icon: <ClipboardList />, t: tr('1. Answer a few questions', '1. أجب عن بعض الأسئلة'), d: tr('Your business type, name, logo, colors and the features you want.', 'نوع عملك، الاسم، الشعار، الألوان والميزات التي تريدها.') },
            { icon: <Smartphone />, t: tr('2. Use your app for real', '2. استخدم تطبيقك فعلياً'), d: tr('Order as a customer, accept as staff, manage everything as the owner. Add your real products.', 'اطلب كزبون، اقبل الطلب كموظف، وأدر كل شيء كمالك. أضف منتجاتك الحقيقية.') },
            { icon: <Rocket />, t: tr('3. We build the final version', '3. نبني النسخة النهائية'), d: tr('We tailor the design and features to you, and publish on the App Store and Google Play.', 'نصمم الواجهة والميزات حسب احتياجك، وننشره على App Store و Google Play.') },
          ].map((s) => (
            <div key={s.t} className="rounded-3xl bg-gray-50 p-6">
              <div className="h-11 w-11 rounded-2xl bg-gray-900 text-amber-400 grid place-items-center">{s.icon}</div>
              <div className="font-bold text-lg mt-4">{s.t}</div>
              <div className="text-gray-600 mt-1">{s.d}</div>
            </div>
          ))}
        </div>

        {demos.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-extrabold">{tr('Your demos on this device', 'تطبيقاتك التجريبية على هذا الجهاز')}</h2>
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {demos.map((d) => (
                <Link key={d.config.id} to={`/d/${d.config.id}/app`} className="flex items-center gap-3 rounded-2xl border border-gray-200 p-4 hover:border-gray-400 transition">
                  <div className="h-12 w-12 rounded-xl grid place-items-center text-2xl overflow-hidden" style={{ background: d.config.brand.primary }}>
                    {d.config.business.logo ? <img src={d.config.business.logo} className="h-full w-full object-cover" alt="" /> : d.config.business.logoEmoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{tl(d.config.business.name)}</div>
                    <div className="text-xs text-gray-500">{tl(PRESETS[d.config.industry].label)} · {fmtDate(d.config.createdAt, lang)}</div>
                  </div>
                  <ArrowRight size={18} className="text-gray-400 rtl:rotate-180" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-5 py-6 flex items-center justify-between text-sm text-gray-500">
          <span>© {new Date().getFullYear()} {PLATFORM.name} · v{__APP_VERSION__}</span>
          <Link to="/sales" className="inline-flex items-center gap-1 hover:text-gray-900">
            <Lock size={14} /> {tr('Sales console', 'لوحة المبيعات')}
          </Link>
        </div>
      </footer>
    </div>
  );
}
