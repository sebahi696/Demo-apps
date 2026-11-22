import { Languages } from 'lucide-react';
import { useStore } from '../lib/store';
import { cx } from './ui';

export function LangToggle({ className, dark }: { className?: string; dark?: boolean }) {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
      className={cx(
        'inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold transition',
        dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        className,
      )}
      aria-label="Switch language"
    >
      <Languages size={16} />
      {lang === 'en' ? 'العربية' : 'English'}
    </button>
  );
}
