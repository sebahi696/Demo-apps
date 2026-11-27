// Small, dependency-free SVG charts for the owner reports.
// Follows the data-viz rules used across the app: thin marks (≤24px bars, 2px lines),
// 4px rounded data-ends square at the baseline, hairline recessive grid, a legend for 2+
// series, text in text colours (never the series colour), and a hover/focus tooltip on
// every mark. Colours are the fixed, colour-blind-validated categorical order below.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cx } from './ui';

export const SERIES = ['#257de0', '#f47230', '#00b894', '#f2a600', '#ee7fac', '#008a17', '#6a4ce2', '#ec4647'];
const GRID = '#e7e7e7';
const AXIS = '#c2c2c2';
const INK2 = '#666666';

/** Clean axis maximum and ticks: 0 / ¼ / ½ / ¾ / max on round numbers. */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const top = step * Math.ceil(max / step);
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}
export const compact = (n: number) =>
  Math.abs(n) >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e4 ? `${+(n / 1e3).toFixed(1)}K` : n.toLocaleString('en', { maximumFractionDigits: 1 });

// ── Stat tile ──────────────────────────────────────────────────
export function StatTile({ label, value, delta, deltaLabel, upIsGood = true, hint, icon, hero }: {
  label: ReactNode; value: ReactNode; delta?: number | null; deltaLabel?: string; upIsGood?: boolean; hint?: ReactNode; icon?: ReactNode; hero?: boolean;
}) {
  const dir = delta === undefined || delta === null || Math.abs(delta) < 0.5 ? 0 : delta > 0 ? 1 : -1;
  const good = dir === 0 ? null : (dir > 0) === upIsGood;
  return (
    <div className="rounded-2xl bg-white border border-gray-200/80 p-4 min-w-0">
      <div className="flex items-center gap-1.5 text-[13px] text-gray-500">{icon}<span className="truncate">{label}</span></div>
      <div className={cx('mt-1 font-semibold text-gray-900 truncate', hero ? 'text-[26px] leading-tight tracking-tight' : 'text-2xl')}>{value}</div>
      {(delta !== undefined || hint) && (
        <div className="mt-1 flex items-center gap-1.5 text-xs flex-wrap">
          {delta !== undefined && (
            <span className={cx('inline-flex items-center gap-0.5 font-semibold rounded-full px-1.5 py-0.5', good === null ? 'bg-gray-100 text-gray-600' : good ? 'bg-emerald-50 text-[#006c10]' : 'bg-rose-50 text-rose-700')}>
              {dir > 0 ? <ArrowUpRight size={12} /> : dir < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
              {delta === null ? 'new' : `${Math.abs(delta).toFixed(0)}%`}
            </span>
          )}
          {deltaLabel && delta !== undefined && <span className="text-gray-400">{deltaLabel}</span>}
          {hint && <span className="text-gray-500">{hint}</span>}
        </div>
      )}
    </div>
  );
}

// ── Tooltip shell ──────────────────────────────────────────────
function Tip({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 70), w - 70);
  return (
    <div className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl bg-gray-900 text-white text-xs px-2.5 py-1.5 shadow-lg whitespace-nowrap" style={{ left, top: y - 8 }} dir="auto">
      {children}
    </div>
  );
}

// ── Column chart (one series, optional comparison series) ──────
export interface Col { label: string; value: number; tip?: string; prev?: number }
export function ColumnChart({ data, format = compact, tipFormat, height = 200, valueName, prevName, every }: {
  data: Col[]; format?: (n: number) => string; tipFormat?: (n: number) => string; height?: number; valueName?: string; prevName?: string; every?: number;
}) {
  const tf = tipFormat ?? format;
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, padL = 44, padB = 22, padT = 8;
  const hasPrev = data.some((d) => d.prev !== undefined);
  const { top, ticks } = niceTicks(Math.max(1, ...data.map((d) => Math.max(d.value, d.prev ?? 0))));
  const band = (W - padL) / Math.max(1, data.length);
  const bw = Math.min(24, band * (hasPrev ? 0.36 : 0.62));
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const labelEvery = every ?? Math.max(1, Math.ceil(data.length / 10));
  const bar = (x: number, v: number, fill: string, key: string, dim: boolean) => {
    const h = Math.max(0, H - padB - y(v));
    if (h <= 0) return null;
    const r = Math.min(4, h, bw / 2);
    const x0 = x - bw / 2, y0 = H - padB - h;
    return <path key={key} d={`M${x0},${H - padB} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + bw - r} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} V${H - padB} Z`} fill={fill} opacity={dim ? 0.45 : 1} />;
  };
  return (
    <div>
      {hasPrev && (
        <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[0] }} />{valueName}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#b9c3cf' }} />{prevName}</span>
        </div>
      )}
      <div ref={ref} className="relative" dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={valueName}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke={t === 0 ? AXIS : GRID} strokeWidth={1} />
              <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={INK2} className="tabular-nums">{format(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx0 = padL + band * i + band / 2;
            const dim = hover !== null && hover !== i;
            return (
              <g key={i}>
                {hasPrev && bar(cx0 - bw / 2 - 1, d.prev ?? 0, '#b9c3cf', 'p', dim)}
                {bar(hasPrev ? cx0 + bw / 2 + 1 : cx0, d.value, SERIES[0], 'v', dim)}
                {i % labelEvery === 0 && <text x={cx0} y={H - 6} textAnchor="middle" fontSize={11} fill={INK2}>{d.label}</text>}
                <rect x={padL + band * i} y={0} width={band} height={H - padB} fill="transparent" tabIndex={0} aria-label={`${d.label}: ${tf(d.value)}`}
                  onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
              </g>
            );
          })}
        </svg>
        {hover !== null && ref.current && (
          <Tip x={((padL + band * hover + band / 2) / W) * ref.current.clientWidth} y={(y(Math.max(data[hover].value, data[hover].prev ?? 0)) / H) * ref.current.clientHeight} w={ref.current.clientWidth}>
            <div className="font-semibold text-sm">{tf(data[hover].value)}</div>
            {data[hover].prev !== undefined && <div className="text-white/70">{prevName}: {tf(data[hover].prev!)}</div>}
            <div className="text-white/70">{data[hover].tip ?? data[hover].label}</div>
          </Tip>
        )}
      </div>
    </div>
  );
}

// ── Line chart with crosshair ──────────────────────────────────
export function LineChart({ data, format = compact, tipFormat, height = 220, valueName, prevName }: {
  data: Col[]; format?: (n: number) => string; tipFormat?: (n: number) => string; height?: number; valueName?: string; prevName?: string;
}) {
  const tf = tipFormat ?? format;
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, padL = 44, padB = 22, padT = 10, padR = 10;
  const hasPrev = data.some((d) => d.prev !== undefined);
  const { top, ticks } = niceTicks(Math.max(1, ...data.map((d) => Math.max(d.value, d.prev ?? 0))));
  const x = (i: number) => padL + ((W - padL - padR) * i) / Math.max(1, data.length - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const cur = data.map((d) => d.value);
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - padL) / (W - padL - padR)) * (data.length - 1)))));
  };
  return (
    <div>
      {hasPrev && (
        <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: SERIES[0] }} />{valueName}</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: '#9aa5b1' }} />{prevName}</span>
        </div>
      )}
      <div ref={ref} className="relative" dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block touch-pan-y" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={valueName}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? AXIS : GRID} strokeWidth={1} />
              <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={INK2}>{format(t)}</text>
            </g>
          ))}
          {data.map((d, i) => i % labelEvery === 0 && <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill={INK2}>{d.label}</text>)}
          <path d={`${path(cur)} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={SERIES[0]} opacity={0.1} />
          {hasPrev && <path d={path(data.map((d) => d.prev ?? 0))} fill="none" stroke="#9aa5b1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          <path d={path(cur)} fill="none" stroke={SERIES[0]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {data.length > 0 && <circle cx={x(data.length - 1)} cy={y(cur[cur.length - 1])} r={4} fill={SERIES[0]} stroke="#fff" strokeWidth={2} />}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke={AXIS} strokeWidth={1} />
              {hasPrev && <circle cx={x(hover)} cy={y(data[hover].prev ?? 0)} r={4} fill="#9aa5b1" stroke="#fff" strokeWidth={2} />}
              <circle cx={x(hover)} cy={y(data[hover].value)} r={4.5} fill={SERIES[0]} stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
        {hover !== null && ref.current && (
          <Tip x={(x(hover) / W) * ref.current.clientWidth} y={(y(Math.max(data[hover].value, data[hover].prev ?? 0)) / H) * ref.current.clientHeight} w={ref.current.clientWidth}>
            <div className="text-white/70 mb-0.5">{data[hover].tip ?? data[hover].label}</div>
            <div className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ background: SERIES[0] }} /><b className="text-sm">{tf(data[hover].value)}</b><span className="text-white/60">{valueName}</span></div>
            {hasPrev && <div className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-[#9aa5b1]" /><b>{tf(data[hover].prev ?? 0)}</b><span className="text-white/60">{prevName}</span></div>}
          </Tip>
        )}
      </div>
    </div>
  );
}

// ── Ranked horizontal bars (top products, reasons, riders…) ────
export interface BarRow { key: string; label: ReactNode; value: number; display: ReactNode; sub?: ReactNode; lead?: ReactNode }
export function BarList({ rows, color = SERIES[0], empty }: { rows: BarRow[]; color?: string; empty?: ReactNode }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <div className="text-sm text-gray-500 py-6 text-center">{empty ?? '—'}</div>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="group" title={typeof r.label === 'string' ? r.label : undefined}>
          <div className="flex items-center gap-2 text-sm">
            {r.lead}
            <span className="flex-1 min-w-0 truncate text-gray-800">{r.label}</span>
            {r.sub && <span className="text-xs text-gray-500 shrink-0">{r.sub}</span>}
            <span className="font-semibold tabular-nums shrink-0 text-gray-900">{r.display}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all group-hover:brightness-110" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Tall segmented bar (a whole split into parts) ──────────────
export function SegmentedBar({ parts, format = compact }: { parts: { key: string; label: string; value: number }[]; format?: (n: number) => string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const [hover, setHover] = useState<string | null>(null);
  const shown = useMemo(() => parts.filter((p) => p.value > 0), [parts]);
  if (!total) return <div className="text-sm text-gray-500">—</div>;
  return (
    <div>
      <div className="flex h-7 gap-[2px]" dir="ltr" role="img" aria-label={shown.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}>
        {shown.map((p) => {
          const i = parts.indexOf(p);
          const pct = (p.value / total) * 100;
          const dark = i === 3; // yellow takes near-black ink
          return (
            <div key={p.key} className="relative rounded-[4px] flex items-center px-1.5 text-[11px] font-semibold overflow-visible transition-opacity"
              style={{ width: `${pct}%`, background: SERIES[i % SERIES.length], color: dark ? '#0b0b0b' : '#fff', opacity: hover && hover !== p.key ? 0.5 : 1 }}
              onPointerEnter={() => setHover(p.key)} onPointerLeave={() => setHover(null)} title={`${p.label}: ${format(p.value)} (${pct.toFixed(0)}%)`}>
              {pct >= 9 && `${pct.toFixed(0)}%`}
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600">
        {shown.map((p) => (
          <span key={p.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[parts.indexOf(p) % SERIES.length] }} />
            {p.label} <span className="text-gray-900 font-semibold">{format(p.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Meter (progress toward a target) ───────────────────────────
export function Meter({ value, max = 100, tone = 'blue' }: { value: number; max?: number; tone?: 'blue' | 'good' | 'warn' | 'bad' }) {
  const c = { blue: ['#257de0', '#cce3fd'], good: ['#0aac23', '#d3f2d8'], warn: ['#f2a600', '#fdeec7'], bad: ['#dc3c3d', '#f8d3d3'] }[tone];
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: c[1] }}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`, background: c[0] }} />
    </div>
  );
}
