import { clsx } from 'clsx';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutList, Users, RotateCcw, Columns2, LogOut, Search, X, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Role, StaffRole } from '../types';
import { useDemo } from '../state/store';
import { SCENARIOS, type ScenarioId } from '../state/scenarios';
import { STAFF, STAFF_BY_ROLE } from '../data/seed';
import { fmtDateTime, fmtDate } from '../lib/time';
import { Avatar } from './ui';

export const ROLE_LABEL: Record<Role, string> = {
  member: 'Member (Testelle)', guide: 'Guide', ma: 'Medical Assistant', np: 'Nurse Practitioner', coach: 'Coach', admin: 'Admin',
};

export function DemoBar() {
  const { role, setRole, scenario, loadScenario, reset, split, setSplit, now } = useDemo();
  const nav = useNavigate();
  // On small screens the presenter controls fold behind one button, so the bar stays one slim row.
  const [open, setOpen] = useState(false);
  const changeRole = (r: Role) => {
    setRole(r);
    if (r !== 'member') nav(`/staff/${r}/today`);
  };
  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 bg-plum-900 px-4 py-2 text-[13px] text-cream-100">
      <span className="font-semibold tracking-wide">Vyta Care · Demo</span>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="demo-controls"
        className="flex min-h-[32px] items-center gap-1.5 rounded-md px-2 hover:bg-plum-800 lg:hidden"><SlidersHorizontal size={14} aria-hidden="true" /> Demo</button>
      <span className="order-2 ml-auto rounded bg-plum-800 px-2 py-0.5 text-xs opacity-80 lg:order-3 lg:ml-0">Fictional data</span>
      <div id="demo-controls" className={clsx('order-3 w-full flex-wrap items-center gap-x-4 gap-y-2 lg:order-2 lg:flex lg:w-auto lg:flex-1', open ? 'flex' : 'hidden')}>
      <label className="flex items-center gap-2">
        <span className="whitespace-nowrap opacity-80">View as</span>
        <select value={role} onChange={(e) => changeRole(e.target.value as Role)} className="rounded-md border border-cream-100/30 bg-plum-800 px-2 py-1 text-cream-100">
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </label>
      <label className="flex min-w-0 max-w-full items-center gap-2">
        <span className="whitespace-nowrap opacity-80">Jump to</span>
        <select value={scenario} onChange={(e) => loadScenario(e.target.value as ScenarioId)} className="min-w-0 flex-1 rounded-md border border-cream-100/30 bg-plum-800 px-2 py-1 text-cream-100">
          {SCENARIOS.map((s) => <option key={s.id} value={s.id} disabled={!s.ready}>{s.label}{s.ready ? '' : ' (next build)'}</option>)}
        </select>
      </label>
      {role === 'member' && (
        <a href="/member/m-testelle" target="_blank" rel="noreferrer" className="rounded-md px-2 py-1 underline-offset-2 hover:bg-plum-800 hover:underline">Open full-screen (for a phone) ↗</a>
      )}
      {role !== 'member' && (
        <button onClick={() => setSplit(!split)} aria-pressed={split} className={clsx('flex items-center gap-1.5 rounded-md px-2 py-1 max-sm:hidden', split ? 'bg-terracotta-500 text-plum-900' : 'hover:bg-plum-800')}>
          <Columns2 size={14} /> Member side by side
        </button>
      )}
      <span className="ml-auto opacity-80">Clinic time: {fmtDateTime(now)}</span>
      <button onClick={() => { reset(); nav('/staff/guide/today'); }} title="Back to Day 0 and the sign-in screen" className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-plum-800"><RotateCcw size={14} /> Reset demo</button>
      </div>
    </div>
  );
}

export function useStaffRole(): StaffRole {
  const { pathname } = useLocation();
  const role = pathname.split('/')[2];
  return (['guide', 'ma', 'np', 'coach', 'admin'].includes(role ?? '') ? role : 'guide') as StaffRole;
}

// Top-bar search (SCREENS §1): type a name, Enter or click opens her record.
function MemberSearch({ role }: { role: StaffRole }) {
  const { members } = useDemo();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const hits = q.trim() ? members.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : [];
  const go = (id: string) => { nav(`/staff/${role}/member/${id}`); setQ(''); setOpen(false); };
  return (
    <div className="relative w-full max-w-sm" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <label htmlFor="member-search" className="sr-only">Search members</label>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input id="member-search" type="search" value={q} placeholder="Search members" autoComplete="off"
        role="combobox" aria-expanded={open && !!q.trim()} aria-controls="member-search-list"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) go(hits[0].id); if (e.key === 'Escape') { setQ(''); setOpen(false); } }}
        className="h-9 w-full rounded-lg border border-line bg-cream-100 pl-9 pr-3 text-sm text-plum-900 placeholder:text-muted focus:border-plum-700 focus:outline-none focus:ring-2 focus:ring-terracotta-500/40" />
      {open && q.trim() && (
        <ul id="member-search-list" role="listbox" className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-line bg-paper shadow-card">
          {hits.length === 0
            ? <li className="px-3 py-2.5 text-sm text-muted">No member matches “{q.trim()}”. Check the spelling, or search by first name.</li>
            : hits.map((m) => (
              <li key={m.id} role="option" aria-selected="false">
                <button onClick={() => go(m.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-plum-100 focus:bg-plum-100 focus:outline-none">
                  <Avatar name={m.name} size={24} /><span className="flex-1 text-plum-900">{m.name}</span><span className="text-xs text-muted">{m.step}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

// Single-page apps don't announce new pages. Move focus to the new page's title and name the tab after it.
export function useAnnouncePage(key: string, root: () => HTMLElement | null, suffix = 'Vyta Care', setTitle = true) {
  const first = useRef(true);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const h = root()?.querySelector<HTMLElement>('h1');
      if (h && setTitle) document.title = `${h.textContent?.trim()} · ${suffix}`;
      if (first.current) { first.current = false; return; }
      if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    });
    return () => cancelAnimationFrame(raf);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function StaffShell({ children }: { children: ReactNode }) {
  const role = useStaffRole();
  const { pathname } = useLocation();
  // Path only: switching a record tab (?tab=) must keep focus on the tabs.
  useAnnouncePage(pathname, () => document.getElementById('main-content'));
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]); // a new page starts at the top
  const { now, signOut, toast, split } = useDemo();
  const me = STAFF.find((s) => s.id === STAFF_BY_ROLE[role])!;
  // With the phone beside it on a mid-size screen, the sidebar shrinks to icons to give the staff view room.
  const slim = split;
  const label = slim ? 'sr-only xl:not-sr-only' : '';
  const link = ({ isActive }: { isActive: boolean }) => clsx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm', isActive ? 'bg-paper/10 font-semibold text-paper' : 'text-cream-200 hover:bg-paper/5');
  const topLink = ({ isActive }: { isActive: boolean }) => clsx('flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-sm', isActive ? 'bg-plum-100 font-semibold text-plum-700' : 'text-plum-900 hover:bg-cream-100');
  const signOutNow = () => { signOut('staff'); toast(`Signed out. See you soon, ${me.name.split(' ')[0]}`); };
  return (
    <div className="flex min-h-[calc(100vh-44px)]">
      <aside className={clsx('hidden shrink-0 flex-col bg-plum-800 py-5 md:flex', slim ? 'w-16 px-2 xl:w-56 xl:px-3' : 'w-56 px-3')}>
        <img src="/assets/logo-lotus-wordmark.png" alt="Vyta MenoClinic" className={clsx('mx-auto mb-6 w-auto invert', slim ? 'h-9 xl:h-16' : 'h-16')} />
        <nav aria-label="Main" className="flex flex-col gap-1">
          <NavLink to={`/staff/${role}/today`} className={link}><LayoutList size={18} className="shrink-0" /> <span className={label}>Today</span></NavLink>
          <NavLink to={`/staff/${role}/members`} className={link}><Users size={18} className="shrink-0" /> <span className={label}>Members</span></NavLink>
        </nav>
        <div className="mt-auto rounded-lg bg-paper/5 p-2">
          <div className="flex items-center gap-2">
            <Avatar name={me.name} size={30} />
            <span className={clsx('text-xs leading-tight text-cream-100', label)}><span className="block font-semibold">{me.name}</span>{me.title}</span>
          </div>
          <button onClick={signOutNow} className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-cream-200 hover:bg-paper/10"><LogOut size={14} className="shrink-0" /> <span className={label}>Sign out</span></button>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 bg-cream-100 focus:outline-none">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-paper px-4 py-2 md:flex-nowrap md:px-6">
          {/* Below 768 px the sidebar is hidden, so its links and Sign out move up here. */}
          <nav aria-label="Main" className="flex gap-1 md:hidden">
            <NavLink to={`/staff/${role}/today`} className={topLink}><LayoutList size={16} aria-hidden="true" /> Today</NavLink>
            <NavLink to={`/staff/${role}/members`} className={topLink}><Users size={16} aria-hidden="true" /> Members</NavLink>
          </nav>
          <button onClick={signOutNow} className="ml-auto flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-sm text-plum-700 hover:bg-plum-100 md:hidden"><LogOut size={16} aria-hidden="true" /> Sign out</button>
          <div className="w-full md:w-auto md:max-w-sm md:flex-1"><MemberSearch role={role} /></div>
          <span className="ml-auto hidden whitespace-nowrap text-sm text-muted sm:inline">Today · {fmtDate(now)}</span>
        </div>
        {children}
      </main>
    </div>
  );
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    // Under 640 px the screen already is a phone, so the mock-up frame drops away and the app fills it.
    <div className="mx-auto w-full shrink-0 bg-cream-200 sm:w-[390px] sm:rounded-[44px] sm:border-[12px] sm:border-plum-900 sm:shadow-card">
      <div className="relative h-[calc(100dvh-48px)] overflow-clip bg-cream-200 sm:h-[820px] sm:rounded-[32px]">{children}</div>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast, holdToast, releaseToast, role } = useDemo();
  const { pathname } = useLocation();
  const fullPhone = pathname.startsWith('/member');
  const overFooter = /\/pre-review\//.test(pathname); // clear the sticky gate footer
  return (
    <div aria-live="polite" className={clsx('pointer-events-none fixed z-50 flex flex-col gap-2',
      fullPhone ? 'left-1/2 top-4 w-[calc(100%-2rem)] max-w-[398px] -translate-x-1/2' : overFooter ? 'bottom-24' : 'bottom-4',
      !fullPhone && (role === 'member' ? 'right-4' : 'left-4 md:left-60'))}>
      {toasts.slice(-3).map((t) => (
        <div key={t.id} onMouseEnter={() => holdToast(t.id)} onMouseLeave={() => releaseToast(t.id)} onFocus={() => holdToast(t.id)} onBlur={() => releaseToast(t.id)}
          className="pointer-events-auto flex items-center gap-2 rounded-lg bg-plum-900 py-1.5 pl-4 pr-1.5 text-sm text-cream-100 shadow-card">
          <span className="flex-1 py-1.5">{t.text}</span>
          {t.undo && <button onClick={() => { const u = t.undo!; dismissToast(t.id); u(); }} className="min-h-[36px] rounded-md px-3 font-semibold underline underline-offset-2 hover:bg-plum-800">Undo</button>}
          <button aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="flex h-9 w-9 items-center justify-center rounded-md text-cream-200 hover:bg-plum-800"><X size={16} /></button>
        </div>
      ))}
    </div>
  );
}
