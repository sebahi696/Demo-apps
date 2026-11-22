import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { importFromPayload } from '../lib/share';
import { useI18n } from '../lib/i18n';

export default function ImportDemo() {
  const { payload = '' } = useParams();
  const nav = useNavigate();
  const addDemo = useStore((s) => s.addDemo);
  const { tr } = useI18n();
  const [error, setError] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    try {
      const demo = importFromPayload(payload);
      addDemo(demo);
      nav(`/d/${demo.config.id}/app?welcome=1`, { replace: true });
    } catch {
      setError(true);
    }
  }, [payload, addDemo, nav]);

  return (
    <div className="min-h-full grid place-items-center p-6 text-center">
      {error ? (
        <div>
          <div className="text-5xl">🔗</div>
          <h1 className="text-xl font-bold mt-3">{tr('This link looks broken', 'يبدو أن هذا الرابط معطّل')}</h1>
          <p className="text-gray-500 mt-1">{tr('Ask for a new link, or create your own demo.', 'اطلب رابطاً جديداً، أو أنشئ تجربتك الخاصة.')}</p>
          <Link to="/start" className="inline-block mt-5 rounded-full bg-gray-900 text-white px-5 py-2.5 font-semibold">{tr('Create a demo', 'أنشئ تجربة')}</Link>
        </div>
      ) : (
        <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-gray-800 animate-spin" />
      )}
    </div>
  );
}
