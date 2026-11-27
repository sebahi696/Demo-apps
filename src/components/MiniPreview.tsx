import { Bell, Home, Gift, User, ShoppingBag, Plus, Search } from 'lucide-react';
import type { AppUi, DemoConfig } from '../lib/types';
import { themeVars } from '../lib/theme';
import { PRESETS } from '../lib/presets';
import { useI18n } from '../lib/i18n';
import { defaultUi } from '../lib/seed';
import { cx } from './ui';

type PreviewCfg = Pick<DemoConfig, 'industry' | 'brand' | 'business' | 'modules'> & { ui?: Partial<AppUi> };

/**
 * Small live phone preview used by the questionnaire and the branding editor.
 * It follows every look-and-feel choice: colours, font, corners, light/dark,
 * card style, header style and the menu layout (list, grid or big photos).
 */
export function MiniPreview({ cfg }: { cfg: PreviewCfg }) {
  const { lang, tr, tl } = useI18n();
  const pr = PRESETS[cfg.industry];
  const ui: AppUi = { ...defaultUi(cfg.industry), ...(cfg.ui ?? {}) } as AppUi;
  const vars = themeVars(cfg.brand, lang) as React.CSSProperties;
  const name = tl(cfg.business.name) || tl(pr.sampleName);
  const dark = ui.theme === 'dark';
  const products = pr.products.slice(0, ui.menuLayout === 'large' ? 2 : ui.menuLayout === 'list' ? 4 : 4);
  const price = (n: number) => `$${n}`;
  const add = <span className="h-5 w-5 shrink-0 rounded-full bg-brand text-onbrand grid place-items-center"><Plus size={12} strokeWidth={3} /></span>;
  const loyalty = cfg.modules.loyaltyPoints || cfg.modules.loyaltyStamps;

  return (
    <div style={vars} className="mx-auto w-[260px] rounded-[38px] border-[8px] border-gray-900 shadow-2xl overflow-hidden font-sans transition-colors">
      <div className={cx('h-[520px] flex flex-col overflow-hidden bg-gray-50 text-gray-900', dark && 'app-dark', `cards-${ui.cardStyle}`)}>
        <div className={cx('text-onbrand px-4 pt-6 pb-10 relative overflow-hidden', ui.header === 'gradient' ? 'bg-gradient-to-br from-brand via-brand to-brand2' : 'bg-brand')}>
          {ui.header === 'image' && (
            <div className="absolute inset-0 opacity-[.14] text-[34px] leading-[1.2] break-all pointer-events-none select-none" aria-hidden>
              {Array.from({ length: 30 }, () => ui.coverEmoji).join(' ')}
            </div>
          )}
          <div className="relative flex items-center gap-2">
            <div className="h-9 w-9 rounded-app bg-white/20 grid place-items-center text-lg overflow-hidden">
              {cfg.business.logo ? <img src={cfg.business.logo} className="h-full w-full object-cover" alt="" /> : cfg.business.logoEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] opacity-75">{tr('Good evening', 'مساء الخير')}</div>
              <div className="font-display font-bold truncate">{name}</div>
            </div>
            <Bell size={16} />
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {loyalty ? (
            <div className="-mt-7 mx-3 relative rounded-app bg-white shadow p-3">
              <div className="text-[10px] text-gray-500">{tr('Your points', 'نقاطك')}</div>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-extrabold text-brand font-display">180</div>
                <span className="text-[10px] rounded-full bg-brand2 text-onbrand2 px-2 py-0.5 font-bold">{tr('Silver', 'فضي')}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100"><div className="h-full w-2/3 rounded-full bg-brand" /></div>
            </div>
          ) : (
            <div className="-mt-6 mx-3 relative rounded-app bg-white shadow px-3 h-9 flex items-center gap-2 text-[11px] text-gray-400"><Search size={13} />{tr('Search the menu', 'ابحث في القائمة')}</div>
          )}

          <div className="px-3 mt-3 flex gap-1.5 overflow-hidden">
            {pr.categories.slice(0, 3).map((c, i) => (
              <span key={c.id} className={cx('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold', i === 0 ? 'bg-brand text-onbrand' : 'bg-white text-gray-700 border border-gray-200')}>
                {c.emoji} {tl(c.name)}
              </span>
            ))}
          </div>

          {ui.menuLayout === 'grid' && (
            <div className="px-3 mt-2.5 grid grid-cols-2 gap-2">
              {products.map((p) => (
                <div key={p.id} className="rounded-app bg-white p-2 shadow-sm">
                  <div className="h-14 rounded-app grid place-items-center text-2xl" style={{ background: p.bg }}>{p.emoji}</div>
                  <div className="text-[10px] font-semibold mt-1 truncate">{tl(p.name)}</div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-500">{price(p.price)}</span>
                    {add}
                  </div>
                </div>
              ))}
            </div>
          )}

          {ui.menuLayout === 'list' && (
            <div className="px-3 mt-2.5 space-y-2">
              {products.map((p) => (
                <div key={p.id} className="rounded-app bg-white p-2 shadow-sm flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold truncate">{tl(p.name)}</div>
                    <div className="text-[9px] text-gray-500 truncate">{tl(p.desc)}</div>
                    <div className="text-[10px] font-bold mt-0.5">{price(p.price)}</div>
                  </div>
                  <div className="h-11 w-11 shrink-0 rounded-app grid place-items-center text-xl relative" style={{ background: p.bg }}>
                    {p.emoji}
                    <span className="absolute -bottom-1 -end-1">{add}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {ui.menuLayout === 'large' && (
            <div className="px-3 mt-2.5 space-y-2">
              {products.map((p) => (
                <div key={p.id} className="rounded-app bg-white shadow-sm overflow-hidden">
                  <div className="h-[86px] grid place-items-center text-5xl" style={{ background: p.bg }}>{p.emoji}</div>
                  <div className="p-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold truncate">{tl(p.name)}</div>
                      <div className="text-[10px] text-gray-500">{price(p.price)}</div>
                    </div>
                    {add}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 bg-white border-t border-gray-100 grid grid-cols-4 py-2 text-[9px] text-gray-400">
          <div className="flex flex-col items-center text-brand"><Home size={16} />{tr('Home', 'الرئيسية')}</div>
          <div className="flex flex-col items-center"><ShoppingBag size={16} />{tl(pr.terms.catalog)}</div>
          <div className="flex flex-col items-center"><Gift size={16} />{tr('Rewards', 'المكافآت')}</div>
          <div className="flex flex-col items-center"><User size={16} />{tr('Account', 'حسابي')}</div>
        </div>
      </div>
    </div>
  );
}
