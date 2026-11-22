import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from './lib/store';
import { applyDocLang } from './lib/i18n';
import { applyTheme, PLATFORM_THEME } from './lib/theme';
import { Toasts } from './components/ui';
import Landing from './pages/Landing';
import Wizard from './pages/Wizard';
import Sales from './pages/Sales';
import ImportDemo from './pages/ImportDemo';
import DemoLayout from './pages/DemoLayout';

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
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/start" element={<Wizard />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/i/:payload" element={<ImportDemo />} />
        <Route path="/d/:id/*" element={<DemoLayout />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </HashRouter>
  );
}
