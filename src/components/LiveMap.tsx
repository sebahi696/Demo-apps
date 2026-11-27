import { useEffect, useState } from 'react';
import type { Order, Rider } from '../lib/types';

/**
 * A simulated live map: the store, the customer and the rider moving
 * between them. In the real product this becomes a map fed by the
 * rider app's GPS. Here a ride takes RIDE_MS of real time.
 */
const RIDE_MS = 120_000;

// Stable pseudo-random point for an order, so each customer has their own spot.
const spot = (seed: string, w: number, h: number) => {
  let x = 0;
  for (const ch of seed) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return { x: 60 + (x % (w - 120)), y: 50 + ((x >> 8) % (h - 100)) };
};

export function rideProgress(o: Order) {
  if (o.status === 'completed') return 1;
  if (!o.assignedAt) return 0;
  return Math.min(0.97, (Date.now() - o.assignedAt) / RIDE_MS);
}

export function LiveMap({ orders, riders, height = 190, storeLabel }: { orders: Order[]; riders: Rider[]; height?: number; storeLabel?: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const W = 360;
  const H = 200;
  const store = { x: W / 2, y: H / 2 };
  return (
    <div className="relative overflow-hidden rounded-app bg-[#e8efe6]" style={{ height }} dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <rect width={W} height={H} fill="#eaf0e7" />
        <path d="M0 150 C 80 140, 140 175, 230 160 S 330 120, 360 130 L360 200 L0 200 Z" fill="#cfe3f3" />
        {[30, 75, 120].map((y) => <line key={'h' + y} x1="0" x2={W} y1={y} y2={y} stroke="#fff" strokeWidth="7" />)}
        {[50, 120, 190, 260, 320].map((x) => <line key={'v' + x} x1={x} x2={x} y1="0" y2={H} stroke="#fff" strokeWidth="7" />)}
        {[[70, 40, 40, 25], [205, 85, 45, 28], [130, 130, 50, 20], [270, 40, 40, 28]].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="3" fill="#d6e4cf" />
        ))}
        {orders.map((o) => {
          const dest = spot(o.id, W, H);
          const p = rideProgress(o);
          const mid = { x: dest.x, y: store.y };
          const len1 = Math.abs(mid.x - store.x);
          const len2 = Math.abs(dest.y - mid.y);
          const dist = (len1 + len2) * p;
          const pos = dist <= len1
            ? { x: store.x + Math.sign(mid.x - store.x) * dist, y: store.y }
            : { x: mid.x, y: mid.y + Math.sign(dest.y - mid.y) * (dist - len1) };
          return (
            <g key={o.id}>
              <polyline points={`${store.x},${store.y} ${mid.x},${mid.y} ${dest.x},${dest.y}`} fill="none" stroke="rgb(var(--brand))" strokeWidth="3" strokeDasharray="6 5" opacity=".6" />
              <circle cx={dest.x} cy={dest.y} r="7" fill="#fff" stroke="rgb(var(--brand))" strokeWidth="3" />
              <g transform={`translate(${pos.x},${pos.y})`}>
                <circle r="13" fill="rgb(var(--brand))" opacity=".18">
                  <animate attributeName="r" values="9;16;9" dur="1.6s" repeatCount="indefinite" />
                </circle>
                <circle r="9" fill="rgb(var(--brand))" stroke="#fff" strokeWidth="2.5" />
                <text y="3.5" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">{(riders.find((r) => r.id === o.riderId)?.name ?? '?')[0]}</text>
              </g>
            </g>
          );
        })}
        <g transform={`translate(${store.x},${store.y})`}>
          <rect x="-11" y="-11" width="22" height="22" rx="6" fill="#111827" />
          <text y="4" textAnchor="middle" fontSize="11">🏪</text>
        </g>
      </svg>
      {storeLabel && <div className="absolute top-2 start-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold shadow">{storeLabel}</div>}
    </div>
  );
}

export const etaMinutes = (o: Order, zoneEta: number) => Math.max(1, Math.round((1 - rideProgress(o)) * Math.max(8, zoneEta * 0.5)));
