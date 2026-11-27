import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CLIENT_MODE, CLIENT_PKG, clientDemo } from './lib/client';
import { useStore } from './lib/store';
import { applyDocLang } from './lib/i18n';
import { applyTheme, PLATFORM_THEME } from './lib/theme';
import { Toasts } from './components/ui';
import Landing from './pages/Landing';
import Wizard from './pages/Wizard';
import Sales from './pages/Sales';
import ImportDemo from './pages/ImportDemo';
import DemoLayout from './pages/DemoLayout';
import { startCloudSync } from './lib/cloud';

function PlatformTheme() {
  const lang = useStore((s) => s.lang);
  const loc = useLocation();
  useEffect(() => {
    applyDocLang(lang);
    if (!loc.pathname.startsWith('/d/')) applyTheme(PLATFORM_THEME, lang);
  }, [lang, loc.pathname]);
  return null;
}

export default function App() {
  const hydrated = useStore((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated) return;
    if (CLIENT_MODE) {
      // First launch on this device, or a newer package was deployed: load the client's menu.
      const st = useStore.getState();
      const id = CLIENT_PKG!.config.id;
      const cur = st.demos[id] as (typeof st.demos)[string] & { config: { pkgAt?: string } } | undefined;
      if (!cur) {
        const d = clientDemo(CLIENT_PKG!);
        (d.config as { pkgAt?: string }).pkgAt = CLIENT_PKG!.exportedAt;
        st.addDemo(d);
      } else if (cur.config.pkgAt !== CLIENT_PKG!.exportedAt) {
        const fresh = clientDemo(CLIENT_PKG!);
        st.update(id, (x) => {
          x.config = { ...fresh.config, pkgAt: CLIENT_PKG!.exportedAt } as typeof x.config;
          Object.assign(x.data, CLIENT_PKG!.catalog);
        });
      }
      return;
    }
    startCloudSync();
  }, [hydrated]);
  if (!hydrated)
    return (
      <div className="h-full grid place-items-center">
        <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-gray-800 animate-spin" />
      </div>
    );
  return (
    <HashRouter>
      <PlatformTheme />
      <Toasts />
      {CLIENT_MODE ? (
        <Routes>
          <Route path="/d/:id/*" element={<DemoLayout />} />
          {(['staff', 'rider', 'owner'] as const).map((r) => <Route key={r} path={`/${r}`} element={<Navigate to={`/d/${CLIENT_PKG!.config.id}/${r}`} replace />} />)}
          <Route path="*" element={<Navigate to={`/d/${CLIENT_PKG!.config.id}/app`} replace />} />
        </Routes>
      ) : (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/start" element={<Wizard />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/i/:payload" element={<ImportDemo />} />
        <Route path="/d/:id/*" element={<DemoLayout />} />
        <Route path="*" element={<Landing />} />
      </Routes>
      )}
    </HashRouter>
  );
}
