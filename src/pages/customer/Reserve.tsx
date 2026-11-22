import { useMemo, useState } from 'react';
import { CalendarCheck, Users, Clock } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { toast } from '../../lib/store';
import { createReservation, me, setReservationStatus, slotsFor } from '../../lib/ops';
import { DAY, fmtDate, ymd } from '../../lib/utils';
import { Button, Field, Input, Stepper, cx, Badge } from '../../components/ui';
import { Screen } from './CustomerApp';

const resTone: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', confirmed: 'bg-emerald-100 text-emerald-800', seated: 'bg-sky-100 text-sky-800',
  completed: 'bg-gray-100 text-gray-600', cancelled: 'bg-rose-100 text-rose-700', noShow: 'bg-rose-100 text-rose-700',
};
export const resLabel = (s: string, tr: (a: string, b: string) => string) =>
  ({
    pending: tr('Pending', 'قيد الانتظار'), confirmed: tr('Confirmed', 'مؤكد'), seated: tr('Arrived', 'وصل'),
    completed: tr('Completed', 'مكتمل'), cancelled: tr('Cancelled', 'ملغى'), noShow: tr('No-show', 'لم يحضر'),
  })[s] ?? s;
export { resTone };

export default function Reserve() {
  const { demo, cfg, data, tr, tl, terms, lang, update } = useDemo();
  const c = me(demo);
  const days = useMemo(() => Array.from({ length: cfg.reservations.daysAhead }, (_, i) => ymd(new Date(Date.now() + i * DAY))), [cfg.reservations.daysAhead]);
  const [date, setDate] = useState(days[0]);
  const [party, setParty] = useState(2);
  const [time, setTime] = useState('');
  const [name, setName] = useState(c.name);
  const [phone, setPhone] = useState(c.phone);
  const [note, setNote] = useState('');
  const slots = slotsFor(demo, date);
  const mine = data.reservations.filter((r) => r.customerId === data.meId).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const book = () => {
    if (!time) return toast(tr('Pick a time', 'اختر وقتاً'), 'error');
    let res = { ok: false, error: { en: '', ar: '' } } as ReturnType<typeof createReservation>;
    update((d) => void (res = createReservation(d, { date, time, party, name, phone, note: note || undefined })));
    if (res.ok) {
      toast(tr('Request sent! The store will confirm shortly.', 'تم إرسال الطلب! سيؤكد المتجر قريباً.'));
      setTime('');
      setNote('');
    } else toast(tl(res.error), 'error');
  };

  return (
    <Screen title={tl(terms.reserve)} back>
      {mine.filter((r) => !['cancelled', 'completed', 'noShow'].includes(r.status)).length > 0 && (
        <div className="mb-5 space-y-2">
          <div className="font-bold">{tr('Your bookings', 'حجوزاتك')}</div>
          {mine.filter((r) => !['cancelled', 'completed', 'noShow'].includes(r.status)).map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-app bg-white border border-gray-100 p-3">
              <span className="h-11 w-11 rounded-full bg-brand/10 text-brand grid place-items-center"><CalendarCheck size={20} /></span>
              <div className="flex-1">
                <div className="font-semibold">{fmtDate(r.date, lang, { weekday: 'short', day: 'numeric', month: 'short' })} · <span dir="ltr">{r.time}</span></div>
                <div className="text-xs text-gray-500">{r.party} {tl(terms.party).toLowerCase()}</div>
              </div>
              <Badge className={resTone[r.status]}>{resLabel(r.status, tr)}</Badge>
              <button className="text-xs text-rose-600 font-semibold" onClick={() => update((d) => setReservationStatus(d, r.id, 'cancelled'))}>{tr('Cancel', 'إلغاء')}</button>
            </div>
          ))}
        </div>
      )}

      <div className="font-bold mb-2">{tr('Date', 'التاريخ')}</div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {days.map((d, i) => (
          <button key={d} onClick={() => { setDate(d); setTime(''); }}
            className={cx('shrink-0 w-16 rounded-app border-2 py-2 text-center', date === d ? 'border-brand bg-brand text-onbrand' : 'border-gray-200 bg-white')}>
            <div className="text-[11px] font-semibold opacity-80">{i === 0 ? tr('Today', 'اليوم') : fmtDate(d, lang, { weekday: 'short' })}</div>
            <div className="text-xl font-extrabold">{new Date(d + 'T00:00').getDate()}</div>
            <div className="text-[11px] opacity-70">{fmtDate(d, lang, { month: 'short' })}</div>
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-app bg-white border border-gray-100 p-3">
        <span className="flex items-center gap-2 font-semibold"><Users size={18} /> {tl(terms.party)}</span>
        <Stepper value={party} onChange={setParty} min={1} max={cfg.reservations.maxParty} />
      </div>

      <div className="font-bold mt-5 mb-2 flex items-center gap-2"><Clock size={17} /> {tr('Time', 'الوقت')}</div>
      <div className="grid grid-cols-4 gap-2">
        {slots.map((s) => {
          const off = s.left <= 0 || s.past;
          return (
            <button key={s.time} disabled={off} onClick={() => setTime(s.time)} dir="ltr"
              className={cx('rounded-app border py-2.5 text-sm font-semibold transition', time === s.time ? 'border-brand bg-brand text-onbrand' : off ? 'border-gray-100 text-gray-300 line-through bg-gray-50' : 'border-gray-200 bg-white')}>
              {s.time}
            </button>
          );
        })}
      </div>
      {slots.every((s) => s.left <= 0 || s.past) && <div className="text-sm text-gray-500 mt-2">{tr('No times left on this day.', 'لا توجد أوقات متاحة في هذا اليوم.')}</div>}

      <div className="mt-5 space-y-3">
        <Field label={tr('Name', 'الاسم')}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={tr('Phone', 'الهاتف')}><Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label={tr('Note (optional)', 'ملاحظة (اختياري)')}><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr('Birthday, high chair, window seat…', 'عيد ميلاد، كرسي أطفال، بجانب النافذة…')} /></Field>
      </div>
      <Button block size="lg" className="mt-5" onClick={book} disabled={!time}>
        {time ? tr(`${tl(terms.reserveCta)} · ${fmtDate(date, 'en', { day: 'numeric', month: 'short' })} ${time}`, `${tl(terms.reserveCta)} · ${time}`) : tr('Choose a time', 'اختر وقتاً')}
      </Button>
    </Screen>
  );
}
