import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Globe, Download, CalendarDays, Receipt, Trash2, ChevronRight, Pencil, Megaphone, Package, Gift, Info, Wallet, Heart, Users, Cake, Copy } from 'lucide-react';
import { useDemo } from '../../lib/demo';
import { CLIENT_MODE } from '../../lib/client';
import { useStore, toast } from '../../lib/store';
import { me, tierOf, applyReferral, simulateFriendJoin, setBirthday } from '../../lib/ops';
import { timeAgo } from '../../lib/utils';
import { Button, Empty, Input, Modal, cx } from '../../components/ui';
import { Screen } from './CustomerApp';
import { InstallModal } from '../DemoLayout';

export function Account() {
  const { demo, cfg, data, tr, tl, terms, lang, update, m } = useDemo();
  const setLang = useStore((s) => s.setLang);
  const c = me(demo);
  const tier = tierOf(demo, c.lifetimePoints);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(c.name);
  const [install, setInstall] = useState(false);
  const [del, setDel] = useState(false);
  const [refIn, setRefIn] = useState('');
  const [bday, setBday] = useState(c.birthday ?? '');
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied');
  const orders = data.orders.filter((o) => o.customerId === c.id).length;
  const unread = data.notices.filter((n) => !n.read).length;

  const Row = ({ icon, label, to, onClick, right, danger }: { icon: JSX.Element; label: string; to?: string; onClick?: () => void; right?: React.ReactNode; danger?: boolean }) => {
    const inner = (
      <>
        <span className={cx('h-9 w-9 rounded-full grid place-items-center', danger ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-700')}>{icon}</span>
        <span className={cx('flex-1 font-medium', danger && 'text-rose-600')}>{label}</span>
        {right ?? <ChevronRight size={18} className="text-gray-300 rtl:rotate-180" />}
      </>
    );
    const cls = 'w-full flex items-center gap-3 px-3 py-3 text-start';
    return to ? <Link to={to} className={cls}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>;
  };

  return (
    <Screen title={tr('Account', 'حسابي')}>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-brand text-onbrand grid place-items-center text-2xl font-bold">{c.name[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-xl truncate">{c.name}</div>
          <div className="text-sm text-gray-500" dir="ltr" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>{c.phone}</div>
          {tier && <span className="inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: tier.color }}>{tl(tier.name)}</span>}
        </div>
        <button onClick={() => setEdit(true)} className="h-10 w-10 rounded-full bg-gray-100 grid place-items-center"><Pencil size={16} /></button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-5">
        {[[orders, tr('Orders', 'طلبات')], [c.points, tr('Points', 'نقاط')], [data.vouchers.filter((v) => v.customerId === c.id && v.status === 'active').length, tr('Vouchers', 'قسائم')]].map(([v, l]) => (
          <div key={String(l)} className="rounded-app bg-white border border-gray-100 p-3 text-center">
            <div className="text-xl font-extrabold tabular-nums">{v}</div>
            <div className="text-xs text-gray-500">{l}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-app bg-white border border-gray-100 divide-y divide-gray-100">
        <Row icon={<Bell size={17} />} label={tr('Notifications', 'الإشعارات')} to="../inbox" right={unread ? <span className="h-6 min-w-6 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold grid place-items-center">{unread}</span> : undefined} />
        {cfg.modules.wallet && <Row icon={<Wallet size={17} />} label={tr('Wallet & gift cards', 'المحفظة وبطاقات الهدايا')} to="../wallet" right={<span className="text-sm font-bold">{m(c.wallet)}</span>} />}
        {cfg.modules.ordering && <Row icon={<Receipt size={17} />} label={tr('My orders', 'طلباتي')} to="../orders" />}
        {cfg.modules.ordering && <Row icon={<Heart size={17} />} label={tr('Favorites', 'المفضلة')} to="../menu?fav=1" right={<span className="text-sm text-gray-500">{data.favorites.length}</span>} />}
        {cfg.modules.reservations && <Row icon={<CalendarDays size={17} />} label={tl(terms.reserve)} to="../reserve" />}
      </div>

      {cfg.modules.referrals && (
        <div className="mt-4 rounded-app-lg bg-brand text-onbrand p-4">
          <div className="flex items-center gap-2 font-bold"><Users size={18} /> {tr('Invite friends', 'ادعُ أصدقاءك')}</div>
          <p className="text-sm opacity-80 mt-1">{tr(`You both get ${cfg.loyalty.referralBonus} points when a friend joins with your code.`, `يحصل كل منكما على ${cfg.loyalty.referralBonus} نقطة عندما ينضم صديق برمزك.`)}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex-1 rounded-app bg-white/15 px-3 py-2.5 font-mono font-bold tracking-wider" dir="ltr">{c.referralCode}</span>
            <button className="h-11 w-11 rounded-app bg-white/20 grid place-items-center" onClick={async () => {
              const text = tr(`Join me on ${tl(cfg.business.name)}! Use my code ${c.referralCode} and get ${cfg.loyalty.referralBonus} points.`, `انضم إليّ في ${tl(cfg.business.name)}! استخدم رمزي ${c.referralCode} واحصل على ${cfg.loyalty.referralBonus} نقطة.`);
              if (navigator.share) navigator.share({ text }).catch(() => {});
              else { await navigator.clipboard?.writeText(text).catch(() => {}); toast(tr('Invite copied', 'تم نسخ الدعوة')); }
            }}><Copy size={18} /></button>
          </div>
          {!CLIENT_MODE && <button className="mt-2 text-xs underline opacity-80" onClick={() => { let n = ''; update((d) => void (n = simulateFriendJoin(d))); toast(tr(`${n} joined with your code — +${cfg.loyalty.referralBonus} points`, `انضم ${n} برمزك — +${cfg.loyalty.referralBonus} نقطة`)); }}>
            {tr('Demo: simulate a friend joining', 'تجربة: محاكاة انضمام صديق')}
          </button>}
          {!c.referredBy && (
            <form className="mt-3 flex gap-2" onSubmit={(e) => {
              e.preventDefault();
              let r: ReturnType<typeof applyReferral> = { ok: false };
              update((d) => void (r = applyReferral(d, refIn)));
              if (r.ok) { toast(tr(`+${cfg.loyalty.referralBonus} points!`, `+${cfg.loyalty.referralBonus} نقطة!`)); setRefIn(''); } else toast(tl(r.error), 'error');
            }}>
              <Input value={refIn} onChange={(e) => setRefIn(e.target.value.toUpperCase())} placeholder={tr('Friend’s code', 'رمز صديقك')} className="!bg-white !text-gray-900 font-mono" dir="ltr" />
              <Button type="submit" variant="accent">{tr('Apply', 'تطبيق')}</Button>
            </form>
          )}
        </div>
      )}

      {(cfg.modules.loyaltyPoints || cfg.modules.loyaltyStamps) && (
        <div className="mt-4 rounded-app bg-white border border-gray-100 p-4">
          <div className="flex items-center gap-2 font-semibold"><Cake size={18} /> {tr('Your birthday', 'عيد ميلادك')}</div>
          <p className="text-xs text-gray-500 mt-0.5">{tr(`Get “${tl(cfg.loyalty.birthdayReward)}” on your day.`, `احصل على "${tl(cfg.loyalty.birthdayReward)}" في يومك.`)}</p>
          <div className="flex gap-2 mt-2">
            <Input type="date" value={bday ? `2000-${bday}` : ''} onChange={(e) => setBday(e.target.value.slice(5))} />
            <Button variant="dark" onClick={() => {
              if (!bday) return;
              let got = false;
              update((d) => void (got = setBirthday(d, bday)));
              toast(got ? tr('Happy birthday! 🎂 Your gift is in Rewards', 'عيد ميلاد سعيد! 🎂 هديتك في المكافآت') : tr('Saved', 'تم الحفظ'));
            }}>{tr('Save', 'حفظ')}</Button>
          </div>
          {!CLIENT_MODE && <button className="mt-2 text-xs text-brand underline" onClick={() => {
            const now = new Date();
            const today = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            setBday(today);
            let got = false;
            update((d) => void (got = setBirthday(d, today)));
            toast(got ? tr('Happy birthday! 🎂 Your gift is in Rewards', 'عيد ميلاد سعيد! 🎂 هديتك في المكافآت') : tr('Birthday gift already claimed this year', 'تم استلام هدية هذا العام'), got ? 'ok' : 'info');
          }}>{tr('Demo: pretend today is my birthday', 'تجربة: اعتبر اليوم عيد ميلادي')}</button>}
        </div>
      )}

      <div className="mt-4 rounded-app bg-white border border-gray-100 divide-y divide-gray-100">
        <Row icon={<Globe size={17} />} label={tr('Language', 'اللغة')} onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} right={<span className="text-sm font-semibold text-brand">{lang === 'en' ? 'English' : 'العربية'}</span>} />
        <Row icon={<Megaphone size={17} />} label={tr('Push notifications', 'الإشعارات الفورية')} onClick={async () => {
          if (typeof Notification === 'undefined') return toast(tr('Install the app first to enable notifications on iPhone', 'ثبّت التطبيق أولاً لتفعيل الإشعارات على iPhone'), 'info');
          const p = await Notification.requestPermission();
          setPerm(p);
          if (p === 'granted') toast(tr('Notifications on', 'تم تفعيل الإشعارات'));
        }} right={<span className={cx('text-sm font-semibold', perm === 'granted' ? 'text-emerald-600' : 'text-gray-400')}>{perm === 'granted' ? tr('On', 'مفعّلة') : tr('Off', 'متوقفة')}</span>} />
        <Row icon={<Download size={17} />} label={tr('Install app on this phone', 'ثبّت التطبيق على هذا الهاتف')} onClick={() => setInstall(true)} />
      </div>

      <div className="mt-4 rounded-app bg-white border border-gray-100">
        <Row icon={<Trash2 size={17} />} label={tr('Delete my account', 'حذف حسابي')} onClick={() => setDel(true)} danger right={<span />} />
      </div>
      <p className="text-center text-xs text-gray-400 mt-6">{tl(cfg.business.name)} · v1.0 (demo)</p>

      <Modal open={edit} onClose={() => setEdit(false)} contained title={tr('Edit profile', 'تعديل الملف')}
        footer={<Button block onClick={() => { update((d) => void (me(d).name = name.trim() || me(d).name)); setEdit(false); }}>{tr('Save', 'حفظ')}</Button>}>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Modal>
      <InstallModal open={install} onClose={() => setInstall(false)} />
      <Modal open={del} onClose={() => setDel(false)} contained title={tr('Delete account?', 'حذف الحساب؟')}
        footer={<Button block variant="danger" onClick={() => {
          update((d) => {
            const x = me(d);
            Object.assign(x, { points: 0, lifetimePoints: 0, stamps: 0, joinedAt: Date.now() });
            d.data.vouchers = d.data.vouchers.filter((v) => v.customerId !== x.id);
            d.data.ledger = d.data.ledger.filter((l) => l.customerId !== x.id);
            d.data.orders = d.data.orders.filter((o) => o.customerId !== x.id);
            d.data.notices = [];
          });
          setDel(false);
          toast(tr('Account deleted — starting fresh', 'تم حذف الحساب — بداية جديدة'), 'info');
        }}>{tr('Delete', 'حذف')}</Button>}>
        <p className="text-gray-600">{tr('Your points, vouchers and order history will be removed. (App stores require apps to offer this.)', 'ستُحذف نقاطك وقسائمك وسجل طلباتك. (تشترط متاجر التطبيقات توفير هذا الخيار.)')}</p>
      </Modal>
    </Screen>
  );
}

export function Inbox() {
  const { data, tr, tl, lang, update } = useDemo();
  useEffect(() => {
    const t = setTimeout(() => update((d) => d.data.notices.forEach((n) => (n.read = true))), 1200);
    return () => clearTimeout(t);
  }, [update]);
  const icon = { order: <Package size={18} />, campaign: <Megaphone size={18} />, loyalty: <Gift size={18} />, reservation: <CalendarDays size={18} />, system: <Info size={18} /> };
  return (
    <Screen title={tr('Notifications', 'الإشعارات')} back>
      {!data.notices.length ? (
        <Empty icon="🔔" title={tr('No notifications yet', 'لا إشعارات بعد')} />
      ) : (
        <div className="space-y-2">
          {data.notices.map((n) => (
            <Link key={n.id} to={n.link ? `../${n.link}` : '#'} className={cx('flex gap-3 rounded-app border p-3', n.read ? 'bg-white border-gray-100' : 'bg-brand/5 border-brand/20')}>
              <span className="h-10 w-10 shrink-0 rounded-full bg-brand text-onbrand grid place-items-center">{icon[n.kind]}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{tl(n.title)}</div>
                <div className="text-sm text-gray-600">{tl(n.body)}</div>
                <div className="text-xs text-gray-400 mt-1">{timeAgo(n.at, lang)}</div>
              </div>
              {!n.read && <span className="h-2.5 w-2.5 rounded-full bg-brand mt-1.5" />}
            </Link>
          ))}
        </div>
      )}
    </Screen>
  );
}
