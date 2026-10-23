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
import { actingAs, isSuperAdmin, queueActionKind, ROLE_SHORT } from '../../state/permissions';
import type { QueueCategory, QueueItem, StaffRole } from '../../types';

// Super admin Today: every queue, grouped by the role that owns it (SCHEMA §2).
const GROUPS: StaffRole[] = ['guide', 'ma', 'np', 'coach'];

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
  const ownerName = (id: string, as: StaffRole = role) => {
    const m = state.members.find((x) => x.id === id);
    const sid = as === 'np' ? m?.npId : as === 'ma' ? m?.maId : as === 'coach' ? m?.coachId : m?.guideId;
    return STAFF.find((s) => s.id === sid)?.name.split(' ')[0] ?? '';
  };
  const superAdmin = isSuperAdmin(role);
  const row = (item: QueueItem, owner: StaffRole = role) => {
    const kind = item.primary && queueActionKind(item.primary.action);
    return (
      <QueueRow key={item.key} item={item} memberName={memberName(item.memberId)} ownerName={ownerName(item.memberId, owner)}
        actingNote={kind ? actingAs(role, kind) : null}
        onAction={handle} onOpen={() => nav(`/staff/${role}/member/${item.memberId}`)} />
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted">{fmtDate(state.now)} · {ROLE_LABEL[role]}</p>
          <h1 className="font-display text-[32px] font-semibold leading-tight text-plum-700">Good morning, {me.name.split(' ')[0]}</h1>
        </div>
        <p className="text-sm text-muted">{queue.length} {superAdmin ? 'waiting across the clinic' : 'things need you today'}{queue.some((q) => q.priority === 0) ? ' · safety first' : ''}</p>
      </header>

      <div className={`mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 ${superAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-5'}`}>
        {ROLE_TILES[role].map((c) => (
          <KpiTile key={c} label={CATEGORY_LABEL[c]} count={queue.filter((q) => q.category === c).length} active={filter === c}
            tone={c === 'safety' ? 'danger' : undefined} onClick={() => setFilter(filter === c ? null : c)} />
        ))}
      </div>

      {superAdmin ? (
        <div className="space-y-5">
          {filter && <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => setFilter(null)}>Show all</Button></div>}
          {GROUPS.map((g) => {
            const list = shown.filter((q) => q.roles[0] === g);
            return (
              <section key={g} aria-labelledby={`group-${g}`} className="overflow-hidden rounded-card border border-line bg-paper shadow-card">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <h2 id={`group-${g}`} className="text-sm font-semibold text-plum-900">{ROLE_LABEL[g]} · {list.length} waiting{filter ? ` · ${CATEGORY_LABEL[filter]}` : ''}</h2>
                  {g !== 'coach' && <span className="text-xs text-muted">You can act as {ROLE_SHORT[g]}</span>}
                </div>
                {list.length === 0 ? <p className="px-4 py-3 text-sm text-muted">Nothing waiting here.</p> : <ul>{list.map((item) => row(item, g))}</ul>}
              </section>
            );
          })}
        </div>
      ) : (
      <section aria-label="Your list" className="overflow-hidden rounded-card border border-line bg-paper shadow-card">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold text-plum-900">{filter ? CATEGORY_LABEL[filter] : 'Everything waiting on you'} · most urgent first</h2>
          {filter && <Button size="sm" variant="ghost" onClick={() => setFilter(null)}>Show all</Button>}
        </div>
        {shown.length === 0 ? (
          <EmptyState title="All clear" body="Nothing is waiting on you here." />
        ) : (
          <ul>
            {shown.map((item) => row(item))}
          </ul>
        )}
      </section>
      )}
      {dialogs}
    </div>
  );
}
