import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '../types';
import type { DemoData } from './ops';
import * as ops from './ops';
import { buildScenario, type ScenarioId } from './scenarios';

interface Toast { id: number; text: string; key?: string }

interface DemoStore extends DemoData {
  scenario: ScenarioId;
  role: Role;
  split: boolean;
  // Cosmetic sign-in (TRD §6: no real auth in the demo). Staff and member sessions are separate.
  staffSignedIn: boolean;
  memberSignedIn: boolean;
  signInStaff: (r: Role) => void;
  signInMember: () => void;
  signOut: (who: 'staff' | 'member') => void;
  toasts: Toast[];
  setRole: (r: Role) => void;
  setSplit: (v: boolean) => void;
  loadScenario: (id: ScenarioId) => void;
  reset: () => void;
  // `key` merges rapid actions of one kind (e.g. plan edits) into a single updating toast.
  run: (fn: (d: DemoData) => void, toast?: string, key?: string) => void;
  toast: (text: string, key?: string) => void;
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
      staffSignedIn: false,
      memberSignedIn: false,
      signInStaff: (role) => set({ role, staffSignedIn: true }),
      signInMember: () => set({ memberSignedIn: true }),
      signOut: (who) => set(who === 'staff' ? { staffSignedIn: false } : { memberSignedIn: false }),
      toasts: [],
      // The demo bar's role switcher is the presenter's backstage door, so it signs you in.
      setRole: (role) => set(role === 'member' ? { role } : { role, staffSignedIn: true }),
      setSplit: (split) => set({ split }),
      loadScenario: (id) => set({ ...buildScenario(id), scenario: id, toasts: [] }),
      reset: () => set({ ...buildScenario('day0'), scenario: 'day0', role: 'guide', split: false, toasts: [], staffSignedIn: false, memberSignedIn: false }),
      run: (fn, toast, key) => {
        const draft = pickData(get());
        fn(draft);
        set(draft);
        if (toast) get().toast(toast, key);
      },
      toast: (text, key) => {
        const id = ++toastSeq;
        set((s) => ({ toasts: [...s.toasts.filter((t) => !key || t.key !== key), { id, text, key }] }));
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
