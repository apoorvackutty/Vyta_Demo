import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '../types';
import type { DemoData } from './ops';
import * as ops from './ops';
import { buildScenario, type ScenarioId } from './scenarios';

interface Toast { id: number; text: string; key?: string; undo?: () => void }
// Who to credit in the timeline when an action is undone.
export interface UndoFor { memberId: string; by: string }

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
  // `undo` makes the toast offer Undo (BRAND_UI: "Undo where safe"). Never pass it for gates, sends or signatures.
  run: (fn: (d: DemoData) => void, toast?: string, key?: string, undo?: UndoFor) => void;
  toast: (text: string, key?: string, undo?: () => void) => void;
  holdToast: (id: number) => void;
  releaseToast: (id: number) => void;
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
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const TOAST_MS = 4000;
const UNDO_TOAST_MS = 7000;

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
      run: (fn, toast, key, undo) => {
        const before = undo ? pickData(get()) : null;
        const draft = pickData(get());
        fn(draft);
        set(draft);
        if (!toast) return;
        get().toast(toast, key, before && undo ? () => {
          // Restore the data but keep the timeline as it is: the audit trail shows it was done and then undone.
          set({ ...before, timeline: get().timeline, seq: get().seq });
          get().run((d) => ops.log(d, undo.memberId, undo.by, 'undo', `Undone: ${toast}`), 'Undone');
        } : undefined);
      },
      toast: (text, key, undo) => {
        const id = ++toastSeq;
        set((s) => {
          const replaced = s.toasts.filter((t) => key && t.key === key);
          replaced.forEach((t) => { clearTimeout(timers.get(t.id)); timers.delete(t.id); });
          return { toasts: [...s.toasts.filter((t) => !replaced.includes(t)), { id, text, key, undo }] };
        });
        get().releaseToast(id);
      },
      // Toasts pause while hovered or focused, so slower readers and keyboard users can act on them.
      holdToast: (id) => { clearTimeout(timers.get(id)); timers.delete(id); },
      releaseToast: (id) => {
        const t = get().toasts.find((x) => x.id === id);
        if (!t) return;
        clearTimeout(timers.get(id));
        timers.set(id, setTimeout(() => get().dismissToast(id), t.undo ? UNDO_TOAST_MS : TOAST_MS));
      },
      dismissToast: (id) => { clearTimeout(timers.get(id)); timers.delete(id); set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })); },
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
