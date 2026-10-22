// S1 Today: queue + clickable KPI tiles, per role.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../state/store';
import { getQueue, ROLE_TILES, CATEGORY_LABEL } from '../../state/queues';
import { useStaffRole, ROLE_LABEL } from '../../components/shell';
import { KpiTile, QueueRow } from '../../components/domain';
import { EmptyState, Button } from '../../components/ui';
import { useQueueActions } from '../../components/actions';
import { STAFF, STAFF_BY_ROLE } from '../../data/seed';
import { fmtDate } from '../../lib/time';
import type { QueueCategory } from '../../types';

export default function Today() {
  const role = useStaffRole();
  const state = useDemo();
  const nav = useNavigate();
  const queue = useMemo(() => getQueue(state, role), [state, role]);
  const [filter, setFilter] = useState<QueueCategory | null>(null);
  const { handle, dialogs } = useQueueActions(role);
  const me = STAFF.find((s) => s.id === STAFF_BY_ROLE[role])!;
  const shown = filter ? queue.filter((q) => q.category === filter) : queue;
  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? id;
  const ownerName = (id: string) => {
    const m = state.members.find((x) => x.id === id);
    const sid = role === 'np' ? m?.npId : role === 'ma' ? m?.maId : role === 'coach' ? m?.coachId : m?.guideId;
    return STAFF.find((s) => s.id === sid)?.name.split(' ')[0] ?? '';
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted">{fmtDate(state.now)} · {ROLE_LABEL[role]}</p>
          <h1 className="font-display text-[32px] font-semibold leading-tight text-plum-700">Good morning, {me.name.split(' ')[0]}</h1>
        </div>
        <p className="text-sm text-muted">{queue.length} things need you today{queue.some((q) => q.priority === 0) ? ' · safety first' : ''}</p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ROLE_TILES[role].map((c) => (
          <KpiTile key={c} label={CATEGORY_LABEL[c]} count={queue.filter((q) => q.category === c).length} active={filter === c}
            tone={c === 'safety' ? 'danger' : undefined} onClick={() => setFilter(filter === c ? null : c)} />
        ))}
      </div>

      <section aria-label="Your list" className="overflow-hidden rounded-card border border-line bg-paper shadow-card">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold text-plum-900">{filter ? CATEGORY_LABEL[filter] : 'Everything waiting on you'} · most urgent first</h2>
          {filter && <Button size="sm" variant="ghost" onClick={() => setFilter(null)}>Show all</Button>}
        </div>
        {shown.length === 0 ? (
          <EmptyState title="All clear" body="Nothing is waiting on you here." />
        ) : (
          <ul>
            {shown.map((item) => (
              <QueueRow key={item.key} item={item} memberName={memberName(item.memberId)} ownerName={ownerName(item.memberId)}
                onAction={handle} onOpen={() => nav(`/staff/${role}/member/${item.memberId}`)} />
            ))}
          </ul>
        )}
      </section>
      {dialogs}
    </div>
  );
}
