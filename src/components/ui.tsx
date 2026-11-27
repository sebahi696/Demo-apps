import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useStore } from '../lib/store';
import { cleanDecimal, cleanDigits, cleanName, cleanPhone, isEmail, isPhone } from '../lib/validate';

export const cx = clsx;

type BtnVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark' | 'accent';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand text-onbrand hover:brightness-110 shadow-sm',
  accent: 'bg-brand2 text-onbrand2 hover:brightness-105',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
  ghost: 'text-gray-700 hover:bg-gray-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  dark: 'bg-gray-900 text-white hover:bg-gray-800',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; block?: boolean; icon?: ReactNode }
>(({ variant = 'primary', size = 'md', block, icon, className, children, ...rest }, ref) => (
  <button
    ref={ref}
    className={cx(
      'inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none rounded-app select-none',
      size === 'sm' && 'h-9 px-3 text-sm',
      size === 'md' && 'h-11 px-4 text-[15px]',
      size === 'lg' && 'h-[52px] px-5 text-base',
      block && 'w-full',
      BTN[variant],
      className,
    )}
    {...rest}
  >
    {icon}
    {children}
  </button>
));

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cx('bg-white rounded-app border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,.05)]', onClick && 'cursor-pointer', className)}>
      {children}
    </div>
  );
}

export function Field({ label, hint, children, className }: { label?: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>}
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full h-11 px-3 rounded-app border border-gray-200 bg-white text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-gray-400';

export type InputKind = 'phone' | 'email' | 'pin' | 'digits' | 'decimal' | 'name' | 'code';
type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Restricts what can be typed and sets the right keyboard. type="tel"/"email" imply phone/email. */
  kind?: InputKind;
  /** Shows a red outline; pass a string to also show a message under the field. */
  invalid?: boolean | string;
};

/**
 * One input for the whole app. It cleans what is typed before the change handler sees it:
 * phone fields keep digits/+/spaces only, number fields never go below `min` (default 0) or
 * above `max`, letters like "e" are blocked, Arabic-Indic digits are converted, and the
 * mouse wheel no longer changes numbers by accident.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, kind, invalid, onChange, onKeyDown, onBlur, ...p }, ref) => {
  const k: InputKind | undefined = kind ?? (p.type === 'tel' ? 'phone' : p.type === 'email' ? 'email' : undefined);
  const isNum = p.type === 'number';
  const min = p.min !== undefined ? Number(p.min) : 0;
  const max = p.max !== undefined ? Number(p.max) : undefined;
  const [touched, setTouched] = useState(false);
  const emailBad = k === 'email' && touched && !!p.value && !isEmail(String(p.value));
  const phoneBad = k === 'phone' && touched && !!p.value && !isPhone(String(p.value));
  const bad = !!invalid || emailBad || phoneBad;
  const msg = typeof invalid === 'string' ? invalid : undefined;
  const extra: InputHTMLAttributes<HTMLInputElement> = {};
  if (k === 'phone') Object.assign(extra, { inputMode: 'tel', autoComplete: 'tel', dir: 'ltr', maxLength: 20 });
  if (k === 'email') Object.assign(extra, { inputMode: 'email', autoComplete: 'email', dir: 'ltr', autoCapitalize: 'none', spellCheck: false });
  if (k === 'pin' || k === 'digits') Object.assign(extra, { inputMode: 'numeric', dir: 'ltr', autoComplete: 'off' });
  if (k === 'decimal') Object.assign(extra, { inputMode: 'decimal', dir: 'ltr' });
  if (k === 'name') Object.assign(extra, { autoComplete: 'name', maxLength: 60 });
  if (isNum) Object.assign(extra, { inputMode: (p.step && String(p.step).includes('.')) || k === 'decimal' ? 'decimal' : 'numeric', min, dir: 'ltr' });
  const el = (
    <input
      ref={ref}
      {...extra}
      {...p}
      aria-invalid={bad || undefined}
      className={cx(inputCls, bad && '!border-rose-400 focus:!ring-rose-200', isNum && 'tabular-nums', className)}
      onWheel={isNum ? (e) => (e.target as HTMLInputElement).blur() : p.onWheel}
      onKeyDown={(e) => {
        if (isNum && ['e', 'E', '+'].includes(e.key)) e.preventDefault();
        if (isNum && e.key === '-' && min >= 0) e.preventDefault();
        onKeyDown?.(e);
      }}
      onBlur={(e) => {
        setTouched(true);
        if (k === 'email' && e.target.value !== e.target.value.trim()) {
          e.target.value = e.target.value.trim();
          onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
        }
        if (isNum && e.target.value !== '' && Number(e.target.value) < min) {
          e.target.value = String(min);
          onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
        }
        onBlur?.(e);
      }}
      onChange={(e) => {
        const t = e.target;
        const v = t.value;
        let nv = v;
        if (k === 'phone') nv = cleanPhone(v);
        else if (k === 'pin') nv = cleanDigits(v, p.maxLength ?? 6);
        else if (k === 'digits') nv = cleanDigits(v, p.maxLength ?? 12);
        else if (k === 'decimal') nv = cleanDecimal(v);
        else if (k === 'name') nv = cleanName(v);
        else if (k === 'code') nv = v.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
        if (isNum && v !== '') {
          const n = Number(v);
          if (!Number.isFinite(n)) nv = '';
          else if (n < 0 && min >= 0) nv = String(min);
          else if (max !== undefined && n > max) nv = String(max);
          else if (/^-?0\d/.test(v)) nv = String(n);
        }
        if (nv !== v) t.value = nv;
        onChange?.(e);
      }}
    />
  );
  if (!msg || !bad) return el;
  return (
    <span className="block">
      {el}
      <span className="block text-xs text-rose-600 mt-1">{msg}</span>
    </span>
  );
});
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cx(inputCls, 'h-auto py-2.5 min-h-[88px]', className)} {...p} />
);
export const Select = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cx(inputCls, 'pe-8', className)} {...p}>
    {children}
  </select>
);

export function Toggle({ checked, onChange, label, desc, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; desc?: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx('flex items-center gap-3 text-start', label || desc ? 'w-full' : 'shrink-0', disabled && 'opacity-50')}
    >
      {(label || desc) && (
        <span className="flex-1 min-w-0">
          {label && <span className="block text-[15px] font-medium text-gray-900">{label}</span>}
          {desc && <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>}
        </span>
      )}
      <span className={cx('relative inline-flex h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-gray-300')}>
        <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'start-[22px]' : 'start-0.5')} />
      </span>
    </button>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', className ?? 'bg-gray-100 text-gray-700')}>{children}</span>;
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={cx('flex rounded-app bg-gray-100 p-1 gap-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx('flex-1 rounded-[calc(var(--radius)*.75)] px-3 py-2 text-sm font-semibold transition whitespace-nowrap', value === o.value ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Modal that becomes a bottom sheet on phones. `contained` keeps it inside the phone frame. */
export function Modal({
  open, onClose, title, children, footer, size = 'md', contained,
}: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg'; contained?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  const el = (
    <div className={cx(contained ? 'absolute' : 'fixed', 'inset-0 z-50 flex items-end sm:items-center justify-center')}>
      <div className="absolute inset-0 bg-black/40 animate-[fade_.15s_ease]" onClick={onClose} />
      <div
        className={cx(
          'relative w-full bg-white shadow-2xl flex flex-col max-h-[92%] rounded-t-[22px] sm:rounded-app-lg animate-[up_.2s_ease]',
          contained ? 'sm:max-w-none sm:rounded-b-none sm:self-end' : size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg',
          !contained && 'sm:m-4',
        )}
      >
        {title !== undefined && (
          <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
            <div className="flex-1 font-bold text-lg truncate">{title}</div>
            <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full hover:bg-gray-100" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-gray-100 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
  return contained ? el : createPortal(el, document.body);
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="text-5xl mb-3">{icon}</div>
      <div className="font-bold text-lg">{title}</div>
      {text && <div className="text-gray-500 text-sm mt-1 max-w-xs">{text}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismiss);
  return createPortal(
    <div className="fixed top-3 inset-x-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-3">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cx(
            'pointer-events-auto max-w-sm w-full rounded-2xl px-4 py-3 text-sm font-medium shadow-lg animate-[down_.2s_ease] text-start',
            t.tone === 'error' ? 'bg-rose-600 text-white' : t.tone === 'info' ? 'bg-gray-900 text-white' : 'bg-emerald-600 text-white',
          )}
        >
          {t.text}
        </button>
      ))}
    </div>,
    document.body,
  );
}

export function Thumb({ emoji, image, bg, className, size = 'md' }: { emoji: string; image?: string; bg?: string; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const s = { sm: 'h-12 w-12 text-2xl', md: 'h-20 w-20 text-4xl', lg: 'h-28 w-28 text-5xl', xl: 'h-56 w-full text-[96px]' }[size];
  return (
    <div className={cx('shrink-0 grid place-items-center overflow-hidden rounded-app', s, className)} style={{ background: bg ?? '#f3f4f6' }}>
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span className="drop-shadow-sm">{emoji}</span>}
    </div>
  );
}

export function Stat({ label, value, sub, icon }: { label: ReactNode; value: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-extrabold mt-1 tracking-tight">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </Card>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3 mt-6">
      <h3 className="font-display font-bold text-lg">{children}</h3>
      {action}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex items-center rounded-full bg-gray-100">
      <button type="button" className="h-9 w-9 text-xl font-bold disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <span className="w-7 text-center font-bold tabular-nums">{value}</span>
      <button type="button" className="h-9 w-9 text-xl font-bold disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
