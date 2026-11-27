import { useState } from 'react';
import { Plus, Search, Upload, Trash2, Star, FolderCog, X } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { tourDone, restocked } from '../../lib/ops';
import { TAGS, ALLERGENS } from '../../lib/presets';
import type { Category, OptionGroup, Product, ProductTag } from '../../lib/types';
import { resizeImage, uid } from '../../lib/utils';
import { Badge, Button, Card, Field, Input, Modal, Select, Textarea, Thumb, Toggle, cx } from '../../components/ui';
import { PageHead } from './OwnerApp';

const BGS = ['#fde7d4', '#fef3c7', '#e3f4d7', '#dbeafe', '#ede9fe', '#fce7f3', '#f3f4f6', '#e7e5e4', '#cffafe', '#fee2e2'];

export default function Catalog() {
  const { data, tr, tl, terms, m, update } = useDemo();
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Product | null>(null);
  const [cats, setCats] = useState(false);
  const list = data.products.filter((p) => (cat === 'all' || p.categoryId === cat) && (!q || tl(p.name).toLowerCase().includes(q.toLowerCase())));

  const blank = (): Product => ({
    id: 'u' + uid(), categoryId: cat !== 'all' ? cat : data.categories[0]?.id ?? '', name: { en: '', ar: '' }, desc: { en: '', ar: '' }, price: 0,
    emoji: '🍽️', bg: BGS[0], active: true, stock: null, groups: [], tags: [],
  });

  return (
    <>
      <PageHead title={tl(terms.catalog)} sub={tr(`${data.products.length} items in ${data.categories.length} categories`, `${data.products.length} منتجاً في ${data.categories.length} فئات`)} action={<>
        <Button variant="outline" icon={<FolderCog size={16} />} onClick={() => setCats(true)}>{tr('Categories', 'الفئات')}</Button>
        <Button icon={<Plus size={16} />} onClick={() => setEdit(blank())}>{tr('Add item', 'إضافة منتج')}</Button>
      </>} />
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative w-full sm:w-60">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Search', 'ابحث')} className="ps-9 !h-10" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[{ id: 'all', name: { en: 'All', ar: 'الكل' }, emoji: '' }, ...data.categories].map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={cx('rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap border', cat === c.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600')}>
              {c.emoji} {tl(c.name)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((p) => (
          <Card key={p.id} className={cx('p-3 flex gap-3', !p.active && 'opacity-60')} onClick={() => setEdit(structuredClone(p))}>
            <Thumb emoji={p.emoji} image={p.image} bg={p.bg} size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{tl(p.name)}</div>
              <div className="text-xs text-gray-500">{tl(data.categories.find((c) => c.id === p.categoryId)?.name)}</div>
              <div className="font-bold mt-1">{m(p.price)}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {p.popular && <Badge className="bg-amber-100 text-amber-800"><Star size={10} /> {tr('Popular', 'شائع')}</Badge>}
                {p.stock !== null && <Badge className={p.stock === 0 ? 'bg-rose-100 text-rose-700' : p.stock <= 5 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}>{p.stock === 0 ? tr('Out of stock', 'نفد') : tr(`${p.stock} in stock`, `${p.stock} متوفر`)}</Badge>}
                {!p.active && <Badge>{tr('Hidden', 'مخفي')}</Badge>}
                {p.compareAt && p.compareAt > p.price && <Badge className="bg-rose-100 text-rose-700">{tr('Sale', 'تخفيض')}</Badge>}
                {data.stockAlerts.includes(p.id) && <Badge className="bg-sky-100 text-sky-800">🔔 {tr('waiting', 'بانتظار')}</Badge>}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Toggle checked={p.active} onChange={(v) => update((d) => void (d.data.products.find((x) => x.id === p.id)!.active = v))} />
            </div>
          </Card>
        ))}
      </div>
      {edit && <ProductEditor p={edit} onClose={() => setEdit(null)} />}
      <CategoryManager open={cats} onClose={() => setCats(false)} />
    </>
  );
}

function ProductEditor({ p: initial, onClose }: { p: Product; onClose: () => void }) {
  const { data, tr, tl, update, cfg } = useDemo();
  const [p, setP] = useState(initial);
  const isNew = !data.products.some((x) => x.id === initial.id);
  const set = (v: Partial<Product>) => setP((x) => ({ ...x, ...v }));

  const save = () => {
    if (!p.name.en.trim()) return toast(tr('Add a name', 'أضف اسماً'), 'error');
    update((d) => {
      const i = d.data.products.findIndex((x) => x.id === p.id);
      const wasOut = i >= 0 && d.data.products[i].stock === 0;
      if (i >= 0) d.data.products[i] = p;
      if (wasOut && (p.stock === null || p.stock > 0)) restocked(d, p.id);
      else {
        d.data.products.unshift(p);
        tourDone(d, 'addProduct');
      }
    });
    toast(isNew ? tr('Item added — check it in the customer app', 'تمت الإضافة — شاهده في تطبيق الزبون') : tr('Saved', 'تم الحفظ'));
    onClose();
  };

  const setGroup = (gi: number, v: Partial<OptionGroup>) => setP((x) => ({ ...x, groups: x.groups.map((g, i) => (i === gi ? { ...g, ...v } : g)) }));

  return (
    <Modal open onClose={onClose} size="lg" title={isNew ? tr('New item', 'منتج جديد') : tl(initial.name)} footer={
      <div className="flex gap-2">
        {!isNew && <Button variant="ghost" className="!text-rose-600" icon={<Trash2 size={16} />} onClick={() => {
          if (!confirm(tr('Delete this item?', 'حذف هذا المنتج؟'))) return;
          update((d) => void (d.data.products = d.data.products.filter((x) => x.id !== p.id)));
          onClose();
        }}>{tr('Delete', 'حذف')}</Button>}
        <div className="flex-1" />
        <Button variant="outline" onClick={onClose}>{tr('Cancel', 'إلغاء')}</Button>
        <Button onClick={save}>{tr('Save', 'حفظ')}</Button>
      </div>
    }>
      <div className="grid sm:grid-cols-[160px_1fr] gap-5">
        <div>
          <Thumb emoji={p.emoji} image={p.image} bg={p.bg} size="lg" className="!w-full !h-40" />
          <label className="mt-2 flex items-center justify-center gap-2 h-9 rounded-app border border-gray-300 text-sm font-semibold cursor-pointer hover:bg-gray-50">
            <Upload size={14} /> {tr('Photo', 'صورة')}
            <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) set({ image: await resizeImage(f, 600) }); }} />
          </label>
          {p.image && <button className="text-xs text-rose-600 mt-1 w-full" onClick={() => set({ image: undefined })}>{tr('Remove photo', 'إزالة الصورة')}</button>}
          <div className="flex items-center gap-2 mt-3">
            <Input value={p.emoji} onChange={(e) => set({ emoji: e.target.value })} className="!w-14 text-center text-xl !px-1" />
            <span className="text-xs text-gray-500">{tr('Icon', 'رمز')}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {BGS.map((b) => <button key={b} onClick={() => set({ bg: b })} className={cx('h-6 w-6 rounded-full border', p.bg === b && 'ring-2 ring-gray-900 ring-offset-1')} style={{ background: b }} />)}
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={tr('Name (English)', 'الاسم (إنجليزي)')}><Input value={p.name.en} onChange={(e) => set({ name: { ...p.name, en: e.target.value } })} autoFocus={isNew} /></Field>
            <Field label={tr('Name (Arabic)', 'الاسم (عربي)')}><Input dir="rtl" value={p.name.ar ?? ''} onChange={(e) => set({ name: { ...p.name, ar: e.target.value } })} /></Field>
            <Field label={tr('Description (English)', 'الوصف (إنجليزي)')}><Textarea value={p.desc.en} onChange={(e) => set({ desc: { ...p.desc, en: e.target.value } })} className="!min-h-[64px]" /></Field>
            <Field label={tr('Description (Arabic)', 'الوصف (عربي)')}><Textarea dir="rtl" value={p.desc.ar ?? ''} onChange={(e) => set({ desc: { ...p.desc, ar: e.target.value } })} className="!min-h-[64px]" /></Field>
            <Field label={tr(`Price (${cfg.business.currency})`, `السعر (${cfg.business.currency})`)}><Input type="number" step="0.01" value={p.price} onChange={(e) => set({ price: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label={tr('Was (sale price shows crossed out)', 'السعر قبل التخفيض')} hint={tr('Leave empty if not on sale', 'اتركه فارغاً إن لم يكن مخفضاً')}>
              <Input type="number" step="0.01" value={p.compareAt ?? ''} onChange={(e) => set({ compareAt: e.target.value ? parseFloat(e.target.value) : undefined })} />
            </Field>
            <Field label={tr('Category', 'الفئة')}>
              <Select value={p.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                {data.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {tl(c.name)}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <Toggle checked={p.active} onChange={(v) => set({ active: v })} label={tr('Visible in app', 'ظاهر في التطبيق')} />
            <Toggle checked={!!p.popular} onChange={(v) => set({ popular: v })} label={tr('Popular', 'شائع')} />
            <Toggle checked={!!p.isNew} onChange={(v) => set({ isNew: v })} label={tr('“New” badge', 'شارة "جديد"')} />
            <Toggle checked={p.stock !== null} onChange={(v) => set({ stock: v ? 20 : null })} label={tr('Track stock', 'تتبع المخزون')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('Calories (kcal)', 'السعرات')}><Input type="number" value={p.calories ?? ''} onChange={(e) => set({ calories: e.target.value ? +e.target.value : undefined })} /></Field>
            <Field label={tr('Prep time (min)', 'وقت التحضير (د)')} hint={tr('60+ shows “order ahead”', '60+ يظهر "اطلب مسبقاً"')}><Input type="number" value={p.prepMinutes ?? ''} onChange={(e) => set({ prepMinutes: e.target.value ? +e.target.value : undefined })} /></Field>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1.5">{tr('Allergens (shown as “Contains…”)', 'مسببات الحساسية (تظهر كـ "يحتوي على…")')}</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(ALLERGENS).map((a) => {
                const on = p.allergens?.includes(a);
                return <button key={a} type="button" onClick={() => set({ allergens: on ? (p.allergens ?? []).filter((x) => x !== a) : [...(p.allergens ?? []), a] })}
                  className={cx('rounded-full px-2.5 py-1 text-xs font-semibold border', on ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-gray-200')}>{ALLERGENS[a].icon} {tl(ALLERGENS[a])}</button>;
              })}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1.5">{tr('Labels (customers can filter by these)', 'الشارات (يمكن للزبائن التصفية بها)')}</div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TAGS) as ProductTag[]).map((t) => {
                const on = p.tags.includes(t);
                return <button key={t} type="button" onClick={() => set({ tags: on ? p.tags.filter((x) => x !== t) : [...p.tags, t] })}
                  className={cx('rounded-full px-2.5 py-1 text-xs font-semibold border', on ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200')}>{TAGS[t].icon} {tl(TAGS[t])}</button>;
              })}
            </div>
          </div>
          {p.stock !== null && <Field label={tr('Quantity in stock', 'الكمية المتوفرة')}><Input type="number" value={p.stock} onChange={(e) => set({ stock: Math.max(0, parseInt(e.target.value) || 0) })} className="!w-32" /></Field>}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold">{tr('Options & add-ons', 'الخيارات والإضافات')}</div>
          <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => setP((x) => ({ ...x, groups: [...x.groups, { id: 'g' + uid(), name: { en: 'Size', ar: 'الحجم' }, required: true, multi: false, options: [{ id: 'o' + uid(), name: { en: 'Regular', ar: 'عادي' }, priceDelta: 0 }] }] }))}>{tr('Add group', 'إضافة مجموعة')}</Button>
        </div>
        <div className="space-y-3">
          {p.groups.map((g, gi) => (
            <div key={g.id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input value={g.name.en} onChange={(e) => setGroup(gi, { name: { ...g.name, en: e.target.value } })} className="!h-9 !w-40" placeholder="Group" />
                <Input dir="rtl" value={g.name.ar ?? ''} onChange={(e) => setGroup(gi, { name: { ...g.name, ar: e.target.value } })} className="!h-9 !w-36" placeholder="المجموعة" />
                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={g.required} onChange={(e) => setGroup(gi, { required: e.target.checked })} /> {tr('Required', 'إلزامي')}</label>
                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={g.multi} onChange={(e) => setGroup(gi, { multi: e.target.checked })} /> {tr('Multiple', 'متعدد')}</label>
                {g.multi && <label className="flex items-center gap-1.5 text-sm">{tr('max', 'حد أقصى')} <Input type="number" min={0} value={g.max ?? ''} onChange={(e) => setGroup(gi, { max: e.target.value ? +e.target.value : undefined })} className="!h-8 !w-14 !px-2" /></label>}
                <button className="ms-auto text-rose-600" onClick={() => setP((x) => ({ ...x, groups: x.groups.filter((_, i) => i !== gi) }))}><Trash2 size={16} /></button>
              </div>
              <div className="mt-2 space-y-1.5">
                {g.options.map((o, oi) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <Input value={o.name.en} onChange={(e) => setGroup(gi, { options: g.options.map((x, i) => (i === oi ? { ...x, name: { ...x.name, en: e.target.value } } : x)) })} className="!h-9 flex-1" />
                    <Input dir="rtl" value={o.name.ar ?? ''} onChange={(e) => setGroup(gi, { options: g.options.map((x, i) => (i === oi ? { ...x, name: { ...x.name, ar: e.target.value } } : x)) })} className="!h-9 flex-1" />
                    <Input type="number" step="0.1" value={o.priceDelta} onChange={(e) => setGroup(gi, { options: g.options.map((x, i) => (i === oi ? { ...x, priceDelta: parseFloat(e.target.value) || 0 } : x)) })} className="!h-9 !w-20" />
                    <button className="text-gray-400" onClick={() => setGroup(gi, { options: g.options.filter((_, i) => i !== oi) })}><X size={16} /></button>
                  </div>
                ))}
                <button className="text-sm font-semibold text-brand" onClick={() => setGroup(gi, { options: [...g.options, { id: 'o' + uid(), name: { en: '', ar: '' }, priceDelta: 0 }] })}>+ {tr('Add option', 'إضافة خيار')}</button>
              </div>
            </div>
          ))}
          {!p.groups.length && <div className="text-sm text-gray-400">{tr('e.g. sizes, extras, colors, milk type', 'مثلاً: الأحجام، الإضافات، الألوان، نوع الحليب')}</div>}
        </div>
      </div>
    </Modal>
  );
}

function CategoryManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, tr, update } = useDemo();
  const [draft, setDraft] = useState<Category>({ id: '', name: { en: '', ar: '' }, emoji: '🍽️' });
  return (
    <Modal open={open} onClose={onClose} title={tr('Categories', 'الفئات')} size="lg">
      <p className="text-xs text-gray-500 mb-3">{tr('Optional times limit a category, e.g. Breakfast 07:00–11:30.', 'الأوقات اختيارية لتحديد فئة، مثلاً الفطور 07:00–11:30.')}</p>
      <div className="space-y-2">
        {data.categories.map((c, i) => {
          const count = data.products.filter((p) => p.categoryId === c.id).length;
          return (
            <div key={c.id} className="flex items-center gap-2">
              <Input value={c.emoji} onChange={(e) => update((d) => void (d.data.categories[i].emoji = e.target.value))} className="!w-12 !px-1 text-center" />
              <Input value={c.name.en} onChange={(e) => update((d) => void (d.data.categories[i].name.en = e.target.value))} />
              <Input dir="rtl" value={c.name.ar ?? ''} onChange={(e) => update((d) => void (d.data.categories[i].name.ar = e.target.value))} />
              <Input type="time" title={tr('Available from', 'متاح من')} value={c.availableFrom ?? ''} onChange={(e) => update((d) => void (d.data.categories[i].availableFrom = e.target.value || undefined))} className="!w-28 !px-2" />
              <Input type="time" title={tr('until', 'حتى')} value={c.availableTo ?? ''} onChange={(e) => update((d) => void (d.data.categories[i].availableTo = e.target.value || undefined))} className="!w-28 !px-2" />
              <button disabled={count > 0} title={count ? tr('Move or delete its items first', 'انقل منتجاتها أو احذفها أولاً') : ''} className="text-rose-600 disabled:text-gray-300 shrink-0 w-6" onClick={() => update((d) => void (d.data.categories = d.data.categories.filter((x) => x.id !== c.id)))}>
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
        <Input value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} className="!w-12 !px-1 text-center" />
        <Input value={draft.name.en} onChange={(e) => setDraft({ ...draft, name: { ...draft.name, en: e.target.value } })} placeholder={tr('New category', 'فئة جديدة')} />
        <Input dir="rtl" value={draft.name.ar ?? ''} onChange={(e) => setDraft({ ...draft, name: { ...draft.name, ar: e.target.value } })} placeholder="بالعربية" />
        <Button size="sm" disabled={!draft.name.en.trim()} onClick={() => {
          update((d) => void d.data.categories.push({ ...draft, id: 'c' + uid() }));
          setDraft({ id: '', name: { en: '', ar: '' }, emoji: '🍽️' });
        }}><Plus size={16} /></Button>
      </div>
    </Modal>
  );
}
