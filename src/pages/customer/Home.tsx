import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HandPlatter, Receipt, GlassWater, Bell, QrCode, ShoppingBag, Gift, CalendarDays, Clock, MapPin, Phone, ChevronRight, RotateCcw, Plus, Wallet, ChevronDown, Heart, Check } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { me, nextTierOf, tierOf, statusLabel, statusTone, addToCart, productAvailable, storeStatus, requestService } from '../../lib/ops';
import { cx, Thumb, Modal } from '../../components/ui';

export default function Home() {
  const { demo, cfg, data, tr, tl, m, terms, update } = useDemo();
  const nav = useNavigate();
  const c = me(demo);
  const mod = cfg.modules;
  const unread = data.notices.filter((n) => !n.read).length;
  const h = new Date().getHours();
  const greet = h < 12 ? tr('Good morning', 'صباح الخير') : h < 18 ? tr('Good afternoon', 'مساء الخير') : tr('Good evening', 'مساء الخير');
  const activeOrder = data.orders.find((o) => o.customerId === c.id && !['completed', 'cancelled'].includes(o.status));
  const lastOrder = data.orders.find((o) => o.customerId === c.id && o.status === 'completed');
  const popular = data.products.filter((p) => p.popular && p.active).slice(0, 6);
  const isNew = data.products.filter((p) => p.isNew && p.active).slice(0, 6);
  const deals = mod.deals ? data.deals.filter((d) => d.active && (!d.endsAt || d.endsAt > Date.now())) : [];
  const favs = data.products.filter((p) => data.favorites.includes(p.id) && p.active);
  const st = storeStatus(demo);
  const [branchOpen, setBranchOpen] = useState(false);
  const branch = cfg.branches.find((b) => b.id === data.branchId) ?? cfg.branches[0];

  const quick = [
    mod.ordering && { to: 'menu', icon: <ShoppingBag />, label: tr('Order', 'اطلب') },
    (mod.loyaltyPoints || mod.loyaltyStamps) && { to: 'scan', icon: <QrCode />, label: tr('Scan & earn', 'امسح واكسب') },
    (mod.loyaltyPoints || mod.loyaltyStamps) && { to: 'rewards', icon: <Gift />, label: tr('Rewards', 'المكافآت') },
    mod.reservations && { to: 'reserve', icon: <CalendarDays />, label: tl(terms.reserveCta) },
    mod.wallet && { to: 'wallet', icon: <Wallet />, label: tr('Wallet', 'المحفظة') },
  ].filter(Boolean).slice(0, 4) as { to: string; icon: JSX.Element; label: string }[];


  const loyalty = mod.loyaltyPoints || mod.loyaltyStamps;
  const ui = cfg.ui;
  const headerBg =
    ui.header === 'gradient' ? 'bg-gradient-to-br from-brand via-brand to-brand2'
    : 'bg-brand';

  const blocks: Record<string, JSX.Element | null> = {
    loyalty: loyalty ? <LoyaltyCard /> : null,
    quick: quick.length ? (
      <div className={cx('grid gap-2', quick.length === 4 ? 'grid-cols-4' : quick.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {quick.map((q) => (
          <button key={q.to} onClick={() => nav(q.to)} className="rounded-app bg-white shadow-sm border border-gray-100 py-3 flex flex-col items-center gap-1.5 active:scale-95 transition">
            <span className="h-10 w-10 rounded-full bg-brand/10 text-brand grid place-items-center [&>svg]:h-5 [&>svg]:w-5">{q.icon}</span>
            <span className="text-xs font-semibold">{q.label}</span>
          </button>
        ))}
      </div>
    ) : null,
    active: activeOrder ? (
      <Link to={`orders/${activeOrder.id}`} className="flex items-center gap-3 rounded-app bg-white border-2 border-brand/30 p-3.5 animate-[up_.2s_ease]">
        <span className="h-11 w-11 rounded-full bg-brand text-onbrand grid place-items-center animate-[pulse-ring_1.6s_infinite]"><Clock size={20} /></span>
        <div className="flex-1">
          <div className="text-xs text-gray-500">{tr('Order', 'الطلب')} #{activeOrder.number}</div>
          <div className="font-bold">{tl(statusLabel(activeOrder.status, cfg.industry, activeOrder.fulfillment))}</div>
        </div>
        <span className={cx('text-xs rounded-full px-2 py-1 font-bold', statusTone[activeOrder.status])}>{tr('Track', 'تتبّع')}</span>
      </Link>
    ) : null,
    banners: <Banners />,
    deals: deals.length ? (
      <section>
        <Title>{tr('Deals for you', 'عروض لك')}</Title>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 snap-x">
          {deals.map((d) => (
            <button key={d.id} onClick={() => {
              update((x) => void (x.data.cart.couponCode = d.code));
              toast(tr(`Code ${d.code} saved to your cart`, `تم حفظ الرمز ${d.code} في سلتك`));
            }} className="snap-start shrink-0 w-[230px] rounded-app p-4 text-start relative overflow-hidden" style={{ background: d.bg }}>
              <div className="text-3xl">{d.emoji}</div>
              <div className="font-bold mt-2 leading-tight text-gray-900">{tl(d.title)}</div>
              <div className="text-xs text-gray-700 mt-1 line-clamp-2">{tl(d.desc)}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold bg-white/70 rounded px-1.5 py-0.5 text-gray-900">{d.code}</span>
                {d.endsAt && <Countdown to={d.endsAt} />}
              </div>
            </button>
          ))}
        </div>
      </section>
    ) : null,
    reorder: mod.ordering && lastOrder ? (
      <button onClick={() => {
        update((x) => lastOrder.items.filter((i) => x.data.products.some((p) => p.id === i.productId && productAvailable(p))).forEach((i) => addToCart(x, i.productId, i.qty, [])));
        toast(tr('Added to your cart', 'تمت الإضافة إلى سلتك'));
      }} className="w-full flex items-center gap-3 rounded-app bg-white border border-gray-100 p-3 text-start">
        <span className="h-10 w-10 rounded-full bg-gray-100 grid place-items-center"><RotateCcw size={18} /></span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold">{tr('Order again', 'اطلب مجدداً')}</span>
          <span className="block text-xs text-gray-500 truncate">{lastOrder.items.map((i) => tl(i.name)).join(', ')}</span>
        </span>
        <ChevronRight size={18} className="text-gray-400 rtl:rotate-180" />
      </button>
    ) : null,
    categories: mod.ordering ? (
      <section>
        <Title action={<Link to="menu" className="text-sm font-semibold text-brand">{tr('See all', 'عرض الكل')}</Link>}>{tr('Categories', 'الفئات')}</Title>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {data.categories.map((cat) => (
            <button key={cat.id} onClick={() => nav(`menu?cat=${cat.id}`)} className="shrink-0 flex flex-col items-center gap-1 w-[72px]">
              <span className="h-16 w-16 rounded-app bg-white border border-gray-100 shadow-sm grid place-items-center text-3xl">{cat.emoji}</span>
              <span className="text-xs font-medium text-center leading-tight">{tl(cat.name)}</span>
            </button>
          ))}
        </div>
      </section>
    ) : null,
    favorites: mod.ordering && favs.length ? <ProductRow title={tr('Your favorites ❤️', 'مفضلتك ❤️')} items={favs.slice(0, 4)} /> : null,
    popular: mod.ordering ? <ProductRow title={tr('Most popular', 'الأكثر طلباً')} items={popular} /> : null,
    new: mod.ordering && isNew.length ? <ProductRow title={tr('New', 'جديد')} items={isNew} /> : null,
    info: (
      <section className="rounded-app bg-white border border-gray-100 p-4 space-y-2.5 text-sm">
        <div className="font-bold">{tl(cfg.business.name)}</div>
        <div className="flex items-center gap-2 text-gray-600"><Clock size={16} /> {tr('Open', 'مفتوح')} {cfg.business.openTime} – {cfg.business.closeTime}</div>
        {(cfg.business.city || cfg.business.address) && <div className="flex items-center gap-2 text-gray-600"><MapPin size={16} /> {[cfg.business.address, cfg.business.city, cfg.business.country].filter(Boolean).join(', ')}</div>}
        {cfg.business.phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={16} /> <span dir="ltr">{cfg.business.phone}</span></div>}
      </section>
    ),
  };
  const order = ui.sections.filter((k) => blocks[k]);
  const first = order[0];

  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain pb-40">
      <div className={cx(headerBg, 'text-onbrand px-4 pt-5 rounded-b-[28px] relative overflow-hidden', ui.header === 'image' ? 'pb-20' : 'pb-14')}>
        {ui.header === 'image' && (
          <div className="absolute inset-0 pointer-events-none select-none opacity-[.14] text-[64px] leading-[1.25] break-all" aria-hidden>
            {Array.from({ length: 40 }, () => ui.coverEmoji).join(' ')}
          </div>
        )}
        <div className="relative flex items-center gap-3">
          <div className="h-12 w-12 rounded-app bg-white/15 grid place-items-center text-2xl overflow-hidden shrink-0 ring-2 ring-white/20">
            {cfg.business.logo ? <img src={cfg.business.logo} className="h-full w-full object-cover" alt="" /> : cfg.business.logoEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm opacity-75">{greet}, {c.name.split(' ')[0]} 👋</div>
            <div className="font-display font-bold text-xl truncate">{tl(cfg.business.name)}</div>
          </div>
          <Link to="inbox" className="relative h-11 w-11 rounded-full bg-white/15 grid place-items-center backdrop-blur">
            <Bell size={20} />
            {unread > 0 && <span className="absolute top-1.5 end-1.5 h-4 min-w-4 px-1 rounded-full bg-brand2 text-onbrand2 text-[10px] font-bold grid place-items-center">{unread}</span>}
          </Link>
        </div>
        {tl(cfg.business.tagline) && <div className={cx('relative mt-3 opacity-90', ui.header === 'image' ? 'font-display text-2xl font-bold leading-tight max-w-[85%]' : 'text-sm')}>{tl(cfg.business.tagline)}</div>}
        <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 backdrop-blur', st.open ? 'bg-emerald-400/25' : 'bg-black/25')}>
            <span className={cx('h-2 w-2 rounded-full', st.open ? 'bg-emerald-300' : st.paused ? 'bg-rose-300' : 'bg-amber-300')} />
            {st.paused ? tr('Not taking orders', 'لا يستقبل الطلبات') : st.open ? tr(`Open · until ${st.closesAt}`, `مفتوح · حتى ${st.closesAt}`) : tr(`Closed · opens ${st.opensAt}`, `مغلق · يفتح ${st.opensAt}`)}
            {st.open && st.extra > 0 && ` · +${st.extra} ${tr('min', 'د')}`}
          </span>
          {cfg.branches.length > 1 && (
            <button onClick={() => setBranchOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
              <MapPin size={12} /> {tl(branch?.name)} <ChevronDown size={12} />
            </button>
          )}
        </div>
      </div>

      <div className={cx('relative z-10 px-4 space-y-5', first === 'loyalty' || first === 'quick' || first === 'active' ? '-mt-10' : 'mt-4')}>
        {data.cart.table && <TableService table={data.cart.table} />}
        {order.map((k) => <div key={k}>{blocks[k]}</div>)}
      </div>
      <Modal open={branchOpen} onClose={() => setBranchOpen(false)} contained title={tr('Choose a branch', 'اختر فرعاً')}>
        <div className="space-y-2">
          {cfg.branches.map((b) => (
            <button key={b.id} onClick={() => { update((x) => void (x.data.branchId = b.id)); setBranchOpen(false); }}
              className={cx('w-full flex items-center gap-3 rounded-app border p-3 text-start', branch?.id === b.id ? 'border-brand bg-brand/5' : 'border-gray-200')}>
              <span className="h-10 w-10 rounded-full bg-brand/10 text-brand grid place-items-center"><MapPin size={18} /></span>
              <span className="flex-1"><span className="block font-semibold">{tl(b.name)}</span><span className="block text-xs text-gray-500">{b.address}</span></span>
              {branch?.id === b.id && <Check size={18} className="text-brand" />}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );

  function ProductRow({ title, items }: { title: string; items: typeof popular }) {
    if (!items.length) return null;
    return (
      <section>
        <Title>{title}</Title>
        <div className="grid grid-cols-2 gap-3">
          {items.map((p) => (
            <button key={p.id} onClick={() => nav(`menu?product=${p.id}`)} className="rounded-app bg-white border border-gray-100 shadow-sm p-2 text-start">
              <div className="relative">
                <Thumb emoji={p.emoji} image={p.image} bg={p.bg} size="xl" className="!h-28 !text-5xl" />
                {p.compareAt && p.compareAt > p.price && <span className="absolute top-1.5 start-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5">-{Math.round((1 - p.price / p.compareAt) * 100)}%</span>}
                {data.favorites.includes(p.id) && <Heart size={16} className="absolute top-1.5 end-1.5 fill-rose-500 text-rose-500" />}
              </div>
              <div className="px-1 pt-2">
                <div className="font-semibold text-sm leading-tight line-clamp-1">{tl(p.name)}</div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-sm font-bold">{m(p.price)}{p.compareAt && p.compareAt > p.price && <span className="ms-1 text-xs text-gray-400 line-through font-normal">{m(p.compareAt)}</span>}</span>
                  <span className="h-7 w-7 rounded-full bg-brand text-onbrand grid place-items-center"><Plus size={16} /></span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }
}

function Title({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="font-display font-bold text-lg">{children}</h2>
      {action}
    </div>
  );
}

export function LoyaltyCard({ hideStamps }: { hideStamps?: boolean } = {}) {
  const { demo, cfg, data, tr, tl } = useDemo();
  const nav = useNavigate();
  const c = me(demo);
  const tier = tierOf(demo, c.lifetimePoints);
  const nt = nextTierOf(demo, c.lifetimePoints);
  const nextReward = data.rewards.filter((r) => r.active && r.cost > c.points).sort((a, b) => a.cost - b.cost)[0];
  const canRedeem = data.rewards.some((r) => r.active && r.cost <= c.points);
  return (
    <button onClick={() => nav('rewards')} className="w-full rounded-app-lg bg-white shadow-lg border border-gray-100 p-4 text-start">
      {cfg.modules.loyaltyPoints && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-500">{tr('Your points', 'نقاطك')}</div>
              <div className="text-3xl font-extrabold text-brand tabular-nums">{c.points.toLocaleString()}</div>
            </div>
            {tier && <span className="rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: tier.color }}>{tl(tier.name)} {tier.multiplier > 1 && `· ×${tier.multiplier}`}</span>}
          </div>
          {canRedeem ? (
            <div className="mt-2 text-sm font-semibold text-emerald-700">🎁 {tr('You can redeem a reward now!', 'يمكنك استبدال مكافأة الآن!')}</div>
          ) : nextReward ? (
            <>
              <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, (c.points / nextReward.cost) * 100)}%` }} /></div>
              <div className="mt-1.5 text-xs text-gray-500">{tr(`${nextReward.cost - c.points} points to ${tl(nextReward.name)}`, `${nextReward.cost - c.points} نقطة حتى ${tl(nextReward.name)}`)}</div>
            </>
          ) : null}
          {nt && <div className="text-[11px] text-gray-400 mt-1">{tr(`${nt.minPoints - c.lifetimePoints} lifetime points to ${tl(nt.name)}`, `${nt.minPoints - c.lifetimePoints} نقطة للوصول إلى ${tl(nt.name)}`)}</div>}
        </>
      )}
      {cfg.modules.loyaltyStamps && !(hideStamps && cfg.modules.loyaltyPoints) && (
        <div className={cx(cfg.modules.loyaltyPoints && 'mt-4 pt-4 border-t border-gray-100')}>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>{tr('Stamp card', 'بطاقة الأختام')}</span>
            <span className="font-semibold text-gray-700">{c.stamps}/{cfg.loyalty.stampsTarget} → {tl(cfg.loyalty.stampReward)}</span>
          </div>
          <StampDots n={c.stamps} target={cfg.loyalty.stampsTarget} />
        </div>
      )}
    </button>
  );
}

export function StampDots({ n, target, size = 'md' }: { n: number; target: number; size?: 'md' | 'lg' }) {
  const { cfg } = useDemo();
  return (
    <div className={cx('grid gap-1.5', target <= 6 ? 'grid-cols-6' : target <= 8 ? 'grid-cols-8' : 'grid-cols-10')}>
      {Array.from({ length: target }, (_, i) => (
        <span key={i} className={cx('aspect-square rounded-full grid place-items-center transition', size === 'lg' ? 'text-xl' : 'text-sm',
          i < n ? 'bg-brand text-onbrand animate-[pop_.3s_ease]' : i === target - 1 ? 'border-2 border-dashed border-brand2 bg-brand2/10' : 'bg-gray-100')}>
          {i < n ? cfg.business.logoEmoji : i === target - 1 ? '🎁' : ''}
        </span>
      ))}
    </div>
  );
}

function Banners() {
  const { data, tl } = useDemo();
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      const el = ref.current;
      if (!el || !data.banners.length) return;
      const next = (i + 1) % data.banners.length;
      const child = el.children[next] as HTMLElement | undefined;
      if (child) el.scrollTo({ left: child.offsetLeft - el.offsetLeft - 16, behavior: 'smooth' });
      setI(next);
    }, 4500);
    return () => clearInterval(t);
  }, [i, data.banners.length]);
  if (!data.banners.length) return null;
  return (
    <div ref={ref} className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4">
      {data.banners.map((b) => (
        <div key={b.id} className="snap-center shrink-0 w-[88%] h-36 rounded-app-lg p-5 flex items-center gap-3 text-white relative overflow-hidden" style={{ background: b.bg }}>
          <div className="flex-1 relative z-10">
            <div className="font-display font-bold text-xl leading-tight">{tl(b.title)}</div>
            <div className="text-sm opacity-80 mt-1">{tl(b.subtitle)}</div>
          </div>
          <div className="text-7xl drop-shadow-lg">{b.emoji}</div>
          <div className="absolute -end-10 -bottom-16 h-44 w-44 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function Countdown({ to }: { to: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((to - now) / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return <span dir="ltr" className="text-[11px] font-bold tabular-nums bg-gray-900 text-white rounded px-1.5 py-0.5">⏱ {hh}:{mm}:{ss}</span>;
}

/** Shown when the guest scanned a table QR: call the waiter, ask for the bill. */
function TableService({ table }: { table: string }) {
  const { tr, update, data } = useDemo();
  const pending = data.serviceRequests.filter((r) => r.table === table && !r.done);
  const ask = (kind: 'waiter' | 'bill' | 'water') => {
    update((d) => requestService(d, table, kind));
    toast(tr('On its way — the team has been notified', 'في الطريق — تم إبلاغ الفريق'), 'info');
  };
  return (
    <div className="rounded-app-lg bg-gray-900 text-white p-4 shadow-lg relative">
      <div className="flex items-center justify-between">
        <div><div className="text-xs text-white/60">{tr('You are at', 'أنت على')}</div><div className="font-display font-bold text-xl">{tr(`Table ${table}`, `طاولة ${table}`)}</div></div>
        {pending.length > 0 && <span className="text-xs rounded-full bg-amber-400 text-gray-900 px-2 py-1 font-bold">{tr(`${pending.length} request(s) sent`, `${pending.length} طلب مُرسل`)}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {([['waiter', <HandPlatter key="w" size={18} />, tr('Call waiter', 'نادِ النادل')], ['bill', <Receipt key="b" size={18} />, tr('Ask for bill', 'اطلب الحساب')], ['water', <GlassWater key="g" size={18} />, tr('Water', 'ماء')]] as const).map(([k, icon, label]) => (
          <button key={k} onClick={() => ask(k)} className="rounded-app bg-white/10 hover:bg-white/15 py-2.5 flex flex-col items-center gap-1 text-xs font-semibold">{icon}{label}</button>
        ))}
      </div>
    </div>
  );
}
