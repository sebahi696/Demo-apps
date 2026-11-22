import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Check } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { addToCart, productAvailable } from '../../lib/ops';
import type { Product } from '../../lib/types';
import { Button, Modal, Stepper, Thumb, Badge, cx, Input } from '../../components/ui';
import { Screen } from './CustomerApp';

export default function Menu() {
  const { data, tr, tl, terms, m, lang } = useDemo();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [activeCat, setActiveCat] = useState(data.categories[0]?.id);
  const scroller = useRef<HTMLDivElement>(null);
  const open = data.products.find((p) => p.id === params.get('product'));

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.products.filter((p) => p.active && (!s || p.name.en.toLowerCase().includes(s) || (p.name.ar ?? '').includes(s) || p.desc.en.toLowerCase().includes(s)));
  }, [data.products, q]);

  useEffect(() => {
    const cat = params.get('cat');
    if (cat) {
      setTimeout(() => jump(cat), 50);
      params.delete('cat');
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {!q && (
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
              <h2 className="font-display font-bold text-lg mb-2">{c.emoji} {tl(c.name)}</h2>
              <div className="space-y-2.5">
                {items.map((p) => (
                  <ProductRow key={p.id} p={p} onOpen={() => setParams({ product: p.id })} />
                ))}
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

function ProductRow({ p, onOpen }: { p: Product; onOpen: () => void }) {
  const { tl, m, tr } = useDemo();
  const ok = productAvailable(p);
  return (
    <button onClick={onOpen} className={cx('w-full flex gap-3 rounded-app bg-white border border-gray-100 p-2.5 text-start shadow-sm', !ok && 'opacity-60')}>
      <Thumb emoji={p.emoji} image={p.image} bg={p.bg} size="md" />
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold leading-tight line-clamp-1">{tl(p.name)}</span>
          {p.isNew && <Badge className="bg-brand2 text-onbrand2">{tr('New', 'جديد')}</Badge>}
        </div>
        <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{tl(p.desc)}</div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-bold text-sm">{m(p.price)}</span>
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
  const { tl, tr, m, update } = useDemo();
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(p.groups.map((g) => [g.id, g.required && !g.multi ? [g.options[0].id] : []])),
  );
  const [note, setNote] = useState('');
  const ok = productAvailable(p);
  const optionIds = Object.values(sel).flat();
  const unit = p.price + p.groups.flatMap((g) => g.options).filter((o) => optionIds.includes(o.id)).reduce((s, o) => s + o.priceDelta, 0);
  const missing = p.groups.filter((g) => g.required && !sel[g.id]?.length);

  const add = () => {
    if (missing.length) return toast(tr(`Please choose: ${tl(missing[0].name)}`, `يرجى اختيار: ${tl(missing[0].name)}`), 'error');
    update((d) => addToCart(d, p.id, qty, optionIds, note.trim() || undefined));
    toast(tr(`${tl(p.name)} added to cart`, `تمت إضافة ${tl(p.name)} إلى السلة`));
    onClose();
  };

  return (
    <Modal open onClose={onClose} contained footer={
      <Button block size="lg" onClick={add} disabled={!ok} className="justify-between">
        <span>{ok ? tr('Add to cart', 'أضف إلى السلة') : tr('Sold out', 'نفدت الكمية')}</span>
        <span className="tabular-nums">{m(unit * qty)}</span>
      </Button>
    }>
      <div className="-mx-5 -mt-4">
        <Thumb emoji={p.emoji} image={p.image} bg={p.bg} size="xl" className="!rounded-none !h-52" />
      </div>
      <div className="mt-4 flex items-start gap-3">
        <div className="flex-1">
          <h2 className="font-display font-bold text-2xl leading-tight">{tl(p.name)}</h2>
          <p className="text-gray-500 mt-1">{tl(p.desc)}</p>
        </div>
        <div className="font-bold text-lg">{m(p.price)}</div>
      </div>
      {p.stock !== null && p.stock > 0 && p.stock <= 5 && <div className="mt-2 text-sm font-semibold text-amber-600">{tr(`Only ${p.stock} left`, `بقي ${p.stock} فقط`)}</div>}
      {p.groups.map((g) => (
        <div key={g.id} className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold">{tl(g.name)}</div>
            <span className={cx('text-xs rounded-full px-2 py-0.5 font-semibold', g.required ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600')}>
              {g.required ? tr('Required', 'إلزامي') : tr('Optional', 'اختياري')}
            </span>
          </div>
          <div className="space-y-1.5">
            {g.options.map((o) => {
              const on = sel[g.id]?.includes(o.id);
              return (
                <button key={o.id} type="button" onClick={() => setSel((s) => ({ ...s, [g.id]: g.multi ? (on ? s[g.id].filter((x) => x !== o.id) : [...s[g.id], o.id]) : on && !g.required ? [] : [o.id] }))}
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
