import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { Demo, Lang } from './types';
import { migrateConfig, migrateData } from './seed';

// ───────────────────────────────────────────────────────────────
// Storage: IndexedDB (room for photos, survives reloads).
// Cross-tab sync: after a write, other open tabs re-read the store,
// so the Owner panel in one tab and the Customer app in another
// update live.
// ───────────────────────────────────────────────────────────────

const TAB = Math.random().toString(36).slice(2);
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('demo-studio') : null;
let applyingRemote = false;

const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet<string>(name)) ?? null,
  setItem: async (name, value) => {
    await idbSet(name, value);
    if (!applyingRemote) channel?.postMessage({ from: TAB });
  },
  removeItem: async (name) => idbDel(name),
};

interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'info' | 'error';
}

interface State {
  hydrated: boolean;
  lang: Lang;
  simulate: boolean;
  demos: Record<string, Demo>;
  toasts: Toast[];
  setHydrated: () => void;
  migrateAll: () => void;
  setLang: (l: Lang) => void;
  setSimulate: (v: boolean) => void;
  addDemo: (d: Demo) => void;
  removeDemo: (id: string) => void;
  update: (id: string, fn: (d: Demo) => void) => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
}

export const useStore = create<State>()(
  persist(
    immer((set) => ({
      hydrated: false,
      lang: 'en' as Lang,
      simulate: false,
      demos: {},
      toasts: [],
      setHydrated: () => set((s) => void (s.hydrated = true)),
      migrateAll: () =>
        set((s) => {
          for (const d of Object.values(s.demos)) {
            migrateConfig(d.config);
            migrateData(d.data, d.config);
          }
        }),
      setLang: (l) => set((s) => void (s.lang = l)),
      setSimulate: (v) => set((s) => void (s.simulate = v)),
      addDemo: (d) => set((s) => void (s.demos[d.config.id] = d)),
      removeDemo: (id) => set((s) => void delete s.demos[id]),
      update: (id, fn) =>
        set((s) => {
          const d = s.demos[id];
          if (d) fn(d as Demo);
        }),
      toast: (text, tone = 'ok') => {
        const id = Date.now() + Math.random();
        set((s) => void s.toasts.push({ id, text, tone }));
        setTimeout(() => set((s) => void (s.toasts = s.toasts.filter((t) => t.id !== id))), 3200);
      },
      dismiss: (id) => set((s) => void (s.toasts = s.toasts.filter((t) => t.id !== id))),
    })),
    {
      name: 'demo-studio-v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ lang: s.lang, simulate: s.simulate, demos: s.demos }) as unknown as State,
      onRehydrateStorage: () => (state) => {
        state?.migrateAll();
        state?.setHydrated();
      },
    },
  ),
);

channel?.addEventListener('message', async (e) => {
  if (e.data?.from === TAB) return;
  applyingRemote = true;
  try {
    await useStore.persist.rehydrate();
  } finally {
    applyingRemote = false;
  }
});

export const toast = (text: string, tone?: 'ok' | 'info' | 'error') => useStore.getState().toast(text, tone);
(window as unknown as { __ds?: unknown }).__ds = useStore;
