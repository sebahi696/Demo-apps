import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, QrCode, ShoppingBag, Gift, CalendarDays, Clock, MapPin, Phone, ChevronRight, RotateCcw, Plus } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { me, nextTierOf, tierOf, statusLabel, statusTone, addToCart, productAvailable } from '../../lib/ops';
import { cx, Thumb } from '../../components/ui';

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

  const quick = [
    mod.ordering && { to: 'menu', icon: <ShoppingBag />, label: tr('Order', 'اطلب') },
    (mod.loyaltyPoints || mod.loyaltyStamps) && { to: 'scan', icon: <QrCode />, label: tr('Scan & earn', 'امسح واكسب') },
    (mod.loyaltyPoints || mod.loyaltyStamps) && { to: 'rewards', icon: <Gift />, label: tr('Rewards', 'المكافآت') },
    mod.reservations && { to: 'reserve', icon: <CalendarDays />, label: tl(terms.reserveCta) },
  ].filter(Boolean) as { to: string; icon: JSX.Element; label: string }[];

  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain pb-28">
      <div className="bg-brand text-onbrand px-4 pt-5 pb-14 rounded-b-[28px]">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-app bg-white/15 grid place-items-center text-2xl overflow-hidden shrink-0">
            {cfg.business.logo ? <img src={cfg.business.logo} className="h-full w-full object-cover" alt="" /> : cfg.business.logoEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm opacity-75">{greet}, {c.name.split(' ')[0]} 👋</div>
            <div className="font-display font-bold text-xl truncate">{tl(cfg.business.name)}</div>
          </div>
          <Link to="inbox" className="relative h-11 w-11 rounded-full bg-white/15 grid place-items-center">
            <Bell size={20} />
            {unread > 0 && <span className="absolute top-1.5 end-1.5 h-4 min-w-4 px-1 rounded-full bg-brand2 text-onbrand2 text-[10px] font-bold grid place-items-center">{unread}</span>}
          </Link>
        </div>
        {tl(cfg.business.tagline) && <div className="mt-3 text-sm opacity-80">{tl(cfg.business.tagline)}</div>}
      </div>

      <div className="px-4 -mt-10 space-y-5">
        {(mod.loyaltyPoints || mod.loyaltyStamps) && <LoyaltyCard />}

        {quick.length > 0 && (
          <div className={cx('grid gap-2', quick.length === 4 ? 'grid-cols-4' : quick.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
            {quick.map((q) => (
              <button key={q.to} onClick={() => nav(q.to)} className="rounded-app bg-white shadow-sm border border-gray-100 py-3 flex flex-col items-center gap-1.5">
                <span className="h-10 w-10 rounded-full bg-brand/10 text-brand grid place-items-center [&>svg]:h-5 [&>svg]:w-5">{q.icon}</span>
                <span className="text-xs font-semibold">{q.label}</span>
              </button>
            ))}
          </div>
        )}

        {activeOrder && (
          <Link to={`orders/${activeOrder.id}`} className="flex items-center gap-3 rounded-app bg-white border-2 border-brand/30 p-3.5 animate-[up_.2s_ease]">
            <span className="h-11 w-11 rounded-full bg-brand text-onbrand grid place-items-center animate-[pulse-ring_1.6s_infinite]"><Clock size={20} /></span>
            <div className="flex-1">
              <div className="text-xs text-gray-500">{tr('Order', 'الطلب')} #{activeOrder.number}</div>
              <div className="font-bold">{tl(statusLabel(activeOrder.status, cfg.industry, activeOrder.fulfillment))}</div>
            </div>
            <span className={cx('text-xs rounded-full px-2 py-1 font-bold', statusTone[activeOrder.status])}>{tr('Track', 'تتبّع')}</span>
          </Link>
        )}

        <Banners />

        {deals.length > 0 && (
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
        )}

        {mod.ordering && lastOrder && (
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
        )}

        {mod.ordering && (
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
        )}

        {mod.ordering && <ProductRow title={tr('Most popular', 'الأكثر طلباً')} items={popular} />}
        {mod.ordering && isNew.length > 0 && <ProductRow title={tr('New', 'جديد')} items={isNew} />}

        <section className="rounded-app bg-white border border-gray-100 p-4 space-y-2.5 text-sm">
          <div className="font-bold">{tl(cfg.business.name)}</div>
          <div className="flex items-center gap-2 text-gray-600"><Clock size={16} /> {tr('Open', 'مفتوح')} {cfg.business.openTime} – {cfg.business.closeTime}</div>
          {(cfg.business.city || cfg.business.address) && <div className="flex items-center gap-2 text-gray-600"><MapPin size={16} /> {[cfg.business.address, cfg.business.city, cfg.business.country].filter(Boolean).join(', ')}</div>}
          {cfg.business.phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={16} /> <span dir="ltr">{cfg.business.phone}</span></div>}
        </section>
      </div>
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
              <Thumb emoji={p.emoji} image={p.image} bg={p.bg} size="xl" className="!h-28 !text-5xl" />
              <div className="px-1 pt-2">
                <div className="font-semibold text-sm leading-tight line-clamp-1">{tl(p.name)}</div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-sm font-bold">{m(p.price)}</span>
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

export function LoyaltyCard() {
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
      {cfg.modules.loyaltyStamps && (
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
