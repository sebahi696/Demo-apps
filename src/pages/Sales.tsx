import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Trash2, CalendarPlus, ExternalLink, FileText, Plus, Download, Lock, RefreshCw, Smartphone, Cloud, CloudOff } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { useI18n } from '../lib/i18n';
import { PRESETS } from '../lib/presets';
import { shareLink } from '../lib/share';
import { buildData } from '../lib/seed';
import { cloudOn, checkPasscode, deleteLead, extendLead, listLeads, type CloudLead } from '../lib/cloud';
import { DAY, downloadCsv, fmtDate, timeAgo, uid } from '../lib/utils';
import { Button, Card, Input, Modal, Badge, cx } from '../components/ui';
import { PlanSummary } from '../components/PlanSummary';
import { LangToggle } from '../components/LangToggle';
import type { Demo, DemoData } from '../lib/types';

/** One row in the console, from the cloud or (offline) from this device. */
interface Row {
  id: string;
  demo: Demo; // config + (local data, or a light stub for cloud-only rows)
  local: boolean;
  createdAt: number;
  expiresAt: number;
  lastSeen: number;
  origin: string;
  productsAdded?: number;
}

const stubData = (activity: Record<string, number>, tour: Record<string, boolean>) =>
  ({ activity, tour, products: [] }) as unknown as DemoData;

export default function Sales() {
  const { tr, tl, lang } = useI18n();
  const nav = useNavigate();
  const demosMap = useStore((s) => s.demos);
  const addDemo = useStore((s) => s.addDemo);
  const update = useStore((s) => s.update);
  const removeDemo = useStore((s) => s.removeDemo);
  const [pass, setPass] = useState(() => sessionStorage.getItem('sales-pass') ?? '');
  const [ok, setOk] = useState(false);
  const [checking, setChecking] = useState(!!pass);
  const [pin, setPin] = useState('');
  const [leads, setLeads] = useState<CloudLead[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<Row | null>(null);

  const load = useCallback(async (p: string) => {
    if (!cloudOn()) return;
    setLoading(true);
    setError('');
    try {
      setLeads(await listLeads(p));
    } catch {
      setError(tr('Could not reach the cloud — showing demos on this device only.', 'تعذّر الوصول إلى السحابة — تُعرض تجارب هذا الجهاز فقط.'));
    } finally {
      setLoading(false);
    }
  }, [tr]);

  // Re-check a remembered passcode once.
  useEffect(() => {
    if (!pass || !cloudOn()) { setChecking(false); return; }
    checkPasscode(pass).then((v) => { setOk(v); if (v) load(pass); }).catch(() => setOk(false)).finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) return <div className="min-h-full grid place-items-center bg-gray-950"><div className="h-10 w-10 rounded-full border-4 border-white/20 border-t-white animate-spin" /></div>;

  if (!ok)
    return (
      <div className="min-h-full grid place-items-center bg-gray-950 p-6">
        <form className="w-full max-w-xs text-center" onSubmit={async (e) => {
          e.preventDefault();
          let v = false;
          try { v = cloudOn() ? await checkPasscode(pin) : false; } catch { toast(tr('No connection', 'لا يوجد اتصال'), 'error'); return; }
          if (v) { sessionStorage.setItem('sales-pass', pin); setPass(pin); setOk(true); load(pin); }
          else toast(tr('Wrong passcode', 'رمز خاطئ'), 'error');
        }}>
          <Lock className="mx-auto text-amber-400" size={32} />
          <h1 className="text-white text-xl font-bold mt-3">{tr('Sales console', 'لوحة المبيعات')}</h1>
          <Input type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} className="mt-5 text-center tracking-[.5em]" placeholder="••••••" />
          <Button block variant="accent" className="mt-3">{tr('Enter', 'دخول')}</Button>
          <Link to="/" className="block text-white/50 text-sm mt-6">{tr('Back', 'رجوع')}</Link>
        </form>
      </div>
    );

  // Merge: cloud leads first, then local demos the cloud doesn't know about (offline / not synced yet).
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const l of leads ?? []) {
    const local = demosMap[l.id];
    seen.add(l.id);
    rows.push({
      id: l.id,
      demo: local ?? { config: { ...l.config, expiresAt: l.expires_at ? new Date(l.expires_at).getTime() : l.config.expiresAt }, data: stubData(l.activity, l.tour) },
      local: !!local,
      createdAt: new Date(l.created_at).getTime(),
      expiresAt: l.expires_at ? new Date(l.expires_at).getTime() : l.config.expiresAt,
      lastSeen: new Date(l.last_seen_at).getTime(),
      origin: l.origin ?? 'wizard',
      productsAdded: l.stats?.productsAdded,
    });
  }
  for (const d of Object.values(demosMap)) {
    if (seen.has(d.config.id) || d.config.noSync) continue;
    rows.push({ id: d.config.id, demo: d, local: true, createdAt: d.config.createdAt, expiresAt: d.config.expiresAt, lastSeen: d.config.createdAt, origin: d.config.origin ?? 'wizard' });
  }
  rows.sort((a, b) => b.createdAt - a.createdAt);

  const score = (r: Row) => Object.values(r.demo.data.activity).reduce((s, n) => s + n, 0);
  const tourDone = (r: Row) => Object.keys(r.demo.data.tour).length;

  const open = (r: Row) => {
    if (r.local) return nav(`/d/${r.id}/owner`);
    // A private preview copy for the salesperson — never reported back, so it can't overwrite the client's lead.
    const config = { ...structuredClone(r.demo.config), id: uid('d'), noSync: true, createdAt: Date.now(), expiresAt: Date.now() + 30 * DAY };
    const copy: Demo = { config, data: buildData(config) };
    copy.data.activity = { ...r.demo.data.activity };
    addDemo(copy);
    nav(`/d/${config.id}/owner`);
  };
  const extend = async (r: Row) => {
    try {
      if (cloudOn() && leads) await extendLead(pass, r.id, 7);
      if (r.local) update(r.id, (x) => void (x.config.expiresAt = Math.max(x.config.expiresAt, Date.now()) + 7 * DAY));
      toast(tr('Extended by 7 days — the client sees it next time they open the app', 'تم التمديد 7 أيام — سيظهر للعميل عند فتح التطبيق'));
      load(pass);
    } catch { toast(tr('Could not extend', 'تعذّر التمديد'), 'error'); }
  };
  const del = async (r: Row) => {
    if (!confirm(tr('Delete this lead?', 'حذف هذا العميل؟'))) return;
    try {
      if (cloudOn() && leads) await deleteLead(pass, r.id);
      if (r.local) removeDemo(r.id);
      load(pass);
    } catch { toast(tr('Could not delete', 'تعذّر الحذف'), 'error'); }
  };
  const exportLeads = () =>
    downloadCsv('leads.csv', [
      ['Business', 'Industry', 'Owner', 'Phone', 'Email', 'Country', 'City', 'Source', 'Created', 'Last seen', 'Expires', 'Activity', 'Tour done', 'Modules', 'Answers'],
      ...rows.map((r) => {
        const c = r.demo.config;
        return [
          c.business.name.en, c.industry, c.lead.ownerName, c.lead.phone, c.lead.email, c.business.country, c.business.city, r.origin,
          new Date(r.createdAt).toISOString().slice(0, 16), new Date(r.lastSeen).toISOString().slice(0, 16), new Date(r.expiresAt).toISOString().slice(0, 10),
          score(r), tourDone(r), Object.entries(c.modules).filter(([, v]) => v).map(([k]) => k).join(' '),
          Object.entries(c.lead.answers).map(([k, v]) => `${k}: ${v}`).join(' | '),
        ];
      }),
    ]);

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => nav('/')} className="h-10 w-10 grid place-items-center rounded-full hover:bg-white/10"><ArrowLeft className="rtl:rotate-180" size={20} /></button>
          <div className="font-bold flex-1">{tr('Sales console', 'لوحة المبيعات')}</div>
          <button onClick={() => { sessionStorage.removeItem('sales-pass'); setOk(false); setPin(''); }} className="text-sm text-white/60 hover:text-white me-2">{tr('Lock', 'قفل')}</button>
          <LangToggle dark />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-2xl font-extrabold">{tr('Demos & leads', 'التجارب والعملاء المحتملون')}</h1>
            <p className="text-gray-500 text-sm flex items-center gap-1.5">
              {leads ? <Cloud size={14} className="text-emerald-600" /> : <CloudOff size={14} />}
              {leads
                ? tr(`${rows.length} demos from all devices`, `${rows.length} تجربة من كل الأجهزة`)
                : tr('This device only', 'هذا الجهاز فقط')}
            </p>
          </div>
          <Button variant="outline" icon={<RefreshCw size={16} className={cx(loading && 'animate-spin')} />} onClick={() => load(pass)}>{tr('Refresh', 'تحديث')}</Button>
          <Button variant="outline" icon={<Download size={16} />} onClick={exportLeads} disabled={!rows.length}>CSV</Button>
          <Button variant="dark" icon={<Plus size={16} />} onClick={() => nav('/start')}>{tr('New demo', 'تجربة جديدة')}</Button>
        </div>
        {error && <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3">{error}</div>}

        <div className="mt-6 grid gap-3">
          {rows.length === 0 && <Card className="p-10 text-center text-gray-500">{loading ? tr('Loading…', 'جارٍ التحميل…') : tr('No demos yet.', 'لا توجد تجارب بعد.')}</Card>}
          {rows.map((r) => {
            const c = r.demo.config;
            const expired = r.expiresAt < Date.now();
            const days = Math.ceil((r.expiresAt - Date.now()) / DAY);
            return (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-12 w-12 rounded-xl grid place-items-center text-2xl overflow-hidden" style={{ background: c.brand.primary }}>
                    {c.business.logo ? <img src={c.business.logo} className="h-full w-full object-cover" alt="" /> : c.business.logoEmoji}
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <div className="font-bold flex items-center gap-2 flex-wrap">
                      {tl(c.business.name)}
                      {r.origin === 'shared' && <Badge className="bg-sky-100 text-sky-800"><Smartphone size={11} /> {tr('from share link', 'من رابط مشاركة')}</Badge>}
                      {r.local && <Badge>{tr('on this device', 'على هذا الجهاز')}</Badge>}
                    </div>
                    <div className="text-xs text-gray-500">{tl(PRESETS[c.industry].label)} · {c.lead.ownerName || '—'} · <span dir="ltr">{c.lead.phone}</span>{c.lead.email && ` · ${c.lead.email}`}</div>
                  </div>
                  <Info k={tr('Created', 'أنشئ')} v={fmtDate(r.createdAt, lang)} />
                  <Info k={tr('Last active', 'آخر نشاط')} v={timeAgo(r.lastSeen, lang)} />
                  <Info k={tr('Trial', 'التجربة')} v={<span className={cx(expired ? 'text-rose-600' : days <= 3 ? 'text-amber-600' : 'text-emerald-700')}>{expired ? tr('Expired', 'منتهية') : tr(`${days} days left`, `متبقٍ ${days} يوماً`)}</span>} />
                  <Info k={tr('Tried', 'جرّب')} v={<span className="tabular-nums">{tourDone(r)}/10 · {score(r)}</span>} />
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="dark" icon={<ExternalLink size={14} />} onClick={() => open(r)}>{r.local ? tr('Open', 'فتح') : tr('Preview', 'معاينة')}</Button>
                    <Button size="sm" variant="outline" icon={<Copy size={14} />} onClick={async () => { await navigator.clipboard.writeText(shareLink(c)); toast(tr('Share link copied — send it to the client', 'تم نسخ الرابط — أرسله للعميل')); }}>{tr('Link', 'رابط')}</Button>
                    <Button size="sm" variant="outline" icon={<FileText size={14} />} onClick={() => setPlan(r)}>{tr('Plan', 'الخطة')}</Button>
                    <Button size="sm" variant="outline" icon={<CalendarPlus size={14} />} onClick={() => extend(r)}>+7</Button>
                    <Button size="sm" variant="ghost" className="!text-rose-600" icon={<Trash2 size={14} />} onClick={() => del(r)} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
      <Modal open={!!plan} onClose={() => setPlan(null)} title={tr('Client plan', 'خطة العميل')} size="lg">
        {plan && <PlanSummary demo={plan.demo} showCta={false} productsAdded={plan.productsAdded} />}
      </Modal>
    </div>
  );
}

const Info = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="text-sm">
    <div className="text-gray-500 text-xs">{k}</div>
    <div className="font-medium">{v}</div>
  </div>
);
