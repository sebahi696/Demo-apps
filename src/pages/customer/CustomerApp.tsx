import { useEffect, useRef, type ReactNode } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, ShoppingBag, Gift, Receipt, User, CalendarDays, ArrowLeft, ShoppingCart } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { totals } from '../../lib/ops';
import { shareLink } from '../../lib/share';
import { tl as tlRaw } from '../../lib/utils';
import { cx } from '../../components/ui';
import { QRCode } from '../../components/qr';
import Home from './Home';
import Menu from './Menu';
import { Cart, Checkout } from './Cart';
import { Orders, OrderDetail } from './Orders';
import { Rewards, ScanEarn } from './Rewards';
import Reserve from './Reserve';
import { Account, Inbox } from './Account';
import { Wallet, TableEntry } from './Wallet';

/** Customer PWA. On desktop it sits in a phone frame; on a phone it is full-screen. */
export default function CustomerApp() {
  const { cfg, tr, tl, lang } = useDemo();
  useNoticeToasts();

  return (
    <div className="h-full w-full flex items-center justify-center gap-10 md:p-4 bg-[radial-gradient(circle_at_30%_20%,#e5e7eb,#d1d5db)]">
      <aside className="hidden xl:block w-72 shrink-0">
        <div className="rounded-3xl bg-white/70 backdrop-blur p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{tr('Customer view', 'واجهة الزبون')}</div>
          <div className="font-extrabold text-xl mt-1">{tl(cfg.business.name)}</div>
          <p className="text-sm text-gray-600 mt-2">{tr('This is exactly what your customers will see. Tap around — everything works.', 'هذا تماماً ما سيراه زبائنك. جرّب كل شيء — كل شيء يعمل.')}</p>
          <div className="mt-4 rounded-2xl bg-white p-3 text-center">
            <QRCode value={shareLink(cfg)} size={150} className="mx-auto" />
            <div className="text-xs text-gray-500 mt-2">{tr('Scan to try it on your phone', 'امسح لتجربته على هاتفك')}</div>
          </div>
        </div>
      </aside>
      <div className="relative h-full w-full md:h-[min(844px,100%)] md:w-[400px] md:rounded-[44px] md:border-[10px] md:border-gray-900 md:shadow-2xl overflow-hidden bg-gray-50 flex flex-col" key={lang}>
        <div className="flex-1 min-h-0 relative">
          <Routes>
            <Route index element={<Home />} />
            <Route path="menu" element={<Menu />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:oid" element={<OrderDetail />} />
            <Route path="rewards" element={<Rewards />} />
            <Route path="scan" element={<ScanEarn />} />
            <Route path="reserve" element={<Reserve />} />
            <Route path="account" element={<Account />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="table/:table" element={<TableEntry />} />
          </Routes>
        </div>
        <CartBar />
        <BottomNav />
      </div>
    </div>
  );
}

function useNoticeToasts() {
  const { data, lang } = useDemo();
  const last = useRef(data.notices[0]?.id);
  useEffect(() => {
    const n = data.notices[0];
    if (!n || n.id === last.current) return;
    last.current = n.id;
    if (n.read) return;
    const title = tlRaw(n.title, lang);
    const body = tlRaw(n.body, lang);
    toast(`🔔 ${title}${body ? ' — ' + body : ''}`, 'info');
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      navigator.serviceWorker?.getRegistration().then((r) => r?.showNotification(title, { body, icon: './pwa-192.png' }));
    }
  }, [data.notices, lang]);
}

function BottomNav() {
  const { cfg, tr, tl, terms, data } = useDemo();
  const m = cfg.modules;
  const unread = data.notices.filter((n) => !n.read).length;
  const active = data.orders.filter((o) => o.customerId === data.meId && !['completed', 'cancelled'].includes(o.status)).length;
  const items: { to: string; icon: ReactNode; label: string; end?: boolean; badge?: number }[] = [
    { to: '', icon: <HomeIcon size={22} />, label: tr('Home', 'الرئيسية'), end: true },
    ...(m.ordering ? [{ to: 'menu', icon: <ShoppingBag size={22} />, label: tl(terms.catalog) }] : []),
    ...(m.loyaltyPoints || m.loyaltyStamps ? [{ to: 'rewards', icon: <Gift size={22} />, label: tr('Rewards', 'المكافآت') }] : []),
    ...(m.ordering
      ? [{ to: 'orders', icon: <Receipt size={22} />, label: tr('Orders', 'الطلبات'), badge: active }]
      : m.reservations
        ? [{ to: 'reserve', icon: <CalendarDays size={22} />, label: tl(terms.reserveCta) }]
        : []),
    { to: 'account', icon: <User size={22} />, label: tr('Account', 'حسابي'), badge: unread },
  ];
  return (
    <nav className="shrink-0 bg-white border-t border-gray-100 flex pb-[env(safe-area-inset-bottom)]">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end}
          className={({ isActive }) => cx('relative flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold transition', isActive ? 'text-brand' : 'text-gray-400')}>
          {it.icon}
          <span className="truncate max-w-full px-1">{it.label}</span>
          {!!it.badge && <span className="absolute top-1 start-[calc(50%+6px)] min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] grid place-items-center">{it.badge}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

function CartBar() {
  const { demo, data, m, tr } = useDemo();
  const loc = useLocation();
  const nav = useNavigate();
  const count = data.cart.items.reduce((s, i) => s + i.qty, 0);
  if (!count || /\/(cart|checkout)$/.test(loc.pathname)) return null;
  const t = totals(demo, 'pickup');
  return (
    <div className="absolute inset-x-3 bottom-[72px] z-20 animate-[up_.2s_ease]">
      <button onClick={() => nav('cart')} className="w-full h-14 rounded-app-lg bg-brand text-onbrand shadow-xl flex items-center gap-3 px-4 font-semibold">
        <span className="relative"><ShoppingCart size={20} /><span className="absolute -top-2 -end-2 h-5 min-w-5 px-1 rounded-full bg-brand2 text-onbrand2 text-[11px] grid place-items-center font-bold">{count}</span></span>
        <span className="flex-1 text-start">{tr('View cart', 'عرض السلة')}</span>
        <span className="tabular-nums">{m(t.subtotal)}</span>
      </button>
    </div>
  );
}

/** Shared header for customer screens. */
export function Screen({ title, back, right, children, className, noPad }: { title?: ReactNode; back?: boolean | string; right?: ReactNode; children: ReactNode; className?: string; noPad?: boolean }) {
  const nav = useNavigate();
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain">
      {title !== undefined && (
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 h-14 flex items-center gap-2 px-2">
          {back ? (
            <button onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))} className="h-10 w-10 grid place-items-center rounded-full hover:bg-gray-100"><ArrowLeft size={20} className="rtl:rotate-180" /></button>
          ) : <span className="w-2" />}
          <h1 className="flex-1 font-display font-bold text-lg truncate">{title}</h1>
          {right}
        </header>
      )}
      <div className={cx(!noPad && 'p-4', 'pb-28', className)}>{children}</div>
    </div>
  );
}
