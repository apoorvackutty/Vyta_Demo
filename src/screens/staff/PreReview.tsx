// N2 Pre-review: the NP decides each finding and edits the draft HEAL plan before the Coach sees it.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowLeft, Check, FileText, Loader2, MessageSquarePlus, Pencil, RotateCcw, StickyNote, Trash2 } from 'lucide-react';
import { useDemo, ops } from '../../state/store';
import { useStaffRole } from '../../components/shell';
import { BandChip, ActingNote } from '../../components/domain';
import { can, actingAs } from '../../state/permissions';
import { SourceDialog, fmtValue } from '../../components/results';
import { Button, Card, Chip, Dialog, EmptyState, Field, ProgressBar, inputCls } from '../../components/ui';
import { STAFF, STAFF_BY_ROLE, FORMS } from '../../data/seed';
import { BAND_RANK, PLAN_GROUPS, FIELD_LABEL, isLifestyle } from '../../data/protocol';
import { canApprovePreReview, unfilled, needsReview } from '../../state/guards';
import { fmtDate, fmtDateTime, fmtTime } from '../../lib/time';
import type { Finding, PlanField, PlanItem, Report, Result } from '../../types';

const DECISIONS = [
  { id: 'treat', label: 'Treat' }, { id: 'refer', label: 'Refer' }, { id: 'monitor', label: 'Monitor' }, { id: 'dismiss', label: 'Dismiss' },
] as const;
const CHANGE: Record<PlanItem['change'], { label: string; tone: 'info' | 'neutral' | 'plum' }> = {
  new: { label: 'New', tone: 'info' }, continued: { label: 'Continued', tone: 'neutral' },
  changed: { label: 'Changed', tone: 'plum' }, discontinued: { label: 'Discontinued', tone: 'neutral' },
};
const SUPPLIER = { compounding: 'Compounding pharmacy', retail: 'Retail pharmacy', fullscript: 'Fullscript', peptide_supplier: 'Peptide supplier' } as const;
const SEND_BACK_REASONS = ['Use a different protocol template', 'Labs incomplete: re-run with the full panel', 'Draft is for the wrong program', 'Other'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const staffName = (sid?: string) => STAFF.find((s) => s.id === sid)?.name ?? '';

export default function PreReview() {
  const role = useStaffRole();
  const { id = '' } = useParams();
  const s = useDemo();
  const m = s.members.find((x) => x.id === id);
  const report = s.reports.find((r) => r.memberId === id && r.kind === 'baseline');
  if (!m) return <EmptyState title="Member not found" action={<Link className="text-terracotta-700 underline" to={`/staff/${role}/today`}>Back to Today</Link>} />;

  const back = (
    <Link to={`/staff/${role}/member/${m.id}`} className="mb-3 inline-flex min-h-[28px] items-center gap-1 text-sm text-muted hover:text-plum-900"><ArrowLeft size={16} /> {m.name}'s record</Link>
  );
  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">{back}
        <Card><EmptyState title="No draft yet" body="The draft HEAL plan builds when the MA marks her labs received." /></Card>
      </div>
    );
  }
  if (report.status === 'building') return <div className="mx-auto max-w-3xl px-6 py-6">{back}<Building key={report.building?.startedAt} report={report} name={m.name} /></div>;

  const canEdit = can(role, 'pre_review') && report.status === 'draft';
  const results = s.results.filter((r) => r.memberId === m.id);
  const approval = s.approvals.filter((a) => a.reportId === report.id && a.gate === 'np_pre_review' && a.outcome === 'approved').slice(-1)[0];
  const intake = s.intake[m.id] ?? {};
  const context = [
    intake.Q06 && `Diagnosed: ${intake.Q06}`, intake.Q13 && `Allergies: ${intake.Q13}`, intake.Q44 && `Injury: ${intake.Q44}`,
  ].filter(Boolean) as string[];

  return (
    <div className="pb-28">
      <div className="mx-auto max-w-7xl px-6 py-6">
        {back}
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[32px] font-semibold leading-tight text-plum-700">Pre-review · {m.name}</h1>
            <p className="text-sm text-muted">
              Draft HEAL plan v{report.version} · built {report.builtAt ? fmtDateTime(report.builtAt) : ''} from the {report.protocol.toLowerCase()}
            </p>
          </div>
          {report.status === 'draft'
            ? <span className="flex flex-wrap items-center gap-2"><ActingNote text={actingAs(role, 'pre_review')} /><Chip tone="watch">Waiting on NP pre-review</Chip></span>
            : approval && <Chip tone="ok"><Check size={13} /> Approved · {staffName(approval.byId)} · {fmtTime(approval.at)} · v{approval.reportVersion}</Chip>}
        </header>

        <Card className="mb-5 grid gap-4 p-4 text-sm md:grid-cols-2">
          <div>
            <h2 className="mb-1 text-[13px] font-medium text-muted">Her goals</h2>
            <p className="text-plum-900">{m.goals.join(' ')}</p>
          </div>
          <div>
            <h2 className="mb-1 text-[13px] font-medium text-muted">From her intake</h2>
            <ul className="text-plum-900">{context.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        </Card>

        {!canEdit && report.status === 'draft' && (
          <p className="mb-4 rounded-lg bg-info-bg px-4 py-2 text-sm text-info-fg">Read only: only the NP decides findings and approves the pre-review.</p>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-12">
          <Findings report={report} results={results} canEdit={canEdit} />
          <PlanEditor report={report} canEdit={canEdit} />
        </div>
      </div>
      <GateFooter report={report} results={results} canEdit={canEdit} memberName={m.name} />
    </div>
  );
}

// Simulated engine run (TRD §4). The global DraftBuilder in App finishes it.
function Building({ report, name }: { report: Report; name: string }) {
  const markers = useDemo((s) => s.results.filter((r) => r.memberId === report.memberId).length);
  const STEPS = [`Reading her lab results (${markers} markers)`, 'Matching findings to her intake and goals', `Applying the ${report.protocol.toLowerCase()}`];
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setShown((n) => Math.min(3, n + 1)), 700);
    return () => clearInterval(t);
  }, []);
  const rebuild = report.building?.kind === 'rebuild';
  return (
    <Card className="p-8">
      <h1 className="mb-1 flex items-center gap-3 font-display text-[32px] font-semibold text-plum-700">
        <Loader2 className="animate-spin text-terracotta-500" size={26} aria-hidden="true" />
        {rebuild ? `Rebuilding draft v${report.version + 1}…` : 'Building draft HEAL plan…'}
      </h1>
      <p className="mb-5 text-sm text-muted">{rebuild ? `Applying your change: "${report.building?.reason}"` : `For ${name}. This takes a few seconds.`}</p>
      <ul className="space-y-2 text-sm" aria-live="polite">
        {STEPS.slice(0, rebuild ? 1 : shown).map((t, i) => (
          <li key={t} className="flex items-center gap-2 text-plum-900">
            {i < shown - 1 || rebuild ? <Check size={16} className="text-ok-fg" /> : <Loader2 size={16} className="animate-spin text-muted" />}
            {rebuild ? 'Re-running the draft with your change' : t}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Findings({ report, results, canEdit }: { report: Report; results: Result[]; canEdit: boolean }) {
  const [source, setSource] = useState<Result | null>(null);
  const byId = (rid: string) => results.find((r) => r.id === rid);
  const rank = (f: Finding) => BAND_RANK[byId(f.resultId)?.band ?? 'optimal'];
  const findings = report.findings.slice().sort((a, b) => rank(a) - rank(b));
  const decided = findings.filter((f) => f.decision).length;
  // One block per body system, so related markers (the iron trio, the testosterone pair) sit together. Worst system first.
  const systems = [...new Set(findings.map((f) => byId(f.resultId)?.panel ?? ''))]
    .map((panel) => ({ panel, items: findings.filter((f) => byId(f.resultId)?.panel === panel) }));
  const flagged = new Set(findings.map((f) => f.resultId));
  const others = results.filter((r) => !flagged.has(r.id));
  return (
    <section aria-labelledby="findings-h" className="space-y-5 xl:col-span-5">
      <Card>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id="findings-h" className="text-base font-semibold text-plum-900">Findings · out of range first</h2>
          <span className="text-xs tabular-nums text-muted">{decided} of {findings.length} decided</span>
        </div>
        {systems.map(({ panel, items }) => (
          <div key={panel}>
            <h3 className="flex justify-between border-b border-line bg-cream-100 px-4 py-1.5 text-[13px] font-medium text-muted">
              <span>{panel}</span><span className="tabular-nums">{items.filter((f) => f.decision).length} of {items.length} decided</span>
            </h3>
            <ul>
              {items.map((f) => {
                const r = byId(f.resultId);
                return r ? <FindingRow key={f.id} finding={f} result={r} reportId={report.id} canEdit={canEdit} onSource={() => setSource(r)} /> : null;
              })}
            </ul>
          </div>
        ))}
      </Card>
      <Card>
        <h2 className="border-b border-line px-4 py-3 text-base font-semibold text-plum-900">Other results <span className="text-xs font-normal text-muted">· no decision needed</span></h2>
        <table className="w-full text-sm">
          <thead className="sr-only"><tr><th>Marker</th><th>Value</th><th>Status</th><th>Source</th></tr></thead>
          <tbody>
            {others.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-2 text-plum-900">{r.marker}</td>
                <td className="py-2 tabular-nums text-plum-900">{fmtValue(r)}</td>
                <td className="py-2"><BandChip band={r.band} /></td>
                <td className="py-2 pr-4 text-right"><button className="inline-flex min-h-[28px] items-center rounded px-1 text-xs text-terracotta-700 underline-offset-2 hover:underline" onClick={() => setSource(r)} aria-label={`Source for ${r.marker}`}>Source</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <SourceDialog result={source} results={results} onClose={() => setSource(null)} />
    </section>
  );
}

function FindingRow({ finding: f, result: r, reportId, canEdit, onSource }: { finding: Finding; result: Result; reportId: string; canEdit: boolean; onSource: () => void }) {
  const { run } = useDemo();
  const role = useStaffRole();
  const by = STAFF_BY_ROLE[role];
  const undo = { memberId: r.memberId, by };
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(f.note ?? '');
  return (
    <li className={clsx('border-b border-line px-4 py-3 last:border-b-0', !f.decision && 'bg-cream-100/60')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-plum-900">{r.marker}</span>
        <span className="font-semibold tabular-nums text-plum-900">{fmtValue(r)}</span>
        <BandChip band={r.band} />
        <span className="text-xs text-muted">Target {r.target}</span>
        <button onClick={onSource} className="-my-1 ml-auto inline-flex min-h-[28px] items-center gap-1 rounded px-1 text-xs text-terracotta-700 underline-offset-2 hover:underline"><FileText size={13} /> Source</button>
      </div>
      <p className="mt-0.5 text-sm text-muted">{f.summary}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div role="group" aria-label={`Decision for ${r.marker}`} className="inline-flex overflow-hidden rounded-lg border border-plum-700">
          {DECISIONS.map((d, i) => (
            <button
              key={d.id} aria-pressed={f.decision === d.id} disabled={!canEdit}
              onClick={() => run((x) => ops.decideFinding(x, reportId, f.id, d.id, by), `${r.marker}: ${d.label}`, 'n2-finding', undo)}
              className={clsx('h-8 px-3 text-[13px] font-medium focus-visible:relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta-500 disabled:cursor-not-allowed',
                i > 0 && 'border-l border-plum-700',
                f.decision === d.id ? 'bg-plum-700 text-paper' : 'bg-paper text-plum-700 enabled:hover:bg-plum-100')}
            >
              {f.decision === d.id && <Check size={12} className="-ml-0.5 mr-1 inline" aria-hidden="true" />}{d.label}
            </button>
          ))}
        </div>
        {canEdit && <Button size="sm" variant="ghost" onClick={() => setNoteOpen((o) => !o)}><MessageSquarePlus size={14} /> {f.note ? 'Edit note' : 'Add note'}</Button>}
        {f.decision && f.decidedAt && <span className="text-xs text-muted">{staffName(f.decidedById).split(' ')[0]} · {fmtTime(f.decidedAt)}</span>}
        {!f.decision && f.suggested && <span className="text-xs text-muted">Protocol suggests <strong className="font-semibold text-plum-700">{DECISIONS.find((d) => d.id === f.suggested)?.label}</strong></span>}
      </div>
      {f.note && !noteOpen && <p className="mt-2 rounded-md bg-plum-100 px-3 py-1.5 text-sm text-plum-900">Note: {f.note}</p>}
      {noteOpen && (
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); run((x) => ops.noteFinding(x, reportId, f.id, note, by), note.trim() ? `Note saved on ${r.marker}` : `Note removed from ${r.marker}`, undefined, undo); setNoteOpen(false); }}>
          <label className="sr-only" htmlFor={`note-${f.id}`}>Note on {r.marker}</label>
          <input id={`note-${f.id}`} autoFocus className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. recheck in 8 weeks" />
          <Button size="md" type="submit">Save</Button>
        </form>
      )}
    </li>
  );
}

function PlanEditor({ report, canEdit }: { report: Report; canEdit: boolean }) {
  const open = report.plan.filter(needsReview).length;
  return (
    <section aria-labelledby="plan-h" className="xl:col-span-7">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 id="plan-h" className="text-base font-semibold text-plum-900">Draft HEAL plan</h2>
            <p className="text-xs text-muted">Pre-filled from the {report.protocol.toLowerCase()}. Dose options are illustrative for the demo.</p>
          </div>
          {open > 0 ? <Chip tone="watch">{open} need{open > 1 ? '' : 's'} your review</Chip> : <Chip tone="ok"><Check size={13} /> All items resolved</Chip>}
        </div>
        {PLAN_GROUPS.map((g) => {
          const items = report.plan.filter((i) => i.group === g.id);
          if (!items.length) return null;
          return (
            <div key={g.id}>
              <h3 className="border-b border-line bg-cream-100 px-4 py-1.5 text-[13px] font-medium text-muted">{g.label}</h3>
              <ul>{items.map((i) => <PlanItemRow key={i.id} item={i} reportId={report.id} canEdit={canEdit} />)}</ul>
            </div>
          );
        })}
      </Card>
    </section>
  );
}

function PlanItemRow({ item, reportId, canEdit }: { item: PlanItem; reportId: string; canEdit: boolean }) {
  const { run } = useDemo();
  const role = useStaffRole();
  const by = STAFF_BY_ROLE[role];
  const undo = { memberId: useDemo((st) => st.reports.find((x) => x.id === reportId)?.memberId ?? ''), by };
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(item.sideNote ?? '');
  const [editing, setEditing] = useState(false);
  const flagged = needsReview(item);
  const open = (editing || flagged) && canEdit && !item.removed; // flagged items open themselves; the rest read as one line
  const gaps = unfilled(item);
  const fields: PlanField[] = isLifestyle(item.group) ? ['dose'] : ['dose', 'form', 'route', 'frequency'];
  const consent = FORMS.find((f) => f.id === item.needsConsentFormId);
  const editable = canEdit && !item.removed;

  return (
    <li className={clsx('border-b border-l-4 border-b-line px-4 py-3 last:border-b-0', flagged ? 'border-l-watch-fg bg-watch-bg/30' : 'border-l-transparent', item.removed && 'bg-cream-100')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={clsx('font-semibold', item.removed ? 'text-muted line-through' : 'text-plum-900')}>{item.name}</span>
        {item.removed ? <Chip>Removed</Chip> : <Chip tone={CHANGE[item.change].tone}>{CHANGE[item.change].label}</Chip>}
        {item.flag && !item.removed && (flagged
          ? <Chip tone="watch">Needs your review · {item.flag === 'incomplete' ? '† ' : '* '}{item.flagNote}</Chip>
          : <Chip tone="ok"><Check size={12} /> Reviewed</Chip>)}
        {consent && !item.removed && <Chip tone="info">Needs consent: {consent.title.replace(' consent', '')}</Chip>}
        {item.supplier && <span className="ml-auto text-xs text-muted">{SUPPLIER[item.supplier]}</span>}
      </div>
      {!item.removed && !open && (
        <div className="mt-1 flex items-center gap-3">
          <p className="text-sm text-plum-900">{fields.map((f) => item[f] && cap(item[f]!)).filter(Boolean).join(' · ')}</p>
          {canEdit && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEditing(true)} aria-label={`Edit ${item.name}`}><Pencil size={14} /> Edit</Button>}
        </div>
      )}
      {open && (
        <div className="mt-2 flex flex-wrap gap-2">
          {fields.map((f) => (
            <PlanSelect key={f} label={isLifestyle(item.group) ? 'Target' : FIELD_LABEL[f]} value={item[f]} options={item.options?.[f]}
              missing={gaps.includes(f)} disabled={!editable} id={`${item.id}-${f}`}
              onChange={(v) => run((x) => ops.editPlanItem(x, reportId, item.id, f, v, by), `${item.name}: ${FIELD_LABEL[f].toLowerCase()} set to ${v}`, 'n2-plan', undo)} />
          ))}
        </div>
      )}
      <p className="mt-1.5 text-xs text-muted">For her: {item.purpose}</p>
      {item.sideNote && !noteOpen && <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-plum-100 px-2.5 py-1 text-sm text-plum-900"><StickyNote size={13} aria-hidden="true" /> {item.sideNote}</p>}
      {noteOpen && (
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); run((x) => ops.setSideNote(x, reportId, item.id, note, by), note.trim() ? `${item.name}: side note saved` : `${item.name}: side note removed`, undefined, undo); setNoteOpen(false); }}>
          <label className="sr-only" htmlFor={`side-${item.id}`}>Side note for {item.name}</label>
          <input id={`side-${item.id}`} autoFocus className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. allergy: cottonseed oil" />
          <Button type="submit">Save</Button>
        </form>
      )}
      {canEdit && (open || item.removed) && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {flagged && (
            <Button size="sm" variant="secondary" disabled={gaps.length > 0} aria-describedby={gaps.length ? `${item.id}-why` : undefined}
              onClick={() => run((x) => ops.reviewPlanItem(x, reportId, item.id, by), `${item.name}: reviewed`, undefined, undo)}>
              <Check size={14} /> {item.flag === 'proposed' ? 'Keep proposed step' : 'Mark reviewed'}
            </Button>
          )}
          {flagged && gaps.length > 0 && <span id={`${item.id}-why`} className="text-xs text-watch-fg">Fill in the {gaps.map((g) => FIELD_LABEL[g].toLowerCase()).join(' and ')} first</span>}
          {editing && !flagged && <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setNoteOpen(false); }}><Check size={14} /> Done</Button>}
          {!item.removed && <Button size="sm" variant="ghost" onClick={() => setNoteOpen((o) => !o)}><StickyNote size={14} /> {item.sideNote ? 'Edit side note' : 'Side note'}</Button>}
          {item.removed
            ? <Button size="sm" variant="ghost" onClick={() => { setEditing(false); run((x) => ops.removePlanItem(x, reportId, item.id, false, by), `${item.name} restored`, undefined, undo); }}><RotateCcw size={14} /> Restore</Button>
            : <Button size="sm" variant="danger" className="ml-auto" onClick={() => run((x) => ops.removePlanItem(x, reportId, item.id, true, by), `${item.name} removed from the plan`, undefined, undo)}><Trash2 size={14} /> Remove</Button>}
        </div>
      )}
    </li>
  );
}

// Dropdown pre-filled from the protocol; the last option is always "Other…", which opens a text field.
function PlanSelect({ id, label, value, options = [], missing, disabled, onChange }: {
  id: string; label: string; value?: string; options?: string[]; missing: boolean; disabled: boolean; onChange: (v: string) => void;
}) {
  const [other, setOther] = useState(false);
  const [text, setText] = useState('');
  const opts = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={id} className={clsx('text-xs font-medium', missing ? 'text-watch-fg' : 'text-muted')}>{label}{missing ? ' · missing' : ''}</label>
      {other ? (
        <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onChange(text.trim()); setOther(false); setText(''); } }}>
          <input id={id} autoFocus className={clsx(inputCls, 'h-8 w-36 py-1')} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Custom ${label.toLowerCase()}`}
            onKeyDown={(e) => { if (e.key === 'Escape') setOther(false); }} />
          <Button size="sm" type="submit" disabled={!text.trim()}>Set</Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setOther(false)}>Cancel</Button>
        </form>
      ) : (
        <select id={id} disabled={disabled} value={value ?? ''}
          onChange={(e) => (e.target.value === '__other' ? setOther(true) : onChange(e.target.value))}
          className={clsx('h-8 max-w-[260px] rounded-lg border bg-paper px-2 text-[13px] text-plum-900 focus:outline-none focus:ring-2 focus:ring-terracotta-500/40 disabled:cursor-not-allowed disabled:bg-cream-100',
            missing ? 'border-watch-fg' : 'border-line')}>
          {!value && <option value="" disabled>Not supplied</option>}
          {opts.map((o) => <option key={o} value={o}>{cap(o)}</option>)}
          <option value="__other">Other…</option>
        </select>
      )}
    </div>
  );
}

function GateFooter({ report, results, canEdit, memberName }: { report: Report; results: Result[]; canEdit: boolean; memberName: string }) {
  const s = useDemo();
  const role = useStaffRole();
  const by = STAFF_BY_ROLE[role];
  const check = canApprovePreReview(report, results);
  const suggestable = report.findings.filter((f) => !f.decision && f.suggested).length;
  const [why, setWhy] = useState(false);
  const [sendBack, setSendBack] = useState(false);
  const [reason, setReason] = useState(SEND_BACK_REASONS[0]);
  const [note, setNote] = useState('');
  const first = memberName.split(' ')[0];

  if (report.status !== 'draft') {
    return (
      <div className="sticky bottom-0 z-30 border-t border-line bg-paper px-6 py-3 shadow-card">
        <p className="mx-auto max-w-7xl text-sm text-plum-900">
          {report.status === 'pre_reviewed' ? `Pre-review approved. ${first}'s draft is with Sienna (Coach) for wording review.` : 'This draft has moved past pre-review.'}
        </p>
      </div>
    );
  }
  const approve = () => {
    if (!check.ok) { setWhy(true); return; }
    s.run((d) => ops.approvePreReview(d, report.id, by), `Pre-review approved · v${report.version} · wording review sent to Sienna`);
  };
  const sendReason = reason === 'Other' ? note.trim() : note.trim() ? `${reason}: ${note.trim()}` : reason;

  return (
    <div className="sticky bottom-0 z-30 border-t border-line bg-paper px-4 py-2 shadow-card sm:px-6 sm:py-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2">
        {/* Small screens: one line of counts instead of two progress bars, so the review keeps most of the screen. */}
        <p className="text-xs text-plum-900 sm:hidden"><strong className="tabular-nums">{check.findingsDecided}/{check.findingsTotal}</strong> findings decided · <strong className="tabular-nums">{check.itemsResolved}/{check.itemsTotal}</strong> items resolved</p>
        <div className="hidden min-w-[180px] flex-col gap-1 text-xs sm:flex">
          <span className="text-plum-900">Findings decided <strong className="tabular-nums">{check.findingsDecided}/{check.findingsTotal}</strong></span>
          <ProgressBar value={check.findingsDecided / Math.max(1, check.findingsTotal)} label="Findings decided" />
        </div>
        <div className="hidden min-w-[180px] flex-col gap-1 text-xs sm:flex">
          <span className="text-plum-900">Items resolved <strong className="tabular-nums">{check.itemsResolved}/{check.itemsTotal}</strong></span>
          <ProgressBar value={check.itemsResolved / Math.max(1, check.itemsTotal)} label="Plan items resolved" />
        </div>
        {canEdit && suggestable > 0 && (
          <Button size="sm" variant="secondary" onClick={() => s.run((d) => ops.acceptSuggestions(d, report.id, by), `Protocol suggestions accepted for ${suggestable} findings`, undefined, { memberId: report.memberId, by })}>
            <span className="sm:hidden">Accept suggestions ({suggestable})</span><span className="hidden sm:inline">Accept protocol suggestions ({suggestable} left)</span>
          </Button>
        )}
        <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ActingNote text={actingAs(role, 'pre_review')} className="max-sm:hidden" />
          <Button variant="danger" className="flex-1 sm:flex-none" disabled={!canEdit} onClick={() => setSendBack(true)}><span className="sm:hidden">Send back</span><span className="hidden sm:inline">Send back with reason</span></Button>
          <div className="group relative flex-1 sm:flex-none" onMouseLeave={() => setWhy(false)}>
            <Button aria-disabled={!check.ok || !canEdit} disabled={!canEdit} aria-describedby="gate-why"
              className={clsx('w-full', !check.ok && 'cursor-not-allowed opacity-50 hover:bg-plum-700')} onClick={approve}>
              <span className="sm:hidden">Approve</span><span className="hidden sm:inline">Approve pre-review</span>
            </Button>
            {!check.ok && (
              <div id="gate-why" role="tooltip"
                className={clsx('absolute bottom-full right-0 mb-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg bg-plum-900 p-3 text-xs text-cream-100 shadow-card group-hover:block group-focus-within:block', why ? 'block' : 'hidden')}>
                <p className="mb-1 font-semibold">Before you can approve:</p>
                <ul className="list-disc space-y-0.5 pl-4">{check.missing.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <Dialog open={sendBack} title="Send back with reason" onClose={() => setSendBack(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setSendBack(false)}>Cancel</Button>
          <Button disabled={!sendReason} onClick={() => { s.run((d) => ops.sendBackDraft(d, report.id, sendReason, by), `Draft sent back · rebuilding as v${report.version + 1}`); setSendBack(false); setNote(''); }}>Send back</Button>
        </>}>
        <p className="text-sm text-muted">The draft is rebuilt with your change and comes back to you as v{report.version + 1}. Your decisions and edits so far are kept.</p>
        <Field label="Reason" htmlFor="sb-reason">
          <select id="sb-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
            {SEND_BACK_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label={reason === 'Other' ? 'What needs to change' : 'Detail (optional)'} htmlFor="sb-note">
          <textarea id="sb-note" rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. use the post-menopause template" />
        </Field>
      </Dialog>
    </div>
  );
}
