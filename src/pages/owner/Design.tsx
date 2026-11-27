import { ArrowUp, ArrowDown, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { track } from '../../lib/ops';
import type { AppUi, Demo, HomeSection } from '../../lib/types';
import { Card, Input, Toggle, cx } from '../../components/ui';
import { PageHead } from './OwnerApp';

const ALL_SECTIONS: HomeSection[] = ['active', 'loyalty', 'quick', 'banners', 'deals', 'reorder', 'categories', 'favorites', 'popular', 'new', 'info'];

/** Every visual choice of the customer app, with a live phone preview. */
export default function Design() {
  const { cfg, tr, update, id } = useDemo();
  const ui = cfg.ui;
  const set = (fn: (u: AppUi, d: Demo) => void) => update((d) => { fn(d.config.ui, d); track(d, 'branding'); d.data.tour.branding = true; });
  const label: Record<HomeSection, string> = {
    active: tr('Live order tracker', 'متتبع الطلب الحالي'), loyalty: tr('Points & stamp card', 'النقاط وبطاقة الأختام'), quick: tr('Quick actions', 'اختصارات سريعة'),
    banners: tr('Banners', 'اللافتات'), deals: tr('Deals', 'العروض'), reorder: tr('Order again', 'اطلب مجدداً'), categories: tr('Categories', 'الفئات'),
    favorites: tr('Favorites', 'المفضلة'), popular: tr('Most popular', 'الأكثر طلباً'), new: tr('New items', 'الجديد'), info: tr('Hours & address', 'الساعات والعنوان'),
  };
  const hidden = ALL_SECTIONS.filter((k) => !ui.sections.includes(k));
  const move = (i: number, dir: -1 | 1) => set((u) => {
    const j = i + dir;
    if (j < 0 || j >= u.sections.length) return;
    [u.sections[i], u.sections[j]] = [u.sections[j], u.sections[i]];
  });
  const Choice = <T extends string>({ value, options, onPick }: { value: T; options: { v: T; label: string; art: JSX.Element }[]; onPick: (v: T) => void }) => (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button key={o.v} onClick={() => onPick(o.v)} className={cx('rounded-xl border-2 p-2 text-center transition', value === o.v ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300')}>
          <div className="h-16 rounded-lg bg-gray-100 p-1.5 overflow-hidden">{o.art}</div>
          <div className="text-xs font-semibold mt-1.5">{o.label}</div>
        </button>
      ))}
    </div>
  );
  const bar = (w = 'w-full', h = 'h-2', c = 'bg-gray-300') => <div className={cx(w, h, c, 'rounded')} />;

  return (
    <>
      <PageHead title={tr('App design', 'تصميم التطبيق')} sub={tr('Change the look of your customer app. The preview on the right is the real app.', 'غيّر شكل تطبيق الزبائن. المعاينة على اليمين هي التطبيق الحقيقي.')} />
      <div className="grid xl:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="font-bold">{tr('Theme', 'المظهر')}</div>
            <div className="grid grid-cols-2 gap-2">
              {([['light', <Sun key="s" size={18} />, tr('Light', 'فاتح')], ['dark', <Moon key="m" size={18} />, tr('Dark', 'داكن')]] as const).map(([v, icon, l]) => (
                <button key={v} onClick={() => set((u) => void (u.theme = v))} className={cx('rounded-xl border-2 py-3 flex items-center justify-center gap-2 font-semibold', ui.theme === v ? 'border-gray-900' : 'border-gray-200', v === 'dark' && 'bg-gray-900 text-white')}>{icon}{l}</button>
              ))}
            </div>
            <div className="font-bold pt-2">{tr('Header', 'الترويسة')}</div>
            <Choice value={ui.header} onPick={(v) => set((u) => void (u.header = v))} options={[
              { v: 'solid', label: tr('Solid', 'لون واحد'), art: <div className="h-8 rounded bg-brand" /> },
              { v: 'gradient', label: tr('Gradient', 'متدرج'), art: <div className="h-8 rounded bg-gradient-to-br from-brand to-brand2" /> },
              { v: 'image', label: tr('Pattern + big title', 'نقش + عنوان كبير'), art: <div className="h-12 rounded bg-brand text-[10px] leading-none overflow-hidden opacity-90 p-1">{ui.coverEmoji.repeat(12)}</div> },
            ]} />
            {ui.header === 'image' && (
              <div className="flex items-center gap-2"><span className="text-sm text-gray-600">{tr('Pattern icon', 'رمز النقش')}</span><Input value={ui.coverEmoji} onChange={(e) => set((u) => void (u.coverEmoji = e.target.value))} className="!w-16 !h-9 text-center text-lg" /></div>
            )}
          </Card>

          <Card className="p-5 space-y-4">
            <div className="font-bold">{tr('Menu layout', 'تخطيط القائمة')}</div>
            <Choice value={ui.menuLayout} onPick={(v) => set((u) => void (u.menuLayout = v))} options={[
              { v: 'list', label: tr('List', 'قائمة'), art: <div className="space-y-1.5">{[0, 1, 2].map((i) => <div key={i} className="flex gap-1"><div className="h-3.5 w-3.5 rounded bg-brand/40" />{bar()}</div>)}</div> },
              { v: 'grid', label: tr('Grid', 'شبكة'), art: <div className="grid grid-cols-2 gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className="h-6 rounded bg-brand/40" />)}</div> },
              { v: 'large', label: tr('Big photos', 'صور كبيرة'), art: <div className="space-y-1"><div className="h-9 rounded bg-brand/40" />{bar('w-2/3')}</div> },
            ]} />
            <div className="font-bold pt-2">{tr('Card style', 'نمط البطاقات')}</div>
            <Choice value={ui.cardStyle} onPick={(v) => set((u) => void (u.cardStyle = v))} options={[
              { v: 'elevated', label: tr('Shadow', 'ظل'), art: <div className="h-10 rounded bg-white shadow-md" /> },
              { v: 'outlined', label: tr('Outline', 'إطار'), art: <div className="h-10 rounded bg-white border-2 border-gray-300" /> },
              { v: 'flat', label: tr('Flat', 'مسطح'), art: <div className="h-10 rounded bg-gray-200" /> },
            ]} />
            <Toggle checked={ui.showCalories} onChange={(v) => set((u) => void (u.showCalories = v))} label={tr('Show calories on dishes', 'عرض السعرات على الأطباق')} />
          </Card>

          <Card className="p-5">
            <div className="font-bold">{tr('Home screen sections', 'أقسام الشاشة الرئيسية')}</div>
            <p className="text-sm text-gray-500 mb-3">{tr('Reorder with the arrows, hide what you don’t need.', 'رتّب بالأسهم وأخفِ ما لا تحتاجه.')}</p>
            <div className="space-y-1.5">
              {ui.sections.map((k, i) => (
                <div key={k} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{label[k]}</span>
                  <button disabled={i === 0} onClick={() => move(i, -1)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-gray-100 disabled:opacity-25"><ArrowUp size={15} /></button>
                  <button disabled={i === ui.sections.length - 1} onClick={() => move(i, 1)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-gray-100 disabled:opacity-25"><ArrowDown size={15} /></button>
                  <button onClick={() => set((u) => void (u.sections = u.sections.filter((x) => x !== k)))} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-gray-100 text-gray-500" title={tr('Hide', 'إخفاء')}><EyeOff size={15} /></button>
                </div>
              ))}
              {hidden.map((k) => (
                <div key={k} className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 px-3 py-2 opacity-60">
                  <span className="w-5" />
                  <span className="flex-1 text-sm line-through">{label[k]}</span>
                  <button onClick={() => set((u) => void u.sections.push(k))} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-gray-100" title={tr('Show', 'إظهار')}><Eye size={15} /></button>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <aside className="hidden xl:block">
          <div className="sticky top-4">
            <div className="mx-auto w-[360px] h-[720px] rounded-[44px] border-[10px] border-gray-900 shadow-2xl overflow-hidden bg-white">
              <iframe title="preview" src={`${location.pathname}#/d/${id}/app`} className="h-full w-full" />
            </div>
            <p className="text-center text-xs text-gray-500 mt-3">{tr('Live preview — tap around', 'معاينة مباشرة — جرّبها')}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
