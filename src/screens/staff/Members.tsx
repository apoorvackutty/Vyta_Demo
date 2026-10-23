// S2 Members: list or board by program.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useDemo } from '../../state/store';
import { useStaffRole } from '../../components/shell';
import { Avatar, Button, Chip, EmptyState } from '../../components/ui';
import { PROGRAM_LABEL, MENO_LABEL, PHASES, PROGRAM_ORDER, ProgramLadder, phaseIndex, phaseLabel } from '../../components/domain';
import { STAFF } from '../../data/seed';
import { ageYears, fmtDate } from '../../lib/time';
import type { MenoStatus, Phase, Program } from '../../types';

export default function Members() {
  const role = useStaffRole();
  const { members, now, flags } = useDemo();
  const nav = useNavigate();
  const [view, setView] = useState<'list' | 'board'>('list');
  const open = (id: string) => nav(`/staff/${role}/member/${id}`);
  const name = (id: string) => STAFF.find((s) => s.id === id)?.name.split(' ')[0];
  const hasFlag = (id: string) => flags.some((f) => f.memberId === id && f.status !== 'closed');
  // Filters (SCREENS S2): phase, owner, peri/post, flags.
  const [program, setProgram] = useState<Program | ''>('');
  const [phase, setPhase] = useState<Phase | ''>('');
  const [owner, setOwner] = useState('');
  const [meno, setMeno] = useState<MenoStatus | ''>('');
  const [flagged, setFlagged] = useState(false);
  const filtering = !!(program || phase || owner || meno || flagged);
  const clear = () => { setProgram(''); setPhase(''); setOwner(''); setMeno(''); setFlagged(false); };
  const shown = members.filter((m) => (!program || m.program === program) && (!phase || m.phase === phase) && (!owner || [m.guideId, m.npId, m.coachId, m.maId].includes(owner))
    && (!meno || m.menoStatus === meno) && (!flagged || hasFlag(m.id)));
  const sel = 'h-9 rounded-lg border border-line bg-paper px-2 text-sm text-plum-900 focus:border-plum-700 focus:outline-none focus:ring-2 focus:ring-terracotta-500/40';

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-5 flex items-end justify-between">
        <h1 className="font-display text-[32px] font-semibold text-plum-700">Members</h1>
        <div role="group" aria-label="View" className="flex rounded-lg border border-line bg-paper p-1">
          {(['list', 'board'] as const).map((v) => (
            <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={clsx('rounded-md px-3 py-1.5 text-sm capitalize', view === v ? 'bg-plum-700 text-paper' : 'text-muted')}>{v}</button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
        <label className="sr-only" htmlFor="f-program">Programme</label>
        <select id="f-program" className={sel} value={program} onChange={(e) => setProgram(e.target.value as Program | '')}>
          <option value="">All programmes</option>{PROGRAM_ORDER.map((p) => <option key={p} value={p}>{PROGRAM_LABEL[p]}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-phase">Phase</label>
        <select id="f-phase" className={sel} value={phase} onChange={(e) => setPhase(e.target.value as Phase | '')}>
          <option value="">All phases</option>{PHASES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-owner">Owner</label>
        <select id="f-owner" className={sel} value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">Any owner</option>{STAFF.filter((x) => x.id !== 's-admin').map((x) => <option key={x.id} value={x.id}>{x.name} · {x.title}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-meno">Stage</label>
        <select id="f-meno" className={sel} value={meno} onChange={(e) => setMeno(e.target.value as MenoStatus | '')}>
          <option value="">Peri and post</option><option value="peri">Perimenopause</option><option value="post">Postmenopause</option>
        </select>
        <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-paper px-3 text-sm text-plum-900">
          <input type="checkbox" className="h-4 w-4 accent-plum-700" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} /> Safety flags only
        </label>
        {filtering && <Button size="sm" variant="ghost" onClick={clear}>Clear filters</Button>}
        <span className="ml-auto text-sm text-muted">{shown.length} of {members.length} members</span>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-card border border-line bg-paper shadow-card">
          <EmptyState title="No members match" body="Try a different phase or owner, or clear the filters." action={<Button size="sm" variant="secondary" onClick={clear}>Clear filters</Button>} />
        </div>
      ) : view === 'list' ? (
        <div className="overflow-x-auto rounded-card border border-line bg-paper shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-[13px] text-muted">
              <tr><th className="px-4 py-2.5 font-medium">Member</th><th className="font-medium">Journey</th><th className="font-medium">Where she is</th><th className="font-medium">Guide</th><th className="font-medium">Last contact</th></tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id} onClick={() => open(m.id)} className="cursor-pointer border-b border-line last:border-0 hover:bg-cream-100">
                  <td className="px-4 py-3">
                    <button onClick={() => open(m.id)} className="flex items-center gap-3 text-left">
                      <Avatar name={m.name} />
                      <span><span className="block font-semibold text-plum-900">{m.name}</span><span className="text-xs text-muted">{ageYears(m.dob, now)} · {MENO_LABEL[m.menoStatus]}</span></span>
                    </button>
                  </td>
                  <td className="py-3">
                    <span className="flex items-center gap-2"><Chip tone="plum">{PROGRAM_LABEL[m.program]}</Chip><ProgramLadder program={m.program} compact /></span>
                    <span className="mt-1 block text-xs text-muted">{phaseLabel(m.phase)} · step {phaseIndex(m.phase) + 1} of {PHASES.length}</span>
                  </td>
                  <td className="text-plum-900">{hasFlag(m.id) && <Chip tone="danger" className="mr-2">Safety</Chip>}{m.step}</td>
                  <td className="text-muted">{name(m.guideId)}</td>
                  <td className="pr-4 text-muted">{m.lastContactAt ? fmtDate(m.lastContactAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {PROGRAM_ORDER.map((p) => {
            const list = shown.filter((m) => m.program === p);
            return (
              <section key={p} aria-label={PROGRAM_LABEL[p]} className="rounded-card bg-cream-200/60 p-3">
                <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-plum-900"><span>{PROGRAM_ORDER.indexOf(p) + 1} · {PROGRAM_LABEL[p]}</span><span className="text-muted">{list.length}</span></h2>
                <ul className="flex flex-col gap-2">
                  {list.length === 0 && <li className="px-1 text-xs text-muted">No members here right now.</li>}
                  {list.map((m) => (
                    <li key={m.id}>
                      <button onClick={() => open(m.id)} className="w-full rounded-lg border border-line bg-paper p-3 text-left hover:border-plum-700">
                        <span className="block text-sm font-semibold text-plum-900">{m.name}</span>
                        <span className="mt-1 flex items-center gap-1" role="img" aria-label={`${phaseLabel(m.phase)}, step ${phaseIndex(m.phase) + 1} of ${PHASES.length}`}>
                          {PHASES.map((p, i) => <span key={p.id} className={clsx('h-1.5 flex-1 rounded-full', i < phaseIndex(m.phase) ? 'bg-plum-700' : i === phaseIndex(m.phase) ? 'bg-terracotta-500' : 'bg-line')} />)}
                        </span>
                        <span className="mt-1 block text-xs text-muted">{phaseLabel(m.phase)} · {m.step}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
