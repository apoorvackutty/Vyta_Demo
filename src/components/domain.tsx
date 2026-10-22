import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import type { Phase, Milestone, QueueItem } from '../types';
import { Button, Avatar, Chip } from './ui';
import { CATEGORY_LABEL } from '../state/queues';

export const PHASES: { id: Phase; label: string }[] = [
  { id: 'join', label: 'Join' },
  { id: 'intake_labs', label: 'Intake & labs' },
  { id: 'vyta_day', label: 'Your Vyta Day' },
  { id: 'first_30', label: 'First 30 days' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'renewal', label: 'Renewal' },
];
export const phaseLabel = (p: Phase) => PHASES.find((x) => x.id === p)?.label ?? p;
export const PROGRAM_LABEL = { discover: 'Discover', heal: 'Heal', optimize: 'Optimize', thrive: 'Thrive' } as const;
export const MENO_LABEL = { peri: 'Perimenopause', post: 'Postmenopause', not_applicable: 'Not applicable' } as const;

export function PhaseTracker({ phase, step }: { phase: Phase; step: string }) {
  const idx = PHASES.findIndex((p) => p.id === phase);
  return (
    <ol className="flex w-full items-start" aria-label="Journey">
      {PHASES.map((p, i) => {
        const done = i < idx; const current = i === idx;
        return (
          <li key={p.id} className="relative flex flex-1 flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
            {i > 0 && <span className={clsx('absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2', i <= idx ? 'bg-plum-700' : 'bg-line')} aria-hidden="true" />}
            <span className={clsx('relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] font-semibold',
              done && 'border-plum-700 bg-plum-700 text-paper', current && 'border-terracotta-500 bg-paper text-terracotta-700', !done && !current && 'border-line bg-paper text-muted')}>
              {done ? <Check size={13} /> : i + 1}
            </span>
            <span className={clsx('mt-1.5 text-xs', current ? 'font-semibold text-plum-900' : 'text-muted')}>{p.label}</span>
            {current && <span className="mt-0.5 text-[11px] text-terracotta-700">{step}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function MilestoneBar({ milestones }: { milestones: Milestone[] }) {
  const sel = milestones.filter((m) => m.selected);
  const onTrack = sel.filter((m) => (m.score ?? 0) >= m.target).length;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="font-medium text-plum-900">Milestones</span>
        <span className="text-muted">{onTrack} of {sel.length} on track · baseline</span>
      </div>
      <div className="flex gap-1">
        {sel.map((m) => (
          <span key={m.id} title={`${m.label}: ${m.score ?? '–'}/10, target ${m.target}`} className={clsx('h-2 flex-1 rounded-full', (m.score ?? 0) >= m.target ? 'bg-plum-700' : 'bg-cream-200')} />
        ))}
      </div>
    </div>
  );
}

export function KpiTile({ label, count, active, onClick, tone }: { label: string; count: number; active: boolean; onClick: () => void; tone?: 'danger' }) {
  return (
    <button
      onClick={onClick} aria-pressed={active}
      className={clsx('flex flex-col items-start rounded-card border px-4 py-3 text-left transition-all hover:border-plum-700',
        active ? 'border-plum-700 bg-plum-100' : 'border-line bg-paper', tone === 'danger' && count > 0 && !active && 'border-danger-fg/40 bg-danger-bg')}
    >
      <span className={clsx('font-sans text-2xl font-semibold tabular-nums', tone === 'danger' && count > 0 ? 'text-danger-fg' : 'text-plum-900')}>{count}</span>
      <span className="text-[13px] text-muted">{label}</span>
    </button>
  );
}

export function QueueRow({ item, memberName, ownerName, onAction, onOpen }: {
  item: QueueItem; memberName: string; ownerName: string;
  onAction: (a: NonNullable<QueueItem['primary']>['action']) => void; onOpen: () => void;
}) {
  const bar = item.priority === 0 ? 'bg-danger-fg' : item.priority === 1 ? 'bg-terracotta-500' : item.priority === 2 ? 'bg-watch-fg/60' : 'bg-line';
  return (
    <li className={clsx('group relative flex items-center gap-4 border-b border-line bg-paper px-4 py-3 last:border-b-0 hover:bg-cream-100', item.priority === 0 && 'bg-danger-bg/50')}>
      <span className={clsx('absolute left-0 top-0 h-full w-1', bar)} aria-hidden="true" />
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none" aria-label={`Open ${memberName}`}>
        <Avatar name={memberName} size={34} />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-plum-900">{memberName}</span>
            <Chip tone={item.category === 'safety' ? 'danger' : 'neutral'}>{CATEGORY_LABEL[item.category]}</Chip>
          </span>
          <span className="block truncate text-sm text-plum-900">{item.label}</span>
          <span className="block truncate text-xs text-muted">{item.reason}</span>
        </span>
      </button>
      <span className="hidden w-24 text-xs text-muted md:block">{ownerName}</span>
      <span className="w-10 text-right text-xs tabular-nums text-muted">{item.ageLabel}</span>
      <span className="flex shrink-0 gap-2">
        {item.secondary?.map((s) => <Button key={s.label} size="sm" variant="ghost" onClick={() => onAction(s.action)}>{s.label}</Button>)}
        {item.primary && <Button size="sm" onClick={() => onAction(item.primary!.action)}>{item.primary.label}</Button>}
      </span>
    </li>
  );
}
