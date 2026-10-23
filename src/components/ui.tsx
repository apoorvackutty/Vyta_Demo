import { clsx } from 'clsx';
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...p}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-500 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-5 text-[15px]',
        variant === 'primary' && 'bg-plum-700 text-paper hover:bg-plum-800',
        variant === 'secondary' && 'border border-plum-700 bg-paper text-plum-700 hover:bg-plum-100',
        variant === 'ghost' && 'text-plum-700 hover:bg-plum-100',
        variant === 'danger' && 'border border-line bg-paper text-terracotta-700 hover:bg-attn-bg',
        className,
      )}
    />
  );
}

export function Card({ className, children, as: As = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'li' }) {
  return <As className={clsx('rounded-card border border-line bg-paper shadow-card', className)}>{children}</As>;
}

export type Tone = 'ok' | 'watch' | 'attn' | 'danger' | 'info' | 'neutral' | 'plum';
const TONE: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok-fg', watch: 'bg-watch-bg text-watch-fg', attn: 'bg-attn-bg text-attn-fg', danger: 'bg-danger-bg text-danger-fg',
  info: 'bg-info-bg text-info-fg', neutral: 'bg-neutral-bg text-neutral-fg', plum: 'bg-plum-100 text-plum-700',
};
export function Chip({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', TONE[tone], className)}>{children}</span>;
}

export function ProgressBar({ value, label, className }: { value: number; label?: string; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={className}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-cream-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progress'}>
        <div className="h-full rounded-full bg-terracotta-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  return (
    <span aria-hidden="true" className={clsx('inline-flex shrink-0 items-center justify-center rounded-full bg-plum-100 font-semibold text-plum-700', className)} style={{ width: size, height: size, fontSize: Math.max(12, size * 0.38) }}>
      {initials}
    </span>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-plum-900">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
export const inputCls = 'w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-plum-900 placeholder:text-muted/70 focus:border-plum-700 focus:outline-none focus:ring-2 focus:ring-terracotta-500/40';

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string; badge?: number }[]; value: T; onChange: (t: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={clsx('-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            value === t.id ? 'border-plum-700 text-plum-700' : 'border-transparent text-muted hover:text-plum-900')}
        >
          {t.label}
          {!!t.badge && <span className="rounded-full bg-terracotta-700 px-1.5 text-xs text-paper">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function Dialog({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    ref.current?.addEventListener('keydown', onKey);
    const node = ref.current;
    return () => { node?.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-plum-900/40 p-4" onMouseDown={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-card bg-paper shadow-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-plum-900">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-cream-100"><X size={18} /></button>
        </div>
        <div className="space-y-4 px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action, heading = 'p' }: { title: string; body?: string; action?: ReactNode; heading?: 'h1' | 'h2' | 'p' }) {
  const H = heading;
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <img src="/assets/botanical-clover.png" alt="" className="h-20 w-20 object-contain mix-blend-multiply" />
      <H className="font-display text-xl text-plum-700">{title}</H>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-plum-900">{children}</h2>
      {action}
    </div>
  );
}
