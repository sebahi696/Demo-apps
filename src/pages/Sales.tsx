import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Trash2, CalendarPlus, ExternalLink, FileText, Plus, Download, Lock } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { useI18n } from '../lib/i18n';
import { PRESETS } from '../lib/presets';
import { shareLink } from '../lib/share';
import { DAY, downloadCsv, fmtDate } from '../lib/utils';
import { PLATFORM } from '../platform.config';
import { Button, Card, Input, Modal, cx } from '../components/ui';
import { PlanSummary } from '../components/PlanSummary';
import { LangToggle } from '../components/LangToggle';
import type { Demo } from '../lib/types';

/**
 * Sales console: every demo created on this device, with the client's
 * answers and how much they used it. Share links let the salesperson
 * set up a demo with the client, then send it to the client's phone.
 */
export default function Sales() {
  const { tr, tl, lang } = useI18n();
  const nav = useNavigate();
  const demosMap = useStore((s) => s.demos);
  const update = useStore((s) => s.update);
  const removeDemo = useStore((s) => s.removeDemo);
  const [ok, setOk] = useState(() => sessionStorage.getItem('sales-ok') === '1');
  const [pin, setPin] = useState('');
  const [plan, setPlan] = useState<Demo | null>(null);
  const demos = Object.values(demosMap).sort((a, b) => b.config.createdAt - a.config.createdAt);

  if (!ok)
    return (
      <div className="min-h-full grid place-items-center bg-gray-950 p-6">
        <form className="w-full max-w-xs text-center" onSubmit={(e) => {
          e.preventDefault();
          if (pin === PLATFORM.salesPasscode) { sessionStorage.setItem('sales-ok', '1'); setOk(true); } else toast(tr('Wrong passcode', 'رمز خاطئ'), 'error');
        }}>
          <Lock className="mx-auto text-amber-400" size={32} />
          <h1 className="text-white text-xl font-bold mt-3">{tr('Sales console', 'لوحة المبيعات')}</h1>
          <Input type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} className="mt-5 text-center tracking-[.5em]" placeholder="••••" />
          <Button block variant="accent" className="mt-3">{tr('Enter', 'دخول')}</Button>
          <Link to="/" className="block text-white/50 text-sm mt-6">{tr('Back', 'رجوع')}</Link>
        </form>
      </div>
    );

  const score = (d: Demo) => Object.values(d.data.activity).reduce((s, n) => s + n, 0);
  const copy = async (d: Demo) => {
    await navigator.clipboard.writeText(shareLink(d.config));
    toast(tr('Share link copied — send it to the client', 'تم نسخ الرابط — أرسله للعميل'));
  };
  const exportLeads = () =>
    downloadCsv('leads.csv', [
      ['Business', 'Industry', 'Owner', 'Phone', 'Email', 'Country', 'City', 'Created', 'Expires', 'Activity', 'Modules', 'Answers'],
      ...demos.map((d) => [
        d.config.business.name.en, d.config.industry, d.config.lead.ownerName, d.config.lead.phone, d.config.lead.email, d.config.business.country, d.config.business.city,
        new Date(d.config.createdAt).toISOString().slice(0, 10), new Date(d.config.expiresAt).toISOString().slice(0, 10), score(d),
        Object.entries(d.config.modules).filter(([, v]) => v).map(([k]) => k).join(' '),
        Object.entries(d.config.lead.answers).map(([k, v]) => `${k}: ${v}`).join(' | '),
      ]),
    ]);

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => nav('/')} className="h-10 w-10 grid place-items-center rounded-full hover:bg-white/10"><ArrowLeft className="rtl:rotate-180" size={20} /></button>
          <div className="font-bold flex-1">{tr('Sales console', 'لوحة المبيعات')}</div>
          <LangToggle dark />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold">{tr('Demos & leads', 'التجارب والعملاء المحتملون')}</h1>
            <p className="text-gray-500 text-sm">{tr('Demos created on this device. Copy a share link to send a demo to a client’s phone.', 'التجارب المنشأة على هذا الجهاز. انسخ رابط المشاركة لإرسال التجربة إلى هاتف العميل.')}</p>
          </div>
          <Button variant="outline" icon={<Download size={16} />} onClick={exportLeads} disabled={!demos.length}>CSV</Button>
          <Button variant="dark" icon={<Plus size={16} />} onClick={() => nav('/start')}>{tr('New demo', 'تجربة جديدة')}</Button>
        </div>

        <div className="mt-6 grid gap-3">
          {demos.length === 0 && <Card className="p-10 text-center text-gray-500">{tr('No demos yet.', 'لا توجد تجارب بعد.')}</Card>}
          {demos.map((d) => {
            const expired = d.config.expiresAt < Date.now();
            const days = Math.ceil((d.config.expiresAt - Date.now()) / DAY);
            return (
              <Card key={d.config.id} className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-12 w-12 rounded-xl grid place-items-center text-2xl overflow-hidden" style={{ background: d.config.brand.primary }}>
                    {d.config.business.logo ? <img src={d.config.business.logo} className="h-full w-full object-cover" alt="" /> : d.config.business.logoEmoji}
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <div className="font-bold">{tl(d.config.business.name)}</div>
                    <div className="text-xs text-gray-500">{tl(PRESETS[d.config.industry].label)} · {d.config.lead.ownerName || '—'} · <span dir="ltr">{d.config.lead.phone}</span></div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500 text-xs">{tr('Created', 'أنشئ')}</div>
                    <div className="font-medium">{fmtDate(d.config.createdAt, lang)}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500 text-xs">{tr('Trial', 'التجربة')}</div>
                    <div className={cx('font-medium', expired ? 'text-rose-600' : days <= 3 ? 'text-amber-600' : 'text-emerald-700')}>
                      {expired ? tr('Expired', 'منتهية') : tr(`${days} days left`, `متبقٍ ${days} يوماً`)}
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500 text-xs">{tr('Activity', 'النشاط')}</div>
                    <div className="font-bold tabular-nums">{score(d)}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="dark" icon={<ExternalLink size={14} />} onClick={() => nav(`/d/${d.config.id}/app`)}>{tr('Open', 'فتح')}</Button>
                    <Button size="sm" variant="outline" icon={<Copy size={14} />} onClick={() => copy(d)}>{tr('Share link', 'رابط')}</Button>
                    <Button size="sm" variant="outline" icon={<FileText size={14} />} onClick={() => setPlan(d)}>{tr('Plan', 'الخطة')}</Button>
                    <Button size="sm" variant="outline" icon={<CalendarPlus size={14} />} onClick={() => {
                      update(d.config.id, (x) => void (x.config.expiresAt = Math.max(x.config.expiresAt, Date.now()) + 7 * DAY));
                      toast(tr('Extended by 7 days', 'تم التمديد 7 أيام'));
                    }}>+7</Button>
                    <Button size="sm" variant="ghost" className="!text-rose-600" icon={<Trash2 size={14} />} onClick={() => {
                      if (confirm(tr('Delete this demo?', 'حذف هذه التجربة؟'))) removeDemo(d.config.id);
                    }} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
      <Modal open={!!plan} onClose={() => setPlan(null)} title={tr('Client plan', 'خطة العميل')} size="lg">
        {plan && <PlanSummary demo={plan} showCta={false} />}
      </Modal>
    </div>
  );
}
