import { clsx } from 'clsx';
import { Check, ShieldCheck } from 'lucide-react';
import type { Phase, Milestone, QueueItem, Band, Program } from '../types';
import { Button, Avatar, Chip, type Tone } from './ui';
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
// The member's journey runs through the programmes in this order; each programme runs through PHASES.
export const PROGRAM_ORDER: Program[] = ['discover', 'heal', 'optimize', 'thrive'];
export const programIndex = (p: Program) => PROGRAM_ORDER.indexOf(p);
export const phaseIndex = (p: Phase) => PHASES.findIndex((x) => x.id === p);
export function journeyLabel(program: Program, phase: Phase) {
  return `${PROGRAM_LABEL[program]} · ${phaseLabel(phase)}`;
}
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
            <span className={clsx('relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-semibold',
              done && 'border-plum-700 bg-plum-700 text-paper', current && 'border-terracotta-500 bg-paper text-terracotta-700', !done && !current && 'border-line bg-paper text-muted')}>
              {done ? <Check size={13} /> : i + 1}
            </span>
            <span className={clsx('mt-1.5 text-xs', current ? 'font-semibold text-plum-900' : 'text-muted')}>{p.label}</span>
            {current && <span className="mt-0.5 text-xs text-terracotta-700">{step}</span>}
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

// Small note beside an action the super admin takes for another role ("Acting as NP").
export function ActingNote({ text, className }: { text: string | null; className?: string }) {
  if (!text) return null;
  return <span className={clsx('inline-flex items-center gap-1 rounded-full bg-info-bg px-2 py-0.5 text-xs font-medium text-info-fg', className)}><ShieldCheck size={12} aria-hidden="true" /> {text}</span>;
}

export function QueueRow({ item, memberName, ownerName, onAction, onOpen, actingNote }: {
  item: QueueItem; memberName: string; ownerName: string; actingNote?: string | null;
  onAction: (a: NonNullable<QueueItem['primary']>['action']) => void; onOpen: () => void;
}) {
  const bar = item.priority === 0 || item.category === 'orders' ? 'bg-danger-fg' : item.priority === 1 ? 'bg-terracotta-500' : item.priority === 2 ? 'bg-watch-fg/60' : 'bg-line';
  return (
    <li className={clsx('group relative flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-paper px-4 py-3 last:border-b-0 hover:bg-cream-100 sm:flex-nowrap', item.priority === 0 && 'bg-danger-bg/50')}>
      <span className={clsx('absolute left-0 top-0 h-full w-1', bar)} aria-hidden="true" />
      <button onClick={onOpen} className="flex min-w-0 flex-1 basis-full items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500 sm:basis-0" aria-label={`Open ${memberName}`}>
        <Avatar name={memberName} size={34} />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-plum-900">{memberName}</span>
            <Chip tone={item.category === 'safety' || item.category === 'orders' ? 'danger' : 'neutral'}>{CATEGORY_LABEL[item.category]}</Chip>
          </span>
          <span className="block truncate text-sm text-plum-900">{item.label}</span>
          <span className="block truncate text-xs text-muted">{item.reason}</span>
        </span>
      </button>
      <span className="hidden w-24 text-xs text-muted md:block">{ownerName}</span>
      <span className="ml-[46px] text-xs tabular-nums text-muted sm:ml-0 sm:w-10 sm:text-right">{item.ageLabel}</span>
      <span className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-0">
        <ActingNote text={actingNote ?? null} />
        {item.secondary?.map((s) => <Button key={s.label} size="sm" variant="ghost" onClick={() => onAction(s.action)}>{s.label}</Button>)}
        {item.primary && <Button size="sm" onClick={() => onAction(item.primary!.action)}>{item.primary.label}</Button>}
      </span>
    </li>
  );
}

const BAND: Record<Band, { tone: Tone; label: string }> = {
  optimal: { tone: 'ok', label: 'Optimal' }, elite: { tone: 'ok', label: 'Elite' }, watch: { tone: 'watch', label: 'Watch' },
  needs_attention: { tone: 'attn', label: 'Needs attention' }, below_target: { tone: 'attn', label: 'Below target' },
  not_retested: { tone: 'neutral', label: 'Not retested' }, not_scored: { tone: 'neutral', label: 'Not scored' },
};
export function BandChip({ band }: { band: Band }) {
  return <Chip tone={BAND[band].tone}>{BAND[band].label}</Chip>;
}

// Programme ladder: Discover → Heal → Optimize → Thrive. Done / current / next are told apart by icon and words, not colour alone.
// `inline` renders plain spans (aria-hidden) for use inside a button that names the journey itself.
export function ProgramLadder({ program, compact, inline }: { program: Program; compact?: boolean; inline?: boolean }) {
  const idx = programIndex(program);
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1" role="img" aria-label={`Programme ${idx + 1} of 4: ${PROGRAM_LABEL[program]}`}>
        {PROGRAM_ORDER.map((p, i) => (
          <span key={p} className={clsx('h-1.5 w-5 rounded-full', i < idx ? 'bg-plum-700' : i === idx ? 'bg-terracotta-500' : 'bg-line')} />
        ))}
      </span>
    );
  }
  const List = inline ? 'span' : 'ol';
  const Item = inline ? 'span' : 'li';
  return (
    <List className="flex w-full items-center gap-1" aria-label={inline ? undefined : 'Programme journey'} aria-hidden={inline || undefined}>
      {PROGRAM_ORDER.map((p, i) => {
        const done = i < idx; const current = i === idx;
        return (
          <Item key={p} aria-current={current && !inline ? 'step' : undefined}
            className={clsx('flex flex-1 items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-xs',
              done && 'border-plum-700 bg-plum-700 text-paper', current && 'border-terracotta-500 bg-paper font-semibold text-plum-900 ring-2 ring-terracotta-500/30',
              !done && !current && 'border-line bg-paper text-muted')}>
            {done && <Check size={12} aria-hidden="true" />}
            {PROGRAM_LABEL[p]}
            {!inline && <span className="sr-only">{done ? ' (done)' : current ? ' (current programme)' : ' (later)'}</span>}
          </Item>
        );
      })}
    </List>
  );
}

// Both levels together: which programme she's in, then where she is inside it.
export function JourneyTracker({ program, phase, step }: { program: Program; phase: Phase; step: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium text-plum-900">Journey</span>
        <span className="text-muted">Programme {programIndex(program) + 1} of 4 · step {phaseIndex(phase) + 1} of {PHASES.length} in {PROGRAM_LABEL[program]}</span>
      </div>
      <ProgramLadder program={program} />
      <PhaseTracker phase={phase} step={step} />
    </div>
  );
}
