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

interface Saved { lang?: Lang; simulate?: boolean; demos?: Record<string, Demo>; gone?: string[] }

/** Per demo, keep whichever copy was changed last; deleted demos stay deleted. */
function mergeDemos(mine: Record<string, Demo> = {}, theirs: Record<string, Demo> = {}, gone: string[] = []) {
  const out: Record<string, Demo> = {};
  for (const id of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
    if (gone.includes(id)) continue;
    const a = mine[id], b = theirs[id];
    if (!a || !b) {
      out[id] = (a ?? b)!;
      continue;
    }
    // Settings and data merge separately: the owner restyling the app in one screen and an
    // order moving in another are both kept.
    const cfg = (b.rev ?? 0) > (a.rev ?? 0) ? b : a;
    const dat = (b.drev ?? 0) > (a.drev ?? 0) ? b : a;
    out[id] = cfg === dat ? cfg : { ...cfg, config: cfg.config, rev: cfg.rev, data: dat.data, drev: dat.drev };
  }
  return out;
}

// What this screen last read from or wrote to storage. Writes that would not change
// anything (toasts, re-reads, migrations that change nothing) are skipped, and a write
// first merges in anything another screen saved meanwhile, so nothing is overwritten.
let last = '';
let pulling = false;
const idbStorage: StateStorage = {
  getItem: async (name) => {
    const v = (await idbGet<string>(name)) ?? null;
    if (v) last = v;
    return v;
  },
  setItem: async (name, value) => {
    if (value === last) return;
    const cur = await idbGet<string>(name);
    let out = value;
    let pulled = false;
    if (cur && cur !== last) {
      try {
        const a = JSON.parse(value) as { state: Saved };
        const b = JSON.parse(cur) as { state: Saved };
        const gone = [...new Set([...(a.state.gone ?? []), ...(b.state.gone ?? [])])];
        const demos = mergeDemos(a.state.demos, b.state.demos, gone);
        pulled = Object.keys(demos).some((id) => demos[id] !== a.state.demos?.[id]);
        out = JSON.stringify({ ...a, state: { ...a.state, gone, demos } });
      } catch {
        /* unreadable old value: ours replaces it */
      }
    }
    last = out;
    await idbSet(name, out);
    channel?.postMessage({ from: TAB });
    if (pulled) void pullRemote();
  },
  removeItem: async (name) => idbDel(name),
};

async function pullRemote() {
  if (pulling) return;
  pulling = true;
  try {
    await useStore.persist.rehydrate();
  } finally {
    pulling = false;
  }
}

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
  gone: string[];
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
    immer((set, get) => ({
      hydrated: false,
      lang: 'en' as Lang,
      simulate: false,
      demos: {},
      gone: [],
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
      addDemo: (d) => set((s) => void (s.demos[d.config.id] = { ...d, rev: Date.now(), drev: Date.now() })),
      removeDemo: (id) =>
        set((s) => {
          delete s.demos[id];
          if (!s.gone.includes(id)) s.gone.push(id);
        }),
      update: (id, fn) => {
        const before = get().demos[id];
        if (!before) return;
        set((s) => {
          const d = s.demos[id];
          if (d) fn(d as Demo);
        });
        const after = get().demos[id];
        if (!after || after === before) return;
        set((s) => {
          const d = s.demos[id];
          if (!d) return;
          if (after.config !== before.config) d.rev = Math.max(Date.now(), (before.rev ?? 0) + 1);
          if (after.data !== before.data) d.drev = Math.max(Date.now(), (before.drev ?? 0) + 1);
        });
      },
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
      partialize: (s) => ({ lang: s.lang, simulate: s.simulate, demos: s.demos, gone: s.gone }) as unknown as State,
      // Re-reading never throws away a newer change made on this screen.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Saved;
        const gone = [...new Set([...(current.gone ?? []), ...(p.gone ?? [])])];
        return { ...current, lang: p.lang ?? current.lang, simulate: p.simulate ?? current.simulate, gone, demos: mergeDemos(current.demos, p.demos, gone) };
      },
      onRehydrateStorage: () => (state) => {
        state?.migrateAll();
        state?.setHydrated();
      },
    },
  ),
);

channel?.addEventListener('message', (e) => {
  if (e.data?.from === TAB) return;
  void pullRemote();
});

export const toast = (text: string, tone?: 'ok' | 'info' | 'error') => useStore.getState().toast(text, tone);
(window as unknown as { __ds?: unknown }).__ds = useStore;
