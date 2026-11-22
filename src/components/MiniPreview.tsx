import { Bell, Home, Gift, User, ShoppingBag } from 'lucide-react';
import type { DemoConfig } from '../lib/types';
import { themeVars } from '../lib/theme';
import { PRESETS } from '../lib/presets';
import { useI18n } from '../lib/i18n';

/** Small live phone preview used by the questionnaire and the branding editor. */
export function MiniPreview({ cfg }: { cfg: Pick<DemoConfig, 'industry' | 'brand' | 'business' | 'modules'> }) {
  const { lang, tr, tl } = useI18n();
  const pr = PRESETS[cfg.industry];
  const vars = themeVars(cfg.brand, lang) as React.CSSProperties;
  const name = tl(cfg.business.name) || tl(pr.sampleName);
  return (
    <div style={vars} className="mx-auto w-[260px] rounded-[38px] border-[8px] border-gray-900 bg-gray-50 shadow-2xl overflow-hidden font-sans">
      <div className="h-[500px] flex flex-col">
        <div className="bg-brand text-onbrand px-4 pt-6 pb-10">
          <div className="flex items-center gap-2">
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
        <div className="-mt-7 mx-3 rounded-app bg-white shadow p-3">
          <div className="text-[10px] text-gray-500">{tr('Your points', 'نقاطك')}</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-extrabold text-brand">180</div>
            <span className="text-[10px] rounded-full bg-brand2 text-onbrand2 px-2 py-0.5 font-bold">{tr('Silver', 'فضي')}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100"><div className="h-full w-2/3 rounded-full bg-brand" /></div>
        </div>
        <div className="px-3 mt-3 grid grid-cols-2 gap-2">
          {pr.products.slice(0, 4).map((p) => (
            <div key={p.id} className="rounded-app bg-white p-2 shadow-sm">
              <div className="h-14 rounded-app grid place-items-center text-2xl" style={{ background: p.bg }}>{p.emoji}</div>
              <div className="text-[10px] font-semibold mt-1 truncate">{tl(p.name)}</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-gray-500">${p.price}</span>
                <span className="h-5 w-5 rounded-full bg-brand text-onbrand grid place-items-center text-xs font-bold">+</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto bg-white border-t border-gray-100 grid grid-cols-4 py-2 text-[9px] text-gray-400">
          <div className="flex flex-col items-center text-brand"><Home size={16} />{tr('Home', 'الرئيسية')}</div>
          <div className="flex flex-col items-center"><ShoppingBag size={16} />{tl(pr.terms.catalog)}</div>
          <div className="flex flex-col items-center"><Gift size={16} />{tr('Rewards', 'المكافآت')}</div>
          <div className="flex flex-col items-center"><User size={16} />{tr('Account', 'حسابي')}</div>
        </div>
      </div>
    </div>
  );
}
