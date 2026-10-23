import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '../types';
import type { DemoData } from './ops';
import * as ops from './ops';
import { buildScenario, type ScenarioId } from './scenarios';

interface Toast { id: number; text: string }

interface DemoStore extends DemoData {
  scenario: ScenarioId;
  role: Role;
  split: boolean;
  toasts: Toast[];
  setRole: (r: Role) => void;
  setSplit: (v: boolean) => void;
  loadScenario: (id: ScenarioId) => void;
  reset: () => void;
  run: (fn: (d: DemoData) => void, toast?: string) => void;
  toast: (text: string) => void;
  dismissToast: (id: number) => void;
  markNoticesRead: (memberId: string) => void;
}

const DATA_KEYS: (keyof DemoData)[] = ['now', 'members', 'assignments', 'visits', 'flags', 'followUps', 'timeline', 'notices', 'intake', 'intakeDone', 'results', 'reports', 'approvals', 'seq'];
const pickData = (s: DemoData): DemoData => {
  const out = {} as Record<string, unknown>;
  for (const k of DATA_KEYS) out[k] = s[k];
  return structuredClone(out) as unknown as DemoData;
};
let toastSeq = 0;

export const useDemo = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...buildScenario('day0'),
      scenario: 'day0',
      role: 'guide',
      split: false,
      toasts: [],
      setRole: (role) => set({ role }),
      setSplit: (split) => set({ split }),
      loadScenario: (id) => set({ ...buildScenario(id), scenario: id, toasts: [] }),
      reset: () => set({ ...buildScenario('day0'), scenario: 'day0', role: 'guide', split: false, toasts: [] }),
      run: (fn, toast) => {
        const draft = pickData(get());
        fn(draft);
        set(draft);
        if (toast) get().toast(toast);
      },
      toast: (text) => {
        const id = ++toastSeq;
        set((s) => ({ toasts: [...s.toasts, { id, text }] }));
        setTimeout(() => get().dismissToast(id), 3200);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      markNoticesRead: (memberId) => get().run((d) => { d.notices.forEach((n) => { if (n.memberId === memberId) n.read = true; }); }),
    }),
    {
      name: 'vyta-demo-v2',
      partialize: (s) => {
        const { toasts, ...rest } = s;
        return rest;
      },
    },
  ),
);

export { ops };
