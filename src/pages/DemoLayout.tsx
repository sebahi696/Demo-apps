import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  User, ChefHat, LayoutDashboard, Bike, ListChecks, MoreHorizontal, Share2, Zap, Download, RotateCcw, FileText, Home, Check, X, ChevronRight, Lock, MessageCircle,
} from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { DemoIdContext, useDemo } from '../lib/demo';
import { applyDocLang } from '../lib/i18n';
import { applyTheme } from '../lib/theme';
import { buildData } from '../lib/seed';
import { shareLink } from '../lib/share';
import { claimToken, nextStatus, setOrderStatus } from '../lib/ops';
import { DAY, isIOS, isStandalone } from '../lib/utils';
import { PLATFORM } from '../platform.config';
import { CLIENT_MODE, CLIENT_PKG } from '../lib/client';
import type { Role } from '../lib/types';
import { Button, Modal, Toggle, cx } from '../components/ui';
import { QRCode } from '../components/qr';
import { PlanSummary } from '../components/PlanSummary';
import CustomerApp from './customer/CustomerApp';
import StaffApp from './staff/StaffApp';
import OwnerApp from './owner/OwnerApp';
import RiderApp from './rider/RiderApp';

export default function DemoLayout() {
  const { id = '' } = useParams();
  const exists = useStore((s) => !!s.demos[id]);
  if (!exists)
    return (
      <div className="min-h-full grid place-items-center p-6 text-center">
        <div>
          <div className="text-5xl">🔍</div>
          <h1 className="text-xl font-bold mt-3">Demo not found on this device</h1>
          <p className="text-gray-500 mt-1">Demos are saved on the device that created them. Ask for a share link.</p>
          <Link to="/" className="inline-block mt-5 rounded-full bg-gray-900 text-white px-5 py-2.5 font-semibold">Home</Link>
        </div>
      </div>
    );
  return (
    <DemoIdContext.Provider value={id}>
      <DemoShell />
    </DemoIdContext.Provider>
  );
}

/** True inside the App design live preview (an iframe): hide the demo chrome. */
export const EMBEDDED = typeof window !== 'undefined' && window.self !== window.top;

let deferredPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

function DemoShell() {
  const { cfg, lang, tl, id } = useDemo();
  const loc = useLocation();
  const [params, setParams] = useSearchParams();
  const setLang = useStore((s) => s.setLang);
  const [tourOpen, setTourOpen] = useState(false);
  const [, setGateTick] = useState(0);
  const role: Role = loc.pathname.includes('/staff') ? 'staff' : loc.pathname.includes('/rider') ? 'rider' : loc.pathname.includes('/owner') ? 'owner' : 'customer';

  useEffect(() => {
    applyTheme(cfg.brand, lang);
    applyDocLang(lang);
  }, [cfg.brand, lang]);

  // First visit after creating the demo: use its language and open the tour.
  useEffect(() => {
    if (params.get('welcome')) {
      setLang(cfg.defaultLang);
      setTourOpen(true);
      params.delete('welcome');
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-demo title, icon and install manifest so "Add to Home Screen" shows the business, not the platform.
  useEffect(() => {
    const name = tl(cfg.business.name);
    document.title = name;
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', name);
    let cancelled = false;
    makeIcon(cfg.brand.primary, cfg.business.logoEmoji, cfg.business.logo).then((icon) => {
      if (cancelled) return;
      const startUrl = `${location.origin}${location.pathname}#/d/${id}/app`;
      const manifest = {
        name, short_name: name.slice(0, 12), start_url: startUrl, scope: `${location.origin}${location.pathname}`, display: 'standalone',
        background_color: '#ffffff', theme_color: cfg.brand.primary, icons: [{ src: icon, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
      };
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (link) link.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
      document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', icon);
    });
    return () => {
      cancelled = true;
    };
  }, [cfg.business.name, cfg.business.logo, cfg.business.logoEmoji, cfg.brand.primary, id, tl]);

  useSimulation();

  // On phones the checklist covers the app, so it closes whenever the screen changes.
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) return void (firstPath.current = false);
    if (window.innerWidth < 640) setTourOpen(false);
  }, [loc.pathname]);

  const expired = !CLIENT_MODE && cfg.expiresAt < Date.now();

  if (CLIENT_MODE && role !== 'customer' && !EMBEDDED && sessionStorage.getItem('gate-' + role) !== '1') return <ClientGate role={role} onOk={() => setGateTick((x) => x + 1)} />;

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-100">
      {!EMBEDDED && !CLIENT_MODE && <DemoBar role={role} onTour={() => setTourOpen((v) => !v)} />}
      {!EMBEDDED && CLIENT_MODE && role !== 'customer' && <ClientBar role={role} />}
      <div className={cx('flex-1 min-h-0 relative transition-[padding]', tourOpen && !expired && 'xl:pe-[360px]')}>
        {expired ? (
          <Expired />
        ) : (
          <Routes>
            <Route path="app/*" element={<CustomerApp />} />
            <Route path="claim/:token" element={<Claim />} />
            <Route path="staff/*" element={<StaffApp />} />
            <Route path="rider/*" element={<RiderApp />} />
            <Route path="owner/*" element={<OwnerApp />} />
            <Route path="*" element={<Navigate to="app" replace />} />
          </Routes>
        )}
        {tourOpen && !expired && !EMBEDDED && !CLIENT_MODE && <TourPanel onClose={() => setTourOpen(false)} />}
      </div>
    </div>
  );
}

async function makeIcon(color: string, emoji: string, logo?: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = color;
  x.fillRect(0, 0, 512, 512);
  if (logo) {
    const img = new Image();
    img.src = logo;
    await new Promise((r) => { img.onload = r; img.onerror = r; });
    x.drawImage(img, 96, 96, 320, 320);
  } else {
    x.font = '280px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(emoji, 256, 280);
  }
  return c.toDataURL('image/png');
}

/** Optional "store activity" simulation: orders move forward on their own. */
function useSimulation() {
  const { id } = useDemo();
  const simulate = useStore((s) => s.simulate);
  useEffect(() => {
    if (!simulate) return;
    const t = setInterval(() => {
      const st = useStore.getState();
      const d = st.demos[id];
      if (!d) return;
      const due = d.data.orders.find((o) => {
        const nx = nextStatus(o);
        return nx && o.status !== 'cancelled' && Date.now() - o.updatedAt > 7000;
      });
      if (due) st.update(id, (x) => setOrderStatus(x, due.id, nextStatus(due)!));
    }, 2500);
    return () => clearInterval(t);
  }, [simulate, id]);
}

function DemoBar({ role, onTour }: { role: Role; onTour: () => void }) {
  const { cfg, data, tr, tl, lang, base, id, update } = useDemo();
  const nav = useNavigate();
  const setLang = useStore((s) => s.setLang);
  const simulate = useStore((s) => s.simulate);
  const setSimulate = useStore((s) => s.setSimulate);
  const [menu, setMenu] = useState(false);
  const [share, setShare] = useState(false);
  const [install, setInstall] = useState(false);
  const [plan, setPlan] = useState(false);
  const [pin, setPin] = useState(false);
  const days = Math.max(0, Math.ceil((cfg.expiresAt - Date.now()) / DAY));
  const tour = useTourItems();
  const done = tour.filter((t) => data.tour[t.key]).length;
  const staffOk = useRef(sessionStorage.getItem('staff-' + id) === '1');

  const go = (r: Role) => {
    if (r === 'staff' && !staffOk.current) return setPin(true);
    nav(r === 'customer' ? `${base}/app` : r === 'staff' ? `${base}/staff` : r === 'rider' ? `${base}/rider` : `${base}/owner`);
  };

  const roles: { r: Role; icon: JSX.Element; label: string }[] = [
    { r: 'customer', icon: <User size={16} />, label: tr('Customer', 'الزبون') },
    { r: 'staff', icon: <ChefHat size={16} />, label: tr('Staff', 'الموظف') },
    ...(cfg.modules.delivery ? [{ r: 'rider' as Role, icon: <Bike size={16} />, label: tr('Rider', 'السائق') }] : []),
    { r: 'owner', icon: <LayoutDashboard size={16} />, label: tr('Owner', 'المالك') },
  ];

  return (
    <>
      <div className="no-print shrink-0 bg-gray-950 text-white h-12 flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 z-40">
        <Link to="/" className="h-9 w-8 sm:w-9 grid place-items-center rounded-full hover:bg-white/10 shrink-0" title={PLATFORM.name}>
          <Home size={17} />
        </Link>
        <div className="hidden md:flex items-center gap-2 min-w-0">
          <span className="font-semibold truncate max-w-[160px]">{tl(cfg.business.name)}</span>
          <span className="rounded-full bg-amber-400 text-gray-900 text-[10px] font-extrabold px-2 py-0.5 tracking-wide">DEMO</span>
          <span className="text-xs text-white/50 whitespace-nowrap">{tr(`${days}d left`, `متبقٍ ${days} يوم`)}</span>
        </div>
        <div className="flex-1 min-w-0 flex justify-center">
          <div className="flex rounded-full bg-white/10 p-0.5 max-w-full">
            {roles.map((x) => (
              <button key={x.r} onClick={() => go(x.r)}
                className={cx('flex items-center gap-1.5 rounded-full px-2.5 sm:px-3.5 h-8 text-sm font-semibold transition shrink-0', role === x.r ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white')}>
                {x.icon}
                <span className={cx(role === x.r ? 'inline' : 'hidden sm:inline')}>{x.label}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={onTour} aria-label={tr('Guided tour', 'الجولة')} className="h-9 px-1.5 sm:px-2.5 rounded-full hover:bg-white/10 flex items-center gap-1.5 text-sm font-semibold shrink-0">
          <ListChecks size={17} className="text-amber-400" />
          <span className="tabular-nums">{done}/{tour.length}</span>
        </button>
        <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="hidden sm:grid h-9 min-w-9 px-2 place-items-center rounded-full hover:bg-white/10 text-sm font-bold shrink-0">
          {lang === 'en' ? 'ع' : 'EN'}
        </button>
        <div className="relative shrink-0">
          <button onClick={() => setMenu((v) => !v)} aria-label={tr('More', 'المزيد')} className="h-9 w-8 sm:w-9 grid place-items-center rounded-full hover:bg-white/10"><MoreHorizontal size={18} /></button>
          {menu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
              <div className="absolute end-0 top-11 z-50 w-72 rounded-2xl bg-white text-gray-900 shadow-2xl p-2">
                <div className="px-3 py-2 sm:hidden">
                  <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="w-full text-start font-semibold">{lang === 'en' ? 'العربية' : 'English'}</button>
                </div>
                <div className="px-3 py-2.5">
                  <Toggle checked={simulate} onChange={setSimulate} label={<span className="flex items-center gap-1.5"><Zap size={15} className="text-amber-500" />{tr('Simulate store activity', 'محاكاة نشاط المتجر')}</span>}
                    desc={tr('Orders move forward by themselves', 'تتقدّم الطلبات تلقائياً')} />
                </div>
                <MenuItem icon={<Share2 size={16} />} onClick={() => { setShare(true); setMenu(false); }}>{tr('Open on another phone', 'افتح على هاتف آخر')}</MenuItem>
                <MenuItem icon={<Download size={16} />} onClick={() => { setInstall(true); setMenu(false); }}>{tr('Install as app', 'ثبّت كتطبيق')}</MenuItem>
                <MenuItem icon={<FileText size={16} />} onClick={() => { setPlan(true); setMenu(false); }}>{tr('My app plan', 'خطة تطبيقي')}</MenuItem>
                <MenuItem icon={<RotateCcw size={16} />} onClick={() => {
                  setMenu(false);
                  if (confirm(tr('Reset all demo data (orders, points, products)? Branding and settings stay.', 'إعادة ضبط كل البيانات (الطلبات، النقاط، المنتجات)؟ تبقى الهوية والإعدادات.')))
                    update((d) => void (d.data = buildData(d.config)));
                }}>{tr('Reset demo data', 'إعادة ضبط البيانات')}</MenuItem>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={share} onClose={() => setShare(false)} title={tr('Open on another phone', 'افتح على هاتف آخر')} size="sm">
        <div className="text-center">
          <div className="inline-block rounded-2xl border p-3 bg-white"><QRCode value={shareLink(cfg)} size={220} /></div>
          <p className="text-sm text-gray-600 mt-3">{tr('Scan with the phone camera. It opens a copy of this app with the same branding and settings.', 'امسح بكاميرا الهاتف. ستفتح نسخة من هذا التطبيق بنفس الهوية والإعدادات.')}</p>
          <p className="text-xs text-gray-400 mt-1">{tr('Orders and points are saved separately on each device.', 'تُحفظ الطلبات والنقاط بشكل منفصل على كل جهاز.')}</p>
          <Button className="mt-4" variant="outline" onClick={async () => { await navigator.clipboard.writeText(shareLink(cfg)); toast(tr('Link copied', 'تم نسخ الرابط')); }}>{tr('Copy link', 'نسخ الرابط')}</Button>
        </div>
      </Modal>
      <InstallModal open={install} onClose={() => setInstall(false)} />
      <Modal open={plan} onClose={() => setPlan(false)} title={tr('My app plan', 'خطة تطبيقي')} size="lg">
        <PlanSummaryForCurrent />
      </Modal>
      <StaffPin open={pin} onClose={() => setPin(false)} onOk={() => {
        staffOk.current = true;
        sessionStorage.setItem('staff-' + id, '1');
        setPin(false);
        nav(`${base}/staff`);
      }} />
    </>
  );
}

function PlanSummaryForCurrent() {
  const { demo } = useDemo();
  return <PlanSummary demo={demo} />;
}

const MenuItem = ({ icon, children, onClick }: { icon: JSX.Element; children: ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 text-start font-medium">
    <span className="text-gray-500">{icon}</span>
    {children}
  </button>
);

function StaffPin({ open, onClose, onOk }: { open: boolean; onClose: () => void; onOk: () => void }) {
  const { data, tr } = useDemo();
  const [v, setV] = useState('');
  useEffect(() => {
    if (v.length === 4) {
      const who = data.staff.find((s) => s.active && s.pin === v);
      if (who) {
        sessionStorage.setItem('staffWho-' + location.hash.split('/')[2], who.id);
        setV('');
        onOk();
      } else {
        toast(tr('Wrong PIN', 'رمز خاطئ'), 'error');
        setV('');
      }
    }
  }, [v, data.staff, onOk, tr]);
  return (
    <Modal open={open} onClose={onClose} title={tr('Staff login', 'دخول الموظفين')} size="sm">
      <div className="text-center">
        <div className="flex justify-center gap-3 my-2">
          {[0, 1, 2, 3].map((i) => <span key={i} className={cx('h-4 w-4 rounded-full', i < v.length ? 'bg-gray-900' : 'bg-gray-200')} />)}
        </div>
        <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto mt-5" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) => (
            <button key={k} disabled={!k} onClick={() => setV((x) => (k === '⌫' ? x.slice(0, -1) : (x + k).slice(0, 4)))}
              className={cx('h-14 rounded-2xl text-xl font-bold', k ? 'bg-gray-100 active:bg-gray-200' : '')}>{k}</button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4">{tr('Demo PIN:', 'رمز التجربة:')} <b dir="ltr">1234</b></p>
      </div>
    </Modal>
  );
}

export function InstallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tr } = useDemo();
  const ios = isIOS();
  return (
    <Modal open={open} onClose={onClose} title={tr('Install the app', 'ثبّت التطبيق')} size="sm">
      {isStandalone() ? (
        <p className="text-center py-4">✅ {tr('You are already using the installed app.', 'أنت تستخدم التطبيق المثبّت بالفعل.')}</p>
      ) : ios ? (
        <ol className="space-y-3 text-[15px]">
          <li>1. {tr('Tap the Share button', 'اضغط زر المشاركة')} <span className="inline-block rounded bg-gray-100 px-1.5">⎋</span> {tr('in Safari', 'في Safari')}</li>
          <li>2. {tr('Choose “Add to Home Screen”', 'اختر "إضافة إلى الشاشة الرئيسية"')}</li>
          <li>3. {tr('Tap “Add” — the app icon appears on your home screen', 'اضغط "إضافة" — ستظهر أيقونة التطبيق على الشاشة الرئيسية')}</li>
          <li className="text-sm text-gray-500">{tr('Notifications on iPhone work after installing (iOS 16.4+).', 'تعمل الإشعارات على iPhone بعد التثبيت (iOS 16.4+).')}</li>
        </ol>
      ) : deferredPrompt ? (
        <div className="text-center">
          <p className="mb-4">{tr('Add this app to your home screen for the full app experience.', 'أضف هذا التطبيق إلى شاشتك الرئيسية لتجربة كاملة.')}</p>
          <Button onClick={async () => { await deferredPrompt.prompt(); deferredPrompt = null; onClose(); }}>{tr('Install', 'تثبيت')}</Button>
        </div>
      ) : (
        <ol className="space-y-3 text-[15px]">
          <li>1. {tr('Open the browser menu (⋮)', 'افتح قائمة المتصفح (⋮)')}</li>
          <li>2. {tr('Choose “Install app” or “Add to Home screen”', 'اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"')}</li>
        </ol>
      )}
    </Modal>
  );
}

export function useTourItems() {
  const { cfg, tr, terms, tl } = useDemo();
  const m = cfg.modules;
  const loyalty = m.loyaltyPoints || m.loyaltyStamps;
  return useMemo(
    () =>
      [
        m.ordering && { key: 'addToCart', role: 'customer', to: 'app/menu', label: tr(`Browse the ${tl(terms.catalog).toLowerCase()} and add to cart`, `تصفّح ${tl(terms.catalog)} وأضف إلى السلة`) },
        m.ordering && { key: 'placeOrder', role: 'customer', to: 'app/cart', label: tr('Check out and place an order', 'أكمل الدفع وقدّم الطلب') },
        m.ordering && { key: 'staffAccept', role: 'staff', to: 'staff', label: tr('As staff, accept the new order', 'كموظف، اقبل الطلب الجديد') },
        m.delivery && { key: 'dispatch', role: 'staff', to: 'staff', label: tr('Send a rider with a delivery order', 'أرسل سائقاً مع طلب توصيل') },
        m.delivery && { key: 'riderCash', role: 'rider', to: 'rider', label: tr('As the rider, collect the cash and deliver', 'كسائق، استلم النقود وسلّم الطلب') },
        loyalty && { key: 'claimQr', role: 'staff', to: 'staff/award', label: tr('Award points with a staff QR, then claim it', 'امنح النقاط برمز QR ثم استلمها') },
        m.loyaltyPoints && { key: 'redeemReward', role: 'customer', to: 'app/rewards', label: tr('Redeem a reward with your points', 'استبدل مكافأة بنقاطك') },
        loyalty && { key: 'staffVoucher', role: 'staff', to: 'staff/scan', label: tr('As staff, scan the reward voucher', 'كموظف، امسح قسيمة المكافأة') },
        m.reservations && { key: 'reservation', role: 'customer', to: 'app/reserve', label: tl(terms.reserve) },
        { key: 'branding', role: 'owner', to: 'owner/branding', label: tr('Change your logo or colors', 'غيّر شعارك أو ألوانك') },
        { key: 'addProduct', role: 'owner', to: 'owner/catalog', label: tr('Add one of your real products', 'أضف أحد منتجاتك الحقيقية') },
        m.campaigns && { key: 'campaign', role: 'owner', to: 'owner/campaigns', label: tr('Send a push notification', 'أرسل إشعاراً') },
      ].filter(Boolean) as { key: string; role: Role; to: string; label: string }[],
    [m, tr, terms, tl, loyalty],
  );
}

function TourPanel({ onClose }: { onClose: () => void }) {
  const { data, tr, base, id } = useDemo();
  const nav = useNavigate();
  const items = useTourItems();
  const done = items.filter((t) => data.tour[t.key]).length;
  const roleIcon = { customer: <User size={13} />, staff: <ChefHat size={13} />, rider: <Bike size={13} />, owner: <LayoutDashboard size={13} /> };
  return (
    <div className="no-print absolute z-40 bottom-3 end-3 start-3 sm:start-auto sm:w-[340px] rounded-3xl bg-white shadow-2xl border border-gray-200 overflow-hidden animate-[up_.2s_ease]">
      <div className="bg-gray-950 text-white px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="font-bold">{tr('Try everything', 'جرّب كل شيء')}</div>
          <div className="text-xs text-white/60">{tr('Switch roles at the top to play every part.', 'بدّل الأدوار في الأعلى لتجربة كل جزء.')}</div>
        </div>
        <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/10"><X size={18} /></button>
      </div>
      <div className="h-1.5 bg-gray-100"><div className="h-full bg-amber-400 transition-all" style={{ width: `${(done / items.length) * 100}%` }} /></div>
      <ul className="max-h-[50vh] overflow-y-auto p-2">
        {items.map((t) => {
          const ok = !!data.tour[t.key];
          return (
            <li key={t.key}>
              <button
                onClick={() => {
                  if (t.role === 'staff') sessionStorage.setItem('staff-' + id, '1');
                  nav(`${base}/${t.to}`);
                  if (window.innerWidth < 640) onClose();
                }}
                className="w-full flex items-center gap-3 rounded-2xl px-2.5 py-2.5 hover:bg-gray-50 text-start"
              >
                <span className={cx('h-6 w-6 rounded-full grid place-items-center shrink-0', ok ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300')}>{ok && <Check size={14} />}</span>
                <span className={cx('flex-1 text-sm', ok && 'text-gray-400 line-through')}>{t.label}</span>
                <span className="text-gray-400">{roleIcon[t.role]}</span>
                <ChevronRight size={16} className="text-gray-300 rtl:rotate-180" />
              </button>
            </li>
          );
        })}
      </ul>
      {done === items.length && (
        <div className="p-4 border-t bg-emerald-50 text-sm text-emerald-800 font-medium">🎉 {tr('You have tried it all! Open “My app plan” from the ⋯ menu to talk to us.', 'لقد جرّبت كل شيء! افتح "خطة تطبيقي" من قائمة ⋯ للتواصل معنا.')}</div>
      )}
    </div>
  );
}

function Claim() {
  const { token = '' } = useParams();
  const { update, base, tr } = useDemo();
  const nav = useNavigate();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let res: ReturnType<typeof claimToken> = { ok: false };
    update((d) => void (res = claimToken(d, token)));
    if (res.ok) toast(tr(`+${res.points} points added!`, `تمت إضافة ${res.points} نقطة!`));
    else toast(res.error ? tr(res.error.en, res.error.ar ?? res.error.en) : 'Error', 'error');
    nav(`${base}/app/rewards`, { replace: true });
  }, [token, update, nav, base, tr]);
  return null;
}

function Expired() {
  const { tr, tl, cfg, demo } = useDemo();
  const msg = encodeURIComponent(`Hi! My ${cfg.business.name.en} demo has ended — I'd like to continue.`);
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-5">
        <div className="text-center py-8">
          <div className="h-16 w-16 mx-auto rounded-full bg-gray-900 text-amber-400 grid place-items-center"><Lock /></div>
          <h1 className="text-2xl font-extrabold mt-4">{tr('Your demo period has ended', 'انتهت فترة التجربة')}</h1>
          <p className="text-gray-500 mt-2">{tr(`Thanks for trying ${tl(cfg.business.name)}. Let’s build the real one — your data and choices are saved.`, `شكراً لتجربة ${tl(cfg.business.name)}. لنبنِ النسخة الحقيقية — بياناتك واختياراتك محفوظة.`)}</p>
          <a href={`https://wa.me/${PLATFORM.salesWhatsApp}?text=${msg}`} target="_blank" rel="noreferrer" className="inline-block mt-5">
            <Button variant="dark" size="lg" icon={<MessageCircle size={18} />}>{tr('Talk to us on WhatsApp', 'تواصل معنا عبر واتساب')}</Button>
          </a>
        </div>
        <PlanSummary demo={demo} showCta={false} />
      </div>
    </div>
  );
}

/** Client builds: staff, riders and the owner sign in with a PIN. */
function ClientGate({ role, onOk }: { role: Role; onOk: () => void }) {
  const { data, tr, tl, cfg } = useDemo();
  const [v, setV] = useState('');
  const [, force] = useState(0);
  const ok = (pin: string) =>
    role === 'owner' ? pin === CLIENT_PKG!.ownerPin
    : role === 'rider' ? data.riders.some((r) => r.active && r.pin === pin)
    : data.staff.some((s) => s.active && s.pin === pin) || pin === CLIENT_PKG!.ownerPin;
  useEffect(() => {
    if (v.length < 4) return;
    if (ok(v)) { sessionStorage.setItem('gate-' + role, '1'); force((x) => x + 1); onOk(); }
    else { toast(tr('Wrong PIN', 'رمز خاطئ'), 'error'); setV(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  const title = { owner: tr('Owner panel', 'لوحة المالك'), staff: tr('Staff', 'الموظفون'), rider: tr('Rider app', 'تطبيق السائق'), customer: '' }[role];
  return (
    <div className="h-[100dvh] grid place-items-center bg-gray-950 p-6 text-white">
      <div className="w-full max-w-xs text-center">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-brand text-onbrand grid place-items-center text-3xl overflow-hidden">{cfg.business.logo ? <img src={cfg.business.logo} className="h-full w-full object-cover" alt="" /> : cfg.business.logoEmoji}</div>
        <div className="mt-3 text-white/60 text-sm">{tl(cfg.business.name)}</div>
        <h1 className="text-xl font-bold">{title}</h1>
        <div className="flex justify-center gap-3 my-5">{[0, 1, 2, 3].map((i) => <span key={i} className={cx('h-4 w-4 rounded-full', i < v.length ? 'bg-white' : 'bg-white/20')} />)}</div>
        <div className="grid grid-cols-3 gap-2" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) => (
            <button key={k} disabled={!k} onClick={() => setV((x) => (k === '⌫' ? x.slice(0, -1) : (x + k).slice(0, 4)))} className={cx('h-14 rounded-2xl text-xl font-bold', k ? 'bg-white/10 active:bg-white/20' : '')}>{k}</button>
          ))}
        </div>
        <a href="#/" className="block text-white/40 text-sm mt-6">{tr('Back to the app', 'العودة إلى التطبيق')}</a>
      </div>
    </div>
  );
}

function ClientBar({ role }: { role: Role }) {
  const { cfg, tr, tl, base, lang } = useDemo();
  const nav = useNavigate();
  const setLang = useStore((s) => s.setLang);
  const roles: { r: Role; label: string }[] = [
    { r: 'staff', label: tr('Orders', 'الطلبات') },
    ...(cfg.modules.delivery ? [{ r: 'rider' as Role, label: tr('Rider', 'السائق') }] : []),
    { r: 'owner', label: tr('Owner', 'المالك') },
  ];
  return (
    <div className="shrink-0 bg-gray-950 text-white h-12 flex items-center gap-2 px-3">
      <span className="font-semibold truncate">{tl(cfg.business.name)}</span>
      <div className="flex-1 flex justify-center">
        <div className="flex rounded-full bg-white/10 p-0.5">
          {roles.map((x) => (
            <button key={x.r} onClick={() => nav(`${base}/${x.r}`)} className={cx('rounded-full px-3.5 h-8 text-sm font-semibold', role === x.r ? 'bg-white text-gray-900' : 'text-white/70')}>{x.label}</button>
          ))}
        </div>
      </div>
      <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="h-9 px-2 rounded-full hover:bg-white/10 text-sm font-bold">{lang === 'en' ? 'ع' : 'EN'}</button>
      <button onClick={() => { ['owner', 'staff', 'rider'].forEach((r) => sessionStorage.removeItem('gate-' + r)); nav(`${base}/app`); }} className="h-9 px-3 rounded-full hover:bg-white/10 text-sm">{tr('Lock', 'قفل')}</button>
    </div>
  );
}
