// Shared bits of the member phone app: its tiny router and the screen header.
import { createContext, useContext } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft } from 'lucide-react';

export const MEMBER_ID = 'm-testelle';

// A tiny in-app router: React Router can't nest a second router inside the staff one.
export const NavCtx = createContext<{ path: string; go: (p: string) => void }>({ path: '/home', go: () => {} });
export function useNavigate() { return useContext(NavCtx).go; }

export function Top({ title, back }: { title: string; back?: string }) {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-line bg-cream-200/95 px-3 backdrop-blur">
      {back && <button aria-label="Back" onClick={() => nav(back)} className="flex h-11 w-11 items-center justify-center rounded-full text-plum-700"><ChevronLeft size={22} /></button>}
      <h1 className={clsx('font-display text-2xl font-semibold text-plum-700', !back && 'pl-2')}>{title}</h1>
    </header>
  );
}

