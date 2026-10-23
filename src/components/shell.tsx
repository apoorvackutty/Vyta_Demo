import { clsx } from 'clsx';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutList, Users, RotateCcw, Columns2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Role, StaffRole } from '../types';
import { useDemo } from '../state/store';
import { SCENARIOS, type ScenarioId } from '../state/scenarios';
import { STAFF, STAFF_BY_ROLE } from '../data/seed';
import { fmtDateTime } from '../lib/time';
import { Avatar } from './ui';

export const ROLE_LABEL: Record<Role, string> = {
  member: 'Member (Testelle)', guide: 'Guide', ma: 'Medical Assistant', np: 'Nurse Practitioner', coach: 'Coach', admin: 'Admin',
};

export function DemoBar() {
  const { role, setRole, scenario, loadScenario, reset, split, setSplit, now } = useDemo();
  const nav = useNavigate();
  const changeRole = (r: Role) => {
    setRole(r);
    if (r !== 'member') nav(`/staff/${r}/today`);
  };
  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 bg-plum-900 px-4 py-2 text-[13px] text-cream-100">
      <span className="font-semibold tracking-wide">Vyta Care · Demo</span>
      <label className="flex items-center gap-2">
        <span className="opacity-80">View as</span>
        <select value={role} onChange={(e) => changeRole(e.target.value as Role)} className="rounded-md border border-cream-100/30 bg-plum-800 px-2 py-1 text-cream-100">
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="opacity-80">Jump to</span>
        <select value={scenario} onChange={(e) => loadScenario(e.target.value as ScenarioId)} className="rounded-md border border-cream-100/30 bg-plum-800 px-2 py-1 text-cream-100">
          {SCENARIOS.map((s) => <option key={s.id} value={s.id} disabled={!s.ready}>{s.label}{s.ready ? '' : ' (next build)'}</option>)}
        </select>
      </label>
      {role !== 'member' && (
        <button onClick={() => setSplit(!split)} aria-pressed={split} className={clsx('flex items-center gap-1.5 rounded-md px-2 py-1', split ? 'bg-terracotta-500 text-plum-900' : 'hover:bg-plum-800')}>
          <Columns2 size={14} /> Member side by side
        </button>
      )}
      <span className="ml-auto opacity-80">Clinic time: {fmtDateTime(now)}</span>
      <button onClick={() => { reset(); nav('/staff/guide/today'); }} className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-plum-800"><RotateCcw size={14} /> Reset demo</button>
      <span className="rounded bg-plum-800 px-2 py-0.5 text-[11px] opacity-80">Fictional data</span>
    </div>
  );
}

export function useStaffRole(): StaffRole {
  const { pathname } = useLocation();
  const role = pathname.split('/')[2];
  return (['guide', 'ma', 'np', 'coach', 'admin'].includes(role ?? '') ? role : 'guide') as StaffRole;
}

export function StaffShell({ children }: { children: ReactNode }) {
  const role = useStaffRole();
  const me = STAFF.find((s) => s.id === STAFF_BY_ROLE[role])!;
  const link = ({ isActive }: { isActive: boolean }) => clsx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm', isActive ? 'bg-paper/10 font-semibold text-paper' : 'text-cream-200 hover:bg-paper/5');
  return (
    <div className="flex min-h-[calc(100vh-44px)]">
      <aside className="hidden w-56 shrink-0 flex-col bg-plum-800 px-3 py-5 md:flex">
        <img src="/assets/logo-lotus-wordmark.png" alt="Vyta MenoClinic" className="mx-auto mb-6 h-16 w-auto invert" />
        <nav aria-label="Main" className="flex flex-col gap-1">
          <NavLink to={`/staff/${role}/today`} className={link}><LayoutList size={18} /> Today</NavLink>
          <NavLink to={`/staff/${role}/members`} className={link}><Users size={18} /> Members</NavLink>
        </nav>
        <div className="mt-auto flex items-center gap-2 rounded-lg bg-paper/5 p-2">
          <Avatar name={me.name} size={30} />
          <span className="text-xs leading-tight text-cream-100"><span className="block font-semibold">{me.name}</span>{me.title}</span>
        </div>
      </aside>
      <main className="min-w-0 flex-1 bg-cream-100">{children}</main>
    </div>
  );
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-[390px] shrink-0 rounded-[44px] border-[12px] border-plum-900 bg-cream-200 shadow-card">
      <div className="relative h-[820px] overflow-hidden rounded-[32px] bg-cream-200">{children}</div>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast, role } = useDemo();
  const { pathname } = useLocation();
  const overFooter = /\/pre-review\//.test(pathname); // clear the sticky gate footer
  return (
    <div aria-live="polite" className={clsx('pointer-events-none fixed z-50 flex flex-col gap-2', overFooter ? 'bottom-24' : 'bottom-4', role === 'member' ? 'right-4' : 'left-4 md:left-60')}>
      {toasts.slice(-3).map((t) => (
        <button key={t.id} onClick={() => dismissToast(t.id)} className="pointer-events-auto rounded-lg bg-plum-900 px-4 py-3 text-left text-sm text-cream-100 shadow-card">
          {t.text}
        </button>
      ))}
    </div>
  );
}
