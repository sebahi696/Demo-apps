// Shared field rules. Every form in the app uses these so phone, email, PIN and
// number fields behave the same everywhere.

/** Arabic-Indic and Persian digits → ASCII, so "٠٧١" typed on an Arabic keyboard works. */
export const toAsciiDigits = (s: string) =>
  s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

/** Keeps only what a phone number can contain: digits, one leading +, spaces and dashes. */
export const cleanPhone = (s: string) => {
  const t = toAsciiDigits(s).replace(/[^\d+\s-]/g, '');
  const plus = t.trimStart().startsWith('+');
  return ((plus ? '+' : '') + t.replace(/\+/g, '').trimStart()).replace(/\s{2,}/g, ' ').slice(0, 20);
};
export const phoneDigits = (s: string) => s.replace(/\D/g, '');
/** 7–15 digits (E.164 allows up to 15). */
export const isPhone = (s: string) => {
  const n = phoneDigits(s).length;
  return n >= 7 && n <= 15;
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (s: string) => EMAIL_RE.test(s.trim());

export const cleanDigits = (s: string, max = 12) => toAsciiDigits(s).replace(/\D/g, '').slice(0, max);
export const isPin = (s: string, len = 4) => new RegExp(`^\\d{${len}}$`).test(s);

/** Decimal text: digits and one dot (Arabic comma/decimal mark accepted). */
export const cleanDecimal = (s: string, allowNegative = false) => {
  let t = toAsciiDigits(s).replace(/[٫,]/g, '.');
  const neg = allowNegative && t.trim().startsWith('-');
  t = t.replace(/[^\d.]/g, '');
  const i = t.indexOf('.');
  if (i >= 0) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, '');
  return (neg ? '-' : '') + t.slice(0, 12);
};

export const isName = (s: string) => s.trim().length >= 2 && !/^\d+$/.test(s.trim());
/** Names must contain letters (any script) — no digits-only or symbol-only names. */
export const cleanName = (s: string) => s.replace(/[<>{}[\]\\|^~`$=]/g, '').slice(0, 60);

export const clamp = (n: number, min: number, max = Infinity) => (Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);

export const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
