import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Check, Heart, BellRing, Clock, Flame } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { addToCart, productAvailable, toggleFavorite, toggleStockAlert, categoryOpen } from '../../lib/ops';
import { TAGS, ALLERGENS } from '../../lib/presets';
import type { Product } from '../../lib/types';
import { Button, Modal, Stepper, Thumb, Badge, cx, Input } from '../../components/ui';
import { Screen } from './CustomerApp';

export default function Menu() {
  const { data, tr, tl, terms, m, lang, cfg } = useDemo();
  const layout = cfg.ui.menuLayout;
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string | null>(params.get('fav') ? 'fav' : null);
  const usedTags = useMemo(() => Object.keys(TAGS).filter((t) => data.products.some((p) => p.active && p.tags?.includes(t as never))), [data.products]);
  const [activeCat, setActiveCat] = useState(data.categories[0]?.id);
  const scroller = useRef<HTMLDivElement>(null);
  const open = data.products.find((p) => p.id === params.get('product'));

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.products.filter((p) => p.active && (!s || p.name.en.toLowerCase().includes(s) || (p.name.ar ?? '').includes(s) || p.desc.en.toLowerCase().includes(s))
      && (!filter || (filter === 'fav' ? data.favorites.includes(p.id) : filter === 'sale' ? !!p.compareAt && p.compareAt > p.price : p.tags?.includes(filter as never))));
  }, [data.products, q, filter, data.favorites]);
  const hasSale = data.products.some((p) => p.active && p.compareAt && p.compareAt > p.price);

  useEffect(() => {
    const cat = params.get('cat');
    if (cat) {
      setTimeout(() => jump(cat), 50);
      params.delete('cat');
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Highlight the category you are scrolling through
  useEffect(() => {
    const els = data.categories.map((c) => document.getElementById('cat-' + c.id)).filter(Boolean) as HTMLElement[];
    const root = els[0]?.closest('.overflow-y-auto') as HTMLElement | null;
    if (!root) return;
    const io = new IntersectionObserver((ents) => {
      const vis = ents.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActiveCat(vis.target.id.slice(4));
    }, { root, rootMargin: '-140px 0px -60% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [data.categories, visible.length]);

  const jump = (id: string) => {
    setActiveCat(id);
    const el = document.getElementById('cat-' + id);
    const sc = el?.closest('.overflow-y-auto') as HTMLElement | null;
    if (el && sc) sc.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' });
  };

  return (
    <Screen title={tl(terms.catalog)} noPad>
      <div ref={scroller} className="sticky top-14 z-[5] bg-gray-50/95 backdrop-blur pt-3 pb-2 px-4 space-y-2.5">
        <div className="relative">
          <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Search', 'ابحث')} className="ps-10 bg-white" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
          {[
            ...(data.favorites.length ? [{ k: 'fav', label: '❤️ ' + tr('Favorites', 'المفضلة') }] : []),
            ...(hasSale ? [{ k: 'sale', label: '🏷️ ' + tr('On sale', 'تخفيضات') }] : []),
            ...usedTags.map((t) => ({ k: t, label: `${TAGS[t].icon} ${tl(TAGS[t])}` })),
          ].map((x) => (
            <button key={x.k} onClick={() => setFilter(filter === x.k ? null : x.k)}
              className={cx('shrink-0 rounded-full px-3 py-1 text-xs font-semibold border', filter === x.k ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600')}>{x.label}</button>
          ))}
        </div>
        {!q && !filter && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
            {data.categories.map((c) => (
              <button key={c.id} onClick={() => jump(c.id)}
                className={cx('shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold border transition', activeCat === c.id ? 'bg-brand text-onbrand border-brand' : 'bg-white border-gray-200 text-gray-700')}>
                {c.emoji} {tl(c.name)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 pb-4">
        {data.categories.map((c) => {
          const items = visible.filter((p) => p.categoryId === c.id);
          if (!items.length) return null;
          return (
            <section key={c.id} id={'cat-' + c.id} className="pt-4">
              <div className="flex items-baseline gap-2 mb-2">
                <h2 className="font-display font-bold text-lg">{c.emoji} {tl(c.name)}</h2>
                {c.availableFrom && <span className={cx('text-[11px] font-semibold rounded-full px-2 py-0.5', categoryOpen(c) ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}><Clock size={10} className="inline -mt-0.5" /> {c.availableFrom}–{c.availableTo}</span>}
              </div>
              <div className={cx(layout === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2.5', !categoryOpen(c) && 'opacity-60')}>
                {items.map((p) => layout === 'list'
                  ? <ProductRow key={p.id} p={p} onOpen={() => setParams({ product: p.id })} />
                  : <ProductCard key={p.id} p={p} large={layout === 'large'} onOpen={() => setParams({ product: p.id })} />)}
              </div>
            </section>
          );
        })}
        {!visible.length && <div className="text-center text-gray-500 py-16">{tr('Nothing found', 'لا توجد نتائج')}</div>}
      </div>
      {open && <ProductSheet key={open.id + lang} p={open} onClose={() => { params.delete('product'); setParams(params, { replace: true }); }} />}
    </Screen>
  );
}

function ProductCard({ p, onOpen, large }: { p: Product; onOpen: () => void; large?: boolean }) {
  const { tl, m, m2, tr, data, branchId } = useDemo();
  const ok = productAvailable(p, branchId);
  const sale = p.compareAt && p.compareAt > p.price;
  return (
    <button onClick={onOpen} className={cx('w-full rounded-app bg-white border border-gray-100 shadow-sm text-start overflow-hidden active:scale-[.98] transition', !ok && 'opacity-60')}>
      <div className="relative">
        <Thumb emoji={p.emoji} image={p.image} bg={p.bg} size="xl" className={cx('!rounded-none', large ? '!h-44 !text-[84px]' : '!h-28 !text-5xl')} />
        {sale && <span className="absolute top-2 start-2 rounded-full bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5">-{Math.round((1 - p.price / p.compareAt!) * 100)}%</span>}
        {p.isNew && <span className="absolute top-2 end-2 rounded-full bg-brand2 text-onbrand2 text-[10px] font-bold px-2 py-0.5">{tr('New', 'جديد')}</span>}
        {data.favorites.includes(p.id) && <Heart size={16} className="absolute bottom-2 end-2 fill-rose-500 text-rose-500" />}
        {!ok && <span className="absolute inset-0 grid place-items-center bg-white/60 font-bold text-rose-600 text-sm">{tr('Sold out', 'نفدت الكمية')}</span>}
      </div>
      <div className={cx(large ? 'p-3.5' : 'p-2.5')}>
        <div className={cx('font-semibold leading-tight', large ? 'text-base' : 'text-sm line-clamp-1')}>{tl(p.name)}</div>
        {large && <div className="text-xs text-gray-500 line-clamp-2 mt-1">{tl(p.desc)}</div>}
        <div className="flex items-end justify-between mt-2">
          <div>
            <span className="font-bold text-sm">{m(p.price)}</span>
            {sale && <span className="ms-1 text-xs text-gray-400 line-through">{m(p.compareAt!)}</span>}
            {m2(p.price) && <div className="text-[10px] text-gray-400">{m2(p.price)}</div>}
          </div>
          {ok && <span className="h-8 w-8 rounded-full bg-brand text-onbrand grid place-items-center shadow"><Plus size={18} /></span>}
        </div>
      </div>
    </button>
  );
}

function ProductRow({ p, onOpen }: { p: Product; onOpen: () => void }) {
  const { tl, m, m2, tr, data, branchId } = useDemo();
  const ok = productAvailable(p, branchId);
  return (
    <button onClick={onOpen} className={cx('w-full flex gap-3 rounded-app bg-white border border-gray-100 p-2.5 text-start shadow-sm', !ok && 'opacity-60')}>
      <Thumb emoji={p.emoji} image={p.image} bg={p.bg} size="md" />
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold leading-tight line-clamp-1">{tl(p.name)}</span>
          {p.isNew && <Badge className="bg-brand2 text-onbrand2">{tr('New', 'جديد')}</Badge>}
          {data.favorites.includes(p.id) && <Heart size={13} className="fill-rose-500 text-rose-500 shrink-0" />}
        </div>
        {p.tags?.length > 0 && <div className="text-[11px] mt-0.5">{p.tags.slice(0, 3).map((t) => TAGS[t]?.icon).join(' ')}</div>}
        <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{tl(p.desc)}</div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-bold text-sm">{m(p.price)}{p.compareAt && p.compareAt > p.price && <span className="ms-1.5 text-xs text-gray-400 line-through font-normal">{m(p.compareAt)}</span>}{m2(p.price) && <span className="block text-[11px] font-medium text-gray-400">{m2(p.price)}</span>}</span>
          {ok ? (
            <span className="h-8 w-8 rounded-full bg-brand text-onbrand grid place-items-center"><Plus size={18} /></span>
          ) : (
            <span className="text-xs font-semibold text-rose-600">{tr('Sold out', 'نفدت الكمية')}</span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ProductSheet({ p, onClose }: { p: Product; onClose: () => void }) {
  const { tl, tr, m, m2, update, data, branchId, cfg } = useDemo();
  const fav = data.favorites.includes(p.id);
  const alert = data.stockAlerts.includes(p.id);
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(p.groups.map((g) => [g.id, g.required && !g.multi ? [g.options[0].id] : []])),
  );
  const [note, setNote] = useState('');
  const ok = productAvailable(p, branchId);
  const optionIds = Object.values(sel).flat();
  const unit = p.price + p.groups.flatMap((g) => g.options).filter((o) => optionIds.includes(o.id)).reduce((s, o) => s + o.priceDelta, 0);
  const missing = p.groups.filter((g) => g.required && !sel[g.id]?.length);
  const cat = data.categories.find((c) => c.id === p.categoryId);
  const catOpen = categoryOpen(cat);

  const add = () => {
    if (missing.length) return toast(tr(`Please choose: ${tl(missing[0].name)}`, `يرجى اختيار: ${tl(missing[0].name)}`), 'error');
    update((d) => addToCart(d, p.id, qty, optionIds, note.trim() || undefined));
    toast(tr(`${tl(p.name)} added to cart`, `تمت إضافة ${tl(p.name)} إلى السلة`));
    onClose();
  };

  return (
    <Modal open onClose={onClose} contained footer={
      ok ? (
        <Button block size="lg" onClick={add} className="justify-between">
          <span>{tr('Add to cart', 'أضف إلى السلة')}</span>
          <span className="tabular-nums">{m(unit * qty)}</span>
        </Button>
      ) : (
        <Button block size="lg" variant={alert ? 'outline' : 'dark'} icon={<BellRing size={18} />} onClick={() => {
          update((d) => toggleStockAlert(d, p.id));
          toast(alert ? tr('Alert removed', 'تم إلغاء التنبيه') : tr('We’ll notify you when it’s back', 'سنُعلمك عند توفره'), 'info');
        }}>{alert ? tr('You’ll be notified ✓', 'سيتم إعلامك ✓') : tr('Notify me when available', 'أعلمني عند التوفر')}</Button>
      )
    }>
      <div className="-mx-5 -mt-4 relative">
        <Thumb emoji={p.emoji} image={p.image} bg={p.bg} size="xl" className="!rounded-none !h-52" />
        <button onClick={() => update((d) => toggleFavorite(d, p.id))} className="absolute top-3 end-3 h-10 w-10 rounded-full bg-white/90 shadow grid place-items-center" aria-label="Favorite">
          <Heart size={20} className={fav ? 'fill-rose-500 text-rose-500' : 'text-gray-600'} />
        </button>
        {p.compareAt && p.compareAt > p.price && <span className="absolute top-3 start-3 rounded-full bg-rose-600 text-white text-xs font-bold px-2 py-1">-{Math.round((1 - p.price / p.compareAt) * 100)}%</span>}
      </div>
      <div className="mt-4 flex items-start gap-3">
        <div className="flex-1">
          <h2 className="font-display font-bold text-2xl leading-tight">{tl(p.name)}</h2>
          <p className="text-gray-500 mt-1">{tl(p.desc)}</p>
        </div>
        <div className="text-end">
          <div className="font-bold text-lg">{m(p.price)}</div>
          {m2(p.price) && <div className="text-xs text-gray-400">{m2(p.price)}</div>}
          {p.compareAt && p.compareAt > p.price && <div className="text-sm text-gray-400 line-through">{m(p.compareAt)}</div>}
        </div>
      </div>
      {p.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">{p.tags.map((t) => TAGS[t] && <Badge key={t}>{TAGS[t].icon} {tl(TAGS[t])}</Badge>)}</div>
      )}
      {p.stock !== null && p.stock > 0 && p.stock <= 5 && <div className="mt-2 text-sm font-semibold text-amber-600">{tr(`Only ${p.stock} left today`, `بقي ${p.stock} فقط اليوم`)}</div>}
      {(p.calories || p.prepMinutes || p.allergens?.length) ? (
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {p.calories && cfg.ui.showCalories && <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 font-medium"><Flame size={12} /> {p.calories} kcal</span>}
          {p.prepMinutes && <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 font-medium"><Clock size={12} /> {p.prepMinutes >= 60 ? tr(`Order ${Math.round(p.prepMinutes / 60)}h ahead`, `اطلب قبل ${Math.round(p.prepMinutes / 60)} ساعة`) : tr(`~${p.prepMinutes} min`, `~${p.prepMinutes} د`)}</span>}
          {p.allergens?.length ? <span className="rounded-full bg-amber-50 text-amber-900 px-2 py-1 font-medium">{tr('Contains', 'يحتوي على')}: {p.allergens.map((a) => ALLERGENS[a] ? `${ALLERGENS[a].icon} ${tl(ALLERGENS[a])}` : a).join(' · ')}</span> : null}
        </div>
      ) : null}
      {!catOpen && cat && <div className="mt-3 rounded-lg bg-amber-50 text-amber-900 text-sm p-2.5">⏰ {tr(`${tl(cat.name)} is served ${cat.availableFrom}–${cat.availableTo}. You can still pre-order for tomorrow at checkout.`, `يُقدَّم ${tl(cat.name)} من ${cat.availableFrom} إلى ${cat.availableTo}. يمكنك الطلب المسبق لليوم التالي عند الدفع.`)}</div>}
      {p.groups.map((g) => (
        <div key={g.id} className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold">{tl(g.name)}{g.multi && g.max ? <span className="ms-1.5 text-xs font-medium text-gray-500">{tr(`up to ${g.max}`, `حتى ${g.max}`)}</span> : null}</div>
            <span className={cx('text-xs rounded-full px-2 py-0.5 font-semibold', g.required ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600')}>
              {g.required ? tr('Required', 'إلزامي') : tr('Optional', 'اختياري')}
            </span>
          </div>
          <div className="space-y-1.5">
            {g.options.map((o) => {
              const on = sel[g.id]?.includes(o.id);
              return (
                <button key={o.id} type="button" onClick={() => {
                  if (g.multi && !on && g.max && (sel[g.id]?.length ?? 0) >= g.max) return toast(tr(`Pick up to ${g.max}`, `اختر حتى ${g.max}`), 'info');
                  setSel((s) => ({ ...s, [g.id]: g.multi ? (on ? s[g.id].filter((x) => x !== o.id) : [...s[g.id], o.id]) : on && !g.required ? [] : [o.id] }));
                }}
                  className={cx('w-full flex items-center gap-3 rounded-app border px-3 py-2.5 text-start transition', on ? 'border-brand bg-brand/5' : 'border-gray-200')}>
                  <span className={cx('h-5 w-5 grid place-items-center shrink-0', g.multi ? 'rounded-md' : 'rounded-full', on ? 'bg-brand text-onbrand' : 'border-2 border-gray-300')}>{on && <Check size={13} />}</span>
                  <span className="flex-1">{tl(o.name)}</span>
                  {o.priceDelta > 0 && <span className="text-sm text-gray-500">+{m(o.priceDelta)}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-5">
        <div className="font-bold mb-2">{tr('Special request', 'طلب خاص')}</div>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr('e.g. no onions', 'مثلاً: بدون بصل')} />
      </div>
      <div className="mt-5 flex items-center justify-center">
        <Stepper value={qty} onChange={setQty} min={1} max={p.stock ?? 20} />
      </div>
    </Modal>
  );
}
